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
 * Helper: Check how many days already have 8:00 AM start for a section
 */
function countEarlyStartDays(timetable) {
  const earlyStartDays = new Set()
  
  // Check theory slots starting at 8:00
  const theorySlots = timetable.theory_slots || []
  theorySlots.forEach(slot => {
    if (slot.start_time === '08:00') {
      earlyStartDays.add(slot.day)
    }
  })
  
  // Check lab slots starting at 8:00
  const labSlots = timetable.lab_slots || []
  labSlots.forEach(slot => {
    if (slot.start_time === '08:00') {
      earlyStartDays.add(slot.day)
    }
  })
  
  return earlyStartDays.size
}

/**
 * Helper: Check if a day already has 8:00 AM start
 */
function hasEarlyStart(timetable, day) {
  const theorySlots = timetable.theory_slots || []
  const labSlots = timetable.lab_slots || []
  const hasTheoryEarly = theorySlots.some(slot => slot.day === day && slot.start_time === '08:00')
  const hasLabEarly = labSlots.some(slot => slot.day === day && slot.start_time === '08:00')
  return hasTheoryEarly || hasLabEarly
}

/**
 * Helper: Verify no teacher conflicts in theory slots
 * ONLY checks non-fixed slots (fixed slots verified in Step 2)
 */
function verifyTeacherConflicts(theorySlots) {
  const conflicts = []
  const teacherSchedule = new Map()
  
  theorySlots.forEach(slot => {
    // Skip fixed slots (verified in Step 2)
    if (slot.is_fixed_slot === true) return
    
    // Skip slots without teachers (Other Dept, projects)
    if (!slot.teacher_id) return
    
    const key = `${slot.teacher_id}_${slot.day}_${slot.start_time}`
    if (teacherSchedule.has(key)) {
      conflicts.push({
        teacher: slot.teacher_name,
        day: slot.day,
        time: slot.start_time,
        count: 2 // Simplified - could track actual count
      })
    } else {
      teacherSchedule.set(key, slot)
    }
  })
  
  return conflicts
}

/**
 * Helper: Verify day length constraint (8 AM → 4 PM, later → 5 PM)
 */
function verifyDayLengthConstraint(timetable) {
  const violations = []
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  days.forEach(day => {
    const allSlots = [
      ...(timetable.theory_slots || []).filter(s => s.day === day),
      ...(timetable.lab_slots || []).filter(s => s.day === day)
    ]
    
    if (allSlots.length === 0) return
    
    // Find earliest start and latest end
    const startTimes = allSlots.map(s => s.start_time).sort()
    const endTimes = allSlots.map(s => s.end_time).sort()
    const earliestStart = startTimes[0]
    const latestEnd = endTimes[endTimes.length - 1]
    
    // If starts at 8:00 AM, must end by 16:00 (4 PM)
    if (earliestStart === '08:00' && latestEnd > '16:00') {
      violations.push({
        day,
        startTime: earliestStart,
        endTime: latestEnd,
        expectedEnd: '16:00'
      })
    }
  })
  
  return violations
}

/**
 * Helper: Calculate gap score for a time slot with early start penalty AND subject diversity
 * Prioritizes slots that minimize gaps, avoid too many early starts, AND promote subject variety
 */
