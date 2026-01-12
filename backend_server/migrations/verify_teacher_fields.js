/**
 * Verify that teachers have workload limit fields in database
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function verifyTeachers() {
  try {
    console.log('🔍 Verifying teacher fields in database...\n')
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    // Query directly from database (not through model)
    const teachers = await mongoose.connection.db.collection('Teachers')
      .find({})
      .limit(5)
      .toArray()

    console.log(`📊 Found ${teachers.length} teachers (showing first 5)\n`)
    
    teachers.forEach((teacher, i) => {
      console.log(`${i + 1}. ${teacher.name} (${teacher.teacher_id})`)
      console.log(`   Position: ${teacher.teacher_position || 'MISSING'}`)
      console.log(`   Max Labs Even: ${teacher.max_lab_assign_even ?? 'MISSING'}`)
      console.log(`   Max Labs Odd: ${teacher.max_lab_assign_odd ?? 'MISSING'}`)
      console.log()
    })

    await mongoose.disconnect()
    process.exit(0)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

verifyTeachers()
