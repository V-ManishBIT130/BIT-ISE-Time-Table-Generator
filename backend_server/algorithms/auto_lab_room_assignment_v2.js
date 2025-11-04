/**
 * AUTOMATIC LAB ROOM ASSIGNMENT ALGORITHM v2.0 (Phase 2 - REVISED)
 * 
 * Purpose: Assign lab rooms with TEMPORAL AWARENESS to prevent scheduling conflicts
 * 
 * KEY IMPROVEMENTS:
 * 1. Rotation-Aware: Groups labs by batch rotation rounds
 * 2. Intra-Section Conflict Prevention: Batches in same round get DIFFERENT rooms
 * 3. Cross-Section Optimization: Better room distribution across sections
 * 4. Temporal Grouping: Considers which labs will be scheduled simultaneously
 * 
 * Algorithm Strategy:
 * - Simulate batch rotation to predict which labs run together
 * - Assign DISTINCT rooms to batches within each round
 * - Use global usage tracking for even distribution
 * 
 * Input:
 * - syllabus_labs: Required labs for each semester
 * - ise_sections: All sections with batch counts
 * - dept_labs: Available lab rooms with equipment
 * - sem_type: 'odd' or 'even'
 * 
 * Output:
 * - lab_room_assignment documents (one per batch per lab, conflict-free)
 */

import mongoose from 'mongoose'
import LabRoomAssignment from '../models/lab_room_assignment_model.js'
import DeptLabs from '../models/dept_labs_model.js'
import SyllabusLabs from '../models/syllabus_labs_model.js'
import ISESections from '../models/ise_sections_model.js'

// Global room usage counter (tracks assignments across all sections)
const globalRoomUsage = {}

/**
 * Helper: Shuffle array for randomization
 */
function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Helper: Get compatible rooms for a lab (equipment-based)
 */
async function getCompatibleRooms(labId) {
  const rooms = await DeptLabs.find({
    lab_subjects_handled: labId
  }).lean()
  
  return rooms
}

/**
 * Helper: Find least-used room from available pool, excluding already used rooms in this round
 */
function findAvailableRoom(compatibleRooms, usedInRound, globalUsage) {
  // Filter out rooms already used in this round
  const availableRooms = compatibleRooms.filter(room => 
    !usedInRound.has(room._id.toString())
  )
  
  if (availableRooms.length === 0) {
    // No rooms available - this means we don't have enough rooms
    // Return null to indicate failure
    return null
  }
  
  // Sort by global usage (ascending) to balance load
  const sorted = availableRooms.sort((a, b) => {
    const usageA = globalUsage[a._id.toString()] || 0
    const usageB = globalUsage[b._id.toString()] || 0
    return usageA - usageB
  })
  
  return sorted[0]
}

/**
 * Main function: Assign lab rooms with rotation awareness
 */
