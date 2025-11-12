/**
 * VERIFICATION SCRIPT: Check if 1-hour theory slots properly occupy BOTH 30-minute halves
 * 
 * This script verifies:
 * 1. All 1-hour theory slots have correct start_time and end_time (1 hour apart)
 * 2. No 30-minute "half slots" exist in theory_slots
 * 3. When a 1-hour slot is at 8:00-9:00, there's no separate slot at 8:30-9:00
 */

require('dotenv').config()
const mongoose = require('mongoose')
const Timetable = require('../models/timetable_model')

async function verifySlotGranularity() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB\n')
    
    const timetables = await Timetable.find({
      sem_type: 'ODD',
      academic_year: '2024-2025'
    }).lean()
    
    console.log(`📊 Analyzing ${timetables.length} timetables...\n`)
    
    let totalIssues = 0
    
    for (const tt of timetables) {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`Section: ${tt.section_name}`)
      console.log(`${'='.repeat(80)}`)
      
      const theorySlots = tt.theory_slots || []
      
      if (theorySlots.length === 0) {
        console.log('   ⚠️  No theory slots found')
        continue
      }
      
      console.log(`\n📚 Analyzing ${theorySlots.length} theory slots...\n`)
      
      let sectionIssues = 0
      
      // Check each slot
      for (const slot of theorySlots) {
        const start = slot.start_time
        const end = slot.end_time
        const duration = slot.duration_hours || 1
        
        // Calculate expected end time
        const [startH, startM] = start.split(':').map(Number)
        const expectedEndMinutes = startH * 60 + startM + (duration * 60)
        const expectedEndH = Math.floor(expectedEndMinutes / 60)
        const expectedEndM = expectedEndMinutes % 60
        const expectedEnd = `${String(expectedEndH).padStart(2, '0')}:${String(expectedEndM).padStart(2, '0')}`
        
        // Verify end time matches duration
        if (end !== expectedEnd) {
          console.log(`❌ MISMATCH: ${slot.subject_shortform || slot.subject_name}`)
          console.log(`   Start: ${start}, End: ${end}, Duration: ${duration}h`)
          console.log(`   Expected End: ${expectedEnd}`)
          console.log(`   Day: ${slot.day}`)
          sectionIssues++
          totalIssues++
        }
        
        // Check for half-hour durations (should not exist for theory)
        if (duration === 0.5) {
          console.log(`⚠️  HALF-HOUR SLOT FOUND: ${slot.subject_shortform || slot.subject_name}`)
          console.log(`   ${slot.day} ${start}-${end} (${duration}h)`)
          sectionIssues++
          totalIssues++
        }
        
        // Check if any OTHER slot overlaps with the second half of this 1-hour slot
        if (duration === 1) {
          const midTime = `${String(startH).padStart(2, '0')}:${String(startM + 30).padStart(2, '0')}`
          
          const overlappingSlots = theorySlots.filter(other => {
            if (other._id.toString() === slot._id.toString()) return false // Skip self
            if (other.day !== slot.day) return false // Different day
            
            // Check if other slot starts in the second half of this slot
            return other.start_time === midTime || 
                   (other.start_time > start && other.start_time < end)
          })
          
          if (overlappingSlots.length > 0) {
            console.log(`🚨 CRITICAL: ${slot.subject_shortform} at ${slot.day} ${start}-${end}`)
            console.log(`   Has OVERLAPPING slots in its second half:`)
            overlappingSlots.forEach(overlap => {
              console.log(`   - ${overlap.subject_shortform} at ${overlap.start_time}-${overlap.end_time}`)
            })
            sectionIssues++
            totalIssues++
          }
        }
      }
      
      // Display day-by-day schedule to visualize
      console.log(`\n📅 Day-by-Day Schedule:\n`)
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      
      for (const day of days) {
        const daySlots = theorySlots.filter(s => s.day === day).sort((a, b) => {
          const aMin = a.start_time.split(':').map(Number)
          const bMin = b.start_time.split(':').map(Number)
          return (aMin[0] * 60 + aMin[1]) - (bMin[0] * 60 + bMin[1])
        })
        
        if (daySlots.length === 0) continue
        
        console.log(`   ${day}:`)
        daySlots.forEach(s => {
          const teacherName = s.teacher_name || '[No Teacher]'
          const classroom = s.classroom_name || '(No Room)'
          console.log(`      ${s.start_time}-${s.end_time} (${s.duration_hours}h): ${s.subject_shortform} - ${teacherName} - ${classroom}`)
        })
      }
      
      if (sectionIssues === 0) {
        console.log(`\n✅ Section ${tt.section_name}: NO ISSUES FOUND`)
      } else {
        console.log(`\n⚠️  Section ${tt.section_name}: ${sectionIssues} issues found`)
      }
    }
    
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📊 FINAL SUMMARY`)
    console.log(`${'='.repeat(80)}`)
    console.log(`Total Issues Found: ${totalIssues}`)
    
    if (totalIssues === 0) {
      console.log('✅ ALL TIMETABLES VALIDATED - No slot granularity issues!')
    } else {
      console.log('❌ ISSUES DETECTED - See details above')
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

verifySlotGranularity()
