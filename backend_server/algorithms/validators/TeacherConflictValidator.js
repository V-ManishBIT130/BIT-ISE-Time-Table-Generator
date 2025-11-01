// ============================================
// FILE: TeacherConflictValidator.js
// PURPOSE: Check if a teacher is double-booked
// CONSTRAINT: Teacher cannot be in two places at once!
// ============================================

import { TimeUtils } from '../utils/TimetableStructure.js';

/**
 * CLASS: TeacherConflictValidator
 * 
 * WHAT IT DOES:
 * Ensures no teacher is assigned to multiple classes at the same time.
 * 
 * EXAMPLE CONFLICT:
 * Monday 08:00-10:00:
 *   - Section 3A, DS Theory → Teacher: Prof. DC ✅
 *   - Section 3B, DBMS Theory → Teacher: Prof. DC ❌ CONFLICT!
 * 
 * Prof. DC cannot teach both classes simultaneously!
 */
class TeacherConflictValidator {
  
  /**
   * METHOD: validate
   * PURPOSE: Check entire timetable for teacher conflicts
   * INPUT: timetable - Timetable object
   * OUTPUT: Array of conflicts found
   */
  static validate(timetable) {
    console.log('\n[TeacherConflictValidator] Starting validation...');
    
    const conflicts = [];
    
    // Check theory-theory conflicts
    const theoryConflicts = this.checkTheoryConflicts(timetable.theory_slots);
    conflicts.push(...theoryConflicts);
    
    // Check lab-lab conflicts (teachers in labs)
    const labConflicts = this.checkLabConflicts(timetable.lab_slots);
    conflicts.push(...labConflicts);
    
    // Check theory-lab conflicts (cross-type)
    const crossConflicts = this.checkCrossTypeConflicts(
      timetable.theory_slots,
      timetable.lab_slots
    );
    conflicts.push(...crossConflicts);
    
    console.log(`[TeacherConflictValidator] Found ${conflicts.length} conflicts`);
    
    return conflicts;
  }

  /**
   * METHOD: checkTheoryConflicts
   * PURPOSE: Find conflicts among theory slots
   * LOGIC: Compare each theory slot with every other theory slot
   */
  static checkTheoryConflicts(theorySlots) {
    console.log(`[Theory-Theory] Checking ${theorySlots.length} theory slots...`);
    
    const conflicts = [];
    
    // Compare each slot with every other slot
    for (let i = 0; i < theorySlots.length; i++) {
      for (let j = i + 1; j < theorySlots.length; j++) {
        const slot1 = theorySlots[i];
        const slot2 = theorySlots[j];
        
        // Check if same teacher
        if (slot1.teacher_id.toString() === slot2.teacher_id.toString()) {
          // Check if same day
          if (slot1.day === slot2.day) {
            // Check if times overlap
            const hasOverlap = TimeUtils.timeRangesOverlap(
              slot1.start_time,
              slot1.end_time,
              slot2.start_time,
              slot2.end_time
            );
            
            if (hasOverlap) {
              conflicts.push({
                type: 'teacher_conflict',
                conflict_type: 'theory-theory',
                teacher_id: slot1.teacher_id,
                teacher_name: slot1.teacher_name || 'Unknown',
                teacher_shortform: slot1.teacher_shortform || 'N/A',
                day: slot1.day,
                time_range: `${slot1.start_time}-${slot1.end_time}`,
                slot1: {
                  subject: slot1.subject_name,
                  section: slot1.section_name,
                  time: `${slot1.start_time}-${slot1.end_time}`
                },
                slot2: {
                  subject: slot2.subject_name,
                  section: slot2.section_name,
                  time: `${slot2.start_time}-${slot2.end_time}`
                },
                message: `Teacher ${slot1.teacher_shortform} assigned to both ` +
                        `${slot1.subject_name}(${slot1.section_name}) and ` +
                        `${slot2.subject_name}(${slot2.section_name}) on ` +
                        `${slot1.day} ${slot1.start_time}-${slot1.end_time}`
              });
              
              console.log(`  ❌ THEORY CONFLICT: ${slot1.teacher_shortform} teaching ${slot1.subject_shortform}(${slot1.section_name}) AND ${slot2.subject_shortform}(${slot2.section_name}) on ${slot1.day} ${slot1.start_time}`);
            }
          }
        }
      }
    }
    
    console.log(`[Theory-Theory] Found ${conflicts.length} conflicts`);
    return conflicts;
  }

