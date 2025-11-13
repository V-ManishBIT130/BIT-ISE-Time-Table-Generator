/**
 * VERIFICATION SCRIPT: Check for Lab Room Conflicts
 * 
 * Purpose: Verify that no lab room has multiple subjects scheduled at the same time
 * 
 * This script will:
 * 1. Load all timetables
 * 2. Extract all lab slots with their room assignments
 * 3. Build a global room schedule
 * 4. Check for any time overlaps in the same room
 * 5. Report any conflicts found
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// MongoDB connection from .env
const MONGO_URI = process.env.MONGODB_URI

/**
 * Helper: Check if two time ranges overlap
 */
function timesOverlap(start1, end1, start2, end2) {
  return (start1 < end2 && end1 > start2)
}

/**
 * Main verification function
 */
async function verifyLabRoomConflicts() {
  try {
    console.log('🔍 VERIFICATION: Checking for Lab Room Conflicts\n')
    console.log('=' .repeat(80))
    
    await mongoose.connect(MONGO_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Load all timetables
    const timetables = await Timetable.find({}).lean()
    
    console.log(`📋 Loaded ${timetables.length} timetables`)
    console.log(`   Filtering for odd semester, 2024-2025\n`)
    
    // Build global room schedule
    // Key format: "roomId_day_time"
    // Value: Array of assignments at that time
    const roomSchedule = new Map()
    
    // Extract all lab slots
    let totalLabSlots = 0
    let totalBatchAssignments = 0
    
    for (const tt of timetables) {
      const sectionName = tt.section_name
      const labSlots = tt.lab_slots || []
      
      totalLabSlots += labSlots.length
      
      for (const slot of labSlots) {
        const { day, start_time, end_time, batches } = slot
        
        if (!batches || batches.length === 0) continue
        
        for (const batch of batches) {
          totalBatchAssignments++
          
          const roomId = batch.lab_room_id?.toString() || 'unknown'
          const roomName = batch.lab_room_name || 'Unknown'
          const labName = batch.lab_shortform || batch.lab_name
          const batchName = batch.batch_name
          
          // Create a key for this room-day-time combination
          const key = `${roomId}_${day}_${start_time}_${end_time}`
          
          if (!roomSchedule.has(key)) {
            roomSchedule.set(key, [])
          }
          
          roomSchedule.get(key).push({
            section: sectionName,
            batch: batchName,
            lab: labName,
            room: roomName,
            roomId: roomId,
            day: day,
            startTime: start_time,
            endTime: end_time
          })
        }
      }
    }
    
    console.log(`📊 STATISTICS:`)
    console.log(`   Total Lab Slots: ${totalLabSlots}`)
    console.log(`   Total Batch Assignments: ${totalBatchAssignments}`)
    console.log(`   Unique Room-Time Combinations: ${roomSchedule.size}\n`)
    
    // Check for conflicts
    console.log('🔍 CHECKING FOR CONFLICTS...\n')
    
    let conflictsFound = 0
    const conflictDetails = []
    
    // Group by room to check overlaps
    const roomMap = new Map()
    
    for (const [key, assignments] of roomSchedule.entries()) {
      const roomId = assignments[0].roomId
      
      if (!roomMap.has(roomId)) {
        roomMap.set(roomId, [])
      }
      
      roomMap.get(roomId).push(...assignments)
    }
    
    // Check each room for time overlaps
    for (const [roomId, assignments] of roomMap.entries()) {
      const roomName = assignments[0].room
      
      // Sort by day and time
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      assignments.sort((a, b) => {
        const dayDiff = days.indexOf(a.day) - days.indexOf(b.day)
        if (dayDiff !== 0) return dayDiff
        return a.startTime.localeCompare(b.startTime)
      })
      
      // Check for overlaps
      for (let i = 0; i < assignments.length; i++) {
        for (let j = i + 1; j < assignments.length; j++) {
          const a1 = assignments[i]
          const a2 = assignments[j]
          
          // Only check same day
          if (a1.day !== a2.day) continue
          
          // Check if times overlap
          if (timesOverlap(a1.startTime, a1.endTime, a2.startTime, a2.endTime)) {
            conflictsFound++
            conflictDetails.push({
              room: roomName,
              day: a1.day,
              assignment1: `${a1.batch} - ${a1.lab} (${a1.startTime}-${a1.endTime})`,
              assignment2: `${a2.batch} - ${a2.lab} (${a2.startTime}-${a2.endTime})`
            })
          }
        }
      }
    }
    
    // Report results
    console.log('=' .repeat(80))
    console.log('📊 VERIFICATION RESULTS')
    console.log('=' .repeat(80))
    
    if (conflictsFound === 0) {
      console.log('\n✅ SUCCESS! No lab room conflicts detected!')
      console.log('   All lab rooms have only one subject scheduled at any given time.')
      console.log('   The schedule is globally conflict-free! 🎉\n')
    } else {
      console.log(`\n❌ CONFLICTS DETECTED: ${conflictsFound} room conflicts found!\n`)
      
      conflictDetails.forEach((conflict, idx) => {
        console.log(`${idx + 1}. Room ${conflict.room} on ${conflict.day}:`)
        console.log(`   ⚠️  ${conflict.assignment1}`)
        console.log(`   ⚠️  ${conflict.assignment2}`)
        console.log()
      })
    }
    
    // Additional analysis: Show room utilization
    console.log('=' .repeat(80))
    console.log('📊 ROOM UTILIZATION ANALYSIS')
    console.log('=' .repeat(80))
    
    const roomUsage = new Map()
    
    for (const [roomId, assignments] of roomMap.entries()) {
      const roomName = assignments[0].room
      
      // Count unique time slots (not overlapping)
      const uniqueSlots = new Set()
      for (const assignment of assignments) {
        uniqueSlots.add(`${assignment.day}_${assignment.startTime}_${assignment.endTime}`)
      }
      
      roomUsage.set(roomName, {
        totalAssignments: assignments.length,
        uniqueTimeSlots: uniqueSlots.size
      })
    }
    
    // Sort by room name
    const sortedRooms = Array.from(roomUsage.entries()).sort((a, b) => 
      a[0].localeCompare(b[0])
    )
    
    console.log()
    for (const [roomName, usage] of sortedRooms) {
      console.log(`   ${roomName}: ${usage.uniqueTimeSlots} time slots, ${usage.totalAssignments} batch assignments`)
    }
    console.log()
    
    // Check for internal conflicts (same slot, same room, multiple batches)
    console.log('=' .repeat(80))
    console.log('🔍 INTERNAL SLOT CONFLICTS (Multiple batches in same room at same time)')
    console.log('=' .repeat(80))
    
    let internalConflicts = 0
    
    for (const [key, assignments] of roomSchedule.entries()) {
      if (assignments.length > 1) {
        // Multiple batches scheduled in same room at same time
        const roomName = assignments[0].room
        const day = assignments[0].day
        const time = `${assignments[0].startTime}-${assignments[0].endTime}`
        
        console.log(`\n❌ INTERNAL CONFLICT in Room ${roomName} on ${day} ${time}:`)
        assignments.forEach((a, idx) => {
          console.log(`   ${idx + 1}. ${a.batch} - ${a.lab}`)
        })
        
        internalConflicts++
      }
    }
    
    if (internalConflicts === 0) {
      console.log('\n✅ No internal conflicts detected!')
      console.log('   Each room has at most one batch at any given time slot.\n')
    } else {
      console.log(`\n❌ ${internalConflicts} internal conflicts detected!`)
      console.log('   Multiple batches scheduled in the same room at the same time.\n')
    }
    
    console.log('=' .repeat(80))
    console.log('✅ VERIFICATION COMPLETE')
    console.log('=' .repeat(80))
    
    await mongoose.disconnect()
    
  } catch (error) {
    console.error('❌ Error during verification:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

// Run verification
verifyLabRoomConflicts()
