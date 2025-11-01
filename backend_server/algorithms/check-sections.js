import mongoose from 'mongoose';
import ISESection from '../models/ise_sections_model.js';

mongoose.connect('mongodb://localhost:27017/timetable_generator')
  .then(async () => {
    const sections = await ISESection.find({});
    console.log(`\nFound ${sections.length} sections in database:\n`);
    sections.forEach(s => {
      console.log(`  ✅ Semester ${s.sem} (${s.sem_type}): Section ${s.section_name} - ${s.split_batches} batches`);
    });
    await mongoose.connection.close();
  })
  .catch(err => console.error('Error:', err));
