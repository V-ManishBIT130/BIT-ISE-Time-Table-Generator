import mongoose from "mongoose"

const TeacherSubjectAssignmentSchema = new mongoose.Schema(
  {
    teacher_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true},
    subject_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Subjects', required: true},
    sem: {type: Number, required: true},
    sem_type: {type: String, enum: ['odd', 'even'], required: true},
    section: {type: String, required: true}, // 'A', 'B', 'C'
    // These will be filled AFTER scheduling:
    scheduled_slots: [{
      day: String,
      start_time: String,
      end_time: String,
      classroom: {type: mongoose.Schema.Types.ObjectId, ref: 'Classroom'}
    }]
  },
  { collection: 'Teacher_Subject_Assignments', timestamps: true }
)

// Unique: one teacher per subject per section
TeacherSubjectAssignmentSchema.index({ subject_id: 1, sem: 1, sem_type: 1, section: 1 }, { unique: true })
// Check teacher availability
TeacherSubjectAssignmentSchema.index({ teacher_id: 1 })

export default mongoose.model('Teacher_Subject_Assignment', TeacherSubjectAssignmentSchema);