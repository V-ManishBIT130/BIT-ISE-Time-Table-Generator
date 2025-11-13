import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Timetable from '../models/timetable_model.js';

dotenv.config();

async function analyzeLabSchedule() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const timetables = await Timetable.find({}).lean();
    
    console.log('\n' + '='.repeat(80));
    console.log('LAB SCHEDULE ANALYSIS');
    console.log('='.repeat(80) + '\n');
    
    // Track all unique time slots used for labs
    const labTimeSlots = new Set();
    const labRoomOccupancy = new Map(); // "Day_Room_Time" -> [sessions]
    let has15to17Slot = false;
    
    timetables.forEach(tt => {
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
        if (tt[day]) {
          tt[day].forEach(slot => {
            if (slot.subjectName?.includes('LAB')) {
              const timeKey = `${slot.startTime}-${slot.endTime}`;
              labTimeSlots.add(timeKey);
              
              // Check for the problematic 15:00-17:00 slot
              if (slot.startTime === '15:00' && slot.endTime === '17:00') {
                has15to17Slot = true;
                console.log(`⚠️  Found 15:00-17:00 slot: ${tt.sectionName} - ${slot.subjectName} on ${day}`);
              }
              
              // Track room occupancy
              const roomKey = `${day}_${slot.classroom}_${slot.startTime}`;
              if (!labRoomOccupancy.has(roomKey)) {
                labRoomOccupancy.set(roomKey, []);
              }
              labRoomOccupancy.get(roomKey).push({
                section: tt.sectionName,
                subject: slot.subjectName,
                time: timeKey
              });
            }
          });
        }
      });
    });
    
    console.log('📊 UNIQUE LAB TIME SLOTS USED:');
    const sortedSlots = Array.from(labTimeSlots).sort();
    sortedSlots.forEach((slot, idx) => {
      console.log(`   ${idx + 1}. ${slot}`);
    });
    console.log(`\nTotal unique time slots: ${labTimeSlots.size}\n`);
    
    if (has15to17Slot) {
      console.log('❌ WARNING: 15:00-17:00 slot is being used (overlaps with 14:00-16:00)!\n');
    } else {
      console.log('✅ No 15:00-17:00 slots detected\n');
    }
    
    // Check for room conflicts
    console.log('🏫 CHECKING LAB ROOM CONFLICTS:\n');
    let conflicts = 0;
    labRoomOccupancy.forEach((sessions, key) => {
      if (sessions.length > 1) {
        const [day, room, startTime] = key.split('_');
        console.log(`❌ CONFLICT: ${room} on ${day} at ${startTime}`);
        sessions.forEach(s => {
          console.log(`   - ${s.section}: ${s.subject} (${s.time})`);
        });
        console.log('');
        conflicts++;
      }
    });
    
    if (conflicts === 0) {
      console.log('✅ NO LAB ROOM CONFLICTS!\n');
    } else {
      console.log(`❌ Total conflicts: ${conflicts}\n`);
    }
    
    console.log('='.repeat(80) + '\n');
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

analyzeLabSchedule();
