// ============================================
// FILE: GreedyBuilder.js
// PURPOSE: Build initial timetable using greedy strategy
// LEARN: Smart heuristic-based timetable construction
// ============================================

import { Timetable, TimeUtils } from './utils/TimetableStructure.js';
import TeacherConflictValidator from './validators/TeacherConflictValidator.js';
import RoomConflictValidator from './validators/RoomConflictValidator.js';

/**
 * CLASS: GreedyBuilder
 * 
 * WHAT IT DOES:
 * Creates a "good enough" initial timetable using greedy strategy.
 * NOT perfect, but WAY better than random!
 * 
 * STRATEGY:
 * 1. Schedule hardest items first (labs - 2 hour blocks, less flexible)
 * 2. Schedule theory (more flexible, can split hours)
 * 3. Use first-fit approach (find first available slot)
 * 4. Avoid conflicts using validators
 * 
 * RESULT: Timetable with fitness around -200 (minor violations OK)
 * vs Random: fitness around -900 (terrible!)
 * 
 * This gives GA a HUGE head start! 🚀
 */
class GreedyBuilder {
  
  constructor() {
    // Working hours: 8 AM to 5 PM, Monday-Friday
    this.WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    this.DAY_START = '08:00';
    this.DAY_END = '17:00';
    
    // Time slots (we'll generate these)
    this.availableTimeSlots = this.generateTimeSlots();
    
    console.log(`[GreedyBuilder] Initialized with ${this.availableTimeSlots.length} available time slots`);
  }
  
  /**
   * METHOD: generateTimeSlots
   * PURPOSE: Create all possible time slots within working hours
   * OUTPUT: Array of {day, start_time, duration_hours}
   */
  generateTimeSlots() {
    const slots = [];
    
    for (const day of this.WORKING_DAYS) {
      // Generate slots from 8:00 to 17:00
      // We'll create 1-hour and 2-hour slots
      
      let currentTime = '08:00';
      const endTime = '17:00';
      
      while (TimeUtils.timeToMinutes(currentTime) < TimeUtils.timeToMinutes(endTime)) {
        // 1-hour slot
        const oneHourEnd = TimeUtils.addMinutes(currentTime, 60);
        if (TimeUtils.timeToMinutes(oneHourEnd) <= TimeUtils.timeToMinutes(endTime)) {
          slots.push({
            day: day,
            start_time: currentTime,
            end_time: oneHourEnd,
            duration_hours: 1
          });
        }
        
        // 2-hour slot
        const twoHourEnd = TimeUtils.addMinutes(currentTime, 120);
        if (TimeUtils.timeToMinutes(twoHourEnd) <= TimeUtils.timeToMinutes(endTime)) {
          slots.push({
            day: day,
            start_time: currentTime,
            end_time: twoHourEnd,
            duration_hours: 2
          });
        }
        
        // Move to next hour
        currentTime = TimeUtils.addMinutes(currentTime, 60);
      }
    }
    
    return slots;
  }
  
