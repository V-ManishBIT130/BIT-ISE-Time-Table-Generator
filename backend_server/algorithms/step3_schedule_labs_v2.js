/**
 * STEP 3: Schedule Labs (REFACTORED v2.0)
 * 
 * Purpose: Schedule lab sessions using batch rotation strategy
 * 
 * Key Constraints:
 * - Batch Synchronization: All batches of a section MUST be in labs at the SAME time
 * - Batch Rotation: Batches rotate through labs using formula: labIndex = (round + batchNum - 1) % totalLabs
 * - 2-hour blocks: Each lab session is exactly 2 hours
 * - No conflicts: Avoid room conflicts (intra-slot + inter-section), fixed slots, and consecutive labs
 * 
 * Algorithm Improvements:
 * - Global room tracking (in-memory Map) prevents all room conflicts
 * - Better distribution strategy (spread labs across week, not just Monday)
 * - Atomic updates (all timetables updated together after successful scheduling)
 * 
 * Input: sem_type, academic_year
 * Output: Timetables with lab_slots populated (teachers assigned in Step 5)
 */

import Timetable from '../models/timetable_model.js'
import ISESections from '../models/ise_sections_model.js'
import SyllabusLabs from '../models/syllabus_labs_model.js'
import LabRoomAssignment from '../models/lab_room_assignment_model.js'

// Constants
const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_START = '08:00'
const DAY_END = '17:00'
const LAB_DURATION = 2 // hours
const LUNCH_START = '12:00'
const LUNCH_END = '13:00'

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
 * Helper: Check if time slot is within working hours and avoids lunch
 */
function isValidTimeSlot(startTime, endTime) {
  // Must be within working hours
  if (startTime < DAY_START || endTime > DAY_END) {
    return false
  }
  
  // Should not overlap with lunch break
  if (timesOverlap(startTime, endTime, LUNCH_START, LUNCH_END)) {
    return false
  }
  
  return true
}

/**
 * Helper: Get all available 2-hour time slots for a day
 */
function getAvailableTimeSlots() {
  const slots = []
  
  // Morning slots
  slots.push({ start: '08:00', end: '10:00' })
  slots.push({ start: '10:00', end: '12:00' })
  
  // Afternoon slots (after lunch)
  slots.push({ start: '13:00', end: '15:00' })
  slots.push({ start: '15:00', end: '17:00' })
  
  return slots
}

/**
 * Helper: Generate room schedule key for global tracking
 */
function getRoomScheduleKey(roomId, day, startTime, endTime) {
  return `${roomId}_${day}_${startTime}_${endTime}`
}

/**
 * Helper: Check if room is available in global tracker
 * This prevents BOTH intra-slot and inter-section conflicts
 */
function isRoomAvailableGlobal(roomId, day, startTime, endTime) {
  const key = getRoomScheduleKey(roomId, day, startTime, endTime)
  return !globalRoomSchedule.has(key)
}

/**
 * Helper: Mark room as used in global tracker
 */
function markRoomAsUsed(roomId, day, startTime, endTime, sectionId, sectionName, batchName, labName) {
  const key = getRoomScheduleKey(roomId, day, startTime, endTime)
  globalRoomSchedule.set(key, {
    sectionId: sectionId.toString(),
    sectionName,
    batchName,
    labName
  })
}

/**
 * Helper: Get all day-slot combinations with better distribution
 * Returns shuffled list to spread labs across the week
 */
