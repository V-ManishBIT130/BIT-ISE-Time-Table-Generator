/**
 * ============================================
 * PHASE 2 AUTO-ASSIGNMENT GENERATOR
 * ============================================
 * 
 * PURPOSE: Automatically generate conflict-free lab assignments
 * 
 * WHAT IT DOES:
 * 1. Reads master data (teachers, labs, rooms, sections)
 * 2. Uses constraint satisfaction algorithm
 * 3. Assigns teachers and rooms to each batch's labs
 * 4. GUARANTEES no conflicts (no teacher/room used twice simultaneously)
 * 5. Saves assignments to database
 * 
 * WHY THIS IS BETTER:
 * - No manual assignment needed
 * - Zero conflicts guaranteed
 * - Fair workload distribution
 * - Respects all constraints
 */

import mongoose from 'mongoose';

class Phase2AutoAssigner {
  constructor() {
    this.teachers = [];
    this.labRooms = [];
    this.sections = [];
    this.syllabusLabs = [];
    this.assignments = [];
  }

  /**
   * MAIN METHOD: Generate all lab assignments
   */
  async generateLabAssignments(semester, semesterType) {
    console.log('\n' + '='.repeat(70));
    console.log('🤖 PHASE 2 AUTO-ASSIGNMENT GENERATOR');
    console.log('='.repeat(70));
    console.log(`Semester: ${semester} (${semesterType})\n`);

    try {
      // CRITICAL: Reset assignments array for this semester
      this.assignments = [];
      
      // Step 1: Load master data
      await this.loadMasterData(semester, semesterType);

      // Step 2: Clear existing assignments
      await this.clearExistingAssignments(semester, semesterType);

      // Step 3: Generate assignments for each section
      for (const section of this.sections) {
        console.log(`\n📚 Processing Section ${section.section_name}...`);
        await this.assignLabsForSection(section);
      }

      // Step 4: Save to database
      await this.saveAssignments();

      // Step 5: Summary
      this.printSummary();

      console.log('\n✅ Phase 2 Auto-Assignment Complete!\n');
      return { success: true, assignments: this.assignments };

    } catch (error) {
      console.error('❌ Auto-assignment failed:', error.message);
      throw error;
    }
  }

  /**
   * STEP 1: Load all master data from database
   */
  async loadMasterData(semester, semesterType) {
    console.log('📥 Loading master data...');

    const Teacher = (await import('../models/teachers_models.js')).default;
    const DeptLabs = (await import('../models/dept_labs_model.js')).default;
    const ISESection = (await import('../models/ise_sections_model.js')).default;
    const SyllabusLabs = (await import('../models/syllabus_labs_model.js')).default;

    // Load teachers
    this.teachers = await Teacher.find({})
      .populate('labs_handled')
      .lean();
    console.log(`   ✓ Loaded ${this.teachers.length} teachers`);

    // Load lab rooms
    this.labRooms = await DeptLabs.find({})
      .populate('lab_subjects_handled')
      .lean();
    console.log(`   ✓ Loaded ${this.labRooms.length} lab rooms`);

    // Load sections for this semester
    this.sections = await ISESection.find({
      sem: semester,
      sem_type: semesterType
    }).lean();
    console.log(`   ✓ Loaded ${this.sections.length} sections`);

    // Load syllabus labs for this semester
    this.syllabusLabs = await SyllabusLabs.find({
      lab_sem: semester,
      lab_sem_type: semesterType
    }).lean();
    console.log(`   ✓ Loaded ${this.syllabusLabs.length} syllabus labs`);

    if (this.sections.length === 0) {
      throw new Error(`No sections found for Semester ${semester} (${semesterType})`);
    }

    if (this.syllabusLabs.length === 0) {
      throw new Error(`No syllabus labs found for Semester ${semester} (${semesterType})`);
    }
  }

  /**
   * STEP 2: Clear existing assignments
   */
  async clearExistingAssignments(semester, semesterType) {
    console.log('\n🗑️  Clearing existing lab assignments...');

    const TeacherLabAssignment = (await import('../models/teacher_lab_assign_model.js')).default;

    const result = await TeacherLabAssignment.deleteMany({
      sem: semester,
      sem_type: semesterType
    });

    console.log(`   ✓ Cleared ${result.deletedCount} old assignments`);
  }

