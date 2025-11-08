/**
 * STEP 4: Schedule Theory with Integrated Break Management
 * 
 * Purpose: Schedule theory subjects using greedy algorithm with random distribution
 * 
 * Strategy:
 * - Priority order: Regular ISE → Other Dept → Projects
 * - Sort by hrs_per_week (descending) - harder subjects first
 * - Random distribution across week (shuffle days/slots)
 * - Integrated break management (default 11:00-11:30, 13:00-13:30)
 * - NO classroom assignment (deferred to Step 6)
 * 
 * Input: sem_type, academic_year
 * Output: Timetables with theory_slots populated (no classrooms yet)
 */

import Timetable from '../models/timetable_model.js'
import TeacherAssignment from '../models/pre_assign_teacher_model.js'
import Subject from '../models/subjects_model.js'

// Constants
const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DEFAULT_BREAKS = [
  { start: '11:00', end: '11:30', type: 'morning' },
  { start: '13:30', end: '14:00', type: 'afternoon' }
]

// Global teacher tracker (prevents teacher conflicts across sections)
const globalTeacherSchedule = new Map()

/**
 * Helper: Shuffle array for random distribution
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
 * Helper: Check if time overlaps with break
 */
function isBreakTime(time, breaks) {
  for (const breakSlot of breaks) {
    if (time >= breakSlot.start && time < breakSlot.end) {
      return true
    }
  }
  return false
}

/**
 * Helper: Check if two time ranges overlap
 */
function timesOverlap(start1, end1, start2, end2) {
  return (start1 < end2 && end1 > start2)
}

/**
 * Helper: Add hours to time string
 */
