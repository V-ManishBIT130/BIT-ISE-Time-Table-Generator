import express from 'express'
import mongoose from 'mongoose'
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
 * GET /api/timetables/stats
 * Get dashboard statistics for timetables
 */
router.get('/stats', async (req, res) => {
  try {
    // Get total count
    const totalTimetables = await Timetable.countDocuments()
    
    // Get odd semester count
    const oddSemTimetables = await Timetable.countDocuments({ sem_type: 'odd' })
    
    // Get even semester count
    const evenSemTimetables = await Timetable.countDocuments({ sem_type: 'even' })
    
    // Get recent generations (last 5)
    const recentGenerations = await Timetable.find()
      .sort({ generation_date: -1 })
      .limit(5)
      .select('section_name sem sem_type generation_date generation_metadata theory_slots lab_slots')
      .lean()
    
    res.json({
      success: true,
      totalTimetables,
      oddSemTimetables,
      evenSemTimetables,
      recentGenerations
    })
    
  } catch (error) {
    console.error('Error fetching timetable stats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable statistics',
      error: error.message
    })
  }
})

/**
 * GET /api/timetables/teacher-schedule/:teacherId
 * Get complete schedule for a specific teacher across ALL sections
 * Shows all theory classes and lab sessions assigned to this teacher
 */
