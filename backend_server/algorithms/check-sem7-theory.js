/**
 * Check Semester 7 Theory Subjects and Recommend Teachers for Section 7C
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Subject from '../models/subjects_model.js';
import Teacher from '../models/teachers_models.js';
import PreAssignTeacher from '../models/pre_assign_teacher_model.js';

dotenv.config({ path: '../.env' });

async function checkSem7Theory() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Get all Semester 7 subjects
    console.log('══════════════════════════════════════════════════════════════════════');
    console.log('📚 SEMESTER 7 THEORY SUBJECTS');
    console.log('══════════════════════════════════════════════════════════════════════\n');
    
    const subjects = await Subject.find({ semester: 7, sem_type: 'odd' })
      .select('subject_name subject_code hours_per_week');
    
    subjects.forEach((sub, idx) => {
      console.log(`${idx + 1}. ${sub.subject_code}: ${sub.subject_name}`);
      console.log(`   Hours per week: ${sub.hours_per_week}`);
      console.log('');
    });

    // Get existing assignments for 7A and 7B
    console.log('══════════════════════════════════════════════════════════════════════');
    console.log('📋 EXISTING ASSIGNMENTS (7A & 7B)');
    console.log('══════════════════════════════════════════════════════════════════════\n');

    const existingAssignments = await PreAssignTeacher.find({
      sem: 7,
      sem_type: 'odd',
      section: { $in: ['A', 'B'] }
    }).populate('teacher_id', 'name teacher_shortform')
      .populate('subject_id', 'subject_code subject_name');

    const assignmentsBySection = {};
    existingAssignments.forEach(assignment => {
      const section = assignment.section;
      if (!assignmentsBySection[section]) {
        assignmentsBySection[section] = [];
      }
      assignmentsBySection[section].push({
        subject: assignment.subject_id.subject_code,
        subjectName: assignment.subject_id.subject_name,
        teacher: assignment.teacher_id.teacher_shortform,
        teacherName: assignment.teacher_id.name
      });
    });

    ['A', 'B'].forEach(section => {
      console.log(`Section 7${section}:`);
      if (assignmentsBySection[section]) {
        assignmentsBySection[section].forEach(a => {
          console.log(`   ${a.subject}: ${a.teacher} (${a.teacherName})`);
        });
      } else {
        console.log('   No assignments found');
      }
      console.log('');
    });

    // Get all teachers and their workload
    console.log('══════════════════════════════════════════════════════════════════════');
    console.log('👥 ALL TEACHERS WITH THEIR CURRENT WORKLOAD');
    console.log('══════════════════════════════════════════════════════════════════════\n');

    const teachers = await Teacher.find()
      .select('name teacher_shortform theory_courses');

    // Count workload for each teacher
    const teacherWorkload = [];
    for (const teacher of teachers) {
      const theoryAssignments = await PreAssignTeacher.countDocuments({
        teacher_id: teacher._id,
        sem: 7,
        sem_type: 'odd'
      });

      // Get subjects this teacher can teach for sem 7
      const allSubjects = await Subject.find({ semester: 7, sem_type: 'odd' });
      const canTeachSem7 = [];
      
      if (teacher.theory_courses && Array.isArray(teacher.theory_courses)) {
        for (const subject of allSubjects) {
          // Check if teacher has this subject in their theory_courses array
          const canTeach = teacher.theory_courses.some(course => 
            course.subject_id && course.subject_id.toString() === subject._id.toString()
          );
          if (canTeach) {
            canTeachSem7.push(subject.subject_code);
          }
        }
      }

      teacherWorkload.push({
        shortform: teacher.teacher_shortform,
        name: teacher.name,
        currentAssignments: theoryAssignments,
        canTeachSem7: canTeachSem7
      });
    }

    // Sort by workload (least loaded first)
    teacherWorkload.sort((a, b) => a.currentAssignments - b.currentAssignments);

    teacherWorkload.forEach(t => {
      const workloadEmoji = t.currentAssignments === 0 ? '🟢' : t.currentAssignments === 1 ? '🟡' : '🔴';
      console.log(`${workloadEmoji} ${t.shortform} (${t.name})`);
      console.log(`   Current Sem 7 Theory Assignments: ${t.currentAssignments}`);
      if (t.canTeachSem7.length > 0) {
        console.log(`   Can teach: ${t.canTeachSem7.join(', ')}`);
      }
      console.log('');
    });

    // Generate recommendations for 7C
    console.log('══════════════════════════════════════════════════════════════════════');
    console.log('💡 RECOMMENDED ASSIGNMENTS FOR SECTION 7C');
    console.log('══════════════════════════════════════════════════════════════════════\n');
    console.log('Based on:');
    console.log('  ✓ Workload balancing (prefer teachers with fewer assignments)');
    console.log('  ✓ Subject expertise (teachers who can handle Sem 7 subjects)');
    console.log('  ✓ Fair distribution across all teachers\n');

    for (const subject of subjects) {
      console.log(`📖 ${subject.subject_code} (${subject.subject_name})`);
      console.log(`   Hours: ${subject.hours_per_week}`);
      
      // Find teachers who can teach this subject and have least workload
      const qualified = teacherWorkload.filter(t => 
        t.canTeachSem7.includes(subject.subject_code)
      );

      if (qualified.length > 0) {
        console.log(`   Qualified teachers (sorted by workload):`);
        qualified.slice(0, 5).forEach((t, idx) => {
          const star = idx === 0 ? '⭐' : '  ';
          console.log(`   ${star} ${t.shortform} (${t.name}) - Current load: ${t.currentAssignments}`);
        });
        console.log(`\n   ✅ RECOMMENDED: ${qualified[0].shortform} (${qualified[0].name})`);
      } else {
        console.log('   ⚠️  No teachers found who can handle this subject!');
        console.log('   Please assign subject expertise to teachers first.');
      }
      console.log('');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from database');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkSem7Theory();
