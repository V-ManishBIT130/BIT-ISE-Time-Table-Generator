/**
 * Check for Orphaned Teacher-Subject Assignments
 * 
 * This script checks for assignments where teacher_id or subject_id
 * references don't exist in the database (deleted/invalid references)
 */

import mongoose from 'mongoose'
import TeacherSubjectAssignment from '../models/pre_assign_teacher_model.js'
import Teacher from '../models/teachers_models.js'
import Subject from '../models/subjects_model.js'

const MONGODB_URI = 'mongodb://localhost:27017/timetable_db' // Update if different

async function checkOrphanedAssignments() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    console.log('🔍 Fetching all teacher-subject assignments...')
    const allAssignments = await TeacherSubjectAssignment.find()
    console.log(`📊 Total assignments: ${allAssignments.length}\n`)
    
    if (allAssignments.length === 0) {
      console.log('ℹ️ No assignments found in database')
      await mongoose.connection.close()
      return
    }
    
    const orphanedAssignments = []
    const validAssignments = []
    
    console.log('🔍 Checking each assignment...\n')
    
    for (const assignment of allAssignments) {
      let isOrphaned = false
      const issues = []
      
      // Check teacher reference
      const teacher = await Teacher.findById(assignment.teacher_id)
      if (!teacher) {
        isOrphaned = true
        issues.push(`❌ Teacher ID ${assignment.teacher_id} not found`)
      } else {
        issues.push(`✅ Teacher: ${teacher.name}`)
      }
      
      // Check subject reference
      const subject = await Subject.findById(assignment.subject_id)
      if (!subject) {
        isOrphaned = true
        issues.push(`❌ Subject ID ${assignment.subject_id} not found`)
      } else {
        issues.push(`✅ Subject: ${subject.subject_name}`)
      }
      
      if (isOrphaned) {
        orphanedAssignments.push({
          _id: assignment._id,
          teacher_id: assignment.teacher_id,
          subject_id: assignment.subject_id,
          sem: assignment.sem,
          sem_type: assignment.sem_type,
          section: assignment.section,
          issues
        })
        
        console.log(`⚠️ ORPHANED ASSIGNMENT:`)
        console.log(`   ID: ${assignment._id}`)
        console.log(`   Section: Sem ${assignment.sem} - ${assignment.section} (${assignment.sem_type})`)
        issues.forEach(issue => console.log(`   ${issue}`))
        console.log('')
      } else {
        validAssignments.push(assignment)
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY:')
    console.log('='.repeat(60))
    console.log(`Total Assignments: ${allAssignments.length}`)
    console.log(`✅ Valid Assignments: ${validAssignments.length}`)
    console.log(`⚠️ Orphaned Assignments: ${orphanedAssignments.length}`)
    console.log('='.repeat(60))
    
    if (orphanedAssignments.length > 0) {
      console.log('\n⚠️ WARNING: Found orphaned assignments!')
      console.log('These assignments reference deleted/non-existent teachers or subjects.')
      console.log('\nTo clean up, you can either:')
      console.log('1. Click "🔍 Validate Database" button in the Teacher Assignments page')
      console.log('2. Run: node backend_server/scripts/cleanup_orphaned_assignments.js')
      console.log('\nOrphaned Assignment IDs:')
      orphanedAssignments.forEach(a => {
        console.log(`- ${a._id} (Sem ${a.sem}${a.section})`)
      })
    } else {
      console.log('\n✅ All assignments are valid!')
    }
    
    await mongoose.connection.close()
    console.log('\n✅ Connection closed')
    
  } catch (error) {
    console.error('❌ Error:', error)
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close()
    }
    process.exit(1)
  }
}

// Run the check
checkOrphanedAssignments()
