/**
 * ============================================================================
 * DATA LOADER - Real Database Integration
 * ============================================================================
 * PURPOSE: Load Phase 2 assignment data from MongoDB for timetable generation
 * ============================================================================
 */

class DataLoaderDB {
  
  /**
   * Load Phase 2 assignment data from database
   * @param {String} semesterType - 'odd' or 'even'
   * @param {Array} semesters - [3, 5, 7] or [4, 6, 8]
   * @returns {Object} - {theory_assignments, lab_assignments, classrooms, sections}
   */
  static async loadPhase2Data(semesterType, semesters) {
    try {
      // Import database models
      const ISESection = (await import('../../models/ise_sections_model.js')).default;
      const TeacherPreAssignment = (await import('../../models/pre_assign_teacher_model.js')).default;
      const TeacherLabAssignment = (await import('../../models/teacher_lab_assign_model.js')).default;
      const DeptClass = (await import('../../models/dept_class_model.js')).default;
      const DeptLab = (await import('../../models/dept_labs_model.js')).default;
      const Subject = (await import('../../models/subjects_model.js')).default;
      const Teacher = (await import('../../models/teachers_models.js')).default;
      const SyllabusLabs = (await import('../../models/syllabus_labs_model.js')).default;

      console.log('[DataLoaderDB] Fetching from database...');
      console.log(`[DataLoaderDB] Semester Type: ${semesterType}, Semesters: ${semesters.join(', ')}`);

      // Step 1: Fetch sections for given semesters
      const sections = await ISESection.find({
        sem: { $in: semesters },
        sem_type: semesterType
      }).lean();

      console.log(`[DataLoaderDB] ✅ Found ${sections.length} sections`);

      if (sections.length === 0) {
        throw new Error(`No sections found for ${semesterType} semesters: ${semesters.join(', ')}`);
      }

      // Step 2: Fetch theory assignments for these sections
      // NOTE: Teacher_Subject_Assignments use sem, sem_type, section (not section_id!)
      const theory_assignments = await TeacherPreAssignment.find({
        sem: { $in: semesters },
        sem_type: semesterType
      })
      .populate('subject_id')
      .populate('teacher_id')
      .lean();

      console.log(`[DataLoaderDB] ✅ Found ${theory_assignments.length} theory assignments`);

      // Step 3: Fetch lab assignments for these sections
      const lab_assignments = await TeacherLabAssignment.find({
        sem: { $in: semesters },
        sem_type: semesterType
      })
      .populate('lab_id')
      .populate('teacher_ids') // Array of 2 teachers
      .populate('assigned_lab_room')
      .lean();

      console.log(`[DataLoaderDB] ✅ Found ${lab_assignments.length} lab assignments`);

      // Step 4: Fetch all available classrooms
      const classrooms = await DeptClass.find({}).lean();
      console.log(`[DataLoaderDB] ✅ Found ${classrooms.length} classrooms`);

      // Step 5: Fetch all labs (for reference)
      const labs = await DeptLab.find({}).lean();
      console.log(`[DataLoaderDB] ✅ Found ${labs.length} labs`);

      console.log('[DataLoaderDB] ✅ All data loaded successfully\n');

      return {
        theory_assignments,
        lab_assignments,
        classrooms,
        labs,
        sections
      };

    } catch (error) {
      console.error('[DataLoaderDB] ❌ Database error:', error.message);
      throw error;
    }
  }

