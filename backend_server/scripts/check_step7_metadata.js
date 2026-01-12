/**
 * Check Step 7 metadata in database
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import dotenv from 'dotenv'

dotenv.config()

async function checkStep7Metadata() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('🔗 Connected to MongoDB\n')
    
    const timetables = await Timetable.find({
      sem_type: 'odd',
      academic_year: '2025-2026'
    }).select('section_name generation_metadata').lean()
    
    console.log('📊 Checking Step 7 metadata for all timetables:\n')
    
    timetables.forEach(tt => {
      console.log(`\n${tt.section_name}:`)
      console.log('  current_step:', tt.generation_metadata?.current_step)
      console.log('  validation_status:', tt.generation_metadata?.validation_status)
      console.log('  step7_summary:', tt.generation_metadata?.step7_summary ? 'EXISTS' : 'MISSING')
      
      if (tt.generation_metadata?.step7_summary) {
        console.log('  Summary:', JSON.stringify(tt.generation_metadata.step7_summary, null, 2))
      }
    })
    
    await mongoose.disconnect()
    console.log('\n✅ Check complete')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkStep7Metadata()
