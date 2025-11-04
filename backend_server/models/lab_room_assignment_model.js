import mongoose from "mongoose"

/**
 * Lab Room Assignment Model (Phase 2 - AUTOMATIC ASSIGNMENT)
 * 
 * Purpose: Automatically assigns lab rooms to batches based on:
 * - Equipment compatibility (query dept_labs.lab_subjects_handled)
 * - Even distribution (global room usage counter)
 * - Round-robin allocation (spreads load across rooms)
 * 
 * Phase 2 stores ONLY room assignments (no teachers, no time slots)
 * Teachers and time slots are assigned in Phase 3 during timetable generation
 * 
 * AUTOMATIC ASSIGNMENT ALGORITHM:
 * 1. For each section's lab, query compatible rooms from dept_labs
 * 2. Track global room usage counter across all assignments
 * 3. For each batch, assign least-used compatible room
 * 4. Round-robin ensures even distribution across all available rooms
 * 
 * Benefits:
 * - No manual input needed
 * - Equipment-compatible rooms guaranteed
 * - Even distribution prevents bottlenecks
 * - Minimizes conflicts for Phase 3 scheduling
 */

const LabRoomAssignmentSchema = new mongoose.Schema(
  {
    lab_id: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Syllabus_Labs', 
      required: true
    },
    sem: {
      type: Number, 
      required: true, 
      min: 3, 
      max: 8
    },
    sem_type: {
      type: String, 
      enum: ['odd', 'even'], 
      required: true
    },
    section: {
      type: String, 
      required: true
    }, // 'A', 'B', 'C'
    batch_number: {
      type: Number, 
      required: true, 
      min: 1, 
      max: 3
    },
    
    // ONLY lab room assigned in Phase 2 (equipment constraint)
    // Assigned AUTOMATICALLY by algorithm based on:
    // 1. Equipment compatibility (dept_labs.lab_subjects_handled)
    // 2. Global room usage counter (even distribution)
    // 3. Round-robin allocation (prevents bottlenecks)
    assigned_lab_room: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Dept_Labs',
      required: true
    },
    
    // Metadata for automatic assignment (optional, for debugging/auditing)
    assignment_metadata: {
      compatible_rooms_count: { type: Number }, // How many rooms were compatible
      room_usage_rank: { type: Number },        // Room's usage count when assigned
      assigned_at: { type: Date, default: Date.now }
    }
    
    // NO teacher_ids here! Teachers assigned dynamically in Phase 3
    // NO scheduled_day, scheduled_start_time, scheduled_end_time! Times in Phase 3
  },
  { 
    collection: 'Lab_Room_Assignments', 
    timestamps: true 
  }
)

// Unique: one room assignment per lab per batch
LabRoomAssignmentSchema.index(
  { lab_id: 1, sem: 1, sem_type: 1, section: 1, batch_number: 1 }, 
  { unique: true }
)

export default mongoose.model('Lab_Room_Assignment', LabRoomAssignmentSchema);
