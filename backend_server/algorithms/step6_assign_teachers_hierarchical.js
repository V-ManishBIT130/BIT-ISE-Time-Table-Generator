/**
 * STEP 6: HIERARCHICAL LAB TEACHER ASSIGNMENT
 * 
 * Purpose: Assign teachers to lab sessions respecting organizational hierarchy and workload limits
 * 
 * Three-Phase Algorithm:
 * - Phase 1: STRICT HIERARCHICAL ASSIGNMENT (all teachers respect limits)
 * - Phase 2: FALLBACK TO ASSISTANT PROFESSORS (flexible limits)
 * - Phase 3: BALANCE ASSISTANT PROFESSORS (minimize workload imbalance)
 * 
 * Hierarchy:
 * - Professor (including HOD): Minimal workload (typically 2 labs/week max)
 * - Associate Professor: Moderate workload (typically 4 labs/week max)
 * - Assistant Professor: Flexible workload (can exceed limits to absorb overflow)
 * 
 * Input: sem_type ('odd' or 'even'), academic_year
 * Output: Timetables with teachers assigned + workload report
 */

import Timetable from '../models/timetable_model.js'
import Teacher from '../models/teachers_models.js'

// Global tracking structures
const globalTeacherSchedule = new Map() // Teacher time slot occupancy
const teacherBatchCounts = new Map()    // Teacher batch assignment counts
const unassignedBatches = []            // Batches that couldn't be assigned in Phase 1

/**
 * Helper: Shuffle array (Fisher-Yates algorithm)
 */
function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Helper: Convert time to minutes since midnight
 */
function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Helper: Check if two time ranges overlap
 */
function timesOverlap(start1, end1, start2, end2) {
  const s1 = toMinutes(start1)
  const e1 = toMinutes(end1)
  const s2 = toMinutes(start2)
  const e2 = toMinutes(end2)
  
  // Overlap if: start1 < end2 AND start2 < end1
  return (s1 < e2 && s2 < e1)
}

/**
 * Helper: Check if teacher is available at given time
 */
function isTeacherAvailable(teacherId, day, startTime, endTime) {
  const scheduleKey = `${teacherId}_${day}`
  
  if (!globalTeacherSchedule.has(scheduleKey)) {
    return true // No schedule for this teacher on this day
  }
  
  const daySchedule = globalTeacherSchedule.get(scheduleKey)
  
  // Check each existing time slot for overlaps
  for (const existingSlot of daySchedule) {
    if (timesOverlap(startTime, endTime, existingSlot.start, existingSlot.end)) {
      return false // Conflict found
    }
  }
  
  return true // No conflicts
}

/**
 * Helper: Mark teacher as busy in global schedule
 */
function markTeacherBusy(teacherId, day, startTime, endTime, context) {
  const scheduleKey = `${teacherId}_${day}`
  
  if (!globalTeacherSchedule.has(scheduleKey)) {
    globalTeacherSchedule.set(scheduleKey, [])
  }
  
  globalTeacherSchedule.get(scheduleKey).push({
    start: startTime,
    end: endTime,
    context: context
  })
}

/**
 * Helper: Increment teacher batch count
 */
function incrementTeacherBatchCount(teacherId) {
  const currentCount = teacherBatchCounts.get(teacherId) || 0
  teacherBatchCounts.set(teacherId, currentCount + 1)
}

/**
 * Helper: Get teacher batch count
 */
function getTeacherBatchCount(teacherId) {
  return teacherBatchCounts.get(teacherId) || 0
}

/**
 * Initialize global tracking from existing theory assignments
 */
function buildGlobalTeacherSchedule(timetables) {
  console.log('\n📊 Initializing global teacher schedule from theory slots...')
  globalTeacherSchedule.clear()
  teacherBatchCounts.clear()
  
  let theorySlotCount = 0
  
  for (const timetable of timetables) {
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
        theorySlotCount++
      }
    }
  }
  
  console.log(`   ✓ Tracked ${theorySlotCount} theory slot assignments`)
  console.log(`   ✓ ${globalTeacherSchedule.size} teachers have existing schedules\n`)
}

/**
 * PHASE 1: STRICT HIERARCHICAL ASSIGNMENT
 * 
 * Assigns lab teachers respecting ALL workload limits (including Assistant Professors)
 * Priority: Professor → Associate Professor → Assistant Professor
 * Within priority: Least-loaded first (for fairness)
 */
