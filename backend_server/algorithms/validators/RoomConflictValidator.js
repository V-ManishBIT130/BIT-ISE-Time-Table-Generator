// ============================================
// FILE: RoomConflictValidator.js
// PURPOSE: Check if a room is double-booked
// CONSTRAINT: One room cannot host two classes simultaneously!
// ============================================

import { TimeUtils } from '../utils/TimetableStructure.js';

/**
 * CLASS: RoomConflictValidator
 * 
 * WHAT IT DOES:
 * Ensures no classroom/lab room is assigned to multiple classes at the same time.
 * 
 * EXAMPLE CONFLICT:
 * Monday 08:00-10:00:
 *   - Section 3A, DS Theory → Room: ISE-601 ✅
 *   - Section 3B, DBMS Theory → Room: ISE-601 ❌ CONFLICT!
 * 
 * Room ISE-601 cannot host both classes simultaneously!
 * 
 * LEARN: This is VERY similar to TeacherConflictValidator
 *        (just checking rooms instead of teachers)
 */
class RoomConflictValidator {
  
  /**
   * METHOD: validate
   * PURPOSE: Check entire timetable for room conflicts
   * INPUT: timetable - Timetable object
   * OUTPUT: Array of conflicts found
   */
  static validate(timetable) {
    console.log('\n[RoomConflictValidator] Starting validation...');
    
    const conflicts = [];
    
    // Check classroom-classroom conflicts (theory classes)
    const classroomConflicts = this.checkClassroomConflicts(timetable.theory_slots);
    conflicts.push(...classroomConflicts);
    
    // Check lab room-lab room conflicts
    const labRoomConflicts = this.checkLabRoomConflicts(timetable.lab_slots);
    conflicts.push(...labRoomConflicts);
    
    // Check classroom-lab room conflicts (if same room used for both)
    const crossConflicts = this.checkCrossTypeConflicts(
      timetable.theory_slots,
      timetable.lab_slots
    );
    conflicts.push(...crossConflicts);
    
    console.log(`[RoomConflictValidator] Found ${conflicts.length} conflicts`);
    
    return conflicts;
  }