  /**
   * METHOD: checkLabConflicts
   * PURPOSE: Find conflicts among lab slots
   * NOTE: Labs have 2 teachers per batch, need to check both!
   * UPDATED: Handles new multi_batch_lab format where each batch has different lab
   */
  static checkLabConflicts(labSlots) {
    console.log(`[Lab-Lab] Checking ${labSlots.length} lab slots...`);
    
    const conflicts = [];
    
    // Build a flat list of all teacher assignments in labs
    const labTeacherSlots = [];
    
    for (const labSlot of labSlots) {
      for (const batch of labSlot.batches) {
        // Add teacher 1
        labTeacherSlots.push({
          teacher_id: batch.teacher1_id,
          teacher_name: batch.teacher1_name,
          lab_name: batch.lab_shortform || batch.lab_name || labSlot.lab_name || 'Unknown Lab',
          section_name: labSlot.section_name,
          batch_name: batch.batch_name,
          day: labSlot.day,
          start_time: labSlot.start_time,
          end_time: labSlot.end_time
        });
        
        // Add teacher 2
        labTeacherSlots.push({
          teacher_id: batch.teacher2_id,
          teacher_name: batch.teacher2_name,
          lab_name: batch.lab_shortform || batch.lab_name || labSlot.lab_name || 'Unknown Lab',
          section_name: labSlot.section_name,
          batch_name: batch.batch_name,
          day: labSlot.day,
          start_time: labSlot.start_time,
          end_time: labSlot.end_time
        });
      }
    }
    
    // Now compare all teacher assignments
    for (let i = 0; i < labTeacherSlots.length; i++) {
      for (let j = i + 1; j < labTeacherSlots.length; j++) {
        const slot1 = labTeacherSlots[i];
        const slot2 = labTeacherSlots[j];
        
        // Check if same teacher
        if (slot1.teacher_id.toString() === slot2.teacher_id.toString()) {
          // Check if same day
          if (slot1.day === slot2.day) {
            // Check if times overlap
            const hasOverlap = TimeUtils.timeRangesOverlap(
              slot1.start_time,
              slot1.end_time,
              slot2.start_time,
              slot2.end_time
            );
            
            if (hasOverlap) {
              conflicts.push({
                type: 'teacher_conflict',
                conflict_type: 'lab-lab',
                teacher_id: slot1.teacher_id,
                teacher_name: slot1.teacher_name,
                day: slot1.day,
                time_range: `${slot1.start_time}-${slot1.end_time}`,
                slot1: {
                  lab: slot1.lab_name,
                  section: slot1.section_name,
                  batch: slot1.batch_name,
                  time: `${slot1.start_time}-${slot1.end_time}`
                },
                slot2: {
                  lab: slot2.lab_name,
                  section: slot2.section_name,
                  batch: slot2.batch_name,
                  time: `${slot2.start_time}-${slot2.end_time}`
                },
                message: `Teacher ${slot1.teacher_name} assigned to both ` +
                        `${slot1.lab_name}(${slot1.batch_name}) and ` +
                        `${slot2.lab_name}(${slot2.batch_name}) on ` +
                        `${slot1.day} ${slot1.start_time}-${slot1.end_time}`
              });
              
              console.log(`  ❌ LAB CONFLICT: ${slot1.teacher_name} in ${slot1.lab_name}(${slot1.batch_name}) AND ${slot2.lab_name}(${slot2.batch_name}) on ${slot1.day} ${slot1.start_time}`);
            }
          }
        }
      }
    }
    
    console.log(`[Lab-Lab] Found ${conflicts.length} conflicts`);
    return conflicts;
  }

