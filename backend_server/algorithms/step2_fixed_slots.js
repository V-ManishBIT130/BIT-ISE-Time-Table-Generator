/**
 * STEP 2: Block Fixed Slots
 * 
 * Purpose: Reserve fixed time slots for OEC and PEC (Semester 7 only)
 * 
 * Input: sem_type, academic_year
 * Output: Timetables with fixed slots added to theory_slots
 */

import Timetable from '../models/timetable_model.js'
import Subjects from '../models/subjects_model.js'
import TeacherAssignment from '../models/pre_assign_teacher_model.js'

/**
 * Helper: Convert 12-hour format from user input to 24-hour for internal use
 */
function parseTimeFrom12HourFormat(time12) {
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) {
    return time12
  }
  
  let [, hours, minutes, period] = match
  hours = parseInt(hours)
  
  if (period.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`
}

/**
 * Helper: Calculate duration in hours between two times
 */
function calculateDuration(startTime24, endTime24) {
  const [startHours, startMinutes] = startTime24.split(':').map(Number)
  const [endHours, endMinutes] = endTime24.split(':').map(Number)
  
  const startTotalMinutes = startHours * 60 + startMinutes
  const endTotalMinutes = endHours * 60 + endMinutes
  
  return (endTotalMinutes - startTotalMinutes) / 60
}

export async function blockFixedSlots(semType, academicYear) {
  console.log(`\n🔒 Step 2: Blocking fixed slots for ${semType} semester...`)
  
  try {
    // Load timetables from Step 1
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).populate('section_id', 'section_name sem sem_type').lean()
    
    if (timetables.length === 0) {
      throw new Error('No timetables found. Please run Step 1 first.')
    }
    
    console.log(`📋 Found ${timetables.length} timetables to process`)
    
    // Filter Semester 7 timetables
    const sem7Timetables = timetables.filter(tt => tt.sem === 7)
    
    if (sem7Timetables.length === 0) {
      console.log(`   ℹ️  No Semester 7 sections found, skipping fixed slot blocking`)
      
      // Update metadata for non-Sem7 sections
      for (const timetable of timetables) {
        await Timetable.updateOne(
          { _id: timetable._id },
          {
            $set: {
              'generation_metadata.current_step': 2,
              'generation_metadata.steps_completed': ['load_sections', 'block_fixed_slots']
            }
          }
        )
      }
      
      return {
        success: true,
        message: 'Step 2 complete: No fixed slots needed (no Semester 7 sections)',
        data: {
          sections_processed: timetables.length,
          fixed_slots_added: 0
        }
      }
    }
    
    console.log(`   📌 Found ${sem7Timetables.length} Semester 7 sections`)
    
    let totalFixedSlots = 0
    
    for (const timetable of sem7Timetables) {
      const sectionId = timetable.section_id._id
      const fixedSlots = []
      
      // Load OEC subjects
      const oecSubjects = await Subjects.find({
        subject_sem: 7,
        subject_sem_type: semType,
        is_open_elective: true
      }).lean()
      
      if (oecSubjects.length > 0) {
        const oecSubject = oecSubjects[0]
        
        if (oecSubject.fixed_schedule && oecSubject.fixed_schedule.length > 0) {
          console.log(`   🔒 Blocking OEC slots for Section ${timetable.section_name}:`)
          
          for (const schedule of oecSubject.fixed_schedule) {
            const startTime24 = parseTimeFrom12HourFormat(schedule.start_time)
            const endTime24 = parseTimeFrom12HourFormat(schedule.end_time)
            const duration = calculateDuration(startTime24, endTime24)
            
            console.log(`      - ${schedule.day} ${schedule.start_time} - ${schedule.end_time}`)
            
            fixedSlots.push({
              subject_id: oecSubject._id,
              subject_name: oecSubject.subject_name,
              subject_shortform: oecSubject.subject_shortform || oecSubject.subject_code,
              teacher_id: null,
              teacher_name: '[Other Dept]',
              teacher_shortform: 'EXT',
              classroom_id: null,
              classroom_name: 'TBD',
              day: schedule.day,
              start_time: startTime24,
              end_time: endTime24,
              duration_hours: duration,
              is_fixed_slot: true
            })
            
            totalFixedSlots++
          }
        }
      }
      
      // Load PEC subjects
      const pecSubjects = await Subjects.find({
        subject_sem: 7,
        subject_sem_type: semType,
        is_professional_elective: true
      }).lean()
      
      if (pecSubjects.length > 0) {
        console.log(`   🔒 Blocking PEC slots for Section ${timetable.section_name}:`)
        
        for (const pecSubject of pecSubjects) {
          if (pecSubject.fixed_schedule && pecSubject.fixed_schedule.length > 0) {
            const assignment = await TeacherAssignment.findOne({
              subject_id: pecSubject._id,
              sem: 7,
              sem_type: semType,
              section: timetable.section_id.section_name
            }).populate('teacher_id', 'name teacher_shortform').lean()
            
            for (const schedule of pecSubject.fixed_schedule) {
              const startTime24 = parseTimeFrom12HourFormat(schedule.start_time)
              const endTime24 = parseTimeFrom12HourFormat(schedule.end_time)
              const duration = calculateDuration(startTime24, endTime24)
              
              console.log(`      - ${pecSubject.subject_shortform}: ${schedule.day} ${schedule.start_time} - ${schedule.end_time}`)
              
              fixedSlots.push({
                subject_id: pecSubject._id,
                subject_name: pecSubject.subject_name,
                subject_shortform: pecSubject.subject_shortform || pecSubject.subject_code,
                teacher_id: assignment?.teacher_id?._id || null,
                teacher_name: assignment?.teacher_id?.name || 'TBD',
                teacher_shortform: assignment?.teacher_id?.teacher_shortform || 'TBD',
                classroom_id: null,
                classroom_name: 'TBD',
                day: schedule.day,
                start_time: startTime24,
                end_time: endTime24,
                duration_hours: duration,
                is_fixed_slot: true
              })
              
              totalFixedSlots++
            }
          }
        }
      }
      
      // Update timetable with fixed slots
      await Timetable.updateOne(
        { _id: timetable._id },
        {
          $set: {
            theory_slots: fixedSlots,
            'generation_metadata.current_step': 2,
            'generation_metadata.steps_completed': ['load_sections', 'block_fixed_slots']
          }
        }
      )
    }
    
    // Update non-Sem7 sections metadata
    for (const timetable of timetables.filter(tt => tt.sem !== 7)) {
      await Timetable.updateOne(
        { _id: timetable._id },
        {
          $set: {
            'generation_metadata.current_step': 2,
            'generation_metadata.steps_completed': ['load_sections', 'block_fixed_slots']
          }
        }
      )
    }
    
    console.log(`✅ Step 2 Complete: ${totalFixedSlots} fixed slots added`)
    
    // Fetch updated timetables
    const updatedTimetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    })
    
    return {
      success: true,
      message: `Step 2 complete: ${totalFixedSlots} fixed slots blocked`,
      data: {
        sections_processed: timetables.length,
        fixed_slots_added: totalFixedSlots,
        timetables: updatedTimetables
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Step 2:', error)
    throw error
  }
}
