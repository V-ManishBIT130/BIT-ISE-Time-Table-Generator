/**
 * Cleanup Script: Remove duplicate/old timetables
 * 
 * This script identifies and removes old timetable generations,
 * keeping only the most recent timetables for each section.
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://your-connection-string'

async function cleanupOldTimetables() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected!\n')
    
    // Get all timetables
    const allTimetables = await Timetable.find({})
      .populate('section_id', 'section_name sem sem_type')
      .sort({ generation_date: -1 }) // Most recent first
    
    console.log(`📊 Found ${allTimetables.length} total timetables\n`)
    
    // Group by section_id + sem_type + academic_year
    const grouped = {}
    
    for (const tt of allTimetables) {
      const key = `${tt.section_id?._id}_${tt.sem_type}_${tt.academic_year}`
      
      if (!grouped[key]) {
        grouped[key] = []
      }
      
      grouped[key].push(tt)
    }
    
    console.log(`📋 Found ${Object.keys(grouped).length} unique section groups\n`)
    
    // For each group, keep the most recent, delete the rest
    let totalDeleted = 0
    
    for (const [key, timetables] of Object.entries(grouped)) {
      if (timetables.length > 1) {
        const newest = timetables[0] // Already sorted by generation_date desc
        const toDelete = timetables.slice(1)
        
        console.log(`🗑️  Section ${newest.section_name || 'Unknown'} (${newest.sem_type}) has ${timetables.length} versions:`)
        console.log(`   ✅ Keeping: ${newest._id} (${newest.generation_date})`)
        
        for (const old of toDelete) {
          console.log(`   ❌ Deleting: ${old._id} (${old.generation_date})`)
          await Timetable.deleteOne({ _id: old._id })
          totalDeleted++
        }
        
        console.log('')
      }
    }
    
    console.log(`\n🎉 Cleanup complete!`)
    console.log(`   Deleted: ${totalDeleted} old timetables`)
    console.log(`   Remaining: ${allTimetables.length - totalDeleted} timetables\n`)
    
    await mongoose.connection.close()
    console.log('🔌 Disconnected from MongoDB')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

cleanupOldTimetables()
