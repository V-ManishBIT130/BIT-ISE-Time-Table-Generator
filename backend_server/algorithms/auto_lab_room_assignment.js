/**
 * AUTOMATIC LAB ROOM ASSIGNMENT ALGORITHM (Phase 2)
 * 
 * Purpose: Automatically assign lab rooms to all batches based on:
 * 1. Equipment compatibility
 * 2. Even distribution across rooms
 * 3. Conflict minimization
 * 
 * Input:
 * - syllabus_labs: Required labs for each semester
 * - ise_sections: All sections with batch counts
 * - dept_labs: Available lab rooms with equipment
 * - sem_type: 'odd' or 'even'
 * 
 * Output:
 * - lab_room_assignment documents (one per batch per lab)
 */

import mongoose from 'mongoose';
import LabRoomAssignment from '../models/lab_room_assignment_model.js';
import DeptLabs from '../models/dept_labs_model.js';
import SyllabusLabs from '../models/syllabus_labs_model.js';
import ISESections from '../models/ise_sections_model.js';

/**
 * Main function to automatically assign lab rooms for all sections
 * @param {string} semType - 'odd' or 'even'
 * @param {string} academicYear - e.g., '2024-2025'
 * @returns {Promise<Object>} - Assignment results with statistics
 */
export async function autoAssignLabRooms(semType, academicYear) {
  console.log(`\n🤖 Starting AUTOMATIC lab room assignment for ${semType} semester...`);
  
  // Step 1: Get all sections for this semester type
  const sections = await ISESections.find({ 
    sem_type: semType,
    academic_year: academicYear 
  }).lean();
  
  if (sections.length === 0) {
    throw new Error(`No sections found for ${semType} semester`);
  }
  
  console.log(`✅ Found ${sections.length} sections to process`);
  
  // Global room usage counter (tracks how many times each room is assigned)
  const roomUsageCounter = {};
  
  // Results tracking
  const assignments = [];
  const stats = {
    totalAssignments: 0,
    sectionsProcessed: 0,
    labsProcessed: 0,
    roomDistribution: {}
  };
  
  // Step 2: Process each section
  for (const section of sections) {
    console.log(`\n📋 Processing Section ${section.sem}${section.section}...`);
    
    // Get required labs for this semester
    const labs = await SyllabusLabs.find({ sem: section.sem }).lean();
    
    if (labs.length === 0) {
      console.log(`⚠️ No labs defined for Semester ${section.sem}, skipping...`);
      continue;
    }
    
    stats.sectionsProcessed++;
    
    // Step 3: For each lab, assign rooms to all batches
    for (const lab of labs) {
      console.log(`  🔬 Processing ${lab.lab_name}...`);
      
      // Find compatible rooms (equipment-based)
      const compatibleRooms = await DeptLabs.find({
        lab_subjects_handled: { $in: [lab.lab_name] }
      }).lean();
      
      if (compatibleRooms.length === 0) {
        console.log(`    ❌ No compatible rooms found for ${lab.lab_name}!`);
        continue;
      }
      
      console.log(`    ✅ Found ${compatibleRooms.length} compatible rooms`);
      
      // Initialize room usage counter for new rooms
      compatibleRooms.forEach(room => {
        if (!(room._id in roomUsageCounter)) {
          roomUsageCounter[room._id] = 0;
        }
      });
      
      // Step 4: Assign room to each batch (even distribution)
      const batchCount = section.batches_per_section || 3; // Default 3 batches
      
      for (let batchNum = 1; batchNum <= batchCount; batchNum++) {
        // Pick least-used compatible room
        const assignedRoom = findLeastUsedRoom(compatibleRooms, roomUsageCounter);
        
        // Create assignment document
        const assignment = {
          lab_id: lab._id,
          sem: section.sem,
          sem_type: section.sem_type,
          section: section.section,
          batch_number: batchNum,
          assigned_lab_room: assignedRoom._id,
          assignment_metadata: {
            compatible_rooms_count: compatibleRooms.length,
            room_usage_rank: roomUsageCounter[assignedRoom._id],
            assigned_at: new Date()
          }
        };
        
        assignments.push(assignment);
        
        // Update usage counter
        roomUsageCounter[assignedRoom._id]++;
        
        // Update stats
        stats.totalAssignments++;
        if (!stats.roomDistribution[assignedRoom.lab_room_no]) {
          stats.roomDistribution[assignedRoom.lab_room_no] = 0;
        }
        stats.roomDistribution[assignedRoom.lab_room_no]++;
        
        console.log(`    ✅ Batch ${section.sem}${section.section}${batchNum} → Room ${assignedRoom.lab_room_no} (usage: ${roomUsageCounter[assignedRoom._id]})`);
      }
      
      stats.labsProcessed++;
    }
  }
  
  // Step 5: Save all assignments to database
  console.log(`\n💾 Saving ${assignments.length} assignments to database...`);
  
  // Clear existing assignments for this semester type (start fresh)
  await LabRoomAssignment.deleteMany({ sem_type: semType });
  
  // Bulk insert all assignments
  const result = await LabRoomAssignment.insertMany(assignments);
  
  console.log(`✅ Successfully saved ${result.length} lab room assignments!`);
  
  // Step 6: Print statistics
  console.log(`\n📊 ASSIGNMENT STATISTICS:`);
  console.log(`   Sections Processed: ${stats.sectionsProcessed}`);
  console.log(`   Labs Processed: ${stats.labsProcessed}`);
  console.log(`   Total Assignments: ${stats.totalAssignments}`);
  console.log(`\n   Room Distribution:`);
  
  Object.entries(stats.roomDistribution)
    .sort((a, b) => b[1] - a[1]) // Sort by usage (descending)
    .forEach(([room, count]) => {
      console.log(`     ${room}: ${count} assignments`);
    });
  
  return {
    success: true,
    assignments: result,
    stats
  };
}