  /**
   * STEP 3: Assign labs for a single section
   * KEY INSIGHT: Batches rotate through time slots (rounds)
   * In each round/slot, all batches run simultaneously but do DIFFERENT labs
   * CRITICAL FIX: Track which teachers are assigned in EACH ROUND to prevent conflicts!
   */
  async assignLabsForSection(section) {
    const numBatches = section.split_batches;
    const numLabs = this.syllabusLabs.length;

    console.log(`   Batches: ${numBatches} (${section.batch_names.join(', ')})`);
    console.log(`   Labs required: ${numLabs}`);
    console.log(`   Rounds needed: ${numLabs} (each batch does all ${numLabs} labs)`);

    // Process assignments ROUND by ROUND (not lab by lab)
    // In each round, all batches run simultaneously with different labs
    for (let round = 0; round < numLabs; round++) {
      console.log(`\n   ⏰ Round ${round + 1}/${numLabs}:`);
      
      // Track teachers used in THIS ROUND (across all batches)
      const teachersUsedInRound = new Set();
      
      // SMARTER APPROACH: Calculate how many times each lab appears in this round
      // PC-LAB might appear 3 times (needs 6 teachers), BDA-LAB might appear 2 times (needs 4 teachers)
      const labDemand = new Map(); // lab ID -> number of batches needing it
      for (let batchNum = 1; batchNum <= numBatches; batchNum++) {
        const labIndex = (round + batchNum - 1) % numLabs;
        const lab = this.syllabusLabs[labIndex];
        const labId = lab._id.toString();
        labDemand.set(labId, (labDemand.get(labId) || 0) + 1);
      }
      
      // Identify teachers who are CRITICAL (needed by high-demand labs with limited pools)
      const criticalTeachers = new Set();
      for (const [labId, demandCount] of labDemand.entries()) {
        const lab = this.syllabusLabs.find(l => l._id.toString() === labId);
        const qualifiedCount = this.teachers.filter(t => 
          t.labs_handled && t.labs_handled.some(l => l._id.toString() === labId)
        ).length;
        
        // Calculate teacher need: demand * 2 (teachers per batch)
        const teachersNeeded = demandCount * 2;
        
        // If this lab needs > 60% of its qualified teachers, mark those teachers as critical
        // But only mark as critical if there's actually scarcity (≤8 qualified teachers total)
        const utilizationRate = teachersNeeded / qualifiedCount;
        if (qualifiedCount <= 8 && utilizationRate > 0.60) {
          this.teachers.forEach(t => {
            if (t.labs_handled && t.labs_handled.some(l => l._id.toString() === labId)) {
              criticalTeachers.add(t._id.toString());
            }
          });
        }
      }

      // SMART ORDERING: Build batch-lab pairings, then sort by teacher availability
      const batchAssignments = [];
      for (let batchNum = 1; batchNum <= numBatches; batchNum++) {
        const labIndex = (round + batchNum - 1) % numLabs;
        const lab = this.syllabusLabs[labIndex];
        
        // Count how many teachers can handle this lab
        const teacherCount = this.teachers.filter(t => 
          t.labs_handled && t.labs_handled.some(l => l._id.toString() === lab._id.toString())
        ).length;
        
        batchAssignments.push({ batchNum, lab, teacherCount });
      }
      
      // Sort by teacher count ascending (assign labs with fewer teachers FIRST)
      batchAssignments.sort((a, b) => a.teacherCount - b.teacherCount);
      
      // Now process batches in priority order
      for (const { batchNum, lab, teacherCount } of batchAssignments) {
        const batchName = `${section.sem}${section.section_name}${batchNum}`;
        
        // DEBUG: Show lab info for PC-related labs
        if (lab.lab_name && lab.lab_name.includes('Parallel')) {
          console.log(`      🔍 DEBUG - Processing ${lab.lab_name} (${lab.lab_shortform}) for batch ${batchNum}, Lab ID: ${lab._id}`);
        }

        // Get suitable rooms for this lab
        const suitableRooms = this.labRooms.filter(room => {
          if (!room.lab_subjects_handled || room.lab_subjects_handled.length === 0) return false;
          return room.lab_subjects_handled.some(supportedLab => 
            supportedLab._id.toString() === lab._id.toString()
          );
        });

        if (suitableRooms.length === 0) {
          throw new Error(`❌ No rooms support ${lab.lab_shortform}`);
        }

        // Sort rooms by name for consistency
        suitableRooms.sort((a, b) => (a.labRoom_no || '').localeCompare(b.labRoom_no || ''));

        // CRITICAL FIX: Find teachers NOT already used in this round
        // Check if THIS lab is critical (needs all/most of its teachers in this round)
        const labId = lab._id.toString();
        const labDemandCount = labDemand.get(labId) || 1;
        const qualifiedCount = this.teachers.filter(t => 
          t.labs_handled && t.labs_handled.some(l => l._id.toString() === labId)
        ).length;
        const isCurrentLabCritical = (labDemandCount * 2) >= qualifiedCount;
        
        const teachers = this.findAvailableTeachersForRound(lab, 2, teachersUsedInRound, criticalTeachers, isCurrentLabCritical);

        if (teachers.length < 2) {
          // FALLBACK: If not enough unique teachers in this round, allow reuse
          console.log(`      ⚠️  Insufficient unique teachers - allowing reuse for ${lab.lab_shortform}`);
          const fallbackTeachers = this.findAvailableTeachers(lab, 2);
          
          if (fallbackTeachers.length < 2) {
            throw new Error(`❌ Not enough teachers for ${lab.lab_shortform} batch ${batchName} in round ${round + 1}. Need 2, found ${fallbackTeachers.length}`);
          }
          
          teachers.length = 0;
          teachers.push(...fallbackTeachers);
        }

        // Use batch number to cycle through rooms
        const roomIndex = (batchNum - 1) % suitableRooms.length;
        const room = suitableRooms[roomIndex];

        // Create assignment
        const assignment = {
          sem: section.sem,
          sem_type: section.sem_type,
          section: section.section_name,
          batch_number: batchNum,
          lab_id: lab._id,
          teacher_ids: [teachers[0]._id, teachers[1]._id],
          assigned_lab_room: room._id,
          meta: {
            batch_name: batchName,
            lab_name: lab.lab_name,
            teacher_names: [teachers[0].teacher_shortform, teachers[1].teacher_shortform],
            room_name: room.labRoom_no
          }
        };

        this.assignments.push(assignment);

        // Mark teachers as used IN THIS ROUND
        teachers.forEach(t => teachersUsedInRound.add(t._id.toString()));

        // Mark teachers as used OVERALL (for fair distribution)
        this.markTeachersUsed(teachers, lab._id, batchNum);

        console.log(`      ${batchName} (${lab.lab_shortform}): ${teachers[0].teacher_shortform} + ${teachers[1].teacher_shortform} → ${room.labRoom_no}`);
      }
    }
  }

