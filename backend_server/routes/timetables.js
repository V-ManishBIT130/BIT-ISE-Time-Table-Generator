import express from 'express'
import Timetable from '../models/timetable_model.js'
import { generateTimetables } from '../algorithms/timetable_generator.js'
import { loadSectionsAndInitialize } from '../algorithms/step1_load_sections.js'
import { blockFixedSlots } from '../algorithms/step2_fixed_slots.js'
import { scheduleLabs } from '../algorithms/step3_schedule_labs_v2.js'
import { scheduleTheory } from '../algorithms/step4_schedule_theory_breaks.js'
import { assignClassrooms } from '../algorithms/step5_assign_classrooms.js'
import { assignLabTeachers } from '../algorithms/step6_assign_teachers.js'
import { validateAndFinalize } from '../algorithms/step7_validate.js'

const router = express.Router()

/**
 * GET /api/timetables
 * Fetch timetables with optional filters
 * Query params:
 * - sem_type: 'odd' or 'even'
 * - sem: semester number (3-8)
 * - section_id: specific section ID
 */
router.get('/', async (req, res) => {
  try {
    const { sem_type, sem, section_id, academic_year } = req.query
    
    const filter = {}
    if (sem_type) filter.sem_type = sem_type
    if (sem) filter.sem = parseInt(sem)
    if (section_id) filter.section_id = section_id
    if (academic_year) filter.academic_year = academic_year
    
    const timetables = await Timetable.find(filter)
      .populate('section_id', 'section_name sem sem_type num_batches')
      .sort({ sem: 1, section_name: 1 })
      .lean()
    
    res.json({
      success: true,
      count: timetables.length,
      data: timetables
    })
    
  } catch (error) {
    console.error('Error fetching timetables:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetables',
      error: error.message
    })
  }
})

/**
 * GET /api/timetables/check-teacher-conflict
 * Check if a teacher has a conflict at a specific day/time across ALL sections
 * IMPORTANT: This route MUST come BEFORE /:section_id route to avoid path conflicts
 * Query params:
 * - teacher_id: Teacher's ObjectId
 * - day: Day of the week (Monday, Tuesday, etc.)
 * - start_time: Start time in 24-hour format (e.g., "11:30")
 * - exclude_timetable_id: Current timetable ID to exclude
 * - exclude_slot_id: Current slot ID to exclude
 */
router.get('/check-teacher-conflict', async (req, res) => {
  try {
    const { teacher_id, day, start_time, exclude_timetable_id, exclude_slot_id } = req.query
    
    console.log('🔍 [BACKEND] Checking teacher conflict:', {
      teacher_id,
      day,
      start_time,
      exclude_timetable_id
    })
    
    if (!teacher_id || !day || !start_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: teacher_id, day, start_time'
      })
    }
    
    // Find all timetables (excluding current one)
    const timetables = await Timetable.find({
      _id: { $ne: exclude_timetable_id }
    }).populate('section_id', 'section_name sem')
    
    // Check theory slots
    for (const tt of timetables) {
      const conflictSlot = tt.theory_slots?.find(slot => 
        slot.teacher_id?.toString() === teacher_id &&
        slot.day === day &&
        slot.start_time === start_time &&
        slot._id?.toString() !== exclude_slot_id
      )
      
      if (conflictSlot) {
        console.log('   ❌ [BACKEND] Conflict found in theory slots!')
        return res.json({
          success: true,
          hasConflict: true,
          conflict: {
            section: tt.section_name || tt.section_id?.section_name,
            subject: conflictSlot.subject_name || conflictSlot.subject_shortform,
            day: day,
            time: start_time,
            type: 'theory'
          }
        })
      }
    }
    
    // Check lab slots
    for (const tt of timetables) {
      const conflictSlot = tt.lab_slots?.find(slot => 
        slot.teacher_id?.toString() === teacher_id &&
        slot.day === day &&
        slot.start_time === start_time
      )
      
      if (conflictSlot) {
        console.log('   ❌ [BACKEND] Conflict found in lab slots!')
        return res.json({
          success: true,
          hasConflict: true,
          conflict: {
            section: tt.section_name || tt.section_id?.section_name,
            subject: conflictSlot.subject_name || conflictSlot.subject_shortform || 'Lab Session',
            day: day,
            time: start_time,
            type: 'lab'
          }
        })
      }
    }
    
    console.log('   ✅ [BACKEND] No conflicts found')
    res.json({
      success: true,
      hasConflict: false
    })
    
  } catch (error) {
    console.error('❌ [BACKEND] Error checking teacher conflict:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to check teacher conflict',
      error: error.message
    })
  }
})

