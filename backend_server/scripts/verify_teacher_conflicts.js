/**
 * TEACHER CONFLICT VERIFICATION SCRIPT
 * 
 * Purpose: Verify that no teacher is assigned to multiple sections at the same time
 * 
 * This script checks:
 * 1. Theory slot conflicts - Same teacher teaching different sections at same time
 * 2. Lab slot conflicts - Same teacher supervising different batches at same time
 * 3. Cross-type conflicts - Teacher in both theory and lab at same time
 * 
 * Run: node backend_server/scripts/verify_teacher_conflicts.js
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import ISESections from '../models/ise_sections_model.js'
import 'dotenv/config'

// Connect to MongoDB
const conn = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Database connected')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

/**
 * Helper: Check if two time ranges overlap
 */
function timesOverlap(start1, end1, start2, end2) {
  return (start1 < end2 && end1 > start2)
}

/**
 * Main verification function
 */
async function verifyTeacherConflicts() {
  console.log('\n' + '='.repeat(80))
  console.log('🔍 TEACHER CONFLICT VERIFICATION')
  console.log('='.repeat(80))
  
  try {
    // Get semester type and academic year from user or use defaults
    const semType = process.argv[2] || 'odd'
    const academicYear = process.argv[3] || '2024-2025'
    
    console.log(`\n📋 Checking ${semType} semester, Academic Year: ${academicYear}`)
    
    // Load all timetables for this semester type
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).populate('section_id').lean()
    
    if (timetables.length === 0) {
      console.log('❌ No timetables found for verification')
      return
    }
    
    console.log(`✅ Found ${timetables.length} timetables to verify\n`)
    
    // Build teacher schedule map: teacherId_day_time -> [assignments]
    const teacherSchedule = new Map()
    
    let totalTheorySlots = 0
    let totalLabAssignments = 0
    
    // Collect all teacher assignments
    console.log('📊 Building teacher schedule map...\n')
    
    for (const timetable of timetables) {
      const sectionName = timetable.section_name
      
      // Process theory slots
      const theorySlots = timetable.theory_slots || []
      for (const slot of theorySlots) {
        if (slot.teacher_id) {
          totalTheorySlots++
          const teacherId = slot.teacher_id.toString()
          const key = `${teacherId}_${slot.day}_${slot.start_time}_${slot.end_time}`
          
          if (!teacherSchedule.has(key)) {
            teacherSchedule.set(key, [])
          }
          
          teacherSchedule.get(key).push({
            type: 'theory',
            section: sectionName,
            teacherId: teacherId,
            teacherName: slot.teacher_name,
            day: slot.day,
            startTime: slot.start_time,
            endTime: slot.end_time,
            subject: slot.subject_name
          })
        }
      }
      
      // Process lab slots
      const labSlots = timetable.lab_slots || []
      for (const labSlot of labSlots) {
        const batches = labSlot.batches || []
        for (const batch of batches) {
          // Check teacher 1
          if (batch.teacher1_id) {
            totalLabAssignments++
            const teacherId = batch.teacher1_id.toString()
            const key = `${teacherId}_${labSlot.day}_${labSlot.start_time}_${labSlot.end_time}`
            
            if (!teacherSchedule.has(key)) {
              teacherSchedule.set(key, [])
            }
            
            teacherSchedule.get(key).push({
              type: 'lab',
              section: sectionName,
              teacherId: teacherId,
              teacherName: batch.teacher1_name,
              day: labSlot.day,
              startTime: labSlot.start_time,
              endTime: labSlot.end_time,
              batch: batch.batch_name,
              lab: batch.lab_name
            })
          }
          
          // Check teacher 2
          if (batch.teacher2_id) {
            totalLabAssignments++
            const teacherId = batch.teacher2_id.toString()
            const key = `${teacherId}_${labSlot.day}_${labSlot.start_time}_${labSlot.end_time}`
            
            if (!teacherSchedule.has(key)) {
              teacherSchedule.set(key, [])
            }
            
            teacherSchedule.get(key).push({
              type: 'lab',
              section: sectionName,
              teacherId: teacherId,
              teacherName: batch.teacher2_name,
              day: labSlot.day,
              startTime: labSlot.start_time,
              endTime: labSlot.end_time,
              batch: batch.batch_name,
              lab: batch.lab_name
            })
          }
        }
      }
    }
    
    console.log(`   ✓ Processed ${totalTheorySlots} theory slot assignments`)
    console.log(`   ✓ Processed ${totalLabAssignments} lab teacher assignments`)
    console.log(`   ✓ Total unique teacher-time combinations: ${teacherSchedule.size}\n`)
    
    // Check for conflicts (same key with multiple assignments means conflict)
    console.log('🔍 Checking for conflicts...\n')
    
    const conflicts = []
    
    for (const [key, assignments] of teacherSchedule.entries()) {
      if (assignments.length > 1) {
        // CONFLICT FOUND!
        conflicts.push({
          key,
          assignments
        })
      }
    }
    
    // Display results
    console.log('='.repeat(80))
    console.log('📊 VERIFICATION RESULTS')
    console.log('='.repeat(80) + '\n')
    
    if (conflicts.length === 0) {
      console.log('✅ ✅ ✅ NO CONFLICTS FOUND! ✅ ✅ ✅')
      console.log('\n🎉 All teachers are properly assigned with no time conflicts!')
      console.log('   - No teacher is in two places at the same time')
      console.log('   - Global conflict prevention is working correctly')
      console.log('   - All ' + (totalTheorySlots + totalLabAssignments) + ' assignments are conflict-free\n')
    } else {
      console.log(`❌ ❌ ❌ CONFLICTS FOUND: ${conflicts.length} ❌ ❌ ❌\n`)
      
      conflicts.forEach((conflict, idx) => {
        const { assignments } = conflict
        const first = assignments[0]
        
        console.log(`\n⚠️  CONFLICT ${idx + 1}:`)
        console.log(`   Teacher: ${first.teacherName} (ID: ${first.teacherId})`)
        console.log(`   Time: ${first.day} ${first.startTime} - ${first.endTime}`)
        console.log(`   Assigned to ${assignments.length} different places:\n`)
        
        assignments.forEach((assignment, i) => {
          if (assignment.type === 'theory') {
            console.log(`   ${i + 1}. THEORY - Section ${assignment.section}`)
            console.log(`      Subject: ${assignment.subject}`)
          } else {
            console.log(`   ${i + 1}. LAB - Section ${assignment.section}`)
            console.log(`      Batch: ${assignment.batch}, Lab: ${assignment.lab}`)
          }
        })
        
        console.log('\n' + '-'.repeat(80))
      })
      
      console.log(`\n❌ Total conflicts found: ${conflicts.length}`)
      console.log('⚠️  These conflicts need to be resolved!\n')
    }
    
    // Also check for overlapping time conflicts (different start/end times that overlap)
    console.log('🔍 Checking for overlapping time conflicts...\n')
    
    const allAssignments = []
    for (const assignments of teacherSchedule.values()) {
      allAssignments.push(...assignments)
    }
    
    const overlapConflicts = []
    
    // Group by teacher and day
    const teacherDayMap = new Map()
    for (const assignment of allAssignments) {
      const key = `${assignment.teacherId}_${assignment.day}`
      if (!teacherDayMap.has(key)) {
        teacherDayMap.set(key, [])
      }
      teacherDayMap.get(key).push(assignment)
    }
    
    // Check for overlaps within each teacher-day group
    for (const [key, assignments] of teacherDayMap.entries()) {
      if (assignments.length > 1) {
        // Check each pair for overlap
        for (let i = 0; i < assignments.length; i++) {
          for (let j = i + 1; j < assignments.length; j++) {
            const a1 = assignments[i]
            const a2 = assignments[j]
            
            if (timesOverlap(a1.startTime, a1.endTime, a2.startTime, a2.endTime)) {
              overlapConflicts.push([a1, a2])
            }
          }
        }
      }
    }
    
    if (overlapConflicts.length === 0) {
      console.log('✅ No overlapping time conflicts found!\n')
    } else {
      console.log(`❌ OVERLAPPING TIME CONFLICTS FOUND: ${overlapConflicts.length}\n`)
      
      overlapConflicts.forEach(([a1, a2], idx) => {
        console.log(`\n⚠️  OVERLAP CONFLICT ${idx + 1}:`)
        console.log(`   Teacher: ${a1.teacherName} (ID: ${a1.teacherId})`)
        console.log(`   Day: ${a1.day}`)
        console.log(`\n   Assignment 1:`)
        console.log(`      Time: ${a1.startTime} - ${a1.endTime}`)
        console.log(`      ${a1.type === 'theory' ? 'THEORY' : 'LAB'} - Section ${a1.section}`)
        console.log(`\n   Assignment 2:`)
        console.log(`      Time: ${a2.startTime} - ${a2.endTime}`)
        console.log(`      ${a2.type === 'theory' ? 'THEORY' : 'LAB'} - Section ${a2.section}`)
        console.log('\n' + '-'.repeat(80))
      })
    }
    
    // Summary statistics
    console.log('\n' + '='.repeat(80))
    console.log('📈 SUMMARY')
    console.log('='.repeat(80))
    console.log(`   Total Sections: ${timetables.length}`)
    console.log(`   Total Theory Assignments: ${totalTheorySlots}`)
    console.log(`   Total Lab Assignments: ${totalLabAssignments}`)
    console.log(`   Total Assignments: ${totalTheorySlots + totalLabAssignments}`)
    console.log(`   Unique Teacher-Time Slots: ${teacherSchedule.size}`)
    console.log(`   Exact Time Conflicts: ${conflicts.length}`)
    console.log(`   Overlapping Time Conflicts: ${overlapConflicts.length}`)
    console.log(`   Overall Status: ${conflicts.length === 0 && overlapConflicts.length === 0 ? '✅ PASS' : '❌ FAIL'}`)
    console.log('='.repeat(80) + '\n')
    
  } catch (error) {
    console.error('❌ Error during verification:', error)
    throw error
  }
}

// Main execution
async function main() {
  await conn()
  await verifyTeacherConflicts()
  await mongoose.connection.close()
  console.log('✅ Database connection closed\n')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
