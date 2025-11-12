/**
 * Check How Labs Were Actually Scheduled
 * 
 * Purpose: Look at scheduled labs to understand the data structure
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import Timetable from '../models/timetable_model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

async function checkScheduledLabs() {
  try {
    console.log('\n🔍 ===== CHECKING SCHEDULED LABS =====\n')
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Get timetables with lab slots
    const timetables = await Timetable.find({
      sem_type: 'odd',
      academic_year: '2024-2025'
    }).lean()
    
    console.log(`📚 Found ${timetables.length} timetables\n`)
    
    // Analyze lab slots
    for (const tt of timetables) {
      const labSlots = tt.lab_slots || []
      
      if (labSlots.length > 0) {
        console.log(`\n${'='.repeat(80)}`)
        console.log(`Section: ${tt.section_name} (Semester ${tt.sem})`)
        console.log(`Lab Slots: ${labSlots.length}`)
        console.log(`${'='.repeat(80)}\n`)
        
        for (const slot of labSlots) {
          console.log(`   📅 ${slot.day} ${slot.start_time}-${slot.end_time}`)
          const batches = slot.batches || []
          for (const batch of batches) {
            console.log(`      ${batch.batch_name}:`)
            console.log(`         Lab: ${batch.lab_name} (${batch.lab_shortform})`)
            console.log(`         Room: ${batch.lab_room_name} (ID: ${batch.lab_room_id})`)
          }
          console.log(``)
        }
      }
    }
    
    // Check which labs exist across all sections
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📊 ALL UNIQUE LABS SCHEDULED:`)
    console.log(`${'='.repeat(80)}\n`)
    
    const uniqueLabs = new Map()
    const roomUsage = new Map()
    
    for (const tt of timetables) {
      const labSlots = tt.lab_slots || []
      for (const slot of labSlots) {
        const batches = slot.batches || []
        for (const batch of batches) {
          const labKey = `${batch.lab_shortform} - ${batch.lab_name}`
          if (!uniqueLabs.has(labKey)) {
            uniqueLabs.set(labKey, {
              shortform: batch.lab_shortform,
              name: batch.lab_name,
              sections: new Set(),
              count: 0
            })
          }
          uniqueLabs.get(labKey).sections.add(tt.section_name)
          uniqueLabs.get(labKey).count++
          
          // Track room usage
          const roomName = batch.lab_room_name
          if (!roomUsage.has(roomName)) {
            roomUsage.set(roomName, 0)
          }
          roomUsage.set(roomName, roomUsage.get(roomName) + 1)
        }
      }
    }
    
    for (const [key, data] of uniqueLabs.entries()) {
      console.log(`   ${key}`)
      console.log(`      Sections: ${[...data.sections].join(', ')}`)
      console.log(`      Total batch-sessions: ${data.count}`)
      console.log(``)
    }
    
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📊 ROOM USAGE:`)
    console.log(`${'='.repeat(80)}\n`)
    
    for (const [room, count] of roomUsage.entries()) {
      console.log(`   ${room}: ${count} batch-sessions`)
    }
    
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

checkScheduledLabs()
