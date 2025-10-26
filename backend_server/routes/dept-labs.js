import express from 'express'
import DeptLab from '../models/dept_labs_model.js'

const router = express.Router()

// GET /api/dept-labs
// Purpose: Fetch all department lab rooms
router.get('/', async (req, res) => {
  try {
    const labs = await DeptLab.find()
      .populate('lab_subjects_handled', 'lab_code lab_name lab_shortform') // Show which labs this room supports
      .sort({ labRoom_no: 1 })

    res.json({ 
      success: true, 
      count: labs.length,
      data: labs 
    })

  } catch (error) {
    console.error('Error fetching dept labs:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dept labs',
      error: error.message 
    })
  }
})

// GET /api/dept-labs/:id
router.get('/:id', async (req, res) => {
  try {
    const lab = await DeptLab.findById(req.params.id)
      .populate('lab_subjects_handled', 'lab_code lab_name lab_shortform')

    if (!lab) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lab room not found' 
      })
    }

    res.json({ 
      success: true, 
      data: lab 
    })

  } catch (error) {
    console.error('Error fetching lab room:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching lab room',
      error: error.message 
    })
  }
})

// POST /api/dept-labs
// Purpose: Add a new lab room
// Body: { labRoom_no, lab_subjects_handled[], capacity }
// lab_subjects_handled: array of Syllabus_Labs ObjectIds this room can host
router.post('/', async (req, res) => {
  try {
    const lab = await DeptLab.create(req.body)

    res.status(201).json({ 
      success: true, 
      message: 'Lab room created successfully',
      data: lab 
    })

  } catch (error) {
    console.error('Error creating lab room:', error)
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lab room number already exists' 
      })
    }

    res.status(400).json({ 
      success: false, 
      message: 'Error creating lab room',
      error: error.message 
    })
  }
})

// PUT /api/dept-labs/:id
// Purpose: Update lab room (e.g., add/remove supported labs)
router.put('/:id', async (req, res) => {
  try {
    const lab = await DeptLab.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('lab_subjects_handled', 'lab_code lab_name')

    if (!lab) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lab room not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Lab room updated successfully',
      data: lab 
    })

  } catch (error) {
    console.error('Error updating lab room:', error)
    res.status(400).json({ 
      success: false, 
      message: 'Error updating lab room',
      error: error.message 
    })
  }
})

// DELETE /api/dept-labs/:id
router.delete('/:id', async (req, res) => {
  try {
    const lab = await DeptLab.findByIdAndDelete(req.params.id)

    if (!lab) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lab room not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Lab room deleted successfully',
      data: lab 
    })

  } catch (error) {
    console.error('Error deleting lab room:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting lab room',
      error: error.message 
    })
  }
})

export default router
