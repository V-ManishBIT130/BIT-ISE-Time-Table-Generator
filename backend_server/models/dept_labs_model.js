import mongoose from "mongoose"

const dept_labs_schema = new mongoose.Schema(
  {
    labRoom_no: {type: String, required: true, unique: true}, //like 612A, 614B
    lab_subjects_handled: [{type: mongoose.Schema.Types.ObjectId, ref: 'Syllabus_Labs'}], //so this must be taken input in form an array in wich i will give a list of all the labs given in our syllabus for all the sems, so the syllabus_labs ticked in that checkbox means this lab can habdle those syllabus_labs
    capacity: {type: Number} // Optional: max students per lab
  },
  { collection: 'Dept_Labs', timestamps: true }
)

export default mongoose.model('Dept_Labs', dept_labs_schema);