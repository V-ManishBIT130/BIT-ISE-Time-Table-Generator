// ============================================
// FILE: DataLoader.js
// PURPOSE: Load Phase 2 assignment data from database
// LEARN: How to fetch and organize data for algorithm
// ============================================

/**
 * CLASS: DataLoader
 * 
 * WHAT IT DOES:
 * Fetches all Phase 2 data (teacher assignments, lab assignments)
 * and organizes it for the timetable generation algorithm.
 * 
 * IMPORTANT: This will connect to your MongoDB database
 * to get REAL data from Phase 2!
 */
class DataLoader {
  
  /**
   * METHOD: loadPhase2Data
   * PURPOSE: Fetch all necessary data for timetable generation
   * INPUT: semester (e.g., 3), sem_type (e.g., 'odd')
   * OUTPUT: Organized data structure ready for algorithm
   */
  static async loadPhase2Data(semester, semType) {
    console.log(`\n[DataLoader] Loading Phase 2 data for Semester ${semester} (${semType})...`);
    
    // NOTE: In real implementation, these will be actual MongoDB queries
    // For now, we'll create a structure that matches what we'll get from DB
    
    const phase2Data = {
      semester: semester,
      sem_type: semType,
      
      // ==========================================
      // THEORY ASSIGNMENTS
      // From: Teacher_Subject_Assignments collection
      // ==========================================
      theory_assignments: [],
      // Example structure:
      // {
      //   _id: ObjectId,
      //   subject_id: { subject_name, subject_shortform, hrs_per_week, max_hrs_per_day, subject_type },
      //   section_id: { section_name, sem, sem_type, batch_names: ['3A1','3A2','3A3'] },
      //   teacher_id: { name, teacher_shortform },
      //   classroom_id: null  // Will be assigned during generation
      // }
      
      // ==========================================
      // LAB ASSIGNMENTS
      // From: Teacher_Lab_Assignments collection
      // ==========================================
      lab_assignments: [],
      // Example structure:
      // {
      //   _id: ObjectId,
      //   lab_id: { lab_name, lab_shortform, duration_hours: 2 },
      //   section_id: { section_name, sem, sem_type, batch_names: ['3A1','3A2','3A3'] },
      //   batch_number: 1,  // 1, 2, or 3
      //   batch_name: '3A1',
      //   teacher1_id: { name, teacher_shortform },
      //   teacher2_id: { name, teacher_shortform },
      //   assigned_lab_room: { room_name }  // Already assigned in Phase 2!
      // }
      
      // ==========================================
      // AVAILABLE CLASSROOMS
      // From: Classrooms collection
      // ==========================================
      classrooms: [],
      // Example structure:
      // {
      //   _id: ObjectId,
      //   room_no: 'ISE-601',
      //   type: 'theory',
      //   capacity: 60  // Informational only
      // }
      
      // ==========================================
      // SECTIONS INFO
      // From: ISE_Sections collection
      // ==========================================
      sections: [],
      // Example structure:
      // {
      //   _id: ObjectId,
      //   section_name: '3A',
      //   sem: 3,
      //   sem_type: 'odd',
      //   batch_names: ['3A1', '3A2', '3A3'],
      //   num_batches: 3
      // }
      
      // ==========================================
      // FIXED TIME SLOTS (for OEC/PEC in Sem 7)
      // ==========================================
      fixed_slots: []
      // Example structure:
      // {
      //   subject_id: ObjectId,
      //   subject_name: 'Machine Learning (OEC)',
      //   day: 'Friday',
      //   start_time: '13:30',
      //   end_time: '15:30'
      // }
    };
    
    console.log('[DataLoader] ✅ Data structure ready');
    return phase2Data;
  }
  