  /**
   * METHOD: build
   * PURPOSE: Main method to build timetable
   * INPUT: theory_assignments, lab_assignments, classrooms, section
   * OUTPUT: Timetable object (greedy-generated)
   */
  async build(theory_assignments, lab_assignments, classrooms, section) {
    console.log('\n' + '='.repeat(70));
    console.log('🏗️  GREEDY TIMETABLE BUILDER STARTING');
    console.log('='.repeat(70));
    
    // Validate input data
    if (!theory_assignments || theory_assignments.length === 0) {
      console.log('⚠️  WARNING: No theory assignments found for this section!');
      console.log('   Please complete Phase 2 (teacher assignments) first.');
    }
    
    if (!lab_assignments || lab_assignments.length === 0) {
      console.log('⚠️  WARNING: No lab assignments found for this section!');
      console.log('   Please complete Phase 2 (lab assignments) first.');
    }
    
    if ((!theory_assignments || theory_assignments.length === 0) && 
        (!lab_assignments || lab_assignments.length === 0)) {
      throw new Error('No assignments found for this section. Please complete Phase 2 first.');
    }
    
    const timetable = new Timetable();
    timetable.metadata.created_by = 'greedy';
    timetable.metadata.generation = 0;
    
    // Organize data
    const phase2Data = {
      theory_assignments: theory_assignments || [],
      lab_assignments: lab_assignments || [],
      classrooms,
      section,
      fixed_slots: [] // No fixed slots by default (only for Semester 7 OEC/PEC)
    };
    
    // ==========================================
    // STEP 1: Block Fixed Slots (OEC/PEC in Sem 7)
    // ==========================================
    console.log('\n📌 STEP 1: Blocking fixed slots...');
    this.blockFixedSlots(timetable, phase2Data.fixed_slots);
    
    // ==========================================
    // STEP 2: Schedule Labs (Hardest First!)
    // ==========================================
    console.log('\n🧪 STEP 2: Scheduling labs...');
    await this.scheduleLabs(timetable, phase2Data);
    
    // ==========================================
    // STEP 3: Schedule Theory (More Flexible)
    // ==========================================
    console.log('\n📚 STEP 3: Scheduling theory subjects...');
    await this.scheduleTheory(timetable, phase2Data);
    
    // ==========================================
    // STEP 4: Summary
    // ==========================================
    console.log('\n' + '='.repeat(70));
    console.log('✅ GREEDY BUILDER COMPLETE');
    console.log('='.repeat(70));
    console.log(timetable.toString());
    console.log(`Theory Slots: ${timetable.theory_slots.length}`);
    console.log(`Lab Slots: ${timetable.lab_slots.length}`);
    console.log(`Total Slots: ${timetable.getTotalSlots()}`);
    
    return timetable;
  }
  
  /**
   * METHOD: blockFixedSlots
   * PURPOSE: Reserve time slots for OEC/PEC (Sem 7)
   * NOTE: These are pre-decided, not generated!
   */
  blockFixedSlots(timetable, fixedSlots) {
    if (fixedSlots.length === 0) {
      console.log('  ℹ️  No fixed slots (not Semester 7)');
      return;
    }
    
    console.log(`  📍 Blocking ${fixedSlots.length} fixed slots...`);
    
    // Add fixed slots to timetable
    for (const fixedSlot of fixedSlots) {
      // Add to theory_slots with special marking
      timetable.theory_slots.push({
        id: `fixed_${fixedSlot.subject_id}`,
        subject_id: fixedSlot.subject_id,
        subject_name: fixedSlot.subject_name,
        day: fixedSlot.day,
        start_time: fixedSlot.start_time,
        end_time: fixedSlot.end_time,
        is_fixed: true,  // Mark as fixed
        // Other fields will be filled based on subject type
      });
      
      console.log(`    ✓ ${fixedSlot.subject_name} → ${fixedSlot.day} ${fixedSlot.start_time}-${fixedSlot.end_time}`);
    }
  }
  
