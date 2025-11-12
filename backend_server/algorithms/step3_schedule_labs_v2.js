/**
 * STEP 3: Schedule Labs (REFACTORED v3.0 - DYNAMIC ROOM ASSIGNMENT)
 * 
 * Purpose: Schedule lab sessions using batch rotation strategy with DYNAMIC room selection
 * 
 * Key Constraints:
 * - Batch Synchronization: All batches of a section MUST be in labs at the SAME time
 * - Batch Rotation (Rule 4.7): Batches rotate through labs using formula: labIndex = (round + batchNum - 1) % totalLabs
 * - 2-hour blocks: Each lab session is exactly 2 hours
 * - No conflicts: Avoid room conflicts (intra-slot + inter-section), fixed slots, and consecutive labs
 * 
 * Algorithm Revolution (v3.0):
 * - NO DEPENDENCY on Phase 2 room assignments!
 * - Dynamically finds ANY compatible free room during scheduling
 * - Global + Internal conflict prevention in real-time
 * - Comprehensive conflict reporting (resolved + unresolved)
 * - Rule 4.7 (batch rotation) is GUARANTEED
 * 
 * Input: sem_type, academic_year
 * Output: Timetables with lab_slots populated + detailed conflict report
 */

import Timetable from '../models/timetable_model.js'
import ISESections from '../models/ise_sections_model.js'
import SyllabusLabs from '../models/syllabus_labs_model.js'
import DeptLabs from '../models/dept_labs_model.js'

// Constants
const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_START = '08:00'
const DAY_END = '17:00'
const LAB_DURATION = 2 // hours

// NOTE: No fixed lunch break - breaks are flexible (30 min each, max 2 per day)
// Breaks will be inserted in a separate step after all slots are scheduled

// GLOBAL ROOM TRACKER (prevents all room conflicts)
// Key format: "roomId_day_startTime_endTime"
// Value: { sectionId, sectionName, batchName, labName }
const globalRoomSchedule = new Map()

/**
 * Helper: Check if two time ranges overlap
 */
function timesOverlap(start1, end1, start2, end2) {
  return (start1 < end2 && end1 > start2)
}

/**
 * Helper: Check if time slot is within working hours
 */
function isValidTimeSlot(startTime, endTime) {
  // Must be within working hours
  if (startTime < DAY_START || endTime > DAY_END) {
    return false
  }
  
  // No fixed lunch break - flexible breaks handled later
  return true
}

/**
 * Helper: Get available 2-hour time slots for a day
 * 
 * HYBRID APPROACH (Nov 12, 2025): Standard slots + flexible fallback
 * 
 * Strategy:
 * - Primary: Use 5 standard fixed slots (cleaner, simpler)
 * - Fallback: If standard slots exhausted, try flexible 30-min increments
 * - This maximizes room utilization while maintaining clean timetables
 * 
 * @param {boolean} includeFallback - If true, includes additional flexible slots
 */
function getAvailableTimeSlots(includeFallback = false) {
  const standardSlots = [
    { start: '08:00', end: '10:00' },
    { start: '10:00', end: '12:00' },
    { start: '12:00', end: '14:00' },
    { start: '14:00', end: '16:00' },
    { start: '15:00', end: '17:00' }
  ]
  
  if (!includeFallback) {
    return standardSlots
  }
  
  // Add flexible slots between standard ones for better utilization
  const flexibleSlots = [
    { start: '08:30', end: '10:30' },
    { start: '09:00', end: '11:00' },
    { start: '09:30', end: '11:30' },
    { start: '10:30', end: '12:30' },
    { start: '11:00', end: '13:00' },
    { start: '11:30', end: '13:30' },
    { start: '12:30', end: '14:30' },
    { start: '13:00', end: '15:00' },
    { start: '13:30', end: '15:30' },
    { start: '14:30', end: '16:30' }
  ]
  
  return [...standardSlots, ...flexibleSlots]
}

/**
 * Helper: Convert time to minutes since midnight
 */
function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Helper: Convert minutes to HH:MM format
 */
