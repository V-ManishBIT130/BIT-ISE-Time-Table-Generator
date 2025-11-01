// ============================================
// FILE: BatchSyncValidator.js
// PURPOSE: Check if all batches are synchronized
// CONSTRAINT: All batches of a section MUST be together in time!
// ============================================

import { TimeUtils } from '../utils/TimetableStructure.js';

/**
 * CLASS: BatchSyncValidator
 * 
 * WHAT IT DOES:
 * Ensures all batches (3A1, 3A2, 3A3) are doing SOME activity at the SAME time.
 * 
 * VALID SCENARIOS:
 * 1. All batches in theory together (one classroom)
 * 2. All batches in labs (same lab or different labs, but same time!)
 * 3. All batches in project/elective together
 * 
 * INVALID SCENARIO:
 * Monday 08:00-10:00:
 *   - Batch 3A1: In DS Lab ✅
 *   - Batch 3A2: Free time ❌ VIOLATION!
 *   - Batch 3A3: In Theory class ❌ VIOLATION!
 * 
 * ALL batches must be busy at the SAME time!
 * 
 * LEARN: This is THE MOST CRITICAL constraint for your system!
 */
class BatchSyncValidator {
  
  /**
   * METHOD: validate
   * PURPOSE: Check if all batches are synchronized throughout the week
   * INPUT: timetable - Timetable object
   * OUTPUT: Array of violations found
   */
  static validate(timetable) {
    console.log('\n[BatchSyncValidator] Starting validation...');
    
    const violations = [];
    
    // Get all sections in the timetable
    const sections = this.extractSections(timetable);
    
    console.log(`[BatchSyncValidator] Found ${sections.length} sections to check`);
    
    // Check each section
    for (const section of sections) {
      const sectionViolations = this.validateSection(section, timetable);
      violations.push(...sectionViolations);
    }
    
    console.log(`[BatchSyncValidator] Found ${violations.length} violations`);
    
    return violations;
  }