function calculateGapScore(slotStart, timetable, day, currentSubjectId = null) {
  const theorySlots = timetable.theory_slots || []
  const labSlots = timetable.lab_slots || []
  
  let score = 0
  
  // Check if there's an adjacent class before this slot
  const hasClassBefore = theorySlots.some(t => t.day === day && t.end_time === slotStart) ||
                        labSlots.some(l => l.day === day && l.end_time === slotStart)
  
  // Check if there's an adjacent class after this slot (for 1-hour slot)
  const slotEnd = addHours(slotStart, 1)
  const hasClassAfter = theorySlots.some(t => t.day === day && t.start_time === slotEnd) ||
                       labSlots.some(l => l.day === day && l.start_time === slotEnd)
  
  // CRITICAL: Penalize if this subject already scheduled on this day (subject diversity)
  if (currentSubjectId) {
    const subjectAlreadyOnDay = theorySlots.some(t => 
      t.day === day && 
      t.subject_id && 
      t.subject_id.toString() === currentSubjectId.toString()
    )
    if (subjectAlreadyOnDay) {
      score += 50 // Heavy penalty for scheduling same subject multiple times on same day
    }
  }
  
  // Count how many different subjects already on this day
  const subjectsOnDay = new Set(
    theorySlots
      .filter(t => t.day === day && t.subject_id)
      .map(t => t.subject_id.toString())
  )
  
  // Slight preference for days with more variety (don't create single-subject days)
  if (subjectsOnDay.size === 0) {
    score += 2 // Small penalty for starting a new day (prefer distributing across existing days first)
  } else if (subjectsOnDay.size === 1) {
    score -= 3 // Bonus for adding variety to single-subject day!
  }
  
  // Best: Adjacent to existing classes (creates blocks)
  if (hasClassBefore && hasClassAfter) {
    score += 0 // Perfect - fills a gap
  } else if (hasClassBefore || hasClassAfter) {
    score += 1 // Good - extends a block
  } else {
    // Count gap size from nearest class
    score += 10 // Base penalty for isolated slot
    
    // Find nearest class before
    const classesBefore = [...theorySlots, ...labSlots]
      .filter(s => s.day === day && s.end_time < slotStart)
      .map(s => s.end_time)
    
    if (classesBefore.length > 0) {
      const nearestBefore = classesBefore.sort().reverse()[0]
      const gapBefore = (timeToMinutes(slotStart) - timeToMinutes(nearestBefore)) / 60
      score += gapBefore * 2 // Penalty increases with gap size
    }
    
    // Find nearest class after
    const classesAfter = [...theorySlots, ...labSlots]
      .filter(s => s.day === day && s.start_time > slotEnd)
      .map(s => s.start_time)
    
    if (classesAfter.length > 0) {
      const nearestAfter = classesAfter.sort()[0]
      const gapAfter = (timeToMinutes(nearestAfter) - timeToMinutes(slotEnd)) / 60
      score += gapAfter * 2 // Penalty increases with gap size
    }
  }
  
  // CRITICAL: Add penalty for 8:00 AM slots if too many early start days already
  const MAX_EARLY_START_DAYS = 3 // Maximum 3 days per week starting at 8:00 AM
  
  if (slotStart === '08:00') {
    const currentEarlyDays = countEarlyStartDays(timetable)
    
    if (currentEarlyDays >= MAX_EARLY_START_DAYS) {
      // Already have max early days - strongly discourage 8:00 AM slots
      score += 100 // Heavy penalty to avoid 8:00 AM starts
    } else if (currentEarlyDays >= MAX_EARLY_START_DAYS - 1) {
      // Close to limit - moderate penalty
      score += 20
    } else {
      // Still have room for early starts - small penalty for balance
      score += 5
    }
  }
  
  return score
}

/**
 * Helper: Convert time string to minutes
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

/**
 * Helper: Get available 1-hour time slots for a day with gap scoring
 * NOTE: Day length constraint:
 *  - If day starts at 8:00 AM → must end by 4:00 PM (16:00)
 *  - If day starts after 8:00 AM → can end by 5:00 PM (17:00)
 */
