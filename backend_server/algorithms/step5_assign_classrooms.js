/**
 * STEP 5: Assign Classrooms to Theory Slots
 * 
 * Purpose: Assign available theory classrooms to ALL scheduled theory slots
 * 
 * Priority Order:
 * 1. FIRST: Fixed slots (OEC/PEC) - highest priority
 * 2. SECOND: Regular theory slots - lower priority
 * 3. SKIP: Project subjects - they don't need classrooms
 * 
 * Assignment Logic:
 * - Check ONLY room availability (day/time conflicts)
 * - Ignore capacity (not relevant for this phase)
 * - Ignore room_type (all rooms in Classrooms collection are theory rooms)
 * 
 * Input: sem_type, academic_year
 * Output: Detailed summary with phase breakdown (fixed vs regular)
 */

import Timetable from '../models/timetable_model.js'
import Classroom from '../models/dept_class_model.js'

/**
 * Helper: Build global room usage tracker
 * Key format: "day-startTime-roomNo"
 * Value: { sectionName, subjectShortform, slotType }
 * 
 * CRITICAL FIX (Nov 2025):
 * For ANY duration slot, we now track ALL 30-minute segments separately
 * to prevent double-booking rooms across split time slots.
 * Examples:
 *   - 1-hour slot (2 segments): 10:00 + 10:30
 *   - 1.5-hour slot (3 segments): 09:30 + 10:00 + 10:30
 */
function buildRoomUsageTracker(timetables) {
  const tracker = new Map()
  
  for (const tt of timetables) {
    for (const slot of tt.theory_slots) {
      // Skip if no classroom assigned yet
      if (!slot.classroom_name) continue
      
      const duration = slot.duration_hours || 1
      const [startHours, startMinutes] = slot.start_time.split(':').map(Number)
      const startTotalMinutes = startHours * 60 + startMinutes
      
      // Calculate number of 30-minute segments
      const numSegments = Math.ceil(duration * 2) // 1hr=2, 1.5hr=3, 2hr=4, etc.
      
      // Track ALL 30-minute segments
      for (let i = 0; i < numSegments; i++) {
        const segmentMinutes = startTotalMinutes + (i * 30)
        const segmentHours = Math.floor(segmentMinutes / 60)
        const segmentMins = segmentMinutes % 60
        const segmentTime = `${String(segmentHours).padStart(2, '0')}:${String(segmentMins).padStart(2, '0')}`
        
        const key = `${slot.day}-${segmentTime}-${slot.classroom_name}`
        tracker.set(key, {
          sectionName: tt.section_name,
          subjectShortform: slot.subject_shortform,
          slotType: slot.is_fixed_slot ? 'FIXED' : 'REGULAR',
          duration: slot.duration_hours,
          segmentIndex: i,
          totalSegments: numSegments
        })
      }
    }
  }
  
  return tracker
}

/**
 * Helper: Find first available classroom for a time slot
 * 
 * CRITICAL FIX (Nov 2025):
 * For ANY duration slot, checks ALL 30-minute segments to ensure
 * the room is available for the entire duration.
 * Examples:
 *   - 1-hour slot: checks 10:00 AND 10:30
 *   - 1.5-hour slot: checks 09:30 AND 10:00 AND 10:30
 */
function findAvailableRoom(day, startTime, duration, classrooms, roomUsageTracker) {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const startTotalMinutes = startHours * 60 + startMinutes
  
  // Calculate number of 30-minute segments
  const numSegments = Math.ceil(duration * 2) // 1hr=2, 1.5hr=3, 2hr=4, etc.
  
  for (const room of classrooms) {
    let roomAvailable = true
    
    // Check ALL 30-minute segments for this room
    for (let i = 0; i < numSegments; i++) {
      const segmentMinutes = startTotalMinutes + (i * 30)
      const segmentHours = Math.floor(segmentMinutes / 60)
      const segmentMins = segmentMinutes % 60
      const segmentTime = `${String(segmentHours).padStart(2, '0')}:${String(segmentMins).padStart(2, '0')}`
      
      const key = `${day}-${segmentTime}-${room.room_no}`
      
      if (roomUsageTracker.has(key)) {
        roomAvailable = false
        break // Room occupied in at least one segment
      }
    }
    
    if (roomAvailable) {
      // Room is available for the entire duration!
      return room
    }
  }
  
  return null  // No available room found
}

/**
 * Main: Assign classrooms to theory slots
 */
