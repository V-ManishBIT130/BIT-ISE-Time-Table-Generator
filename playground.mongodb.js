use('timetable'); // Lab conflict verification

// Check for lab room conflicts
const timetables = db.timetables.find({}).toArray();
const labRoomMap = new Map();
let conflicts = [];

timetables.forEach(tt => {
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
    if (tt[day]) {
      tt[day].forEach(slot => {
        if (slot.subjectName && slot.subjectName.includes('LAB')) {
          const key = `${day}_${slot.classroom}_${slot.startTime}`;
          
          if (!labRoomMap.has(key)) {
            labRoomMap.set(key, []);
          }
          
          labRoomMap.get(key).push({
            section: tt.sectionName,
            subject: slot.subjectName,
            time: `${slot.startTime} - ${slot.endTime}`,
            classroom: slot.classroom,
            day: day
          });
        }
      });
    }
  });
});

// Find conflicts
labRoomMap.forEach((sessions, key) => {
  if (sessions.length > 1) {
    const [day, room, startTime] = key.split('_');
    conflicts.push({
      day,
      room,
      startTime,
      sessions
    });
  }
});

console.log('='.repeat(70));
console.log('LAB ROOM CONFLICT VERIFICATION');
console.log('='.repeat(70));
console.log(`Total timetables: ${timetables.length}`);
console.log(`Conflicts found: ${conflicts.length}\n`);

if (conflicts.length > 0) {
  conflicts.forEach((c, idx) => {
    console.log(`CONFLICT ${idx + 1}: ${c.room} on ${c.day} at ${c.startTime}`);
    c.sessions.forEach(s => {
      console.log(`  - ${s.section}: ${s.subject} (${s.time})`);
    });
    console.log('');
  });
} else {
  console.log('✅ NO LAB ROOM CONFLICTS DETECTED!');
}

db.courses.updateOne(
  {"name": "Cloud"}, 
  {$set: {"Teacher": "Vedashree"}}
)

db.courses.updateOne(
  {"name": "Web Dev"}, 
  {$set: {"Teacher" : "Mercy"}}
)
console.log(db.courses.find())
//console.log(db.movies.find({price: 0}))