function getAvailableTimeSlots(day, timetable, currentSubjectId = null) {
  const labSlots = timetable.lab_slots || []
  const theorySlots = timetable.theory_slots || []
  
  // Check if this day starts at 8:00 AM
  const hasEarlyStartToday = hasEarlyStart(timetable, day)
  
  // Determine max end time based on day start
  const maxEndTime = hasEarlyStartToday ? '16:00' : '17:00'
  
  // All possible 1-hour slots (avoiding break times)
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
    { start: '16:00', end: '17:00' }  // Only available if day doesn't start at 8 AM
  ]
  
  // Get adjusted breaks for this day
  const adjustedBreaks = getAdjustedBreaks(day, labSlots)
  
  // Filter out unavailable slots and add gap scoring
  const availableSlots = allSlots.filter(slot => {
    // Day length constraint: if starts at 8 AM, must end by 4 PM
    if (slot.end > maxEndTime) return false
    
    // Not during breaks
    if (isBreakTime(slot.start, adjustedBreaks)) return false
    
    // Not during labs
    if (hasLabConflict(labSlots, day, slot.start, slot.end)) return false
    
    // Not already scheduled theory
    if (hasTheoryConflict(theorySlots, day, slot.start, slot.end)) return false
    
    return true
  })
  
  // Add gap score to each slot (pass subject ID for diversity scoring)
  return availableSlots.map(slot => ({
    ...slot,
    gapScore: calculateGapScore(slot.start, timetable, day, currentSubjectId)
  }))
}

/**
 * Helper: Check if consecutive slots are available for multi-hour session
 * Also respects day length constraint (8 AM start → 4 PM end max)
 */
