import express from 'express'
import Classroom from '../models/dept_class_model.js'

const router = express.Router()

// GET /api/classrooms
// Purpose: Fetch all theory classrooms
router.get('/', async (req, res) => {
  try {
    const classrooms = await Classroom.find()
      .sort({ room_no: 1 })

    res.json({ 
      success: true, 
      count: classrooms.length,
      data: classrooms 
    })

  } catch (error) {
    console.error('Error fetching classrooms:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching classrooms',
      error: error.message 
    })
  }
})

// GET /api/classrooms/:id
router.get('/:id', async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id)

    if (!classroom) {
      return res.status(404).json({ 
        success: false, 
        message: 'Classroom not found' 
      })
    }

    res.json({ 
      success: true, 
      data: classroom 
    })

  } catch (error) {
    console.error('Error fetching classroom:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching classroom',
      error: error.message 
    })
  }
})

// POST /api/classrooms
// Purpose: Add a new theory classroom
// Body: { room_no, capacity }
router.post('/', async (req, res) => {
  try {
    const classroom = await Classroom.create(req.body)

    res.status(201).json({ 
      success: true, 
      message: 'Classroom created successfully',
      data: classroom 
    })

  } catch (error) {
    console.error('Error creating classroom:', error)
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Classroom number already exists' 
      })
    }

    res.status(400).json({ 
      success: false, 
      message: 'Error creating classroom',
      error: error.message 
    })
  }
})

// PUT /api/classrooms/:id
router.put('/:id', async (req, res) => {
  try {
    const classroom = await Classroom.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    if (!classroom) {
      return res.status(404).json({ 
        success: false, 
        message: 'Classroom not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Classroom updated successfully',
      data: classroom 
    })

  } catch (error) {
    console.error('Error updating classroom:', error)
    res.status(400).json({ 
      success: false, 
      message: 'Error updating classroom',
      error: error.message 
    })
  }
})

// DELETE /api/classrooms/:id
router.delete('/:id', async (req, res) => {
  try {
    const classroom = await Classroom.findByIdAndDelete(req.params.id)

    if (!classroom) {
      return res.status(404).json({ 
        success: false, 
        message: 'Classroom not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Classroom deleted successfully',
      data: classroom 
    })

  } catch (error) {
    console.error('Error deleting classroom:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting classroom',
      error: error.message 
    })
  }
})

export default router
