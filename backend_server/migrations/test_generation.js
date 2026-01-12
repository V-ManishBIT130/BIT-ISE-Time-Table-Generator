/**
 * Test Script: Generate Timetable with Hierarchical Algorithm
 * 
 * This will:
 * 1. Delete any old timetables
 * 2. Generate fresh timetable for Odd semester (3, 5, 7)
 * 3. Show workload report
 * 4. Verify Professor limits are respected
 */

import axios from 'axios'

const API_BASE = 'http://localhost:5000/api'

async function testGeneration() {
  try {
    console.log('🧪 Testing Hierarchical Teacher Assignment\n')
    console.log('=' .repeat(60) + '\n')

    // Step 1: Clean up old timetables (optional)
    console.log('🗑️  Step 1: Cleaning up old timetables...')
    try {
      const deleteRes = await axios.delete(`${API_BASE}/timetables`, {
        params: { academic_year: '2025-2026' }
      })
      console.log(`   ✅ Deleted ${deleteRes.data.deletedCount || 0} old timetables\n`)
    } catch (err) {
      console.log(`   ℹ️  No old timetables to delete\n`)
    }

    // Step 2: Generate new timetables
    console.log('⚡ Step 2: Generating timetables (Odd semester)...')
    console.log('   Using: Hierarchical Teacher Assignment Algorithm')
    console.log('   Semester Type: Odd (3rd, 5th, 7th)')
    console.log('   Academic Year: 2025-2026\n')

    const startTime = Date.now()
    
    const generateRes = await axios.post(`${API_BASE}/timetables/generate`, {
      sem_type: 'odd',
      academic_year: '2025-2026'
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.log('=' .repeat(60))
    console.log('✅ GENERATION COMPLETED!')
    console.log('=' .repeat(60) + '\n')

    console.log(`⏱️  Duration: ${duration}s`)
    console.log(`📊 Sections Generated: ${generateRes.data.timetables?.length || 0}\n`)

    // Step 3: Extract and display workload report
    if (generateRes.data.workloadReport && generateRes.data.workloadReport.length > 0) {
      console.log('=' .repeat(60))
      console.log('📈 WORKLOAD REPORT')
      console.log('=' .repeat(60) + '\n')

      const report = generateRes.data.workloadReport
      
      // Group by position
      const professors = report.filter(t => t.position === 'Professor')
      const associates = report.filter(t => t.position === 'Associate Professor')
      const assistants = report.filter(t => t.position === 'Assistant Professor')

      // Display Professors
      if (professors.length > 0) {
        console.log('👔 PROFESSORS (Max: 2 labs)')
        console.log('-'.repeat(60))
        professors.forEach(t => {
          const status = t.status === 'OK' ? '✅' : '⚠️'
          const overflow = t.overflow > 0 ? ` (+${t.overflow} overflow)` : ''
          console.log(`   ${status} ${t.name}: ${t.assigned}/${t.limit} batches${overflow}`)
        })
        console.log()
      }

      // Display Associates
      if (associates.length > 0) {
        console.log('👨‍🏫 ASSOCIATE PROFESSORS (Max: 4 labs)')
        console.log('-'.repeat(60))
        associates.forEach(t => {
          const status = t.status === 'OK' ? '✅' : '⚠️'
          const overflow = t.overflow > 0 ? ` (+${t.overflow} overflow)` : ''
          console.log(`   ${status} ${t.name}: ${t.assigned}/${t.limit} batches${overflow}`)
        })
        console.log()
      }

      // Display Assistants
      if (assistants.length > 0) {
        console.log('👩‍💻 ASSISTANT PROFESSORS (Max: 6 labs, may overflow)')
        console.log('-'.repeat(60))
        assistants.forEach(t => {
          const status = t.status === 'OK' ? '✅' : '⚠️'
          const overflow = t.overflow > 0 ? ` (+${t.overflow} overflow)` : ''
          console.log(`   ${status} ${t.name}: ${t.assigned}/${t.limit} batches${overflow}`)
        })
        console.log()
      }

      // Summary
      const totalTeachers = report.length
      const teachersOK = report.filter(t => t.status === 'OK').length
      const teachersExceeded = totalTeachers - teachersOK

      console.log('=' .repeat(60))
      console.log('📊 SUMMARY')
      console.log('=' .repeat(60))
      console.log(`   Total Teachers: ${totalTeachers}`)
      console.log(`   Within Limits: ${teachersOK} ✅`)
      console.log(`   Exceeded (Assistants): ${teachersExceeded} ⚠️`)
      console.log()

      // Validation
      const professorViolations = professors.filter(t => t.assigned > t.limit)
      const associateViolations = associates.filter(t => t.assigned > t.limit)

      if (professorViolations.length > 0 || associateViolations.length > 0) {
        console.log('❌ CRITICAL: Professor/Associate limit violations detected!')
        console.log('   This should NEVER happen with hierarchical algorithm')
        console.log('   Please check algorithm implementation')
      } else {
        console.log('✅ SUCCESS: All Professor/Associate limits respected!')
        console.log('   Hierarchical algorithm working correctly!')
      }
      console.log()

    } else {
      console.log('⚠️  No workload report in response')
      console.log('   This might indicate old algorithm was used\n')
    }

    // Step 4: Check specific teacher (Dr. Asha T) - Count both T1 and T2 assignments
    console.log('=' .repeat(60))
    console.log('🔍 SPECIFIC CHECK: Dr. Asha T (T001)')
    console.log('=' .repeat(60))

    const timetables = await axios.get(`${API_BASE}/timetables`, {
      params: { academic_year: '2025-2026', sem_type: 'odd' }
    })

    let ashaLabCount = 0
    let ashaAsT1 = 0
    let ashaAsT2 = 0
    
    timetables.data.data.forEach(tt => {
      // Check lab_slots (new format with teacher1/teacher2)
      tt.lab_slots?.forEach(labSlot => {
        labSlot.batches?.forEach(batch => {
          if (batch.teacher1_id === 'T001') {
            ashaAsT1++
            ashaLabCount++
          }
          if (batch.teacher2_id === 'T001') {
            ashaAsT2++
            ashaLabCount++
          }
        })
      })
      
      // Also check old days format (backward compatibility)
      tt.days?.forEach(day => {
        day.slots?.forEach(slot => {
          if (slot.slot_type === 'Lab' && slot.assigned_teacher?.teacher_id === 'T001') {
            ashaLabCount++
          }
        })
      })
    })

    console.log(`   Total lab assignments: ${ashaLabCount}`)
    console.log(`   - As Teacher 1: ${ashaAsT1}`)
    console.log(`   - As Teacher 2: ${ashaAsT2}`)
    console.log(`   Expected: ≤2 (Professor limit)`)
    
    if (ashaLabCount <= 2) {
      console.log('   ✅ PASS: Within limit!\n')
    } else {
      console.log(`   ❌ FAIL: Exceeded by ${ashaLabCount - 2} sessions\n`)
    }

    console.log('=' .repeat(60))
    console.log('🎉 Test Complete!')
    console.log('=' .repeat(60) + '\n')

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message)
    if (error.response) {
      console.error('   Response:', error.response.data)
    }
    process.exit(1)
  }
}

testGeneration()
