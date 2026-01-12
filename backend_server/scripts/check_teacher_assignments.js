/**
 * Quick Check: Verify 2-Teacher Assignments
 */

import mongoose from 'mongoose'
import '../db.js'
import Timetable from '../models/timetable_model.js'

async function checkAssignments() {
  try {
    console.log('🔍 Checking Lab Teacher Assignments\n')
    
    const timetables = await Timetable.find({
      academic_year: '2025-2026',
      sem_type: 'odd'
    }).lean()
    
    console.log(`Found ${timetables.length} timetables\n`)
    
    let totalBatches = 0
    let with2Teachers = 0
    let with1Teacher = 0
    let with0Teachers = 0
    
    const teacherStats = new Map()
    
    for (const tt of timetables) {
      for (const labSlot of tt.lab_slots || []) {
        for (const batch of labSlot.batches || []) {
          totalBatches++
          
          const t1 = batch.teacher1_shortform || batch.teacher1_name
          const t2 = batch.teacher2_shortform || batch.teacher2_name
          
          if (t1 && t2) {
            with2Teachers++
            // Count for T1
            const t1Count = teacherStats.get(t1) || 0
            teacherStats.set(t1, t1Count + 1)
            // Count for T2
            const t2Count = teacherStats.get(t2) || 0
            teacherStats.set(t2, t2Count + 1)
          } else if (t1 || t2) {
            with1Teacher++
            const teacher = t1 || t2
            const count = teacherStats.get(teacher) || 0
            teacherStats.set(teacher, count + 1)
          } else {
            with0Teachers++
          }
        }
      }
    }
    
    console.log('📊 Assignment Summary:')
    console.log(`   Total Batches: ${totalBatches}`)
    console.log(`   ✅ With 2 Teachers: ${with2Teachers}`)
    console.log(`   ⚠️  With 1 Teacher: ${with1Teacher}`)
    console.log(`   ❌ With 0 Teachers: ${with0Teachers}`)
    console.log()
    
    console.log('👥 Teacher Assignment Counts (Top 10):')
    const sorted = Array.from(teacherStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    
    sorted.forEach(([teacher, count]) => {
      console.log(`   ${teacher}: ${count} assignments`)
    })
    
    // Sample batch
    console.log('\n📝 Sample Batch (3A, first lab):')
    const sample = timetables[0].lab_slots[0].batches[0]
    console.log(`   Section: ${timetables[0].section_name}`)
    console.log(`   Batch: ${sample.batch_name}`)
    console.log(`   Lab: ${sample.lab_name}`)
    console.log(`   Teacher 1: ${sample.teacher1_name} (${sample.teacher1_shortform})`)
    console.log(`   Teacher 2: ${sample.teacher2_name} (${sample.teacher2_shortform})`)
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkAssignments()
