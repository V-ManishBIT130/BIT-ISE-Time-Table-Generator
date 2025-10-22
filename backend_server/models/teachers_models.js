import mongoose from "mongoose";

const TeacherSchema = new mongoose.Schema(
  {
    name: {type: String, required: true },
    email: { type: String },
    mobile_num: {type: String}, //changed to string type
    teacher_id: {type: String, required: true,unique: true},
    canTeach_subjects: [{type: mongoose.Schema.Types.ObjectId, ref: 'Subjects'}], //so this input is taken from a checkbox of subjects which the teacher can handle based on the given list of input subjects
    labs_handled: [{type: mongoose.Schema.Types.ObjectId, ref: 'Syllabus_Labs'}], //so this is again a list of checkboxes based on the labs that teacher can handle which is stored as an array
    hrs_per_week: {type: Number, required: true}, 
    teacher_position: {type: String, required: true} //assistant prof, associate prof
  },
  { collection: 'Teachers', timestamps: true }
)

export default mongoose.model('Teacher', TeacherSchema);