/**
 * Verify Step 6 Teacher Assignments
 * 
 * Run this script to check actual teacher assignments in database
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import dotenv from 'dotenv'

dotenv.config()

async function verifyTeacherAssignments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('🔗 Connected to MongoDB\n')
    
    // Get all timetables for current semester
    const semType = 'odd' // Change this to match your current generation
    const academicYear = '2025-2026' // Change this to match your current generation
    
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).lean()
    
    console.log(`📊 Analyzing ${timetables.length} timetables for ${semType} ${academicYear}\n`)
    
    let totalBatches = 0
    let batchesWith2Teachers = 0
    let batchesWith1Teacher = 0
    let batchesWithoutTeacher = 0
    
    const detailedReport = []
    
    for (const tt of timetables) {
      for (const labSlot of (tt.lab_slots || [])) {
        for (const batch of (labSlot.batches || [])) {
          totalBatches++
          
          const hasT1 = !!batch.teacher1_id
          const hasT2 = !!batch.teacher2_id
          
          if (hasT1 && hasT2) {
            batchesWith2Teachers++
          } else if (hasT1 || hasT2) {
            batchesWith1Teacher++
            detailedReport.push({
              section: tt.section_name,
              batch: batch.batch_name,
              lab: batch.lab_name,
              day: labSlot.day,
              time: `${labSlot.start_time}-${labSlot.end_time}`,
              teacher1: batch.teacher1_name || '❌ MISSING',
              teacher2: batch.teacher2_name || '❌ MISSING'
            })
          } else {
            batchesWithoutTeacher++
            detailedReport.push({
              section: tt.section_name,
              batch: batch.batch_name,
              lab: batch.lab_name,
              day: labSlot.day,
              time: `${labSlot.start_time}-${labSlot.end_time}`,
              teacher1: '❌ MISSING',
              teacher2: '❌ MISSING'
            })
          }
        }
      }
    }
    
    const successRate = totalBatches > 0 
      ? ((batchesWith2Teachers / totalBatches) * 100).toFixed(2)
      : '0.00'
    
    console.log('=' .repeat(80))
    console.log('📊 ACTUAL DATABASE STATE')
    console.log('=' .repeat(80))
    console.log(`Total Lab Batches: ${totalBatches}`)
    console.log(`✅ With 2 Teachers: ${batchesWith2Teachers}`)
    console.log(`⚠️  With 1 Teacher: ${batchesWith1Teacher}`)
    console.log(`❌ With 0 Teachers: ${batchesWithoutTeacher}`)
    console.log(`Success Rate: ${successRate}%`)
    console.log('=' .repeat(80))
    
    if (detailedReport.length > 0) {
      console.log('\n📋 INCOMPLETE ASSIGNMENTS:\n')
      detailedReport.forEach(item => {
        console.log(`   ${item.section} ${item.batch} - ${item.lab}`)
        console.log(`   ${item.day} ${item.time}`)
        console.log(`   T1: ${item.teacher1}`)
        console.log(`   T2: ${item.teacher2}`)
        console.log()
      })
    }
    
    // Check metadata stored in timetables
    console.log('\n📝 METADATA CHECK:\n')
    for (const tt of timetables) {
      const summary = tt.generation_metadata?.teacher_assignment_summary
      if (summary) {
        console.log(`${tt.section_name}:`)
        console.log(`   Stored: ${summary.batches_with_2_teachers} with 2 teachers, ${summary.batches_with_1_teacher} with 1 teacher`)
      }
    }
    
    await mongoose.disconnect()
    console.log('\n✅ Verification complete')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

verifyTeacherAssignments()
