/**
 * VERIFY LAB ASSIGNMENTS ACCURACY
 * Tests if all 9 sections have proper lab assignments
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import TeacherLabAssignment from '../models/teacher_lab_assign_model.js';
import ISESection from '../models/ise_sections_model.js';
import SyllabusLab from '../models/syllabus_labs_model.js';
import Teacher from '../models/teachers_models.js';
import DeptLab from '../models/dept_labs_model.js';

dotenv.config({ path: '../.env' });

async function verifyAssignments() {
  try {
    console.log('🔍 Verifying Lab Assignment Accuracy...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Get all sections
    const sections = await ISESection.find({}).sort({ sem: 1, section_name: 1 });
    console.log(`📚 Found ${sections.length} sections in database:\n`);

    const results = {
      totalSections: sections.length,
      sectionsWithAssignments: 0,
      totalAssignments: 0,
      assignmentsBySemester: {},
      errors: []
    };

    for (const section of sections) {
      const sectionKey = `${section.sem}${section.section_name}`;
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📋 SECTION ${sectionKey} (Semester ${section.sem} ${section.sem_type})`);
      console.log('='.repeat(70));

      // Get labs for this semester
      const labs = await SyllabusLab.find({
        lab_sem: section.sem,
        lab_sem_type: section.sem_type
      });

      console.log(`   📖 Required Labs: ${labs.length}`);
      labs.forEach(lab => {
        console.log(`      • ${lab.lab_shortform} (${lab.lab_name})`);
      });

      // Get assignments for this section
      const assignments = await TeacherLabAssignment.find({
        sem: section.sem,
        sem_type: section.sem_type,
        section: section.section_name
      }).populate('lab_id', 'lab_name lab_shortform')
        .populate('teacher_ids', 'teacher_shortform name')
        .populate('assigned_lab_room', 'labRoom_no');

      console.log(`\n   ✅ Assignments Created: ${assignments.length}`);

      if (assignments.length > 0) {
        results.sectionsWithAssignments++;
      }

      results.totalAssignments += assignments.length;

      if (!results.assignmentsBySemester[section.sem]) {
        results.assignmentsBySemester[section.sem] = 0;
      }
      results.assignmentsBySemester[section.sem] += assignments.length;

      // Group by batch
      const batches = {};
      assignments.forEach(a => {
        if (!batches[a.batch_number]) {
          batches[a.batch_number] = [];
        }
        batches[a.batch_number].push(a);
      });

      // Verify each batch
      Object.keys(batches).sort((a, b) => a - b).forEach(batchNum => {
        const batchAssignments = batches[batchNum];
        console.log(`\n   🔬 Batch ${sectionKey}${batchNum}:`);
        console.log(`      Labs assigned: ${batchAssignments.length}`);

        // Check for correct structure
        batchAssignments.forEach(assignment => {
          const teacher1 = assignment.teacher_ids[0]?.teacher_shortform || 'MISSING';
          const teacher2 = assignment.teacher_ids[1]?.teacher_shortform || 'MISSING';
          const room = assignment.assigned_lab_room?.labRoom_no || 'MISSING';
          const labName = assignment.lab_id?.lab_shortform || 'UNKNOWN';

          console.log(`      • ${labName}: ${teacher1} + ${teacher2} → Room ${room}`);

          // Validation checks
          if (!assignment.teacher_ids[0] || !assignment.teacher_ids[1]) {
            results.errors.push(`${sectionKey}${batchNum} - ${labName}: Missing teachers`);
          }
          if (!assignment.assigned_lab_room) {
            results.errors.push(`${sectionKey}${batchNum} - ${labName}: Missing lab room`);
          }
        });

        // Check if all required labs are assigned
        const assignedLabIds = batchAssignments.map(a => a.lab_id._id.toString());
        labs.forEach(lab => {
          if (!assignedLabIds.includes(lab._id.toString())) {
            console.log(`      ⚠️  Missing: ${lab.lab_shortform}`);
            results.errors.push(`${sectionKey}${batchNum}: Missing assignment for ${lab.lab_shortform}`);
          }
        });
      });

      // Check if correct number of batches
      const expectedBatches = section.split_batches;
      const actualBatches = Object.keys(batches).length;
      if (actualBatches !== expectedBatches) {
        console.log(`\n   ⚠️  WARNING: Expected ${expectedBatches} batches, found ${actualBatches}`);
        results.errors.push(`${sectionKey}: Expected ${expectedBatches} batches, found ${actualBatches}`);
      }
    }

    // Final Summary
    console.log('\n\n' + '='.repeat(70));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Sections: ${results.totalSections}`);
    console.log(`Sections with Assignments: ${results.sectionsWithAssignments}`);
    console.log(`Total Lab Assignments: ${results.totalAssignments}`);
    console.log(`\nBreakdown by Semester:`);
    Object.keys(results.assignmentsBySemester).sort().forEach(sem => {
      console.log(`   Semester ${sem}: ${results.assignmentsBySemester[sem]} assignments`);
    });

    if (results.errors.length === 0) {
      console.log('\n✅ ALL CHECKS PASSED! Lab assignments are accurate and complete.');
    } else {
      console.log(`\n⚠️  Found ${results.errors.length} issue(s):`);
      results.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err}`);
      });
    }

    console.log('\n' + '='.repeat(70));

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyAssignments();