  /**
   * Load Phase 2 data for a specific section
   * @param {String} sectionId - Section database ID
   * @returns {Object} - {theory_assignments, lab_assignments, classrooms, section}
   */
  static async loadPhase2DataForSection(sectionId) {
    try {
      const ISESection = (await import('../../models/ise_sections_model.js')).default;
      const TeacherPreAssignment = (await import('../../models/pre_assign_teacher_model.js')).default;
      const TeacherLabAssignment = (await import('../../models/teacher_lab_assign_model.js')).default;
      const DeptClass = (await import('../../models/dept_class_model.js')).default;
      const Subject = (await import('../../models/subjects_model.js')).default;
      const Teacher = (await import('../../models/teachers_models.js')).default;
      const SyllabusLabs = (await import('../../models/syllabus_labs_model.js')).default;
      const DeptLab = (await import('../../models/dept_labs_model.js')).default;

      console.log(`[DataLoaderDB] Loading data for section: ${sectionId}`);

      // Fetch section
      const section = await ISESection.findById(sectionId).lean();
      if (!section) throw new Error('Section not found');

      console.log(`[DataLoaderDB] ✅ Found section: ${section.section_name} (Sem ${section.sem}, ${section.sem_type})`);

      // Fetch assignments for this section using sem, sem_type, section
      const theory_assignments = await TeacherPreAssignment.find({ 
        sem: section.sem,
        sem_type: section.sem_type,
        section: section.section_name
      })
        .populate('subject_id')
        .populate('teacher_id')
        .lean();

      const lab_assignments = await TeacherLabAssignment.find({ 
        sem: section.sem,
        sem_type: section.sem_type,
        section: section.section_name
      })
        .populate('lab_id')
        .populate('teacher_ids') // Array of 2 teachers
        .populate('assigned_lab_room')
        .lean();

      const classrooms = await DeptClass.find({}).lean();

      console.log('[DataLoaderDB] ✅ Section data loaded');
      console.log(`   Theory assignments: ${theory_assignments.length}`);
      console.log(`   Lab assignments: ${lab_assignments.length}`);

      // Debug: Show lab assignments
      if (lab_assignments.length > 0) {
        console.log('\n[DataLoaderDB] 📋 Lab assignments detail:');
        for (const la of lab_assignments) {
          const batchName = `${section.sem}${la.section}${la.batch_number}`;
          console.log(`   - ${batchName}: ${la.lab_id?.lab_shortform || 'Unknown Lab'} → Room: ${la.assigned_lab_room?.labRoom_no || 'Unknown'} (Teachers: ${la.teacher_ids[0]?.teacher_shortform || '?'}, ${la.teacher_ids[1]?.teacher_shortform || '?'})`);
        }
      }

      // Add section object to theory assignments (algorithm expects section_id field)
      const enrichedTheoryAssignments = theory_assignments.map(assignment => ({
        ...assignment,
        section_id: section  // Add full section object
      }));

      return {
        theory_assignments: enrichedTheoryAssignments,
        lab_assignments,
        classrooms,
        section
      };

    } catch (error) {
      console.error('[DataLoaderDB] ❌ Error:', error.message);
      throw error;
    }
  }

  /**
   * Group lab assignments by BATCH (not by lab type!)
   * NEW STRATEGY: Each batch gets multiple labs, distributed across time slots
   * This allows different batches to do different labs simultaneously
   */
  static groupLabAssignmentsByBatch(lab_assignments, section) {
    // Group by batch number
    const batchLabs = {};

    for (const assignment of lab_assignments) {
      const batchNum = assignment.batch_number;
      
      if (!batchLabs[batchNum]) {
        batchLabs[batchNum] = {
          batch_number: batchNum,
          batch_name: `${section.sem}${assignment.section}${batchNum}`, // e.g., "5A1"
          section_id: section,
          labs: []
        };
      }

      // Add this lab to the batch's lab list
      batchLabs[batchNum].labs.push({
        lab_id: assignment.lab_id,
        lab_name: assignment.lab_id?.lab_name || 'Unknown',
        lab_shortform: assignment.lab_id?.lab_shortform || 'Unknown',
        teacher1_id: assignment.teacher_ids[0],
        teacher2_id: assignment.teacher_ids[1],
        teacher1_name: assignment.teacher_ids[0]?.name || assignment.teacher_ids[0]?.teacher_shortform || 'Unknown',
        teacher2_name: assignment.teacher_ids[1]?.name || assignment.teacher_ids[1]?.teacher_shortform || 'Unknown',
        lab_room_id: assignment.assigned_lab_room,
        room_name: assignment.assigned_lab_room?.labRoom_no || 'Unknown'
      });
    }

    const batches = Object.values(batchLabs);
    console.log(`[DataLoaderDB] Organized ${lab_assignments.length} lab assignments into ${batches.length} batches with rotating labs`);
    
    // Log each batch's labs
    for (const batch of batches) {
      console.log(`   ${batch.batch_name}: ${batch.labs.length} labs (${batch.labs.map(l => l.lab_shortform).join(', ')})`);
    }

    return batches;
  }
}

export default DataLoaderDB;