  /**
   * METHOD: checkCrossTypeConflicts
   * PURPOSE: Find conflicts between theory and lab slots
   * EXAMPLE: Teacher in theory class AND lab at same time
   */
  static checkCrossTypeConflicts(theorySlots, labSlots) {
    console.log(`[Theory-Lab Cross] Checking cross-type conflicts...`);
    
    const conflicts = [];
    
    // For each theory slot
    for (const theorySlot of theorySlots) {
      // Check against each lab slot
      for (const labSlot of labSlots) {
        // Check if same day
        if (theorySlot.day === labSlot.day) {
          // Check if times overlap
          const hasOverlap = TimeUtils.timeRangesOverlap(
            theorySlot.start_time,
            theorySlot.end_time,
            labSlot.start_time,
            labSlot.end_time
          );
          
          if (hasOverlap) {
            // Check if theory teacher is in this lab
            for (const batch of labSlot.batches) {
              if (theorySlot.teacher_id.toString() === batch.teacher1_id.toString() ||
                  theorySlot.teacher_id.toString() === batch.teacher2_id.toString()) {
                
                conflicts.push({
                  type: 'teacher_conflict',
                  conflict_type: 'theory-lab',
                  teacher_id: theorySlot.teacher_id,
                  teacher_name: theorySlot.teacher_name,
                  teacher_shortform: theorySlot.teacher_shortform,
                  day: theorySlot.day,
                  time_range: `${theorySlot.start_time}-${theorySlot.end_time}`,
                  theory_slot: {
                    subject: theorySlot.subject_name,
                    section: theorySlot.section_name,
                    time: `${theorySlot.start_time}-${theorySlot.end_time}`
                  },
                  lab_slot: {
                    lab: labSlot.lab_name,
                    section: labSlot.section_name,
                    batch: batch.batch_name,
                    time: `${labSlot.start_time}-${labSlot.end_time}`
                  },
                  message: `Teacher ${theorySlot.teacher_shortform} assigned to both ` +
                          `${theorySlot.subject_name}(${theorySlot.section_name}) and ` +
                          `${labSlot.lab_name}(${batch.batch_name}) on ` +
                          `${theorySlot.day} ${theorySlot.start_time}-${theorySlot.end_time}`
                });
                
                console.log(`  ❌ CROSS CONFLICT: ${theorySlot.teacher_shortform} on ${theorySlot.day} ${theorySlot.start_time}`);
              }
            }
          }
        }
      }
    }
    
    console.log(`[Theory-Lab Cross] Found ${conflicts.length} conflicts`);
    return conflicts;
  }

  /**
   * METHOD: checkSingleSlot
   * PURPOSE: Check if adding a new slot would create conflict
   * USE CASE: When building timetable incrementally
   */
  static checkSingleSlot(existingSlots, newSlot, teacherId) {
    console.log(`[Single Check] Checking teacher ${teacherId} on ${newSlot.day} ${newSlot.start_time}`);
    
    // Filter slots with this teacher
    const teacherSlots = existingSlots.filter(slot => {
      if (slot.teacher_id) {
        return slot.teacher_id.toString() === teacherId.toString();
      }
      return false;
    });
    
    console.log(`[Single Check] Found ${teacherSlots.length} existing slots for this teacher`);
    
    // Check each for conflict
    for (const slot of teacherSlots) {
      if (slot.day === newSlot.day) {
        const hasOverlap = TimeUtils.timeRangesOverlap(
          slot.start_time,
          slot.end_time,
          newSlot.start_time,
          newSlot.end_time
        );
        
        if (hasOverlap) {
          console.log(`[Single Check] ❌ CONFLICT on ${slot.day} ${slot.start_time}`);
          return true; // Conflict found
        }
      }
    }
    
    console.log(`[Single Check] ✅ No conflict`);
    return false; // No conflict
  }
}

// ==========================================
// EXPORTS
// ==========================================
export default TeacherConflictValidator;
