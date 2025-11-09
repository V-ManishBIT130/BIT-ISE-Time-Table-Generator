/**
 * STEP 6: Assign Lab Teachers (COMPLETE IMPLEMENTATION)
 * 
 * Purpose: Assign teachers to lab sessions with global conflict checking and workload balancing
 * 
 * Requirements:
 * - Each batch gets its own 2 teachers (3 batches = 6 teachers total per lab slot)
 * - Check teacher's labs_handled array for compatibility
 * - Balance workload across teachers
 * - Global conflict checking: No teacher in two places at same time across ALL sections
 * - Prefer 2 teachers per batch, fallback to 1 if needed
 * 
 * Input: sem_type, academic_year
 * Output: Timetables with teachers assigned to lab_slots
 */

import Timetable from '../models/timetable_model.js'
import Teacher from '../models/teachers_models.js'

// Global teacher schedule tracker (prevents conflicts across ALL sections)
const globalTeacherSchedule = new Map()

// Teacher workload tracker (for balancing)
const teacherWorkload = new Map()

/**
 * Helper: Check if two time ranges overlap
 */
function timesOverlap(start1, end1, start2, end2) {
  return (start1 < end2 && end1 > start2)
}

/**
 * Helper: Mark teacher as busy in global schedule
 */
function markTeacherBusy(teacherId, day, startTime, endTime, context) {
  const key = `${teacherId}_${day}_${startTime}_${endTime}`
  globalTeacherSchedule.set(key, context)
}

/**
 * Helper: Check if teacher is available at given time (global check)
 */
function isTeacherAvailable(teacherId, day, startTime, endTime) {
  // Check if teacher is busy at this exact time
  const key = `${teacherId}_${day}_${startTime}_${endTime}`
  if (globalTeacherSchedule.has(key)) {
    return false
  }
  
  // Also check for overlapping time slots
  for (const [existingKey, context] of globalTeacherSchedule.entries()) {
    const [existingTeacherId, existingDay, existingStart, existingEnd] = existingKey.split('_')
    
    if (existingTeacherId === teacherId && existingDay === day) {
      if (timesOverlap(startTime, endTime, existingStart, existingEnd)) {
        return false
      }
    }
  }
  
  return true
}

/**
 * Helper: Increment teacher workload counter
 */
function incrementTeacherWorkload(teacherId) {
  const currentLoad = teacherWorkload.get(teacherId) || 0
  teacherWorkload.set(teacherId, currentLoad + 1)
}

/**
 * Helper: Get teacher workload
 */
function getTeacherWorkload(teacherId) {
  return teacherWorkload.get(teacherId) || 0
}

/**
 * Helper: Build global teacher schedule from all timetables
 */
function buildGlobalTeacherSchedule(timetables) {
  console.log('📊 Building global teacher schedule...')
  globalTeacherSchedule.clear()
  teacherWorkload.clear()
  
  let theorySlotCount = 0
  let labSlotCount = 0
  
  for (const timetable of timetables) {
    // Process theory slots
    const theorySlots = timetable.theory_slots || []
    for (const slot of theorySlots) {
      if (slot.teacher_id) {
        const teacherId = slot.teacher_id.toString()
        markTeacherBusy(
          teacherId,
          slot.day,
          slot.start_time,
          slot.end_time,
          {
            type: 'theory',
            section: timetable.section_name,
            subject: slot.subject_name
          }
        )
        incrementTeacherWorkload(teacherId)
        theorySlotCount++
      }
    }
    
    // Process existing lab slots (from previous runs or other sections)
    const labSlots = timetable.lab_slots || []
    for (const labSlot of labSlots) {
      const batches = labSlot.batches || []
      for (const batch of batches) {
        // Mark teacher1 as busy
        if (batch.teacher1_id) {
          const teacherId = batch.teacher1_id.toString()
          markTeacherBusy(
            teacherId,
            labSlot.day,
            labSlot.start_time,
            labSlot.end_time,
            {
              type: 'lab',
              section: timetable.section_name,
              batch: batch.batch_name,
              lab: batch.lab_name
            }
          )
          incrementTeacherWorkload(teacherId)
          labSlotCount++
        }
        
        // Mark teacher2 as busy
        if (batch.teacher2_id) {
          const teacherId = batch.teacher2_id.toString()
          markTeacherBusy(
            teacherId,
            labSlot.day,
            labSlot.start_time,
            labSlot.end_time,
            {
              type: 'lab',
              section: timetable.section_name,
              batch: batch.batch_name,
              lab: batch.lab_name
            }
          )
          incrementTeacherWorkload(teacherId)
          labSlotCount++
        }
      }
    }
  }
  
  console.log(`   ✓ Tracked ${theorySlotCount} theory slots`)
  console.log(`   ✓ Tracked ${labSlotCount} lab teacher assignments`)
  console.log(`   ✓ Total unique teacher-time combinations: ${globalTeacherSchedule.size}`)
}

