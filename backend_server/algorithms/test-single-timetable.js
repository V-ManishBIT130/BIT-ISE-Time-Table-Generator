/**
 * Quick test script to generate timetable for a single section
 * This will allow us to see the UI in action
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function testTimetableGeneration() {
  try {
    console.log('🚀 Testing Timetable Generation for Section 3A...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Import generator
    const { default: TimetableGenerator } = await import('./TimetableGenerator.js');
    const { default: ISESection } = await import('../models/ise_sections_model.js');

    // Get Section 3A
    const section3A = await ISESection.findOne({ sem: 3, section_name: 'A' });
    
    if (!section3A) {
      console.log('❌ Section 3A not found!');
      process.exit(1);
    }

    console.log(`Found: Semester ${section3A.sem} Section ${section3A.section_name}`);
    console.log(`Batches: ${section3A.split_batches}\n`);

    // Generate timetable
    const generator = new TimetableGenerator();
    const result = await generator.generateForSection(section3A._id.toString());

    if (result.success) {
      console.log('\n✅ SUCCESS! Timetable generated for Section 3A');
      console.log('\nYou can now view it at: http://localhost:5173/dashboard/view');
      console.log('\nTimetable Summary:');
      console.log(`  Theory slots: ${result.timetable.theory_slots.length}`);
      console.log(`  Lab slots: ${result.timetable.lab_slots.length}`);
      console.log(`  Fitness: ${result.timetable.getFitness()}`);
      console.log(`  Conflicts: ${result.validation.errors.length}`);
    } else {
      console.log('\n❌ FAILED to generate timetable');
      console.log('Error:', result.error);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testTimetableGeneration();
