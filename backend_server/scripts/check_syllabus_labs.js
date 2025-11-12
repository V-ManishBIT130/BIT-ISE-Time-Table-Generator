/**
 * Check Syllabus Labs Collection
 * 
 * Purpose: See what lab names/codes are actually stored
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import SyllabusLabs from '../models/syllabus_labs_model.js'
import DeptLabs from '../models/dept_labs_model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

async function checkSyllabusLabs() {
  try {
    console.log('\n🔍 ===== CHECKING SYLLABUS LABS =====\n')
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Get all labs for semester 5 and 7
    const semester5Labs = await SyllabusLabs.find({ sem: 5 }).lean()
    const semester7Labs = await SyllabusLabs.find({ sem: 7 }).lean()
    
    console.log(`📚 SEMESTER 5 LABS (${semester5Labs.length} found):\n`)
    for (const lab of semester5Labs) {
      console.log(`   Lab Name: "${lab.lab_name}"`)
      console.log(`   Lab Shortform: "${lab.lab_shortform}"`)
      console.log(`   Lab Code: "${lab.lab_code}"`)
      console.log(`   Required Equipment: "${lab.required_equipment}"`)
      console.log(`   Credits: ${lab.credits}`)
      console.log(``)
    }
    
    console.log(`\n📚 SEMESTER 7 LABS (${semester7Labs.length} found):\n`)
    for (const lab of semester7Labs) {
      console.log(`   Lab Name: "${lab.lab_name}"`)
      console.log(`   Lab Shortform: "${lab.lab_shortform}"`)
      console.log(`   Lab Code: "${lab.lab_code}"`)
      console.log(`   Required Equipment: "${lab.required_equipment}"`)
      console.log(`   Credits: ${lab.credits}`)
      console.log(``)
    }
    
    // Also check what equipment types exist in dept_labs
    console.log(`\n🔧 DEPT LABS - EQUIPMENT TYPES:\n`)
    const allRooms = await DeptLabs.find({}).lean()
    
    const equipmentSet = new Set()
    for (const room of allRooms) {
      console.log(`   Room: ${room.labRoom_no}`)
      const equipment = room.equipment_available || []
      equipment.forEach(eq => {
        console.log(`      - ${eq.equipment_name}`)
        equipmentSet.add(eq.equipment_name)
      })
      console.log(``)
    }
    
    console.log(`\n📊 UNIQUE EQUIPMENT TYPES: ${[...equipmentSet].join(', ')}`)
    
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

checkSyllabusLabs()
