/**
 * DATABASE MIGRATION SCRIPT
 * 
 * Purpose: Add hierarchical workload fields to existing teachers
 * 
 * Adds:
 * - teacher_position (enum: Professor, Associate Professor, Assistant Professor)
 * - max_lab_assign_even (default based on position)
 * - max_lab_assign_odd (default based on position)
 * 
 * Usage: node migrations/add_workload_limits.js
 */

import mongoose from 'mongoose'
import Teacher from '../models/teachers_models.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from backend_server directory (parent)
dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function migrateTeachers() {
  try {
    console.log('🌱 Starting teacher migration...\n')
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected successfully\n')

    // Get all teachers using DIRECT database query (bypass Mongoose schema validation)
    const teachersCollection = mongoose.connection.db.collection('Teachers')
    const teachers = await teachersCollection.find({}).toArray()
    
    console.log(`📋 Found ${teachers.length} teacher(s) to migrate\n`)
    
    if (teachers.length === 0) {
      console.log('ℹ️  No teachers found. Migration complete.\n')
      await mongoose.disconnect()
      process.exit(0)
    }
    
    let updatedCount = 0
    let skippedCount = 0
    
    for (const teacher of teachers) {
      console.log(`\n👤 Processing: ${teacher.name}`)
      
      const updates = {}
      let needsUpdate = false
      
      // Set default position if not set or invalid
      if (!teacher.teacher_position || 
          !['Professor', 'Associate Professor', 'Assistant Professor'].includes(teacher.teacher_position)) {
        updates.teacher_position = 'Assistant Professor' // Safe default
        console.log(`   ✏️  Set position: Assistant Professor (default)`)
        needsUpdate = true
      } else {
        console.log(`   ✓ Position already set: ${teacher.teacher_position}`)
      }
      
      // Set default workload limits based on position
      const position = updates.teacher_position || teacher.teacher_position
      
      if (!teacher.max_lab_assign_even || !teacher.max_lab_assign_odd) {
        switch(position) {
          case 'Professor':
            if (!teacher.max_lab_assign_even) updates.max_lab_assign_even = 2
            if (!teacher.max_lab_assign_odd) updates.max_lab_assign_odd = 2
            console.log(`   ✏️  Set limits: Even=${updates.max_lab_assign_even || teacher.max_lab_assign_even}, Odd=${updates.max_lab_assign_odd || teacher.max_lab_assign_odd} (Professor defaults)`)
            break
          case 'Associate Professor':
            if (!teacher.max_lab_assign_even) updates.max_lab_assign_even = 4
            if (!teacher.max_lab_assign_odd) updates.max_lab_assign_odd = 4
            console.log(`   ✏️  Set limits: Even=${updates.max_lab_assign_even || teacher.max_lab_assign_even}, Odd=${updates.max_lab_assign_odd || teacher.max_lab_assign_odd} (Associate defaults)`)
            break
          case 'Assistant Professor':
          default:
            if (!teacher.max_lab_assign_even) updates.max_lab_assign_even = 6
            if (!teacher.max_lab_assign_odd) updates.max_lab_assign_odd = 6
            console.log(`   ✏️  Set limits: Even=${updates.max_lab_assign_even || teacher.max_lab_assign_even}, Odd=${updates.max_lab_assign_odd || teacher.max_lab_assign_odd} (Assistant defaults)`)
        }
        needsUpdate = true
      } else {
        console.log(`   ✓ Limits already set: Even=${teacher.max_lab_assign_even}, Odd=${teacher.max_lab_assign_odd}`)
      }
      
      if (needsUpdate) {
        // Update using direct database operation (bypasses schema validation)
        await teachersCollection.updateOne(
          { _id: teacher._id },
          { $set: updates }
        )
        updatedCount++
        console.log(`   ✅ Updated successfully`)
      } else {
        skippedCount++
        console.log(`   ⏭️  No changes needed`)
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary:')
    console.log(`   Total teachers: ${teachers.length}`)
    console.log(`   Updated: ${updatedCount}`)
    console.log(`   Skipped: ${skippedCount}`)
    console.log('='.repeat(60) + '\n')
    
    console.log('✅ Migration completed successfully!')
    console.log('\n💡 Next steps:')
    console.log('   1. Verify teacher data in the database')
    console.log('   2. Adjust individual limits if needed via UI')
    console.log('   3. Run timetable generation with new algorithm\n')
    
    await mongoose.disconnect()
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error.stack)
    console.error('\n💡 Troubleshooting:')
    console.error('   1. Ensure MONGODB_URI is set in .env file')
    console.error('   2. Check if MongoDB Atlas cluster is running')
    console.error('   3. Verify network access (IP whitelist)')
    process.exit(1)
  }
}

// Run migration
migrateTeachers()
