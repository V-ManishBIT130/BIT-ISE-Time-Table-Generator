/**
 * Check Current Summary Data
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import '../models/ise_sections_model.js'
import dotenv from 'dotenv'

dotenv.config()

async function checkCurrentData() {
  try {
    console.log('\n🔍 ===== CHECKING CURRENT SUMMARY DATA =====\n')
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    const timetables = await Timetable.find({
      sem_type: 'odd',
      academic_year: '2024-2025'
    }).lean()
    
    console.log(`📊 Found ${timetables.length} timetables:\n`)
    
    for (const tt of timetables) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📋 ${tt.section_name} (Sem ${tt.sem})`)
      
      const summary = tt.generation_metadata?.theory_scheduling_summary
      
      if (summary) {
        console.log(`   ✅ HAS SUMMARY:`)
        console.log(`      • Total Subjects: ${summary.total_subjects_found}`)
        console.log(`      • Regular ISE: ${summary.regular_ise_scheduled}/${summary.regular_ise_found}`)
        console.log(`      • Other Dept: ${summary.other_dept_scheduled}/${summary.other_dept_found}`)
        console.log(`      • Projects: ${summary.projects_scheduled}/${summary.projects_found}`)
        console.log(`      • Success Rate: ${summary.success_rate}%`)
        
        if (summary.total_subjects_found === 999) {
          console.log(`      ⚠️  THIS IS TEST DATA!`)
        } else {
          console.log(`      ✅ This looks like REAL data!`)
        }
      } else {
        console.log(`   ❌ NO SUMMARY`)
      }
    }
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log('\n🔍 ===== CHECK COMPLETE =====\n')
    
    await mongoose.connection.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkCurrentData()
