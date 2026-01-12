import mongoose from "mongoose";

const TeacherSchema = new mongoose.Schema(
  {
    name: {type: String, required: true },
    teacher_id: {type: String, required: true, unique: true},
    teacher_shortform: {type: String, trim: true, required: true},
    canTeach_subjects: [{type: mongoose.Schema.Types.ObjectId, ref: 'Subjects'}], //so this input is taken from a checkbox of subjects which the teacher can handle based on the given list of input subjects
    labs_handled: [{type: mongoose.Schema.Types.ObjectId, ref: 'Syllabus_Labs'}], //so this is again a list of checkboxes based on the labs that teacher can handle which is stored as an array
    
    // HIERARCHICAL WORKLOAD MANAGEMENT (Added: Jan 2026)
    teacher_position: {
      type: String, 
      enum: ['Professor', 'Associate Professor', 'Assistant Professor'],
      required: true
    },
    
    // Maximum lab batches per week for EVEN semester (across all sections)
    // One lab batch = one 2-hour lab session with one batch of students (e.g., 3A1, 5B2)
    max_lab_assign_even: { 
      type: Number, 
      required: true,
      min: 0, 
      max: 30,
      default: function() {
        switch(this.teacher_position) {
          case 'Professor': return 2;
          case 'Associate Professor': return 4;
          case 'Assistant Professor': return 6;
          default: return 6;
        }
      }
    },
    
    // Maximum lab batches per week for ODD semester (across all sections)
    max_lab_assign_odd: { 
      type: Number, 
      required: true,
      min: 0,
      max: 30,
      default: function() {
        switch(this.teacher_position) {
          case 'Professor': return 2;
          case 'Associate Professor': return 4;
          case 'Assistant Professor': return 6;
          default: return 6;
        }
      }
    }
    
    // NOTE: max_hours_per_week removed - workload is determined by Phase 2 assignments (subjects + labs)
    // Post-generation analytics will calculate actual hours worked per teacher
  },
  { collection: 'Teachers', timestamps: true }
)

export default mongoose.model('Teacher', TeacherSchema);