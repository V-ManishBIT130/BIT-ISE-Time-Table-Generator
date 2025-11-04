import express from 'express'
import LabRoomAssignment from '../models/lab_room_assignment_model.js'
import SyllabusLabs from '../models/syllabus_labs_model.js'
import ISESections from '../models/ise_sections_model.js'
import DeptLabs from '../models/dept_labs_model.js'
import { autoAssignLabRooms, validateLabRoomAssignments } from '../algorithms/auto_lab_room_assignment_v2.js'

const router = express.Router()

/**
 * GET /api/lab-room-assignments
 * Purpose: Fetch all automatic lab room assignments
 * Query params: ?sem=3&sem_type=odd&section=A&batch_number=1
 */
router.get('/', async (req, res) => {
  try {
    const filter = {}
    
    if (req.query.sem) filter.sem = parseInt(req.query.sem)
    if (req.query.sem_type) filter.sem_type = req.query.sem_type
    if (req.query.section) filter.section = req.query.section
    if (req.query.batch_number) filter.batch_number = parseInt(req.query.batch_number)
    if (req.query.lab_id) filter.lab_id = req.query.lab_id

    const assignments = await LabRoomAssignment.find(filter)
      .populate('lab_id', 'lab_code lab_name lab_shortform duration_hours')
      .populate('assigned_lab_room', 'labRoom_no lab_subjects_handled')
      .sort({ sem: 1, section: 1, batch_number: 1 })

    res.json({ 
      success: true, 
      count: assignments.length,
      data: assignments 
    })

  } catch (error) {
    console.error('Error fetching lab room assignments:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching lab room assignments',
      error: error.message 
    })
  }
})

/**
 * POST /api/lab-room-assignments/auto-assign
 * Purpose: AUTOMATICALLY assign lab rooms to all batches
 * Body: { sem_type: 'odd' | 'even', academic_year: '2024-2025' }
 * 
 * Algorithm:
 * 1. Get all sections for semester type
 * 2. For each section, get required labs
 * 3. For each lab, find compatible rooms (equipment-based)
 * 4. Use global room usage counter for even distribution
 * 5. Assign least-used compatible room to each batch
 */
router.post('/auto-assign', async (req, res) => {
  try {
    const { sem_type, academic_year } = req.body

    if (!sem_type || !['odd', 'even'].includes(sem_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sem_type. Must be "odd" or "even"'
      })
    }

    console.log(`\n🤖 Starting AUTOMATIC lab room assignment for ${sem_type} semester...`)
    
    // Step 1: Get all sections for this semester type
    const sections = await ISESections.find({ 
      sem_type,
      ...(academic_year && { academic_year })
    }).lean()
    
    if (sections.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No sections found for ${sem_type} semester`
      })
    }
    
    console.log(`✅ Found ${sections.length} sections to process`)
    
    // Global room usage counter (tracks how many times each room is assigned)
    const roomUsageCounter = {}
    
    // Results tracking
    const assignments = []
    const stats = {
      totalAssignments: 0,
      sectionsProcessed: 0,
      labsProcessed: 0,
      roomDistribution: {}
    }
    
    // Step 2: Process each section
    for (const section of sections) {
      console.log(`\n📋 Processing Section ${section.sem}${section.section_name}...`)
      
      // Get required labs for this semester
      const labs = await SyllabusLabs.find({ lab_sem: section.sem }).lean()
      
      if (labs.length === 0) {
        console.log(`⚠️ No labs defined for Semester ${section.sem}, skipping...`)
        continue
      }
      
      stats.sectionsProcessed++
      
      // Step 3: For each lab, assign rooms to all batches
      for (const lab of labs) {
        console.log(`  🔬 Processing ${lab.lab_name}...`)
        
        // Find compatible rooms (equipment-based)
        const compatibleRooms = await DeptLabs.find({
          lab_subjects_handled: { $in: [lab._id] }
        }).lean()
        
        if (compatibleRooms.length === 0) {
          console.log(`    ❌ No compatible rooms found for ${lab.lab_name}!`)
          continue
        }
        
        console.log(`    ✅ Found ${compatibleRooms.length} compatible rooms`)
        
        // Initialize room usage counter for new rooms
        compatibleRooms.forEach(room => {
          if (!(room._id.toString() in roomUsageCounter)) {
            roomUsageCounter[room._id.toString()] = 0
          }
        })
        
        // Step 4: Assign rooms using ROUND-ROBIN per lab type
        // This ensures even distribution and minimizes conflicts
        const batchCount = section.num_batches || 3 // Default 3 batches
        
        // Calculate starting index based on global usage (for cross-section distribution)
        const totalUsageForThisLab = compatibleRooms.reduce((sum, room) => {
          return sum + (roomUsageCounter[room._id.toString()] || 0)
        }, 0)
        
        for (let batchNum = 1; batchNum <= batchCount; batchNum++) {
          // Round-robin: cycle through compatible rooms
          const roomIndex = (totalUsageForThisLab + batchNum - 1) % compatibleRooms.length
          const assignedRoom = compatibleRooms[roomIndex]
          
          const currentUsage = roomUsageCounter[assignedRoom._id.toString()]
          
          // Create assignment document
          const assignment = {
            lab_id: lab._id,
            sem: section.sem,
            sem_type: section.sem_type,
            section: section.section_name,
            batch_number: batchNum,
            assigned_lab_room: assignedRoom._id,
            assignment_metadata: {
              compatible_rooms_count: compatibleRooms.length,
              room_usage_rank: currentUsage,
              assigned_at: new Date()
            }
          }
          
          assignments.push(assignment)
          
          // Update usage counter
          roomUsageCounter[assignedRoom._id.toString()]++
          
          // Update stats
          stats.totalAssignments++
          if (!stats.roomDistribution[assignedRoom.labRoom_no]) {
            stats.roomDistribution[assignedRoom.labRoom_no] = 0
          }
          stats.roomDistribution[assignedRoom.labRoom_no]++
          
          console.log(`    ✅ Batch ${section.sem}${section.section_name}${batchNum} → Room ${assignedRoom.labRoom_no} (usage: ${currentUsage} → ${currentUsage + 1})`)
        }
        
        stats.labsProcessed++
      }
    }
    
    // Step 5: Save all assignments to database
    console.log(`\n💾 Saving ${assignments.length} assignments to database...`)
    
    // Clear existing assignments for this semester type (start fresh)
    const deleteResult = await LabRoomAssignment.deleteMany({ sem_type })
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} old assignments`)
    
    // Bulk insert all assignments
    const result = await LabRoomAssignment.insertMany(assignments)
    
    console.log(`✅ Successfully saved ${result.length} lab room assignments!`)
    
    // Step 6: Print statistics
    console.log(`\n📊 ASSIGNMENT STATISTICS:`)
    console.log(`   Sections Processed: ${stats.sectionsProcessed}`)
    console.log(`   Labs Processed: ${stats.labsProcessed}`)
    console.log(`   Total Assignments: ${stats.totalAssignments}`)
    console.log(`\n   Room Distribution:`)
    
    Object.entries(stats.roomDistribution)
      .sort((a, b) => b[1] - a[1]) // Sort by usage (descending)
      .forEach(([room, count]) => {
        console.log(`     ${room}: ${count} assignments`)
      })
    
    res.json({
      success: true,
      message: `Successfully assigned lab rooms for ${sem_type} semester`,
      data: {
        totalAssignments: result.length,
        sectionsProcessed: stats.sectionsProcessed,
        labsProcessed: stats.labsProcessed,
        roomDistribution: stats.roomDistribution,
        deletedOldAssignments: deleteResult.deletedCount
      }
    })
    
  } catch (error) {
    console.error('❌ Error in auto-assignment:', error)
    res.status(500).json({
      success: false,
      message: 'Error during automatic lab room assignment',
      error: error.message
    })
  }
})

