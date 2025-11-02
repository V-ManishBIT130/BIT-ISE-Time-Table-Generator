/**
 * Check how many teachers can handle PC-LAB for semester 7
 */

import mongoose from 'mongoose';
import Teacher from '../models/teachers_models.js';
import SyllabusLab from '../models/syllabus_labs_model.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend_server directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function checkPCLabTeachers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // First, let's see all labs for semester 7
    console.log('📚 All Labs for Semester 7:');
    const allSem7Labs = await SyllabusLab.find({ lab_sem: 7 });
    
    if (allSem7Labs.length === 0) {
      console.log('   ❌ No labs found for semester 7!\n');
    } else {
      allSem7Labs.forEach((lab, idx) => {
        console.log(`   ${idx + 1}. ${lab.lab_name} (${lab.lab_shortform})`);
      });
      console.log();
    }

    // Find PC-LAB - try different variations
    const pcLab = await SyllabusLab.findOne({
      lab_sem: 7,
      $or: [
        { lab_shortform: 'PC-LAB' },
        { lab_shortform: 'PC' },
        { lab_shortform: /PC/i },
        { lab_name: /Parallel/i }
      ]
    });

    if (!pcLab) {
      console.log('❌ PC-LAB not found for semester 7');
      return;
    }

    console.log('📚 Lab Details:');
    console.log(`   Lab: ${pcLab.lab_name} (${pcLab.lab_shortform})`);
    console.log(`   Semester: ${pcLab.lab_sem}`);
    console.log(`   Lab ID: ${pcLab._id}\n`);

    // Find all teachers who can handle this lab
    const teachers = await Teacher.find({
      labs_handled: pcLab._id
    }).select('name teacher_shortform teacher_position');

    console.log(`👨‍🏫 Teachers who can handle PC-LAB (Semester 7): ${teachers.length} teachers\n`);

    if (teachers.length === 0) {
      console.log('❌ NO TEACHERS ASSIGNED TO PC-LAB!\n');
    } else {
      teachers.forEach((teacher, idx) => {
        console.log(`   ${idx + 1}. ${teacher.name} (${teacher.teacher_shortform}) - ${teacher.teacher_position}`);
      });
    }

    console.log('\n📊 Analysis:');
    console.log(`   Required: 6 teacher slots (3 batches × 2 teachers)`);
    console.log(`   Available: ${teachers.length} qualified teachers`);
    
    if (teachers.length >= 6) {
      console.log('   ✅ SUFFICIENT teachers for conflict-free assignment!');
    } else if (teachers.length >= 4) {
      console.log('   ⚠️  Minimum viable (4+ teachers), some will teach 2 batches');
    } else {
      console.log('   ❌ INSUFFICIENT teachers - conflicts inevitable');
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPCLabTeachers();
