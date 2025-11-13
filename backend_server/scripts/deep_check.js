import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Timetable from '../models/timetable_model.js';

dotenv.config();

async function deepCheck() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const sample = await Timetable.findOne({ sectionName: '5A' }).lean();
  
  console.log('\n=== SAMPLE TIMETABLE STRUCTURE ===\n');
  console.log(`Section: ${sample.sectionName}`);
  console.log(`Semester: ${sample.semester}`);
  console.log(`\nKeys:`, Object.keys(sample));
  
  // Check each day
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
    if (sample[day]) {
      console.log(`\n${day} (${sample[day].length} slots):`);
      sample[day].slice(0, 3).forEach(slot => {
        console.log(`  Time: ${slot.startTime}-${slot.endTime}`);
        console.log(`  Subject: ${slot.subjectName || 'N/A'}`);
        console.log(`  Type: ${slot.subjectType || 'N/A'}`);
        console.log(`  Room: ${slot.classroom || 'N/A'}`);
        console.log(`  ---`);
      });
    }
  });
  
  mongoose.disconnect();
}

deepCheck().catch(console.error);
