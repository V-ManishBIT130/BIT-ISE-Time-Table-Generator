/**
 * Analyze Available Lab Slots
 * 
 * Purpose: Check which time slots are actually free and identify missed opportunities
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import DeptLabs from '../models/dept_labs_model.js'
import SyllabusLabs from '../models/syllabus_labs_model.js'
import Timetable from '../models/timetable_model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TIME_SLOTS = [
  { start: '08:00', end: '10:00' },
  { start: '10:00', end: '12:00' },
  { start: '12:00', end: '14:00' },
  { start: '14:00', end: '16:00' },
  { start: '15:00', end: '17:00' }
]

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function generateSegmentKeys(roomId, day, startTime, endTime) {
  const startMinutes = toMinutes(startTime)
  const endMinutes = toMinutes(endTime)
  const duration = endMinutes - startMinutes
  const numSegments = Math.ceil(duration / 30)
  
  const keys = []
  for (let i = 0; i < numSegments; i++) {
    const segmentStart = startMinutes + (i * 30)
    const hours = Math.floor(segmentStart / 60)
    const mins = segmentStart % 60
    const timeKey = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
    keys.push(`${roomId}_${day}_${timeKey}`)
  }
  return keys
}

async function analyzeAvailableSlots() {
  try {
    console.log('\n🔍 ===== ANALYZING AVAILABLE LAB SLOTS =====\n')
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Get all lab rooms
    const allRooms = await DeptLabs.find({}).lean()
    console.log(`📚 Found ${allRooms.length} total lab rooms:\n`)
    
    // Group rooms by equipment type
    const roomsByEquipment = {}
    for (const room of allRooms) {
      const equipmentTypes = room.equipment_available || []
      for (const equipment of equipmentTypes) {
        const equipName = equipment.equipment_name
        if (!roomsByEquipment[equipName]) {
          roomsByEquipment[equipName] = []
        }
        roomsByEquipment[equipName].push({
          id: room._id.toString(),
          name: room.labRoom_no
        })
      }
    }
    
    console.log('🔧 Rooms by Equipment Type:')
    for (const [equipment, rooms] of Object.entries(roomsByEquipment)) {
      console.log(`   ${equipment}: ${rooms.length} rooms - [${rooms.map(r => r.name).join(', ')}]`)
    }
    console.log('')
    
    // Get labs that need scheduling
    const failedLabs = [
      { semester: 5, sections: ['5B', '5C'], labs: ['DV - LAB', 'CN - LAB'] },
      { semester: 7, sections: ['7A', '7B', '7C'], labs: ['PC - LAB', 'BDA - LAB'] }
    ]
    
    console.log('🎯 Failed Labs Analysis:\n')
    
    for (const failed of failedLabs) {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`Semester ${failed.semester} - Sections: ${failed.sections.join(', ')}`)
      console.log(`Labs needed: ${failed.labs.join(', ')}`)
      console.log(`${'='.repeat(80)}\n`)
      
      // For each lab, check compatible rooms
      for (const labName of failed.labs) {
        const labShortform = labName.split(' - ')[0]
        console.log(`📋 Analyzing: ${labName} (${labShortform})`)
        
        // Get lab details from syllabus
        const syllabusLab = await SyllabusLabs.findOne({
          sem: failed.semester,
          $or: [
            { lab_name: labName },
            { lab_shortform: labShortform }
          ]
        }).lean()
        
        if (!syllabusLab) {
          console.log(`   ⚠️  Lab not found in syllabus\n`)
          continue
        }
        
        console.log(`   Required equipment: ${syllabusLab.required_equipment}`)
        
        // Find compatible rooms
        const compatibleRooms = allRooms.filter(room => {
          const equipmentTypes = room.equipment_available || []
          return equipmentTypes.some(eq => eq.equipment_name === syllabusLab.required_equipment)
        })
        
        console.log(`   Compatible rooms: ${compatibleRooms.length} found`)
        if (compatibleRooms.length === 0) {
          console.log(`   ❌ NO COMPATIBLE ROOMS EXIST!\n`)
          continue
        }
        
        compatibleRooms.forEach(room => {
          console.log(`      - ${room.labRoom_no} (ID: ${room._id})`)
        })
        
        // Now check which slots are occupied for these rooms
        const timetables = await Timetable.find({
          sem_type: 'odd',
          academic_year: '2024-2025'
        }).lean()
        
        // Build occupancy map
        const occupancyMap = new Map()
        
        for (const tt of timetables) {
          const labSlots = tt.lab_slots || []
          for (const slot of labSlots) {
            const batches = slot.batches || []
            for (const batch of batches) {
              if (batch.lab_room_id) {
                const roomId = batch.lab_room_id.toString()
                const segmentKeys = generateSegmentKeys(roomId, slot.day, slot.start_time, slot.end_time)
                
                for (const key of segmentKeys) {
                  if (!occupancyMap.has(key)) {
                    occupancyMap.set(key, [])
                  }
                  occupancyMap.get(key).push({
                    section: tt.section_name,
                    batch: batch.batch_name,
                    lab: batch.lab_shortform,
                    room: batch.lab_room_name,
                    day: slot.day,
                    time: `${slot.start_time}-${slot.end_time}`
                  })
                }
              }
            }
          }
        }
        
        console.log(`\n   🗓️  Slot Availability Analysis:`)
        
        // Check each compatible room's availability
        for (const room of compatibleRooms) {
          const roomId = room._id.toString()
          let totalSlots = DAYS.length * TIME_SLOTS.length // 5 days × 5 slots = 25
          let occupiedSlots = 0
          let availableSlots = 0
          
          const availableDetails = []
          
          for (const day of DAYS) {
            for (const slot of TIME_SLOTS) {
              const segmentKeys = generateSegmentKeys(roomId, day, slot.start, slot.end)
              const isOccupied = segmentKeys.some(key => occupancyMap.has(key))
              
              if (isOccupied) {
                occupiedSlots++
              } else {
                availableSlots++
                availableDetails.push(`${day} ${slot.start}-${slot.end}`)
              }
            }
          }
          
          const utilizationPercent = ((occupiedSlots / totalSlots) * 100).toFixed(1)
          
          console.log(`\n      🏢 Room: ${room.labRoom_no}`)
          console.log(`         Total slots: ${totalSlots}`)
          console.log(`         Occupied: ${occupiedSlots} (${utilizationPercent}%)`)
          console.log(`         Available: ${availableSlots} (${(100 - utilizationPercent)}%)`)
          
          if (availableSlots > 0) {
            console.log(`         ✅ FREE SLOTS:`)
            // Group by day
            const byDay = {}
            for (const detail of availableDetails) {
              const [day, ...rest] = detail.split(' ')
              if (!byDay[day]) byDay[day] = []
              byDay[day].push(rest.join(' '))
            }
            for (const [day, slots] of Object.entries(byDay)) {
              console.log(`            ${day}: ${slots.join(', ')}`)
            }
          } else {
            console.log(`         ❌ FULLY BOOKED`)
          }
        }
        
        console.log(``)
      }
    }
    
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📊 SUMMARY`)
    console.log(`${'='.repeat(80)}\n`)
    
    console.log(`This analysis shows:`)
    console.log(`1. Which equipment types have how many compatible rooms`)
    console.log(`2. For failed labs, which rooms could theoretically host them`)
    console.log(`3. Which specific day-time slots are free in those rooms`)
    console.log(`4. Room utilization percentages`)
    console.log(``)
    console.log(`Use this to identify:`)
    console.log(`- Are there actually free slots we're not finding?`)
    console.log(`- Are rooms fully booked (need more rooms)?`)
    console.log(`- Is equipment compatibility too strict?`)
    console.log(``)
    
    await mongoose.disconnect()
    console.log('✅ Disconnected from MongoDB\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

analyzeAvailableSlots()