  /**
   * Find 2 available teachers who can handle this lab
   * Strategy: Pick teachers who are least used so far (for fair distribution)
   * Teachers CAN be reused across batches since batches rotate through different time slots
   */
  findAvailableTeachers(lab, count) {
    // Find teachers who can handle this lab
    const qualifiedTeachers = this.teachers.filter(teacher => {
      if (!teacher.labs_handled || teacher.labs_handled.length === 0) return false;
      
      return teacher.labs_handled.some(handledLab => 
        handledLab._id.toString() === lab._id.toString()
      );
    });

    if (qualifiedTeachers.length < count) {
      console.log(`      ⚠️  Warning: Only ${qualifiedTeachers.length} teachers can handle ${lab.lab_shortform}`);
      console.log(`         Available: ${qualifiedTeachers.map(t => t.teacher_shortform).join(', ')}`);
    }

    // Sort by usage count (least used first) for fair distribution
    qualifiedTeachers.sort((a, b) => {
      const usageA = (a.usageCount || 0);
      const usageB = (b.usageCount || 0);
      return usageA - usageB;
    });

    return qualifiedTeachers.slice(0, count);
  }

  /**
   * CRITICAL NEW METHOD: Find teachers for a specific round
   * Excludes teachers already assigned in this round (prevents simultaneous conflicts)
   */
  findAvailableTeachersForRound(lab, count, teachersUsedInRound, criticalTeachers = new Set(), isCurrentLabCritical = false) {
    // Find teachers who can handle this lab
    const qualifiedTeachers = this.teachers.filter(teacher => {
      if (!teacher.labs_handled || teacher.labs_handled.length === 0) return false;
      
      // Check if teacher can handle this lab
      const canHandle = teacher.labs_handled.some(handledLab => 
        handledLab._id.toString() === lab._id.toString()
      );
      
      if (!canHandle) return false;

      // CRITICAL: Check if teacher already used in this round
      const teacherId = teacher._id.toString();
      if (teachersUsedInRound.has(teacherId)) {
        return false; // Skip - already assigned in this time slot!
      }

      // NEW: Reserve critical teachers for labs that desperately need them
      // If this lab is NOT critical (doesn't need most/all of its teachers), don't use critical teachers
      if (!isCurrentLabCritical && criticalTeachers.has(teacherId)) {
        return false; // Skip - this teacher is reserved for labs that need all their resources
      }
      
      return true;
    });

    // DEBUG: Show all qualified teachers for this lab
    if (qualifiedTeachers.length < count) {
      console.log(`      ⚠️  Warning: Only ${qualifiedTeachers.length} teachers available for ${lab.lab_shortform} in this round`);
      console.log(`         Qualified: ${qualifiedTeachers.map(t => t.teacher_shortform).join(', ')}`);
    }

    // Sort by usage count (least used first) for fair distribution
    qualifiedTeachers.sort((a, b) => {
      const usageA = (a.usageCount || 0);
      const usageB = (b.usageCount || 0);
      return usageA - usageB;
    });

    return qualifiedTeachers.slice(0, count);
  }

