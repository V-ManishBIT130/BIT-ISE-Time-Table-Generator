/**
 * REGENERATE PHASE 2 LAB ASSIGNMENTS
 * 
 * This script regenerates all Phase 2 lab assignments using the improved algorithm
 * that prevents simultaneous teacher conflicts.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

async function regeneratePhase2() {
  try {
    console.log('🚀 Starting Phase 2 Regeneration...\n');

    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Import Phase2AutoAssigner
    const { default: Phase2AutoAssigner } = await import('./Phase2AutoAssigner.js');
    const assigner = new Phase2AutoAssigner();

    // Regenerate for all odd semesters (3, 5, 7)
    // First, check what sections exist
    const ISESection = (await import('../models/ise_sections_model.js')).default;
    const allSections = await ISESection.find({}).lean();
    
    console.log(`Found ${allSections.length} sections in database:`);
    allSections.forEach(s => {
      console.log(`  ✅ Semester ${s.sem} (${s.sem_type}): Section ${s.section_name} - ${s.split_batches} batches`);
    });
    
    // Get unique semester-type combinations
    const semesterTypes = [...new Set(allSections.map(s => `${s.sem}-${s.sem_type}`))];
    
    for (const semType of semesterTypes) {
      const [sem, type] = semType.split('-');
      
      console.log('\n' + '='.repeat(70));
      console.log(`PROCESSING SEMESTER ${sem} (${type})`);
      console.log('='.repeat(70));
      
      try {
        await assigner.generateLabAssignments(parseInt(sem), type);
        console.log(`✅ Semester ${sem} (${type}) completed successfully!`);
      } catch (error) {
        console.error(`❌ Semester ${sem} (${type}) failed:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 PHASE 2 REGENERATION COMPLETE!');
    console.log('='.repeat(70));

    // Disconnect
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run
regeneratePhase2();
