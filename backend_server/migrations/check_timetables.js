/**
 * Check existing timetables in the database
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function checkTimetables() {
  try {
    console.log('🔍 Checking timetables...\n')
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    const timetables = await mongoose.connection.db.collection('timetables')
      .find({})
      .project({ sem_type: 1, academic_year: 1, sem: 1, section_name: 1, 'days.0.slots.0.assigned_teacher': 1 })
      .limit(3)
      .toArray()

    console.log('📊 Found', timetables.length, 'timetables\n')
    
    if (timetables.length > 0) {
      console.log('Sample timetables:')
      timetables.forEach((tt, i) => {
        console.log(`\n${i + 1}. Section: ${tt.section_name || 'N/A'}, Sem ${tt.sem}, ${tt.sem_type}, Year: ${tt.academic_year}`)
        console.log(`   ID: ${tt._id}`)
      })
      
      // Check which algorithm was used (look for workload report or just check one timetable)
      const fullTimetable = await mongoose.connection.db.collection('timetables')
        .findOne({ academic_year: '2025-2026' })
      
      if (fullTimetable) {
        console.log('\n📅 Found 2025-2026 timetable')
        console.log('   Section:', fullTimetable.section_name)
        console.log('   Semester:', fullTimetable.sem, '(' + fullTimetable.sem_type + ')')
        
        // Count lab sessions for a specific teacher
        let labCount = 0
        fullTimetable.days?.forEach(day => {
          day.slots?.forEach(slot => {
            if (slot.slot_type === 'Lab' && slot.assigned_teacher?.teacher_id === 'T001') {
              labCount++
            }
          })
        })
        console.log(`   Dr. Asha T (T001) lab sessions: ${labCount}`)
      } else {
        console.log('\n⚠️  No 2025-2026 timetables found')
      }
    } else {
      console.log('⚠️  No timetables found in database')
    }

    await mongoose.disconnect()
    process.exit(0)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkTimetables()