  /**
   * METHOD: extractSections
   * PURPOSE: Get list of unique sections from timetable
   */
  static extractSections(timetable) {
    const sectionMap = new Map();
    
    // From theory slots
    for (const slot of timetable.theory_slots) {
      const sectionKey = `${slot.sem}${slot.sem_type}${slot.section}`;
      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, {
          sem: slot.sem,
          sem_type: slot.sem_type,
          section: slot.section,
          section_key: sectionKey
        });
      }
    }
    
    // From lab slots
    for (const slot of timetable.lab_slots) {
      const sectionKey = `${slot.section_id}`;  // Lab slots still use section_id
      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, {
          section_id: slot.section_id,
          section_name: slot.section_name,
          section_key: sectionKey
        });
      }
    }
    
    return Array.from(sectionMap.values());
  }

  /**
   * METHOD: validateSection
   * PURPOSE: Check batch synchronization for a specific section
   * LOGIC: Build timeline for each batch, compare for alignment
   */
  static validateSection(section, timetable) {
    console.log(`\n[BatchSync] Checking section ${section.section_name}...`);
    
    const violations = [];
    
    // Build timeline for each batch
    // Assuming 3 batches: batch1, batch2, batch3
    const batchTimelines = {
      batch1: [], // Format: [{day, start_time, end_time, activity}]
      batch2: [],
      batch3: []
    };
    
    // Add theory slots (all batches together)
    for (const theorySlot of timetable.theory_slots) {
      if (theorySlot.section_id.toString() === section.section_id.toString()) {
        const activity = {
          day: theorySlot.day,
          start_time: theorySlot.start_time,
          end_time: theorySlot.end_time,
          type: 'theory',
          activity_name: `${theorySlot.subject_name} (Theory)`,
          subject_name: theorySlot.subject_name
        };
        
        // Theory: All batches together
        batchTimelines.batch1.push({ ...activity });
        batchTimelines.batch2.push({ ...activity });
        batchTimelines.batch3.push({ ...activity });
      }
    }
    
    // Add lab slots (batches separated but synchronized in time)
    for (const labSlot of timetable.lab_slots) {
      if (labSlot.section_id.toString() === section.section_id.toString()) {
        // Each batch has its own lab assignment
        labSlot.batches.forEach((batch, index) => {
          const batchKey = `batch${index + 1}`;
          const activity = {
            day: labSlot.day,
            start_time: labSlot.start_time,
            end_time: labSlot.end_time,
            type: 'lab',
            activity_name: `${labSlot.lab_name} (${batch.batch_name})`,
            lab_name: labSlot.lab_name,
            batch_name: batch.batch_name
          };
          
          batchTimelines[batchKey].push(activity);
        });
      }
    }
    
    console.log(`[BatchSync] Batch 1: ${batchTimelines.batch1.length} activities`);
    console.log(`[BatchSync] Batch 2: ${batchTimelines.batch2.length} activities`);
    console.log(`[BatchSync] Batch 3: ${batchTimelines.batch3.length} activities`);
    
    // Now check if all batches have SAME time coverage
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    for (const day of days) {
      const batch1Activities = batchTimelines.batch1.filter(a => a.day === day);
      const batch2Activities = batchTimelines.batch2.filter(a => a.day === day);
      const batch3Activities = batchTimelines.batch3.filter(a => a.day === day);
      
      // Build time ranges for each batch
      const batch1Ranges = batch1Activities.map(a => ({ start: a.start_time, end: a.end_time, activity: a.activity_name }));
      const batch2Ranges = batch2Activities.map(a => ({ start: a.start_time, end: a.end_time, activity: a.activity_name }));
      const batch3Ranges = batch3Activities.map(a => ({ start: a.start_time, end: a.end_time, activity: a.activity_name }));
      
      // Check if all batches have same time slots
      if (!this.timeRangesMatch(batch1Ranges, batch2Ranges, batch3Ranges)) {
        violations.push({
          type: 'batch_sync_violation',
          section_id: section.section_id,
          section_name: section.section_name,
          day: day,
          batch1_activities: batch1Ranges,
          batch2_activities: batch2Ranges,
          batch3_activities: batch3Ranges,
          message: `Section ${section.section_name} batches are NOT synchronized on ${day}. ` +
                  `All batches must have activities at the same time slots.`
        });
        
        console.log(`  ❌ VIOLATION on ${day}: Batches not synchronized`);
      }
    }
    
    if (violations.length === 0) {
      console.log(`[BatchSync] ✅ Section ${section.section_name} is properly synchronized`);
    }
    
    return violations;
  }

  /**
   * METHOD: timeRangesMatch
   * PURPOSE: Check if three arrays of time ranges match
   * LOGIC: All batches should have activities starting and ending at same times
   */
  static timeRangesMatch(ranges1, ranges2, ranges3) {
    // Sort ranges by start time
    const sort = (ranges) => ranges.sort((a, b) => 
      TimeUtils.timeToMinutes(a.start) - TimeUtils.timeToMinutes(b.start)
    );
    
    const sorted1 = sort([...ranges1]);
    const sorted2 = sort([...ranges2]);
    const sorted3 = sort([...ranges3]);
    
    // Must have same number of time slots
    if (sorted1.length !== sorted2.length || sorted1.length !== sorted3.length) {
      return false;
    }
    
    // Check each time slot matches
    for (let i = 0; i < sorted1.length; i++) {
      if (sorted1[i].start !== sorted2[i].start || sorted1[i].start !== sorted3[i].start) {
        return false;
      }
      if (sorted1[i].end !== sorted2[i].end || sorted1[i].end !== sorted3[i].end) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * METHOD: validateLabSlot
   * PURPOSE: Check if a lab slot has all batches (quick check)
   * USE CASE: When creating lab slots
   */
  static validateLabSlot(labSlot, expectedBatchCount = 3) {
    console.log(`[Lab Slot Check] Validating lab slot...`);
    
    if (!labSlot.batches || labSlot.batches.length !== expectedBatchCount) {
      console.log(`  ❌ Expected ${expectedBatchCount} batches, found ${labSlot.batches?.length || 0}`);
      return {
        valid: false,
        message: `Lab slot must have all ${expectedBatchCount} batches. Found: ${labSlot.batches?.length || 0}`
      };
    }
    
    console.log(`  ✅ All ${expectedBatchCount} batches present`);
    return { valid: true };
  }

  /**
   * METHOD: findUnsynchronizedSlots
   * PURPOSE: Find specific time slots where batches diverge
   * USEFUL: For detailed error reporting
   */
  static findUnsynchronizedSlots(timetable, section) {
    const unsyncSlots = [];
    
    // Build occupation map for each batch
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    for (const day of days) {
      // Get all activities for this section on this day
      const theorySlots = timetable.theory_slots.filter(
        slot => slot.section_id.toString() === section.section_id.toString() && slot.day === day
      );
      
      const labSlots = timetable.lab_slots.filter(
        slot => slot.section_id.toString() === section.section_id.toString() && slot.day === day
      );
      
      // Theory slots are synchronized (all batches together)
      // Lab slots SHOULD be synchronized (all batches at same time)
      
      // Check if any batch has different time coverage
      if (labSlots.length > 0) {
        for (const labSlot of labSlots) {
          if (labSlot.batches.length !== 3) {
            unsyncSlots.push({
              day: day,
              time: `${labSlot.start_time}-${labSlot.end_time}`,
              issue: `Only ${labSlot.batches.length} batches scheduled for ${labSlot.lab_name}`
            });
          }
        }
      }
    }
    
    return unsyncSlots;
  }
}

// ==========================================
// EXPORTS
// ==========================================
export default BatchSyncValidator;