/**
 * Helper function to find least-used room from compatible rooms
 * @param {Array} compatibleRooms - Array of room documents
 * @param {Object} usageCounter - Room usage counter object
 * @returns {Object} - Least-used room document
 */
function findLeastUsedRoom(compatibleRooms, usageCounter) {
  // Sort rooms by usage count (ascending)
  const sortedRooms = [...compatibleRooms].sort((a, b) => {
    const usageA = usageCounter[a._id] || 0;
    const usageB = usageCounter[b._id] || 0;
    return usageA - usageB;
  });
  
  // Return least-used room
  return sortedRooms[0];
}

/**
 * Function to preview assignment without saving (for testing)
 * @param {string} semType - 'odd' or 'even'
 * @param {string} academicYear - e.g., '2024-2025'
 * @returns {Promise<Object>} - Preview of assignments
 */
export async function previewLabRoomAssignments(semType, academicYear) {
  console.log(`\n🔍 PREVIEW MODE: Lab room assignments for ${semType} semester`);
  
  const sections = await ISESections.find({ 
    sem_type: semType,
    academic_year: academicYear 
  }).lean();
  
  const roomUsageCounter = {};
  const preview = [];
  
  for (const section of sections) {
    const labs = await SyllabusLabs.find({ sem: section.sem }).lean();
    
    for (const lab of labs) {
      const compatibleRooms = await DeptLabs.find({
        lab_subjects_handled: { $in: [lab.lab_name] }
      }).lean();
      
      if (compatibleRooms.length === 0) continue;
      
      compatibleRooms.forEach(room => {
        if (!(room._id in roomUsageCounter)) {
          roomUsageCounter[room._id] = 0;
        }
      });
      
      const batchCount = section.batches_per_section || 3;
      
      for (let batchNum = 1; batchNum <= batchCount; batchNum++) {
        const assignedRoom = findLeastUsedRoom(compatibleRooms, roomUsageCounter);
        
        preview.push({
          section: `${section.sem}${section.section}${batchNum}`,
          lab: lab.lab_name,
          room: assignedRoom.lab_room_no,
          usageCount: roomUsageCounter[assignedRoom._id]
        });
        
        roomUsageCounter[assignedRoom._id]++;
      }
    }
  }
  
  return {
    preview,
    totalAssignments: preview.length,
    roomDistribution: getRoomDistributionStats(preview)
  };
}

/**
 * Helper to calculate room distribution statistics
 */
function getRoomDistributionStats(preview) {
  const distribution = {};
  
  preview.forEach(assignment => {
    if (!distribution[assignment.room]) {
      distribution[assignment.room] = 0;
    }
    distribution[assignment.room]++;
  });
  
  return distribution;
}

/**
 * EXAMPLE USAGE:
 * 
 * // Preview assignments (doesn't save to DB)
 * const preview = await previewLabRoomAssignments('odd', '2024-2025');
 * console.log(preview);
 * 
 * // Perform actual assignment (saves to DB)
 * const result = await autoAssignLabRooms('odd', '2024-2025');
 * console.log(result);
 * 
 * EXPECTED OUTPUT:
 * 
 * Section 5A:
 * ├── Batch 5A1, CN Lab → Room: ISE-301 (usage: 1)
 * ├── Batch 5A2, CN Lab → Room: ISE-302 (usage: 1)
 * ├── Batch 5A3, CN Lab → Room: ISE-303 (usage: 1)
 * ├── Batch 5A1, DV Lab → Room: 612A (usage: 1)
 * ├── Batch 5A2, DV Lab → Room: 612B (usage: 1)
 * └── Batch 5A3, DV Lab → Room: 612C (usage: 1)
 * 
 * Section 5B:
 * ├── Batch 5B1, CN Lab → Room: ISE-304 (usage: 1) ← Next in rotation
 * ├── Batch 5B2, CN Lab → Room: ISE-305 (usage: 1)
 * ├── Batch 5B3, CN Lab → Room: ISE-301 (usage: 2) ← Wrap around
 * ├── Batch 5B1, DV Lab → Room: 604A (usage: 1) ← Next in rotation
 * ├── Batch 5B2, DV Lab → Room: 612A (usage: 2) ← Wrap around
 * └── Batch 5B3, DV Lab → Room: 612B (usage: 2)
 * 
 * ✅ Even distribution achieved!
 * ✅ Equipment compatibility guaranteed!
 * ✅ Minimal conflicts for Phase 3!
 */
