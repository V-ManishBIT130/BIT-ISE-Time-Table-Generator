import mongoose from "mongoose";

const iseSections_schema = new mongoose.Schema(
  {
    sem: {type: Number, required: true, min: 1, max: 8},
    sem_type: {type: String, required: true, enum: ['odd', 'even']}, // Match semester type
    section_name: {type: String, required: true}, 
    split_batches: {type: Number, required: true, min: 1}, // Number of batches (A1, A2, A3...)
    batch_names: [{type: String}], // e.g., ['A1', 'A2', 'A3'] - derived from section + split_batches
    total_strength: {type: Number} //not very much important
  },
  { collection: 'ISE_Sections', timestamps: true }
);

iseSections_schema.index({ sem: 1, sem_type: 1, section_name: 1 }, { unique: true })

export default mongoose.model('ISE_Sections', iseSections_schema);