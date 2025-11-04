/**
 * TIMETABLE GENERATION ALGORITHM (Phase 3)
 * 
 * Purpose: Generate conflict-free weekly timetables for all sections
 * 
 * Algorithm: Greedy Builder with Batch Rotation
 * 
 * Input:
 * - sem_type: 'odd' or 'even'
 * - academic_year: '2024-2025'
 * 
 * Output:
 * - One timetable document per section (all globally conflict-free)
 * - Theory slots with time + teacher + classroom
 * - Lab slots with time + room (from Phase 2) + teachers (assigned here)
 * 
 * Steps:
 * 1. Load all sections for semester type
 * 2. Block fixed slots (OEC/PEC for Semester 7)
 * 3. Schedule labs using batch rotation
 * 4. Schedule theory subjects with load balancing
 * 5. Assign teachers to labs dynamically
 * 6. Insert breaks (1-2 per day, 30 min each)
 * 7. Validate constraints (no consecutive labs, batch sync)
 * 8. Save timetables
 */

import ISESections from '../models/ise_sections_model.js'
import Subjects from '../models/subjects_model.js'
import SyllabusLabs from '../models/syllabus_labs_model.js'
import Teacher from '../models/teachers_models.js'
import Classrooms from '../models/dept_class_model.js'
import DeptLabs from '../models/dept_labs_model.js'
import TeacherAssignment from '../models/pre_assign_teacher_model.js'
import LabRoomAssignment from '../models/lab_room_assignment_model.js'
import Timetable from '../models/timetable_model.js'

// Constants
const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_START = '08:00'
const DAY_END = '17:00'
const LAB_DURATION = 2
const BREAK_DURATION = 0.5 // 30 minutes

/**
 * Time Utility Functions for 12-hour format conversion
 */
