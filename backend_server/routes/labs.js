import express from 'express'
import SyllabusLab from '../models/syllabus_labs_model.js'

const router = express.Router()

// GET /api/labs
// Purpose: Fetch all labs with filtering by semester/type
// Query params: ?lab_sem=3&lab_sem_type=odd
router.get('/', async (req, res) => {
  try {
    const filter = {}
    
    if (req.query.lab_sem) {
      filter.lab_sem = parseInt(req.query.lab_sem)
    }
    
    if (req.query.lab_sem_type) {
      filter.lab_sem_type = req.query.lab_sem_type
    }

    if (req.query.lab_code) {
      filter.lab_code = new RegExp(req.query.lab_code, 'i')
    }

    const labs = await SyllabusLab.find(filter)
      .sort({ lab_sem: 1, lab_code: 1 })

    res.json({ 
      success: true, 
      count: labs.length,
      data: labs 
    })

  } catch (error) {
    console.error('Error fetching labs:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching labs',
      error: error.message 
    })
  }
})

// GET /api/labs/:id
router.get('/:id', async (req, res) => {
  try {
    const lab = await SyllabusLab.findById(req.params.id)

    if (!lab) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lab not found' 
      })
    }

    res.json({ 
      success: true, 
      data: lab 
    })

  } catch (error) {
    console.error('Error fetching lab:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching lab',
      error: error.message 
    })
  }
})

// POST /api/labs
// Purpose: Create a new lab
// Body: { lab_name, lab_code, lab_sem, lab_sem_type, credits, duration_hours }
router.post('/', async (req, res) => {
  try {
    const lab = await SyllabusLab.create(req.body)

    res.status(201).json({ 
      success: true, 
      message: 'Lab created successfully',
      data: lab 
    })

  } catch (error) {
    console.error('Error creating lab:', error)
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lab code already exists for this semester' 
      })
    }

    res.status(400).json({ 
      success: false, 
      message: 'Error creating lab',
      error: error.message 
    })
  }
})

// PUT /api/labs/:id
router.put('/:id', async (req, res) => {
  try {
    const lab = await SyllabusLab.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    if (!lab) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lab not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Lab updated successfully',
      data: lab 
    })

  } catch (error) {
    console.error('Error updating lab:', error)
    res.status(400).json({ 
      success: false, 
      message: 'Error updating lab',
      error: error.message 
    })
  }
})

// DELETE /api/labs/:id
router.delete('/:id', async (req, res) => {
  try {
    const lab = await SyllabusLab.findByIdAndDelete(req.params.id)

    if (!lab) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lab not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Lab deleted successfully',
      data: lab 
    })

  } catch (error) {
    console.error('Error deleting lab:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting lab',
      error: error.message 
    })
  }
})

export default router
