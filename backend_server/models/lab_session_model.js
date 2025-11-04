import mongoose from "mongoose"

/**
 * Lab Session Model (Phase 3 Output)
 * 
 * Purpose: Groups all batches of a section into ONE time slot
 * Enforces constraint: "All batches must be together in time"
 * 
 * Key Features:
 * - One document = one time slot for entire section
 * - All batches MUST be present in batch_assignments array
 * - Each batch can have SAME or DIFFERENT lab
 * - Teachers: 0-2 allowed (assigned dynamically in Phase 3 Step 4)
 * - Lab rooms: from Phase 2 Lab_Room_Assignments
 * - Prevents partial sessions (atomic operations)
 */

const LabSessionSchema = new mongoose.Schema(
  {
    // Section reference
    section_id: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'ISE_Sections', 
      required: true
    },
    
    // Semester info (for queries and validation)
    sem: {type: Number, required: true, min: 3, max: 8},
    sem_type: {type: String, enum: ['odd', 'even'], required: true},
    
    // Time slot - applies to ALL batches (enforces "together in time")
    scheduled_day: {
      type: String, 
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      required: true
    },
    scheduled_start_time: {
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          // Validate HH:MM format
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)
        },
        message: 'Invalid time format. Use HH:MM (e.g., 08:30)'
      }
    },
    scheduled_end_time: {
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)
        },
        message: 'Invalid time format. Use HH:MM (e.g., 10:30)'
      }
    },
    
    // Batch-level assignments (can be same or different labs)
    batch_assignments: [{
      batch_name: {
        type: String, 
        required: true,
        trim: true
      }, // e.g., "3A1", "3A2", "3A3"
      
      lab_id: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Syllabus_Labs', 
        required: true
      },
      
      // Teachers: 0-2 allowed (assigned dynamically in Phase 3 Step 4)
      teacher_ids: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Teacher'
        // NOT required! Can be 0, 1, or 2 teachers
      }],
      
      // Track teacher assignment status
      teacher_status: {
        type: String,
        enum: ['2_teachers', '1_teacher', 'no_teachers'],
        default: 'no_teachers'
      },
      
      // Physical lab room (from Phase 2 - Lab_Room_Assignments)
      lab_room: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Dept_Labs',
        required: true
      }
    }]
  },
  { 
    collection: 'Lab_Sessions', 
    timestamps: true 
  }
)

/**
 * Pre-save Validation Hook
 * Ensures data integrity before saving to database
 */
LabSessionSchema.pre('save', async function(next) {
  try {
    // Validation 1: Get section details to know expected batch count
    const section = await mongoose.model('ISE_Sections').findById(this.section_id)
    
    if (!section) {
      return next(new Error('Section not found'))
    }
    
    // Validation 2: All batches must be present
    if (this.batch_assignments.length !== section.num_batches) {
      return next(new Error(
        `All ${section.num_batches} batches must be assigned. Found ${this.batch_assignments.length} batch(es).`
      ))
    }
    
    // Validation 3: Check batch names match section's batches
    const expectedBatchNames = section.batch_names.sort()
    const providedBatchNames = this.batch_assignments.map(b => b.batch_name).sort()
    
    const mismatch = expectedBatchNames.some((name, idx) => name !== providedBatchNames[idx])
    if (mismatch) {
      return next(new Error(
        `Batch names must be: ${expectedBatchNames.join(', ')}. Got: ${providedBatchNames.join(', ')}`
      ))
    }
    
    // Validation 4: Each batch can have 0-2 teachers (flexible constraint)
    for (let i = 0; i < this.batch_assignments.length; i++) {
      const assignment = this.batch_assignments[i]
      
      // Allow 0, 1, or 2 teachers
      if (assignment.teacher_ids && assignment.teacher_ids.length > 2) {
        return next(new Error(
          `Batch ${assignment.batch_name} can have maximum 2 teachers. Found ${assignment.teacher_ids.length}.`
        ))
      }
      
      // Auto-set teacher_status based on teacher count
      const teacherCount = assignment.teacher_ids?.length || 0
      if (teacherCount === 2) {
        assignment.teacher_status = '2_teachers'
      } else if (teacherCount === 1) {
        assignment.teacher_status = '1_teacher'
      } else {
        assignment.teacher_status = 'no_teachers'
      }
    }
    
    // Validation 5: End time must be after start time
    const [startH, startM] = this.scheduled_start_time.split(':').map(Number)
    const [endH, endM] = this.scheduled_end_time.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    
    if (endMinutes <= startMinutes) {
      return next(new Error('End time must be after start time'))
    }
    
    // Validation 6: Lab sessions should be 2 hours (typical constraint)
    const duration = endMinutes - startMinutes
    if (duration !== 120) {
      console.warn(`Warning: Lab session duration is ${duration} minutes. Expected 120 minutes (2 hours).`)
    }
    
    next()
  } catch (error) {
    next(error)
  }
})

/**
 * Indexes for Performance and Uniqueness
 */

// Unique constraint: One session per section per time slot
LabSessionSchema.index({ 
  section_id: 1, 
  scheduled_day: 1, 
  scheduled_start_time: 1 
}, { unique: true })

// Query optimization: Find sessions by semester
LabSessionSchema.index({ sem: 1, sem_type: 1 })

// Query optimization: Find sessions by day
LabSessionSchema.index({ scheduled_day: 1 })

/**
 * Instance Methods
 */

// Check if a teacher is assigned to any batch in this session
LabSessionSchema.methods.hasTeacher = function(teacherId) {
  return this.batch_assignments.some(assignment => 
    assignment.teacher_ids.some(id => id.equals(teacherId))
  )
}

// Check if a lab room is used in any batch
LabSessionSchema.methods.hasLabRoom = function(labRoomId) {
  return this.batch_assignments.some(assignment => 
    assignment.lab_room.equals(labRoomId)
  )
}

// Get all unique teachers in this session
LabSessionSchema.methods.getAllTeachers = function() {
  const teacherSet = new Set()
  this.batch_assignments.forEach(assignment => {
    assignment.teacher_ids.forEach(id => teacherSet.add(id.toString()))
  })
  return Array.from(teacherSet).map(id => new mongoose.Types.ObjectId(id))
}

// Get all unique lab rooms used
LabSessionSchema.methods.getAllLabRooms = function() {
  return [...new Set(this.batch_assignments.map(a => a.lab_room.toString()))]
    .map(id => new mongoose.Types.ObjectId(id))
}

/**
 * Static Methods
 */

// Find sessions where a specific teacher is assigned
LabSessionSchema.statics.findByTeacher = function(teacherId) {
  return this.find({
    'batch_assignments.teacher_ids': teacherId
  })
}

// Find sessions using a specific lab room
LabSessionSchema.statics.findByLabRoom = function(labRoomId) {
  return this.find({
    'batch_assignments.lab_room': labRoomId
  })
}

// Check if time slot is available for a section
LabSessionSchema.statics.isSlotAvailable = async function(sectionId, day, startTime) {
  const existing = await this.findOne({
    section_id: sectionId,
    scheduled_day: day,
    scheduled_start_time: startTime
  })
  return !existing
}

export default mongoose.model('Lab_Session', LabSessionSchema)
