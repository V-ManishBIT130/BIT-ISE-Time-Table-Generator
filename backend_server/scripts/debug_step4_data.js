/**
 * Debug Script: Verify Step 4 Data in Database
 * 
 * This script checks:
 * 1. What timetables exist in database
 * 2. Whether theory_scheduling_summary is saved
 * 3. The exact structure of generation_metadata
 */

import mongoose from 'mongoose'
import Timetable from '../models/timetable_model.js'
import Subject from '../models/subjects_model.js'
import TeacherAssignment from '../models/pre_assign_teacher_model.js'

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/timetable_db'

async function debugStep4Data() {
  try {
    console.log('\n🔍 ===== DEBUG STEP 4 DATA =====\n')
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    // Check all timetables
    const timetables = await Timetable.find({
      sem_type: 'odd',
      academic_year: '2024-2025'
    }).populate('section_id').lean()
    
    console.log(`📊 Found ${timetables.length} timetables for odd semester 2024-2025\n`)
    
    if (timetables.length === 0) {
      console.log('❌ No timetables found! Run Step 1 first.')
      process.exit(0)
    }
    
    // Check each timetable
    for (const tt of timetables) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📋 Section: ${tt.section_name} (Sem ${tt.sem})`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      
      // Check generation_metadata
      if (!tt.generation_metadata) {
        console.log('⚠️  No generation_metadata found')
        continue
      }
      
      console.log('\n📌 Generation Metadata:')
      console.log(`   • Current Step: ${tt.generation_metadata.current_step}`)
      console.log(`   • Steps Completed: [${tt.generation_metadata.steps_completed?.join(', ') || 'None'}]`)
      
      // Check if theory_scheduling_summary exists
      if (tt.generation_metadata.theory_scheduling_summary) {
        console.log('\n✅ THEORY SCHEDULING SUMMARY EXISTS:')
        const summary = tt.generation_metadata.theory_scheduling_summary
        console.log(`   • Total Subjects Found: ${summary.total_subjects_found}`)
        console.log(`   • Regular ISE: ${summary.regular_ise_found} found, ${summary.regular_ise_scheduled} scheduled, ${summary.regular_ise_failed} failed`)
        console.log(`   • Other Dept: ${summary.other_dept_found} found, ${summary.other_dept_scheduled} scheduled, ${summary.other_dept_failed} failed`)
        console.log(`   • Projects: ${summary.projects_found} found, ${summary.projects_scheduled} scheduled, ${summary.projects_failed} failed`)
        console.log(`   • Success Rate: ${summary.success_rate}%`)
      } else {
        console.log('\n❌ NO THEORY SCHEDULING SUMMARY FOUND')
        console.log('   This means Step 4 was either:')
        console.log('   1. Not run yet, OR')
        console.log('   2. Run with OLD code (before summary feature was added)')
      }
      
      // Check theory_slots count
      console.log(`\n📚 Theory Slots: ${tt.theory_slots?.length || 0} slots`)
      if (tt.theory_slots && tt.theory_slots.length > 0) {
        const fixedSlots = tt.theory_slots.filter(s => s.is_fixed_slot).length
        const scheduledSlots = tt.theory_slots.filter(s => !s.is_fixed_slot).length
        console.log(`   • Fixed Slots: ${fixedSlots}`)
        console.log(`   • Scheduled Slots: ${scheduledSlots}`)
      }
      
      // Check lab_slots count
      console.log(`🧪 Lab Slots: ${tt.lab_slots?.length || 0} slots`)
    }
    
    // Now check what subjects exist in database for Sem 3
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📚 SUBJECTS IN DATABASE (Sem 3, Odd)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const sem3Subjects = await Subject.find({
      subject_sem: 3,
      subject_sem_type: 'odd',
      is_lab: { $ne: true }
    }).lean()
    
    console.log(`Total Subjects: ${sem3Subjects.length}\n`)
    
    for (const subject of sem3Subjects) {
      const type = subject.is_non_ise_subject ? '[Other Dept]' : 
                   subject.is_project ? '[Project]' : 
                   '[Regular ISE]'
      console.log(`   ${type} ${subject.subject_shortform || subject.subject_code} - ${subject.subject_name}`)
      console.log(`      • hrs_per_week: ${subject.hrs_per_week}, max_hrs_Day: ${subject.max_hrs_Day}`)
      console.log(`      • requires_teacher_assignment: ${subject.requires_teacher_assignment}`)
    }
    
    // Check teacher assignments for Sem 3, Section A
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👨‍🏫 TEACHER ASSIGNMENTS (Sem 3A, Odd)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const assignments = await TeacherAssignment.find({
      sem: 3,
      sem_type: 'odd',
      section: 'A'
    }).populate('subject_id').populate('teacher_id').lean()
    
    console.log(`Total Assignments: ${assignments.length}\n`)
    
    for (const assignment of assignments) {
      if (assignment.subject_id) {
        console.log(`   • ${assignment.subject_id.subject_shortform || assignment.subject_id.subject_code}`)
        console.log(`      Teacher: ${assignment.teacher_id?.name || 'None'}`)
      }
    }
    
    console.log('\n\n🔍 ===== DEBUG COMPLETE =====\n')
    
    // Close connection
    await mongoose.connection.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run debug
debugStep4Data()
