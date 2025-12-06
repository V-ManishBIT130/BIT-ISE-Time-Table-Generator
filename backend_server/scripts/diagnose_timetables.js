/**
 * Diagnostic Script: Check Timetables by Academic Year
 * 
 * This script shows all timetables grouped by academic year
 * to help identify duplicate or incorrectly stored timetables.
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import ISESections from '../models/ise_sections_model.js' // Import to register schema
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://your-connection-string'

async function diagnoseTimetables() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected!\n')
    
    // Get all timetables (without populate to avoid schema issues)
    const allTimetables = await Timetable.find({})
      .sort({ academic_year: 1, sem_type: 1, sem: 1, section_name: 1 })
    
    console.log(`📊 Total timetables in database: ${allTimetables.length}\n`)
    
    // Group by academic year
    const byYear = {}
    
    for (const tt of allTimetables) {
      const year = tt.academic_year || 'NO_YEAR'
      
      if (!byYear[year]) {
        byYear[year] = {
          odd: [],
          even: []
        }
      }
      
      const semType = tt.sem_type || 'unknown'
      
      if (semType === 'odd') {
        byYear[year].odd.push(tt)
      } else if (semType === 'even') {
        byYear[year].even.push(tt)
      }
    }
    
    // Display grouped results
    console.log('=' .repeat(80))
    console.log('TIMETABLES BY ACADEMIC YEAR')
    console.log('='.repeat(80))
    
    for (const [year, data] of Object.entries(byYear).sort()) {
      console.log(`\n📅 Academic Year: ${year}`)
      console.log('─'.repeat(80))
      
      if (data.odd.length > 0) {
        console.log(`\n  🔵 ODD Semester (${data.odd.length} timetables):`)
        for (const tt of data.odd) {
          console.log(`     • ${tt.section_name || 'Unknown'} (Sem ${tt.sem})`)
          console.log(`       ID: ${tt._id}`)
          console.log(`       Generated: ${tt.generation_date ? tt.generation_date.toISOString() : 'Unknown'}`)
          console.log(`       Current Step: ${tt.generation_metadata?.current_step || 'Unknown'}`)
          console.log(`       Theory Slots: ${tt.theory_slots?.length || 0}`)
          console.log(`       Lab Slots: ${tt.lab_slots?.length || 0}`)
          console.log('')
        }
      }
      
      if (data.even.length > 0) {
        console.log(`\n  🟢 EVEN Semester (${data.even.length} timetables):`)
        for (const tt of data.even) {
          console.log(`     • ${tt.section_name || 'Unknown'} (Sem ${tt.sem})`)
          console.log(`       ID: ${tt._id}`)
          console.log(`       Generated: ${tt.generation_date ? tt.generation_date.toISOString() : 'Unknown'}`)
          console.log(`       Current Step: ${tt.generation_metadata?.current_step || 'Unknown'}`)
          console.log(`       Theory Slots: ${tt.theory_slots?.length || 0}`)
          console.log(`       Lab Slots: ${tt.lab_slots?.length || 0}`)
          console.log('')
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('SUMMARY')
    console.log('='.repeat(80))
    
    for (const [year, data] of Object.entries(byYear).sort()) {
      console.log(`${year}: ${data.odd.length} odd + ${data.even.length} even = ${data.odd.length + data.even.length} total`)
    }
    
    // Check for potential issues
    console.log('\n' + '='.repeat(80))
    console.log('POTENTIAL ISSUES')
    console.log('='.repeat(80))
    
    for (const [year, data] of Object.entries(byYear).sort()) {
      const oddSections = {}
      const evenSections = {}
      
      // Check for duplicate sections in odd
      for (const tt of data.odd) {
        const key = `${tt.section_name}_${tt.sem}`
        if (oddSections[key]) {
          oddSections[key]++
        } else {
          oddSections[key] = 1
        }
      }
      
      // Check for duplicate sections in even
      for (const tt of data.even) {
        const key = `${tt.section_name}_${tt.sem}`
        if (evenSections[key]) {
          evenSections[key]++
        } else {
          evenSections[key] = 1
        }
      }
      
      // Report duplicates
      let hasDuplicates = false
      
      for (const [section, count] of Object.entries(oddSections)) {
        if (count > 1) {
          console.log(`⚠️  ${year} ODD: Section ${section} has ${count} timetables (duplicate!)`)
          hasDuplicates = true
        }
      }
      
      for (const [section, count] of Object.entries(evenSections)) {
        if (count > 1) {
          console.log(`⚠️  ${year} EVEN: Section ${section} has ${count} timetables (duplicate!)`)
          hasDuplicates = true
        }
      }
      
      if (!hasDuplicates) {
        console.log(`✅ ${year}: No duplicates found`)
      }
    }
    
    console.log('\n')
    await mongoose.connection.close()
    console.log('🔌 Disconnected from MongoDB')
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error)
    process.exit(1)
  }
}

diagnoseTimetables()
