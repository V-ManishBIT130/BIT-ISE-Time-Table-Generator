import mongoose from "mongoose";

const subjects_Schema = new mongoose.Schema(
  {
    subject_code: {type: String, required: true, trim: true},
    subject_name: {type: String, required: true, trim: true},
    subject_shortform: {type: String, required: true, trim: true},
    hrs_per_week: {type: Number, required: true, default: 3}, //basically credits
    subject_sem: {type: Number, required: true, min: 3, max: 8}, // Only semesters 3-8 (ISE department responsibility)
    subject_sem_type: {type: String, required: true, enum: ['odd', 'even']}, //even sem or odd sem
    max_hrs_Day: {type: Number, default: 1}, //1 hr or 2 hrs max allocated for this subject per day, so total hours for a week must be same as the hrs_per_week
    duration_hours: {type: Number, default: 1}, // Theory always 1 hour
    is_project: {type: Boolean, default: false}, // true for Major/Mini Projects - no teacher assignment needed (DEFAULT: false for regular ISE theory)
    is_non_ise_subject: {type: Boolean, default: false}, // true for subjects handled by other departments like Maths, Physics, etc. - occupies timetable but no ISE teacher needed (DEFAULT: false for regular ISE theory)
    is_open_elective: {type: Boolean, default: false}, // true for Open Elective (7th sem) - taught by external teacher, has fixed schedule, no ISE teacher needed
    is_professional_elective: {type: Boolean, default: false}, // true for Professional Elective (7th sem) - taught by ISE teacher, has fixed schedule, needs ISE teacher
    requires_teacher_assignment: {type: Boolean, default: true}, // false ONLY for projects/open electives/non-ISE subjects, true for regular ISE subjects and professional electives (DEFAULT: true)
    has_fixed_schedule: {type: Boolean, default: false}, // true for Open Elective, Professional Elective (auto-set based on is_open_elective or is_professional_elective)
    fixed_schedule: [{
      day: {type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']},
      start_time: {type: String}, // e.g., "08:00 AM", "09:30 AM"
      end_time: {type: String}    // e.g., "09:30 AM", "11:00 AM"
    }] // Only used if has_fixed_schedule = true
  },
  { collection: 'Subjects', timestamps: true }
);

subjects_Schema.index({ subject_code: 1, subject_sem: 1 }, { unique: true })

// Pre-save hook to auto-set has_fixed_schedule based on fixed_schedule array
subjects_Schema.pre('save', function(next) {
  // Auto-set has_fixed_schedule if fixed_schedule array has items
  if (this.fixed_schedule && this.fixed_schedule.length > 0) {
    this.has_fixed_schedule = true;
  } else {
    this.has_fixed_schedule = false;
  }
  
  // Auto-set requires_teacher_assignment based on subject type
  if (this.is_project || this.is_open_elective || this.is_non_ise_subject) {
    this.requires_teacher_assignment = false;
  } else if (this.is_professional_elective) {
    this.requires_teacher_assignment = true; // PEC needs ISE teacher
  }
  
  next();
});

// Pre-update hook to handle findOneAndUpdate
subjects_Schema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Handle fixed_schedule updates
  if (update.fixed_schedule) {
    if (Array.isArray(update.fixed_schedule) && update.fixed_schedule.length > 0) {
      update.has_fixed_schedule = true;
    } else {
      update.has_fixed_schedule = false;
    }
  }
  
  // Handle requires_teacher_assignment updates
  if (update.is_project || update.is_open_elective || update.is_non_ise_subject) {
    update.requires_teacher_assignment = false;
  } else if (update.is_professional_elective) {
    update.requires_teacher_assignment = true;
  }
  
  next();
});

export default mongoose.model('Subjects', subjects_Schema); // Singular model name