  /**
   * METHOD: loadWithMockData
   * PURPOSE: Create realistic mock data for testing WITHOUT database
   * USE: For testing algorithm before database integration
   */
  static async loadWithMockData() {
    console.log('\n[DataLoader] Creating mock Phase 2 data...');
    
    const mockData = {
      semester: 3,
      sem_type: 'odd',
      
      // Theory assignments
      theory_assignments: [
        {
          _id: 'assignment_1',
          subject_id: {
            _id: 'subject_ds',
            subject_name: 'Data Structures',
            subject_shortform: 'DS',
            hrs_per_week: 3,
            max_hrs_per_day: 2,
            subject_type: 'regular_theory'
          },
          section_id: {
            _id: 'section_3a',
            section_name: '3A',
            sem: 3,
            sem_type: 'odd',
            batch_names: ['3A1', '3A2', '3A3'],
            num_batches: 3
          },
          teacher_id: {
            _id: 'teacher_dc',
            name: 'Prof. Deeksha Chandra',
            teacher_shortform: 'DC'
          }
        },
        {
          _id: 'assignment_2',
          subject_id: {
            _id: 'subject_dbms',
            subject_name: 'Database Management Systems',
            subject_shortform: 'DBMS',
            hrs_per_week: 4,
            max_hrs_per_day: 2,
            subject_type: 'regular_theory'
          },
          section_id: {
            _id: 'section_3a',
            section_name: '3A',
            sem: 3,
            sem_type: 'odd',
            batch_names: ['3A1', '3A2', '3A3'],
            num_batches: 3
          },
          teacher_id: {
            _id: 'teacher_ak',
            name: 'Prof. Arjun Kumar',
            teacher_shortform: 'AK'
          }
        },
        {
          _id: 'assignment_3',
          subject_id: {
            _id: 'subject_coa',
            subject_name: 'Computer Organization',
            subject_shortform: 'COA',
            hrs_per_week: 3,
            max_hrs_per_day: 2,
            subject_type: 'regular_theory'
          },
          section_id: {
            _id: 'section_3a',
            section_name: '3A',
            sem: 3,
            sem_type: 'odd',
            batch_names: ['3A1', '3A2', '3A3'],
            num_batches: 3
          },
          teacher_id: {
            _id: 'teacher_raj',
            name: 'Prof. Rajeev Sharma',
            teacher_shortform: 'RAJ'
          }
        }
      ],
      
      // Lab assignments (grouped by section and lab)
      lab_assignments: [
        // DSL - Batch 3A1
        {
          _id: 'lab_assign_1',
          lab_id: {
            _id: 'lab_dsl',
            lab_name: 'Data Structures Lab',
            lab_shortform: 'DSL',
            duration_hours: 2
          },
          section_id: {
            _id: 'section_3a',
            section_name: '3A',
            sem: 3,
            sem_type: 'odd',
            batch_names: ['3A1', '3A2', '3A3'],
            num_batches: 3
          },
          batch_number: 1,
          batch_name: '3A1',
          teacher1_id: {
            _id: 'teacher_dc',
            name: 'Prof. Deeksha Chandra',
            teacher_shortform: 'DC'
          },
          teacher2_id: {
            _id: 'teacher_ak',
            name: 'Prof. Arjun Kumar',
            teacher_shortform: 'AK'
          },
          assigned_lab_room: {
            _id: 'labroom_301',
            room_name: 'ISE-301'
          }
        },
        // DSL - Batch 3A2
        {
          _id: 'lab_assign_2',
          lab_id: {
            _id: 'lab_dsl',
            lab_name: 'Data Structures Lab',
            lab_shortform: 'DSL',
            duration_hours: 2
          },
          section_id: {
            _id: 'section_3a',
            section_name: '3A',
            sem: 3,
            sem_type: 'odd',
            batch_names: ['3A1', '3A2', '3A3'],
            num_batches: 3
          },
          batch_number: 2,
          batch_name: '3A2',
          teacher1_id: {
            _id: 'teacher_raj',
            name: 'Prof. Rajeev Sharma',
            teacher_shortform: 'RAJ'
          },
          teacher2_id: {
            _id: 'teacher_sum',
            name: 'Prof. Suman Patil',
            teacher_shortform: 'SUM'
          },
          assigned_lab_room: {
            _id: 'labroom_302',
            room_name: 'ISE-302'
          }
        },
        // DSL - Batch 3A3
        {
          _id: 'lab_assign_3',
          lab_id: {
            _id: 'lab_dsl',
            lab_name: 'Data Structures Lab',
            lab_shortform: 'DSL',
            duration_hours: 2
          },
          section_id: {
            _id: 'section_3a',
            section_name: '3A',
            sem: 3,
            sem_type: 'odd',
            batch_names: ['3A1', '3A2', '3A3'],
            num_batches: 3
          },
          batch_number: 3,
          batch_name: '3A3',
          teacher1_id: {
            _id: 'teacher_arj',
            name: 'Prof. Arjun Patel',
            teacher_shortform: 'ARJ'
          },
          teacher2_id: {
            _id: 'teacher_pri',
            name: 'Prof. Priya Singh',
            teacher_shortform: 'PRI'
          },
          assigned_lab_room: {
            _id: 'labroom_303',
            room_name: 'ISE-303'
          }
        }
      ],
      
      // Available classrooms
      classrooms: [
        { _id: 'room_601', room_no: 'ISE-601', type: 'theory', capacity: 60 },
        { _id: 'room_602', room_no: 'ISE-602', type: 'theory', capacity: 60 },
        { _id: 'room_603', room_no: 'ISE-603', type: 'theory', capacity: 60 },
        { _id: 'room_lh1', room_no: 'ISE-LH1', type: 'theory', capacity: 120 }
      ],
      
      // Sections
      sections: [
        {
          _id: 'section_3a',
          section_name: '3A',
          sem: 3,
          sem_type: 'odd',
          batch_names: ['3A1', '3A2', '3A3'],
          num_batches: 3
        }
      ],
      
      // Fixed slots (empty for Sem 3)
      fixed_slots: []
    };
    
    console.log('[DataLoader] ✅ Mock data created');
    console.log(`  - Theory Assignments: ${mockData.theory_assignments.length}`);
    console.log(`  - Lab Assignments: ${mockData.lab_assignments.length}`);
    console.log(`  - Classrooms: ${mockData.classrooms.length}`);
    console.log(`  - Sections: ${mockData.sections.length}`);
    
    return mockData;
  }
  
