/**
 * STEP 6: Assign Lab Teachers
 * 
 * Purpose: Assign teachers to lab sessions dynamically (2 per lab, fall back to 1)
 * 
 * Input: sem_type, academic_year
 * Output: Timetables with teachers assigned to lab_slots
 */

import Timetable from '../models/timetable_model.js'
import Teacher from '../models/teachers_models.js'

export async function assignLabTeachers(semType, academicYear) {
  console.log(`\n👨‍🏫 Step 6: Assigning teachers to labs for ${semType} semester...`)
  
  try {
    // Load timetables from Step 5
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).populate('section_id').lean()
    
    if (timetables.length === 0) {
      throw new Error('No timetables found. Please run Steps 1-5 first.')
    }
    
    console.log(`📋 Found ${timetables.length} timetables to process`)
    
    let totalLabSlots = 0
    let slotsWithTwoTeachers = 0
    let slotsWithOneTeacher = 0
    let slotsWithNoTeachers = 0
    
    // Process each timetable
    for (const timetable of timetables) {
      const section = timetable.section_id
      console.log(`\n🎯 Processing Section: ${section.section_name}`)
      
      // Get all lab slots
      const labSlots = timetable.lab_slots || []
      totalLabSlots += labSlots.length
      
      if (labSlots.length === 0) {
        console.log(`   ℹ️  No lab slots to assign teachers`)
        continue
      }
      
      console.log(`   📚 Found ${labSlots.length} lab slots`)
      
      // For each lab slot, try to assign 2 teachers, fall back to 1
      for (const labSlot of labSlots) {
        const labCode = labSlot.lab_code
        const day = labSlot.day
        const startTime = labSlot.start_time
        const endTime = labSlot.end_time
        
        console.log(`   🔍 Assigning teachers to ${labCode} on ${day} ${startTime}-${endTime}`)
        
        // Find teachers who can handle this lab
        const eligibleTeachers = await Teacher.find({
          labs_handled: {
            $elemMatch: {
              lab_code: labCode,
              semester: parseInt(section.semester)
            }
          }
        }).lean()
        
        if (eligibleTeachers.length === 0) {
          console.log(`      ⚠️  No teachers found for ${labCode}`)
          slotsWithNoTeachers++
          continue
        }
        
        console.log(`      ✓ Found ${eligibleTeachers.length} eligible teacher(s)`)
        
        // TODO: Implement conflict checking and teacher assignment
        // For now, just assign the first 2 teachers (or 1 if only 1 available)
        const teachersToAssign = eligibleTeachers.slice(0, Math.min(2, eligibleTeachers.length))
        
        // Update the lab slot with teacher assignments
        labSlot.teachers_assigned = teachersToAssign.map(t => ({
          teacher_id: t.teacher_id,
          teacher_name: t.name,
          teacher_shortform: t.short_form
        }))
        
        if (teachersToAssign.length === 2) {
          slotsWithTwoTeachers++
          console.log(`      ✅ Assigned 2 teachers: ${teachersToAssign.map(t => t.short_form).join(', ')}`)
        } else if (teachersToAssign.length === 1) {
          slotsWithOneTeacher++
          console.log(`      ⚠️  Assigned 1 teacher: ${teachersToAssign[0].short_form}`)
        }
      }
      
      // Save the updated timetable
      await Timetable.updateOne(
        { _id: timetable._id },
        {
          $set: {
            lab_slots: labSlots,
            'generation_metadata.current_step': 6,
            'generation_metadata.steps_completed': [
              'load_sections',
              'block_fixed_slots',
              'schedule_labs',
              'schedule_theory',
              'assign_classrooms',
              'assign_teachers'
            ]
          }
        }
      )
    }
    
    console.log(`\n✅ Step 6 Complete: Teacher Assignment Summary`)
    console.log(`   📊 Total Lab Slots: ${totalLabSlots}`)
    console.log(`   👥 Slots with 2 teachers: ${slotsWithTwoTeachers}`)
    console.log(`   👤 Slots with 1 teacher: ${slotsWithOneTeacher}`)
    console.log(`   ❌ Slots with no teachers: ${slotsWithNoTeachers}`)
    
    return {
      success: true,
      message: 'Teacher assignment completed',
      data: {
        sections_processed: timetables.length,
        total_lab_slots: totalLabSlots,
        slots_with_two_teachers: slotsWithTwoTeachers,
        slots_with_one_teacher: slotsWithOneTeacher,
        slots_with_no_teachers: slotsWithNoTeachers,
        success_rate: totalLabSlots > 0 ? ((slotsWithTwoTeachers + slotsWithOneTeacher) / totalLabSlots * 100).toFixed(2) : 0
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Step 6:', error)
    throw error
  }
}
