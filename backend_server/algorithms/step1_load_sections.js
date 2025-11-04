/**
 * STEP 1: Load Sections
 * 
 * Purpose: Initialize timetable structure for all sections of a semester type
 * 
 * Input: sem_type ('odd' or 'even'), academic_year ('2024-2025')
 * Output: Empty timetable documents with metadata for each section
 */

import ISESections from '../models/ise_sections_model.js'
import Timetable from '../models/timetable_model.js'

export async function loadSectionsAndInitialize(semType, academicYear) {
  console.log(`\n📋 Step 1: Loading sections for ${semType} semester...`)
  
  try {
    // Load all sections for this semester type
    const sections = await ISESections.find({ sem_type: semType }).lean()
    
    if (sections.length === 0) {
      throw new Error(`No sections found for ${semType} semester`)
    }
    
    console.log(`✅ Found ${sections.length} sections:`, sections.map(s => `${s.sem}${s.section_name}`).join(', '))
    
    // Clear existing timetables for this semester type and academic year
    const deleteResult = await Timetable.deleteMany({
      sem_type: semType,
      academic_year: academicYear
    })
    
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing timetables`)
    
    // Initialize empty timetable structure for all sections
    const timetables = []
    
    for (const section of sections) {
      const timetableData = {
        section_id: section._id,
        section_name: `${section.sem}${section.section_name}`,
        sem: section.sem,
        sem_type: section.sem_type,
        academic_year: academicYear,
        generation_metadata: {
          generated_at: new Date(),
          algorithm: 'greedy',
          current_step: 1,
          steps_completed: ['load_sections'],
          teacher_assignment_summary: {
            total_lab_sessions: 0,
            sessions_with_2_teachers: 0,
            sessions_with_1_teacher: 0,
            sessions_with_0_teachers: 0
          }
        },
        theory_slots: [],
        lab_slots: [],
        flagged_sessions: []
      }
      
      const timetable = await Timetable.create(timetableData)
      timetables.push(timetable)
      
      console.log(`   💾 Initialized timetable for Section ${timetableData.section_name}`)
    }
    
    console.log(`✅ Step 1 Complete: ${timetables.length} timetables initialized`)
    
    return {
      success: true,
      message: `Step 1 complete: Loaded ${sections.length} sections`,
      data: {
        sections_processed: sections.length,
        timetables: timetables
      }
    }
    
  } catch (error) {
    console.error('❌ Error in Step 1:', error)
    throw error
  }
}
