import express from 'express'
import TeacherLabAssignment from '../models/teacher_lab_assign_model.js'
import Teacher from '../models/teachers_models.js'
import SyllabusLab from '../models/syllabus_labs_model.js'

const router = express.Router()

// GET /api/lab-assignments
// Purpose: Fetch all lab-teacher assignments with filtering
// Query params: ?sem=3&sem_type=odd&section=A&batch_number=1
router.get('/', async (req, res) => {
  try {
    const filter = {}
    
    if (req.query.sem) filter.sem = parseInt(req.query.sem)
    if (req.query.sem_type) filter.sem_type = req.query.sem_type
    if (req.query.section) filter.section = req.query.section
    if (req.query.batch_number) filter.batch_number = parseInt(req.query.batch_number)
    if (req.query.lab_id) filter.lab_id = req.query.lab_id

    const assignments = await TeacherLabAssignment.find(filter)
      .populate('teacher_ids', 'name teacher_id teacher_shortform email')
      .populate('lab_id', 'lab_code lab_name lab_shortform duration_hours')
      .populate('assigned_lab_room', 'labRoom_no')
      .sort({ sem: 1, section: 1, batch_number: 1 })

    res.json({ 
      success: true, 
      count: assignments.length,
      data: assignments 
    })

  } catch (error) {
    console.error('Error fetching lab assignments:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching lab assignments',
      error: error.message 
    })
  }
})

// GET /api/lab-assignments/:id
router.get('/:id', async (req, res) => {
  try {
    const assignment = await TeacherLabAssignment.findById(req.params.id)
      .populate('teacher_ids', 'name teacher_id teacher_shortform email')
      .populate('lab_id', 'lab_code lab_name lab_shortform')
      .populate('assigned_lab_room', 'labRoom_no')

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lab assignment not found' 
      })
    }

    res.json({ 
      success: true, 
      data: assignment 
    })

  } catch (error) {
    console.error('Error fetching lab assignment:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching lab assignment',
      error: error.message 
    })
  }
})

// POST /api/lab-assignments
// Purpose: Assign 2 teachers to a lab-batch combination (Phase 2)
// Body: { lab_id, sem, sem_type, section, batch_number, teacher_ids: [id1, id2], assigned_lab_room }
// Validation: 
// - Must be exactly 2 teachers
// - Both teachers must have lab in labs_handled
router.post('/', async (req, res) => {
  try {
    const { lab_id, sem, sem_type, section, batch_number, teacher_ids, assigned_lab_room } = req.body

    // Validate exactly 2 teachers
    if (!teacher_ids || teacher_ids.length !== 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Exactly 2 teachers must be assigned to a lab' 
      })
    }

    // Validate lab exists
    const lab = await SyllabusLab.findById(lab_id)
    if (!lab) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lab not found' 
      })
    }

    // Validate both teachers exist and can handle this lab
    for (const teacherId of teacher_ids) {
      const teacher = await Teacher.findById(teacherId)
      
      if (!teacher) {
        return res.status(404).json({ 
          success: false, 
          message: `Teacher ${teacherId} not found` 
        })
      }

      // Check if teacher can handle this lab
      const canHandle = teacher.labs_handled.some(
        labId => labId.toString() === lab_id
      )
      
      if (!canHandle) {
        return res.status(400).json({ 
          success: false, 
          message: `Teacher ${teacher.name} is not eligible to handle this lab` 
        })
      }
    }

    // Create assignment (schedule fields empty until Phase 3, but room assigned in Phase 2)
    const assignment = await TeacherLabAssignment.create({
      lab_id,
      sem,
      sem_type,
      section,
      batch_number,
      teacher_ids,
      assigned_lab_room: assigned_lab_room || null,  // Accept lab room from request
      scheduled_day: null,
      scheduled_start_time: null,
      scheduled_end_time: null
    })

    const populatedAssignment = await TeacherLabAssignment.findById(assignment._id)
      .populate('teacher_ids', 'name teacher_id teacher_shortform')
      .populate('lab_id', 'lab_code lab_name')
      .populate('assigned_lab_room', 'labRoom_no')

    res.status(201).json({ 
      success: true, 
      message: 'Teachers assigned to lab successfully',
      data: populatedAssignment 
    })

  } catch (error) {
    console.error('Error creating lab assignment:', error)
    
    // Handle duplicate: one assignment per lab per batch
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Teachers are already assigned to this lab for this batch' 
      })
    }

    res.status(400).json({ 
      success: false, 
      message: 'Error creating lab assignment',
      error: error.message 
    })
  }
})

// PUT /api/lab-assignments/:id
// Purpose: Update assignment (change teachers, room, or add schedule in Phase 3)
router.put('/:id', async (req, res) => {
  try {
    const assignment = await TeacherLabAssignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('teacher_ids', 'name teacher_id teacher_shortform')
      .populate('lab_id', 'lab_code lab_name lab_shortform')
      .populate('assigned_lab_room', 'labRoom_no')

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lab assignment not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Lab assignment updated successfully',
      data: assignment 
    })

  } catch (error) {
    console.error('Error updating lab assignment:', error)
    res.status(400).json({ 
      success: false, 
      message: 'Error updating lab assignment',
      error: error.message 
    })
  }
})

// DELETE /api/lab-assignments/:id
router.delete('/:id', async (req, res) => {
  try {
    const assignment = await TeacherLabAssignment.findByIdAndDelete(req.params.id)

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lab assignment not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Lab assignment deleted successfully',
      data: assignment 
    })

  } catch (error) {
    console.error('Error deleting lab assignment:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting lab assignment',
      error: error.message 
    })
  }
})

export default router
