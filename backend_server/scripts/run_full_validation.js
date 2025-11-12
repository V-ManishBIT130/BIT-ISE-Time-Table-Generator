/**
 * Full Validation Script
 * Runs Step 7 validation to verify:
 * - No teacher conflicts (30-minute granularity)
 * - No classroom conflicts (30-minute granularity)
 * - No lab room conflicts (30-minute granularity)
 * - No consecutive labs
 * - All constraints satisfied
 */

import mongoose from 'mongoose'
import { validateAndFinalize } from '../algorithms/step7_validate.js'

const MONGODB_URI = 'mongodb://localhost:27017/timetable_db'

async function runFullValidation() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Database connected\n')
    
    console.log('=' .repeat(80))
    console.log('🔍 FULL VALIDATION CHECK - 30-MINUTE GRANULARITY')
    console.log('=' .repeat(80))
    
    const result = await validateAndFinalize('odd', '2024-25')
    
    console.log('\n' + '='.repeat(80))
    console.log('📊 VALIDATION SUMMARY')
    console.log('='.repeat(80))
    
    if (result.data.validation_status === 'passed') {
      console.log('\n🎉 ALL CHECKS PASSED! NO CONFLICTS DETECTED!')
      console.log('\n✅ Verification Complete:')
      console.log('   • Teacher conflicts: 0 (30-minute segment checking)')
      console.log('   • Classroom conflicts: 0 (30-minute segment checking)')
      console.log('   • Lab room conflicts: 0 (30-minute segment checking)')
      console.log('   • Consecutive labs: 0')
      console.log('\n💡 The 30-minute granularity system is working perfectly!')
      console.log('   Every slot is tracked in 30-minute segments to prevent ANY overlap.')
    } else {
      console.log('\n⚠️  VALIDATION WARNINGS:')
      console.log(`   • Teacher conflicts: ${result.data.issues.teacher_conflicts}`)
      console.log(`   • Classroom conflicts: ${result.data.issues.classroom_conflicts}`)
      console.log(`   • Lab room conflicts: ${result.data.issues.lab_room_conflicts}`)
      console.log(`   • Consecutive labs: ${result.data.issues.consecutive_labs}`)
    }
    
    console.log('\n' + '='.repeat(80))
    
    await mongoose.disconnect()
    console.log('\n✅ Database disconnected')
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Validation Error:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

runFullValidation()
