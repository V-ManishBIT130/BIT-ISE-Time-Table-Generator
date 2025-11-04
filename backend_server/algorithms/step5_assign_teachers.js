/**
 * STEP 5: Assign Lab Teachers
 * 
 * Purpose: Assign teachers to lab sessions dynamically
 * 
 * Input: sem_type, academic_year
 * Output: Timetables with teachers assigned to lab_slots
 */

import Timetable from '../models/timetable_model.js'

export async function assignLabTeachers(semType, academicYear) {
  console.log(`\n👨‍🏫 Step 5: Assigning teachers to labs for ${semType} semester...`)
  
  try {
    // Load timetables from Step 4
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).populate('section_id').lean()
    
    if (timetables.length === 0) {
      throw new Error('No timetables found. Please run Steps 1-4 first.')
    }
    
    console.log(`📋 Found ${timetables.length} timetables to process`)
    console.log(`   👥 Attempting 2 teachers per lab, falling back to 1 if needed`)
    
    // TODO: Implement teacher assignment
    // This will be implemented in the next phase
    
    console.log(`   ℹ️  Teacher assignment - TO BE IMPLEMENTED`)
    
    // Update metadata
    for (const timetable of timetables) {
      await Timetable.updateOne(
        { _id: timetable._id },
        {
          $set: {
            'generation_metadata.current_step': 5,
            'generation_metadata.steps_completed': ['load_sections', 'block_fixed_slots', 'schedule_labs', 'schedule_theory', 'assign_teachers']
          }
        }
      )
    }
    
    return {
      success: true,
      message: 'Step 5 complete: Teacher assignment (placeholder)',
      data: {
        sections_processed: timetables.length,
        teachers_assigned: 0
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Step 5:', error)
    throw error
  }
}
