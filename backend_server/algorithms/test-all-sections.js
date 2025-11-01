/**
 * ============================================================================
 * TEST ALL SECTIONS - TIMETABLE GENERATION
 * ============================================================================
 * PURPOSE: Test timetable generation for all sections and verify zero conflicts
 * ============================================================================
 */

import mongoose from 'mongoose';
import TimetableGenerator from './TimetableGenerator.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// MongoDB connection from .env
const MONGODB_URI = process.env.MONGODB_URI;

async function testAllSections() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const generator = new TimetableGenerator();

    // Test ODD semester sections (3, 5, 7)
    console.log('═'.repeat(70));
    console.log('🧪 TESTING ODD SEMESTER SECTIONS (3, 5, 7)');
    console.log('═'.repeat(70) + '\n');

    const oddResults = await generator.generateForAllSections('odd', [3, 5, 7]);

    // Test EVEN semester sections (4, 6, 8)
    console.log('\n\n');
    console.log('═'.repeat(70));
    console.log('🧪 TESTING EVEN SEMESTER SECTIONS (4, 6, 8)');
    console.log('═'.repeat(70) + '\n');

    const evenResults = await generator.generateForAllSections('even', [4, 6, 8]);

    // Combined summary
    console.log('\n\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║               COMPREHENSIVE TEST SUMMARY                       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const totalSections = oddResults.statistics.total_sections + evenResults.statistics.total_sections;
    const totalSuccessful = oddResults.statistics.successful + evenResults.statistics.successful;
    const totalFailed = oddResults.statistics.failed + evenResults.statistics.failed;

    console.log('📊 Overall Statistics:');
    console.log(`   Total Sections Tested: ${totalSections}`);
    console.log(`   ✅ Successful: ${totalSuccessful}`);
    console.log(`   ❌ Failed: ${totalFailed}`);
    console.log(`   Success Rate: ${((totalSuccessful/totalSections)*100).toFixed(1)}%\n`);

    // List all successful sections
    if (totalSuccessful > 0) {
      console.log('✅ Successful Sections:');
      oddResults.timetables.forEach(t => {
        console.log(`   - ${t.section} (Semester ${t.semester}): ${t.timetable.theory_slots.length} theory + ${t.timetable.lab_slots.length} lab slots`);
      });
      evenResults.timetables.forEach(t => {
        console.log(`   - ${t.section} (Semester ${t.semester}): ${t.timetable.theory_slots.length} theory + ${t.timetable.lab_slots.length} lab slots`);
      });
    }

    // List any failures
    if (totalFailed > 0) {
      console.log('\n❌ Failed Sections:');
      [...oddResults.errors, ...evenResults.errors].forEach(err => {
        console.log(`   - ${err.section}: ${err.error}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    if (totalFailed === 0) {
      console.log('🎉 ALL TESTS PASSED! All sections generated with ZERO conflicts! 🎉');
    } else {
      console.log('⚠️  Some sections failed. Please review errors above.');
    }
    console.log('═'.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the test
testAllSections();
