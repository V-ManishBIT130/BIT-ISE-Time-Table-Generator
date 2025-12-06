// Fix theory_scheduling_summary metadata for existing timetables
// Updates total_scheduled to include fixed slots + newly scheduled
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Timetable from '../models/timetable_model.js'

dotenv.config()

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n')
    
    const timetables = await Timetable.find({})
      .select('section_name sem generation_metadata theory_slots')
      .sort({ sem: 1, section_name: 1 })
    
    console.log('🔧 FIXING METADATA FOR ALL TIMETABLES')
    console.log('═════════════════════════════════════════════\n')
    
    for (const tt of timetables) {
      const summary = tt.generation_metadata?.theory_scheduling_summary
      
      if (!summary) {
        console.log(`⚠️  Section ${tt.section_name}: No metadata to fix\n`)
        continue
      }
      
      // Calculate corrected values
      const fixedSlots = summary.subjects_in_fixed_slots || 0
      const step4Scheduled = summary.total_scheduled // Current value (only Step 4)
      const correctedTotal = fixedSlots + step4Scheduled // Should be fixed + step4
      const correctedSuccessRate = summary.total_subjects_found > 0
        ? ((correctedTotal / summary.total_subjects_found) * 100).toFixed(1)
        : 100
      
      console.log(`Section ${tt.section_name} (Sem ${tt.sem}):`)
      console.log(`   Before: ${summary.total_scheduled}/${summary.total_subjects_found} (${summary.success_rate}%)`)
      console.log(`   After:  ${correctedTotal}/${summary.total_subjects_found} (${correctedSuccessRate}%)`)
      
      // Update the metadata
      await Timetable.updateOne(
        { _id: tt._id },
        {
          $set: {
            'generation_metadata.theory_scheduling_summary.total_scheduled': correctedTotal,
            'generation_metadata.theory_scheduling_summary.success_rate': parseFloat(correctedSuccessRate)
          }
        }
      )
      
      console.log(`   ✅ Updated!\n`)
    }
    
    await mongoose.disconnect()
    console.log('✅ All metadata fixed!')
    process.exit(0)
  })
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
