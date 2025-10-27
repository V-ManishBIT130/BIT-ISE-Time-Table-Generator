import mongoose from "mongoose";

const TeacherSchema = new mongoose.Schema(
  {
    name: {type: String, required: true },
    teacher_id: {type: String, required: true, unique: true},
    teacher_shortform: {type: String, trim: true, required: true},
    canTeach_subjects: [{type: mongoose.Schema.Types.ObjectId, ref: 'Subjects'}], //so this input is taken from a checkbox of subjects which the teacher can handle based on the given list of input subjects
    labs_handled: [{type: mongoose.Schema.Types.ObjectId, ref: 'Syllabus_Labs'}], //so this is again a list of checkboxes based on the labs that teacher can handle which is stored as an array
    teacher_position: {type: String, required: true} //assistant prof, associate prof, professor, guest faculty
    // NOTE: max_hours_per_week removed - workload is determined by Phase 2 assignments (subjects + labs)
    // Post-generation analytics will calculate actual hours worked per teacher
  },
  { collection: 'Teachers', timestamps: true }
)

export default mongoose.model('Teacher', TeacherSchema);