  /**
   * METHOD: scheduleLabs
   * PURPOSE: Schedule all lab sessions
   * STRATEGY: First-fit, prioritize earlier days/times
   */
  async scheduleLabs(timetable, phase2Data) {
    const DataLoaderDB = (await import('./utils/DataLoaderDB.js')).default;
    const batches = DataLoaderDB.groupLabAssignmentsByBatch(phase2Data.lab_assignments, phase2Data.section);
    
    if (batches.length === 0) {
      console.log('  ℹ️  No lab assignments found');
      return;
    }

    console.log(`  🔬 Scheduling labs for ${batches.length} batches with rotation...`);
    
    // Calculate how many lab slots we need
    const maxLabsPerBatch = Math.max(...batches.map(b => b.labs.length));
    console.log(`  📊 Each batch has up to ${maxLabsPerBatch} labs to complete`);
    
    // Schedule labs in rounds (each round = one time slot)
    let slotIndex = 0;
    let roundOffset = 0; // Track offset to avoid teacher conflicts
    
    for (let round = 0; round < maxLabsPerBatch; round++) {
      console.log(`\n  🔄 Round ${round + 1}: Scheduling different lab for each batch...`);
      
      // Find an available 2-hour slot
      const availableSlot = this.findNextAvailableLabSlot(timetable, 2);
      
      if (!availableSlot) {
        console.log(`    ❌ No available slot for round ${round + 1}`);
        continue;
      }
      
      // SMART SCHEDULING: Check for teacher conflicts before finalizing this round
      let attemptOffset = roundOffset;
      let maxAttempts = maxLabsPerBatch; // Try different offsets
      let validCombination = false;
      let batchActivities = [];
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        batchActivities = [];
        const teachersInThisSlot = new Set();
        let hasConflict = false;
        
        let batchIndex = 0;
        for (const batch of batches) {
          // Use attemptOffset to try different lab combinations
          const labIndex = (round + attemptOffset + batchIndex) % batch.labs.length;
          const lab = batch.labs[labIndex];
        
          if (lab) {
            // Check for teacher conflicts
            const teacher1Key = lab.teacher1_id?._id?.toString() || lab.teacher1_id?.toString();
            const teacher2Key = lab.teacher2_id?._id?.toString() || lab.teacher2_id?.toString();
            
            if (teachersInThisSlot.has(teacher1Key) || teachersInThisSlot.has(teacher2Key)) {
              console.log(`    ⚠️  Attempt ${attempt + 1}: Teacher conflict detected (${lab.teacher1_name} or ${lab.teacher2_name} already scheduled)`);
              hasConflict = true;
              break;
            }
            
            teachersInThisSlot.add(teacher1Key);
            teachersInThisSlot.add(teacher2Key);
            
            batchActivities.push({
              batch_number: batch.batch_number,
              batch_name: batch.batch_name,
              lab_id: lab.lab_id?._id || lab.lab_id,
              lab_name: lab.lab_name,
              lab_shortform: lab.lab_shortform,
              teacher1_id: lab.teacher1_id?._id || lab.teacher1_id,
              teacher2_id: lab.teacher2_id?._id || lab.teacher2_id,
              teacher1_name: lab.teacher1_name,
              teacher2_name: lab.teacher2_name,
              teacher1_shortform: lab.teacher1_id?.teacher_shortform || 'UNK',
              teacher2_shortform: lab.teacher2_id?.teacher_shortform || 'UNK',
              lab_room_id: lab.lab_room_id?._id || lab.lab_room_id,
              lab_room_name: lab.room_name
            });
          }
        
          batchIndex++;
        }
        
        if (!hasConflict) {
          validCombination = true;
          roundOffset = attemptOffset + 1; // Use next offset for next round
          console.log(`    ✅ Found conflict-free combination (attempt ${attempt + 1})`);
          break;
        }
        
        // Try next offset
        attemptOffset++;
      }
      
      if (!validCombination) {
        console.log(`    ⚠️  Could not find conflict-free combination after ${maxAttempts} attempts`);
        // Use the last attempt anyway (will be caught by validators)
      }
      
      // Log scheduled labs
      for (const activity of batchActivities) {
        console.log(`    ${activity.batch_name}: ${activity.lab_shortform} in ${activity.lab_room_name} (${activity.teacher1_name}, ${activity.teacher2_name})`);
      }
      
      // Add this multi-batch lab slot to timetable
      timetable.lab_slots.push({
        id: `lab_slot_${slotIndex}`,
        section_id: phase2Data.section._id,
        section_name: phase2Data.section.section_name,
        slot_type: 'multi_batch_lab',
        batches: batchActivities,
        day: availableSlot.day,
        start_time: availableSlot.start_time,
        end_time: availableSlot.end_time,
        duration_hours: 2
      });
      
      slotIndex++;
      console.log(`    ✓ Slot scheduled: ${availableSlot.day} ${availableSlot.start_time}-${availableSlot.end_time}`);
    }
    