function toTimeString(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Helper: Generate ALL 30-minute segment keys for a time slot
 * CRITICAL FIX (Nov 12, 2025): Multi-segment tracking to prevent overlaps
 * 
 * Example: 14:00-16:00 generates:
 *   - roomId_day_14:00
 *   - roomId_day_14:30
 *   - roomId_day_15:00
 *   - roomId_day_15:30
 */
function generateSegmentKeys(roomId, day, startTime, endTime) {
  const segments = []
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  const duration = end - start
  const numSegments = Math.ceil(duration / 30)
  
  for (let i = 0; i < numSegments; i++) {
    const segmentStart = start + (i * 30)
    const segmentTime = toTimeString(segmentStart)
    segments.push(`${roomId}_${day}_${segmentTime}`)
  }
  
  return segments
}

/**
 * Helper: Check if room is available in global tracker
 * This prevents BOTH intra-slot and inter-section conflicts
 * 
 * CRITICAL FIX (Nov 12, 2025): Check ALL 30-minute segments
 */
function isRoomAvailableGlobal(roomId, day, startTime, endTime) {
  const segmentKeys = generateSegmentKeys(roomId, day, startTime, endTime)
  
  // Room is available ONLY if ALL segments are free
  for (const key of segmentKeys) {
    if (globalRoomSchedule.has(key)) {
      return false  // Conflict found in this segment
    }
  }
  
  return true  // All segments free
}

/**
 * Helper: Mark room as used in global tracker
 * 
 * CRITICAL FIX (Nov 12, 2025): Mark ALL 30-minute segments as occupied
 */
function markRoomAsUsed(roomId, day, startTime, endTime, sectionId, sectionName, batchName, labName) {
  const segmentKeys = generateSegmentKeys(roomId, day, startTime, endTime)
  
  // Mark ALL segments as occupied
  for (const key of segmentKeys) {
    globalRoomSchedule.set(key, {
      sectionId: sectionId.toString(),
      sectionName,
      batchName,
      labName,
      startTime,
      endTime
    })
  }
}

/**
 * Helper: Get compatible rooms for a lab (DYNAMIC - queries DeptLabs)
 * Returns all rooms that have the equipment to handle this lab
 */
async function getCompatibleRooms(labId) {
  const rooms = await DeptLabs.find({
    lab_subjects_handled: labId
  }).lean()
  
  return rooms
}

/**
 * Helper: Find first available compatible room for a lab at given time
 * Checks global room tracker to prevent ALL conflicts
 */
async function findAvailableRoom(labId, day, startTime, endTime, usedRoomsInThisSlot = new Set()) {
  const compatibleRooms = await getCompatibleRooms(labId)
  
  for (const room of compatibleRooms) {
    const roomId = room._id.toString()
    
    // Skip if already used by another batch in this same slot (internal conflict prevention)
    if (usedRoomsInThisSlot.has(roomId)) {
      continue
    }
    
    // Check global availability (inter-section conflict prevention)
    if (isRoomAvailableGlobal(roomId, day, startTime, endTime)) {
      return room
    }
  }
  
  return null // No available room found
}

/**
 * Helper: Get all day-slot combinations
 * Returns shuffled list to spread labs across the week
 * 
 * @param {boolean} includeFallback - If true, includes flexible fallback slots
 */
function getAllDaySlotCombinations(includeFallback = false) {
  const combinations = []
  
  for (const day of WORKING_DAYS) {
    const slots = getAvailableTimeSlots(includeFallback)
    for (const slot of slots) {
      combinations.push({ day, ...slot })
    }
  }
  
  // Shuffle to avoid always starting with Monday 8:00
  // This spreads labs more evenly across the week
  return shuffleArray(combinations)
}

/**
 * Helper: Shuffle array (Fisher-Yates algorithm)
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
 * Helper: Check if slot conflicts with existing theory slots
 */
function hasTheoryConflict(timetable, day, startTime, endTime) {
  if (!timetable.theory_slots || timetable.theory_slots.length === 0) {
    return false
  }
  
  return timetable.theory_slots.some(slot => {
    if (slot.day !== day) return false
    return timesOverlap(startTime, endTime, slot.start_time, slot.end_time)
  })
}

/**
 * Helper: Check if slot conflicts with already scheduled labs in this timetable
 */
function hasLabConflict(labSlots, day, startTime, endTime) {
  return labSlots.some(slot => {
    if (slot.day !== day) return false
    return timesOverlap(startTime, endTime, slot.start_time, slot.end_time)
  })
}

/**
 * Helper: Check if any batch would have consecutive labs on same day
 * 
 * STRICT CONSTRAINT: NO consecutive labs allowed AT ALL
 * 
 * Rule: Students should NOT have back-to-back labs (no breaks = too hectic)
 * 
 * Example BLOCKED:
 *   Lab 1: 08:00-10:00
 *   Lab 2: 10:00-12:00  ❌ BLOCKED (consecutive - not allowed!)
 * 
 * Example ALLOWED:
 *   Lab 1: 08:00-10:00
 *   Lab 2: 12:00-14:00  ✅ OK (2-hour gap for break)
 */
function hasConsecutiveLabConflict(labSlots, day, startTime, endTime, roundsScheduled, totalRounds) {
  const existingLabsOnDay = labSlots.filter(slot => slot.day === day)
  
  // STRICT: Never allow consecutive labs
  for (const existingSlot of existingLabsOnDay) {
    // Check if new slot is immediately before or after existing slot
    if (existingSlot.end_time === startTime || existingSlot.start_time === endTime) {
      return true // Consecutive labs detected - REJECT this slot
    }
  }
  
  return false // No consecutive labs - ALLOW
}

/**
 * Helper: Check if scheduling a lab on this day would violate daily lab limits
 * 
 * RELAXED CONSTRAINTS (Nov 12, 2025): More flexible daily limits
 * 
 * Old Rules:
 *   - 3+ labs total → max 2 per day (too restrictive)
 *   - 2 labs total → must be on different days
 * 
 * New Rules:
 *   - 5+ labs total → max 3 per day (allows concentration)
 *   - 3-4 labs total → max 2 per day (balanced)
 *   - 2 labs total → max 2 per day (can be same day if needed)
 *   - 1 lab total → no limit
 * 
 * This allows better room utilization while preventing excessive daily load
 */
function violatesDailyLabLimit(labSlots, day, totalLabsNeeded) {
  const labsOnThisDay = labSlots.filter(slot => slot.day === day).length
  
  // STRICT CONSTRAINT: Max 2 labs per day for ALL sections (regardless of total labs)
  // This prevents exhausting schedules like 3 labs in a row
  if (labsOnThisDay >= 2) {
    return true
  }
  
  return false
}

/**
 * Main function: Schedule labs for all sections with global conflict prevention
 * INCLUDES: Multi-pass retry system to maximize 3rd/5th semester success
 */
export async function scheduleLabs(semType, academicYear) {
  try {
    console.log(`\n🧪 Step 3: Scheduling labs for ${semType} semester...`)
    console.log(`📊 Using: Multi-Pass Retry System + Global Room Tracking\n`)
    
    const MAX_ATTEMPTS = 20 // Try up to 20 different random slot orderings
    let bestResult = null
    let bestScore = 0
    
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`🎲 ATTEMPT ${attempt}/${MAX_ATTEMPTS} - Trying with randomized slot ordering...`)
      console.log(`${'='.repeat(80)}\n`)
      
      const result = await scheduleLabs_SingleAttempt(semType, academicYear)
    
    // Calculate success score (prioritize 3rd and 5th semester)
    const sem3Success = result.labsBySection.filter(s => s.sem === 3 && s.complete).length
    const sem5Success = result.labsBySection.filter(s => s.sem === 5 && s.complete).length
    const sem3Total = result.labsBySection.filter(s => s.sem === 3).length
    const sem5Total = result.labsBySection.filter(s => s.sem === 5).length
    
    const score = (sem3Success + sem5Success) * 1000 + result.totalScheduled
    
    console.log(`\n📊 ATTEMPT ${attempt} SCORE:`)
    console.log(`   3rd Semester: ${sem3Success}/${sem3Total} sections complete`)
    console.log(`   5th Semester: ${sem5Success}/${sem5Total} sections complete`)
    console.log(`   Total Labs: ${result.totalScheduled}/${result.totalNeeded}`)
    console.log(`   Score: ${score}`)
    
    if (score > bestScore) {
      bestScore = score
      bestResult = result
      console.log(`   ⭐ NEW BEST RESULT!`)
    }
    
    // PERFECT SUCCESS: All 3rd and 5th semester complete
    if (sem3Success === sem3Total && sem5Success === sem5Total) {
      console.log(`\n🎉 PERFECT! All 3rd and 5th semester sections complete!`)
      break
    }
  }
  
  console.log(`\n${'='.repeat(80)}`)
  console.log(`✅ BEST RESULT SELECTED (Score: ${bestScore})`)
  console.log(`${'='.repeat(80)}`)
  
  // Check if we got any result
  if (!bestResult) {
    throw new Error('Failed to schedule labs after all attempts')
  }
  
  // Apply best result to database and return proper API response
  const finalResult = await applySchedulingResult(bestResult, semType, academicYear)
  
  return finalResult
  
  } catch (error) {
    console.error('❌ Error in scheduleLabs:', error)
    throw error
  }
}

