import express from 'express'
import Timetable from '../models/timetable_model.js'
import { generateTimetables } from '../algorithms/timetable_generator.js'
import { loadSectionsAndInitialize } from '../algorithms/step1_load_sections.js'
import { blockFixedSlots } from '../algorithms/step2_fixed_slots.js'
import { scheduleLabs } from '../algorithms/step3_schedule_labs_v2.js' // Using refactored v2
import { scheduleTheory } from '../algorithms/step4_schedule_theory_breaks.js'
import { assignLabTeachers } from '../algorithms/step5_assign_teachers.js'
import { validateAndFinalize } from '../algorithms/step6_validate.js'

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
 * Step 5: Assign teachers to labs
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
    
    const result = await assignLabTeachers(sem_type, academic_year)
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
 * Step 6: Validate and finalize
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
    
    const result = await validateAndFinalize(sem_type, academic_year)
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
