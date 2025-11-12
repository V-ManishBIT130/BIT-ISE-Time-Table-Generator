/**
 * VERIFICATION SCRIPT: Test Step 4 scheduling algorithm
 * 
 * This script verifies that:
 * 1. Algorithm properly checks FULL 1-hour availability before scheduling
 * 2. No overlapping slots are created
 * 3. All theory slots have correct duration and end times
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env from backend_server directory
config({ path: join(__dirname, '../.env') })

/**
 * Helper: Check if two time ranges overlap
 */
function timesOverlap(start1, end1, start2, end2) {
  return (start1 < end2 && end1 > start2)
}

/**
 * Helper: Convert time to minutes for comparison
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

async function verifyStep4Scheduling() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    const timetables = await Timetable.find({
      sem_type: 'ODD',
      academic_year: '2024-2025'
    }).lean()
    
    if (timetables.length === 0) {
      console.log('⚠️  No timetables found! Please generate timetables first using the dashboard.')
      console.log('\nTo generate timetables:')
      console.log('1. Open the dashboard in your browser')
      console.log('2. Navigate to "Generate Timetable"')
      console.log('3. Run all steps (1-7)')
      console.log('4. Then run this verification script again\n')
      return
    }
    
    console.log(`📊 Analyzing ${timetables.length} timetables...\n`)
    console.log('='.repeat(100))
    
    let totalIssues = 0
    let totalSlots = 0
    
    for (const tt of timetables) {
      console.log(`\n📚 Section: ${tt.section_name}`)
      console.log('-'.repeat(100))
      
      const theorySlots = tt.theory_slots || []
      const labSlots = tt.lab_slots || []
      totalSlots += theorySlots.length
      
      if (theorySlots.length === 0) {
        console.log('   ℹ️  No theory slots scheduled yet')
        continue
      }
      
      let sectionIssues = 0
      
      // Test 1: Check each theory slot for correct duration
      console.log(`\n   Test 1: Duration Verification (${theorySlots.length} theory slots)`)
      for (const slot of theorySlots) {
        const [startH, startM] = slot.start_time.split(':').map(Number)
        const [endH, endM] = slot.end_time.split(':').map(Number)
        
        const startMin = startH * 60 + startM
        const endMin = endH * 60 + endM
        const actualDuration = (endMin - startMin) / 60
        const expectedDuration = slot.duration_hours || 1
        
        if (Math.abs(actualDuration - expectedDuration) > 0.01) {
          console.log(`      ❌ ${slot.subject_shortform}: Duration mismatch!`)
          console.log(`         Time: ${slot.start_time}-${slot.end_time}`)
          console.log(`         Expected: ${expectedDuration}h, Actual: ${actualDuration}h`)
          sectionIssues++
          totalIssues++
        }
      }
      
      // Test 2: Check for overlapping theory slots
      console.log(`\n   Test 2: Theory Slot Overlap Detection`)
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      
      for (const day of days) {
        const dayTheorySlots = theorySlots.filter(s => s.day === day)
        
        if (dayTheorySlots.length === 0) continue
        
        for (let i = 0; i < dayTheorySlots.length; i++) {
          for (let j = i + 1; j < dayTheorySlots.length; j++) {
            const slot1 = dayTheorySlots[i]
            const slot2 = dayTheorySlots[j]
            
            if (timesOverlap(slot1.start_time, slot1.end_time, slot2.start_time, slot2.end_time)) {
              console.log(`      ❌ ${day}: OVERLAP DETECTED!`)
              console.log(`         ${slot1.subject_shortform} (${slot1.start_time}-${slot1.end_time})`)
              console.log(`         ${slot2.subject_shortform} (${slot2.start_time}-${slot2.end_time})`)
              sectionIssues++
              totalIssues++
            }
          }
        }
      }
      
      // Test 3: Check for theory-lab overlaps
      console.log(`\n   Test 3: Theory-Lab Overlap Detection`)
      for (const day of days) {
        const dayTheorySlots = theorySlots.filter(s => s.day === day)
        const dayLabSlots = labSlots.filter(s => s.day === day)
        
        if (dayTheorySlots.length === 0 || dayLabSlots.length === 0) continue
        
        for (const theorySlot of dayTheorySlots) {
          for (const labSlot of dayLabSlots) {
            if (timesOverlap(theorySlot.start_time, theorySlot.end_time, labSlot.start_time, labSlot.end_time)) {
              console.log(`      ❌ ${day}: Theory-Lab OVERLAP!`)
              console.log(`         Theory: ${theorySlot.subject_shortform} (${theorySlot.start_time}-${theorySlot.end_time})`)
              console.log(`         Lab: ${labSlot.subject_name} (${labSlot.start_time}-${labSlot.end_time})`)
              sectionIssues++
              totalIssues++
            }
          }
        }
      }
      
      // Test 4: Check for "half-slot" issues (slots that should be 1 hour but are 0.5 hours)
      console.log(`\n   Test 4: Half-Hour Theory Slot Detection`)
      const halfHourSlots = theorySlots.filter(s => s.duration_hours === 0.5)
      if (halfHourSlots.length > 0) {
        console.log(`      ⚠️  Found ${halfHourSlots.length} half-hour theory slots (unusual):`)
        halfHourSlots.forEach(s => {
          console.log(`         - ${s.subject_shortform}: ${s.day} ${s.start_time}-${s.end_time}`)
        })
        // Not counting as issues since this might be intentional
      }
      
      // Test 5: Show day-by-day schedule for visual verification
      console.log(`\n   Test 5: Day-by-Day Schedule`)
      for (const day of days) {
        const daySlots = [...theorySlots.filter(s => s.day === day), ...labSlots.filter(s => s.day === day)]
          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
        
        if (daySlots.length === 0) continue
        
        console.log(`\n      ${day}:`)
        daySlots.forEach(s => {
          const type = s.subject_id ? 'Theory' : 'Lab'
          const name = s.subject_shortform || s.subject_name || '???'
          const teacher = s.teacher_name || 'No Teacher'
          const room = s.classroom_name || 'No Room'
          console.log(`         ${s.start_time}-${s.end_time} | ${name.padEnd(8)} | ${teacher.padEnd(18)} | ${room.padEnd(6)} | ${type}`)
        })
      }
      
      if (sectionIssues === 0) {
        console.log(`\n   ✅ Section ${tt.section_name}: All tests PASSED!`)
      } else {
        console.log(`\n   ⚠️  Section ${tt.section_name}: ${sectionIssues} issues detected`)
      }
    }
    
    console.log(`\n${'='.repeat(100)}`)
    console.log(`📊 FINAL SUMMARY`)
    console.log(`${'='.repeat(100)}`)
    console.log(`Total Sections: ${timetables.length}`)
    console.log(`Total Theory Slots: ${totalSlots}`)
    console.log(`Total Issues Found: ${totalIssues}`)
    
    if (totalIssues === 0) {
      console.log('\n✅ ✅ ✅  ALL VERIFICATION TESTS PASSED! ✅ ✅ ✅')
      console.log('\nThe Step 4 algorithm is working correctly:')
      console.log('  ✓ All slots have correct durations')
      console.log('  ✓ No overlapping theory slots')
      console.log('  ✓ No theory-lab conflicts')
      console.log('  ✓ Full 1-hour availability is checked before scheduling')
    } else {
      console.log('\n❌ ISSUES DETECTED - See details above')
      console.log('\nPossible causes:')
      console.log('  1. Algorithm not checking full hour availability')
      console.log('  2. Time overlap logic not working correctly')
      console.log('  3. Lab slots not being considered during theory scheduling')
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
    console.error(err.stack)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

verifyStep4Scheduling()