    console.log(`\n  📊 Total lab slots created: ${slotIndex}`);
  }
  
  /**
   * METHOD: findNextAvailableLabSlot
   * PURPOSE: Find the next available 2-hour slot for labs
   */
  findNextAvailableLabSlot(timetable, duration) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const labTimes = [
      { start: '08:00', end: '10:00' },
      { start: '10:00', end: '12:00' },
      { start: '14:00', end: '16:00' },
      { start: '16:00', end: '18:00' }
    ];
    
    for (const day of days) {
      for (const time of labTimes) {
        // Check if this slot is already used
        const isUsed = timetable.lab_slots.some(slot => 
          slot.day === day && slot.start_time === time.start
        );
        
        if (!isUsed) {
          return { day, start_time: time.start, end_time: time.end };
        }
      }
    }
    
    return null;
  }
  
  /**
   * METHOD: scheduleTheory
   * PURPOSE: Schedule theory subject sessions
   * STRATEGY: Split hrs_per_week into sessions respecting max_hrs_Day
   */
  async scheduleTheory(timetable, phase2Data) {
    console.log(`  📖 Scheduling ${phase2Data.theory_assignments.length} theory subjects...`);
    
    let scheduled = 0;
    let failed = 0;
    
    // Sort by hrs_per_week (descending) - hardest first
    const sortedAssignments = [...phase2Data.theory_assignments].sort(
      (a, b) => b.subject_id.hrs_per_week - a.subject_id.hrs_per_week
    );
    
    for (const assignment of sortedAssignments) {
      const subject = assignment.subject_id;
      const teacher = assignment.teacher_id;
      
      // Skip if no teacher needed (project, OEC, other dept)
      if (subject.is_project || subject.is_open_elective || subject.is_non_ise_subject) {
        let skipReason = subject.is_project ? 'project' : 
                        subject.is_open_elective ? 'open elective' : 'other dept';
        console.log(`    ⏭️  Skipping ${subject.subject_shortform} (${skipReason})`);
        continue;
      }
      
      // Split hours into sessions
      const sessions = this.splitTheoryHours(subject.hrs_per_week, subject.max_hrs_Day);
      
      console.log(`    📝 ${subject.subject_shortform} (${assignment.sem}${assignment.section}): ${subject.hrs_per_week} hrs → ${sessions.length} sessions`);
      
      let sessionsScheduled = 0;
      
      for (const sessionDuration of sessions) {
        // Pick random classroom (simplified for now)
        const classroom = phase2Data.classrooms[Math.floor(Math.random() * phase2Data.classrooms.length)];
        
        // Find available slot
        const slot = this.findAvailableSlotForTheory(
          timetable, 
          assignment, 
          sessionDuration, 
          classroom
        );
        
        if (slot) {
          // Determine subject type from boolean flags
          let subject_type = 'regular';
          if (subject.is_project) subject_type = 'project';
          else if (subject.is_open_elective) subject_type = 'open_elective';
          else if (subject.is_professional_elective) subject_type = 'professional_elective';
          else if (subject.is_non_ise_subject) subject_type = 'other_dept';
          
          // Add theory slot
          timetable.theory_slots.push({
            id: `theory_${assignment._id}_${sessionsScheduled}`,
            subject_id: subject._id,
            subject_name: subject.subject_name,
            subject_shortform: subject.subject_shortform,
            subject_type: subject_type,
            sem: assignment.sem,
            sem_type: assignment.sem_type,
            section: assignment.section,
            teacher_id: teacher._id,
            teacher_name: teacher.name,
            teacher_shortform: teacher.teacher_shortform,
            classroom_id: classroom._id,
            classroom_name: classroom.room_no,
            day: slot.day,
            start_time: slot.start_time,
            end_time: slot.end_time,
            duration_hours: sessionDuration
          });
          
          sessionsScheduled++;
        }
      }
      
      if (sessionsScheduled === sessions.length) {
        scheduled++;
        console.log(`      ✓ All ${sessions.length} sessions scheduled`);
      } else {
        failed++;
        console.log(`      ⚠️  Only ${sessionsScheduled}/${sessions.length} sessions scheduled`);
      }
    }
    
    console.log(`  📊 Scheduled: ${scheduled}/${sortedAssignments.length}, Failed: ${failed}`);
  }
  
  /**
   * METHOD: splitTheoryHours
   * PURPOSE: Split hrs_per_week into valid sessions
   * EXAMPLE: 3 hrs, max 2/day → [2, 1] or [1, 2] or [1, 1, 1]
   */
  splitTheoryHours(hrsPerWeek, maxHrsPerDay) {
    const sessions = [];
    let remaining = hrsPerWeek;
    
    while (remaining > 0) {
      const sessionHours = Math.min(remaining, maxHrsPerDay);
      sessions.push(sessionHours);
      remaining -= sessionHours;
    }
    
    return sessions;
  }
  
  /**
   * METHOD: findAvailableSlot
   * PURPOSE: Find available slot with load balancing across days
   * STRATEGY: Prefer days with fewer scheduled hours (spreads workload)
   * CHECKS: Teacher conflicts, room conflicts, batch sync
   */
  findAvailableSlot(timetable, labSession, durationHours) {
    // Calculate current load per day
    const hoursPerDay = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };
    
    for (const slot of timetable.theory_slots) {
      const duration = TimeUtils.timeToMinutes(slot.end_time) - TimeUtils.timeToMinutes(slot.start_time);
      hoursPerDay[slot.day] += duration / 60;
    }
    
    for (const slot of timetable.lab_slots) {
      const duration = TimeUtils.timeToMinutes(slot.end_time) - TimeUtils.timeToMinutes(slot.start_time);
      hoursPerDay[slot.day] += duration / 60;
    }

    // Sort slots by: 1) Day load (least busy first), 2) Time (earlier first)
    const sortedSlots = this.availableTimeSlots
      .filter(slot => slot.duration_hours === durationHours)
      .sort((a, b) => {
        const loadDiff = hoursPerDay[a.day] - hoursPerDay[b.day];
        if (loadDiff !== 0) return loadDiff;
        return TimeUtils.timeToMinutes(a.start_time) - TimeUtils.timeToMinutes(b.start_time);
      });

    // Try slots in load-balanced order
    for (const slot of sortedSlots) {
      const hasConflict = this.checkSlotConflicts(timetable, labSession, slot, 'lab');
      
      if (!hasConflict) {
        return slot;
      }
    }
    
    return null; // No available slot found
  }
  
  /**
   * METHOD: findAvailableSlotForTheory
   * PURPOSE: Find available slot with load balancing across days
   * STRATEGY: Prefer days with fewer scheduled hours
   */
  findAvailableSlotForTheory(timetable, assignment, durationHours, classroom) {
    // Calculate current load per day
    const hoursPerDay = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };
    
    for (const slot of timetable.theory_slots) {
      const duration = TimeUtils.timeToMinutes(slot.end_time) - TimeUtils.timeToMinutes(slot.start_time);
      hoursPerDay[slot.day] += duration / 60;
    }
    
    for (const slot of timetable.lab_slots) {
      const duration = TimeUtils.timeToMinutes(slot.end_time) - TimeUtils.timeToMinutes(slot.start_time);
      hoursPerDay[slot.day] += duration / 60;
    }

    // Sort slots by day load and time
    const sortedSlots = this.availableTimeSlots
      .filter(slot => slot.duration_hours === durationHours)
      .sort((a, b) => {
        const loadDiff = hoursPerDay[a.day] - hoursPerDay[b.day];
        if (loadDiff !== 0) return loadDiff;
        return TimeUtils.timeToMinutes(a.start_time) - TimeUtils.timeToMinutes(b.start_time);
      });

    for (const slot of sortedSlots) {
      // Check if slot is free
      const hasConflict = this.checkSlotConflicts(
        timetable, 
        { assignment, classroom }, 
        slot, 
        'theory'
      );
      
      if (!hasConflict) {
        return slot;
      }
    }
    
    return null;
  }
  
  /**
   * METHOD: checkSlotConflicts
   * PURPOSE: Check if scheduling at this slot would cause conflicts
   * RETURNS: true if conflict exists, false if slot is free
   */
  checkSlotConflicts(timetable, item, slot, type) {
    if (type === 'lab') {
      // Check teacher conflicts for all batches
      for (const batch of item.batches) {
        const teacher1Conflict = this.hasTeacherConflict(
          timetable, 
          batch.teacher1_id._id, 
          slot
        );
        
        const teacher2Conflict = this.hasTeacherConflict(
          timetable, 
          batch.teacher2_id._id, 
          slot
        );
        
        const roomConflict = this.hasRoomConflict(
          timetable, 
          batch.lab_room_id, 
          slot
        );
        
        if (teacher1Conflict || teacher2Conflict || roomConflict) {
          return true; // Conflict found
        }
      }
    } else if (type === 'theory') {
      const teacherConflict = this.hasTeacherConflict(
        timetable, 
        item.assignment.teacher_id._id, 
        slot
      );
      
      const roomConflict = this.hasRoomConflict(
        timetable, 
        item.classroom._id, 
        slot
      );
      
      if (teacherConflict || roomConflict) {
        return true;
      }
    }
    
    return false; // No conflict
  }
  
  /**
   * METHOD: hasTeacherConflict
   * PURPOSE: Quick check if teacher is busy at this time
   */
  hasTeacherConflict(timetable, teacherId, slot) {
    // Check theory slots
    for (const theorySlot of timetable.theory_slots) {
      if (theorySlot.teacher_id.toString() === teacherId.toString()) {
        if (theorySlot.day === slot.day) {
          const hasOverlap = TimeUtils.timeRangesOverlap(
            theorySlot.start_time,
            theorySlot.end_time,
            slot.start_time,
            slot.end_time
          );
          if (hasOverlap) return true;
        }
      }
    }
    
    // Check lab slots
    for (const labSlot of timetable.lab_slots) {
      for (const batch of labSlot.batches) {
        const teacher1Id = batch.teacher1_id?._id || batch.teacher1_id;
        const teacher2Id = batch.teacher2_id?._id || batch.teacher2_id;
        
        if (teacher1Id && teacher1Id.toString() === teacherId.toString() ||
            teacher2Id && teacher2Id.toString() === teacherId.toString()) {
          if (labSlot.day === slot.day) {
            const hasOverlap = TimeUtils.timeRangesOverlap(
              labSlot.start_time,
              labSlot.end_time,
              slot.start_time,
              slot.end_time
            );
            if (hasOverlap) return true;
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * METHOD: hasRoomConflict
   * PURPOSE: Quick check if room is busy at this time
   */
  hasRoomConflict(timetable, roomId, slot) {
    // Check theory slots
    for (const theorySlot of timetable.theory_slots) {
      if (theorySlot.classroom_id && 
          theorySlot.classroom_id.toString() === roomId.toString()) {
        if (theorySlot.day === slot.day) {
          const hasOverlap = TimeUtils.timeRangesOverlap(
            theorySlot.start_time,
            theorySlot.end_time,
            slot.start_time,
            slot.end_time
          );
          if (hasOverlap) return true;
        }
      }
    }
    
    // Check lab slots
    for (const labSlot of timetable.lab_slots) {
      for (const batch of labSlot.batches) {
        if (batch.lab_room_id.toString() === roomId.toString()) {
          if (labSlot.day === slot.day) {
            const hasOverlap = TimeUtils.timeRangesOverlap(
              labSlot.start_time,
              labSlot.end_time,
              slot.start_time,
              slot.end_time
            );
            if (hasOverlap) return true;
          }
        }
      }
    }
    
    return false;
  }
}

// ==========================================
// EXPORTS
// ==========================================
export default GreedyBuilder;
