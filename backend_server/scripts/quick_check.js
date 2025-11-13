import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Timetable from '../models/timetable_model.js';

dotenv.config();

async function checkDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const count = await Timetable.countDocuments();
  console.log(`\n📊 Total timetables in DB: ${count}\n`);
  
  if (count > 0) {
    const sample = await Timetable.findOne({ sectionName: '5A' }).lean();
    
    if (sample) {
      console.log(`Sample: ${sample.sectionName}\n`);
      
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
        if (sample[day] && sample[day].length > 0) {
          console.log(`${day}:`);
          sample[day].forEach(slot => {
            if (slot.subjectName?.includes('LAB')) {
              console.log(`  - ${slot.startTime}-${slot.endTime}: ${slot.subjectName} in ${slot.classroom}`);
            }
          });
        }
      });
    }
  }
  
  mongoose.disconnect();
}

checkDB().catch(console.error);