function canScheduleConsecutiveSlots(startSlot, hours, availableSlots, timetable, day) {
  if (hours === 1) return true
  
  // Calculate end time for this session
  const sessionEndTime = addHours(startSlot.start, hours)
  
  // Check day length constraint: if day starts at 8 AM, cannot go past 4 PM
  const hasEarlyStartToday = hasEarlyStart(timetable, day)
  if (hasEarlyStartToday && sessionEndTime > '16:00') {
    return false // Would violate 8 AM → 4 PM constraint
  }
  
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
    
    // Try each day (don't shuffle - we'll use gap scoring instead)
    const daysToTry = [...WORKING_DAYS]
    
    // Schedule each session
    for (const sessionHours of sessions) {
      let sessionScheduled = false
      let bestSlot = null
      let bestDay = null
      let bestScore = Infinity
      
      // Find the best slot across all days (minimize gaps + promote variety)
      for (const day of daysToTry) {
        // CRITICAL: Respect max_hrs_Day - don't schedule same subject twice on same day
        if (usedDays.has(day)) {
          continue // Already scheduled this subject on this day
        }
        
        // Get available slots for this day (with gap scores + subject diversity)
        const availableSlots = getAvailableTimeSlots(day, timetable, subject._id)
        
        // Sort by gap score (lowest first - best slots)
        const sortedSlots = availableSlots.sort((a, b) => a.gapScore - b.gapScore)
        
        // Try to find slot that can accommodate session
        for (const slot of sortedSlots) {
          // Check if consecutive slots available (for multi-hour sessions)
          if (!canScheduleConsecutiveSlots(slot, sessionHours, availableSlots, timetable, day)) {
            continue
          }
          
          // Check teacher conflict (for ISE subjects only)
          if (subject.requires_teacher_assignment && teacher) {
            if (isTeacherBusy(teacher._id.toString(), day, slot.start)) {
              continue // Teacher busy, try next slot
            }
          }
          
          // Found a candidate slot - check if it's better than current best
          if (slot.gapScore < bestScore) {
            bestScore = slot.gapScore
            bestSlot = slot
            bestDay = day
          }
          
          break // Found valid slot for this day, move to next day
        }
      }
      
      // Schedule in the best slot found
      if (bestSlot && bestDay) {
        sessionScheduled = true
        const endTime = addHours(bestSlot.start, sessionHours)
        
        timetable.theory_slots.push({
          subject_id: subject._id,
          subject_name: subject.subject_name,
          subject_shortform: subject.subject_shortform || subject.subject_code,
          teacher_id: subject.requires_teacher_assignment && teacher ? teacher._id : null,
          teacher_name: subject.requires_teacher_assignment && teacher ? teacher.name : '[Other Dept]',
          teacher_shortform: subject.requires_teacher_assignment && teacher ? teacher.teacher_shortform : 'N/A',
          classroom_id: null, // Step 6
          classroom_name: null, // Step 6
          day: bestDay,
          start_time: bestSlot.start,
          end_time: endTime,
          duration_hours: sessionHours
        })
        
        // Log early start tracking
        const currentEarlyDays = countEarlyStartDays(timetable)
        console.log(`         ✅ Scheduled: ${bestDay} ${bestSlot.start}-${endTime} (gap score: ${bestScore}, early days: ${currentEarlyDays})`)
        
        // Mark teacher as busy (if ISE teacher)
        if (subject.requires_teacher_assignment && teacher) {
          markTeacherBusy(teacher._id.toString(), bestDay, bestSlot.start, endTime)
        }
        
        subjectScheduled++
        usedDays.add(bestDay) // Mark this day as used for this subject
        scheduledSlots.push(`${bestDay} ${bestSlot.start}-${endTime} (gap score: ${bestScore})`)
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
  console.log(`   📊 Strategy: Gap Minimization + Compact Scheduling + Integrated Breaks`)
  console.log(`   🎯 Goal: Minimize empty slots between classes for efficient time usage\n`)
  
  try {
    // CRITICAL: Clear data from THIS step and ALL future steps (5, 6, 7)
    // Keep data from Steps 1-3 (section init + fixed slots + labs)
    console.log(`\n   🗑️  Flushing data from Steps 4-7 (keeping Steps 1-3 data)...\n`)
    
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    })
    
    console.log(`   🔍 BEFORE CLEARING:`)
    for (const tt of timetables) {
      const totalBefore = tt.theory_slots.length
      const fixedBefore = tt.theory_slots.filter(s => s.is_fixed_slot === true).length
      const nonFixedBefore = tt.theory_slots.filter(s => !s.is_fixed_slot).length
      
      console.log(`      - ${tt.section_name}: ${totalBefore} total (${fixedBefore} fixed + ${nonFixedBefore} non-fixed)`)
      
      // CRITICAL FIX: For Sem 7, only keep RECENT fixed slots (not duplicates)
      // Step 2 should add max 2-3 fixed slots per section (OEC/PEC)
      if (tt.sem === 7 && fixedBefore > 10) {
        console.log(`         ⚠️⚠️⚠️ ANOMALY DETECTED: ${fixedBefore} fixed slots!`)
        console.log(`         This is likely duplicate data from previous runs`)
        console.log(`         Clearing ALL theory_slots and will re-run Step 2...`)
        tt.theory_slots = []  // Clear everything - user should re-run Step 2
      } else {
        // Keep theory_slots with is_fixed_slot = true (Step 2 fixed slots)
        // Remove theory_slots without is_fixed_slot (Step 4 scheduled theory)
        tt.theory_slots = tt.theory_slots.filter(slot => slot.is_fixed_slot === true)
      }
      
      const fixedAfter = tt.theory_slots.length
      const removedCount = totalBefore - fixedAfter
      
      console.log(`         → Keeping ${fixedAfter} fixed, removing ${removedCount} non-fixed`)
      
      // Keep lab_slots (Step 3)
      tt.generation_metadata.current_step = 3
      tt.generation_metadata.steps_completed = ['load_sections', 'block_fixed_slots', 'schedule_labs']
      await tt.save()
    }
    
    console.log(`\n   ✅ Flushed ${timetables.length} timetables (kept fixed slots + labs)`)
    
    // VERIFY: Re-read from database
    console.log(`\n   🔍 AFTER CLEARING (re-read from DB):`)
    const verifyTimetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).lean()
    
    for (const tt of verifyTimetables) {
      const total = tt.theory_slots.length
      const fixed = tt.theory_slots.filter(s => s.is_fixed_slot === true).length
      const nonFixed = tt.theory_slots.filter(s => !s.is_fixed_slot).length
      
      console.log(`      - ${tt.section_name}: ${total} total (${fixed} fixed + ${nonFixed} non-fixed)`)
      
      if (fixed > 10) {
        console.log(`         ⚠️⚠️⚠️ WARNING: ${fixed} fixed slots is ABNORMALLY HIGH!`)
        console.log(`         Expected: 1-3 fixed slots per section (OEC/PEC only)`)
      }
    }
    console.log(``)
    
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
    
    console.log(`\n🔍 DEBUG: Starting fresh - totalTheorySlotsScheduled = ${totalTheorySlotsScheduled}\n`)
    
    // Process each section
    for (const tt of reloadedTimetables) {
      const section = await Timetable.findById(tt._id).populate('section_id').lean()
      const sectionName = section.section_name
      const sem = section.sem
      
      console.log(`\n   📝 Processing Section ${sectionName} (Sem ${sem})...`)
      console.log(`   🔍 DEBUG BEFORE SCHEDULING:`)
      console.log(`      - tt.theory_slots.length = ${tt.theory_slots?.length || 0}`)
      console.log(`      - Fixed slots in tt = ${tt.theory_slots?.filter(s => s.is_fixed_slot === true).length || 0}`)
      console.log(`      - Non-fixed slots in tt = ${tt.theory_slots?.filter(s => !s.is_fixed_slot).length || 0}`)
      console.log(`      - Current totalTheorySlotsScheduled = ${totalTheorySlotsScheduled}`)
      
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
      console.log(`      � Using Gap Minimization Strategy (reduces empty slots between classes)\n`)
      
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
      
      // Show early start distribution
      const finalEarlyDays = countEarlyStartDays(tt)
      const earlyStartDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].filter(day => 
        hasEarlyStart(tt, day)
      )
      console.log(`\n         📌 Early Start (8:00 AM) Distribution: ${finalEarlyDays} days`)
      if (earlyStartDays.length > 0) {
        console.log(`            Days with 8:00 AM classes: ${earlyStartDays.join(', ')}`)
      } else {
        console.log(`            No classes scheduled at 8:00 AM`)
      }
      
      // VERIFICATION: Check for teacher conflicts
      console.log(`\n         🔍 Verifying teacher assignments...`)
      const teacherConflicts = verifyTeacherConflicts(tt.theory_slots)
      if (teacherConflicts.length === 0) {
        console.log(`            ✅ No teacher conflicts detected!`)
      } else {
        console.log(`            ❌ WARNING: ${teacherConflicts.length} teacher conflicts found:`)
        teacherConflicts.forEach(conflict => {
          console.log(`               - ${conflict.teacher} has ${conflict.count} classes at ${conflict.day} ${conflict.time}`)
        })
      }
      
      // VERIFICATION: Check day length constraint (8 AM start → 4 PM end)
      console.log(`\n         🔍 Verifying day length constraint...`)
      const dayLengthViolations = verifyDayLengthConstraint(tt)
      if (dayLengthViolations.length === 0) {
        console.log(`            ✅ All days respect length constraint!`)
        console.log(`               (8 AM start → ends by 4 PM, later start → ends by 5 PM)`)
      } else {
        console.log(`            ❌ WARNING: ${dayLengthViolations.length} violations found:`)
        dayLengthViolations.forEach(violation => {
          console.log(`               - ${violation.day}: starts ${violation.startTime}, ends ${violation.endTime} (should end by ${violation.expectedEnd})`)
        })
      }
      
      if (results.regularISE.failed + results.otherDept.failed + results.projects.failed > 0) {
        console.log(`\n         ⚠️  Some subjects could not be fully scheduled due to:`)
        console.log(`            - Limited available time slots after labs`)
        console.log(`            - Teacher conflicts (for ISE subjects)`)
        console.log(`            - Break time constraints`)
      }
      
      console.log(`      📊 ═══════════════════════════════════════════════════════\n`)

      
      // CRITICAL: Count ONLY newly scheduled slots (before adding fixed slots back)
      console.log(`\n   🔍 DEBUG AFTER SCHEDULING:`)
      console.log(`      - tt.theory_slots.length NOW = ${tt.theory_slots.length}`)
      console.log(`      - These are NEWLY SCHEDULED (no fixed slots yet)`)
      
      const newlyScheduledCount = tt.theory_slots.length
      const previousTotal = totalTheorySlotsScheduled
      totalTheorySlotsScheduled += newlyScheduledCount
      
      console.log(`      - Adding ${newlyScheduledCount} to total`)
      console.log(`      - Total was ${previousTotal}, now ${totalTheorySlotsScheduled}`)
      
      // CRITICAL: Preserve existing theory_slots (Step 2 fixed slots) and add new ones
      const currentTimetable = await Timetable.findById(tt._id)
      const existingFixedSlots = currentTimetable.theory_slots.filter(slot => slot.is_fixed_slot === true)
      const allTheorySlots = [...existingFixedSlots, ...tt.theory_slots]
      
      console.log(`      - Fixed slots from DB: ${existingFixedSlots.length}`)
      console.log(`      - Total slots to save: ${allTheorySlots.length} (${existingFixedSlots.length} fixed + ${tt.theory_slots.length} new)`)
      
      console.log(`      ✅ Section slots: ${newlyScheduledCount} newly scheduled, ${existingFixedSlots.length} fixed slots preserved\n`)
      
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
    }
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`✅ Step 4 Complete!`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`\n🔍 FINAL DEBUG SUMMARY:`)
    console.log(`   📊 Total NEW theory slots scheduled: ${totalTheorySlotsScheduled}`)
    console.log(`   📊 Sections processed: ${reloadedTimetables.length}`)
    console.log(`   📊 Average per section: ${(totalTheorySlotsScheduled / reloadedTimetables.length).toFixed(1)} slots`)
    console.log(`\n   ⚠️  IMPORTANT: This count EXCLUDES fixed slots from Step 2!`)
    console.log(`   💡 Each section may have 1-3 fixed slots (not counted here)\n`)
    
    // Re-verify from database
    console.log(`\n🔍 DATABASE VERIFICATION:`)
    const finalVerify = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).lean()
    
    let totalInDB = 0
    let fixedInDB = 0
    let newInDB = 0
    
    finalVerify.forEach(tt => {
      const fixed = tt.theory_slots?.filter(s => s.is_fixed_slot === true).length || 0
      const nonFixed = tt.theory_slots?.filter(s => !s.is_fixed_slot).length || 0
      const total = tt.theory_slots?.length || 0
      
      totalInDB += total
      fixedInDB += fixed
      newInDB += nonFixed
      
      console.log(`   - ${tt.section_name}: ${total} total (${fixed} fixed + ${nonFixed} new)`)
    })
    
    console.log(`\n   📊 DATABASE TOTALS:`)
    console.log(`      - Total theory slots in DB: ${totalInDB}`)
    console.log(`      - Fixed slots (Step 2): ${fixedInDB}`)
    console.log(`      - NEW slots (Step 4): ${newInDB}`)
    console.log(`\n   ✅ Counter says: ${totalTheorySlotsScheduled}`)
    console.log(`   ✅ Database says: ${newInDB}`)
    console.log(`   ${totalTheorySlotsScheduled === newInDB ? '✅✅ MATCH!' : '❌❌ MISMATCH!'}\n`)
    
    return {
      success: true,
      message: `Step 4 complete: ${totalTheorySlotsScheduled} theory slots scheduled across ${reloadedTimetables.length} sections`,
      data: {
        sections_processed: reloadedTimetables.length,
        theory_slots_scheduled: totalTheorySlotsScheduled,
        average_per_section: Math.round(totalTheorySlotsScheduled / reloadedTimetables.length)
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Step 4:', error)
    throw error
  }
}
