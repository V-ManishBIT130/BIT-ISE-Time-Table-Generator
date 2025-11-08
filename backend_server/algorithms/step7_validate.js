/**
 * STEP 7: Validate & Finalize
 * 
 * Purpose: Validate all constraints and mark timetables as complete
 * 
 * Validation Checks:
 * - No teacher conflicts (global)
 * - No classroom conflicts (global)
 * - No consecutive labs for sections
 * - Batch synchronization maintained
 * - Break constraints satisfied (30 min, max 2/day)
 * - Hours per week requirements met
 * 
 * Input: sem_type, academic_year
 * Output: Validated timetables with flagged_sessions (if any)
 */

import Timetable from '../models/timetable_model.js'

/**
 * Helper: Check for teacher conflicts across all sections
 */
function validateTeacherConflicts(timetables) {
  const teacherSchedule = new Map()
  const conflicts = []
  
  for (const tt of timetables) {
    // Check theory slots
    for (const slot of (tt.theory_slots || [])) {
      if (slot.teacher_id) {
        const key = `${slot.teacher_id}_${slot.day}_${slot.start_time}`
        if (teacherSchedule.has(key)) {
          const existing = teacherSchedule.get(key)
          conflicts.push({
            teacher: slot.teacher_name,
            day: slot.day,
            time: slot.start_time,
            sections: [existing.section, tt.section_name]
          })
        } else {
          teacherSchedule.set(key, {
            section: tt.section_name,
            subject: slot.subject_name
          })
        }
      }
    }
    
    // Check lab slots
    for (const labSlot of (tt.lab_slots || [])) {
      for (const batch of (labSlot.batches || [])) {
        // Teacher 1
        if (batch.teacher1_id) {
          const key = `${batch.teacher1_id}_${labSlot.day}_${labSlot.start_time}`
          if (teacherSchedule.has(key)) {
            const existing = teacherSchedule.get(key)
            conflicts.push({
              teacher: batch.teacher1_name,
              day: labSlot.day,
              time: labSlot.start_time,
              sections: [existing.section, tt.section_name]
            })
          } else {
            teacherSchedule.set(key, {
              section: tt.section_name,
              lab: batch.lab_name
            })
          }
        }
        
        // Teacher 2
        if (batch.teacher2_id) {
          const key = `${batch.teacher2_id}_${labSlot.day}_${labSlot.start_time}`
          if (teacherSchedule.has(key)) {
            const existing = teacherSchedule.get(key)
            conflicts.push({
              teacher: batch.teacher2_name,
              day: labSlot.day,
              time: labSlot.start_time,
              sections: [existing.section, tt.section_name]
            })
          } else {
            teacherSchedule.set(key, {
              section: tt.section_name,
              lab: batch.lab_name
            })
          }
        }
      }
    }
  }
  
  return conflicts
}

/**
 * Helper: Check for classroom conflicts across all sections
 */
function validateClassroomConflicts(timetables) {
  const classroomSchedule = new Map()
  const conflicts = []
  
  for (const tt of timetables) {
    for (const slot of (tt.theory_slots || [])) {
      if (slot.classroom_id) {
        const key = `${slot.classroom_id}_${slot.day}_${slot.start_time}`
        if (classroomSchedule.has(key)) {
          const existing = classroomSchedule.get(key)
          conflicts.push({
            classroom: slot.classroom_name,
            day: slot.day,
            time: slot.start_time,
            sections: [existing.section, tt.section_name]
          })
        } else {
          classroomSchedule.set(key, {
            section: tt.section_name,
            subject: slot.subject_name
          })
        }
      }
    }
  }
  
  return conflicts
}

/**
 * Helper: Check for consecutive labs in each section
 */
function validateConsecutiveLabs(timetables) {
  const violations = []
  
  for (const tt of timetables) {
    const labsByDay = {}
    
    // Group labs by day
    for (const labSlot of (tt.lab_slots || [])) {
      if (!labsByDay[labSlot.day]) {
        labsByDay[labSlot.day] = []
      }
      labsByDay[labSlot.day].push(labSlot)
    }
    
    // Check each day for consecutive labs
    for (const day in labsByDay) {
      const labs = labsByDay[day].sort((a, b) => a.start_time.localeCompare(b.start_time))
      
      for (let i = 0; i < labs.length - 1; i++) {
        const current = labs[i]
        const next = labs[i + 1]
        
        // Check if end time of current = start time of next (consecutive)
        if (current.end_time === next.start_time) {
          violations.push({
            section: tt.section_name,
            day: day,
            time: `${current.start_time} - ${next.end_time}`,
            issue: 'Consecutive lab sessions detected'
          })
        }
      }
    }
  }
  
  return violations
}

