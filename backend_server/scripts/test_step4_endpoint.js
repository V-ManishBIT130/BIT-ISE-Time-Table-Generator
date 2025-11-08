/**
 * Test Script: Verify Step 4 endpoint with NEW code
 * This will call the Step 4 API and check if summary is generated
 */

import axios from 'axios'

const BACKEND_URL = 'http://localhost:5000' // Adjust if different

async function testStep4() {
  try {
    console.log('\n🧪 ===== TESTING STEP 4 ENDPOINT =====\n')
    console.log('📡 Calling POST /api/timetables/step4...\n')
    
    const response = await axios.post(`${BACKEND_URL}/api/timetables/step4`, {
      sem_type: 'odd',
      academic_year: '2024-2025'
    })
    
    console.log('✅ Step 4 API Response:')
    console.log(`   • Success: ${response.data.success}`)
    console.log(`   • Message: ${response.data.message}`)
    console.log(`   • Sections Processed: ${response.data.data?.sections_processed}`)
    console.log(`   • Theory Slots Scheduled: ${response.data.data?.theory_slots_scheduled}`)
    
    console.log('\n📊 Now checking database for theory_scheduling_summary...\n')
    
    // Wait a bit for database to update
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Import models
    const { default: mongoose } = await import('mongoose')
    const { default: Timetable } = await import('../models/timetable_model.js')
    const { default: dotenv } = await import('dotenv')
    
    dotenv.config()
    await mongoose.connect(process.env.MONGODB_URI)
    
    // Check one timetable
    const timetable = await Timetable.findOne({
      section_name: '3A',
      sem_type: 'odd',
      academic_year: '2024-2025'
    }).lean()
    
    if (!timetable) {
      console.log('❌ Section 3A not found in database!')
    } else {
      console.log('📋 Section 3A Status:')
      
      if (timetable.generation_metadata?.theory_scheduling_summary) {
        console.log('✅ SUCCESS! theory_scheduling_summary EXISTS!')
        const summary = timetable.generation_metadata.theory_scheduling_summary
        console.log(`\n   Summary Data:`)
        console.log(`   • Total Subjects Found: ${summary.total_subjects_found}`)
        console.log(`   • Regular ISE: ${summary.regular_ise_scheduled}/${summary.regular_ise_found}`)
        console.log(`   • Other Dept: ${summary.other_dept_scheduled}/${summary.other_dept_found}`)
        console.log(`   • Projects: ${summary.projects_scheduled}/${summary.projects_found}`)
        console.log(`   • Success Rate: ${summary.success_rate}%`)
        console.log('\n🎉 NEW CODE IS WORKING! Frontend will now show the summary!')
      } else {
        console.log('❌ FAIL: theory_scheduling_summary is STILL missing!')
        console.log('   This means either:')
        console.log('   1. Backend server is still running OLD code')
        console.log('   2. The code change didn\'t include the summary save')
        console.log('\n   Please RESTART the backend server!')
      }
    }
    
    await mongoose.connection.close()
    
    console.log('\n🧪 ===== TEST COMPLETE =====\n')
    
  } catch (error) {
    console.error('\n❌ Error testing Step 4:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Backend server is not running!')
      console.log('   Start it with: npm start')
    }
    process.exit(1)
  }
}

testStep4()