  /**
   * METHOD: checkClassroomConflicts
   * PURPOSE: Find conflicts among theory classrooms
   */
  static checkClassroomConflicts(theorySlots) {
    console.log(`[Classroom-Classroom] Checking ${theorySlots.length} theory slots...`);
    
    const conflicts = [];
    
    // Compare each slot with every other slot
    for (let i = 0; i < theorySlots.length; i++) {
      for (let j = i + 1; j < theorySlots.length; j++) {
        const slot1 = theorySlots[i];
        const slot2 = theorySlots[j];
        
        // Skip if no classroom assigned (project subjects)
        if (!slot1.classroom_id || !slot2.classroom_id) {
          continue;
        }
        
        // Check if same classroom
        if (slot1.classroom_id.toString() === slot2.classroom_id.toString()) {
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
                type: 'room_conflict',
                conflict_type: 'classroom-classroom',
                room_id: slot1.classroom_id,
                room_name: slot1.classroom_name || 'Unknown',
                day: slot1.day,
                time_range: `${slot1.start_time}-${slot1.end_time}`,
                slot1: {
                  subject: slot1.subject_name,
                  section: slot1.section_name,
                  teacher: slot1.teacher_shortform,
                  time: `${slot1.start_time}-${slot1.end_time}`
                },
                slot2: {
                  subject: slot2.subject_name,
                  section: slot2.section_name,
                  teacher: slot2.teacher_shortform,
                  time: `${slot2.start_time}-${slot2.end_time}`
                },
                message: `Classroom ${slot1.classroom_name} assigned to both ` +
                        `${slot1.subject_name}(${slot1.section_name}) and ` +
                        `${slot2.subject_name}(${slot2.section_name}) on ` +
                        `${slot1.day} ${slot1.start_time}-${slot1.end_time}`
              });
              
              console.log(`  ❌ CLASSROOM CONFLICT: Room ${slot1.classroom_name} used for ${slot1.subject_shortform}(${slot1.section_name}) AND ${slot2.subject_shortform}(${slot2.section_name}) on ${slot1.day} ${slot1.start_time}`);
            }
          }
        }
      }
    }
    
    console.log(`[Classroom-Classroom] Found ${conflicts.length} conflicts`);
    return conflicts;
  }

  /**
   * METHOD: checkLabRoomConflicts
   * PURPOSE: Find conflicts among lab rooms
   * NOTE: Multiple batches can use different rooms at same time (that's OK!)
   *       But SAME room for different batches at same time = CONFLICT!
   * UPDATED: Handles new multi_batch_lab format where each batch has different lab
   */
  static checkLabRoomConflicts(labSlots) {
    console.log(`[LabRoom-LabRoom] Checking ${labSlots.length} lab slots...`);
    
    const conflicts = [];
    
    // Build a flat list of all lab room assignments
    const labRoomAssignments = [];
    
    for (const labSlot of labSlots) {
      for (const batch of labSlot.batches) {
        labRoomAssignments.push({
          lab_room_id: batch.lab_room_id,
          lab_room_name: batch.lab_room_name,
          lab_name: batch.lab_shortform || batch.lab_name || 'Unknown Lab',
          section_name: labSlot.section_name,
          batch_name: batch.batch_name,
          day: labSlot.day,
          start_time: labSlot.start_time,
          end_time: labSlot.end_time
        });
      }
    }
    
    // Now compare all room assignments
    for (let i = 0; i < labRoomAssignments.length; i++) {
      for (let j = i + 1; j < labRoomAssignments.length; j++) {
        const assign1 = labRoomAssignments[i];
        const assign2 = labRoomAssignments[j];
        
        // Check if same lab room
        if (assign1.lab_room_id.toString() === assign2.lab_room_id.toString()) {
          // Check if same day
          if (assign1.day === assign2.day) {
            // Check if times overlap
            const hasOverlap = TimeUtils.timeRangesOverlap(
              assign1.start_time,
              assign1.end_time,
              assign2.start_time,
              assign2.end_time
            );
            
            if (hasOverlap) {
              conflicts.push({
                type: 'room_conflict',
                conflict_type: 'labroom-labroom',
                room_id: assign1.lab_room_id,
                room_name: assign1.lab_room_name,
                day: assign1.day,
                time_range: `${assign1.start_time}-${assign1.end_time}`,
                slot1: {
                  lab: assign1.lab_name,
                  section: assign1.section_name,
                  batch: assign1.batch_name,
                  time: `${assign1.start_time}-${assign1.end_time}`
                },
                slot2: {
                  lab: assign2.lab_name,
                  section: assign2.section_name,
                  batch: assign2.batch_name,
                  time: `${assign2.start_time}-${assign2.end_time}`
                },
                message: `Lab room ${assign1.lab_room_name} assigned to both ` +
                        `${assign1.lab_name}(${assign1.batch_name}) and ` +
                        `${assign2.lab_name}(${assign2.batch_name}) on ` +
                        `${assign1.day} ${assign1.start_time}-${assign1.end_time}`
              });
              
              console.log(`  ❌ LAB ROOM CONFLICT: ${assign1.lab_room_name} used for ${assign1.lab_name}(${assign1.batch_name}) AND ${assign2.lab_name}(${assign2.batch_name}) on ${assign1.day} ${assign1.start_time}`);
            }
          }
        }
      }
    }
    
    console.log(`[LabRoom-LabRoom] Found ${conflicts.length} conflicts`);
    return conflicts;
  }

  /**
   * METHOD: checkCrossTypeConflicts
   * PURPOSE: Find conflicts between theory classrooms and lab rooms
   * NOTE: Usually different, but some rooms might serve dual purpose
   */
  static checkCrossTypeConflicts(theorySlots, labSlots) {
    console.log(`[Classroom-LabRoom Cross] Checking cross-type conflicts...`);
    
    const conflicts = [];
    
    // For each theory slot
    for (const theorySlot of theorySlots) {
      if (!theorySlot.classroom_id) continue; // Skip if no classroom
      
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
            // Check if any batch uses the same room as theory classroom
            for (const batch of labSlot.batches) {
              if (theorySlot.classroom_id.toString() === batch.lab_room_id.toString()) {
                conflicts.push({
                  type: 'room_conflict',
                  conflict_type: 'classroom-labroom',
                  room_id: theorySlot.classroom_id,
                  room_name: theorySlot.classroom_name,
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
                  message: `Room ${theorySlot.classroom_name} assigned to both ` +
                          `${theorySlot.subject_name}(${theorySlot.section_name}) and ` +
                          `${labSlot.lab_name}(${batch.batch_name}) on ` +
                          `${theorySlot.day} ${theorySlot.start_time}-${theorySlot.end_time}`
                });
                
                console.log(`  ❌ CROSS CONFLICT: Room ${theorySlot.classroom_name} on ${theorySlot.day} ${theorySlot.start_time}`);
              }
            }
          }
        }
      }
    }
    
    console.log(`[Classroom-LabRoom Cross] Found ${conflicts.length} conflicts`);
    return conflicts;
  }

  /**
   * METHOD: checkSingleSlot
   * PURPOSE: Check if adding a new slot would create room conflict
   * USE CASE: When building timetable incrementally
   */
  static checkSingleSlot(existingSlots, newSlot, roomId) {
    console.log(`[Single Check] Checking room ${roomId} on ${newSlot.day} ${newSlot.start_time}`);
    
    // Filter slots with this room
    const roomSlots = existingSlots.filter(slot => {
      if (slot.classroom_id) {
        return slot.classroom_id.toString() === roomId.toString();
      }
      if (slot.lab_room_id) {
        return slot.lab_room_id.toString() === roomId.toString();
      }
      return false;
    });
    
    console.log(`[Single Check] Found ${roomSlots.length} existing slots for this room`);
    
    // Check each for conflict
    for (const slot of roomSlots) {
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
export default RoomConflictValidator;
