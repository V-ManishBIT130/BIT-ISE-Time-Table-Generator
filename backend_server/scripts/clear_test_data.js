/**
 * Clear Test Data Script: Remove the 999 test values
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import dotenv from 'dotenv'

dotenv.config()

async function clearTestData() {
  try {
    console.log('\n🧹 ===== CLEARING TEST DATA =====\n')
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Find timetable with test data (total_subjects_found: 999)
    const result = await Timetable.updateMany(
      { 'generation_metadata.theory_scheduling_summary.total_subjects_found': 999 },
      { 
        $unset: { 'generation_metadata.theory_scheduling_summary': '' }
      }
    )
    
    console.log(`✅ Cleared test data from ${result.modifiedCount} timetable(s)`)
    console.log(`   (Records with total_subjects_found: 999)\n`)
    
    console.log('🎯 Next Steps:')
    console.log('   1. Go to Timetable Generator')
    console.log('   2. Click "Run Step 4" button')
    console.log('   3. This will populate REAL data')
    console.log('   4. Refresh Timetable Viewer to see actual counts\n')
    
    console.log('🧹 ===== CLEANUP COMPLETE =====\n')
    
    await mongoose.connection.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

clearTestData()
