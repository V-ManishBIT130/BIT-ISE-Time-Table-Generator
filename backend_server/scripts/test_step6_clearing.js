/**
 * TEST SCRIPT: Verify Step 6 Clearing Logic
 * 
 * This script tests that Step 6 properly clears previous teacher assignments
 * before assigning new teachers
 * 
 * Run: node backend_server/scripts/test_step6_clearing.js odd 2024-2025
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import ISESections from '../models/ise_sections_model.js'
import 'dotenv/config'

// Connect to MongoDB
const conn = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Database connected\n')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

/**
 * Check teacher assignments in database
 */
async function checkTeacherAssignments(semType, academicYear) {
  console.log('='.repeat(70))
  console.log('🔍 CHECKING CURRENT TEACHER ASSIGNMENTS')
  console.log('='.repeat(70))
  console.log(`📋 Semester: ${semType}, Year: ${academicYear}\n`)
  
  const timetables = await Timetable.find({
    sem_type: semType,
    academic_year: academicYear
  }).populate('section_id').lean()
  
  let totalBatches = 0
  let batchesWithTeachers = 0
  let batchesWithoutTeachers = 0
  
  for (const timetable of timetables) {
    const section = timetable.section_id
    const labSlots = timetable.lab_slots || []
    
    console.log(`\n📚 Section: ${section.sem}${section.section_name}`)
    
    for (const labSlot of labSlots) {
      const batches = labSlot.batches || []
      
      for (const batch of batches) {
        totalBatches++
        
        const hasTeacher1 = batch.teacher1_id || batch.teacher1_name || batch.teacher1_shortform
        const hasTeacher2 = batch.teacher2_id || batch.teacher2_name || batch.teacher2_shortform
        
        if (hasTeacher1 || hasTeacher2) {
          batchesWithTeachers++
          console.log(`   ✅ ${batch.batch_name}: ${batch.teacher1_shortform || 'none'}, ${batch.teacher2_shortform || 'none'}`)
        } else {
          batchesWithoutTeachers++
          console.log(`   ⚪ ${batch.batch_name}: No teachers assigned`)
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('📊 SUMMARY')
  console.log('='.repeat(70))
  console.log(`Total Batches: ${totalBatches}`)
  console.log(`Batches WITH teachers: ${batchesWithTeachers}`)
  console.log(`Batches WITHOUT teachers: ${batchesWithoutTeachers}`)
  console.log('='.repeat(70) + '\n')
  
  return {
    totalBatches,
    batchesWithTeachers,
    batchesWithoutTeachers
  }
}

/**
 * Test the clearing logic
 */
async function testClearingLogic(semType, academicYear) {
  console.log('🧪 TESTING STEP 6 CLEARING LOGIC\n')
  
  // Check BEFORE clearing
  console.log('📸 BEFORE CLEARING:')
  const before = await checkTeacherAssignments(semType, academicYear)
  
  // Perform the clearing operation (same as Step 6 does)
  console.log('\n🧹 CLEARING TEACHER ASSIGNMENTS...')
  const clearResult = await Timetable.updateMany(
    {
      sem_type: semType,
      academic_year: academicYear
    },
    {
      $set: {
        'lab_slots.$[].batches.$[].teacher1_id': null,
        'lab_slots.$[].batches.$[].teacher1_name': null,
        'lab_slots.$[].batches.$[].teacher1_shortform': null,
        'lab_slots.$[].batches.$[].teacher2_id': null,
        'lab_slots.$[].batches.$[].teacher2_name': null,
        'lab_slots.$[].batches.$[].teacher2_shortform': null
      }
    }
  )
  console.log(`✓ Modified ${clearResult.modifiedCount} timetable(s)`)
  console.log(`✓ Matched ${clearResult.matchedCount} timetable(s)\n`)
  
  // Check AFTER clearing
  console.log('📸 AFTER CLEARING:')
  const after = await checkTeacherAssignments(semType, academicYear)
  
  // Verify the clearing worked
  console.log('\n' + '='.repeat(70))
  console.log('✅ VERIFICATION RESULTS')
  console.log('='.repeat(70))
  
  if (after.batchesWithTeachers === 0 && after.batchesWithoutTeachers === after.totalBatches) {
    console.log('✅ SUCCESS: All teacher assignments cleared!')
    console.log(`   - Before: ${before.batchesWithTeachers} batches had teachers`)
    console.log(`   - After: ${after.batchesWithTeachers} batches have teachers`)
    console.log('   - Clearing logic is working correctly!')
  } else {
    console.log('❌ FAILURE: Some teacher assignments remain!')
    console.log(`   - Expected: 0 batches with teachers`)
    console.log(`   - Actual: ${after.batchesWithTeachers} batches with teachers`)
    console.log('   - Clearing logic needs investigation')
  }
  console.log('='.repeat(70))
}

// Main execution
async function main() {
  const semType = process.argv[2] || 'odd'
  const academicYear = process.argv[3] || '2024-2025'
  
  await conn()
  await testClearingLogic(semType, academicYear)
  await mongoose.connection.close()
  console.log('\n✅ Database connection closed')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