/**
 * Helper function to find least-used room from compatible rooms
 * @param {Array} compatibleRooms - Array of room documents
 * @param {Object} usageCounter - Room usage counter object
 * @returns {Object} - Least-used room document
 */
function findLeastUsedRoom(compatibleRooms, usageCounter) {
  // Sort rooms by usage count (ascending)
  const sortedRooms = [...compatibleRooms].sort((a, b) => {
    const usageA = usageCounter[a._id.toString()] || 0
    const usageB = usageCounter[b._id.toString()] || 0
    return usageA - usageB
  })
  
  // Return least-used room
  return sortedRooms[0]
}

/**
 * DELETE /api/lab-room-assignments/clear
 * Purpose: Clear all assignments for a semester type
 * Body: { sem_type: 'odd' | 'even' }
 */
router.delete('/clear', async (req, res) => {
  try {
    const { sem_type } = req.body

    if (!sem_type || !['odd', 'even'].includes(sem_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sem_type. Must be "odd" or "even"'
      })
    }

    const result = await LabRoomAssignment.deleteMany({ sem_type })

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} assignments for ${sem_type} semester`,
      deletedCount: result.deletedCount
    })

  } catch (error) {
    console.error('Error clearing assignments:', error)
    res.status(500).json({
      success: false,
      message: 'Error clearing assignments',
      error: error.message
    })
  }
})

/**
 * POST /api/lab-room-assignments/auto-assign-v2
 * Purpose: Use REVISED rotation-aware algorithm for conflict-free assignments
 * Body: { sem_type: 'odd'|'even', academic_year: '2024-2025' }
 */
router.post('/auto-assign-v2', async (req, res) => {
  try {
    const { sem_type, academic_year } = req.body

    if (!sem_type || !['odd', 'even'].includes(sem_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sem_type. Must be "odd" or "even"'
      })
    }

    // Call the new v2 algorithm
    const result = await autoAssignLabRooms(sem_type, academic_year)
    
    res.json(result)
    
  } catch (error) {
    console.error('❌ Error in v2 auto-assignment:', error)
    res.status(500).json({
      success: false,
      message: 'Error during automatic lab room assignment (v2)',
      error: error.message
    })
  }
})

/**
 * POST /api/lab-room-assignments/validate
 * Purpose: Validate lab room assignments for conflicts
 * Body: { sem_type: 'odd'|'even' }
 */
router.post('/validate', async (req, res) => {
  try {
    const { sem_type } = req.body

    if (!sem_type || !['odd', 'even'].includes(sem_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sem_type. Must be "odd" or "even"'
      })
    }

    const result = await validateLabRoomAssignments(sem_type)
    
    res.json(result)
    
  } catch (error) {
    console.error('❌ Error in validation:', error)
    res.status(500).json({
      success: false,
      message: 'Error during validation',
      error: error.message
    })
  }
})

export default router
