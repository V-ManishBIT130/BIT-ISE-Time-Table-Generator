import mongoose from "mongoose"

/**
 * Timetable Model (Phase 3 Output)
 * 
 * Purpose: Store complete generated timetable for each section
 * One document = one section's complete weekly timetable
 * 
 * Generation Scope:
 * - For ODD sems: Generate for ALL odd semester sections (3A, 3B, 5A, 5B, 7A, etc.)
 * - For EVEN sems: Generate for ALL even semester sections (4A, 4B, 6A, 6B, 8A, etc.)
 * - All timetables in same sem_type are globally conflict-free
 * 
 * Key Features:
 * - Individual timetable per section (separate documents)
 * - Generated in ONE algorithm run with cross-section conflict checking
 * - No teacher/room/classroom double-booking across sections
 * - Complete information for display and printing
 */

const TimetableSchema = new mongoose.Schema(
  {
    // Section reference
    section_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ISE_Sections',
      required: true
    },
    section_name: {
      type: String,
      required: true
    },
    
    // Semester info
    sem: {
      type: Number,
      required: true,
      min: 3,
      max: 8
    },
    sem_type: {
      type: String,
      enum: ['odd', 'even'],
      required: true
    },
    
    // Academic year (e.g., "2024-25")
    academic_year: {
      type: String,
      required: true
    },
    
    // Generation metadata
    generation_date: {
      type: Date,
      default: Date.now
    },
    generation_metadata: {
      algorithm: {
        type: String,
        default: 'greedy'
      },
      fitness_score: {
        type: Number
      },
      generation_time_ms: {
        type: Number
      },
      teacher_assignment_summary: {
        total_lab_sessions: Number,
        sessions_with_2_teachers: Number,
        sessions_with_1_teacher: Number,
        sessions_with_0_teachers: Number
      },
      theory_scheduling_summary: {
        total_subjects_found: Number,
        regular_ise_found: Number,
        other_dept_found: Number,
        projects_found: Number,
        regular_ise_scheduled: Number,
        regular_ise_failed: Number,
        other_dept_scheduled: Number,
        other_dept_failed: Number,
        projects_scheduled: Number,
        projects_failed: Number,
        total_scheduled: Number,
        success_rate: String
      },
      current_step: Number,
      steps_completed: [String]
    },
    
    // Theory class slots
    theory_slots: [{
      subject_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subjects',
        required: true
      },
      subject_name: String,
      subject_shortform: String,
      
      teacher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
      },
      teacher_name: String,
      teacher_shortform: String,
      
      classroom_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom'
      },
      classroom_name: String,
      
      day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        required: true
      },
      start_time: {
        type: String,
        required: true
      },
      end_time: {
        type: String,
        required: true
      },
      duration_hours: {
        type: Number,
        required: true
      },
      is_fixed_slot: {
        type: Boolean,
        default: false
      }
    }],
    
    // Lab slots (all batches together in time)
    lab_slots: [{
      slot_type: {
        type: String,
        default: 'multi_batch_lab'
      },
      
      day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        required: true
      },
      start_time: {
        type: String,
        required: true
      },
      end_time: {
        type: String,
        required: true
      },
      duration_hours: {
        type: Number,
        default: 2
      },
      
      // All batches of section (batch synchronization)
      batches: [{
        batch_number: Number,
        batch_name: String,
        
        lab_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Syllabus_Labs'
        },
        lab_name: String,
        lab_shortform: String,
        
        lab_room_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Dept_Labs'
        },
        lab_room_name: String,
        
        // Teachers (0-2 allowed)
        teacher1_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Teacher'
        },
        teacher1_name: String,
        teacher1_shortform: String,
        
        teacher2_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Teacher'
        },
        teacher2_name: String,
        teacher2_shortform: String,
        
        teacher_status: {
          type: String,
          enum: ['2_teachers', '1_teacher', 'no_teachers'],
          default: 'no_teachers'
        }
      }]
    }],
    
    // Custom breaks (manually added or default breaks)
    breaks: [{
      day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        required: true
      },
      start_time: {
        type: String,
        required: true
      },
      end_time: {
        type: String,
        required: true
      },
      label: {
        type: String,
        default: 'Break'
      },
      isDefault: {
        type: Boolean,
        default: false
      },
      isRemoved: {
        type: Boolean,
        default: false
        // When true, indicates a default break was removed by user
        // This prevents the default break from reappearing in the grid
      }
    }],
    
    // Flagged sessions needing admin attention
    flagged_sessions: [{
      type: {
        type: String,
        enum: ['lab', 'theory']
      },
      batch_name: String,
      subject_or_lab_name: String,
      day: String,
      start_time: String,
      issue: String,
      severity: {
        type: String,
        enum: ['warning', 'error'],
        default: 'warning'
      }
    }]
  },
  {
    collection: 'Timetables',
    timestamps: true
  }
)

/**
 * Indexes
 */

// Unique: one timetable per section per semester type per academic year
TimetableSchema.index(
  { section_id: 1, sem_type: 1, academic_year: 1 },
  { unique: true }
)

// Query optimization: Find all timetables for a semester type
TimetableSchema.index({ sem_type: 1, academic_year: 1 })

// Query optimization: Find timetable by section
TimetableSchema.index({ section_id: 1 })

// Query optimization: Find timetables by semester
TimetableSchema.index({ sem: 1, sem_type: 1 })

/**
 * Instance Methods
 */

// Get total hours scheduled for this section
TimetableSchema.methods.getTotalHours = function() {
  let total = 0
  
  // Theory hours
  this.theory_slots.forEach(slot => {
    total += slot.duration_hours
  })
  
  // Lab hours
  this.lab_slots.forEach(slot => {
    total += slot.duration_hours
  })
  
  return total
}

// Get all teachers assigned to this section
TimetableSchema.methods.getAllTeachers = function() {
  const teacherSet = new Set()
  
  // Theory teachers
  this.theory_slots.forEach(slot => {
    if (slot.teacher_id) {
      teacherSet.add(slot.teacher_id.toString())
    }
  })
  
  // Lab teachers
  this.lab_slots.forEach(slot => {
    slot.batches.forEach(batch => {
      if (batch.teacher1_id) {
        teacherSet.add(batch.teacher1_id.toString())
      }
      if (batch.teacher2_id) {
        teacherSet.add(batch.teacher2_id.toString())
      }
    })
  })
  
  return Array.from(teacherSet).map(id => new mongoose.Types.ObjectId(id))
}

// Check if timetable has any flagged sessions
TimetableSchema.methods.hasFlaggedSessions = function() {
  return this.flagged_sessions && this.flagged_sessions.length > 0
}

/**
 * Static Methods
 */

// Find all timetables for a semester type
TimetableSchema.statics.findBySemesterType = function(semType, academicYear) {
  return this.find({
    sem_type: semType,
    academic_year: academicYear
  })
}

// Find timetable for specific section
TimetableSchema.statics.findBySection = function(sectionId, academicYear) {
  return this.findOne({
    section_id: sectionId,
    academic_year: academicYear
  })
}

// Delete all timetables for a semester type (for regeneration)
TimetableSchema.statics.deleteBySemesterType = function(semType, academicYear) {
  return this.deleteMany({
    sem_type: semType,
    academic_year: academicYear
  })
}

export default mongoose.model('Timetable', TimetableSchema)
