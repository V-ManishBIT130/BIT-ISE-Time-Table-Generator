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
      .populate('teacher_id', 'name teacher_id teacher_position teacher_shortform')
      .populate('subject_id', 'subject_code subject_name subject_shortform hrs_per_week')
      .populate('scheduled_slots.classroom', 'room_no')
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
      .populate('teacher_id', 'name teacher_id teacher_position teacher_shortform')
      .populate('subject_id', 'subject_code subject_name subject_shortform hrs_per_week')
      .populate('scheduled_slots.classroom', 'room_no')

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

    // Skip teacher validation for subjects that don't require ISE teachers:
    // 1. Project subjects (Major/Mini Project)
    // 2. Non-ISE subjects (Maths, Physics, etc. handled by other departments)
    // 3. Open Elective (taught by external teacher with fixed schedule)
    // Note: Professional Elective DOES need ISE teacher (fixed schedule but ISE-taught)
    if (subject.is_project || subject.is_non_ise_subject || subject.is_open_elective || !subject.requires_teacher_assignment) {
      const reasonMap = {
        is_open_elective: 'Open Elective is taught by an external teacher',
        is_non_ise_subject: 'This subject is handled by another department',
        is_project: 'Project subjects do not require ISE teacher assignment',
        default: 'This subject does not require ISE teacher assignment'
      }
      const reason = subject.is_open_elective ? reasonMap.is_open_elective
                   : subject.is_non_ise_subject ? reasonMap.is_non_ise_subject 
                   : subject.is_project ? reasonMap.is_project 
                   : reasonMap.default
      
      return res.status(400).json({ 
        success: false, 
        message: reason
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
      teacher_name: teacher.name, // Store for quick display
      subject_name: subject.subject_name, // Store for quick display
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
    console.log('=== PUT UPDATE ASSIGNMENT ===')
    console.log('Assignment ID:', req.params.id)
    console.log('Request Body:', req.body)
    
    // Validate teacher if being updated
    if (req.body.teacher_id) {
      const teacher = await Teacher.findById(req.body.teacher_id)
      if (!teacher) {
        return res.status(404).json({ 
          success: false, 
          message: 'Teacher not found' 
        })
      }
      
      // Check if teacher can teach the subject
      const currentAssignment = await TeacherSubjectAssignment.findById(req.params.id)
      console.log('Current Assignment:', currentAssignment)
      
      if (currentAssignment) {
        const canTeach = teacher.canTeach_subjects.some(
          sub => sub.toString() === currentAssignment.subject_id.toString()
        )
        
        console.log('Teacher can teach?', canTeach)
        
        if (!canTeach) {
          return res.status(400).json({ 
            success: false, 
            message: 'Teacher is not eligible to teach this subject' 
          })
        }
      }
      
      req.body.teacher_name = teacher.name
      console.log('Updated teacher_name:', req.body.teacher_name)
    }
    
    // If subject_id is being updated, fetch subject name
    if (req.body.subject_id) {
      const subject = await Subject.findById(req.body.subject_id)
      if (subject) {
        req.body.subject_name = subject.subject_name
      }
    }

    console.log('Final update payload:', req.body)

    const assignment = await TeacherSubjectAssignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('teacher_id', 'name teacher_id teacher_shortform')
      .populate('subject_id', 'subject_code subject_name subject_shortform hrs_per_week')

    console.log('Updated assignment:', assignment)

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
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Another assignment already exists with these details' 
      })
    }
    
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

// POST /api/teacher-assignments/validate
// Purpose: Check database integrity and clean up orphaned assignments
// Returns: List of orphaned assignments and cleanup statistics
router.post('/validate', async (req, res) => {
  try {
    console.log('\n🔍 Starting database integrity check for teacher assignments...')
    
    // Fetch all assignments
    const allAssignments = await TeacherSubjectAssignment.find()
    console.log(`📊 Total assignments found: ${allAssignments.length}`)
    
    const orphanedAssignments = []
    const validAssignments = []
    
    // Check each assignment
    for (const assignment of allAssignments) {
      let isOrphaned = false
      const issues = []
      
      // Check teacher reference
      const teacher = await Teacher.findById(assignment.teacher_id)
      if (!teacher) {
        isOrphaned = true
        issues.push(`Teacher ID ${assignment.teacher_id} not found`)
      }
      
      // Check subject reference
      const subject = await Subject.findById(assignment.subject_id)
      if (!subject) {
        isOrphaned = true
        issues.push(`Subject ID ${assignment.subject_id} not found`)
      }
      
      if (isOrphaned) {
        orphanedAssignments.push({
          _id: assignment._id,
          teacher_id: assignment.teacher_id,
          subject_id: assignment.subject_id,
          sem: assignment.sem,
          sem_type: assignment.sem_type,
          section: assignment.section,
          issues
        })
      } else {
        validAssignments.push(assignment._id)
      }
    }
    
    console.log(`✅ Valid assignments: ${validAssignments.length}`)
    console.log(`⚠️ Orphaned assignments: ${orphanedAssignments.length}`)
    
    // Auto-cleanup if requested
    let cleanedCount = 0
    if (req.body.autoCleanup === true && orphanedAssignments.length > 0) {
      console.log('🧹 Auto-cleanup enabled, deleting orphaned assignments...')
      
      const orphanedIds = orphanedAssignments.map(a => a._id)
      const deleteResult = await TeacherSubjectAssignment.deleteMany({
        _id: { $in: orphanedIds }
      })
      
      cleanedCount = deleteResult.deletedCount
      console.log(`✅ Cleaned up ${cleanedCount} orphaned assignments`)
    }
    
    res.json({
      success: true,
      message: 'Database integrity check complete',
      data: {
        totalAssignments: allAssignments.length,
        validAssignments: validAssignments.length,
        orphanedAssignments: orphanedAssignments.length,
        orphanedDetails: orphanedAssignments,
        cleanedCount
      }
    })
    
  } catch (error) {
    console.error('Error validating assignments:', error)
    res.status(500).json({
      success: false,
      message: 'Error validating assignments',
      error: error.message
    })
  }
})

export default router