/**
 * GET /api/timetables/available-rooms
 * Get available classrooms for a specific day/time
 * IMPORTANT: This route MUST come BEFORE /:section_id route to avoid path conflicts
 * Query params:
 * - day: Monday, Tuesday, etc.
 * - start_time: 10:00 (24-hour format)
 * - sem_type: odd/even
 * - academic_year: 2024-2025
 * - exclude_timetable_id: (optional) Exclude current timetable's slots
 */
router.get('/available-rooms', async (req, res) => {
  try {
    const { day, start_time, sem_type, academic_year, exclude_timetable_id } = req.query
    
    if (!day || !start_time || !sem_type || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'day, start_time, sem_type, and academic_year are required'
      })
    }
    
    console.log('🔍 [AVAILABLE ROOMS] Query:', { day, start_time, sem_type, academic_year })
    
    // Import Classroom model
    const Classroom = (await import('../models/dept_class_model.js')).default
    
    // Get all theory classrooms
    const allClassrooms = await Classroom.find({ room_type: 'theory' }).lean()
    console.log(`   📋 Total classrooms: ${allClassrooms.length}`)
    
    // Get all timetables for this semester
    const filter = { sem_type, academic_year }
    if (exclude_timetable_id) {
      filter._id = { $ne: exclude_timetable_id }
    }
    
    const timetables = await Timetable.find(filter).lean()
    console.log(`   📚 Checking ${timetables.length} timetables`)
    
    // Build set of occupied rooms at this day/time
    const occupiedRooms = new Set()
    
    for (const tt of timetables) {
      for (const slot of tt.theory_slots || []) {
        if (slot.day === day && slot.start_time === start_time && slot.classroom_name) {
          occupiedRooms.add(slot.classroom_name)
          console.log(`   ❌ Room ${slot.classroom_name} occupied by ${tt.section_name} (${slot.subject_shortform})`)
        }
      }
    }
    
    // Filter available rooms
    const availableRooms = allClassrooms.filter(room => !occupiedRooms.has(room.room_no))
    
    console.log(`   ✅ Available rooms: ${availableRooms.length}/${allClassrooms.length}`)
    console.log(`   📍 Rooms: ${availableRooms.map(r => r.room_no).join(', ')}`)
    
    res.json({
      success: true,
      available_rooms: availableRooms.map(r => ({
        _id: r._id,
        classroom_name: r.room_no,
        room_type: r.room_type
      })),
      total_rooms: allClassrooms.length,
      occupied_rooms: occupiedRooms.size
    })
    
  } catch (error) {
    console.error('❌ [AVAILABLE ROOMS ERROR]', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available rooms',
      error: error.message
    })
  }
})

/**
 * GET /api/timetables/:section_id
 * Fetch timetable for a specific section
 */
router.get('/:section_id', async (req, res) => {
  try {
    const { section_id } = req.params
    const { sem_type, academic_year } = req.query
    
    const filter = { section_id }
    if (sem_type) filter.sem_type = sem_type
    if (academic_year) filter.academic_year = academic_year
    
    const timetable = await Timetable.findOne(filter)
      .populate('section_id', 'section_name sem sem_type num_batches')
      .lean()
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found for this section'
      })
    }
    
    res.json({
      success: true,
      data: timetable
    })
    
  } catch (error) {
    console.error('Error fetching timetable:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable',
      error: error.message
    })
  }
})

/**
 * POST /api/timetables/generate
 * Generate timetables for all sections of a semester type (FULL AUTO)
 * Body: { sem_type: 'odd' | 'even', academic_year: '2024-2025' }
 */
router.post('/generate', async (req, res) => {
  try {
    const { sem_type, academic_year } = req.body
    
    if (!sem_type || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'sem_type and academic_year are required'
      })
    }
    
    if (!['odd', 'even'].includes(sem_type)) {
      return res.status(400).json({
        success: false,
        message: 'sem_type must be "odd" or "even"'
      })
    }
    
    console.log(`\n🚀 Generating timetables for ${sem_type} semester (FULL AUTO)...`)
    
    const result = await generateTimetables(sem_type, academic_year)
    
    res.json(result)
    
  } catch (error) {
    console.error('Error generating timetables:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate timetables',
      error: error.message
    })
  }
})

/**
 * POST /api/timetables/step1
 * Step 1: Load sections and initialize empty timetables
 * Body: { sem_type: 'odd' | 'even', academic_year: '2024-2025' }
 */
router.post('/step1', async (req, res) => {
  try {
    const { sem_type, academic_year } = req.body
    
    if (!sem_type || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'sem_type and academic_year are required'
      })
    }
    
    const result = await loadSectionsAndInitialize(sem_type, academic_year)
    res.json(result)
    
  } catch (error) {
    console.error('Error in Step 1:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to execute Step 1',
      error: error.message
    })
  }
})

/**
 * POST /api/timetables/step2
 * Step 2: Block fixed slots (OEC/PEC for Semester 7)
 * Body: { sem_type: 'odd' | 'even', academic_year: '2024-2025' }
 */
