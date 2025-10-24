import express from 'express'
import TeacherSubjectAssignment from '../models/pre_assign_teacher_model.js'
import Teacher from '../models/teachers_models.js'
import Subject from '../models/subjects_model.js'

const router = express.Router()

// GET /api/teacher-assignments
// Purpose: Fetch all teacher-subject assignments with filtering
// Query params: ?sem=3&sem_type=odd&section=A&teacher_id=xxx
router.get('/', async (req, res) => {
  try {
    const filter = {}
    
    if (req.query.sem) filter.sem = parseInt(req.query.sem)
    if (req.query.sem_type) filter.sem_type = req.query.sem_type
    if (req.query.section) filter.section = req.query.section
    if (req.query.teacher_id) filter.teacher_id = req.query.teacher_id
    if (req.query.subject_id) filter.subject_id = req.query.subject_id

    const assignments = await TeacherSubjectAssignment.find(filter)
      .populate('teacher_id', 'name teacher_id email')
      .populate('subject_id', 'subject_code subject_name hrs_per_week')
      .populate('scheduled_slots.classroom_id', 'room_no')
      .sort({ sem: 1, section: 1 })

    res.json({ 
      success: true, 
      count: assignments.length,
      data: assignments 
    })

  } catch (error) {
    console.error('Error fetching assignments:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching assignments',
      error: error.message 
    })
  }
})

// GET /api/teacher-assignments/:id
router.get('/:id', async (req, res) => {
  try {
    const assignment = await TeacherSubjectAssignment.findById(req.params.id)
      .populate('teacher_id', 'name teacher_id email')
      .populate('subject_id', 'subject_code subject_name hrs_per_week')
      .populate('scheduled_slots.classroom_id', 'room_no')

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assignment not found' 
      })
    }

    res.json({ 
      success: true, 
      data: assignment 
    })

  } catch (error) {
    console.error('Error fetching assignment:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching assignment',
      error: error.message 
    })
  }
})

// POST /api/teacher-assignments
// Purpose: Assign a teacher to a subject for a specific section (Phase 2)
// Body: { teacher_id, subject_id, sem, sem_type, section }
// Validation: Teacher must have subject in canTeach_subjects
router.post('/', async (req, res) => {
  try {
    const { teacher_id, subject_id, sem, sem_type, section } = req.body

    // Validate subject exists
    const subject = await Subject.findById(subject_id)
    if (!subject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subject not found' 
      })
    }

    // Skip teacher validation ONLY for project subjects (Major/Mini/Open Elective)
    // Professional Elective has fixed schedule but STILL needs ISE teacher
    if (subject.is_project || !subject.requires_teacher_assignment) {
      return res.status(400).json({ 
        success: false, 
        message: 'This subject does not require ISE teacher assignment (Project/Open Elective)' 
      })
    }

    // Validate teacher exists and can teach this subject
    const teacher = await Teacher.findById(teacher_id)
    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      })
    }

    // Check if teacher can teach this subject
    const canTeach = teacher.canTeach_subjects.some(
      sub => sub.toString() === subject_id
    )
    
    if (!canTeach) {
      return res.status(400).json({ 
        success: false, 
        message: 'Teacher is not eligible to teach this subject' 
      })
    }

    // Create assignment (scheduled_slots will be empty until Phase 3)
    const assignment = await TeacherSubjectAssignment.create({
      teacher_id,
      subject_id,
      sem,
      sem_type,
      section,
      scheduled_slots: []
    })

    res.status(201).json({ 
      success: true, 
      message: 'Teacher assigned to subject successfully',
      data: assignment 
    })

  } catch (error) {
    console.error('Error creating assignment:', error)
    
    // Handle duplicate: one teacher per subject per section
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'A teacher is already assigned to this subject for this section' 
      })
    }

    res.status(400).json({ 
      success: false, 
      message: 'Error creating assignment',
      error: error.message 
    })
  }
})

// PUT /api/teacher-assignments/:id
// Purpose: Update assignment (change teacher or add scheduled_slots in Phase 3)
router.put('/:id', async (req, res) => {
  try {
    const assignment = await TeacherSubjectAssignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('teacher_id', 'name teacher_id')
      .populate('subject_id', 'subject_code subject_name')

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assignment not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Assignment updated successfully',
      data: assignment 
    })

  } catch (error) {
    console.error('Error updating assignment:', error)
    res.status(400).json({ 
      success: false, 
      message: 'Error updating assignment',
      error: error.message 
    })
  }
})

// DELETE /api/teacher-assignments/:id
router.delete('/:id', async (req, res) => {
  try {
    const assignment = await TeacherSubjectAssignment.findByIdAndDelete(req.params.id)

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assignment not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Assignment deleted successfully',
      data: assignment 
    })

  } catch (error) {
    console.error('Error deleting assignment:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting assignment',
      error: error.message 
    })
  }
})

export default router