  /**
   * METHOD: groupLabAssignmentsBySection
   * PURPOSE: Organize lab assignments for easier processing
   * OUTPUT: Map of section_id -> [lab assignments for all batches]
   */
  static groupLabAssignmentsBySection(labAssignments) {
    const grouped = new Map();
    
    for (const assignment of labAssignments) {
      const sectionId = assignment.section_id._id.toString();
      const labId = assignment.lab_id._id.toString();
      const key = `${sectionId}_${labId}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          section_id: assignment.section_id,
          lab_id: assignment.lab_id,
          batches: []
        });
      }
      
      grouped.get(key).batches.push({
        batch_number: assignment.batch_number,
        batch_name: assignment.batch_name,
        teacher1_id: assignment.teacher1_id,
        teacher2_id: assignment.teacher2_id,
        lab_room_id: assignment.assigned_lab_room._id,
        lab_room_name: assignment.assigned_lab_room.room_name
      });
    }
    
    // Convert to array and sort batches
    const result = [];
    for (const [key, value] of grouped) {
      value.batches.sort((a, b) => a.batch_number - b.batch_number);
      result.push(value);
    }
    
    console.log(`[DataLoader] Grouped ${labAssignments.length} lab assignments into ${result.length} lab sessions`);
    
    return result;
  }
}

// ==========================================
// EXPORTS
// ==========================================
export default DataLoader;
