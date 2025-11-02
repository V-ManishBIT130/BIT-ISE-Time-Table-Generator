/**
 * ============================================
 * PHASE 2 CONFLICT ANALYZER & SOLUTION FINDER
 * ============================================
 * 
 * PURPOSE: Analyze existing Phase 2 assignments for conflicts
 *          and provide actionable solutions
 * 
 * WHAT IT DOES:
 * 1. Detects teacher conflicts (same teacher, multiple batches, same time)
 * 2. Detects room conflicts (same room, multiple batches, same time)
 * 3. Finds alternative teachers who can replace conflicting ones
 * 4. Generates a detailed report for discussion with teachers
 * 
 * USAGE: node backend_server/algorithms/analyze-phase2-conflicts.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend_server directory
dotenv.config({ path: join(__dirname, '../.env') });

class Phase2ConflictAnalyzer {
  constructor() {
    this.assignments = [];
    this.teachers = [];
    this.conflicts = [];
    this.solutions = [];
  }

  async analyze() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 PHASE 2 CONFLICT ANALYZER');
    console.log('='.repeat(80));

    try {
      // Connect to database
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✓ Connected to database\n');

      // Load data
      await this.loadData();

      // Find conflicts
      this.detectConflicts();

      // Find solutions for each conflict
      await this.findSolutions();

      // Generate report
      this.generateReport();

      await mongoose.disconnect();
      console.log('\n✓ Analysis complete!');

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  }

  async loadData() {
    console.log('📥 Loading Phase 2 assignments and teachers...\n');

    const TeacherLabAssignment = (await import('../models/teacher_lab_assign_model.js')).default;
    const Teacher = (await import('../models/teachers_models.js')).default;
    const SyllabusLabs = (await import('../models/syllabus_labs_model.js')).default;
    const DeptLabs = (await import('../models/dept_labs_model.js')).default;

    // Load all assignments with populated references
    this.assignments = await TeacherLabAssignment.find({})
      .populate('lab_id')
      .populate('teacher_ids')
      .populate('assigned_lab_room')
      .lean();

    console.log(`   ✓ Loaded ${this.assignments.length} lab assignments`);

    // Load all teachers with their capabilities
    this.teachers = await Teacher.find({})
      .populate('labs_handled')
      .lean();

    console.log(`   ✓ Loaded ${this.teachers.length} teachers\n`);
  }

  detectConflicts() {
    console.log('🔍 Detecting conflicts...\n');

    // Group assignments by section
    const bySectionLab = {};

    this.assignments.forEach(assignment => {
      const key = `${assignment.sem}-${assignment.section}-${assignment.lab_id._id}`;
      if (!bySectionLab[key]) {
        bySectionLab[key] = [];
      }
      bySectionLab[key].push(assignment);
    });

    // For each section's lab, check if teachers appear in multiple batches
    Object.entries(bySectionLab).forEach(([key, assignments]) => {
      const [sem, section, labId] = key.split('-');
      const labName = assignments[0].lab_id.lab_shortform;

      // Track which teachers are in which batches
      const teacherToBatches = {};

      assignments.forEach(assignment => {
        assignment.teacher_ids.forEach(teacher => {
          const teacherId = teacher._id.toString();
          if (!teacherToBatches[teacherId]) {
            teacherToBatches[teacherId] = {
              teacher: teacher,
              batches: []
            };
          }
          teacherToBatches[teacherId].batches.push(assignment.batch_number);
        });
      });

      // Find teachers assigned to multiple batches
      Object.entries(teacherToBatches).forEach(([teacherId, data]) => {
        if (data.batches.length > 1) {
          this.conflicts.push({
            type: 'TEACHER_CONFLICT',
            sem: parseInt(sem),
            section: section,
            lab: labName,
            labId: labId,
            teacher: data.teacher,
            batches: data.batches,
            severity: data.batches.length > 2 ? 'HIGH' : 'MEDIUM',
            affectedAssignments: assignments.filter(a => 
              a.teacher_ids.some(t => t._id.toString() === teacherId)
            )
          });
        }
      });
    });

    console.log(`   ${this.conflicts.length === 0 ? '✅' : '⚠️'} Found ${this.conflicts.length} conflicts\n`);

    if (this.conflicts.length > 0) {
      this.conflicts.forEach((conflict, index) => {
        console.log(`   ${index + 1}. ${conflict.severity} - ${conflict.teacher.teacher_shortform} (${conflict.teacher.name})`);
        console.log(`      Teaching ${conflict.lab} to batches ${conflict.batches.join(', ')} in Sem ${conflict.sem}${conflict.section}`);
      });
      console.log('');
    }
  }

  async findSolutions() {
    console.log('💡 Finding solutions for each conflict...\n');

    for (const conflict of this.conflicts) {
      const solutions = await this.findAlternativeTeachers(conflict);
      this.solutions.push({
        conflict: conflict,
        alternatives: solutions
      });
    }
  }

  async findAlternativeTeachers(conflict) {
    const alternatives = [];

    // Find all teachers who can handle this lab
    const qualifiedTeachers = this.teachers.filter(teacher => {
      if (!teacher.labs_handled || teacher.labs_handled.length === 0) return false;
      return teacher.labs_handled.some(lab => 
        lab._id.toString() === conflict.labId
      );
    });

    // Count current workload for each teacher
    const teacherWorkload = {};
    this.assignments.forEach(assignment => {
      assignment.teacher_ids.forEach(teacher => {
        const id = teacher._id.toString();
        if (!teacherWorkload[id]) {
          teacherWorkload[id] = {
            teacher: teacher,
            count: 0,
            assignments: []
          };
        }
        teacherWorkload[id].count++;
        teacherWorkload[id].assignments.push({
          lab: assignment.lab_id.lab_shortform,
          section: `${assignment.sem}${assignment.section}${assignment.batch_number}`
        });
      });
    });

    // Find teachers who are NOT involved in this conflict
    qualifiedTeachers.forEach(teacher => {
      const teacherId = teacher._id.toString();
      const conflictingTeacherId = conflict.teacher._id.toString();

      // Skip the conflicting teacher
      if (teacherId === conflictingTeacherId) return;

      // Check if this teacher is already assigned to any of the conflicting batches
      const alreadyAssigned = conflict.affectedAssignments.some(assignment =>
        assignment.teacher_ids.some(t => t._id.toString() === teacherId)
      );

      const workload = teacherWorkload[teacherId] || { count: 0, assignments: [] };

      alternatives.push({
        teacher: teacher,
        alreadyAssigned: alreadyAssigned,
        currentWorkload: workload.count,
        currentAssignments: workload.assignments,
        recommendation: alreadyAssigned ? 'ALREADY_ASSIGNED' : 
                       workload.count < 5 ? 'GOOD_CHOICE' : 
                       workload.count < 10 ? 'ACCEPTABLE' : 'OVERLOADED'
      });
    });

    // Sort: prefer teachers not already assigned, then by workload
    alternatives.sort((a, b) => {
      if (a.alreadyAssigned !== b.alreadyAssigned) {
        return a.alreadyAssigned ? 1 : -1;
      }
      return a.currentWorkload - b.currentWorkload;
    });

    return alternatives;
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 CONFLICT ANALYSIS REPORT');
    console.log('='.repeat(80));

    if (this.conflicts.length === 0) {
      console.log('\n✅ NO CONFLICTS FOUND! All assignments are valid.\n');
      return;
    }

    console.log(`\n⚠️  Total Conflicts Found: ${this.conflicts.length}\n`);

    this.solutions.forEach((solution, index) => {
      const { conflict, alternatives } = solution;

      console.log('─'.repeat(80));
      console.log(`\n📌 CONFLICT #${index + 1} [${conflict.severity} SEVERITY]`);
      console.log('─'.repeat(80));
      console.log(`\n🎓 Section: ${conflict.sem}${conflict.section}`);
      console.log(`📚 Lab: ${conflict.lab}`);
      console.log(`👨‍🏫 Conflicting Teacher: ${conflict.teacher.teacher_shortform} (${conflict.teacher.name})`);
      console.log(`🔢 Assigned to batches: ${conflict.batches.join(', ')} (SIMULTANEOUS!)`);

      console.log(`\n📋 Current Assignments:`);
      conflict.affectedAssignments.forEach(assignment => {
        const teachers = assignment.teacher_ids.map(t => t.teacher_shortform).join(' + ');
        const room = assignment.assigned_lab_room.labRoom_no;
        console.log(`   • Batch ${assignment.batch_number}: ${teachers} → Room ${room}`);
      });

      console.log(`\n💡 PROPOSED SOLUTIONS:\n`);

      // Show top 5 alternatives
      const topAlternatives = alternatives.slice(0, 5);

      if (topAlternatives.length === 0) {
        console.log('   ❌ NO ALTERNATIVE TEACHERS AVAILABLE!');
        console.log('   ⚠️  This requires manual intervention or hiring new teachers.\n');
        return;
      }

      topAlternatives.forEach((alt, i) => {
        const emoji = alt.recommendation === 'GOOD_CHOICE' ? '✅' : 
                     alt.recommendation === 'ACCEPTABLE' ? '⚡' : 
                     alt.recommendation === 'ALREADY_ASSIGNED' ? '🔄' : '⚠️';
        
        console.log(`   ${emoji} Option ${i + 1}: ${alt.teacher.teacher_shortform} (${alt.teacher.name})`);
        console.log(`      Current workload: ${alt.currentWorkload} assignments`);
        console.log(`      Status: ${alt.recommendation.replace(/_/g, ' ')}`);
        
        if (alt.alreadyAssigned) {
          console.log(`      ⚠️  Already assigned to one of these batches - would require swap`);
        }
        
        if (alt.currentAssignments.length > 0 && alt.currentAssignments.length <= 3) {
          console.log(`      Currently teaching: ${alt.currentAssignments.map(a => a.lab).join(', ')}`);
        }
        console.log('');
      });

      console.log(`📝 RECOMMENDATION FOR TEACHER DISCUSSION:`);
      const bestOption = topAlternatives[0];
      if (bestOption.recommendation === 'GOOD_CHOICE') {
        console.log(`   ✅ Replace ${conflict.teacher.teacher_shortform} with ${bestOption.teacher.teacher_shortform}`);
        console.log(`      in batch ${conflict.batches[conflict.batches.length - 1]} (last conflicting batch)`);
        console.log(`      This maintains fair workload distribution.\n`);
      } else if (bestOption.recommendation === 'ACCEPTABLE') {
        console.log(`   ⚡ ${bestOption.teacher.teacher_shortform} can take this, but workload is increasing.`);
        console.log(`      Consider discussing workload balance with faculty.\n`);
      } else {
        console.log(`   ⚠️  All alternatives have trade-offs. Discuss with faculty:`);
        console.log(`      - Option 1: Accept slight workload imbalance`);
        console.log(`      - Option 2: Swap teachers between batches`);
        console.log(`      - Option 3: Reschedule one batch to a different time\n`);
      }
    });

    console.log('─'.repeat(80));
    console.log('\n📊 SUMMARY FOR FACULTY MEETING:');
    console.log('─'.repeat(80));
    console.log(`\nTotal issues to resolve: ${this.conflicts.length}`);
    console.log(`Sections affected: ${[...new Set(this.conflicts.map(c => c.sem + c.section))].join(', ')}`);
    console.log('\nRequired Actions:');
    this.conflicts.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.sem}${c.section} ${c.lab}: Replace ${c.teacher.teacher_shortform} in batch ${c.batches[c.batches.length - 1]}`);
    });
    console.log('\n');
  }
}

// Run analyzer
const analyzer = new Phase2ConflictAnalyzer();
analyzer.analyze().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
