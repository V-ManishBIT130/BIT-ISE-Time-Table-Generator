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
 * 4. Schedule theory subjects with integrated break management
 * 5. Assign teachers to labs dynamically
 * 6. Assign classrooms to theory slots
 * 7. Validate constraints and finalize
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
import { loadSectionsAndInitialize } from './step1_load_sections.js'
import { blockFixedSlots } from './step2_fixed_slots.js'
import { scheduleLabs } from './step3_schedule_labs_v2.js'
import { scheduleTheory } from './step4_schedule_theory_breaks.js'
import { assignLabTeachers } from './step5_assign_teachers.js'
import { assignClassrooms } from './step6_assign_classrooms.js'
import { validateAndFinalize } from './step7_validate.js'

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
    
    // Step 3: Schedule labs using batch rotation (includes automatic conflict resolution)
    console.log(`\n🧪 Step 3: Scheduling labs...`)
    await scheduleLabs(timetables, sections)
    // NOTE: Step 3.5 (Conflict Resolution) runs automatically inside Step 3
    
    // Step 4: Schedule theory subjects
    console.log(`\n📚 Step 4: Scheduling theory subjects...`)
    await scheduleTheory(timetables, sections)
    
    // Step 5: Assign teachers to labs
    console.log(`\n👨‍🏫 Step 5: Assigning teachers to labs...`)
    await assignLabTeachers(timetables, sections)
    
    // Step 6: Assign classrooms to theory slots
    console.log(`\n🏫 Step 6: Assigning classrooms...`)
    await assignClassrooms(semType, academicYear)
    
    // Step 7: Validate constraints
    console.log(`\n✅ Step 7: Validating constraints...`)
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
 * Step 7: Validate all constraints
 */
function validateConstraints(timetables, sections) {
  console.log(`   🔍 Checking:`)
  console.log(`      - No teacher conflicts`)
  console.log(`      - No room conflicts`)
  console.log(`      - No classroom conflicts`)
  console.log(`      - Batch synchronization`)
  console.log(`      - No consecutive labs`)
  console.log(`      - Break constraints`)
  
  // TODO: Implement validation
  
  console.log(`   ℹ️  Validation - TO BE IMPLEMENTED`)
}

/**
 * Step 8: Save all timetables to database
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
