import mongoose from "mongoose";
import Controller from "./models/controller_model.js";

const conn = async() =>{
  try{
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Database connected Successfully");
    
    // Auto-create default HOD user if it doesn't exist (fallback)
    await ensureDefaultUser();
  }catch(error){
    console.log("Connection failed", error);
  }
}

/**
 * Ensures default HOD user exists in database
 * Auto-creates on first run if Controllers collection is empty
 * This is a fallback - users should run seed.js first
 */
async function ensureDefaultUser() {
  try {
    const userCount = await Controller.countDocuments();
    
    if (userCount === 0) {
      console.log('⚠️  No users found in database');
      console.log('➕ Auto-creating default HOD user...');
      
      await Controller.create({
        user_name: 'HOD',
        password: 'ise@hod'
      });
      
      console.log('✅ Default HOD user created (HOD / ise@hod)');
      console.log('⚠️  Recommendation: Change password after first login\n');
    }
  } catch (error) {
    console.error('❌ Error checking/creating default user:', error.message);
  }
}

export default conn;