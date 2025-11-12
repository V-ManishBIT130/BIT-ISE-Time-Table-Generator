import express from 'express'
import Classroom from '../models/dept_class_model.js'
import Timetable from '../models/timetable_model.js'

const router = express.Router()

// GET /api/classrooms/available
// Purpose: Find classrooms available at a specific time slot
// THIS MUST BE BEFORE /:id route to avoid matching "available" as an ID
router.get('/available', async (req, res) => {
  try {
    const { day, start_time, end_time, sem_type, academic_year, exclude_timetable_id } = req.query

    console.log(`🔍 Checking available classrooms for: ${day} ${start_time}, sem_type: ${sem_type}, year: ${academic_year}`)
    if (exclude_timetable_id) {
      console.log(`   🚫 Excluding timetable: ${exclude_timetable_id} (checking only OTHER sections)`)
    }

    if (!day || !start_time || !sem_type || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: day, start_time, sem_type, academic_year'
      })
    }

    // Get all classrooms
    const allClassrooms = await Classroom.find().sort({ room_no: 1 })
    console.log(`   Total classrooms in DB: ${allClassrooms.length}`)

    // Find all timetables for this sem_type and academic_year
    // 🆕 EXCLUDE the current timetable if exclude_timetable_id is provided
    const query = {
      sem_type,
      academic_year
    }
    if (exclude_timetable_id) {
      query._id = { $ne: exclude_timetable_id }
    }
    
    const timetables = await Timetable.find(query)
    console.log(`   Found ${timetables.length} timetables for ${sem_type} ${academic_year}${exclude_timetable_id ? ' (excluding current)' : ''}`)

    // DEBUG: Log first timetable's structure
    if (timetables.length > 0 && timetables[0].theory_slots && timetables[0].theory_slots.length > 0) {
      const sampleSlot = timetables[0].theory_slots[0]
      console.log(`   🔍 Sample slot structure:`, {
        day: sampleSlot.day,
        start_time: sampleSlot.start_time,
        end_time: sampleSlot.end_time,
        duration_hours: sampleSlot.duration_hours,
        classroom_id: sampleSlot.classroom_id,
        classroom_name: sampleSlot.classroom_name
      })
    }

    // Collect occupied classroom IDs at this time slot
    const occupiedClassroomIds = new Set()

    // Helper: Check if two time ranges overlap
    const timesOverlap = (start1, end1, start2, end2) => {
      // Convert "HH:MM" to minutes since midnight for comparison
      const toMinutes = (time) => {
        const [h, m] = time.split(':').map(Number)
        return h * 60 + m
      }
      
      const s1 = toMinutes(start1)
      const e1 = toMinutes(end1)
      const s2 = toMinutes(start2)
      const e2 = toMinutes(end2)
      
      // Two ranges overlap if: start1 < end2 AND start2 < end1
      return s1 < e2 && s2 < e1
    }

    console.log(`   🔍 Checking for conflicts between ${start_time} - ${end_time}`)

    timetables.forEach(tt => {
      if (tt.theory_slots && Array.isArray(tt.theory_slots)) {
        tt.theory_slots.forEach(slot => {
          // Check if this slot is on the same day AND times overlap
          if (slot.day === day && slot.classroom_id) {
            // Check if the slot's time range overlaps with our requested time range
            if (timesOverlap(start_time, end_time, slot.start_time, slot.end_time)) {
              occupiedClassroomIds.add(slot.classroom_id.toString())
              console.log(`   ⚠️ Room ${slot.classroom_name} occupied: ${slot.start_time}-${slot.end_time} overlaps with ${start_time}-${end_time}`)
            }
          }
        })
      }
    })
    console.log(`   Occupied classrooms at ${day} ${start_time}-${end_time}: ${occupiedClassroomIds.size}`)
    if (occupiedClassroomIds.size > 0) {
      console.log(`   📍 Occupied room IDs: ${Array.from(occupiedClassroomIds).join(', ')}`)
    }

    // Filter available classrooms
    const availableClassrooms = allClassrooms.filter(classroom => 
      !occupiedClassroomIds.has(classroom._id.toString())
    )
    console.log(`   ✅ Available classrooms: ${availableClassrooms.length} - ${availableClassrooms.map(c => c.room_no).slice(0, 5).join(', ')}${availableClassrooms.length > 5 ? '...' : ''}`)

    res.json({
      success: true,
      count: availableClassrooms.length,
      data: availableClassrooms
    })

  } catch (error) {
    console.error('Error fetching available classrooms:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching available classrooms',
      error: error.message
    })
  }
})

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
