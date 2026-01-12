/**
 * STEP 7: Validate & Finalize
 * 
 * Purpose: Validate all constraints and mark timetables as complete
 * 
 * Validation Checks:
 * - No teacher conflicts (global)
 * - No classroom conflicts (global)
 * - No lab room conflicts (global)
 * - No consecutive labs for sections
 * - Hours per week requirements met
 * - Teacher assignment completeness
 * 
 * Input: sem_type, academic_year
 * Output: Validated timetables with validation report
 */

import Timetable from '../models/timetable_model.js'
import Subject from '../models/subjects_model.js'

/**
 * Helper: Convert time to minutes since midnight
 */
function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Helper: Check if two time ranges overlap
 */
function timesOverlap(start1, end1, start2, end2) {
  const s1 = toMinutes(start1)
  const e1 = toMinutes(end1)
  const s2 = toMinutes(start2)
  const e2 = toMinutes(end2)
  
  // Two ranges overlap if: start1 < end2 AND start2 < end1
  return (s1 < e2 && s2 < e1)
}

/**
 * Helper: Generate all 30-minute segment keys for a time slot
 */
function generateSegmentKeys(day, startTime, endTime, resourceId) {
  const segments = []
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  const duration = end - start
  const numSegments = Math.ceil(duration / 30)
  
  for (let i = 0; i < numSegments; i++) {
    const segmentStart = start + (i * 30)
    const segmentHours = Math.floor(segmentStart / 60)
    const segmentMins = segmentStart % 60
    const segmentTime = `${String(segmentHours).padStart(2, '0')}:${String(segmentMins).padStart(2, '0')}`
    
    segments.push({
      key: `${resourceId}_${day}_${segmentTime}`,
      time: segmentTime
    })
  }
  
  return segments
}

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
        const teacherId = slot.teacher_id.toString()
        
        // Generate all 30-minute segment keys for this slot
        const segments = generateSegmentKeys(
          slot.day,
          slot.start_time,
          slot.end_time,
          teacherId
        )
        
        // Check each segment for conflicts
        for (const segment of segments) {
          if (teacherSchedule.has(segment.key)) {
            const existing = teacherSchedule.get(segment.key)
            
            // Only report conflict once per slot (not per segment)
            const conflictId = `${teacherId}_${slot.day}_${slot.start_time}_${existing.startTime}`
            if (!conflicts.find(c => c.id === conflictId)) {
              conflicts.push({
                id: conflictId,
                teacher: slot.teacher_name,
                day: slot.day,
                time1: `${slot.start_time}-${slot.end_time}`,
                time2: `${existing.startTime}-${existing.endTime}`,
                section1: tt.section_name,
                section2: existing.section,
                subject1: slot.subject_name,
                subject2: existing.subject,
                segment: segment.time
              })
            }
          } else {
            teacherSchedule.set(segment.key, {
              section: tt.section_name,
              subject: slot.subject_name,
              startTime: slot.start_time,
              endTime: slot.end_time
            })
          }
        }
      }
    }
    
    // Check lab slots
    for (const labSlot of (tt.lab_slots || [])) {
      for (const batch of (labSlot.batches || [])) {
        // Check Teacher 1
        if (batch.teacher1_id) {
          const teacherId = batch.teacher1_id.toString()
          
          const segments = generateSegmentKeys(
            labSlot.day,
            labSlot.start_time,
            labSlot.end_time,
            teacherId
          )
          
          for (const segment of segments) {
            if (teacherSchedule.has(segment.key)) {
              const existing = teacherSchedule.get(segment.key)
              
              const conflictId = `${teacherId}_${labSlot.day}_${labSlot.start_time}_${existing.startTime}`
              if (!conflicts.find(c => c.id === conflictId)) {
                conflicts.push({
                  id: conflictId,
                  teacher: batch.teacher1_name,
                  day: labSlot.day,
                  time1: `${labSlot.start_time}-${labSlot.end_time}`,
                  time2: `${existing.startTime}-${existing.endTime}`,
                  section1: `${tt.section_name} (${batch.batch_name})`,
                  section2: existing.section,
                  subject1: batch.lab_name,
                  subject2: existing.subject,
                  segment: segment.time
                })
              }
            } else {
              teacherSchedule.set(segment.key, {
                section: `${tt.section_name} (${batch.batch_name})`,
                subject: batch.lab_name,
                startTime: labSlot.start_time,
                endTime: labSlot.end_time
              })
            }
          }
        }
        
        // Check Teacher 2
        if (batch.teacher2_id) {
          const teacherId = batch.teacher2_id.toString()
          
          const segments = generateSegmentKeys(
            labSlot.day,
            labSlot.start_time,
            labSlot.end_time,
            teacherId
          )
          
          for (const segment of segments) {
            if (teacherSchedule.has(segment.key)) {
              const existing = teacherSchedule.get(segment.key)
              
              const conflictId = `${teacherId}_${labSlot.day}_${labSlot.start_time}_${existing.startTime}`
              if (!conflicts.find(c => c.id === conflictId)) {
                conflicts.push({
                  id: conflictId,
                  teacher: batch.teacher2_name,
                  day: labSlot.day,
                  time1: `${labSlot.start_time}-${labSlot.end_time}`,
                  time2: `${existing.startTime}-${existing.endTime}`,
                  section1: `${tt.section_name} (${batch.batch_name})`,
                  section2: existing.section,
                  subject1: batch.lab_name,
                  subject2: existing.subject,
                  segment: segment.time
                })
              }
            } else {
              teacherSchedule.set(segment.key, {
                section: `${tt.section_name} (${batch.batch_name})`,
                subject: batch.lab_name,
                startTime: labSlot.start_time,
                endTime: labSlot.end_time
              })
            }
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
        const classroomId = slot.classroom_id.toString()
        
        // Generate all 30-minute segment keys for this slot
        const segments = generateSegmentKeys(
          slot.day,
          slot.start_time,
          slot.end_time,
          classroomId
        )
        
        // Check each segment for conflicts
        for (const segment of segments) {
          if (classroomSchedule.has(segment.key)) {
            const existing = classroomSchedule.get(segment.key)
            
            // Only report conflict once per slot (not per segment)
            const conflictId = `${classroomId}_${slot.day}_${slot.start_time}_${existing.startTime}`
            if (!conflicts.find(c => c.id === conflictId)) {
              conflicts.push({
                id: conflictId,
                classroom: slot.classroom_name,
                day: slot.day,
                time1: `${slot.start_time}-${slot.end_time}`,
                time2: `${existing.startTime}-${existing.endTime}`,
                section1: tt.section_name,
                section2: existing.section,
                subject1: slot.subject_name,
                subject2: existing.subject,
                segment: segment.time
              })
            }
          } else {
            classroomSchedule.set(segment.key, {
              section: tt.section_name,
              subject: slot.subject_name,
              startTime: slot.start_time,
              endTime: slot.end_time
            })
          }
        }
      }
    }
  }
  
  return conflicts
}

