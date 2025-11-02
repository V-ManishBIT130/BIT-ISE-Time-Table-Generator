/**
 * Display all generated lab assignments in table format
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function displayAssignments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Import all required models
    const TeacherLabAssignment = (await import('../models/teacher_lab_assign_model.js')).default;
    const SyllabusLabs = (await import('../models/syllabus_labs_model.js')).default;
    const Teacher = (await import('../models/teachers_models.js')).default;
    const DeptLabs = (await import('../models/dept_labs_model.js')).default;
    
    const assignments = await TeacherLabAssignment.find({})
      .populate('lab_id')
      .populate('teacher_ids')
      .populate('assigned_lab_room')
      .sort({ sem: 1, section: 1, batch_number: 1 })
      .lean();

    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║               📋 GENERATED LAB ASSIGNMENTS (DATABASE)                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    // Group by section
    const grouped = {};
    assignments.forEach(a => {
      const key = `Sem ${a.sem} (${a.sem_type}) Section ${a.section}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    });

    // Display each section
    for (const [section, assigns] of Object.entries(grouped)) {
      console.log(`\n📚 ${section}`);
      console.log('─'.repeat(80));
      console.log('  Batch  | Lab          | Teachers        | Room ');
      console.log('─'.repeat(80));

      assigns.forEach(a => {
        const batch = `${a.sem}${a.section}${a.batch_number}`;
        const lab = a.lab_id?.lab_shortform || 'Unknown Lab';
        const t1 = a.teacher_ids[0]?.teacher_shortform || 'T1';
        const t2 = a.teacher_ids[1]?.teacher_shortform || 'T2';
        const room = a.assigned_lab_room?.labRoom_no || 'Unknown Room';
        
        console.log(`  ${batch.padEnd(7)}| ${lab.padEnd(13)}| ${t1} + ${t2.padEnd(7)}| ${room}`);
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`\n✅ Total Assignments: ${assignments.length}`);
    console.log(`📁 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`📦 Collection: Teacher_Lab_Assignments\n`);

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

displayAssignments();
