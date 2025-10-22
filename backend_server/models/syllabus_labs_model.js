import mongoose from "mongoose"

const syllabus_lab_Schema = new mongoose.Schema(
  {
    lab_name: {type: String, required: true}, 
    lab_code: {type: String, required: true},
    lab_sem: {type: Number, required: true},
    lab_sem_type: {type: String, required: true, enum: ['odd', 'even']}, // Match odd/even semester type
    credits: {type: Number, required: true, default: 2}, // Weekly hours needed (always 2hrs per session typically)
    requires_two_teachers: {type: Boolean, default: true}, // Constraint: labs need 2 teachers
    duration_hours: {type: Number, default: 2} // Always 2 hours per lab session
  },
  { collection: 'Syllabus_Labs', timestamps: true }
)

syllabus_lab_Schema.index({ lab_code: 1, lab_sem: 1 }, { unique: true })

export default mongoose.model('Syllabus_Labs', syllabus_lab_Schema);