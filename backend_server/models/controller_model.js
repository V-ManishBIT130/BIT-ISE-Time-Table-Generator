import mongoose from "mongoose"

// This model maps to your existing 'Controllers' collection
// Used for admin/HOD login (simple username/password for now)
const ControllerSchema = new mongoose.Schema(
  {
    user_name: {type: String, required: true, unique: true},
    password: {type: String, required: true} // Plain text for testing only
  },
  { collection: 'Controllers', timestamps: true }
)

export default mongoose.model('Controller', ControllerSchema);
