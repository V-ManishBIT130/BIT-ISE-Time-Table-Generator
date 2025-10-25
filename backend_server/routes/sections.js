import express from 'express'
import ISESection from '../models/ise_sections_model.js'

const router = express.Router()

// GET /api/sections
// Purpose: Fetch all sections with filtering
// Query params: ?sem=3&sem_type=odd&section_name=A
router.get('/', async (req, res) => {
  try {
    const filter = {}
    
    if (req.query.sem) {
      filter.sem = parseInt(req.query.sem)
    }
    
    if (req.query.sem_type) {
      filter.sem_type = req.query.sem_type
    }

    if (req.query.section_name) {
      filter.section_name = req.query.section_name
    }

    const sections = await ISESection.find(filter)
      .sort({ sem: 1, section_name: 1 })

    res.json({ 
      success: true, 
      count: sections.length,
      data: sections 
    })

  } catch (error) {
    console.error('Error fetching sections:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching sections',
      error: error.message 
    })
  }
})

// GET /api/sections/:id
router.get('/:id', async (req, res) => {
  try {
    const section = await ISESection.findById(req.params.id)

    if (!section) {
      return res.status(404).json({ 
        success: false, 
        message: 'Section not found' 
      })
    }

    res.json({ 
      success: true, 
      data: section 
    })

  } catch (error) {
    console.error('Error fetching section:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching section',
      error: error.message 
    })
  }
})

// POST /api/sections
// Purpose: Create a new section
// Body: { sem, sem_type, section_name, split_batches, batch_names, total_strength }
// Note: split_batches is always 3 per constraint Q6
router.post('/', async (req, res) => {
  try {
    // Auto-generate batch_names if not provided
    if (!req.body.batch_names && req.body.section_name && req.body.sem) {
      const sem = req.body.sem
      const section = req.body.section_name
      req.body.batch_names = [
        `${sem}${section}1`,
        `${sem}${section}2`,
        `${sem}${section}3`
      ]
    }

    const section = await ISESection.create(req.body)

    res.status(201).json({ 
      success: true, 
      message: 'Section created successfully',
      data: section 
    })

  } catch (error) {
    console.error('Error creating section:', error)
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Section already exists for this semester' 
      })
    }

    res.status(400).json({ 
      success: false, 
      message: 'Error creating section',
      error: error.message 
    })
  }
})

// PUT /api/sections/:id
router.put('/:id', async (req, res) => {
  try {
    const section = await ISESection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    if (!section) {
      return res.status(404).json({ 
        success: false, 
        message: 'Section not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Section updated successfully',
      data: section 
    })

  } catch (error) {
    console.error('Error updating section:', error)
    res.status(400).json({ 
      success: false, 
      message: 'Error updating section',
      error: error.message 
    })
  }
})

// DELETE /api/sections/:id
router.delete('/:id', async (req, res) => {
  try {
    const section = await ISESection.findByIdAndDelete(req.params.id)

    if (!section) {
      return res.status(404).json({ 
        success: false, 
        message: 'Section not found' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Section deleted successfully',
      data: section 
    })

  } catch (error) {
    console.error('Error deleting section:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting section',
      error: error.message 
    })
  }
})

export default router
