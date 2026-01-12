/**
 * Quick check: List all timetables in database
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import dotenv from 'dotenv'

dotenv.config()

async function listTimetables() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('🔗 Connected to MongoDB\n')
    
    const timetables = await Timetable.find({})
      .select('section_name sem_type academic_year generation_metadata.current_step')
      .lean()
    
    console.log(`📋 Found ${timetables.length} timetables in database:\n`)
    
    // Group by academic year and sem type
    const grouped = {}
    
    timetables.forEach(tt => {
      const key = `${tt.academic_year} ${tt.sem_type}`
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(tt)
    })
    
    for (const [key, tts] of Object.entries(grouped)) {
      console.log(`\n📂 ${key}:`)
      console.log(`   Sections: ${tts.map(t => t.section_name).join(', ')}`)
      console.log(`   Current Step: ${tts[0]?.generation_metadata?.current_step || 'N/A'}`)
    }
    
    await mongoose.disconnect()
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

listTimetables()