async function phase1StrictAssignment(timetables, teachers, semType) {
  console.log('🎯 PHASE 1: Strict Hierarchical Assignment\n')
  
  unassignedBatches.length = 0 // Clear array
  
  let assignedCount = 0
  let skippedCount = 0
  
  // Separate teachers by position
  const professors = teachers.filter(t => t.teacher_position === 'Professor')
  const associates = teachers.filter(t => t.teacher_position === 'Associate Professor')
  const assistants = teachers.filter(t => t.teacher_position === 'Assistant Professor')
  
  console.log(`   📋 Teacher Pool:`)
  console.log(`      - Professors: ${professors.length}`)
  console.log(`      - Associate Professors: ${associates.length}`)
  console.log(`      - Assistant Professors: ${assistants.length}\n`)
  
  for (const timetable of timetables) {
    const section = timetable.section_id || timetable.section_name
    console.log(`   📂 Section ${timetable.section_name}:`)
    
    const labSlots = timetable.lab_slots || []
    
    for (const labSlot of labSlots) {
      const { day, start_time, end_time, batches = [] } = labSlot
      
      console.log(`      🧪 Lab ${day} ${start_time}-${end_time}: ${batches.length} batches`)
      
      for (const batch of batches) {
        const { lab_id, lab_name, batch_name } = batch
        
        // Find qualified teachers (can teach this lab)
        const qualifiedProfs = professors.filter(t => 
          t.labs_handled.some(lab => lab.toString() === lab_id.toString())
        )
        const qualifiedAssocs = associates.filter(t => 
          t.labs_handled.some(lab => lab.toString() === lab_id.toString())
        )
        const qualifiedAssts = assistants.filter(t => 
          t.labs_handled.some(lab => lab.toString() === lab_id.toString())
        )
        
        // Try to assign TWO teachers in hierarchy order
        const priorityGroups = [
          { name: 'Professor', teachers: qualifiedProfs },
          { name: 'Associate', teachers: qualifiedAssocs },
          { name: 'Assistant', teachers: qualifiedAssts }
        ]
        
        let teacher1Assigned = false
        let teacher2Assigned = false
        let teacher1Id = null
        
        // ===== ASSIGN FIRST TEACHER =====
        for (const group of priorityGroups) {
          if (teacher1Assigned) break
          
          // Sort by current workload (least-loaded first)
          group.teachers.sort((a, b) => {
            const countA = getTeacherBatchCount(a._id.toString())
            const countB = getTeacherBatchCount(b._id.toString())
            return countA - countB
          })
          
          // Add randomization: shuffle teachers with same workload count
          const groupedByCount = {}
          group.teachers.forEach(t => {
            const count = getTeacherBatchCount(t._id.toString())
            if (!groupedByCount[count]) groupedByCount[count] = []
            groupedByCount[count].push(t)
          })
          
          // Shuffle each workload group and flatten back
          const shuffledTeachers = Object.keys(groupedByCount)
            .sort((a, b) => Number(a) - Number(b))
            .flatMap(count => shuffleArray(groupedByCount[count]))
          
          for (const teacher of shuffledTeachers) {
            const teacherId = teacher._id.toString()
            
            // Get appropriate limit based on semester type
            const limit = semType.toLowerCase() === 'even' 
              ? teacher.max_lab_assign_even 
              : teacher.max_lab_assign_odd
            
            const currentCount = getTeacherBatchCount(teacherId)
            
            // STRICT CHECK: Don't exceed limit in Phase 1
            if (currentCount >= limit) {
              continue // Try next teacher
            }
            
            // Check time availability
            if (!isTeacherAvailable(teacherId, day, start_time, end_time)) {
              continue // Try next teacher
            }
            
            // FIRST TEACHER ASSIGNMENT SUCCESSFUL
            batch.teacher1_id = teacher._id
            batch.teacher1_name = teacher.name
            batch.teacher1_shortform = teacher.teacher_shortform
            
            // Mark as busy and increment count
            markTeacherBusy(
              teacherId,
              day,
              start_time,
              end_time,
              {
                type: 'lab',
                section: timetable.section_name,
                batch: batch_name,
                lab: lab_name
              }
            )
            incrementTeacherBatchCount(teacherId)
            
            teacher1Assigned = true
            teacher1Id = teacherId
            assignedCount++
            console.log(`         ✅ ${batch_name} T1: ${teacher.teacher_shortform} (${group.name}, ${currentCount + 1}/${limit})`)
            break
          }
        }
        
        // ===== ASSIGN SECOND TEACHER =====
        if (teacher1Assigned) {
          for (const group of priorityGroups) {
            if (teacher2Assigned) break
            
            // Sort by current workload (least-loaded first)
            group.teachers.sort((a, b) => {
              const countA = getTeacherBatchCount(a._id.toString())
              const countB = getTeacherBatchCount(b._id.toString())
              return countA - countB
            })
            
            // Add randomization: shuffle teachers with same workload count
            const groupedByCount = {}
            group.teachers.forEach(t => {
              const count = getTeacherBatchCount(t._id.toString())
              if (!groupedByCount[count]) groupedByCount[count] = []
              groupedByCount[count].push(t)
            })
            
            // Shuffle each workload group and flatten back
            const shuffledTeachers = Object.keys(groupedByCount)
              .sort((a, b) => Number(a) - Number(b))
              .flatMap(count => shuffleArray(groupedByCount[count]))
            
            for (const teacher of shuffledTeachers) {
              const teacherId = teacher._id.toString()
              
              // CRITICAL: Must be different from teacher1
              if (teacherId === teacher1Id) {
                continue
              }
              
              // Get appropriate limit based on semester type
              const limit = semType.toLowerCase() === 'even' 
                ? teacher.max_lab_assign_even 
                : teacher.max_lab_assign_odd
              
              const currentCount = getTeacherBatchCount(teacherId)
              
              // STRICT CHECK: Don't exceed limit in Phase 1
              if (currentCount >= limit) {
                continue // Try next teacher
              }
              
              // Check time availability
              if (!isTeacherAvailable(teacherId, day, start_time, end_time)) {
                continue // Try next teacher
              }
              
              // SECOND TEACHER ASSIGNMENT SUCCESSFUL
              batch.teacher2_id = teacher._id
              batch.teacher2_name = teacher.name
              batch.teacher2_shortform = teacher.teacher_shortform
              
              // Mark as busy and increment count
              markTeacherBusy(
                teacherId,
                day,
                start_time,
                end_time,
                {
                  type: 'lab',
                  section: timetable.section_name,
                  batch: batch_name,
                  lab: lab_name,
                  role: 'teacher2'
                }
              )
              incrementTeacherBatchCount(teacherId)
              
              teacher2Assigned = true
              assignedCount++
              console.log(`         ✅ ${batch_name} T2: ${teacher.teacher_shortform} (${group.name}, ${currentCount + 1}/${limit})`)
              break
            }
          }
        }
        
        // If couldn't assign BOTH teachers in Phase 1, save for Phase 2
        if (!teacher1Assigned || !teacher2Assigned) {
          unassignedBatches.push({
            timetable: timetable,
            labSlot: labSlot,
            batch: batch,
            lab_id: lab_id,
            day: day,
            start_time: start_time,
            end_time: end_time,
            semType: semType,
            hasTeacher1: teacher1Assigned,
            hasTeacher2: teacher2Assigned,
            teacher1Id: teacher1Id
          })
          skippedCount++
          const status = !teacher1Assigned ? 'No T1+T2' : 'Only T1 (need T2)'
          console.log(`         ⏭️  ${batch_name}: ${status} - Deferred to Phase 2`)
        }
      }
    }
    console.log() // Blank line between sections
  }
  
  console.log(`   📊 Phase 1 Results:`)
  console.log(`      ✅ Assigned: ${assignedCount} batches`)
  console.log(`      ⏭️  Deferred: ${skippedCount} batches\n`)
}

