import express from 'express';
import TimetableGenerator from '../algorithms/TimetableGenerator.js';

const router = express.Router();

/**
 * POST /api/timetables/generate
 * Generate timetables for all sections in given semesters
 * Body: { semesterType: 'odd', semesters: [3, 5, 7] }
 */
router.post('/generate', async (req, res) => {
  try {
    const { semesterType, semesters } = req.body;

    // Validate input
    if (!semesterType || !semesters || !Array.isArray(semesters)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input. Required: { semesterType: "odd"/"even", semesters: [3,5,7] }'
      });
    }

    if (!['odd', 'even'].includes(semesterType)) {
      return res.status(400).json({
        success: false,
        message: 'semesterType must be "odd" or "even"'
      });
    }

    console.log(`\n🚀 Generating timetables for ${semesterType} semesters: ${semesters.join(', ')}`);

    // Create generator and generate timetables
    const generator = new TimetableGenerator();
    const results = await generator.generateForAllSections(semesterType, semesters);

    // Return results
    res.json({
      success: results.success,
      message: results.success 
        ? `Successfully generated ${results.statistics.successful} timetables`
        : `Generated ${results.statistics.successful} timetables with ${results.statistics.failed} failures`,
      statistics: results.statistics,
      timetables: results.timetables.map(t => ({
        section: t.section,
        semester: t.semester,
        theory_slots: t.timetable.theory_slots.length,
        lab_slots: t.timetable.lab_slots.length,
        total_slots: t.timetable.getTotalSlots(),
        is_valid: t.validation.isValid
      })),
      errors: results.errors
    });

  } catch (error) {
    console.error('❌ Timetable generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate timetables',
      error: error.message
    });
  }
});

/**
 * POST /api/timetables/generate-section
 * Generate timetable for a single section
 * Body: { sectionId: "..." }
 */
router.post('/generate-section', async (req, res) => {
  try {
    const { sectionId } = req.body;

    if (!sectionId) {
      return res.status(400).json({
        success: false,
        message: 'sectionId is required'
      });
    }

    console.log(`\n🚀 Generating timetable for section: ${sectionId}`);

    const generator = new TimetableGenerator();
    const result = await generator.generateForSection(sectionId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Timetable generated successfully',
        timetable: {
          theory_slots: result.timetable.theory_slots,
          lab_slots: result.timetable.lab_slots,
          total_slots: result.timetable.getTotalSlots(),
          fitness: result.timetable.fitness
        },
        validation: result.validation
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate timetable',
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Timetable generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate timetable',
      error: error.message
    });
  }
});

/**
 * GET /api/timetables/sections
 * Get all available sections with their IDs and assignment counts
 */
router.get('/sections', async (req, res) => {
  try {
    const ISESection = (await import('../models/ise_sections_model.js')).default;
    const TeacherPreAssignment = (await import('../models/pre_assign_teacher_model.js')).default;
    const TeacherLabAssignment = (await import('../models/teacher_lab_assign_model.js')).default;
    
    const sections = await ISESection.find({}).select('_id section_name sem sem_type').lean();
    
    // Get assignment counts for each section
    const sectionsWithCounts = await Promise.all(sections.map(async (s) => {
      // Query by sem, sem_type, and section (not section_id!)
      const theoryCount = await TeacherPreAssignment.countDocuments({ 
        sem: s.sem, 
        sem_type: s.sem_type, 
        section: s.section_name 
      });
      
      const labCount = await TeacherLabAssignment.countDocuments({ 
        sem: s.sem, 
        sem_type: s.sem_type, 
        section: s.section_name 
      });
      
      return {
        id: s._id,
        name: s.section_name,
        semester: s.sem,
        semesterType: s.sem_type,
        theory_assignments: theoryCount,
        lab_assignments: labCount,
        has_data: theoryCount > 0 || labCount > 0
      };
    }));
    
    res.json({
      success: true,
      count: sectionsWithCounts.length,
      sections: sectionsWithCounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sections',
      error: error.message
    });
  }
});

/**
 * POST /api/timetables/generate-lab-assignments
 * Regenerate fresh Phase 2 lab assignments for all sections
 * This clears old assignments and creates new conflict-free assignments
 */
router.post('/generate-lab-assignments', async (req, res) => {
  try {
    console.log('\n🚀 Starting Fresh Lab Assignment Generation...\n');

    // Dynamically import Phase2AutoAssigner
    const { default: Phase2AutoAssigner } = await import('../algorithms/Phase2AutoAssigner.js');
    const { default: ISESection } = await import('../models/ise_sections_model.js');

    // Get all sections from database
    const allSections = await ISESection.find({}).lean();
    
    if (allSections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No sections found in database. Please add sections first.'
      });
    }

    console.log(`Found ${allSections.length} sections in database`);
    
    // Get unique semester-type combinations
    const semesterTypes = [...new Set(allSections.map(s => `${s.sem}-${s.sem_type}`))];
    
    const results = [];
    let totalAssignments = 0;

    // Process each semester
    for (const semType of semesterTypes) {
      const [sem, type] = semType.split('-');
      
      console.log(`\n${'='.repeat(70)}`);
      console.log(`PROCESSING SEMESTER ${sem} (${type})`);
      console.log('='.repeat(70));
      
      try {
        const assigner = new Phase2AutoAssigner();
        const result = await assigner.generateLabAssignments(parseInt(sem), type);
        
        results.push({
          semester: parseInt(sem),
          semesterType: type,
          success: true,
          assignments: result.assignments?.length || 0,
          sections: result.sections || []
        });

        totalAssignments += result.assignments?.length || 0;
        
        console.log(`\n✅ Semester ${sem} (${type}) completed successfully!`);
        
      } catch (error) {
        console.error(`\n❌ Error processing Semester ${sem} (${type}):`, error.message);
        results.push({
          semester: parseInt(sem),
          semesterType: type,
          success: false,
          error: error.message
        });
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 LAB ASSIGNMENT GENERATION COMPLETE!');
    console.log('='.repeat(70));
    console.log(`Total Assignments Created: ${totalAssignments}`);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: failureCount === 0,
      message: failureCount === 0 
        ? `Successfully generated ${totalAssignments} lab assignments for ${successCount} semester(s)`
        : `Generated assignments for ${successCount} semester(s) with ${failureCount} failure(s)`,
      totalAssignments,
      results,
      statistics: {
        totalSemesters: semesterTypes.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('❌ Critical Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate lab assignments',
      error: error.message
    });
  }
});

/**
 * GET /api/timetables/test
 * Test endpoint to verify the route is working
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Timetable generation API is working!',
    endpoints: [
      'GET  /api/timetables/sections - List all sections',
      'POST /api/timetables/generate - Generate for all sections',
      'POST /api/timetables/generate-section - Generate for single section',
      'POST /api/timetables/generate-lab-assignments - Regenerate fresh lab assignments (Phase 2)'
    ]
  });
});

export default router;
