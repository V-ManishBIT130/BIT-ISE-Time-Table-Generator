/**
 * Test Step 3 with Diagnostic Logging
 * 
 * Purpose: Run lab scheduling with detailed diagnostics to identify why labs are failing
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadSectionsAndInitialize } from '../algorithms/step1_load_sections.js'
import { blockFixedSlots } from '../algorithms/step2_fixed_slots.js'
import { scheduleLabs } from '../algorithms/step3_schedule_labs_v2.js'
import Timetable from '../models/timetable_model.js'
import ISESections from '../models/ise_sections_model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

async function testStep3Diagnostics() {
  try {
    console.log('\n🔍 ===== TESTING STEP 3 WITH DIAGNOSTICS =====\n')
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Get all sections for odd semester
    const sections = await ISESections.find({
      sem_type: 'odd',
      academic_year: '2024-2025'
    }).sort({ sem: 1, section_name: 1 }).lean()
    
    console.log(`📚 Found ${sections.length} sections\n`)
    
    // Check if timetables already exist
    const existingTimetables = await Timetable.find({
      sem_type: 'odd',
      academic_year: '2024-2025'
    }).lean()
    
    if (existingTimetables.length > 0) {
      console.log(`✅ Found ${existingTimetables.length} existing timetables, will use them\n`)
      console.log('ℹ️  Skipping Steps 1-2, directly running Step 3 diagnostics\n')
    } else {
      // Run Steps 1 and 2 to create timetables
      console.log('📋 ===== STEP 1: LOADING SECTIONS =====\n')
      const step1Result = await loadSectionsAndInitialize('odd', '2024-2025')
      console.log(`✅ Step 1 completed: ${step1Result.data.timetables.length} timetables created\n`)
      
      console.log('📋 ===== STEP 2: BLOCKING FIXED SLOTS =====\n')
      await blockFixedSlots('odd', '2024-2025')
      console.log('✅ Step 2 completed\n')
    }
    
    console.log('📋 ===== STEP 3: LAB SCHEDULING WITH DIAGNOSTICS =====\n')
    
    // Run Step 3 (which will show diagnostics for each section)
    const result = await scheduleLabs('odd', '2024-2025')
    
    console.log('\n✅ Step 3 completed!')
    console.log(`\n📊 Overall Results: ${result.totalLabSessionsScheduled} labs scheduled, ${result.totalBatchesScheduled} batches total`)
    
    if (result.unresolvedScheduling.length > 0) {
      console.log(`\n⚠️  ${result.unresolvedScheduling.length} UNRESOLVED LAB SESSIONS:\n`)
      for (const unresolved of result.unresolvedScheduling) {
        console.log(`   ❌ ${unresolved.section} - Round ${unresolved.round}:`)
        for (const batch of unresolved.batches) {
          console.log(`      • ${batch.batchName}: ${batch.labShortform}`)
        }
        console.log(`      Reason: ${unresolved.reason}\n`)
      }
    } else {
      console.log('\n🎉 All labs scheduled successfully!')
    }
    
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

testStep3Diagnostics()