/**
 * Helper: Check for lab room conflicts across all sections
 */
function validateLabRoomConflicts(timetables) {
  const labRoomSchedule = new Map()
  const conflicts = []
  
  for (const tt of timetables) {
    for (const labSlot of (tt.lab_slots || [])) {
      for (const batch of (labSlot.batches || [])) {
        if (batch.lab_room_id) {
          const labRoomId = batch.lab_room_id.toString()
          
          // Generate all 30-minute segment keys for this lab session
          const segments = generateSegmentKeys(
            labSlot.day,
            labSlot.start_time,
            labSlot.end_time,
            labRoomId
          )
          
          // Check each segment for conflicts
          for (const segment of segments) {
            if (labRoomSchedule.has(segment.key)) {
              const existing = labRoomSchedule.get(segment.key)
              
              // Only report conflict once per slot (not per segment)
              const conflictId = `${labRoomId}_${labSlot.day}_${labSlot.start_time}_${existing.startTime}`
              if (!conflicts.find(c => c.id === conflictId)) {
                conflicts.push({
                  id: conflictId,
                  labRoom: batch.lab_room_name,
                  day: labSlot.day,
                  time1: `${labSlot.start_time}-${labSlot.end_time}`,
                  time2: `${existing.startTime}-${existing.endTime}`,
                  section1: `${tt.section_name} (${batch.batch_name})`,
                  section2: existing.section,
                  lab1: batch.lab_name,
                  lab2: existing.lab,
                  segment: segment.time
                })
              }
            } else {
              labRoomSchedule.set(segment.key, {
                section: `${tt.section_name} (${batch.batch_name})`,
                lab: batch.lab_name,
                startTime: labSlot.start_time,
                endTime: labSlot.end_time
              })
            }
          }
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
 * Helper: Check hours per week for each subject against required hours
 */
async function validateHoursPerWeek(timetables) {
  const issues = []
  
  // Load all subjects for comparison
  const subjects = await Subject.find({}).lean()
  const subjectMap = new Map()
  subjects.forEach(sub => {
    subjectMap.set(sub._id.toString(), {
      name: sub.subject_name,
      code: sub.subject_code,
      required: sub.hrs_per_week || 0,
      isProject: sub.is_project || false,
      requiresTeacher: sub.requires_teacher_assignment
    })
  })
  
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
    
    // Compare scheduled vs required
    for (const [subjectId, data] of Object.entries(subjectHours)) {
      const subjectInfo = subjectMap.get(subjectId)
      if (!subjectInfo) continue // Subject not found in DB
      
      const required = subjectInfo.required
      const scheduled = data.scheduled
      
      if (scheduled !== required) {
        issues.push({
          section: tt.section_name,
          subject: data.name,
          code: subjectInfo.code,
          required: required,
          scheduled: scheduled,
          difference: scheduled - required,
          severity: Math.abs(scheduled - required) > 1 ? 'high' : 'low'
        })
      }
    }
  }
  
  return issues
}

/**
 * Helper: Validate teacher assignments are complete
 * IMPORTANT: Skips subjects that don't require ISE teacher assignment:
 * - Other department subjects (Math, Physics, etc.)
 * - Open Elective Courses (OEC)
 * - Projects (Mini/Major projects)
 */
async function validateTeacherAssignments(timetables) {
  const issues = []
  
  // First, we need to get all subject IDs from theory slots to check their flags
  const subjectIds = new Set()
  for (const tt of timetables) {
    for (const slot of (tt.theory_slots || [])) {
      if (slot.subject_id) {
        subjectIds.add(slot.subject_id.toString())
      }
    }
  }
  
  // Fetch all subjects to check requires_teacher_assignment flag
  const Subject = (await import('../models/subjects_model.js')).default
  const subjects = await Subject.find({
    _id: { $in: Array.from(subjectIds) }
  }).lean()
  
  // Create a map for quick lookup
  const subjectRequiresTeacher = new Map()
  subjects.forEach(subject => {
    subjectRequiresTeacher.set(
      subject._id.toString(), 
      subject.requires_teacher_assignment !== false // Default to true if undefined
    )
  })
  
  for (const tt of timetables) {
    // Check theory slots - ONLY if subject requires teacher assignment
    for (const slot of (tt.theory_slots || [])) {
      // Skip if project (already has is_project flag in slot)
      if (slot.is_project) continue
      
      // Skip if subject doesn't require ISE teacher (Other Dept, OEC, etc.)
      const requiresTeacher = subjectRequiresTeacher.get(slot.subject_id?.toString())
      if (requiresTeacher === false) {
        // This is Other Dept, OEC, or Project - skip validation
        continue
      }
      
      // Only flag if it's an ISE subject that needs a teacher but doesn't have one
      if (!slot.teacher_id) {
        issues.push({
          section: tt.section_name,
          type: 'theory',
          subject: slot.subject_name,
          day: slot.day,
          time: `${slot.start_time}-${slot.end_time}`,
          issue: 'No teacher assigned'
        })
      }
    }
    
    // Check lab slots - ALWAYS require 2 teachers
    for (const labSlot of (tt.lab_slots || [])) {
      for (const batch of (labSlot.batches || [])) {
        const hasTeacher1 = !!batch.teacher1_id
        const hasTeacher2 = !!batch.teacher2_id
        
        if (!hasTeacher1 && !hasTeacher2) {
          issues.push({
            section: tt.section_name,
            type: 'lab',
            batch: batch.batch_name,
            lab: batch.lab_name,
            day: labSlot.day,
            time: `${labSlot.start_time}-${labSlot.end_time}`,
            issue: 'No teachers assigned (expected 2)'
          })
        } else if (!hasTeacher1 || !hasTeacher2) {
          issues.push({
            section: tt.section_name,
            type: 'lab',
            batch: batch.batch_name,
            lab: batch.lab_name,
            day: labSlot.day,
            time: `${labSlot.start_time}-${labSlot.end_time}`,
            issue: `Only 1 teacher assigned (expected 2) - Missing: ${!hasTeacher1 ? 'Teacher 1' : 'Teacher 2'}`
          })
        }
      }
    }
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
    console.log(`\n   1️⃣  Checking teacher conflicts...`)
    const teacherConflicts = validateTeacherConflicts(timetables)
    if (teacherConflicts.length > 0) {
      console.log(`      ⚠️  Found ${teacherConflicts.length} teacher conflicts`)
      teacherConflicts.forEach(c => {
        console.log(`         - ${c.teacher} at ${c.day} ${c.time1} (${c.section1}: ${c.subject1}) overlaps with ${c.time2} (${c.section2}: ${c.subject2})`)
        console.log(`           Conflict at segment: ${c.segment}`)
      })
    } else {
      console.log(`      ✅ No teacher conflicts`)
    }
    
    console.log(`\n   2️⃣  Checking classroom conflicts...`)
    const classroomConflicts = validateClassroomConflicts(timetables)
    if (classroomConflicts.length > 0) {
      console.log(`      ⚠️  Found ${classroomConflicts.length} classroom conflicts`)
      classroomConflicts.forEach(c => {
        console.log(`         - ${c.classroom} at ${c.day} ${c.time1} (${c.section1}: ${c.subject1}) overlaps with ${c.time2} (${c.section2}: ${c.subject2})`)
        console.log(`           Conflict at segment: ${c.segment}`)
      })
    } else {
      console.log(`      ✅ No classroom conflicts`)
    }
    
    console.log(`\n   3️⃣  Checking lab room conflicts...`)
    const labRoomConflicts = validateLabRoomConflicts(timetables)
    if (labRoomConflicts.length > 0) {
      console.log(`      ⚠️  Found ${labRoomConflicts.length} lab room conflicts`)
      labRoomConflicts.forEach(c => {
        console.log(`         - ${c.labRoom} at ${c.day} ${c.time1} (${c.section1}: ${c.lab1}) overlaps with ${c.time2} (${c.section2}: ${c.lab2})`)
        console.log(`           Conflict at segment: ${c.segment}`)
      })
    } else {
      console.log(`      ✅ No lab room conflicts`)
    }
    
    console.log(`\n   4️⃣  Checking consecutive labs...`)
    const consecutiveLabViolations = validateConsecutiveLabs(timetables)
    if (consecutiveLabViolations.length > 0) {
      console.log(`      ⚠️  Found ${consecutiveLabViolations.length} consecutive lab violations`)
      consecutiveLabViolations.forEach(v => {
        console.log(`         - ${v.section} on ${v.day} at ${v.time}`)
      })
    } else {
      console.log(`      ✅ No consecutive labs`)
    }
    
    console.log(`\n   5️⃣  Checking hours per week...`)
    const hoursIssues = await validateHoursPerWeek(timetables)
    if (hoursIssues.length > 0) {
      console.log(`      ⚠️  Found ${hoursIssues.length} hour discrepancies`)
      hoursIssues.forEach(issue => {
        const symbol = issue.difference > 0 ? '➕' : '➖'
        const severity = issue.severity === 'high' ? '🔴' : '🟡'
        console.log(`         ${severity} ${issue.section} - ${issue.subject} (${issue.code}): Required ${issue.required}h, Scheduled ${issue.scheduled}h ${symbol}${Math.abs(issue.difference)}h`)
      })
    } else {
      console.log(`      ✅ All subjects meet hour requirements`)
    }
    
    console.log(`\n   6️⃣  Checking teacher assignment completeness...`)
    const teacherAssignmentIssues = await validateTeacherAssignments(timetables)
    if (teacherAssignmentIssues.length > 0) {
      console.log(`      ⚠️  Found ${teacherAssignmentIssues.length} incomplete teacher assignments`)
      teacherAssignmentIssues.forEach(issue => {
        console.log(`         - ${issue.section} ${issue.type === 'lab' ? `(${issue.batch})` : ''}: ${issue.issue}`)
        console.log(`           ${issue.day} ${issue.time} - ${issue.type === 'lab' ? issue.lab : issue.subject}`)
      })
    } else {
      console.log(`      ✅ All slots have teachers assigned`)
    }
    
    const totalIssues = teacherConflicts.length + classroomConflicts.length + labRoomConflicts.length + consecutiveLabViolations.length + hoursIssues.length + teacherAssignmentIssues.length
    const validationStatus = totalIssues === 0 ? 'passed' : 'warnings'
    
    // Prepare validation summary for metadata
    const validationSummary = {
      sections_processed: timetables.length,
      validation_status: validationStatus,
      total_issues: totalIssues,
      issues: {
        teacher_conflicts: teacherConflicts.length,
        classroom_conflicts: classroomConflicts.length,
        lab_room_conflicts: labRoomConflicts.length,
        consecutive_labs: consecutiveLabViolations.length,
        hours_per_week: hoursIssues.length,
        teacher_assignments: teacherAssignmentIssues.length
      },
      details: {
        teacher_conflicts: teacherConflicts,
        classroom_conflicts: classroomConflicts,
        lab_room_conflicts: labRoomConflicts,
        consecutive_lab_violations: consecutiveLabViolations,
        hours_discrepancies: hoursIssues,
        teacher_assignment_issues: teacherAssignmentIssues
      }
    }
    
    // Update metadata - mark as complete
    console.log('\n💾 Saving validation metadata to database...')
    for (const timetable of timetables) {
      const updateResult = await Timetable.updateOne(
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
            'generation_metadata.validation_status': validationStatus,
            'generation_metadata.step7_summary': validationSummary
          }
        }
      )
      console.log(`   ✅ Updated ${timetable.section_name}: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}`)
    }
    console.log(`   ✅ Saved metadata for ${timetables.length} timetables\n`)
    
    console.log(`\n✅ Step 7 Complete!`)
    console.log(`   📊 Validation Status: ${validationStatus.toUpperCase()}`)
    console.log(`   📊 Total Issues: ${totalIssues}`)
    
    if (totalIssues === 0) {
      console.log(`   🎉 PERFECT TIMETABLE - All validations passed!\n`)
    } else {
      console.log(`   ⚠️  Review issues above before finalizing\n`)
    }
    
    // Fetch final timetables
    const finalTimetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    })
    
    return {
      success: true,
      message: `Step 7 complete: Validation ${validationStatus}`,
      data: {
        ...validationSummary,
        details: {
          teacher_conflicts: teacherConflicts,
          classroom_conflicts: classroomConflicts,
          lab_room_conflicts: labRoomConflicts,
          consecutive_lab_violations: consecutiveLabViolations,
          hours_discrepancies: hoursIssues,
          teacher_assignment_issues: teacherAssignmentIssues
        },
        timetables: finalTimetables
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Step 7:', error)
    throw error
  }
}
