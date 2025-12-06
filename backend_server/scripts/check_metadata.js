// Check current theory_scheduling_summary metadata values
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Timetable from '../models/timetable_model.js'

dotenv.config()

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n')
    
    const timetables = await Timetable.find({})
      .select('section_name sem generation_metadata.theory_scheduling_summary')
      .sort({ sem: 1, section_name: 1 })
    
    console.log('📊 CURRENT METADATA IN DATABASE:')
    console.log('═════════════════════════════════════════════\n')
    
    timetables.forEach(tt => {
      const summary = tt.generation_metadata?.theory_scheduling_summary
      if (summary) {
        console.log(`Section ${tt.section_name} (Sem ${tt.sem}):`)
        console.log(`   Total subjects: ${summary.total_subjects_found}`)
        console.log(`   Fixed slots: ${summary.subjects_in_fixed_slots}`)
        console.log(`   To schedule (step4): ${summary.subjects_to_schedule_step4}`)
        console.log(`   Total scheduled: ${summary.total_scheduled}`)
        console.log(`   Success rate: ${summary.success_rate}%`)
        console.log(`   Display: ${summary.total_scheduled}/${summary.total_subjects_found}\n`)
      } else {
        console.log(`Section ${tt.section_name}: NO METADATA\n`)
      }
    })
    
    await mongoose.disconnect()
    console.log('Done!')
    process.exit(0)
  })
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