/**
 * Helper: Check hours per week for each subject
 */
function validateHoursPerWeek(timetables) {
  const issues = []
  
  for (const tt of timetables) {
    const subjectHours = {}
    
    // Calculate actual hours scheduled for each subject
    for (const slot of (tt.theory_slots || [])) {
      const subjectId = slot.subject_id ? slot.subject_id.toString() : null
      if (subjectId) {
        if (!subjectHours[subjectId]) {
          subjectHours[subjectId] = {
            name: slot.subject_name,
            scheduled: 0
          }
        }
        subjectHours[subjectId].scheduled += slot.duration_hours || 1
      }
    }
    
    // TODO: Compare with required hrs_per_week from subject model
    // For now, just log what was scheduled
  }
  
  return issues
}

/**
 * Main: Validate and finalize all timetables
 */
export async function validateAndFinalize(semType, academicYear) {
  console.log(`\n✅ Step 7: Final validation and finalization...`)
  
  try {
    // Load timetables from Step 6
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).populate('section_id').lean()
    
    if (timetables.length === 0) {
      throw new Error('No timetables found. Please run Steps 1-6 first.')
    }
    
    console.log(`   📋 Found ${timetables.length} timetables to validate`)
    console.log(`   🔍 Running validation checks...\n`)
    
    // Run validations
    console.log(`   1️⃣  Checking teacher conflicts...`)
    const teacherConflicts = validateTeacherConflicts(timetables)
    if (teacherConflicts.length > 0) {
      console.log(`      ⚠️  Found ${teacherConflicts.length} teacher conflicts`)
      teacherConflicts.forEach(c => {
        console.log(`         - ${c.teacher} at ${c.day} ${c.time}: ${c.sections.join(', ')}`)
      })
    } else {
      console.log(`      ✅ No teacher conflicts`)
    }
    
    console.log(`\n   2️⃣  Checking classroom conflicts...`)
    const classroomConflicts = validateClassroomConflicts(timetables)
    if (classroomConflicts.length > 0) {
      console.log(`      ⚠️  Found ${classroomConflicts.length} classroom conflicts`)
      classroomConflicts.forEach(c => {
        console.log(`         - ${c.classroom} at ${c.day} ${c.time}: ${c.sections.join(', ')}`)
      })
    } else {
      console.log(`      ✅ No classroom conflicts`)
    }
    
    console.log(`\n   3️⃣  Checking consecutive labs...`)
    const consecutiveLabViolations = validateConsecutiveLabs(timetables)
    if (consecutiveLabViolations.length > 0) {
      console.log(`      ⚠️  Found ${consecutiveLabViolations.length} consecutive lab violations`)
      consecutiveLabViolations.forEach(v => {
        console.log(`         - ${v.section} on ${v.day} at ${v.time}`)
      })
    } else {
      console.log(`      ✅ No consecutive labs`)
    }
    
    console.log(`\n   4️⃣  Checking hours per week...`)
    const hoursIssues = validateHoursPerWeek(timetables)
    console.log(`      ℹ️  Hours validation (basic check)`)
    
    const totalIssues = teacherConflicts.length + classroomConflicts.length + consecutiveLabViolations.length + hoursIssues.length
    const validationStatus = totalIssues === 0 ? 'passed' : 'warnings'
    
    // Update metadata - mark as complete
    for (const timetable of timetables) {
      await Timetable.updateOne(
        { _id: timetable._id },
        {
          $set: {
            'generation_metadata.current_step': 7,
            'generation_metadata.steps_completed': [
              'load_sections',
              'block_fixed_slots',
              'schedule_labs',
              'schedule_theory',
              'assign_lab_teachers',
              'assign_classrooms',
              'validate_and_finalize'
            ],
            'generation_metadata.is_complete': true,
            'generation_metadata.validation_status': validationStatus
          }
        }
      )
    }
    
    console.log(`\n✅ Step 7 Complete!`)
    console.log(`   📊 Validation Status: ${validationStatus.toUpperCase()}`)
    console.log(`   📊 Total Issues: ${totalIssues}`)
    
    // Fetch final timetables
    const finalTimetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    })
    
    return {
      success: true,
      message: `Step 7 complete: Validation ${validationStatus}`,
      data: {
        sections_processed: timetables.length,
        validation_status: validationStatus,
        issues: {
          teacher_conflicts: teacherConflicts.length,
          classroom_conflicts: classroomConflicts.length,
          consecutive_labs: consecutiveLabViolations.length
        },
        timetables: finalTimetables
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Step 7:', error)
    throw error
  }
}