router.post('/step2', async (req, res) => {
  try {
    const { sem_type, academic_year } = req.body
    
    if (!sem_type || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'sem_type and academic_year are required'
      })
    }
    
    const result = await blockFixedSlots(sem_type, academic_year)
    res.json(result)
    
  } catch (error) {
    console.error('Error in Step 2:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to execute Step 2',
      error: error.message
    })
  }
})

/**
 * POST /api/timetables/step3
 * Step 3: Schedule lab sessions
 * Body: { sem_type: 'odd' | 'even', academic_year: '2024-2025' }
 */
router.post('/step3', async (req, res) => {
  try {
    const { sem_type, academic_year } = req.body
    
    if (!sem_type || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'sem_type and academic_year are required'
      })
    }
    
    const result = await scheduleLabs(sem_type, academic_year)
    res.json(result)
    
  } catch (error) {
    console.error('Error in Step 3:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to execute Step 3',
      error: error.message
    })
  }
})

/**
 * POST /api/timetables/step3.5
 * Step 3.5: Resolve room conflicts (post-processing validation)
 * Body: { sem_type: 'odd' | 'even', academic_year: '2024-2025' }
 */
router.post('/step3.5', async (req, res) => {
  try {
    const { sem_type, academic_year } = req.body
    
    if (!sem_type || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'sem_type and academic_year are required'
      })
    }
    
    console.log(`\n🔧 Running Step 3.5: Resolve Room Conflicts...`)
    const result = await resolveRoomConflicts(sem_type, academic_year)
    res.json(result)
    
  } catch (error) {
    console.error('Error in Step 3.5:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to execute Step 3.5',
      error: error.message
    })
  }
})

/**
 * POST /api/timetables/step4
 * Step 4: Schedule theory classes
 * Body: { sem_type: 'odd' | 'even', academic_year: '2024-2025' }
 */
router.post('/step4', async (req, res) => {
  try {
    const { sem_type, academic_year } = req.body
    
    if (!sem_type || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'sem_type and academic_year are required'
      })
    }
    
    const result = await scheduleTheory(sem_type, academic_year)
    res.json(result)
    
  } catch (error) {
    console.error('Error in Step 4:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to execute Step 4',
      error: error.message
    })
  }
})

/**
 * POST /api/timetables/step5
 * Step 5: Assign classrooms to theory slots (NEW - was Step 6 before)
 * Body: { sem_type: 'odd' | 'even', academic_year: '2024-2025' }
 */
router.post('/step5', async (req, res) => {
  try {
    const { sem_type, academic_year } = req.body
    
    if (!sem_type || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'sem_type and academic_year are required'
      })
    }
    
    const result = await assignClassrooms(sem_type, academic_year)
    res.json(result)
    
  } catch (error) {
    console.error('Error in Step 5:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to execute Step 5',
      error: error.message
    })
  }
})

/**
 * POST /api/timetables/step6
 * Step 6: Assign teachers to labs (MOVED from Step 5)
 * Body: { sem_type: 'odd' | 'even', academic_year: '2024-2025' }
 */
router.post('/step6', async (req, res) => {
  try {
    const { sem_type, academic_year } = req.body
    
    if (!sem_type || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'sem_type and academic_year are required'
      })
    }
    
    const result = await assignLabTeachers(sem_type, academic_year)
    res.json(result)
    
  } catch (error) {
    console.error('Error in Step 6:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to execute Step 6',
      error: error.message
    })
  }
})

/**
 * POST /api/timetables/step7
 * Step 7: Validate and finalize (MOVED from Step 6)
 * Body: { sem_type: 'odd' | 'even', academic_year: '2024-2025' }
 */
router.post('/step7', async (req, res) => {
  try {
    const { sem_type, academic_year } = req.body
    
    if (!sem_type || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'sem_type and academic_year are required'
      })
    }
    
    const result = await validateAndFinalize(sem_type, academic_year)
    res.json(result)
    
  } catch (error) {
    console.error('Error in Step 7:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to execute Step 7',
      error: error.message
    })
  }
})

/**
 * PATCH /api/timetables/:timetableId/theory-slot/:slotId/classroom
 * Update classroom assignment for a specific theory slot
 * Body: { classroom_id, classroom_name }
 */
