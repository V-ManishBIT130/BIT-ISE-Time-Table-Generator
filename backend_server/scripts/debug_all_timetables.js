/**
 * Debug Script: Check ALL timetables in database (any semester, any year)
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import '../models/ise_sections_model.js' // Import to register schema
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

async function debugAllTimetables() {
  try {
    console.log('\n🔍 ===== CHECKING ALL TIMETABLES IN DATABASE =====\n')
    
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Get ALL timetables (no filters)
    const allTimetables = await Timetable.find({}).populate('section_id').lean()
    
    console.log(`📊 Total Timetables in Database: ${allTimetables.length}\n`)
    
    if (allTimetables.length === 0) {
      console.log('❌ Database is EMPTY! No timetables found.')
      console.log('   You need to run Step 1 to create timetables first.')
      await mongoose.connection.close()
      process.exit(0)
    }
    
    // Group by academic_year and sem_type
    const grouped = {}
    for (const tt of allTimetables) {
      const key = `${tt.academic_year}_${tt.sem_type}`
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(tt)
    }
    
    console.log('📋 Timetables by Academic Year and Semester:\n')
    for (const [key, timetables] of Object.entries(grouped)) {
      const [year, semType] = key.split('_')
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📅 ${year} - ${semType} semester`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`   Sections: ${timetables.length}`)
      
      for (const tt of timetables) {
        console.log(`\n   📋 ${tt.section_name} (Sem ${tt.sem}):`)
        console.log(`      • Current Step: ${tt.generation_metadata?.current_step || 'N/A'}`)
        console.log(`      • Steps Completed: [${tt.generation_metadata?.steps_completed?.join(', ') || 'None'}]`)
        console.log(`      • Lab Slots: ${tt.lab_slots?.length || 0}`)
        console.log(`      • Theory Slots: ${tt.theory_slots?.length || 0}`)
        
        // Check for theory_scheduling_summary
        if (tt.generation_metadata?.theory_scheduling_summary) {
          console.log(`      • ✅ HAS theory_scheduling_summary`)
          const summary = tt.generation_metadata.theory_scheduling_summary
          console.log(`         - Total subjects: ${summary.total_subjects_found}`)
          console.log(`         - Success rate: ${summary.success_rate}%`)
        } else {
          console.log(`      • ❌ NO theory_scheduling_summary (needs Step 4 re-run)`)
        }
      }
    }
    
    console.log('\n\n🔍 ===== DEBUG COMPLETE =====\n')
    await mongoose.connection.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

debugAllTimetables()