/**
 * PHASE 2: FALLBACK TO ASSISTANT PROFESSORS (FLEXIBLE LIMITS)
 * 
 * Assigns remaining labs by allowing Assistant Professors to exceed their limits
 * Professors and Associates NEVER exceed
 */
async function phase2FallbackAssignment(teachers, semType) {
  console.log('🎯 PHASE 2: Fallback to Assistant Professors\n')
  
  if (unassignedBatches.length === 0) {
    console.log('   ✅ No batches need fallback assignment\n')
    return
  }
  
  const assistants = teachers.filter(t => t.teacher_position === 'Assistant Professor')
  
  console.log(`   📋 ${unassignedBatches.length} batches to assign`)
  console.log(`   👥 ${assistants.length} Assistant Professors available\n`)
  
  let assignedCount = 0
  let failedCount = 0
  
  for (const item of unassignedBatches) {
    const { timetable, batch, lab_id, day, start_time, end_time, hasTeacher1, hasTeacher2, teacher1Id, semType } = item
    
    // Find qualified Assistant Professors
    const qualifiedAssts = assistants.filter(t => 
      t.labs_handled.some(lab => lab.toString() === lab_id.toString())
    )
    
    if (qualifiedAssts.length === 0) {
      console.log(`   ❌ ${timetable.section_name} ${batch.batch_name}: No Assistant Professor can teach ${batch.lab_name}`)
      failedCount++
      continue
    }
    
    // Sort by current batch count (least-loaded first)
    qualifiedAssts.sort((a, b) => {
      const countA = getTeacherBatchCount(a._id.toString())
      const countB = getTeacherBatchCount(b._id.toString())
      return countA - countB
    })
    
    // Add randomization: shuffle teachers with same workload count
    const groupedByCount = {}
    qualifiedAssts.forEach(t => {
      const count = getTeacherBatchCount(t._id.toString())
      if (!groupedByCount[count]) groupedByCount[count] = []
      groupedByCount[count].push(t)
    })
    
    // Shuffle each workload group and flatten back
    const shuffledAssts = Object.keys(groupedByCount)
      .sort((a, b) => Number(a) - Number(b))
      .flatMap(count => shuffleArray(groupedByCount[count]))
    
    let teacher1Assigned = hasTeacher1 || false
    let teacher2Assigned = hasTeacher2 || false
    let currentTeacher1Id = teacher1Id || null
    
    // ASSIGN FIRST TEACHER (if not already assigned)
    if (!teacher1Assigned) {
      for (const teacher of shuffledAssts) {
        const teacherId = teacher._id.toString()
        
        // Check time availability
        if (!isTeacherAvailable(teacherId, day, start_time, end_time)) {
          continue
        }
        
        // ASSIGNMENT SUCCESSFUL (ignore limits - this is fallback)
        batch.teacher1_id = teacher._id
        batch.teacher1_name = teacher.name
        batch.teacher1_shortform = teacher.teacher_shortform
        
        // Mark as busy and increment count
        markTeacherBusy(
          teacherId,
          day,
          start_time,
          end_time,
          {
            type: 'lab',
            section: timetable.section_name,
            batch: batch.batch_name,
            lab: batch.lab_name
          }
        )
        incrementTeacherBatchCount(teacherId)
        
        const limit = semType.toLowerCase() === 'even' 
          ? teacher.max_lab_assign_even 
          : teacher.max_lab_assign_odd
        const currentCount = getTeacherBatchCount(teacherId)
        const overflow = currentCount > limit ? currentCount - limit : 0
        
        teacher1Assigned = true
        currentTeacher1Id = teacherId
        console.log(`   ✅ T1: ${timetable.section_name} ${batch.batch_name}: ${teacher.teacher_shortform} (${currentCount}/${limit}${overflow > 0 ? ` +${overflow}` : ''})`)
        break
      }
    }
    
    // ASSIGN SECOND TEACHER (if not already assigned, must be different from teacher1)
    if (teacher1Assigned && !teacher2Assigned) {
      for (const teacher of shuffledAssts) {
        const teacherId = teacher._id.toString()
        
        // Must be different teacher
        if (teacherId === currentTeacher1Id) {
          continue
        }
        
        // Check time availability
        if (!isTeacherAvailable(teacherId, day, start_time, end_time)) {
          continue
        }
        
        // ASSIGNMENT SUCCESSFUL (ignore limits - this is fallback)
        batch.teacher2_id = teacher._id
        batch.teacher2_name = teacher.name
        batch.teacher2_shortform = teacher.teacher_shortform
        
        // Mark as busy and increment count
        markTeacherBusy(
          teacherId,
          day,
          start_time,
          end_time,
          {
            type: 'lab',
            section: timetable.section_name,
            batch: batch.batch_name,
            lab: batch.lab_name
          }
        )
        incrementTeacherBatchCount(teacherId)
        
        const limit = semType.toLowerCase() === 'even' 
          ? teacher.max_lab_assign_even 
          : teacher.max_lab_assign_odd
        const currentCount = getTeacherBatchCount(teacherId)
        const overflow = currentCount > limit ? currentCount - limit : 0
        
        teacher2Assigned = true
        console.log(`   ✅ T2: ${timetable.section_name} ${batch.batch_name}: ${teacher.teacher_shortform} (${currentCount}/${limit}${overflow > 0 ? ` +${overflow}` : ''})`)
        break
      }
    }
    
    // Check final assignment status
    const fullyAssigned = teacher1Assigned && teacher2Assigned
    if (fullyAssigned) {
      assignedCount++
    } else {
      if (!teacher1Assigned) {
        console.log(`   ❌ T1: ${timetable.section_name} ${batch.batch_name}: All assistants have time conflicts`)
      }
      if (!teacher2Assigned) {
        console.log(`   ❌ T2: ${timetable.section_name} ${batch.batch_name}: All assistants have time conflicts`)
      }
      failedCount++
    }
  }
  
  console.log(`\n   📊 Phase 2 Results:`)
  console.log(`      ✅ Assigned: ${assignedCount} batches`)
  console.log(`      ❌ Partial/Failed: ${failedCount} batches\n`)
  
  if (failedCount > 0) {
    console.log(`   ⚠️  WARNING: ${failedCount} batches have incomplete teacher assignments`)
    console.log(`      These batches may have only 1 teacher or no teachers assigned`)
    console.log(`      Consider: hiring more faculty, adjusting lab schedules, or checking teacher qualifications\n`)
  }
}