router.patch('/:timetableId/theory-slot/:slotId/classroom', async (req, res) => {
  try {
    const { timetableId, slotId } = req.params
    const { classroom_id, classroom_name, current_day, current_start_time } = req.body
    
    if (!classroom_id || !classroom_name) {
      return res.status(400).json({
        success: false,
        message: 'classroom_id and classroom_name are required'
      })
    }
    
    console.log('🏫 [UPDATE CLASSROOM] Request:', { 
      timetableId, 
      slotId, 
      classroom_name,
      current_day,
      current_start_time 
    })
    
    // Find the timetable
    const timetable = await Timetable.findById(timetableId)
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      })
    }
    
    // Find the slot
    const slot = timetable.theory_slots.find(s => s._id.toString() === slotId)
    
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Theory slot not found'
      })
    }
    
    // Use current position from frontend if provided (handles unsaved moves)
    // Otherwise fall back to database position
    const checkDay = current_day || slot.day
    const checkStartTime = current_start_time || slot.start_time
    
    console.log('🔍 [CONFLICT CHECK] Checking room availability at:', { 
      day: checkDay, 
      time: checkStartTime,
      room: classroom_name
    })
    
    // Check if the room is available at this day/time (conflict detection)
    const conflictingTimetables = await Timetable.find({
      _id: { $ne: timetableId },
      sem_type: timetable.sem_type,
      academic_year: timetable.academic_year,
      'theory_slots': {
        $elemMatch: {
          day: checkDay,
          start_time: checkStartTime,
          classroom_name: classroom_name
        }
      }
    }).lean()
    
    if (conflictingTimetables.length > 0) {
      const conflict = conflictingTimetables[0]
      const conflictSlot = conflict.theory_slots.find(s => 
        s.day === checkDay && 
        s.start_time === checkStartTime && 
        s.classroom_name === classroom_name
      )
      
      console.log('   ❌ Conflict detected:', { 
        section: conflict.section_name, 
        subject: conflictSlot?.subject_shortform 
      })
      
      return res.status(409).json({
        success: false,
        message: `Classroom ${classroom_name} is already occupied by ${conflict.section_name} (${conflictSlot?.subject_shortform}) at ${checkDay} ${checkStartTime}`
      })
    }
    
    console.log('   ✅ No conflicts - room is available!')
    
    // Update slot position if current position was provided (unsaved move)
    if (current_day && current_start_time) {
      console.log('📍 [UPDATE POSITION] Updating slot position to match frontend:', {
        oldDay: slot.day,
        oldTime: slot.start_time,
        newDay: current_day,
        newTime: current_start_time
      })
      slot.day = current_day
      slot.start_time = current_start_time
      // Update end time based on duration
      const duration = slot.duration_hours || 1
      const [h, m] = current_start_time.split(':').map(Number)
      const totalMinutes = h * 60 + m + (duration * 60)
      const newHours = Math.floor(totalMinutes / 60)
      const newMinutes = totalMinutes % 60
      slot.end_time = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
    }
    
    // Update the classroom
    slot.classroom_id = classroom_id
    slot.classroom_name = classroom_name
    
    await timetable.save()
    
    console.log('   ✅ Classroom updated successfully')
    
    res.json({
      success: true,
      message: 'Classroom assignment updated successfully'
    })
    
  } catch (error) {
    console.error('❌ [UPDATE CLASSROOM ERROR]', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update classroom',
      error: error.message
    })
  }
})

/**
 * DELETE /api/timetables/clear
 * Clear timetables for a semester type
 * Query params: sem_type, academic_year
 */
router.delete('/clear', async (req, res) => {
  try {
    const { sem_type, academic_year } = req.query
    
    const filter = {}
    if (sem_type) filter.sem_type = sem_type
    if (academic_year) filter.academic_year = academic_year
    
    const result = await Timetable.deleteMany(filter)
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} timetables`,
      deletedCount: result.deletedCount
    })
    
  } catch (error) {
    console.error('Error clearing timetables:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to clear timetables',
      error: error.message
    })
  }
})

/**
 * PUT /api/timetables/:timetableId/update-slots
 * Update theory slots and breaks in a timetable (manual editing)
 * Body: { theory_slots, breaks }
 */
router.put('/:timetableId/update-slots', async (req, res) => {
  try {
    const { timetableId } = req.params
    const { theory_slots, breaks } = req.body
    
    console.log('📝 Updating timetable slots:', timetableId)
    
    // Find timetable
    const timetable = await Timetable.findById(timetableId)
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      })
    }
    
    // Update theory slots if provided
    if (theory_slots) {
      timetable.theory_slots = theory_slots
      console.log(`✅ Updated ${theory_slots.length} theory slots`)
    }
    
    // Update breaks if provided
    if (breaks !== undefined) {
      timetable.breaks = breaks
      console.log(`✅ Updated ${breaks.length} breaks`)
    }
    
    // Update last_modified timestamp
    timetable.last_modified = new Date()
    
    // Save to database
    await timetable.save()
    
    res.json({
      success: true,
      message: 'Timetable updated successfully',
      data: timetable
    })
    
  } catch (error) {
    console.error('❌ Error updating timetable slots:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update timetable',
      error: error.message
    })
  }
})

export default router