function addHours(timeStr, hours) {
  const [h, m] = timeStr.split(':').map(Number)
  const totalMinutes = (h * 60) + m + (hours * 60)
  const newHours = Math.floor(totalMinutes / 60)
  const newMinutes = totalMinutes % 60
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`
}

/**
 * Helper: Check if lab conflicts with time slot
 */
function hasLabConflict(labSlots, day, startTime, endTime) {
  return labSlots.some(slot => {
    if (slot.day !== day) return false
    return timesOverlap(startTime, endTime, slot.start_time, slot.end_time)
  })
}

/**
 * Helper: Check if theory conflicts with time slot
 */
function hasTheoryConflict(theorySlots, day, startTime, endTime) {
  return theorySlots.some(slot => {
    if (slot.day !== day) return false
    return timesOverlap(startTime, endTime, slot.start_time, slot.end_time)
  })
}

/**
 * Helper: Get adjusted breaks for a day based on lab conflicts
 */
function getAdjustedBreaks(day, labSlots) {
  const adjustedBreaks = []
  
  for (const breakSlot of DEFAULT_BREAKS) {
    // Check if any lab overlaps with this break
    if (!hasLabConflict(labSlots, day, breakSlot.start, breakSlot.end)) {
      adjustedBreaks.push(breakSlot)
    } else {
      console.log(`      ⚠️  ${day}: Default ${breakSlot.type} break conflicts with lab, will adjust`)
      // For now, skip this break (can be enhanced to find alternative)
      // TODO: Implement findAlternativeBreakTime()
    }
  }
  
  return adjustedBreaks
}

/**
 * Helper: Get available 1-hour time slots for a day
 * NOTE: All slots MUST be within 8:00 AM - 5:00 PM (17:00) constraint
 */
function getAvailableTimeSlots(day, labSlots, theorySlots) {
  // All possible 1-hour slots (avoiding break times)
  // Maximum end time is 17:00 (5:00 PM)
  const allSlots = [
    { start: '08:00', end: '09:00' },
    { start: '09:00', end: '10:00' },
    { start: '10:00', end: '11:00' },
    // BREAK 1: 11:00-11:30 (default)
    { start: '11:30', end: '12:30' },
    { start: '12:30', end: '13:30' },
    // BREAK 2: 13:30-14:00 (default)
    { start: '14:00', end: '15:00' },
    { start: '15:00', end: '16:00' },
    { start: '16:00', end: '17:00' }  // Last slot ends exactly at 5:00 PM
  ]
  
  // Get adjusted breaks for this day
  const adjustedBreaks = getAdjustedBreaks(day, labSlots)
  
  // Filter out unavailable slots
  return allSlots.filter(slot => {
    // Not during breaks
    if (isBreakTime(slot.start, adjustedBreaks)) return false
    
    // Not during labs
    if (hasLabConflict(labSlots, day, slot.start, slot.end)) return false
    
    // Not already scheduled theory
    if (hasTheoryConflict(theorySlots, day, slot.start, slot.end)) return false
    
    return true
  })
}

/**
 * Helper: Check if consecutive slots are available for multi-hour session
 */
function canScheduleConsecutiveSlots(startSlot, hours, availableSlots) {
  if (hours === 1) return true
  
  // For 2+ hours, check if next slots are also available
  let currentTime = startSlot.start
  for (let i = 0; i < hours; i++) {
    const nextTime = addHours(currentTime, 1)
    const slotExists = availableSlots.some(s => s.start === currentTime && s.end === nextTime)
    if (!slotExists) return false
    currentTime = nextTime
  }
  
  return true
}

/**
 * Helper: Calculate session splits based on hrs_per_week and max_hrs_per_day
 */
function calculateSessionSplits(hrsPerWeek, maxHrsPerDay) {
  const sessions = []
  let remaining = hrsPerWeek
  
  while (remaining > 0) {
    const sessionHours = Math.min(remaining, maxHrsPerDay)
    sessions.push(sessionHours)
    remaining -= sessionHours
  }
  
  return sessions
}

/**
 * Helper: Check if teacher is busy at given time (global check)
 */
function isTeacherBusy(teacherId, day, startTime) {
  const key = `${teacherId}_${day}_${startTime}`
  return globalTeacherSchedule.has(key)
}

/**
 * Helper: Mark teacher as busy (global tracker)
 */
function markTeacherBusy(teacherId, day, startTime, endTime) {
  const key = `${teacherId}_${day}_${startTime}`
  globalTeacherSchedule.set(key, { day, startTime, endTime })
}

/**
 * Main: Schedule a group of subjects (by priority)
 */
async function scheduleSubjectGroup(subjects, timetable, groupName) {
  if (subjects.length === 0) {
    console.log(`      ℹ️  No ${groupName} subjects to schedule`)
    return { total: 0, scheduled: 0, failed: 0, details: [] }
  }
  
  console.log(`\n      📝 Scheduling ${subjects.length} ${groupName} subjects...`)
  
  // Sort by hrs_per_week (descending) - harder subjects first
  subjects.sort((a, b) => b.subject_id.hrs_per_week - a.subject_id.hrs_per_week)
  
  let successCount = 0
  let failCount = 0
  const details = []
  
  for (const assignment of subjects) {
    const subject = assignment.subject_id
    const teacher = assignment.teacher_id
    
    // Calculate session splits
    const sessions = calculateSessionSplits(
      subject.hrs_per_week,
      subject.max_hrs_Day || 2
    )
    
    let subjectScheduled = 0
    const scheduledSlots = []
    const usedDays = new Set() // Track days already used for this subject (respects max_hrs_Day)
    
    // Shuffle days for random distribution
    const shuffledDays = shuffleArray([...WORKING_DAYS])
    
    // Schedule each session
    for (const sessionHours of sessions) {
      let sessionScheduled = false
      
      for (const day of shuffledDays) {
        if (sessionScheduled) break
        
        // CRITICAL: Respect max_hrs_Day - don't schedule same subject twice on same day
        if (usedDays.has(day)) {
          continue // Already scheduled this subject on this day
        }
        
        // Get available slots for this day
        const availableSlots = getAvailableTimeSlots(
          day,
          timetable.lab_slots,
          timetable.theory_slots
        )
        
        // Shuffle slots for random selection
        const shuffledSlots = shuffleArray(availableSlots)
        
        // Try to find slot that can accommodate session
        for (const slot of shuffledSlots) {
          // Check if consecutive slots available (for multi-hour sessions)
          if (!canScheduleConsecutiveSlots(slot, sessionHours, availableSlots)) {
            continue
          }
          
          // Check teacher conflict (for ISE subjects only)
          if (subject.requires_teacher_assignment && teacher) {
            if (isTeacherBusy(teacher._id.toString(), day, slot.start)) {
              continue // Teacher busy, try next slot
            }
          }
          
          // Found available slot!
          const endTime = addHours(slot.start, sessionHours)
          
          timetable.theory_slots.push({
            subject_id: subject._id,
            subject_name: subject.subject_name,
            subject_shortform: subject.subject_shortform || subject.subject_code,
            teacher_id: subject.requires_teacher_assignment && teacher ? teacher._id : null,
            teacher_name: subject.requires_teacher_assignment && teacher ? teacher.name : '[Other Dept]',
            teacher_shortform: subject.requires_teacher_assignment && teacher ? teacher.teacher_shortform : 'N/A',
            classroom_id: null, // Step 6
            classroom_name: null, // Step 6
            day: day,
            start_time: slot.start,
            end_time: endTime,
            duration_hours: sessionHours
          })
          
          // Mark teacher as busy (if ISE teacher)
          if (subject.requires_teacher_assignment && teacher) {
            markTeacherBusy(teacher._id.toString(), day, slot.start, endTime)
          }
          
          sessionScheduled = true
          subjectScheduled++
          usedDays.add(day) // Mark this day as used for this subject
          scheduledSlots.push(`${day} ${slot.start}-${endTime}`)
          break
        }
      }
      
      if (!sessionScheduled) {
        console.log(`         ⚠️  Could not schedule session for ${subject.subject_shortform} (${sessionHours} hrs)`)
      }
    }
    
    const status = subjectScheduled === sessions.length ? '✅' : '⚠️'
    const teacherName = teacher ? teacher.teacher_shortform || teacher.name : '[Other Dept]'
    
    console.log(`         ${status} ${subject.subject_shortform} (${subject.hrs_per_week} hrs/week) - Teacher: ${teacherName}`)
    console.log(`            Scheduled: ${subjectScheduled}/${sessions.length} sessions → ${scheduledSlots.join(', ') || 'None'}`)
    
    if (subjectScheduled === sessions.length) {
      successCount++
    } else {
      failCount++
    }
    
    details.push({
      subject: subject.subject_shortform,
      required_hours: subject.hrs_per_week,
      sessions_needed: sessions.length,
      sessions_scheduled: subjectScheduled,
      teacher: teacherName,
      slots: scheduledSlots
    })
  }
  
  console.log(`\n      📊 ${groupName} Summary: ✅ ${successCount} fully scheduled, ⚠️  ${failCount} partial/failed`)
  
  return {
    total: subjects.length,
    scheduled: successCount,
    failed: failCount,
    details: details
  }
}

/**
 * Main: Schedule theory for all sections
 */
export async function scheduleTheory(semType, academicYear) {
  console.log(`\n📚 Step 4: Scheduling theory for ${semType} semester...`)
  console.log(`   📊 Strategy: Greedy + Random Distribution + Integrated Breaks\n`)
  
  try {
    // CRITICAL: Clear data from THIS step and ALL future steps (5, 6, 7)
    // Keep data from Steps 1-3 (section init + fixed slots + labs)
    console.log(`   🗑️  Flushing data from Steps 4-7 (keeping Steps 1-3 data)...`)
    
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    })
    
    for (const tt of timetables) {
      // Keep theory_slots with is_fixed_slot = true (Step 2 fixed slots)
      // Remove theory_slots without is_fixed_slot (Step 4 scheduled theory)
      tt.theory_slots = tt.theory_slots.filter(slot => slot.is_fixed_slot === true)
      // Keep lab_slots (Step 3)
      tt.generation_metadata.current_step = 3
      tt.generation_metadata.steps_completed = ['load_sections', 'block_fixed_slots', 'schedule_labs']
      await tt.save()
    }
    
    console.log(`   ✅ Flushed ${timetables.length} timetables (kept fixed slots + labs)\n`)
    
    // Clear global teacher tracker
    globalTeacherSchedule.clear()
    
    // Reload timetables from Step 3
    const reloadedTimetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).lean()
    
    if (reloadedTimetables.length === 0) {
      throw new Error('No timetables found. Please run Steps 1-3 first.')
    }
    
    console.log(`   📋 Found ${reloadedTimetables.length} sections to process\n`)
    
    let totalTheorySlotsScheduled = 0
    
    // Process each section
    for (const tt of reloadedTimetables) {
      const section = await Timetable.findById(tt._id).populate('section_id').lean()
      const sectionName = section.section_name
      const sem = section.sem
      
      console.log(`   📝 Processing Section ${sectionName} (Sem ${sem})...`)
      
      // Load pre-assigned theory subjects for this section (ISE teachers + Professional Electives)
      const sectionLetter = sectionName.slice(-1) // Extract 'A', 'B', 'C'
      const assignments = await TeacherAssignment.find({
        sem: sem,
        sem_type: semType,
        section: sectionLetter
      }).populate('subject_id').populate('teacher_id').lean()
      
      // CRITICAL: Also load Other Dept subjects (not in teacher assignments)
      // These subjects have is_non_ise_subject = true and don't have ISE teacher assignments
      const otherDeptSubjects = await Subject.find({
        subject_sem: sem,
        subject_sem_type: semType,
        is_non_ise_subject: true,
        is_lab: { $ne: true } // Only theory subjects
      }).lean()
      
      // CRITICAL: Also load Project subjects (not always in teacher assignments)
      const projectSubjects = await Subject.find({
        subject_sem: sem,
        subject_sem_type: semType,
        is_project: true,
        is_lab: { $ne: true } // Only theory subjects
      }).lean()
      
      console.log(`      🔍 Debug: Found ${assignments.length} teacher assignments, ${otherDeptSubjects.length} other dept subjects, ${projectSubjects.length} projects from DB`)
      
      // Create assignment-like objects for Other Dept and Projects
      const otherDeptAssignments = otherDeptSubjects.map(subject => ({
        subject_id: subject,
        teacher_id: null, // No ISE teacher
        sem: sem,
        sem_type: semType,
        section: sectionLetter
      }))
      
      const projectAssignments = projectSubjects.map(subject => ({
        subject_id: subject,
        teacher_id: null, // No teacher for projects
        sem: sem,
        sem_type: semType,
        section: sectionLetter
      }))
      
      // Combine all assignments
      const allAssignments = [...assignments, ...otherDeptAssignments, ...projectAssignments]
      
      if (allAssignments.length === 0) {
        console.log(`      ℹ️  No subjects found for this section\n`)
        continue
      }
      
      // Separate subjects by priority
      const regularISE = allAssignments.filter(a => 
        a.subject_id &&
        a.subject_id.requires_teacher_assignment === true &&
        !a.subject_id.is_project &&
        !a.subject_id.is_non_ise_subject
      )
      
      const otherDept = allAssignments.filter(a => 
        a.subject_id &&
        a.subject_id.is_non_ise_subject === true
      )
      
      const projects = allAssignments.filter(a => 
        a.subject_id &&
        a.subject_id.is_project === true
      )
      
      console.log(`      ℹ️  Found ${allAssignments.length} theory subject assignments in database`)
      console.log(`      ℹ️  Breakdown: ${regularISE.length} Regular ISE, ${otherDept.length} Other Dept, ${projects.length} Projects`)
      console.log(`      ⏰ Working Hours: 8:00 AM - 5:00 PM (with breaks at 11:00-11:30 AM, 1:30-2:00 PM)`)
      console.log(`      🎲 Using Greedy + Random Distribution Strategy\n`)
      
      // Initialize theory_slots array if not exists
      if (!tt.theory_slots) {
        tt.theory_slots = []
      }
      
      // Schedule in priority order (capture results for summary)
      const results = {
        regularISE: await scheduleSubjectGroup(regularISE, tt, 'Regular ISE'),
        otherDept: await scheduleSubjectGroup(otherDept, tt, 'Other Dept'),
        projects: await scheduleSubjectGroup(projects, tt, 'Projects')
      }
      
      // Print comprehensive section summary
      console.log(`\n      📊 ═══════════════════════════════════════════════════════`)
      console.log(`      📊 THEORY SCHEDULING SUMMARY FOR ${sectionName}`)
      console.log(`      📊 ═══════════════════════════════════════════════════════`)
      
      console.log(`\n         📌 Database Statistics:`)
      console.log(`            • Total Theory Subjects Found: ${allAssignments.length}`)
      console.log(`            • Regular ISE Subjects: ${regularISE.length}`)
      console.log(`            • Other Department Subjects: ${otherDept.length}`)
      console.log(`            • Project Subjects: ${projects.length}`)
      
      console.log(`\n         📌 Scheduling Results:`)
      console.log(`            • Regular ISE: ${results.regularISE.scheduled}/${results.regularISE.total} fully scheduled (${results.regularISE.failed} partial/failed)`)
      console.log(`            • Other Dept: ${results.otherDept.scheduled}/${results.otherDept.total} fully scheduled (${results.otherDept.failed} partial/failed)`)
      console.log(`            • Projects: ${results.projects.scheduled}/${results.projects.total} fully scheduled (${results.projects.failed} partial/failed)`)
      
      const totalScheduled = results.regularISE.scheduled + results.otherDept.scheduled + results.projects.scheduled
      const totalSubjects = allAssignments.length
      const successRate = totalSubjects > 0 ? ((totalScheduled / totalSubjects) * 100).toFixed(1) : 0
      
      console.log(`\n         📌 Overall Success Rate: ${totalScheduled}/${totalSubjects} subjects (${successRate}%)`)
      console.log(`         📌 Theory Slots Created: ${tt.theory_slots.length}`)
      
      if (results.regularISE.failed + results.otherDept.failed + results.projects.failed > 0) {
        console.log(`\n         ⚠️  Some subjects could not be fully scheduled due to:`)
        console.log(`            - Limited available time slots after labs`)
        console.log(`            - Teacher conflicts (for ISE subjects)`)
        console.log(`            - Break time constraints`)
      }
      
      console.log(`      📊 ═══════════════════════════════════════════════════════\n`)

      
      // CRITICAL: Preserve existing theory_slots (Step 2 fixed slots) and add new ones
      const currentTimetable = await Timetable.findById(tt._id)
      const existingFixedSlots = currentTimetable.theory_slots.filter(slot => slot.is_fixed_slot === true)
      const allTheorySlots = [...existingFixedSlots, ...tt.theory_slots]
      
      // Prepare summary data
      const summaryData = {
        total_subjects_found: allAssignments.length,
        regular_ise_found: regularISE.length,
        other_dept_found: otherDept.length,
        projects_found: projects.length,
        regular_ise_scheduled: results.regularISE.scheduled,
        regular_ise_failed: results.regularISE.failed,
        other_dept_scheduled: results.otherDept.scheduled,
        other_dept_failed: results.otherDept.failed,
        projects_scheduled: results.projects.scheduled,
        projects_failed: results.projects.failed,
        total_scheduled: totalScheduled,
        success_rate: successRate
      }
      
      console.log(`\n      💾 Saving to database with theory_scheduling_summary:`)
      console.log(`         ${JSON.stringify(summaryData, null, 2)}`)
      
      // Save updated timetable with theory scheduling summary
      const updateResult = await Timetable.updateOne(
        { _id: tt._id },
        {
          $set: {
            theory_slots: allTheorySlots,
            'generation_metadata.current_step': 4,
            'generation_metadata.steps_completed': [
              'load_sections',
              'block_fixed_slots',
              'schedule_labs',
              'schedule_theory'
            ],
            'generation_metadata.theory_scheduling_summary': summaryData
          }
        }
      )
      
      console.log(`      ✅ Database update result: ${updateResult.acknowledged ? 'SUCCESS' : 'FAILED'}`)
      console.log(`         Modified count: ${updateResult.modifiedCount}`)
      console.log(`         Matched count: ${updateResult.matchedCount}`)
      
      // VERIFY: Re-read from database to confirm save
      const verifyTimetable = await Timetable.findById(tt._id).lean()
      if (verifyTimetable.generation_metadata?.theory_scheduling_summary) {
        console.log(`      ✅✅ VERIFICATION SUCCESS: theory_scheduling_summary EXISTS in database!`)
        console.log(`         Success rate in DB: ${verifyTimetable.generation_metadata.theory_scheduling_summary.success_rate}%`)
      } else {
        console.log(`      ❌❌ VERIFICATION FAILED: theory_scheduling_summary NOT FOUND in database!`)
        console.log(`         This means the schema doesn't support this field.`)
      }
      
      totalTheorySlotsScheduled += tt.theory_slots.length
      console.log(`      ✅ Total theory slots: ${allTheorySlots.length} (${existingFixedSlots.length} fixed + ${tt.theory_slots.length} scheduled)\n`)
    }
    
    console.log(`\n✅ Step 4 Complete!`)
    console.log(`   📊 Total theory slots scheduled: ${totalTheorySlotsScheduled}`)
    console.log(`   📊 Sections processed: ${reloadedTimetables.length}`)
    
    return {
      success: true,
      message: 'Step 4 complete: Theory classes scheduled with breaks',
      data: {
        sections_processed: reloadedTimetables.length,
        theory_slots_scheduled: totalTheorySlotsScheduled
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Step 4:', error)
    throw error
  }
}
