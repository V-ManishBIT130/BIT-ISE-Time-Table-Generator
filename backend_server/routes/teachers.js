import express from 'express'
import Teacher from '../models/teachers_models.js'

const router = express.Router()

// GET /api/teachers
// Purpose: Fetch all teachers (with optional filtering)
// Query params: ?dept=ISE, ?teacher_id=T001
// Returns: Array of teacher documents
router.get('/', async (req, res) => {
  try {
    const filter = {}
    
    // Optional filters
    if (req.query.teacher_id) filter.teacher_id = req.query.teacher_id
    if (req.query.name) filter.name = new RegExp(req.query.name, 'i') // Case-insensitive search

    const teachers = await Teacher.find(filter)
      .populate('canTeach_subjects', 'subject_code subject_name') // Populate subject details
      .populate('labs_handled', 'lab_code lab_name') // Populate lab details
      .sort({ name: 1 }) // Sort by name alphabetically

    res.json({ 
      success: true, 
      count: teachers.length,
      data: teachers 
    })

  } catch (error) {
    console.error('Error fetching teachers:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching teachers',
      error: error.message 
    })
  }
})

// GET /api/teachers/:id
// Purpose: Fetch a single teacher by MongoDB _id
// Returns: Teacher document
router.get('/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('canTeach_subjects', 'subject_code subject_name')
      .populate('labs_handled', 'lab_code lab_name')

    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      })
    }

    res.json({ 
      success: true, 
      data: teacher 
    })

  } catch (error) {
    console.error('Error fetching teacher:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching teacher',
      error: error.message 
    })
  }
})

// POST /api/teachers
// Purpose: Create a new teacher
// Body: { name, email, mobile_num, teacher_id, canTeach_subjects[], labs_handled[], hrs_per_week, teacher_position }
// Returns: Created teacher document
router.post('/', async (req, res) => {
  try {
    const teacher = await Teacher.create(req.body)

    res.status(201).json({ 
      success: true, 
      message: 'Teacher created successfully',
      data: teacher 
    })

  } catch (error) {
    console.error('Error creating teacher:', error)
    
    // Handle duplicate teacher_id error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Teacher ID already exists' 
      })
    }

    res.status(400).json({ 
      success: false, 
      message: 'Error creating teacher',
      error: error.message 
    })
  }
})

// PUT /api/teachers/:id
// Purpose: Update an existing teacher
// Body: Any fields to update (name, email, canTeach_subjects, etc.)
// Returns: Updated teacher document
router.put('/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // Return updated doc, run schema validation
    )

    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Teacher updated successfully',
      data: teacher 
    })

  } catch (error) {
    console.error('Error updating teacher:', error)
    res.status(400).json({ 
      success: false, 
      message: 'Error updating teacher',
      error: error.message 
    })
  }
})

// DELETE /api/teachers/:id
// Purpose: Delete a teacher
// Returns: Success message
router.delete('/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id)

    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Teacher deleted successfully',
      data: teacher 
    })

  } catch (error) {
    console.error('Error deleting teacher:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting teacher',
      error: error.message 
    })
  }
})

export default router
