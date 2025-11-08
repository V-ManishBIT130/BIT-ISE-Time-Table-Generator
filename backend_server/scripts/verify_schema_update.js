/**
 * Verification Script: Check if theory_scheduling_summary field is in schema
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import dotenv from 'dotenv'

dotenv.config()

async function verifySchemaUpdate() {
  try {
    console.log('\n🔍 ===== VERIFYING SCHEMA UPDATE =====\n')
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Get schema paths
    const schema = Timetable.schema
    const paths = schema.paths
    
    console.log('📋 Checking generation_metadata schema...\n')
    
    // Check if theory_scheduling_summary is in schema
    const hasTheorySummary = 'generation_metadata.theory_scheduling_summary' in paths
    
    if (hasTheorySummary) {
      console.log('✅ SUCCESS: theory_scheduling_summary IS defined in schema!')
      console.log('   Field path: generation_metadata.theory_scheduling_summary')
    } else {
      console.log('❌ PROBLEM: theory_scheduling_summary NOT in schema paths!')
      console.log('   Available generation_metadata fields:')
      Object.keys(paths).forEach(path => {
        if (path.startsWith('generation_metadata')) {
          console.log(`   • ${path}`)
        }
      })
    }
    
    console.log('\n🧪 Testing if we can save theory_scheduling_summary...\n')
    
    // Find a timetable
    const testTimetable = await Timetable.findOne({
      section_name: '3A',
      sem_type: 'odd',
      academic_year: '2024-2025'
    })
    
    if (!testTimetable) {
      console.log('⚠️  No 3A timetable found to test with')
      await mongoose.connection.close()
      return
    }
    
    console.log(`📋 Found timetable: ${testTimetable.section_name}`)
    
    // Try to save a test summary
    testTimetable.generation_metadata.theory_scheduling_summary = {
      total_subjects_found: 999,
      regular_ise_found: 111,
      other_dept_found: 222,
      projects_found: 333,
      regular_ise_scheduled: 111,
      regular_ise_failed: 0,
      other_dept_scheduled: 222,
      other_dept_failed: 0,
      projects_scheduled: 333,
      projects_failed: 0,
      total_scheduled: 666,
      success_rate: '100.0'
    }
    
    console.log('💾 Attempting to save test data...')
    await testTimetable.save()
    console.log('✅ Save successful!')
    
    // Re-read to verify
    const verifyRead = await Timetable.findById(testTimetable._id).lean()
    
    if (verifyRead.generation_metadata?.theory_scheduling_summary) {
      console.log('✅✅ VERIFICATION SUCCESS!')
      console.log('   theory_scheduling_summary was saved and can be read back!')
      console.log(`   Test value: total_subjects_found = ${verifyRead.generation_metadata.theory_scheduling_summary.total_subjects_found}`)
    } else {
      console.log('❌❌ VERIFICATION FAILED!')
      console.log('   theory_scheduling_summary was NOT saved to database')
      console.log('   Schema may need to be reloaded (restart backend server)')
    }
    
    console.log('\n🔍 ===== VERIFICATION COMPLETE =====\n')
    
    await mongoose.connection.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

verifySchemaUpdate()