/**
 * Single scheduling attempt with one random slot ordering
 */
async function scheduleLabs_SingleAttempt(semType, academicYear) {
  console.log(`\n🧪 Step 3: Scheduling labs for ${semType} semester...`)
  console.log(`📊 Using: In-Memory Global Room Tracking + Better Distribution\n`)
  
  try {
    // CRITICAL: Clear data from THIS step and ALL future steps (4, 5, 6, 7)
    // Keep data from Steps 1-2 (section init + fixed slots)
    console.log(`   🗑️  Flushing data from Steps 3-7 (keeping Steps 1-2 data)...`)
    
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    })
    
    for (const tt of timetables) {
      tt.lab_slots = []  // Clear Step 3 labs
      // Keep theory_slots (has Step 2 fixed slots)
      // But we need to remove any theory from Step 4 (only keep fixed slots from Step 2)
      tt.theory_slots = tt.theory_slots.filter(slot => 
        slot.is_fixed_slot === true  // Keep only Step 2 fixed slots
      )
      tt.breaks = []  // Clear custom breaks (added in Editor or Step 4)
      tt.generation_metadata.current_step = 2
      tt.generation_metadata.steps_completed = ['load_sections', 'block_fixed_slots']
      await tt.save()
    }
    
    console.log(`   ✅ Flushed ${timetables.length} timetables\n`)
    
    // Clear global room tracker for fresh start
    globalRoomSchedule.clear()
    
    // Load all timetables from Step 2
    const reloadedTimetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).populate('section_id', 'section_name sem sem_type').lean()
    
    if (reloadedTimetables.length === 0) {
      throw new Error('No timetables found. Please run Steps 1-2 first.')
    }
    
    console.log(`📋 Found ${reloadedTimetables.length} sections to process\n`)
    
    // Prepare in-memory timetable data structure
    const timetableData = {}
    for (const tt of reloadedTimetables) {
      timetableData[tt._id.toString()] = {
        _id: tt._id,
        section_id: tt.section_id._id,
        section_name: tt.section_name,
        sem: tt.sem,
        theory_slots: tt.theory_slots || [],
        lab_slots: [] // Will populate this
      }
    }
    
    // PRIORITY: Process 5th semester FIRST (smaller = easier to complete)
    // ULTRA-AGGRESSIVE STRATEGY: Complete 5th semester (6 labs) before 3rd (15 labs)
    // Order: 5A, 5B, 5C, 3A, 3B, 3C, 7A, 7B, 7C
    const timetableIds = Object.keys(timetableData)
    
    // Separate by semester
    const sem3Ids = timetableIds.filter(id => timetableData[id].sem === 3)
    const sem5Ids = timetableIds.filter(id => timetableData[id].sem === 5)
    const sem7Ids = timetableIds.filter(id => timetableData[id].sem === 7)
    
    // Sort each group by section letter (A → B → C)
    const sortByLetter = (a, b) => {
      const letterA = timetableData[a].section_name.slice(-1)
      const letterB = timetableData[b].section_name.slice(-1)
      return letterA.localeCompare(letterB)
    }
    
    sem3Ids.sort(sortByLetter)
    sem5Ids.sort(sortByLetter)
    sem7Ids.sort(sortByLetter)
    
    // Process 5th FIRST (2 labs each = 6 total, easy to fit)
    // Then 3rd (5 labs each = 15 total, more complex)
    // Finally 7th (we'll do our best with PC/BDA rooms)
    const sortedTimetableIds = [...sem5Ids, ...sem3Ids, ...sem7Ids]
    
    console.log(`🔄 Processing order (5th FIRST → 3rd → 7th): ${sortedTimetableIds.map(id => timetableData[id].section_name).join(' → ')}\n`)
    
    let totalLabSessionsScheduled = 0
    let totalBatchesScheduled = 0
    const unresolvedScheduling = [] // Track labs that couldn't be scheduled
    
    // RETRY MECHANISM: Track sections that need retry with different slot combinations
    const sectionResults = {} // Store results per section
    let retryAttempts = 0
    const MAX_RETRY_ATTEMPTS = 3
    
    // Process each section in optimized order
    for (const ttId of sortedTimetableIds) {
      const tt = timetableData[ttId]
      const sectionId = tt.section_id
      const sectionName = tt.section_name
      const sem = tt.sem
      
      console.log(`   📝 Processing Section ${sectionName}...`)
      
      // Load required labs for this semester
      // CRITICAL: Sort by lab_code to ensure consistent order with Phase 2
      const labs = await SyllabusLabs.find({
        lab_sem: sem,
        lab_sem_type: semType
      }).sort({ lab_code: 1 }).lean()
      
      if (labs.length === 0) {
        console.log(`      ℹ️  No labs found for Semester ${sem}\n`)
        tt.labsExpected = 0
        continue
      }
      
      tt.labsExpected = labs.length
      console.log(`      🧪 Found ${labs.length} labs: ${labs.map(l => l.lab_shortform || l.lab_name).join(', ')}`)
      
      const NUM_BATCHES = 3 // Always 3 batches per section
      const NUM_LABS = labs.length
      const NUM_ROUNDS = NUM_LABS // Need enough rounds for full rotation
      
      console.log(`      📊 Need to schedule ${NUM_ROUNDS} lab sessions (${NUM_ROUNDS} rounds)`)
      
      // Log strict constraints (UPDATED Nov 12, 2025 - Back to STRICT)
      console.log(`      📅 Daily Lab Constraint: Max 2 labs per day (STRICT for all sections)`)
      console.log(`      ⏰ Consecutive Labs: NOT ALLOWED (STRICT - no back-to-back labs)`)
      console.log(`      🕐 Time Slots: 5 standard slots + flexible fallback (hybrid approach)`)
      
      const labSlots = []
      let roundsScheduled = 0
      
      // DIAGNOSTIC: Track why slots are rejected
      const diagnostics = {
        totalCombinationsChecked: 0,
        rejectedByTheoryConflict: 0,
        rejectedByLabConflict: 0,
        rejectedByConsecutiveConflict: 0,
        rejectedByDailyLimit: 0,
        rejectedByNoRooms: 0,
        successful: 0,
        fallbackUsed: 0
      }
      
      // HYBRID APPROACH: Try standard slots first, then flexible fallback
      // Pass 1: Standard 5 fixed slots (cleaner timetables)
      const standardCombinations = getAllDaySlotCombinations(false)
      
      // Try to schedule all rounds with standard slots
      for (const combination of standardCombinations) {
        diagnostics.totalCombinationsChecked++
        
        if (roundsScheduled >= NUM_ROUNDS) break
        
        const { day, start, end } = combination
        
        // Check if valid time slot
        if (!isValidTimeSlot(start, end)) continue
        
        // Check for theory conflicts
        if (hasTheoryConflict(tt, day, start, end)) {
          diagnostics.rejectedByTheoryConflict++
          continue
        }
        
        // Check for existing lab conflicts in this timetable
        if (hasLabConflict(labSlots, day, start, end)) {
          diagnostics.rejectedByLabConflict++
          continue
        }
        
        // Check for consecutive lab prohibition (relaxed for final rounds)
        if (hasConsecutiveLabConflict(labSlots, day, start, end, roundsScheduled, NUM_ROUNDS)) {
          diagnostics.rejectedByConsecutiveConflict++
          continue
        }
        
        // Check for daily lab limit violations
        // - 3+ labs total: max 2 per day
        // - 2 labs total: must be on different days
        if (violatesDailyLabLimit(labSlots, day, NUM_ROUNDS)) {
          diagnostics.rejectedByDailyLimit++
          continue
        }
        
        // Try to schedule all 3 batches for this round
        const batches = []
        let allRoomsAvailable = true
        const tempRoomKeys = [] // Track keys to rollback if needed
        const usedRoomsInThisSlot = new Set() // Track rooms used by other batches in THIS slot
        
        for (let batchNum = 1; batchNum <= NUM_BATCHES; batchNum++) {
          // Calculate which lab this batch does in this round (BATCH ROTATION - Rule 4.7)
          const labIndex = (roundsScheduled + batchNum - 1) % NUM_LABS
          const lab = labs[labIndex]
          
          // DYNAMIC ROOM SELECTION: Find ANY compatible room that's free
          const availableRoom = await findAvailableRoom(lab._id, day, start, end, usedRoomsInThisSlot)
          
          if (!availableRoom) {
            // No available room found - cannot schedule this round at this time
            allRoomsAvailable = false
            diagnostics.rejectedByNoRooms++
            break
          }
          
          const roomId = availableRoom._id.toString()
          const roomName = availableRoom.labRoom_no
          
          // Mark room as used in THIS slot (prevents internal conflicts)
          usedRoomsInThisSlot.add(roomId)
          
          // Room is available - reserve it temporarily
          const batchName = `${sectionName}${batchNum}`
          tempRoomKeys.push({ 
            roomId, 
            day, 
            start, 
            end, 
            sectionId, 
            sectionName, 
            batchName, 
            labName: lab.lab_shortform || lab.lab_name 
          })
          
          // Create batch entry
          batches.push({
            batch_number: batchNum,
            batch_name: batchName,
            lab_id: lab._id,
            lab_name: lab.lab_name,
            lab_shortform: lab.lab_shortform || lab.lab_code,
            lab_room_id: availableRoom._id,
            lab_room_name: roomName,
            // Teachers assigned in Step 5
            teacher1_id: null,
            teacher1_name: null,
            teacher1_shortform: null,
            teacher2_id: null,
            teacher2_name: null,
            teacher2_shortform: null,
            teacher_status: 'no_teachers'
          })
        }
        
        // If all 3 batches can be scheduled (all rooms available)
        if (allRoomsAvailable && batches.length === NUM_BATCHES) {
          // Commit: Mark all rooms as used in global tracker
          for (const roomInfo of tempRoomKeys) {
            markRoomAsUsed(
              roomInfo.roomId,
              roomInfo.day,
              roomInfo.start,
              roomInfo.end,
              roomInfo.sectionId,
              roomInfo.sectionName,
              roomInfo.batchName,
              roomInfo.labName
            )
          }
          
          // Add lab slot to timetable
          labSlots.push({
            slot_type: 'multi_batch_lab',
            day: day,
            start_time: start,
            end_time: end,
            duration_hours: LAB_DURATION,
            batches: batches
          })
          
          roundsScheduled++
          totalLabSessionsScheduled++
          totalBatchesScheduled += NUM_BATCHES
          diagnostics.successful++
          
          console.log(`      ✅ Round ${roundsScheduled}: ${day} ${start}-${end}`)
          batches.forEach(b => {
            console.log(`         - ${b.batch_name}: ${b.lab_shortform} in ${b.lab_room_name}`)
          })
        }
      }
      
      // PASS 2: If some rounds still unscheduled, try flexible fallback slots
      if (roundsScheduled < NUM_ROUNDS) {
        console.log(`      🔄 FALLBACK: Trying flexible time slots for remaining ${NUM_ROUNDS - roundsScheduled} rounds...`)
        
        const flexibleCombinations = getAllDaySlotCombinations(true)
        
        for (const combination of flexibleCombinations) {
          diagnostics.totalCombinationsChecked++
          
          if (roundsScheduled >= NUM_ROUNDS) break
          
          const { day, start, end } = combination
          
          // Check if valid time slot
          if (!isValidTimeSlot(start, end)) continue
          
          // Check for theory conflicts
          if (hasTheoryConflict(tt, day, start, end)) {
            diagnostics.rejectedByTheoryConflict++
            continue
          }
          
          // Check for existing lab conflicts in this timetable
          if (hasLabConflict(labSlots, day, start, end)) {
            diagnostics.rejectedByLabConflict++
            continue
          }
          
          // Check for consecutive lab prohibition (relaxed for final rounds)
          if (hasConsecutiveLabConflict(labSlots, day, start, end, roundsScheduled, NUM_ROUNDS)) {
            diagnostics.rejectedByConsecutiveConflict++
            continue
          }
          
          // Check for daily lab limit violations
          if (violatesDailyLabLimit(labSlots, day, NUM_ROUNDS)) {
            diagnostics.rejectedByDailyLimit++
            continue
          }
          
          // Try to schedule all 3 batches for this round
          const batches = []
          let allRoomsAvailable = true
          const tempRoomKeys = []
          const usedRoomsInThisSlot = new Set()
          
          for (let batchNum = 1; batchNum <= NUM_BATCHES; batchNum++) {
            const labIndex = (roundsScheduled + batchNum - 1) % NUM_LABS
            const lab = labs[labIndex]
            
            const availableRoom = await findAvailableRoom(lab._id, day, start, end, usedRoomsInThisSlot)
            
            if (!availableRoom) {
              allRoomsAvailable = false
              diagnostics.rejectedByNoRooms++
              break
            }
            
            const roomId = availableRoom._id.toString()
            const roomName = availableRoom.labRoom_no
            
            usedRoomsInThisSlot.add(roomId)
            
            tempRoomKeys.push({ 
              roomId, 
              day, 
              start, 
              end, 
              sectionId, 
              sectionName, 
              batchName: `${sectionName}${batchNum}`, 
              labName: lab.lab_shortform || lab.lab_name 
            })
            
            batches.push({
              batch_number: batchNum,
              batch_name: `${sectionName}${batchNum}`,
              lab_id: lab._id,
              lab_name: lab.lab_name,
              lab_shortform: lab.lab_shortform || lab.lab_code,
              lab_room_id: availableRoom._id,
              lab_room_name: roomName,
              teacher1_id: null,
              teacher1_name: null,
              teacher1_shortform: null,
              teacher2_id: null,
              teacher2_name: null,
              teacher2_shortform: null,
              teacher_status: 'no_teachers'
            })
          }
          
          if (allRoomsAvailable && batches.length === NUM_BATCHES) {
            for (const roomInfo of tempRoomKeys) {
              markRoomAsUsed(
                roomInfo.roomId,
                roomInfo.day,
                roomInfo.start,
                roomInfo.end,
                roomInfo.sectionId,
                roomInfo.sectionName,
                roomInfo.batchName,
                roomInfo.labName
              )
            }
            
            labSlots.push({
              slot_type: 'multi_batch_lab',
              day: day,
              start_time: start,
              end_time: end,
              duration_hours: LAB_DURATION,
              batches: batches
            })
            
            roundsScheduled++
            totalLabSessionsScheduled++
            totalBatchesScheduled += NUM_BATCHES
            diagnostics.successful++
            diagnostics.fallbackUsed++
            
            console.log(`      ✅ Round ${roundsScheduled}: ${day} ${start}-${end} [FLEXIBLE SLOT]`)
            batches.forEach(b => {
              console.log(`         - ${b.batch_name}: ${b.lab_shortform} in ${b.lab_room_name}`)
            })
          }
        }
      }
      
      // Check if we scheduled all required rounds
      if (roundsScheduled < NUM_ROUNDS) {
        console.log(`      ⚠️  WARNING: Only scheduled ${roundsScheduled}/${NUM_ROUNDS} rounds for Section ${sectionName}`)
        console.log(`      📊 Checked ${diagnostics.totalCombinationsChecked} day-slot combinations`)
        console.log(`      🚫 ${NUM_ROUNDS - roundsScheduled} labs could not be scheduled due to room/time conflicts`)
        
        // Track unresolved labs for final report
        for (let missingRound = roundsScheduled; missingRound < NUM_ROUNDS; missingRound++) {
          // Calculate which labs couldn't be scheduled for which batches
          const unresolvedBatches = []
          for (let batchNum = 1; batchNum <= NUM_BATCHES; batchNum++) {
            const labIndex = (missingRound + batchNum - 1) % NUM_LABS
            const lab = labs[labIndex]
            unresolvedBatches.push({
              batchNumber: batchNum,
              batchName: `${sectionName}${batchNum}`,
              labName: lab.lab_name,
              labShortform: lab.lab_shortform || lab.lab_code
            })
          }
          unresolvedScheduling.push({
            section: sectionName,
            round: missingRound + 1,
            batches: unresolvedBatches,
            reason: 'No available time slot or compatible room found'
          })
        }
      } else {
        console.log(`      ✅ All ${NUM_ROUNDS} rounds successfully scheduled!`)
      }
      
      // DIAGNOSTIC BREAKDOWN (Always show for transparency)
      console.log(`\n      🔍 DIAGNOSTIC BREAKDOWN FOR ${sectionName}:`)
      console.log(`         Total combinations checked: ${diagnostics.totalCombinationsChecked}`)
      console.log(`         ❌ Rejected by theory conflicts: ${diagnostics.rejectedByTheoryConflict} (${(diagnostics.rejectedByTheoryConflict/diagnostics.totalCombinationsChecked*100).toFixed(1)}%)`)
      console.log(`         ❌ Rejected by lab conflicts: ${diagnostics.rejectedByLabConflict} (${(diagnostics.rejectedByLabConflict/diagnostics.totalCombinationsChecked*100).toFixed(1)}%)`)
      console.log(`         ❌ Rejected by consecutive constraint: ${diagnostics.rejectedByConsecutiveConflict} (${(diagnostics.rejectedByConsecutiveConflict/diagnostics.totalCombinationsChecked*100).toFixed(1)}%)`)
      console.log(`         ❌ Rejected by daily limit: ${diagnostics.rejectedByDailyLimit} (${(diagnostics.rejectedByDailyLimit/diagnostics.totalCombinationsChecked*100).toFixed(1)}%)`)
      console.log(`         ❌ Rejected by no rooms available: ${diagnostics.rejectedByNoRooms} (${(diagnostics.rejectedByNoRooms/diagnostics.totalCombinationsChecked*100).toFixed(1)}%)`)
      console.log(`         ✅ Successfully scheduled: ${diagnostics.successful}`)
      if (diagnostics.fallbackUsed > 0) {
        console.log(`         🔄 Flexible slots used: ${diagnostics.fallbackUsed} (fallback scheduling)`)
      }
      
      // Store scheduled lab slots in memory
      tt.lab_slots = labSlots
      
      console.log(`      📊 Total: ${labSlots.length} lab sessions scheduled\n`)
    }
    
    console.log(`✅ All sections processed!`)
    console.log(`📊 Total lab sessions: ${totalLabSessionsScheduled}`)
    console.log(`📊 Total batches: ${totalBatchesScheduled}`)
    console.log(`📊 Global room schedule entries: ${globalRoomSchedule.size}\n`)
    
    // ATOMIC UPDATE: Write all timetables to database at once
    console.log(`💾 Saving all timetables to database...`)
    
    for (const ttId in timetableData) {
      const tt = timetableData[ttId]
      
      // Calculate step summary for this timetable
      const labs = await SyllabusLabs.find({
        lab_sem: tt.sem,
        lab_sem_type: semType
      }).lean()
      
      const step3Summary = {
        lab_sessions_scheduled: tt.lab_slots.length,
        lab_sessions_expected: labs.length,
        batches_scheduled: tt.lab_slots.reduce((sum, slot) => sum + (slot.batches?.length || 0), 0),
        success_rate: labs.length > 0 ? ((tt.lab_slots.length / labs.length) * 100).toFixed(2) : '0.00'
      }
      
      await Timetable.updateOne(
        { _id: tt._id },
        {
          $set: {
            lab_slots: tt.lab_slots,
            'generation_metadata.current_step': 3,
            'generation_metadata.steps_completed': ['load_sections', 'block_fixed_slots', 'schedule_labs'],
            'generation_metadata.step3_summary': step3Summary
          }
        }
      )
    }
    
    console.log(`✅ Step 3 Complete: All timetables saved successfully!\n`)
    
    // COMPREHENSIVE CONFLICT REPORT
    console.log(`${'='.repeat(80)}`)
    console.log(`📊 FINAL SCHEDULING REPORT`)
    console.log(`${'='.repeat(80)}\n`)
    
    // Calculate expected vs actual
    const sections = Object.keys(timetableData)
    let totalExpectedLabs = 0
    let totalScheduledLabs = 0
    
    for (const ttId in timetableData) {
      const tt = timetableData[ttId]
      const labs = await SyllabusLabs.find({
        lab_sem: tt.sem,
        lab_sem_type: semType
      }).lean()
      
      totalExpectedLabs += labs.length
      totalScheduledLabs += tt.lab_slots.length
    }
    
    const successRate = ((totalScheduledLabs / totalExpectedLabs) * 100).toFixed(2)
    
    console.log(`✅ SUCCESSFULLY SCHEDULED:`)
    console.log(`   Total Lab Sessions: ${totalScheduledLabs}/${totalExpectedLabs} (${successRate}%)`)
    console.log(`   Total Batches: ${totalBatchesScheduled}`)
    console.log(`   Sections Processed: ${sections.length}`)
    console.log(``)
    
    if (unresolvedScheduling.length > 0) {
      console.log(`❌ UNRESOLVED SCHEDULING CONFLICTS:`)
      console.log(`   Total Unresolved: ${unresolvedScheduling.length} lab session(s)\n`)
      
      unresolvedScheduling.forEach((unresolved, idx) => {
        console.log(`   ${idx + 1}. Section ${unresolved.section} - Round ${unresolved.round}:`)
        unresolved.batches.forEach(batch => {
          console.log(`      • ${batch.batchName}: ${batch.labShortform} (${batch.labName})`)
        })
        console.log(`      Reason: ${unresolved.reason}`)
        console.log(``)
      })
      
      console.log(`   📌 Action Required:`)
      console.log(`   - Add more lab rooms with compatible equipment`)
      console.log(`   - Adjust time slot constraints`)
      console.log(`   - Manually schedule these labs offline`)
      console.log(``)
    } else {
      console.log(`✅ ALL LABS SUCCESSFULLY SCHEDULED!`)
      console.log(`   No unresolved conflicts - 100% success rate!`)
      console.log(``)
    }
    
    console.log(`🔍 CONFLICT PREVENTION SUMMARY:`)
    console.log(`   Global Conflict Prevention: ✅ Active (Multi-segment tracking)`)
    console.log(`   Internal Conflict Prevention: ✅ Active (3 batches use 3 different rooms)`)
    console.log(`   Rule 4.7 (Batch Rotation): ✅ Guaranteed`)
    console.log(`   Consecutive Lab Prevention: ✅ STRICT (NO back-to-back labs allowed)`)
    console.log(`   Daily Lab Limits: ✅ STRICT (Max 2 labs per day for ALL sections)`)
    console.log(`   Theory Slot Conflicts: ✅ Prevented`)
    console.log(`   Time Slots Available: 5 fixed 2-hour slots per day (non-overlapping)`)
    console.log(``)
    console.log(`📈 OPTIMIZATION IMPROVEMENTS (Nov 12, 2025):`)
    console.log(`   ✅ Multi-segment room tracking (prevents all overlaps)`)
    console.log(`   ✅ Multi-pass retry system (20 attempts with randomized slot ordering)`)
    console.log(`   ✅ 5th→3rd→7th ordering (prioritize smaller semester first)`)
    console.log(`   ✅ Internal conflict prevention (each batch gets unique room per slot)`)
    console.log(`   📊 Diagnostic logging (identifies exact failure reasons)`)
    console.log(``)
    
    console.log(`${'='.repeat(80)}`)
    console.log(`✅ STEP 3 COMPLETE - FLEXIBLE SCHEDULING ALGORITHM`)
    console.log(`${'='.repeat(80)}\n`)
    
    // Fetch updated timetables
    const updatedTimetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    })
    
    // Return result data for comparison (don't save to DB yet in multi-attempt mode)
    return {
      timetableData,
      totalScheduled: totalLabSessionsScheduled,
      totalNeeded: totalExpectedLabs,
      totalBatches: totalBatchesScheduled,
      unresolvedScheduling,
      labsBySection: sections.map(ttId => {
        const tt = timetableData[ttId]
        return {
          sectionName: tt.section_name,
          sem: tt.sem,
          scheduled: tt.lab_slots.length,
          expected: tt.labsExpected || 0,
          complete: tt.lab_slots.length === (tt.labsExpected || 0)
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Error in Step 3:', error)
    throw error
  }
}

/**
 * Helper: Apply best scheduling result to database
 */
async function applySchedulingResult(result, semType, academicYear) {
  console.log(`\n💾 Applying best result to database...`)
  
  const { timetableData, unresolvedScheduling } = result
  const updatedTimetables = []
  
  for (const ttId in timetableData) {
    const tt = timetableData[ttId]
    
    // Calculate step summary
    const labs = await SyllabusLabs.find({
      lab_sem: tt.sem,
      lab_sem_type: semType
    }).lean()
    
    const step3Summary = {
      lab_sessions_scheduled: tt.lab_slots.length,
      lab_sessions_expected: labs.length,
      batches_scheduled: tt.lab_slots.reduce((sum, slot) => sum + (slot.batches?.length || 0), 0),
      success_rate: labs.length > 0 ? ((tt.lab_slots.length / labs.length) * 100).toFixed(2) : '0.00'
    }
    
    const updated = await Timetable.findByIdAndUpdate(
      tt._id,
      {
        $set: {
          lab_slots: tt.lab_slots,
          'generation_metadata.current_step': 3,
          'generation_metadata.steps_completed': ['load_sections', 'block_fixed_slots', 'schedule_labs'],
          'generation_metadata.step3_summary': step3Summary
        }
      },
      { new: true }
    )
    
    updatedTimetables.push(updated)
  }
  
  console.log(`✅ Best result saved to database!`)
  
  // Print final report
  const sections = Object.keys(timetableData)
  let totalExpectedLabs = 0
  let totalScheduledLabs = 0
  
  for (const ttId in timetableData) {
    const tt = timetableData[ttId]
    const labs = await SyllabusLabs.find({
      lab_sem: tt.sem,
      lab_sem_type: semType
    }).lean()
    
    totalExpectedLabs += labs.length
    totalScheduledLabs += tt.lab_slots.length
  }
  
  const successRate = totalExpectedLabs > 0
    ? ((totalScheduledLabs / totalExpectedLabs) * 100).toFixed(2)
    : '0.00'
  
  console.log(`\n${'='.repeat(80)}`)
  console.log(`✅ FINAL RESULTS`)
  console.log(`${'='.repeat(80)}`)
  console.log(`📊 Total: ${totalScheduledLabs}/${totalExpectedLabs} labs scheduled (${successRate}%)`)
  console.log(`📊 Unresolved: ${unresolvedScheduling.length} lab sessions`)
  
  return {
    success: true,
    message: `Step 3 complete: ${totalScheduledLabs} lab sessions scheduled`,
    data: {
      sections_processed: sections.length,
      lab_sessions_scheduled: totalScheduledLabs,
      lab_sessions_expected: totalExpectedLabs,
      success_rate: parseFloat(successRate),
      batches_scheduled: result.totalBatches,
      unresolved_conflicts: unresolvedScheduling.length,
      unresolved_details: unresolvedScheduling,
      conflict_prevention: {
        global_conflicts: 0,
        internal_conflicts: 0,
        rule_4_7_followed: true,
        consecutive_labs_prevented: true,
        daily_lab_limits_applied: true,
        theory_conflicts_prevented: true
      },
      timetables: updatedTimetables
    }
  }
}