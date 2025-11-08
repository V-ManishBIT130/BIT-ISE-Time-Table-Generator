/**
 * STEP 6: Assign Classrooms to Theory Slots
 * 
 * Purpose: Dynamically find available classrooms for each theory slot
 * 
 * Strategy:
 * - Load all classrooms from master data
 * - For each theory slot, find first available classroom
 * - Global conflict tracking (no classroom double-booking)
 * - Project subjects do NOT need classrooms
 * 
 * Input: sem_type, academic_year
 * Output: Timetables with classroom_id and classroom_name populated in theory_slots
 */

import Timetable from '../models/timetable_model.js'
import Classrooms from '../models/dept_class_model.js'

// Global classroom tracker (prevents classroom conflicts across sections)
const globalClassroomSchedule = new Map()

/**
 * Helper: Generate classroom schedule key
 */
function getClassroomKey(classroomId, day, startTime, endTime) {
  return `${classroomId}_${day}_${startTime}_${endTime}`
}

/**
 * Helper: Check if classroom is available
 */
function isClassroomAvailable(classroomId, day, startTime, endTime) {
  const key = getClassroomKey(classroomId, day, startTime, endTime)
  return !globalClassroomSchedule.has(key)
}

/**
 * Helper: Mark classroom as used
 */
function markClassroomUsed(classroomId, day, startTime, endTime, sectionName, subjectName) {
  const key = getClassroomKey(classroomId, day, startTime, endTime)
  globalClassroomSchedule.set(key, {
    sectionName,
    subjectName,
    day,
    startTime,
    endTime
  })
}

/**
 * Main: Assign classrooms to all theory slots
 */
export async function assignClassrooms(semType, academicYear) {
  console.log(`\n🏫 Step 6: Assigning classrooms to theory slots...`)
  
  try {
    // Clear global tracker
    globalClassroomSchedule.clear()
    
    // Load timetables from Step 5
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).lean()
    
    if (timetables.length === 0) {
      throw new Error('No timetables found. Please run Steps 1-5 first.')
    }
    
    // Load all available classrooms
    const classrooms = await Classrooms.find({}).lean()
    
    if (classrooms.length === 0) {
      throw new Error('No classrooms found in system.')
    }
    
    console.log(`   📋 Found ${timetables.length} sections`)
    console.log(`   🏫 Found ${classrooms.length} classrooms available\n`)
    
    let totalSlotsAssigned = 0
    let slotsWithoutClassroom = 0
    let projectSlotsSkipped = 0
    
    // Process each timetable
    for (const tt of timetables) {
      const section = await Timetable.findById(tt._id).populate('section_id').lean()
      const sectionName = section.section_name
      
      console.log(`   📝 Processing Section ${sectionName}...`)
      
      if (!tt.theory_slots || tt.theory_slots.length === 0) {
        console.log(`      ℹ️  No theory slots to assign\n`)
        continue
      }
      
      let assignedCount = 0
      let failedCount = 0
      let skippedCount = 0
      
      // Process each theory slot
      for (const slot of tt.theory_slots) {
        // Skip project subjects (no classroom needed)
        if (slot.subject_name && (
          slot.subject_name.toLowerCase().includes('project') ||
          slot.subject_name.toLowerCase().includes('internship')
        )) {
          skippedCount++
          projectSlotsSkipped++
          continue
        }
        
        // Find available classroom
        let assigned = false
        
        for (const classroom of classrooms) {
          if (isClassroomAvailable(
            classroom._id.toString(),
            slot.day,
            slot.start_time,
            slot.end_time
          )) {
            // Assign classroom
            slot.classroom_id = classroom._id
            slot.classroom_name = classroom.classroom_no
            
            // Mark as used
            markClassroomUsed(
              classroom._id.toString(),
              slot.day,
              slot.start_time,
              slot.end_time,
              sectionName,
              slot.subject_name
            )
            
            assigned = true
            assignedCount++
            totalSlotsAssigned++
            break
          }
        }
        
        if (!assigned) {
          console.log(`      ⚠️  No classroom available for ${slot.subject_shortform} on ${slot.day} ${slot.start_time}`)
          failedCount++
          slotsWithoutClassroom++
        }
      }
      
      // Save updated timetable
      await Timetable.updateOne(
        { _id: tt._id },
        {
          $set: {
            theory_slots: tt.theory_slots,
            'generation_metadata.current_step': 6,
            'generation_metadata.steps_completed': [
              'load_sections',
              'block_fixed_slots',
              'schedule_labs',
              'schedule_theory',
              'assign_lab_teachers',
              'assign_classrooms'
            ]
          }
        }
      )
      
      console.log(`      ✅ Assigned: ${assignedCount}, ⚠️  Failed: ${failedCount}, ℹ️  Skipped (projects): ${skippedCount}\n`)
    }
    
    console.log(`\n✅ Step 6 Complete!`)
    console.log(`   📊 Total classrooms assigned: ${totalSlotsAssigned}`)
    console.log(`   ⚠️  Slots without classroom: ${slotsWithoutClassroom}`)
    console.log(`   ℹ️  Project slots skipped: ${projectSlotsSkipped}`)
    
    return {
      success: true,
      message: 'Step 6 complete: Classrooms assigned to theory slots',
      data: {
        total_slots_assigned: totalSlotsAssigned,
        slots_without_classroom: slotsWithoutClassroom,
        project_slots_skipped: projectSlotsSkipped
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Step 6:', error)
    throw error
  }
}