/**
 * PHASE 3: BALANCE ASSISTANT PROFESSORS
 * 
 * Minimizes workload imbalance among Assistant Professors through intelligent reassignment
 * Only rebalances if imbalance > 2 batches
 */
async function phase3BalanceAssistants(timetables, teachers) {
  console.log('🎯 PHASE 3: Balance Assistant Professors\n')
  
  const assistants = teachers.filter(t => t.teacher_position === 'Assistant Professor')
  
  // Get assistants with assignments
  const assignedAssistants = assistants.filter(t => 
    getTeacherBatchCount(t._id.toString()) > 0
  )
  
  if (assignedAssistants.length < 2) {
    console.log('   ℹ️  Less than 2 assistants with assignments - balancing not needed\n')
    return
  }
  
  // Calculate imbalance
  const batchCounts = assignedAssistants.map(t => getTeacherBatchCount(t._id.toString()))
  const maxCount = Math.max(...batchCounts)
  const minCount = Math.min(...batchCounts)
  const imbalance = maxCount - minCount
  
  console.log(`   📊 Current Distribution:`)
  assignedAssistants.forEach(t => {
    const count = getTeacherBatchCount(t._id.toString())
    console.log(`      ${t.teacher_shortform}: ${count} batches`)
  })
  console.log(`   📉 Imbalance: ${imbalance} batches (max ${maxCount} - min ${minCount})\n`)
  
  if (imbalance <= 2) {
    console.log('   ✅ Imbalance ≤ 2 - acceptable, no rebalancing needed\n')
    return
  }
  
  console.log('   ⚖️  Attempting rebalancing...\n')
  
  // Identify overloaded and underloaded assistants
  const overloaded = assignedAssistants.filter(t => 
    getTeacherBatchCount(t._id.toString()) === maxCount
  )
  const underloaded = assignedAssistants.filter(t => 
    getTeacherBatchCount(t._id.toString()) === minCount
  )
  
  let rebalancedCount = 0
  const MAX_ATTEMPTS = 50 // Prevent infinite loops
  let attempts = 0
  
  for (const overloadedTeacher of overloaded) {
    const overloadedId = overloadedTeacher._id.toString()
    
    // Find all batches assigned to this overloaded teacher (as teacher1 or teacher2)
    const assignedBatches = []
    
    for (const timetable of timetables) {
      for (const labSlot of timetable.lab_slots || []) {
        for (const batch of labSlot.batches || []) {
          const isTeacher1 = batch.teacher1_id && batch.teacher1_id.toString() === overloadedId
          const isTeacher2 = batch.teacher2_id && batch.teacher2_id.toString() === overloadedId
          
          if (isTeacher1 || isTeacher2) {
            assignedBatches.push({
              timetable,
              labSlot,
              batch,
              day: labSlot.day,
              start_time: labSlot.start_time,
              end_time: labSlot.end_time,
              teacherSlot: isTeacher1 ? 'teacher1' : 'teacher2' // Track which slot
            })
          }
        }
      }
    }
    
    // Try to reassign some batches
    for (const item of assignedBatches) {
      attempts++
      if (attempts > MAX_ATTEMPTS) {
        console.log(`   ⚠️  Reached max attempts (${MAX_ATTEMPTS}), stopping rebalancing\n`)
        return
      }
      
      const { timetable, batch, day, start_time, end_time, teacherSlot } = item
      
      // Try each underloaded teacher
      for (const underloadedTeacher of underloaded) {
        const underloadedId = underloadedTeacher._id.toString()
        
        // Check 1: Can underloaded teacher handle this lab?
        const canHandleLab = underloadedTeacher.labs_handled.some(lab => 
          lab.toString() === batch.lab_id.toString()
        )
        
        if (!canHandleLab) continue
        
        // Check 2: Must not be the same as the OTHER teacher in this batch
        const otherTeacherId = teacherSlot === 'teacher1' 
          ? (batch.teacher2_id ? batch.teacher2_id.toString() : null)
          : (batch.teacher1_id ? batch.teacher1_id.toString() : null)
        
        if (underloadedId === otherTeacherId) continue // Can't have same teacher twice
        
        // Check 3: Does underloaded teacher have time conflict?
        // Temporarily remove old assignment to check availability
        const oldSchedule = globalTeacherSchedule.get(`${overloadedId}_${day}`)
        if (oldSchedule) {
          const index = oldSchedule.findIndex(slot => 
            slot.start === start_time && slot.end === end_time
          )
          if (index !== -1) {
            oldSchedule.splice(index, 1) // Temporarily remove
          }
        }
        
        const hasConflict = !isTeacherAvailable(underloadedId, day, start_time, end_time)
        
        // Restore old schedule
        if (oldSchedule && oldSchedule.length === 0) {
          globalTeacherSchedule.delete(`${overloadedId}_${day}`)
        }
        
        if (hasConflict) continue
        
        // REASSIGNMENT SUCCESSFUL - Update the specific teacher slot
        if (teacherSlot === 'teacher1') {
          batch.teacher1_id = underloadedTeacher._id
          batch.teacher1_name = underloadedTeacher.name
          batch.teacher1_shortform = underloadedTeacher.teacher_shortform
        } else {
          batch.teacher2_id = underloadedTeacher._id
          batch.teacher2_name = underloadedTeacher.name
          batch.teacher2_shortform = underloadedTeacher.teacher_shortform
        }
        
        // Update counts
        teacherBatchCounts.set(overloadedId, getTeacherBatchCount(overloadedId) - 1)
        teacherBatchCounts.set(underloadedId, getTeacherBatchCount(underloadedId) + 1)
        
        // Update schedule
        const scheduleKey = `${underloadedId}_${day}`
        if (!globalTeacherSchedule.has(scheduleKey)) {
          globalTeacherSchedule.set(scheduleKey, [])
        }
        globalTeacherSchedule.get(scheduleKey).push({
          start: start_time,
          end: end_time,
          context: {
            type: 'lab',
            section: timetable.section_name,
            batch: batch.batch_name,
            lab: batch.lab_name
          }
        })
        
        rebalancedCount++
        console.log(`   ♻️  Reassigned ${timetable.section_name} ${batch.batch_name} (${teacherSlot}) from ${overloadedTeacher.teacher_shortform} to ${underloadedTeacher.teacher_shortform}`)
        
        // Check if balanced enough now
        const newCounts = assignedAssistants.map(t => getTeacherBatchCount(t._id.toString()))
        const newMax = Math.max(...newCounts)
        const newMin = Math.min(...newCounts)
        const newImbalance = newMax - newMin
        
        if (newImbalance <= 2) {
          console.log(`\n   ✅ Balanced! New imbalance: ${newImbalance}\n`)
          return
        }
        
        break // Move to next batch
      }
      
      // Check if this teacher is no longer overloaded
      if (getTeacherBatchCount(overloadedId) <= maxCount - 2) {
        break
      }
    }
  }
  
  // Final report
  console.log(`\n   📊 Rebalancing Results:`)
  console.log(`      ♻️  Reassignments: ${rebalancedCount}`)
  
  const finalCounts = assignedAssistants.map(t => getTeacherBatchCount(t._id.toString()))
  const finalMax = Math.max(...finalCounts)
  const finalMin = Math.min(...finalCounts)
  const finalImbalance = finalMax - finalMin
  
  console.log(`      📉 Final Imbalance: ${finalImbalance} batches`)
  
  if (finalImbalance > 2) {
    console.log(`      ⚠️  Could not achieve perfect balance (constraint complexity)\n`)
  } else {
    console.log(`      ✅ Balanced successfully\n`)
  }
}

