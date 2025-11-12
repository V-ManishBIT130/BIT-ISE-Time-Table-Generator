/**
 * RE-RUN STEPS 4 & 5: Complete Re-generation
 * 
 * Purpose: Re-run theory scheduling (Step 4) with FIXED overlap detection,
 *          then re-assign classrooms (Step 5) with FIXED duration checking.
 * 
 * This will:
 * 1. Clear theory slots (keeping fixed slots from Step 2)
 * 2. Re-run Step 4 with improved conflict detection
 * 3. Re-run Step 5 with both-halves checking
 * 4. Verify no conflicts remain
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { scheduleTheory } from '../algorithms/step4_schedule_theory_breaks.js'
import { assignClassrooms } from '../algorithms/step5_assign_classrooms.js'
import Section from '../models/ise_sections_model.js'
import Teacher from '../models/teachers_models.js'
import Subject from '../models/subjects_model.js'

// Load environment variables
dotenv.config()

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Database connected successfully\n')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

async function rerunSteps4And5() {
  await connectDB()
  
  console.log('\n' + '='.repeat(70))
  console.log('🔄 RE-RUNNING STEPS 4 & 5')
  console.log('='.repeat(70))
  console.log('Step 4: Schedule theory with FIXED overlap detection')
  console.log('Step 5: Assign classrooms with FIXED both-halves checking')
  console.log('='.repeat(70) + '\n')
  
  try {
    // Get semester info
    const semType = process.argv[2] || 'odd'
    const academicYear = process.argv[3] || '2024-2025'
    
    console.log(`📊 Configuration:`)
    console.log(`   Semester: ${semType}`)
    console.log(`   Academic Year: ${academicYear}\n`)
    
    // Run Step 4
    console.log('▶️  Running Step 4: Schedule Theory...\n')
    const step4Result = await scheduleTheory(semType, academicYear)
    
    if (step4Result.success) {
      console.log('\n✅ Step 4 completed successfully!')
      console.log(`   Theory slots scheduled: ${step4Result.data.theory_slots_scheduled}`)
    } else {
      console.log('\n❌ Step 4 failed!')
      return
    }
    
    // Run Step 5
    console.log('\n\n▶️  Running Step 5: Assign Classrooms...\n')
    const step5Result = await assignClassrooms(semType, academicYear)
    
    if (step5Result.success) {
      console.log('\n✅ Step 5 completed successfully!')
      console.log(`   Classrooms assigned: ${step5Result.data.total_assigned}`)
      console.log(`   Success rate: ${step5Result.data.success_rate}%`)
    } else {
      console.log('\n❌ Step 5 failed!')
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('✅ BOTH STEPS COMPLETE!')
    console.log('='.repeat(70))
    console.log('\n📝 Next: Run verification script to confirm no conflicts:')
    console.log('   node scripts/verify_classroom_conflicts.js\n')
    
  } catch (error) {
    console.error('❌ Error during re-run:', error)
  } finally {
    await mongoose.connection.close()
    console.log('✅ Database connection closed\n')
  }
}

// Run the script
rerunSteps4And5()
