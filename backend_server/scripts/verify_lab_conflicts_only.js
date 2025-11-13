require('dotenv').config();
const mongoose = require('mongoose');
const Timetable = require('../models/timetable_model');

async function verifyLabConflicts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Database connected\n');

    const timetables = await Timetable.find({}).lean();
    console.log('======================================================================');
    console.log('🔍 LAB ROOM CONFLICT VERIFICATION');
    console.log('======================================================================');
    console.log('Purpose: Check if any lab room has multiple subjects at the same time');
    console.log('======================================================================\n');

    console.log(`📋 Found ${timetables.length} timetables\n`);

    // Build lab room occupancy map: "Day_Room_StartTime" -> Array of sessions
    const labRoomMap = new Map();
    
    timetables.forEach(tt => {
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
        if (tt[day]) {
          tt[day].forEach(slot => {
            // Only check lab sessions (not theory)
            if (slot.subjectName?.includes('LAB')) {
              const key = `${day}_${slot.classroom}_${slot.startTime}`;
              
              if (!labRoomMap.has(key)) {
                labRoomMap.set(key, []);
              }
              
              labRoomMap.get(key).push({
                section: tt.sectionName,
                subject: slot.subjectName,
                time: `${slot.startTime} - ${slot.endTime}`,
                classroom: slot.classroom
              });
            }
          });
        }
      });
    });

    // Check for conflicts (more than 1 session in same room at same time)
    let conflicts = 0;
    const conflictDetails = [];

    labRoomMap.forEach((sessions, key) => {
      if (sessions.length > 1) {
        conflicts++;
        const [day, room, startTime] = key.split('_');
        
        conflictDetails.push({
          day,
          room,
          startTime,
          sessions
        });
      }
    });

    if (conflicts > 0) {
      console.log(`❌ ${conflicts} LAB ROOM CONFLICTS DETECTED!\n`);
      
      conflictDetails.forEach((conflict, idx) => {
        console.log(`❌ CONFLICT ${idx + 1}:`);
        console.log(`   Room: ${conflict.room}`);
        console.log(`   Day: ${conflict.day}`);
        console.log(`   Time: ${conflict.startTime}`);
        console.log(`   Sessions:`);
        conflict.sessions.forEach(s => {
          console.log(`      - ${s.section}: ${s.subject} (${s.time})`);
        });
        console.log('');
      });
      
      console.log('======================================================================');
      console.log('❌ ACTION REQUIRED: Lab rooms have overlapping sessions!');
      console.log('======================================================================\n');
    } else {
      console.log('✅ NO LAB ROOM CONFLICTS DETECTED!\n');
      console.log('======================================================================');
      console.log('✅ All lab rooms are properly scheduled - no overlaps');
      console.log('======================================================================\n');
      
      // Show summary statistics
      console.log('📊 LAB SCHEDULING SUMMARY:');
      let totalLabSessions = 0;
      timetables.forEach(tt => {
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
          if (tt[day]) {
            tt[day].forEach(slot => {
              if (slot.subjectName?.includes('LAB')) totalLabSessions++;
            });
          }
        });
      });
      console.log(`   Total Lab Sessions: ${totalLabSessions}`);
      console.log(`   Unique Lab Room-Time Slots: ${labRoomMap.size}`);
      console.log('');
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

verifyLabConflicts();