/**
 * Generate Workload Report
 */
function generateWorkloadReport(teachers, semType) {
  console.log('📋 WORKLOAD REPORT\n')
  
  const report = []
  
  // Validation: Check if Professors/Associates exceeded limits
  for (const teacher of teachers) {
    const teacherId = teacher._id.toString()
    const assigned = getTeacherBatchCount(teacherId)
    
    if (assigned === 0) continue // Skip teachers with no assignments
    
    const limit = semType.toLowerCase() === 'even' 
      ? (teacher.max_lab_assign_even || 6)  // Fallback to 6 if undefined
      : (teacher.max_lab_assign_odd || 6)   // Fallback to 6 if undefined
    
    // Check if limits are missing (shouldn't happen after migration)
    if (!teacher.max_lab_assign_even && !teacher.max_lab_assign_odd) {
      console.warn(`⚠️  Teacher ${teacher.name} missing workload limits, using defaults`)
    }
    
    const overflow = assigned > limit ? assigned - limit : 0
    const status = assigned > limit ? 'EXCEEDED' : 'OK'
    
    // CRITICAL BUG CHECK: Professors/Associates should NEVER exceed
    if (teacher.teacher_position !== 'Assistant Professor' && overflow > 0) {
      console.error(`\n❌ CRITICAL BUG: ${teacher.name} (${teacher.teacher_position}) exceeded limit!`)
      console.error(`   Assigned: ${assigned}, Limit: ${limit}, Overflow: ${overflow}`)
      throw new Error(
        `CRITICAL BUG: ${teacher.name} (${teacher.teacher_position}) exceeded workload limit. ` +
        `This should never happen for Professors or Associates!`
      )
    }
    
    report.push({
      name: teacher.name,
      shortform: teacher.teacher_shortform,
      position: teacher.teacher_position,
      limit: limit,
      assigned: assigned,
      status: status,
      overflow: overflow
    })
  }
  
  // Sort by position priority, then by assigned count
  const positionOrder = { 'Professor': 1, 'Associate Professor': 2, 'Assistant Professor': 3 }
  report.sort((a, b) => {
    const orderDiff = positionOrder[a.position] - positionOrder[b.position]
    if (orderDiff !== 0) return orderDiff
    return b.assigned - a.assigned
  })
  
  // Display report
  console.log('   Teacher                          | Position      | Limit | Assigned | Status')
  console.log('   ' + '-'.repeat(80))
  
  for (const r of report) {
    const name = r.name.padEnd(32)
    const pos = r.position.padEnd(13)
    const limit = (r.limit || 0).toString().padStart(5)
    const assigned = (r.assigned || 0).toString().padStart(8)
    const status = r.status === 'OK' 
      ? '✅ OK' 
      : `⚠️  +${r.overflow}`
    
    console.log(`   ${name} | ${pos} | ${limit} | ${assigned} | ${status}`)
  }
  
  // Warnings for significant overflow
  const warnings = report.filter(r => 
    r.position === 'Assistant Professor' && r.overflow > 3
  )
  
  if (warnings.length > 0) {
    console.log('\n   ⚠️  STAFFING ALERT:')
    console.log('   The following Assistant Professors significantly exceeded their limits:')
    warnings.forEach(w => {
      console.log(`      - ${w.name}: ${w.assigned}/${w.limit} (exceeded by ${w.overflow})`)
    })
    console.log('   Consider hiring additional faculty or adjusting limits.\n')
  } else {
    console.log()
  }
  
  return { report, warnings: warnings.length > 0 ? warnings : null }
}