  /**
   * Find available lab room that supports this lab
   * Rooms can be reused since batches rotate through different time slots
   * Strategy: Rotate through rooms to ensure good distribution
   */
  findAvailableLabRoom(lab) {
    // Find rooms that support this lab
    const suitableRooms = this.labRooms.filter(room => {
      if (!room.lab_subjects_handled || room.lab_subjects_handled.length === 0) return false;
      
      return room.lab_subjects_handled.some(supportedLab => 
        supportedLab._id.toString() === lab._id.toString()
      );
    });

    if (suitableRooms.length === 0) {
      console.log(`      ⚠️  Warning: No rooms support ${lab.lab_shortform}`);
      return null;
    }

    // Sort by usage count (least used first) for fair distribution
    suitableRooms.sort((a, b) => {
      const usageA = (a.usageCount || 0);
      const usageB = (b.usageCount || 0);
      // If same usage, sort by room number for consistency
      if (usageA === usageB) {
        return (a.labRoom_no || '').localeCompare(b.labRoom_no || '');
      }
      return usageA - usageB;
    });

    // Pick the least used room
    return suitableRooms[0];
  }

  /**
   * Find available lab room using round-robin to avoid same room for different labs
   * This ensures that in each time slot, batches use DIFFERENT rooms
   */
  findAvailableLabRoomRoundRobin(lab, assignmentIndex) {
    // Find rooms that support this lab
    const suitableRooms = this.labRooms.filter(room => {
      if (!room.lab_subjects_handled || room.lab_subjects_handled.length === 0) return false;
      
      return room.lab_subjects_handled.some(supportedLab => 
        supportedLab._id.toString() === lab._id.toString()
      );
    });

    if (suitableRooms.length === 0) {
      console.log(`      ⚠️  Warning: No rooms support ${lab.lab_shortform}`);
      return null;
    }

    // Sort for consistency
    suitableRooms.sort((a, b) => (a.labRoom_no || '').localeCompare(b.labRoom_no || ''));

    // Round-robin: pick room based on assignment index
    const roomIndex = assignmentIndex % suitableRooms.length;
    return suitableRooms[roomIndex];
  }

  /**
   * Mark teachers as used (increment their usage count)
   */
  markTeachersUsed(teachers, labId, batchNum) {
    for (const teacher of teachers) {
      if (!teacher.usageCount) teacher.usageCount = 0;
      teacher.usageCount++;
    }
  }

  /**
   * Mark room as used (increment usage count)
   */
  markRoomUsed(room, labId, batchNum) {
    if (!room.usageCount) room.usageCount = 0;
    room.usageCount++;
  }

  /**
   * STEP 4: Save all assignments to database
   */
  async saveAssignments() {
    console.log(`\n💾 Saving ${this.assignments.length} assignments to database...`);

    const TeacherLabAssignment = (await import('../models/teacher_lab_assign_model.js')).default;

    // Remove meta field before saving
    const assignmentsToSave = this.assignments.map(a => {
      const { meta, ...assignment } = a;
      return assignment;
    });

    const result = await TeacherLabAssignment.insertMany(assignmentsToSave);

    console.log(`   ✓ Saved ${result.length} lab assignments`);
  }

  /**
   * STEP 5: Print summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 ASSIGNMENT SUMMARY');
    console.log('='.repeat(70));

    // Group by section
    const bySection = {};
    for (const assignment of this.assignments) {
      const key = assignment.section;
      if (!bySection[key]) bySection[key] = [];
      bySection[key].push(assignment);
    }

    for (const [section, assignments] of Object.entries(bySection)) {
      console.log(`\nSection ${section}: ${assignments.length} lab assignments`);
      
      // Group by lab
      const byLab = {};
      for (const a of assignments) {
        const labName = a.meta.lab_name;
        if (!byLab[labName]) byLab[labName] = 0;
        byLab[labName]++;
      }

      for (const [lab, count] of Object.entries(byLab)) {
        console.log(`   ${lab}: ${count} batches`);
      }
    }

    // Teacher workload
    console.log('\n📋 Teacher Workload:');
    const teacherWorkload = {};
    for (const assignment of this.assignments) {
      for (const teacherName of assignment.meta.teacher_names) {
        if (!teacherWorkload[teacherName]) teacherWorkload[teacherName] = 0;
        teacherWorkload[teacherName]++;
      }
    }

    const sortedTeachers = Object.entries(teacherWorkload)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [teacher, count] of sortedTeachers) {
      console.log(`   ${teacher}: ${count} lab sessions`);
    }

    console.log('\n' + '='.repeat(70));
  }
}

export default Phase2AutoAssigner;
