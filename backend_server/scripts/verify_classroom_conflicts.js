/**
 * VERIFICATION SCRIPT: Check for Classroom Double-Booking Conflicts
 * 
 * Purpose: Verify that no classroom is assigned to multiple sections
 *          at the same time, especially checking BOTH 30-minute halves
 *          of 1-hour theory slots.
 * 
 * CRITICAL FIX (Nov 2025):
 * After fixing the step5 algorithm to check both halves of 1-hour slots,
 * this script verifies that the fix works correctly and no double-bookings exist.
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import Section from '../models/ise_sections_model.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Database connected successfully\n')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

// Helper: Convert time to minutes for comparison
function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Helper: Check if two time ranges overlap
function timesOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1)
  const e1 = timeToMinutes(end1)
  const s2 = timeToMinutes(start2)
  const e2 = timeToMinutes(end2)
  
  // Two ranges overlap if: start1 < end2 AND start2 < end1
  return s1 < e2 && s2 < e1
}

async function verifyClassroomConflicts() {
  // Connect to database first
  await connectDB()
  
  console.log('\n' + '='.repeat(70))
  console.log('🔍 CLASSROOM CONFLICT VERIFICATION')
  console.log('='.repeat(70))
  console.log('Purpose: Check for classroom double-booking (especially 1-hour slots)')
  console.log('='.repeat(70) + '\n')

  try {
    // Get all timetables
    const timetables = await Timetable.find()
      .populate('section_id', 'section_name sem')
      .lean()

    if (timetables.length === 0) {
      console.log('❌ No timetables found in database')
      return
    }

    console.log(`📋 Found ${timetables.length} timetables\n`)

    // Build a map of all classroom assignments
    // Key: "day-classroom"
    // Value: array of { section, subject, start_time, end_time, duration }
    const classroomUsage = new Map()

    for (const tt of timetables) {
      const sectionName = tt.section_id?.section_name || 'Unknown'
      
      for (const slot of tt.theory_slots || []) {
        if (!slot.classroom_name) continue // Skip unassigned slots
        
        const key = `${slot.day}-${slot.classroom_name}`
        
        if (!classroomUsage.has(key)) {
          classroomUsage.set(key, [])
        }
        
        classroomUsage.get(key).push({
          section: sectionName,
          subject: slot.subject_shortform || slot.subject_name,
          day: slot.day,
          start_time: slot.start_time,
          end_time: slot.end_time,
          duration: slot.duration_hours || 1,
          classroom: slot.classroom_name
        })
      }
    }

    console.log(`🏫 Analyzing ${classroomUsage.size} unique day-classroom combinations...\n`)

    // Check for conflicts
    let totalConflicts = 0
    let conflictsIn30MinSlots = 0
    let conflictsIn1HourSlots = 0

    for (const [key, assignments] of classroomUsage.entries()) {
      // Sort assignments by start time
      assignments.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
      
      // Check each pair of assignments for overlap
      for (let i = 0; i < assignments.length; i++) {
        for (let j = i + 1; j < assignments.length; j++) {
          const slot1 = assignments[i]
          const slot2 = assignments[j]
          
          // Check if times overlap
          if (timesOverlap(slot1.start_time, slot1.end_time, slot2.start_time, slot2.end_time)) {
            totalConflicts++
            
            // Categorize conflict
            if (slot1.duration === 1 || slot2.duration === 1) {
              conflictsIn1HourSlots++
            } else {
              conflictsIn30MinSlots++
            }
            
            console.log('❌ CONFLICT DETECTED:')
            console.log(`   Room: ${slot1.classroom}`)
            console.log(`   Day: ${slot1.day}`)
            console.log(`   Slot 1: ${slot1.section} - ${slot1.subject} (${slot1.start_time} - ${slot1.end_time}) [${slot1.duration}h]`)
            console.log(`   Slot 2: ${slot2.section} - ${slot2.subject} (${slot2.start_time} - ${slot2.end_time}) [${slot2.duration}h]`)
            console.log(`   Overlap: ${Math.max(timeToMinutes(slot1.start_time), timeToMinutes(slot2.start_time))} - ${Math.min(timeToMinutes(slot1.end_time), timeToMinutes(slot2.end_time))} minutes\n`)
          }
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70))
    console.log('📊 VERIFICATION SUMMARY')
    console.log('='.repeat(70))
    
    if (totalConflicts === 0) {
      console.log('✅ NO CONFLICTS FOUND! All classrooms are properly assigned.')
      console.log('✅ 1-hour slots are correctly checked for both 30-minute halves.')
    } else {
      console.log(`❌ TOTAL CONFLICTS: ${totalConflicts}`)
      console.log(`   - Conflicts involving 1-hour slots: ${conflictsIn1HourSlots}`)
      console.log(`   - Conflicts in 30-minute slots: ${conflictsIn30MinSlots}`)
      console.log('\n⚠️  ACTION REQUIRED: Re-run Step 5 (Assign Classrooms) to fix conflicts')
    }
    
    console.log('='.repeat(70) + '\n')

    // Additional check: Verify specific time slots
    console.log('🔍 DETAILED CHECK: Monday 12:00 PM - 1:00 PM')
    console.log('-'.repeat(70))
    
    let monday12PMUsage = []
    
    for (const tt of timetables) {
      const sectionName = tt.section_id?.section_name || 'Unknown'
      
      for (const slot of tt.theory_slots || []) {
        if (!slot.classroom_name) continue
        
        // Check if this slot overlaps with Monday 12:00-13:00
        if (slot.day === 'Monday') {
          const slotStart = timeToMinutes(slot.start_time)
          const slotEnd = timeToMinutes(slot.end_time)
          const checkStart = timeToMinutes('12:00')
          const checkEnd = timeToMinutes('13:00')
          
          if (slotStart < checkEnd && checkStart < slotEnd) {
            monday12PMUsage.push({
              section: sectionName,
              subject: slot.subject_shortform || slot.subject_name,
              classroom: slot.classroom_name,
              start_time: slot.start_time,
              end_time: slot.end_time,
              duration: slot.duration_hours || 1
            })
          }
        }
      }
    }
    
    if (monday12PMUsage.length > 0) {
      console.log(`Found ${monday12PMUsage.length} slots during Monday 12:00-13:00:`)
      
      // Group by classroom
      const byClassroom = new Map()
      for (const usage of monday12PMUsage) {
        if (!byClassroom.has(usage.classroom)) {
          byClassroom.set(usage.classroom, [])
        }
        byClassroom.get(usage.classroom).push(usage)
      }
      
      for (const [classroom, usages] of byClassroom.entries()) {
        console.log(`\n  📍 Room ${classroom}:`)
        for (const u of usages) {
          console.log(`     ${u.section} - ${u.subject} (${u.start_time}-${u.end_time}, ${u.duration}h)`)
        }
        
        // Check for ACTUAL overlaps (not just multiple assignments)
        let hasRealConflict = false
        for (let i = 0; i < usages.length; i++) {
          for (let j = i + 1; j < usages.length; j++) {
            if (timesOverlap(usages[i].start_time, usages[i].end_time, usages[j].start_time, usages[j].end_time)) {
              hasRealConflict = true
              break
            }
          }
        }
        
        if (hasRealConflict) {
          console.log(`     ❌ CONFLICT: Room has overlapping time slots!`)
        } else if (usages.length > 1) {
          console.log(`     ✅ OK: Multiple assignments but no overlap (adjacent time slots)`)
        }
      }
    } else {
      console.log('No slots found during Monday 12:00-13:00')
    }
    
    console.log('-'.repeat(70) + '\n')

  } catch (error) {
    console.error('❌ Error during verification:', error)
  } finally {
    await mongoose.connection.close()
    console.log('✅ Database connection closed\n')
  }
}

// Run verification
verifyClassroomConflicts()