function getAllDaySlotCombinations() {
  const combinations = []
  
  for (const day of WORKING_DAYS) {
    const slots = getAvailableTimeSlots()
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
 * IMPORTANT CONSTRAINT: Students should NOT have back-to-back labs (too hectic)
 */
function hasConsecutiveLabConflict(labSlots, day, startTime, endTime) {
  const existingLabsOnDay = labSlots.filter(slot => slot.day === day)
  
  for (const existingSlot of existingLabsOnDay) {
    // Check if new slot is immediately before or after existing slot
    if (existingSlot.end_time === startTime || existingSlot.start_time === endTime) {
      return true // Consecutive labs detected - REJECT this slot
    }
  }
  
  return false
}

/**
 * Main function: Schedule labs for all sections with global conflict prevention
 */
export async function scheduleLabs(semType, academicYear) {
  console.log(`\n🧪 Step 3: Scheduling labs for ${semType} semester...`)
  console.log(`📊 Using: In-Memory Global Room Tracking + Better Distribution\n`)
  
  try {
    // Clear global room tracker for fresh start
    globalRoomSchedule.clear()
    
    // Load all timetables from Step 2
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).populate('section_id', 'section_name sem sem_type').lean()
    
    if (timetables.length === 0) {
      throw new Error('No timetables found. Please run Steps 1-2 first.')
    }
    
    console.log(`📋 Found ${timetables.length} sections to process\n`)
    
    // Prepare in-memory timetable data structure
    const timetableData = {}
    for (const tt of timetables) {
      timetableData[tt._id.toString()] = {
        _id: tt._id,
        section_id: tt.section_id._id,
        section_name: tt.section_name,
        sem: tt.sem,
        theory_slots: tt.theory_slots || [],
        lab_slots: [] // Will populate this
      }
    }
    
    // OPTIMIZATION: Sort sections for better room distribution
    // Strategy: Interleave sections by semester to prevent late sections from being starved
    // Instead of: 3A, 3B, 3C, 5A, 5B, 5C, 7A, 7B, 7C
    // Do: 3A, 5A, 7A, 3B, 5B, 7B, 3C, 5C, 7C
    const sortedTimetableIds = Object.keys(timetableData).sort((a, b) => {
      const ttA = timetableData[a]
      const ttB = timetableData[b]
      
      // Extract section letter (A, B, C)
      const letterA = ttA.section_name.slice(-1)
      const letterB = ttB.section_name.slice(-1)
      
      // First sort by section letter, then by semester
      if (letterA !== letterB) {
        return letterA.localeCompare(letterB)
      }
      return ttA.sem - ttB.sem
    })
    
    console.log(`🔄 Processing order: ${sortedTimetableIds.map(id => timetableData[id].section_name).join(' → ')}\n`)
    
    let totalLabSessionsScheduled = 0
    let totalBatchesScheduled = 0
    
    // Process each section in optimized order
    for (const ttId of sortedTimetableIds) {
      const tt = timetableData[ttId]
      const sectionId = tt.section_id
      const sectionName = tt.section_name
      const sem = tt.sem
      
      console.log(`   📝 Processing Section ${sectionName}...`)
      
      // Load required labs for this semester
      const labs = await SyllabusLabs.find({
        lab_sem: sem,
        lab_sem_type: semType
      }).lean()
      
      if (labs.length === 0) {
        console.log(`      ℹ️  No labs found for Semester ${sem}\n`)
        continue
      }
      
      console.log(`      🧪 Found ${labs.length} labs: ${labs.map(l => l.lab_shortform || l.lab_name).join(', ')}`)
      
      const NUM_BATCHES = 3 // Always 3 batches per section
      const NUM_LABS = labs.length
      const NUM_ROUNDS = NUM_LABS // Need enough rounds for full rotation
      
      console.log(`      📊 Need to schedule ${NUM_ROUNDS} lab sessions (${NUM_ROUNDS} rounds)`)
      
      const labSlots = []
      let roundsScheduled = 0
      
      // Get all possible day-slot combinations (shuffled for better distribution)
      const allCombinations = getAllDaySlotCombinations()
      
      // Try to schedule all rounds
      for (const combination of allCombinations) {
        if (roundsScheduled >= NUM_ROUNDS) break
        
        const { day, start, end } = combination
        
        // Check if valid time slot
        if (!isValidTimeSlot(start, end)) continue
        
        // Check for theory conflicts
        if (hasTheoryConflict(tt, day, start, end)) {
          continue
        }
        
        // Check for existing lab conflicts in this timetable
        if (hasLabConflict(labSlots, day, start, end)) {
          continue
        }
        
        // Check for consecutive lab prohibition
        if (hasConsecutiveLabConflict(labSlots, day, start, end)) {
          continue
        }
        
        // Try to schedule all 3 batches for this round
        const batches = []
        let allRoomsAvailable = true
        const tempRoomKeys = [] // Track keys to rollback if needed
        
        for (let batchNum = 1; batchNum <= NUM_BATCHES; batchNum++) {
          // Calculate which lab this batch does in this round (BATCH ROTATION)
          const labIndex = (roundsScheduled + batchNum - 1) % NUM_LABS
          const lab = labs[labIndex]
          
          // Get room assignment from Phase 2
          const roomAssignment = await LabRoomAssignment.findOne({
            lab_id: lab._id,
            sem: sem,
            sem_type: semType,
            section: tt.section_name.slice(-1), // Extract section letter (A, B, C)
            batch_number: batchNum
          }).populate('assigned_lab_room', 'labRoom_no').lean()
          
          if (!roomAssignment) {
            console.log(`      ⚠️  No room assignment found for Batch ${sectionName}${batchNum} - ${lab.lab_shortform || lab.lab_name}`)
            allRoomsAvailable = false
            break
          }
          
          const roomId = roomAssignment.assigned_lab_room._id
          const roomName = roomAssignment.assigned_lab_room.labRoom_no
          
          // CHECK: Is room available in GLOBAL tracker?
          // This prevents BOTH intra-slot conflicts (batch 1 vs batch 2 in same slot)
          // AND inter-section conflicts (section A vs section B)
          if (!isRoomAvailableGlobal(roomId, day, start, end)) {
            // Room conflict detected - skip this slot
            allRoomsAvailable = false
            break
          }
          
          // Room is available - reserve it temporarily
          const batchName = `${sectionName}${batchNum}`
          tempRoomKeys.push({ roomId, day, start, end, sectionId, sectionName, batchName, labName: lab.lab_shortform || lab.lab_name })
          
          // Create batch entry
          batches.push({
            batch_number: batchNum,
            batch_name: batchName,
            lab_id: lab._id,
            lab_name: lab.lab_name,
            lab_shortform: lab.lab_shortform || lab.lab_code,
            lab_room_id: roomId,
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
          
          console.log(`      ✅ Round ${roundsScheduled}: ${day} ${start}-${end}`)
          batches.forEach(b => {
            console.log(`         - ${b.batch_name}: ${b.lab_shortform} in ${b.lab_room_name}`)
          })
        }
      }
      
      // Check if we scheduled all required rounds
      if (roundsScheduled < NUM_ROUNDS) {
        console.log(`      ⚠️  WARNING: Only scheduled ${roundsScheduled}/${NUM_ROUNDS} rounds for Section ${sectionName}`)
        console.log(`      📊 Checked ${allCombinations.length} day-slot combinations`)
        console.log(`      🚫 ${NUM_ROUNDS - roundsScheduled} labs could not be scheduled due to room/time conflicts`)
      } else {
        console.log(`      ✅ All ${NUM_ROUNDS} rounds successfully scheduled!`)
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
      
      await Timetable.updateOne(
        { _id: tt._id },
        {
          $set: {
            lab_slots: tt.lab_slots,
            'generation_metadata.current_step': 3,
            'generation_metadata.steps_completed': ['load_sections', 'block_fixed_slots', 'schedule_labs']
          }
        }
      )
    }
    
    console.log(`✅ Step 3 Complete: All timetables saved successfully!`)
    
    // Fetch updated timetables
    const updatedTimetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    })
    
    return {
      success: true,
      message: `Step 3 complete: ${totalLabSessionsScheduled} lab sessions scheduled`,
      data: {
        sections_processed: Object.keys(timetableData).length,
        lab_sessions_scheduled: totalLabSessionsScheduled,
        batches_scheduled: totalBatchesScheduled,
        timetables: updatedTimetables
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Step 3:', error)
    throw error
  }
}
