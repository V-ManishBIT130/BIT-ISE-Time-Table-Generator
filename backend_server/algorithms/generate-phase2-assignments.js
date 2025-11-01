/**
 * ============================================
 * PHASE 2 LAB ASSIGNMENT GENERATOR
 * ============================================
 * 
 * PURPOSE: Generate conflict-free lab assignments for all semesters
 * 
 * USAGE:
 *   node generate-phase2-assignments.js
 * 
 * WHAT IT DOES:
 * - Reads master data (teachers, labs, rooms, sections)
 * - Generates optimal teacher-room assignments for each batch
 * - Ensures zero conflicts (no teacher/room double-booking)
 * - Saves assignments to database (Teacher_Lab_Assignments collection)
 */

import mongoose from 'mongoose';
import Phase2AutoAssigner from './Phase2AutoAssigner.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  try {
    console.log('\n' + '█'.repeat(70));
    console.log('  PHASE 2 LAB ASSIGNMENT GENERATOR');
    console.log('█'.repeat(70) + '\n');

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    // Generate for all semesters
    const semesters = [
      { sem: 3, type: 'odd' },
      { sem: 5, type: 'odd' },
      { sem: 7, type: 'odd' }
    ];

    for (const { sem, type } of semesters) {
      console.log('\n' + '═'.repeat(70));
      console.log(`  SEMESTER ${sem} (${type.toUpperCase()})`);
      console.log('═'.repeat(70));

      const assigner = new Phase2AutoAssigner();
      await assigner.generateLabAssignments(sem, type);
    }

    console.log('\n' + '█'.repeat(70));
    console.log('  ✨ ALL ASSIGNMENTS GENERATED SUCCESSFULLY!');
    console.log('█'.repeat(70));
    
    console.log('\n📊 Next Steps:');
    console.log('   1. Start backend server: npm start');
    console.log('   2. Test API endpoint: POST /api/timetables/generate-section');
    console.log('   3. Generate timetables for all sections');
    console.log('\n✅ Phase 2 Complete!\n');

  } catch (error) {
    console.error('\n' + '❌'.repeat(35));
    console.error('ERROR:', error.message);
    console.error('❌'.repeat(35) + '\n');
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

main();
