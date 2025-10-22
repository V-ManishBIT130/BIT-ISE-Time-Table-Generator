import mongoose from "mongoose"

const TeacherLabAssignmentSchema = new mongoose.Schema(
  {
    lab_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Syllabus_Labs', required: true},
    sem: {type: Number, required: true},
    sem_type: {type: String, enum: ['odd', 'even'], required: true},
    section: {type: String, required: true},
    batch_number: {type: Number, required: true, min: 1, max: 3},
    // ALWAYS exactly 2 teachers (constraint from Q7)
    teacher_ids: [{
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Teacher',
      required: true
    }],
    // These will be filled AFTER scheduling:
    scheduled_day: {type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']},
    scheduled_start_time: {type: String}, // e.g., '09:00'
    scheduled_end_time: {type: String}, // e.g., '11:00' (always 2 hours)
    assigned_lab_room: {type: mongoose.Schema.Types.ObjectId, ref: 'Dept_Labs'}
  },
  { collection: 'Teacher_Lab_Assignments', timestamps: true }
)

// Validation: must have exactly 2 teachers
TeacherLabAssignmentSchema.pre('save', function(next) {
  if (this.teacher_ids.length !== 2) {
    return next(new Error('Labs require exactly 2 teachers'))
  }
  next()
})

// Unique: one assignment per lab per batch
TeacherLabAssignmentSchema.index({ lab_id: 1, sem: 1, sem_type: 1, section: 1, batch_number: 1 }, { unique: true })

export default mongoose.model('Teacher_Lab_Assignment', TeacherLabAssignmentSchema);