import mongoose from "mongoose";

const subjects_Schema = new mongoose.Schema(
  {
    subject_code: {type: String, required: true, trim: true},
    subject_name: {type: String, required: true, trim: true},
    hrs_per_week: {type: Number, required: true, default: 3}, //basically credits
    subject_sem: {type: Number, required: true, min: 3, max: 8}, // Only semesters 3-8 (ISE department responsibility)
    subject_sem_type: {type: String, required: true, enum: ['odd', 'even']}, //even sem or odd sem
    max_hrs_Day: {type: Number, default: 1}, //1 hr or 2 hrs max allocated for this subject per day, so total hours for a week must be same as the hrs_per_week
    duration_hours: {type: Number, default: 1}, // Theory always 1 hour
    is_project: {type: Boolean, default: false}, // true for Major/Mini Projects - no teacher assignment needed
    requires_teacher_assignment: {type: Boolean, default: true} // false for projects, true for regular subjects
  },
  { collection: 'Subjects', timestamps: true }
);

subjects_Schema.index({ subject_code: 1, subject_sem: 1 }, { unique: true })

export default mongoose.model('Subjects', subjects_Schema); // Singular model name