/**
 * MAIN FUNCTION: Hierarchical Lab Teacher Assignment
 */
export async function assignLabTeachersHierarchical(semType, academicYear) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`👨‍🏫 STEP 6: HIERARCHICAL LAB TEACHER ASSIGNMENT`)
  console.log(`   Semester Type: ${semType.toUpperCase()}`)
  console.log(`   Academic Year: ${academicYear}`)
  console.log(`${'='.repeat(80)}\n`)
  
  try {
    // Validate semester type
    if (!['odd', 'even'].includes(semType.toLowerCase())) {
      throw new Error(`Invalid semester type: ${semType}. Must be 'odd' or 'even'.`)
    }
    
    // STEP 1: Clear previous teacher assignments
    console.log('🧹 Clearing previous teacher assignments...')
    const clearResult = await Timetable.updateMany(
      { sem_type: semType, academic_year: academicYear },
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
    console.log(`   ✅ Cleared ${clearResult.modifiedCount} timetable(s)\n`)
    
    // STEP 2: Load timetables and teachers
    console.log('📂 Loading data...')
    const timetables = await Timetable.find({
      sem_type: semType,
      academic_year: academicYear
    }).populate('section_id').lean()
    
    if (timetables.length === 0) {
      throw new Error('No timetables found. Please run Steps 1-5 first.')
    }
    
    const teachers = await Teacher.find({})
      .select('name teacher_id teacher_shortform teacher_position max_lab_assign_even max_lab_assign_odd canTeach_subjects labs_handled')
      .lean()
    
    if (teachers.length === 0) {
      throw new Error('No teachers found. Please add teachers first.')
    }
    
    console.log(`   ✅ Loaded ${timetables.length} timetables`)
    console.log(`   ✅ Loaded ${teachers.length} teachers`)
    console.log(`   🔍 Sample teacher fields:`, {
      name: teachers[0].name,
      position: teachers[0].teacher_position,
      even_limit: teachers[0].max_lab_assign_even,
      odd_limit: teachers[0].max_lab_assign_odd
    })
    console.log()
    
    // STEP 3: Initialize global tracking
    buildGlobalTeacherSchedule(timetables)
    
    // STEP 4: THREE-PHASE ASSIGNMENT
    await phase1StrictAssignment(timetables, teachers, semType)
    await phase2FallbackAssignment(teachers, semType)
    await phase3BalanceAssistants(timetables, teachers)
    
    // STEP 5: Save updated timetables
    console.log('💾 Saving updated timetables...')
    for (const timetable of timetables) {
      const labSlots = timetable.lab_slots || []
      
      // Calculate summary statistics
      let totalBatches = 0
      let batchesWith2Teachers = 0
      let batchesWith1Teacher = 0
      let batchesWithoutTeacher = 0
      
      for (const labSlot of labSlots) {
        for (const batch of labSlot.batches || []) {
          totalBatches++
          const hasT1 = !!batch.teacher1_id
          const hasT2 = !!batch.teacher2_id
          
          if (hasT1 && hasT2) {
            batchesWith2Teachers++
          } else if (hasT1 || hasT2) {
            batchesWith1Teacher++
          } else {
            batchesWithoutTeacher++
          }
        }
      }
      
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
              total_lab_batches: totalBatches,
              batches_with_2_teachers: batchesWith2Teachers,
              batches_with_1_teacher: batchesWith1Teacher,
              batches_without_teacher: batchesWithoutTeacher
            }
          }
        }
      )
    }
    console.log(`   ✅ Saved ${timetables.length} timetables\n`)
    
    // STEP 6: Generate and validate workload report
    const { report, warnings } = generateWorkloadReport(teachers, semType)
    
    // STEP 6.5: Check for incomplete assignments
    let totalBatches = 0
    let batchesWith2Teachers = 0
    let batchesWith1Teacher = 0
    let batchesWithoutTeacher = 0
    
    for (const timetable of timetables) {
      for (const labSlot of timetable.lab_slots || []) {
        for (const batch of labSlot.batches || []) {
          totalBatches++
          const hasT1 = !!batch.teacher1_id
          const hasT2 = !!batch.teacher2_id
          
          if (hasT1 && hasT2) {
            batchesWith2Teachers++
          } else if (hasT1 || hasT2) {
            batchesWith1Teacher++
          } else {
            batchesWithoutTeacher++
          }
        }
      }
    }
    
    console.log('📊 ASSIGNMENT SUMMARY:')
    console.log(`   Total Lab Batches: ${totalBatches}`)
    console.log(`   ✅ With 2 Teachers: ${batchesWith2Teachers}`)
    if (batchesWith1Teacher > 0) {
      console.log(`   ⚠️  With 1 Teacher: ${batchesWith1Teacher}`)
    }
    if (batchesWithoutTeacher > 0) {
      console.log(`   ❌ With 0 Teachers: ${batchesWithoutTeacher}`)
    }
    console.log()
    
    // STEP 7: Final summary
    console.log(`${'='.repeat(80)}`)
    console.log('✅ STEP 6 COMPLETE: Teacher Assignment Successful')
    console.log(`${'='.repeat(80)}\n`)
    
    // Calculate success rate for API response
    const successRate = totalBatches > 0 
      ? ((batchesWith2Teachers / totalBatches) * 100).toFixed(2)
      : '0.00'
    
    return {
      success: true,
      message: 'Hierarchical teacher assignment completed successfully',
      data: {
        sections_processed: timetables.length,
        teachers_assigned: report.filter(r => r.assigned > 0).length,
        total_batches: totalBatches,
        batches_with_two_teachers: batchesWith2Teachers,
        batches_with_one_teacher: batchesWith1Teacher,
        batches_with_no_teachers: batchesWithoutTeacher,
        success_rate: successRate,
        workload_report: report,
        warnings: warnings
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR IN STEP 6:', error.message)
    console.error(error.stack)
    throw error
  }
}
