/**
 * Quick test: Show different assignments on each run
 */

import axios from 'axios'

const API_BASE = 'http://localhost:5000/api'

async function quickTest() {
  try {
    console.log('🎲 Testing Randomization - Running Step 6 twice\n')
    
    // Run 1
    console.log('═══ RUN 1 ═══')
    const run1 = await axios.post(`${API_BASE}/timetables/step6`, {
      sem_type: 'odd',
      academic_year: '2025-2026'
    })
    
    if (run1.data.success) {
      console.log(`✅ Success Rate: ${run1.data.data.success_rate}%`)
      console.log(`   With 2 Teachers: ${run1.data.data.batches_with_two_teachers}`)
      console.log(`   With 1 Teacher: ${run1.data.data.batches_with_one_teacher}`)
    }
    
    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Run 2
    console.log('\n═══ RUN 2 ═══')
    const run2 = await axios.post(`${API_BASE}/timetables/step6`, {
      sem_type: 'odd',
      academic_year: '2025-2026'
    })
    
    if (run2.data.success) {
      console.log(`✅ Success Rate: ${run2.data.data.success_rate}%`)
      console.log(`   With 2 Teachers: ${run2.data.data.batches_with_two_teachers}`)
      console.log(`   With 1 Teacher: ${run2.data.data.batches_with_one_teacher}`)
    }
    
    console.log('\n📊 Comparison:')
    console.log(`   Success rates may vary slightly due to different teacher pairings`)
    console.log(`   Different runs will assign different teacher combinations`)
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

quickTest()