/**
 * Main function: Assign Lab Teachers
 */
export async function assignLabTeachers(semType, academicYear) {
  console.log(`\n👨‍🏫 Step 6: Assigning teachers to labs for ${semType} semester...`)
  
  try {
    // STEP 1: Clear all existing teacher assignments from previous runs
    console.log(`🧹 Clearing previous teacher assignments...`)
    const clearResult = await Timetable.updateMany(
      {
        sem_type: semType,
        academic_year: academicYear
      },
      {
        $set: {
          'lab_slots.$[].batches.$[].teacher1_id': null,
          'lab_slots.$[].batches.$[].teacher1_name': null,
          'lab_slots.$[].batches.$[].teacher1_shortform': null,
          'lab_slots.$[].batches.$[].teacher2_id': null,
          'lab_slots.$[].batches.$[].teacher2_name': null,
          'lab_slots.$[].batches.$[].teacher2_shortform': null
        }
      }
    )
    console.log(`   ✓ Cleared teacher assignments from ${clearResult.modifiedCount} timetable(s)`)
    
    // STEP 2: Load ALL timetables (now with clean lab slots)
    const allTimetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).populate('section_id').lean()
    
    if (allTimetables.length === 0) {
      throw new Error('No timetables found. Please run Steps 1-5 first.')
    }
    
    console.log(`📋 Found ${allTimetables.length} timetables to process`)
    
    // STEP 3: Build global teacher schedule (only theory slots now, no old lab assignments)
    try {
      buildGlobalTeacherSchedule(allTimetables)
    } catch (buildError) {
      console.error('❌ Error building global schedule:', buildError)
      throw new Error(`Failed to build global schedule: ${buildError.message}`)
    }
    
    // Statistics
    let totalBatches = 0
    let batchesWithTwoTeachers = 0
    let batchesWithOneTeacher = 0
    let batchesWithNoTeachers = 0
    
    // Process each timetable
    for (const timetable of allTimetables) {
      try {
        const section = timetable.section_id
        
        // Safety check for section_id
        if (!section) {
          console.log(`\n⚠️ Skipping timetable with missing section_id`)
          continue
        }
        
        console.log(`\n🎯 Processing Section: ${section.sem}${section.section_name}`)
        
        // Get all lab slots
        const labSlots = timetable.lab_slots || []
        
        if (labSlots.length === 0) {
          console.log(`   ℹ️  No lab slots to assign teachers`)
          continue
        }
        
        console.log(`   📚 Found ${labSlots.length} lab slots`)
      
      // For each lab slot
      for (const labSlot of labSlots) {
        const day = labSlot.day
        const startTime = labSlot.start_time
        const endTime = labSlot.end_time
        const batches = labSlot.batches || []
        
        console.log(`   🔍 Lab Session: ${day} ${startTime}-${endTime} (${batches.length} batches)`)
        
        // For each batch in this lab slot, assign 2 teachers
        for (const batch of batches) {
          totalBatches++
          const labId = batch.lab_id
          const labName = batch.lab_name
          const batchName = batch.batch_name
          
          console.log(`      📝 Batch ${batchName} - ${labName}`)
          
          // Skip if no lab_id (shouldn't happen, but safety check)
          if (!labId) {
            console.log(`         ⚠️  No lab_id for batch ${batchName}`)
            batchesWithNoTeachers++
            continue
          }
          
          // Find teachers who can handle this specific lab
          // Use $in operator to check if labs_handled array contains this lab_id
          const eligibleTeachers = await Teacher.find({
            labs_handled: { $in: [labId] }
          }).lean()
          
          console.log(`         🔍 Searching for teachers with lab_id: ${labId}`)
          
          if (eligibleTeachers.length === 0) {
            console.log(`         ⚠️  No teachers found who can handle ${labName}`)
            batchesWithNoTeachers++
            continue
          }
          
          console.log(`         ✓ Found ${eligibleTeachers.length} eligible teacher(s)`)
          
          // Filter available teachers (not busy at this time)
          const availableTeachers = eligibleTeachers.filter(teacher => {
            const teacherId = teacher._id.toString()
            return isTeacherAvailable(teacherId, day, startTime, endTime)
          })
          
          if (availableTeachers.length === 0) {
            console.log(`         ❌ All teachers are busy at this time`)
            batchesWithNoTeachers++
            continue
          }
          
          console.log(`         ✓ ${availableTeachers.length} teacher(s) available`)
          
          // Sort by workload (ascending) for balanced assignment
          availableTeachers.sort((a, b) => {
            const loadA = getTeacherWorkload(a._id.toString())
            const loadB = getTeacherWorkload(b._id.toString())
            return loadA - loadB
          })
          
          // Assign teachers (prefer 2, fallback to 1)
          const teachersToAssign = availableTeachers.slice(0, Math.min(2, availableTeachers.length))
          
          // Track assigned teachers for logging
          let assignedTeacher1 = null
          let assignedTeacher2 = null
          
          // Assign Teacher 1
          if (teachersToAssign.length >= 1) {
            assignedTeacher1 = teachersToAssign[0]
            batch.teacher1_id = assignedTeacher1._id
            batch.teacher1_name = assignedTeacher1.name
            batch.teacher1_shortform = assignedTeacher1.teacher_shortform
            
            // Mark teacher as busy and increment workload
            markTeacherBusy(
              assignedTeacher1._id.toString(),
              day,
              startTime,
              endTime,
              {
                type: 'lab',
                section: section.sem + section.section_name,
                batch: batchName,
                lab: labName
              }
            )
            incrementTeacherWorkload(assignedTeacher1._id.toString())
          }
          
          // Assign Teacher 2
          if (teachersToAssign.length >= 2) {
            assignedTeacher2 = teachersToAssign[1]
            batch.teacher2_id = assignedTeacher2._id
            batch.teacher2_name = assignedTeacher2.name
            batch.teacher2_shortform = assignedTeacher2.teacher_shortform
            
            // Mark teacher as busy and increment workload
            markTeacherBusy(
              assignedTeacher2._id.toString(),
              day,
              startTime,
              endTime,
              {
                type: 'lab',
                section: section.sem + section.section_name,
                batch: batchName,
                lab: labName
              }
            )
            incrementTeacherWorkload(assignedTeacher2._id.toString())
            
            batchesWithTwoTeachers++
            console.log(`         ✅ Assigned 2 teachers: ${assignedTeacher1.teacher_shortform}, ${assignedTeacher2.teacher_shortform}`)
          } else if (teachersToAssign.length === 1) {
            batchesWithOneTeacher++
            console.log(`         ⚠️  Assigned 1 teacher: ${assignedTeacher1.teacher_shortform}`)
          }
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
            ],
            'generation_metadata.teacher_assignment_summary': {
              total_batches: labSlots.reduce((sum, slot) => sum + (slot.batches?.length || 0), 0),
              batches_with_2_teachers: labSlots.reduce((sum, slot) => {
                return sum + (slot.batches?.filter(b => b.teacher1_id && b.teacher2_id).length || 0)
              }, 0),
              batches_with_1_teacher: labSlots.reduce((sum, slot) => {
                return sum + (slot.batches?.filter(b => (b.teacher1_id || b.teacher2_id) && !(b.teacher1_id && b.teacher2_id)).length || 0)
              }, 0),
              batches_with_0_teachers: labSlots.reduce((sum, slot) => {
                return sum + (slot.batches?.filter(b => !b.teacher1_id && !b.teacher2_id).length || 0)
              }, 0)
            }
          }
        }
      )
      
      } catch (sectionError) {
        console.error(`❌ Error processing section ${timetable.section_name}:`, sectionError)
        // Continue with next section instead of failing completely
      }
    }
    
    console.log(`\n✅ Step 6 Complete: Teacher Assignment Summary`)
    console.log(`   📊 Total Lab Batches: ${totalBatches}`)
    console.log(`   👥 Batches with 2 teachers: ${batchesWithTwoTeachers}`)
    console.log(`   👤 Batches with 1 teacher: ${batchesWithOneTeacher}`)
    console.log(`   ❌ Batches with no teachers: ${batchesWithNoTeachers}`)
    
    const successRate = totalBatches > 0 
      ? ((batchesWithTwoTeachers + batchesWithOneTeacher) / totalBatches * 100).toFixed(2) 
      : 0
    
    console.log(`   📈 Success Rate: ${successRate}%`)
    
    // Display teacher workload distribution
    console.log(`\n📊 Teacher Workload Distribution:`)
    const workloadEntries = Array.from(teacherWorkload.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 most loaded teachers
    
    for (const [teacherId, load] of workloadEntries) {
      console.log(`   Teacher ${teacherId}: ${load} assignments`)
    }
    
    return {
      success: true,
      message: 'Teacher assignment completed',
      data: {
        sections_processed: allTimetables.length,
        total_batches: totalBatches,
        batches_with_two_teachers: batchesWithTwoTeachers,
        batches_with_one_teacher: batchesWithOneTeacher,
        batches_with_no_teachers: batchesWithNoTeachers,
        success_rate: successRate
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Step 6:', error)
    throw error
  }
}
