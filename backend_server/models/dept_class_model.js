import mongoose from "mongoose"

const ClassroomSchema = new mongoose.Schema(
  {
    room_no: {type: String, required: true, unique: true}, // e.g., 'C301', 'C302'
    capacity: {type: Number}, // Not important per Q5, but keep for future
    room_type: {type: String, default: 'theory', enum: ['theory', 'lab']} // Always 'theory' for this schema
  },
  { collection: 'Classrooms', timestamps: true }
)

export default mongoose.model('Classroom', ClassroomSchema);