export async function assignClassrooms(semType, academicYear) {
  console.log(`\n🏫 Step 5: Assigning classrooms for ${semType} semester...`)
  console.log(`   📊 Strategy: Fixed slots first, then regular slots, skip projects\n`)
  
  try {
    // Load all timetables
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).populate('section_id', 'section_name sem')
    
    if (timetables.length === 0) {
      throw new Error('No timetables found. Please run Steps 1-4 first.')
    }
    
    console.log(`   📋 Found ${timetables.length} sections to process\n`)
    
    // ========================================
    // CLEAR PREVIOUS CLASSROOM ASSIGNMENTS (if re-running Step 5)
    // ========================================
    console.log(`   🗑️  Clearing previous classroom assignments...\n`)
    
    let clearedCount = 0
    for (const tt of timetables) {
      for (const slot of tt.theory_slots) {
        if (slot.classroom_id || slot.classroom_name) {
          slot.classroom_id = null
          slot.classroom_name = null
          clearedCount++
        }
      }
    }
    
    console.log(`   ✅ Cleared ${clearedCount} previous classroom assignments\n`)
    
    // Load all classrooms (only theory rooms exist in this collection)
    const classrooms = await Classroom.find({ room_type: 'theory' }).lean()
    
    if (classrooms.length === 0) {
      throw new Error('No classrooms found in database. Please add classrooms first.')
    }
    
    console.log(`   🏛️  Available classrooms: ${classrooms.length} rooms\n`)
    console.log(`   📍 Rooms: ${classrooms.map(r => r.room_no).join(', ')}\n`)
    
    // Build global room usage tracker (will be empty now after clearing)
    const roomUsageTracker = new Map()
    
    // Statistics
    let fixedSlotsAssigned = 0
    let fixedSlotsUnassigned = 0
    let regularSlotsAssigned = 0
    let regularSlotsUnassigned = 0
    let projectsSkipped = 0
    
    // ========================================
    // PHASE 1: Assign classrooms to FIXED SLOTS (Priority 1)
    // ========================================
    console.log(`\n📍 PHASE 1: Assigning classrooms to FIXED slots (OEC/PEC)...\n`)
    
    for (const tt of timetables) {
      const fixedSlots = tt.theory_slots.filter(slot => 
        slot.is_fixed_slot === true && slot.is_project !== true
      )
      
      for (const slot of fixedSlots) {
        // Find available room (pass duration for proper availability check)
        const room = findAvailableRoom(
          slot.day,
          slot.start_time,
          slot.duration_hours || 1,
          classrooms,
          roomUsageTracker
        )
        
        if (room) {
          // Assign classroom
          slot.classroom_id = room._id
          slot.classroom_name = room.room_no
          
          // Mark room as used - track ALL 30-minute segments
          const duration = slot.duration_hours || 1
          const [startHours, startMinutes] = slot.start_time.split(':').map(Number)
          const startTotalMinutes = startHours * 60 + startMinutes
          const numSegments = Math.ceil(duration * 2)
          
          for (let i = 0; i < numSegments; i++) {
            const segmentMinutes = startTotalMinutes + (i * 30)
            const segmentHours = Math.floor(segmentMinutes / 60)
            const segmentMins = segmentMinutes % 60
            const segmentTime = `${String(segmentHours).padStart(2, '0')}:${String(segmentMins).padStart(2, '0')}`
            
            const key = `${slot.day}-${segmentTime}-${room.room_no}`
            roomUsageTracker.set(key, {
              sectionName: tt.section_name,
              subjectShortform: slot.subject_shortform,
              slotType: 'FIXED',
              segmentIndex: i,
              totalSegments: numSegments
            })
          }
          
          fixedSlotsAssigned++
          console.log(`   ✅ [FIXED] ${tt.section_name} - ${slot.subject_shortform} (${slot.day} ${slot.start_time}): ${room.room_no}`)
        } else {
          fixedSlotsUnassigned++
          console.log(`   ❌ [UNASSIGNED] ${tt.section_name} - ${slot.subject_shortform} (${slot.day} ${slot.start_time}): No room available`)
        }
      }
    }
    
    const fixedTotal = fixedSlotsAssigned + fixedSlotsUnassigned
    const fixedRate = fixedTotal > 0 ? ((fixedSlotsAssigned / fixedTotal) * 100).toFixed(2) : '0.00'
    console.log(`\n   ✅ Phase 1 complete: ${fixedSlotsAssigned}/${fixedTotal} fixed slots assigned (${fixedRate}%)\n`)
    
    // ========================================
    // PHASE 2: Assign classrooms to REGULAR THEORY SLOTS (Priority 2)
    // ========================================
    console.log(`\n📚 PHASE 2: Assigning classrooms to REGULAR theory slots...\n`)
    
    for (const tt of timetables) {
      const regularSlots = tt.theory_slots.filter(slot => 
        slot.is_fixed_slot === false
      )
      
      for (const slot of regularSlots) {
        // Skip projects
        if (slot.is_project === true) {
          projectsSkipped++
          console.log(`   ⏭️  [SKIP] ${tt.section_name} - ${slot.subject_shortform} (${slot.day} ${slot.start_time}): Project (no classroom needed)`)
          continue
        }
        
        // Find available room (pass duration for proper availability check)
        const room = findAvailableRoom(
          slot.day,
          slot.start_time,
          slot.duration_hours || 1,
          classrooms,
          roomUsageTracker
        )
        
        if (room) {
          // Assign classroom
          slot.classroom_id = room._id
          slot.classroom_name = room.room_no
          
          // Mark room as used - track ALL 30-minute segments
          const duration = slot.duration_hours || 1
          const [startHours, startMinutes] = slot.start_time.split(':').map(Number)
          const startTotalMinutes = startHours * 60 + startMinutes
          const numSegments = Math.ceil(duration * 2)
          
          for (let i = 0; i < numSegments; i++) {
            const segmentMinutes = startTotalMinutes + (i * 30)
            const segmentHours = Math.floor(segmentMinutes / 60)
            const segmentMins = segmentMinutes % 60
            const segmentTime = `${String(segmentHours).padStart(2, '0')}:${String(segmentMins).padStart(2, '0')}`
            
            const key = `${slot.day}-${segmentTime}-${room.room_no}`
            roomUsageTracker.set(key, {
              sectionName: tt.section_name,
              subjectShortform: slot.subject_shortform,
              slotType: 'REGULAR',
              segmentIndex: i,
              totalSegments: numSegments
            })
          }
          
          regularSlotsAssigned++
          console.log(`   ✅ [REGULAR] ${tt.section_name} - ${slot.subject_shortform} (${slot.day} ${slot.start_time}): ${room.room_no}`)
        } else {
          regularSlotsUnassigned++
          console.log(`   ❌ [UNASSIGNED] ${tt.section_name} - ${slot.subject_shortform} (${slot.day} ${slot.start_time}): No room available`)
        }
      }
    }
    
    const regularTotal = regularSlotsAssigned + regularSlotsUnassigned
    const regularRate = regularTotal > 0 ? ((regularSlotsAssigned / regularTotal) * 100).toFixed(2) : '0.00'
    console.log(`\n   ✅ Phase 2 complete: ${regularSlotsAssigned}/${regularTotal} regular slots assigned (${regularRate}%)\n`)
    
    // ========================================
    // SAVE ALL TIMETABLES
    // ========================================
    console.log(`\n💾 Saving ${timetables.length} timetables...\n`)
    
    // Calculate summary data before saving
    const totalAssigned = fixedSlotsAssigned + regularSlotsAssigned
    const totalUnassigned = fixedSlotsUnassigned + regularSlotsUnassigned
    const totalSlots = totalAssigned + totalUnassigned
    const overallRate = totalSlots > 0 ? ((totalAssigned / totalSlots) * 100).toFixed(2) : '0.00'
    
    // Prepare step 5 summary to save in metadata
    const step5Summary = {
      sections_processed: timetables.length,
      fixed_slots_assigned: fixedSlotsAssigned,
      fixed_slots_unassigned: fixedSlotsUnassigned,
      regular_slots_assigned: regularSlotsAssigned,
      regular_slots_unassigned: regularSlotsUnassigned,
      projects_skipped: projectsSkipped,
      total_assigned: totalAssigned,
      total_unassigned: totalUnassigned,
      success_rate: overallRate
    }
    
    for (const tt of timetables) {
      // Update metadata
      tt.generation_metadata.current_step = 5
      tt.generation_metadata.steps_completed.push('assign_classrooms')
      tt.generation_metadata.step5_summary = step5Summary
      
      await tt.save()
      console.log(`   ✅ Saved: ${tt.section_name}`)
    }
    
    // ========================================
    // FINAL SUMMARY
    // ========================================
    
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📊 STEP 5 COMPLETE - CLASSROOM ASSIGNMENT SUMMARY`)
    console.log(`${'='.repeat(60)}`)
    console.log(`✅ Sections processed: ${timetables.length}`)
    console.log(`\n📌 FIXED SLOTS (OEC/PEC):`)
    console.log(`   ✅ Assigned: ${fixedSlotsAssigned}`)
    console.log(`   ❌ Unassigned: ${fixedSlotsUnassigned}`)
    console.log(`   📊 Success rate: ${fixedRate}%`)
    console.log(`\n📚 REGULAR SLOTS (ISE/Other Dept):`)
    console.log(`   ✅ Assigned: ${regularSlotsAssigned}`)
    console.log(`   ❌ Unassigned: ${regularSlotsUnassigned}`)
    console.log(`   📊 Success rate: ${regularRate}%`)
    console.log(`\n⏭️  PROJECTS SKIPPED: ${projectsSkipped}`)
    console.log(`\n🎯 OVERALL:`)
    console.log(`   ✅ Total assigned: ${totalAssigned}`)
    console.log(`   ❌ Total unassigned: ${totalUnassigned}`)
    console.log(`   📊 Overall success rate: ${overallRate}%`)
    console.log(`${'='.repeat(60)}\n`)
    
    return {
      success: true,
      message: 'Step 5: Classroom assignment completed',
      data: {
        sections_processed: timetables.length,
        fixed_slots_assigned: fixedSlotsAssigned,
        fixed_slots_unassigned: fixedSlotsUnassigned,
        regular_slots_assigned: regularSlotsAssigned,
        regular_slots_unassigned: regularSlotsUnassigned,
        projects_skipped: projectsSkipped,
        total_assigned: totalAssigned,
        total_unassigned: totalUnassigned,
        success_rate: overallRate
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Step 5:', error)
    throw error
  }
}