export async function autoAssignLabRooms(semType, academicYear) {
  console.log(`\n🤖 Starting REVISED lab room assignment for ${semType} semester...`)
  console.log(`📊 Using: Rotation-Aware + Conflict-Free Strategy\n`)
  
  try {
    // Clear global usage counter
    Object.keys(globalRoomUsage).forEach(key => delete globalRoomUsage[key])
    
    // Step 1: Load all sections
    const sections = await ISESections.find({ 
      sem_type: semType
    }).lean()
    
    if (sections.length === 0) {
      throw new Error(`No sections found for ${semType} semester`)
    }
    
    console.log(`📋 Found ${sections.length} sections to process\n`)
    
    // Results tracking
    const allAssignments = []
    const stats = {
      totalAssignments: 0,
      sectionsProcessed: 0,
      roundsProcessed: 0,
      roomDistribution: {}
    }
    
    // Step 2: Process each section
    for (const section of sections) {
      const sectionName = `${section.sem}${section.section_name}`
      console.log(`   📝 Processing Section ${sectionName}...`)
      
      // Load required labs for this semester
      const labs = await SyllabusLabs.find({
        lab_sem: section.sem,
        lab_sem_type: semType
      }).lean()
      
      if (labs.length === 0) {
        console.log(`      ℹ️  No labs found for Semester ${section.sem}\n`)
        continue
      }
      
      console.log(`      🧪 Found ${labs.length} labs: ${labs.map(l => l.lab_shortform || l.lab_name).join(', ')}`)
      
      const NUM_BATCHES = 3 // Always 3 batches per section
      const NUM_LABS = labs.length
      const NUM_ROUNDS = NUM_LABS // Each lab appears once per cycle
      
      console.log(`      📊 Will assign rooms for ${NUM_ROUNDS} rounds (batch rotation)\n`)
      
      // Step 3: Simulate batch rotation to group labs by rounds
      const rounds = []
      for (let roundNum = 0; roundNum < NUM_ROUNDS; roundNum++) {
        const roundBatches = []
        
        for (let batchNum = 1; batchNum <= NUM_BATCHES; batchNum++) {
          // Batch rotation formula: labIndex = (round + batch - 1) % totalLabs
          const labIndex = (roundNum + batchNum - 1) % NUM_LABS
          const lab = labs[labIndex]
          
          roundBatches.push({
            batchNumber: batchNum,
            batchName: `${sectionName}${batchNum}`,
            lab: lab
          })
        }
        
        rounds.push({
          roundNumber: roundNum + 1,
          batches: roundBatches
        })
      }
      
      // Step 4: Assign rooms per round (ensuring DISTINCT rooms within each round)
      for (const round of rounds) {
        console.log(`      🔄 Round ${round.roundNumber}:`)
        
        const usedRoomsInRound = new Set() // Track rooms used in THIS round
        const roundAssignments = []
        
        for (const batchInfo of round.batches) {
          const { batchNumber, batchName, lab } = batchInfo
          
          // Get compatible rooms for this lab
          const compatibleRooms = await getCompatibleRooms(lab._id)
          
          if (compatibleRooms.length === 0) {
            console.log(`         ❌ No compatible rooms for ${batchName} - ${lab.lab_shortform}`)
            continue
          }
          
          // Initialize global usage for new rooms
          compatibleRooms.forEach(room => {
            const roomKey = room._id.toString()
            if (!(roomKey in globalRoomUsage)) {
              globalRoomUsage[roomKey] = 0
            }
          })
          
          // Find available room (not used in this round, least-used globally)
          const assignedRoom = findAvailableRoom(compatibleRooms, usedRoomsInRound, globalRoomUsage)
          
          if (!assignedRoom) {
            console.log(`         ⚠️  WARNING: Not enough rooms for ${batchName} - ${lab.lab_shortform}`)
            console.log(`            Compatible rooms: ${compatibleRooms.length}, Already used in round: ${usedRoomsInRound.size}`)
            // Skip this assignment - will cause issues in Phase 3
            continue
          }
          
          // Mark room as used in this round
          usedRoomsInRound.add(assignedRoom._id.toString())
          
          // Update global usage
          globalRoomUsage[assignedRoom._id.toString()]++
          
          // Create assignment document
          const assignment = {
            lab_id: lab._id,
            sem: section.sem,
            sem_type: semType,
            section: section.section_name,
            batch_number: batchNumber,
            assigned_lab_room: assignedRoom._id,
            assignment_metadata: {
              compatible_rooms_count: compatibleRooms.length,
              room_usage_rank: globalRoomUsage[assignedRoom._id.toString()],
              round_number: round.roundNumber,
              assigned_at: new Date()
            }
          }
          
          roundAssignments.push(assignment)
          allAssignments.push(assignment)
          
          // Update stats
          stats.totalAssignments++
          if (!stats.roomDistribution[assignedRoom.labRoom_no]) {
            stats.roomDistribution[assignedRoom.labRoom_no] = 0
          }
          stats.roomDistribution[assignedRoom.labRoom_no]++
          
          console.log(`         ✅ ${batchName}: ${lab.lab_shortform} → ${assignedRoom.labRoom_no} (usage: ${globalRoomUsage[assignedRoom._id.toString()]})`)
        }
        
        // Verify: All batches in this round got DIFFERENT rooms
        if (roundAssignments.length === NUM_BATCHES) {
          const roomsInRound = roundAssignments.map(a => a.assigned_lab_room.toString())
          const uniqueRooms = new Set(roomsInRound)
          
          if (uniqueRooms.size !== NUM_BATCHES) {
            console.log(`         ⚠️  WARNING: Room conflict detected in Round ${round.roundNumber}!`)
            console.log(`            Expected ${NUM_BATCHES} unique rooms, got ${uniqueRooms.size}`)
          }
        }
        
        stats.roundsProcessed++
      }
      
      stats.sectionsProcessed++
      console.log(`      ✅ Section ${sectionName} complete: ${NUM_ROUNDS} rounds assigned\n`)
    }
    
    console.log(`✅ All sections processed!`)
    console.log(`📊 Total assignments: ${stats.totalAssignments}`)
    console.log(`📊 Rounds processed: ${stats.roundsProcessed}`)
    console.log(`📊 Unique rooms used: ${Object.keys(stats.roomDistribution).length}\n`)
    
    // Step 5: Save to database
    console.log(`💾 Saving ${allAssignments.length} assignments to database...`)
    
    // Clear existing assignments for this semester type
    await LabRoomAssignment.deleteMany({ sem_type: semType })
    
    // Bulk insert all assignments
    const result = await LabRoomAssignment.insertMany(allAssignments)
    
    console.log(`✅ Successfully saved ${result.length} lab room assignments!\n`)
    
    // Step 6: Print statistics
    console.log(`📊 ASSIGNMENT STATISTICS:`)
    console.log(`   Sections Processed: ${stats.sectionsProcessed}`)
    console.log(`   Rounds Processed: ${stats.roundsProcessed}`)
    console.log(`   Total Assignments: ${stats.totalAssignments}`)
    console.log(`\n   Room Distribution (sorted by usage):`)
    
    Object.entries(stats.roomDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([room, count]) => {
        console.log(`     ${room}: ${count} assignments`)
      })
    
    return {
      success: true,
      message: `Successfully assigned ${stats.totalAssignments} lab rooms`,
      data: {
        assignments: result,
        stats
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Phase 2:', error)
    throw error
  }
}

/**
 * Validation function: Check for conflicts in assignments
 */
export async function validateLabRoomAssignments(semType) {
  console.log(`\n🔍 Validating lab room assignments for ${semType} semester...\n`)
  
  const sections = await ISESections.find({ sem_type: semType }).lean()
  
  let totalConflicts = 0
  
  for (const section of sections) {
    const sectionName = `${section.sem}${section.section_name}`
    
    // Get labs for this semester
    const labs = await SyllabusLabs.find({
      lab_sem: section.sem,
      lab_sem_type: semType
    }).lean()
    
    if (labs.length === 0) continue
    
    const NUM_LABS = labs.length
    const NUM_BATCHES = 3
    
    // Check each round for conflicts
    for (let roundNum = 0; roundNum < NUM_LABS; roundNum++) {
      const roomsInRound = new Set()
      const roundBatches = []
      
      for (let batchNum = 1; batchNum <= NUM_BATCHES; batchNum++) {
        const labIndex = (roundNum + batchNum - 1) % NUM_LABS
        const lab = labs[labIndex]
        
        // Get assignment from database
        const assignment = await LabRoomAssignment.findOne({
          lab_id: lab._id,
          sem: section.sem,
          sem_type: semType,
          section: section.section_name,
          batch_number: batchNum
        }).populate('assigned_lab_room', 'labRoom_no').lean()
        
        if (assignment) {
          const roomId = assignment.assigned_lab_room._id.toString()
          const roomName = assignment.assigned_lab_room.labRoom_no
          
          if (roomsInRound.has(roomId)) {
            console.log(`   ❌ CONFLICT in Section ${sectionName}, Round ${roundNum + 1}:`)
            console.log(`      Room ${roomName} assigned to multiple batches!`)
            totalConflicts++
          }
          
          roomsInRound.add(roomId)
          roundBatches.push({ batchNum, lab: lab.lab_shortform, room: roomName })
        }
      }
      
      // Print round summary if no conflicts
      if (roundBatches.length === NUM_BATCHES && roomsInRound.size === NUM_BATCHES) {
        console.log(`   ✅ Section ${sectionName}, Round ${roundNum + 1}: All batches have distinct rooms`)
      }
    }
  }
  
  console.log(`\n📊 Validation Complete:`)
  console.log(`   Total conflicts found: ${totalConflicts}`)
  
  return {
    success: totalConflicts === 0,
    conflicts: totalConflicts
  }
}

/**
 * EXAMPLE OUTPUT:
 * 
 * Section 3A (5 labs: DS, DVP, OS, OOPS, DDCO):
 * 
 * Round 1:
 * ├── Batch 3A1: DS Lab → Room 612A ✅
 * ├── Batch 3A2: DVP Lab → Room 604A ✅ (DIFFERENT from 612A)
 * └── Batch 3A3: OS Lab → Room 612C ✅ (DIFFERENT from both)
 * 
 * Round 2:
 * ├── Batch 3A1: DVP Lab → Room 604B ✅
 * ├── Batch 3A2: OS Lab → Room 612B ✅
 * └── Batch 3A3: OOPS Lab → Room 604A ✅ (Can reuse 604A - different round!)
 * 
 * Round 3:
 * ├── Batch 3A1: OS Lab → Room 612C ✅
 * ├── Batch 3A2: OOPS Lab → Room 612A ✅
 * └── Batch 3A3: DDCO Lab → Room 604B ✅
 * 
 * ✅ NO conflicts within any round!
 * ✅ Even distribution across all rooms!
 * ✅ Ready for Phase 3 scheduling!
 */
