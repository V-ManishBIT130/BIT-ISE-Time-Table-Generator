/**
 * DIAGNOSTIC: Show Monday schedule for 3B section to visualize the CN problem
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

async function diagnoseCNProblem() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Find all sections first
    const allTimetables = await Timetable.find({
      sem_type: 'ODD',
      academic_year: '2024-2025'
    }).lean()
    
    console.log(`📋 Available sections: ${allTimetables.map(t => t.section_name).join(', ')}\n`)
    
    // Find section with CN scheduled on Monday
    let timetable = null
    for (const tt of allTimetables) {
      const hasCN = (tt.theory_slots || []).some(s => 
        s.day === 'Monday' && s.subject_shortform === 'CN'
      )
      if (hasCN) {
        timetable = tt
        break
      }
    }
    
    if (!timetable) {
      console.log('❌ No section found with CN on Monday')
      return
    }
    
    console.log('=' .repeat(100))
    console.log(`SECTION: ${timetable.section_name}`)
    console.log('='.repeat(100))
    
    // Get Monday schedule
    const mondayTheory = (timetable.theory_slots || []).filter(s => s.day === 'Monday')
    const mondayLabs = (timetable.lab_slots || []).filter(s => s.day === 'Monday')
    
    console.log(`\n📅 MONDAY SCHEDULE:\n`)
    
    // Sort by time
    const allSlots = [...mondayTheory, ...mondayLabs].sort((a, b) => {
      const aMin = a.start_time.split(':').map(Number)
      const bMin = b.start_time.split(':').map(Number)
      return (aMin[0] * 60 + aMin[1]) - (bMin[0] * 60 + bMin[1])
    })
    
    console.log(`Time Range       | Subject | Teacher        | Room | Duration | Type`)
    console.log(`-`.repeat(100))
    
    allSlots.forEach(slot => {
      const type = slot.subject_id ? 'Theory' : 'Lab'
      const subject = slot.subject_shortform || slot.subject_name || 'Break'
      const teacher = slot.teacher_name || '---'
      const room = slot.classroom_name || 'NONE'
      const duration = `${slot.duration_hours}h`
      
      console.log(`${slot.start_time}-${slot.end_time}  | ${subject.padEnd(7)} | ${teacher.padEnd(14)} | ${room.padEnd(4)} | ${duration.padEnd(8)} | ${type}`)
    })
    
    console.log(`\n${'='.repeat(100)}`)
    console.log(`CRITICAL ANALYSIS:`)
    console.log(`${'='.repeat(100)}\n`)
    
    // Find CN class
    const cnSlot = mondayTheory.find(s => s.subject_shortform === 'CN')
    
    if (!cnSlot) {
      console.log('❌ CN slot not found on Monday')
      return
    }
    
    console.log(`📚 CN (Computer Networks) Details:`)
    console.log(`   Start Time: ${cnSlot.start_time}`)
    console.log(`   End Time: ${cnSlot.end_time}`)
    console.log(`   Duration: ${cnSlot.duration_hours} hour(s)`)
    console.log(`   Teacher: ${cnSlot.teacher_name}`)
    console.log(`   Room: ${cnSlot.classroom_name || '❌ NONE'}`)
    
    // Calculate half-way point
    const [startH, startM] = cnSlot.start_time.split(':').map(Number)
    const midTime = `${String(startH).padStart(2, '0')}:${String(startM + 30).padStart(2, '0')}`
    
    console.log(`\n⚠️  CRITICAL CHECK: CN occupies ${cnSlot.start_time}-${cnSlot.end_time}`)
    console.log(`   First half: ${cnSlot.start_time}-${midTime}`)
    console.log(`   Second half: ${midTime}-${cnSlot.end_time}`)
    
    // Check if any other slot exists in the second half
    const overlappingSlots = allSlots.filter(other => {
      if (other._id.toString() === cnSlot._id.toString()) return false
      
      // Check if other slot starts OR ends in CN's time range
      return (other.start_time >= cnSlot.start_time && other.start_time < cnSlot.end_time) ||
             (other.end_time > cnSlot.start_time && other.end_time <= cnSlot.end_time) ||
             (other.start_time <= cnSlot.start_time && other.end_time >= cnSlot.end_time)
    })
    
    if (overlappingSlots.length > 0) {
      console.log(`\n🚨 BUG DETECTED! Found ${overlappingSlots.length} slots overlapping with CN:`)
      overlappingSlots.forEach(slot => {
        console.log(`   - ${slot.subject_shortform || slot.subject_name}: ${slot.start_time}-${slot.end_time} (${slot.classroom_name || 'NONE'})`)
      })
    } else {
      console.log(`\n✅ No overlapping slots detected (algorithm is correct)`)
    }
    
    // Now check what SHOULD be available at 8:30
    console.log(`\n\n${'='.repeat(100)}`)
    console.log(`AVAILABILITY CHECK: Monday 8:30-9:00`)
    console.log(`${'='.repeat(100)}\n`)
    
    const checkStartTime = '08:30'
    const checkEndTime = '09:00'
    
    // Find all slots that would PREVENT scheduling at 8:30-9:00
    const blockingSlots = allSlots.filter(slot => {
      const slotStart = slot.start_time
      const slotEnd = slot.end_time
      
      // Times overlap if: start1 < end2 AND end1 > start2
      return (slotStart < checkEndTime && slotEnd > checkStartTime)
    })
    
    if (blockingSlots.length > 0) {
      console.log(`❌ Cannot schedule at ${checkStartTime}-${checkEndTime} due to:`)
      blockingSlots.forEach(slot => {
        console.log(`   - ${(slot.subject_shortform || slot.subject_name).padEnd(7)}: ${slot.start_time}-${slot.end_time} (overlaps with check range)`)
      })
    } else {
      console.log(`✅ ${checkStartTime}-${checkEndTime} is AVAILABLE`)
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

diagnoseCNProblem()