router.get('/teacher-schedule/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params
    const { sem_type, academic_year } = req.query
    
    console.log('📅 Fetching teacher schedule for:', teacherId)
    
    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID is required'
      })
    }
    
    // Build filter
    const filter = {}
    if (sem_type) filter.sem_type = sem_type
    if (academic_year) filter.academic_year = academic_year
    
    // Fetch all timetables
    const timetables = await Timetable.find(filter)
      .populate('section_id', 'section_name sem sem_type')
      .lean()
    
    console.log(`📊 Found ${timetables.length} timetables for filter:`, filter)
    
    // Collect all slots for this teacher
    const teacherSchedule = {
      theory_classes: [],
      lab_sessions: []
    }
    
    for (const timetable of timetables) {
      // Check theory slots
      for (const slot of timetable.theory_slots || []) {
        if (slot.teacher_id && slot.teacher_id.toString() === teacherId) {
          teacherSchedule.theory_classes.push({
            timetable_id: timetable._id,
            section_name: timetable.section_name,
            sem: timetable.sem,
            day: slot.day,
            start_time: slot.start_time,
            end_time: slot.end_time,
            duration_hours: slot.duration_hours || 1,
            subject_name: slot.subject_name,
            subject_shortform: slot.subject_shortform,
            classroom_name: slot.classroom_name || 'Not Assigned',
            is_fixed_slot: slot.is_fixed_slot || false
          })
        }
      }
      
      // Check lab slots
      for (const labSlot of timetable.lab_slots || []) {
        for (const batch of labSlot.batches || []) {
          // Check if teacher1 or teacher2 matches
          const isTeacher1 = batch.teacher1_id && batch.teacher1_id.toString() === teacherId
          const isTeacher2 = batch.teacher2_id && batch.teacher2_id.toString() === teacherId
          
          if (isTeacher1 || isTeacher2) {
            // Find if we already added this lab slot
            const existingSlot = teacherSchedule.lab_sessions.find(
              ls => ls.timetable_id.toString() === timetable._id.toString() &&
                    ls.day === labSlot.day &&
                    ls.start_time === labSlot.start_time
            )
            
            if (existingSlot) {
              // Add this batch to existing slot
              existingSlot.batches.push({
                batch_name: batch.batch_name,
                lab_name: batch.lab_name,
                lab_shortform: batch.lab_shortform,
                lab_room_name: batch.lab_room_name || 'Not Assigned',
                role: isTeacher1 ? 'Teacher 1' : 'Teacher 2'
              })
            } else {
              // Create new lab session entry
              teacherSchedule.lab_sessions.push({
                timetable_id: timetable._id,
                section_name: timetable.section_name,
                sem: timetable.sem,
                day: labSlot.day,
                start_time: labSlot.start_time,
                end_time: labSlot.end_time,
                duration_hours: labSlot.duration_hours || 2,
                batches: [{
                  batch_name: batch.batch_name,
                  lab_name: batch.lab_name,
                  lab_shortform: batch.lab_shortform,
                  lab_room_name: batch.lab_room_name || 'Not Assigned',
                  role: isTeacher1 ? 'Teacher 1' : 'Teacher 2'
                }]
              })
            }
          }
        }
      }
    }
    
    // Sort by day and time
    const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 }
    
    const sortByDayTime = (a, b) => {
      if (dayOrder[a.day] !== dayOrder[b.day]) {
        return dayOrder[a.day] - dayOrder[b.day]
      }
      return a.start_time.localeCompare(b.start_time)
    }
    
    teacherSchedule.theory_classes.sort(sortByDayTime)
    teacherSchedule.lab_sessions.sort(sortByDayTime)
    
    console.log(`✅ Found ${teacherSchedule.theory_classes.length} theory classes and ${teacherSchedule.lab_sessions.length} lab sessions`)
    
    // Calculate statistics
    const stats = {
      total_theory_classes: teacherSchedule.theory_classes.length,
      total_lab_sessions: teacherSchedule.lab_sessions.length,
      total_sessions: teacherSchedule.theory_classes.length + teacherSchedule.lab_sessions.length,
      theory_hours: teacherSchedule.theory_classes.reduce((sum, cls) => sum + (cls.duration_hours || 1), 0),
      lab_hours: teacherSchedule.lab_sessions.reduce((sum, lab) => sum + (lab.duration_hours || 2), 0),
      total_hours: 0
    }
    stats.total_hours = stats.theory_hours + stats.lab_hours
    
    res.json({
      success: true,
      teacher_id: teacherId,
      schedule: teacherSchedule,
      statistics: stats
    })
    
  } catch (error) {
    console.error('Error fetching teacher schedule:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher schedule',
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
    const { teacher_id, day, start_time, end_time, exclude_timetable_id, exclude_slot_id } = req.query
    
    console.log('🔍 [BACKEND] Checking teacher conflict:', {
      teacher_id,
      day,
      start_time,
      end_time,
      exclude_timetable_id
    })
    
    if (!teacher_id || !day || !start_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: teacher_id, day, start_time'
      })
    }
    
    // Helper: Check if two time ranges overlap
    const timesOverlap = (start1, end1, start2, end2) => {
      const toMinutes = (time) => {
        const [h, m] = time.split(':').map(Number)
        return h * 60 + m
      }
      
      const s1 = toMinutes(start1)
      const e1 = toMinutes(end1)
      const s2 = toMinutes(start2)
      const e2 = toMinutes(end2)
      
      return s1 < e2 && s2 < e1
    }
    
    // If no end_time provided, assume 1 hour duration
    const checkEndTime = end_time || (() => {
      const [h, m] = start_time.split(':').map(Number)
      const totalMinutes = h * 60 + m + 60
      const newH = Math.floor(totalMinutes / 60)
      const newM = totalMinutes % 60
      return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
    })()
    
    console.log(`   📏 Checking time range: ${start_time} - ${checkEndTime}`)
    
    // CRITICAL FIX: Convert string ID to ObjectId for proper MongoDB comparison
    const excludeTimetableObjectId = exclude_timetable_id ? 
      (mongoose.Types.ObjectId.isValid(exclude_timetable_id) ? 
        new mongoose.Types.ObjectId(exclude_timetable_id) : 
        null) : 
      null
    
    console.log(`   🔍 [BACKEND] Exclude timetable ID:`, {
      original: exclude_timetable_id,
      objectId: excludeTimetableObjectId?.toString()
    })
    
    // Find all timetables (excluding current one)
    const query = excludeTimetableObjectId ? 
      { _id: { $ne: excludeTimetableObjectId } } : 
      {}
    
    const timetables = await Timetable.find(query).populate('section_id', 'section_name sem')
    
    console.log(`   📚 [BACKEND] Found ${timetables.length} timetables to check`)
    console.log(`   📋 [BACKEND] Timetable IDs being checked:`, timetables.map(tt => ({
      id: tt._id.toString(),
      section: tt.section_name
    })))
    
    // Check theory slots for TIME OVERLAP
    for (const tt of timetables) {
      if (tt.theory_slots && Array.isArray(tt.theory_slots)) {
        for (const slot of tt.theory_slots) {
          // CRITICAL FIX: Properly exclude the slot being moved
          const slotIdStr = slot._id?.toString()
          const shouldExclude = exclude_slot_id && slotIdStr === exclude_slot_id
          
          if (shouldExclude) {
            console.log('   ⏭️  [BACKEND] Skipping excluded slot:', {
              slotId: slotIdStr,
              subject: slot.subject_name,
              section: tt.section_name,
              time: `${slot.start_time}-${slot.end_time}`
            })
            continue // Skip this slot - it's the one being moved
          }
          
          if (slot.teacher_id?.toString() === teacher_id &&
              slot.day === day) {
            // Check if times overlap
            if (timesOverlap(start_time, checkEndTime, slot.start_time, slot.end_time)) {
              console.log('   ❌ [BACKEND] Time overlap conflict found in theory slots!', {
                conflictTime: `${slot.start_time}-${slot.end_time}`,
                requestedTime: `${start_time}-${checkEndTime}`,
                conflictSlotId: slotIdStr,
                excludeSlotId: exclude_slot_id
              })
              return res.json({
                success: true,
                hasConflict: true,
                conflict: {
                  section: tt.section_name || tt.section_id?.section_name,
                  subject: slot.subject_name || slot.subject_shortform,
                  day: day,
                  time: `${slot.start_time}-${slot.end_time}`,
                  type: 'theory'
                }
              })
            }
          }
        }
      }
    }
    
    // Check lab slots for TIME OVERLAP
    for (const tt of timetables) {
      if (tt.lab_slots && Array.isArray(tt.lab_slots)) {
        for (const slot of tt.lab_slots) {
          if (slot.teacher_id?.toString() === teacher_id &&
              slot.day === day) {
            // Check if times overlap
            if (timesOverlap(start_time, checkEndTime, slot.start_time, slot.end_time)) {
              console.log('   ❌ [BACKEND] Time overlap conflict found in lab slots!')
              return res.json({
                success: true,
                hasConflict: true,
                conflict: {
                  section: tt.section_name || tt.section_id?.section_name,
                  subject: slot.subject_name || slot.subject_shortform || 'Lab Session',
                  day: day,
                  time: `${slot.start_time}-${slot.end_time}`,
                  type: 'lab'
                }
              })
            }
          }
        }
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
 * - end_time: 11:00 (24-hour format) - REQUIRED for proper overlap detection
 * - sem_type: odd/even
 * - academic_year: 2024-2025
 * - exclude_timetable_id: (optional) Exclude current timetable's slots
 */
router.get('/available-rooms', async (req, res) => {
  try {
    const { day, start_time, end_time, sem_type, academic_year, exclude_timetable_id, exclude_slot_id } = req.query
    
    if (!day || !start_time || !end_time || !sem_type || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'day, start_time, end_time, sem_type, and academic_year are required'
      })
    }
    
    console.log('🔍 [AVAILABLE ROOMS] Query:', { day, start_time, end_time, sem_type, academic_year, exclude_slot_id })
    
    // Helper: Check if two time ranges overlap
    const timesOverlap = (start1, end1, start2, end2) => {
      return (start1 < end2 && end1 > start2)
    }
    
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
    
    // Build set of occupied rooms at this day/time range
    const occupiedRooms = new Set()
    
    console.log(`   📏 Checking for overlaps with time range: ${start_time} - ${end_time}`)
    if (exclude_slot_id) {
      console.log(`   🔍 Excluding slot: ${exclude_slot_id}`)
    }
    
    for (const tt of timetables) {
      for (const slot of tt.theory_slots || []) {
        // Skip the slot being edited
        if (exclude_slot_id && slot._id.toString() === exclude_slot_id) {
          console.log(`   ⏭️  Skipping excluded slot: ${slot.subject_shortform} at ${slot.start_time}-${slot.end_time}`)
          continue
        }
        
        if (slot.day === day && slot.classroom_name) {
          // Check if this slot overlaps with the requested time range
          if (timesOverlap(start_time, end_time, slot.start_time, slot.end_time)) {
            occupiedRooms.add(slot.classroom_name)
            console.log(`   ❌ Room ${slot.classroom_name} occupied by ${tt.section_name} (${slot.subject_shortform}) at ${slot.start_time}-${slot.end_time}`)
          }
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
    
    // Calculate end time for the slot we're checking
    const slotDuration = slot.duration_hours || 1
    const [startH, startM] = checkStartTime.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = startMinutes + (slotDuration * 60)
    const endH = Math.floor(endMinutes / 60)
    const endM = endMinutes % 60
    const checkEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
    
    console.log(`   📏 Checking time range: ${checkStartTime} - ${checkEndTime}`)
    
    // Helper: Check if two time ranges overlap
    const timesOverlap = (start1, end1, start2, end2) => {
      const toMinutes = (time) => {
        const [h, m] = time.split(':').map(Number)
        return h * 60 + m
      }
      
      const s1 = toMinutes(start1)
      const e1 = toMinutes(end1)
      const s2 = toMinutes(start2)
      const e2 = toMinutes(end2)
      
      // Two ranges overlap if: start1 < end2 AND start2 < end1
      return s1 < e2 && s2 < e1
    }
    
    // Check if the room is available (no time overlap with any existing class)
    const allTimetables = await Timetable.find({
      _id: { $ne: timetableId },
      sem_type: timetable.sem_type,
      academic_year: timetable.academic_year
    }).lean()
    
    let conflictFound = null
    let conflictSlot = null
    
    for (const tt of allTimetables) {
      if (tt.theory_slots && Array.isArray(tt.theory_slots)) {
        for (const existingSlot of tt.theory_slots) {
          // Check if same day and same classroom
          if (existingSlot.day === checkDay && existingSlot.classroom_name === classroom_name) {
            // Check if times overlap
            if (timesOverlap(checkStartTime, checkEndTime, existingSlot.start_time, existingSlot.end_time)) {
              conflictFound = tt
              conflictSlot = existingSlot
              break
            }
          }
        }
      }
      if (conflictFound) break
    }
    
    if (conflictFound) {
      console.log('   ❌ Time overlap conflict detected:', { 
        section: conflictFound.section_name, 
        subject: conflictSlot?.subject_shortform,
        conflictTime: `${conflictSlot.start_time}-${conflictSlot.end_time}`,
        requestedTime: `${checkStartTime}-${checkEndTime}`
      })
      
      return res.status(409).json({
        success: false,
        message: `Classroom ${classroom_name} is occupied by ${conflictFound.section_name} (${conflictSlot?.subject_shortform}) at ${checkDay} ${conflictSlot.start_time}-${conflictSlot.end_time}, which overlaps with your requested time ${checkStartTime}-${checkEndTime}`
      })
    }
    
    console.log('   ✅ No conflicts - room is available!')
    
    // CRITICAL FIX: Only update slot position if it's ACTUALLY different from database
    // This prevents reverting positions after auto-save from drag-and-drop
    if (current_day && current_start_time) {
      const positionChanged = slot.day !== current_day || slot.start_time !== current_start_time
      
      if (positionChanged) {
        console.log('📍 [UPDATE POSITION] Slot position differs from DB - updating to match frontend:', {
          dbDay: slot.day,
          dbTime: slot.start_time,
          frontendDay: current_day,
          frontendTime: current_start_time
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
      } else {
        console.log('✓ [SKIP POSITION UPDATE] Slot position in DB matches frontend - no update needed')
      }
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