function convertTo12Hour(time24) {
  // Input: "08:00", "13:30", "17:00"
  // Output: "8:00 AM", "1:30 PM", "5:00 PM"
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12 // 0 becomes 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

function convertTo24Hour(time12) {
  // Input: "8:00 AM", "1:30 PM", "5:00 PM"
  // Output: "08:00", "13:30", "17:00"
  const [time, period] = time12.split(' ')
  let [hours, minutes] = time.split(':').map(Number)
  
  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function addMinutes(time24, minutesToAdd) {
  // Add minutes to a 24-hour time
  const [hours, minutes] = time24.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + minutesToAdd
  const newHours = Math.floor(totalMinutes / 60)
  const newMinutes = totalMinutes % 60
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
}

/**
 * Main function to generate timetables for all sections
 */
export async function generateTimetables(semType, academicYear) {
  console.log(`\n🎯 Starting Phase 3: Timetable Generation for ${semType} semester...`)
  console.log(`📅 Academic Year: ${academicYear}`)
  
  const startTime = Date.now()
  
  try {
    // Step 1: Load all sections for this semester type
    console.log(`\n📋 Step 1: Loading sections...`)
    const sections = await ISESections.find({ sem_type: semType }).lean()
    
    if (sections.length === 0) {
      throw new Error(`No sections found for ${semType} semester`)
    }
    
    console.log(`✅ Found ${sections.length} sections:`, sections.map(s => `${s.sem}${s.section_name}`).join(', '))
    
    // Initialize timetable structure for all sections
    const timetables = {}
    for (const section of sections) {
      timetables[section._id.toString()] = {
        section_id: section._id,
        section_name: `${section.sem}${section.section_name}`,
        sem: section.sem,
        sem_type: section.sem_type,
        academic_year: academicYear,
        generation_metadata: {
          generated_at: new Date(),
          algorithm: 'greedy',
          teacher_assignment_summary: {
            total_lab_sessions: 0,
            sessions_with_2_teachers: 0,
            sessions_with_1_teacher: 0,
            sessions_with_0_teachers: 0
          }
        },
        theory_slots: [],
        lab_slots: [],
        flagged_sessions: []
      }
    }
    
    // Step 2: Block fixed slots (OEC/PEC for Semester 7)
    console.log(`\n🔒 Step 2: Blocking fixed slots...`)
    await blockFixedSlots(timetables, sections)
    
    // Step 3: Schedule labs using batch rotation
    console.log(`\n🧪 Step 3: Scheduling labs...`)
    await scheduleLabs(timetables, sections)
    
    // Step 4: Schedule theory subjects
    console.log(`\n📚 Step 4: Scheduling theory subjects...`)
    await scheduleTheory(timetables, sections)
    
    // Step 5: Assign teachers to labs
    console.log(`\n👨‍🏫 Step 5: Assigning teachers to labs...`)
    await assignLabTeachers(timetables, sections)
    
    // Step 6: Validate constraints
    console.log(`\n✅ Step 6: Validating constraints...`)
    validateConstraints(timetables, sections)
    
    // Step 7: Save timetables
    console.log(`\n💾 Step 7: Saving timetables...`)
    const savedTimetables = await saveTimetables(timetables)
    
    const endTime = Date.now()
    const generationTime = endTime - startTime
    
    console.log(`\n🎉 Timetable generation complete!`)
    console.log(`⏱️  Generation time: ${generationTime}ms`)
    console.log(`📊 Sections processed: ${sections.length}`)
    
    return {
      success: true,
      message: `Successfully generated timetables for ${semType} semester`,
      data: {
        sections_processed: sections.length,
        generation_time_ms: generationTime,
        timetables: savedTimetables
      }
    }
    
  } catch (error) {
    console.error('❌ Error generating timetables:', error)
    throw error
  }
}

/**
 * Helper: Convert 12-hour format from user input to 24-hour for internal use
 */
function parseTimeFrom12HourFormat(time12) {
  // Input from frontend: "08:00 AM", "09:30 AM", "03:30 PM", "05:00 PM"
  // Output for internal storage: "08:00", "09:30", "15:30", "17:00"
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) {
    // Already in 24-hour format or invalid
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

/**
 * Step 2: Block fixed time slots for OEC and PEC (Semester 7 only)
 */
async function blockFixedSlots(timetables, sections) {
  // Filter Semester 7 sections
  const sem7Sections = sections.filter(s => s.sem === 7)
  
  if (sem7Sections.length === 0) {
    console.log(`   ℹ️  No Semester 7 sections found, skipping fixed slot blocking`)
    return
  }
  
  console.log(`   📌 Found ${sem7Sections.length} Semester 7 sections`)
  
  for (const section of sem7Sections) {
    const sectionId = section._id.toString()
    
    // Load OEC subjects for this section (if any)
    const oecSubjects = await Subjects.find({
      subject_sem: 7,
      subject_sem_type: section.sem_type,
      is_open_elective: true
    }).lean()
    
    if (oecSubjects.length > 0) {
      const oecSubject = oecSubjects[0]
      
      // Check if subject has fixed_schedule defined
      if (oecSubject.fixed_schedule && oecSubject.fixed_schedule.length > 0) {
        console.log(`   🔒 Blocking OEC slots for Section ${section.sem}${section.section_name}:`)
        
        // Add each fixed schedule slot
        for (const schedule of oecSubject.fixed_schedule) {
          // Convert times from 12-hour (user input) to 24-hour (internal storage)
          const startTime24 = parseTimeFrom12HourFormat(schedule.start_time)
          const endTime24 = parseTimeFrom12HourFormat(schedule.end_time)
          const duration = calculateDuration(startTime24, endTime24)
          
          console.log(`      - ${schedule.day} ${schedule.start_time} - ${schedule.end_time}`)
          
          timetables[sectionId].theory_slots.push({
            subject_id: oecSubject._id,
            subject_name: oecSubject.subject_name,
            subject_shortform: oecSubject.subject_shortform || oecSubject.subject_code,
            teacher_id: null, // External department
            teacher_name: '[Other Dept]',
            teacher_shortform: 'EXT',
            classroom_id: null, // Will be assigned later
            classroom_name: 'TBD',
            day: schedule.day,
            start_time: startTime24,
            end_time: endTime24,
            duration_hours: duration,
            is_fixed_slot: true
          })
        }
      } else {
        console.log(`   ⚠️  OEC subject found but no fixed_schedule defined`)
      }
    }
    
    // Load PEC subjects for this section (if any)
    const pecSubjects = await Subjects.find({
      subject_sem: 7,
      subject_sem_type: section.sem_type,
      is_professional_elective: true
    }).lean()
    
    if (pecSubjects.length > 0) {
      console.log(`   🔒 Blocking PEC slots for Section ${section.sem}${section.section_name}:`)
      
      // PEC has multiple options, but they all run at same time
      for (const pecSubject of pecSubjects) {
        // Check if subject has fixed_schedule defined
        if (pecSubject.fixed_schedule && pecSubject.fixed_schedule.length > 0) {
          // Load teacher assignment for this PEC option
          const assignment = await TeacherAssignment.findOne({
            subject_id: pecSubject._id,
            sem: 7,
            sem_type: section.sem_type,
            section: section.section_name
          }).populate('teacher_id', 'name teacher_shortform').lean()
          
          // Add each fixed schedule slot
          for (const schedule of pecSubject.fixed_schedule) {
            // Convert times from 12-hour (user input) to 24-hour (internal storage)
            const startTime24 = parseTimeFrom12HourFormat(schedule.start_time)
            const endTime24 = parseTimeFrom12HourFormat(schedule.end_time)
            const duration = calculateDuration(startTime24, endTime24)
            
            console.log(`      - ${pecSubject.subject_shortform}: ${schedule.day} ${schedule.start_time} - ${schedule.end_time}`)
            
            timetables[sectionId].theory_slots.push({
              subject_id: pecSubject._id,
              subject_name: pecSubject.subject_name,
              subject_shortform: pecSubject.subject_shortform || pecSubject.subject_code,
              teacher_id: assignment?.teacher_id?._id || null,
              teacher_name: assignment?.teacher_id?.name || 'TBD',
              teacher_shortform: assignment?.teacher_id?.teacher_shortform || 'TBD',
              classroom_id: null, // Will be assigned later
              classroom_name: 'TBD',
              day: schedule.day,
              start_time: startTime24,
              end_time: endTime24,
              duration_hours: duration,
              is_fixed_slot: true
            })
          }
        } else {
          console.log(`   ⚠️  PEC subject ${pecSubject.subject_shortform} found but no fixed_schedule defined`)
        }
      }
    }
  }
  
  console.log(`   ✅ Fixed slots blocked successfully`)
}

/**
 * Step 3: Schedule labs using batch rotation strategy
 */
async function scheduleLabs(timetables, sections) {
  console.log(`   🔄 Using batch rotation strategy for even lab distribution`)
  
  // TODO: Implement lab scheduling with batch rotation
  // This is a complex function - we'll implement it next
  
  console.log(`   ℹ️  Lab scheduling - TO BE IMPLEMENTED`)
}

/**
 * Step 4: Schedule theory subjects with load balancing
 */
async function scheduleTheory(timetables, sections) {
  console.log(`   📊 Using load balancing for optimal theory distribution`)
  
  // TODO: Implement theory scheduling
  
  console.log(`   ℹ️  Theory scheduling - TO BE IMPLEMENTED`)
}

/**
 * Step 5: Assign teachers to labs dynamically
 */
async function assignLabTeachers(timetables, sections) {
  console.log(`   👥 Attempting 2 teachers per lab, falling back to 1 if needed`)
  
  // TODO: Implement teacher assignment
  
  console.log(`   ℹ️  Teacher assignment - TO BE IMPLEMENTED`)
}

/**
 * Step 6: Validate all constraints
 */
function validateConstraints(timetables, sections) {
  console.log(`   🔍 Checking:`)
  console.log(`      - No teacher conflicts`)
  console.log(`      - No room conflicts`)
  console.log(`      - Batch synchronization`)
  console.log(`      - No consecutive labs`)
  
  // TODO: Implement validation
  
  console.log(`   ℹ️  Validation - TO BE IMPLEMENTED`)
}

/**
 * Step 7: Save all timetables to database
 */
async function saveTimetables(timetables) {
  const savedTimetables = []
  
  for (const sectionId in timetables) {
    const timetableData = timetables[sectionId]
    
    // Delete existing timetable for this section (if any)
    await Timetable.deleteOne({
      section_id: timetableData.section_id,
      sem_type: timetableData.sem_type,
      academic_year: timetableData.academic_year
    })
    
    // Create new timetable
    const timetable = await Timetable.create(timetableData)
    savedTimetables.push(timetable)
    
    console.log(`   💾 Saved timetable for Section ${timetableData.section_name}`)
  }
  
  return savedTimetables
}
