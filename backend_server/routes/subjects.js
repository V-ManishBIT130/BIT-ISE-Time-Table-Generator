import express from 'express'
import Subject from '../models/subjects_model.js'

const router = express.Router()

// GET /api/subjects
// Purpose: Fetch all subjects with filtering by semester/type
// Query params: ?subject_sem=3&subject_sem_type=odd
// Returns: Array of subject documents
router.get('/', async (req, res) => {
  try {
    const filter = {}
    
    // Filter by semester number (e.g., 3, 5, 7)
    if (req.query.subject_sem) {
      filter.subject_sem = parseInt(req.query.subject_sem)
    }
    
    // Filter by semester type (odd/even)
    if (req.query.subject_sem_type) {
      filter.subject_sem_type = req.query.subject_sem_type
    }

    // Filter by subject code (partial match)
    if (req.query.subject_code) {
      filter.subject_code = new RegExp(req.query.subject_code, 'i')
    }

    const subjects = await Subject.find(filter)
      .sort({ subject_sem: 1, subject_code: 1 }) // Sort by semester, then code

    res.json({ 
      success: true, 
      count: subjects.length,
      data: subjects 
    })

  } catch (error) {
    console.error('Error fetching subjects:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching subjects',
      error: error.message 
    })
  }
})

// GET /api/subjects/:id
// Purpose: Fetch a single subject by ID
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)

    if (!subject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subject not found' 
      })
    }

    res.json({ 
      success: true, 
      data: subject 
    })

  } catch (error) {
    console.error('Error fetching subject:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching subject',
      error: error.message 
    })
  }
})

// POST /api/subjects
// Purpose: Create a new subject
// Body: { subject_code, subject_name, hrs_per_week, subject_sem, subject_sem_type, max_hrs_Day }
router.post('/', async (req, res) => {
  try {
    const subject = await Subject.create(req.body)

    res.status(201).json({ 
      success: true, 
      message: 'Subject created successfully',
      data: subject 
    })

  } catch (error) {
    console.error('Error creating subject:', error)
    
    // Handle duplicate subject_code + subject_sem
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject code already exists for this semester' 
      })
    }

    res.status(400).json({ 
      success: false, 
      message: 'Error creating subject',
      error: error.message 
    })
  }
})

// PUT /api/subjects/:id
// Purpose: Update an existing subject
router.put('/:id', async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    if (!subject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subject not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Subject updated successfully',
      data: subject 
    })

  } catch (error) {
    console.error('Error updating subject:', error)
    res.status(400).json({ 
      success: false, 
      message: 'Error updating subject',
      error: error.message 
    })
  }
})

// DELETE /api/subjects/:id
// Purpose: Delete a subject
router.delete('/:id', async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id)

    if (!subject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subject not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Subject deleted successfully',
      data: subject 
    })

  } catch (error) {
    console.error('Error deleting subject:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting subject',
      error: error.message 
    })
  }
})

export default router
