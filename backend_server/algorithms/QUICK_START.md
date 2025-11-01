# 🚀 QUICK START - TIMETABLE GENERATION

## 📋 What We Have Now

✅ **Greedy Algorithm** - Builds initial timetables (Phase 0)  
✅ **3 Validators** - Checks teacher/room conflicts, batch sync  
✅ **Database Loader** - Fetches Phase 2 data  
✅ **Test Suite** - Comprehensive testing  

---

## 🏃 Quick Commands

### Test with Mock Data (Always Works):
```bash
cd backend_server/algorithms
node test-greedy.js
```
**Output:** Perfect timetable for 1 section with mock data ✅

### Test with Real Database (When MongoDB is Running):
```bash
cd backend_server/algorithms
node test-real-db.js
```
**Output:** Timetables for ALL odd semester sections (3A, 5A, 7A) ✅

---

## 📁 Important Files

### Main Controllers:
- **TimetableGenerator.js** - Main API (generate for all sections or single section)
- **GreedyBuilder.js** - Creates initial timetable

### Data Loading:
- **utils/DataLoader.js** - Mock data generator (for testing)
- **utils/DataLoaderDB.js** - Real database loader

### Validation:
- **validators/TeacherConflictValidator.js**
- **validators/RoomConflictValidator.js**
- **validators/BatchSyncValidator.js**

### Testing:
- **test-greedy.js** - Test with mock data
- **test-real-db.js** - Test with real database

---

## 🎯 How to Use

### Generate Timetables for All Sections:
```javascript
import TimetableGenerator from './TimetableGenerator.js';

const generator = new TimetableGenerator();

// For odd semesters (3, 5, 7)
const results = await generator.generateForAllSections('odd', [3, 5, 7]);

// For even semesters (4, 6, 8)
const results = await generator.generateForAllSections('even', [4, 6, 8]);

// Check results
console.log(`Generated: ${results.timetables.length} timetables`);
console.log(`Failures: ${results.errors.length}`);
```

### Generate Timetable for Single Section:
```javascript
const generator = new TimetableGenerator();

const result = await generator.generateForSection(sectionId);

if (result.success) {
  console.log('✅ Timetable generated!');
  console.log(`Theory slots: ${result.timetable.theory_slots.length}`);
  console.log(`Lab slots: ${result.timetable.lab_slots.length}`);
} else {
  console.log('❌ Failed:', result.error);
}
```

---

## ⚙️ Requirements

### Database:
- MongoDB running (localhost or cloud)
- Phase 2 data entered:
  - ISE Sections (with current_sem)
  - Teacher Pre-Assignments (theory subjects)
  - Teacher Lab Assignments (labs with batches)
  - Department Classrooms
  - Department Labs

### Environment:
- Node.js 14+
- ES Modules enabled (`"type": "module"` in package.json)
- MongoDB connection string in `.env`

---

## 🐛 Troubleshooting

### "Cannot find module" error:
- Check if all files use ES module syntax (`import`/`export`)
- Ensure `package.json` has `"type": "module"`

### "Connection refused" error:
- Start MongoDB: `mongod` or check cloud connection
- Verify MONGO_URI in `.env` file

### "No sections found" error:
- Check `current_sem` field in ISE_Sections collection
- Ensure data exists for requested semesters

### "Validation failed" error:
- Check Phase 2 data is complete (teachers, rooms assigned)
- Verify lab batches have 2 teachers each
- Ensure subject hours are configured (hrs_per_week, max_hrs_per_day)

---

## 📊 Expected Output

### Successful Generation:
```
╔════════════════════════════════════════════════════════╗
║    TIMETABLE GENERATION - STARTING                     ║
╚════════════════════════════════════════════════════════╝

📅 Semester Type: ODD
🎓 Semesters: 3, 5, 7

📦 STEP 1: Loading Phase 2 assignment data...

✅ Data loaded successfully:
   - Theory Assignments: 15
   - Lab Assignments: 9
   - Classrooms: 8
   - Sections: 3

🏗️  STEP 2: Generating timetables...

──────────────────────────────────────────────────────────
📚 Processing: 3A (Semester 3)
──────────────────────────────────────────────────────────
   Theory Subjects: 5
   Lab Sessions: 3
   
   🔧 PHASE 0: Greedy Initialization...
   🔍 Validating timetable...
   ✅ Timetable generated successfully!
      - Theory Slots: 12
      - Lab Slots: 3
      - Total Violations: 0

[... repeats for each section ...]

╔════════════════════════════════════════════════════════╗
║    GENERATION COMPLETE - SUMMARY                       ║
╚════════════════════════════════════════════════════════╝

📊 Statistics:
   Total Sections: 3
   ✅ Successful: 3
   ❌ Failed: 0
   📅 Total Slots Generated: 45
   📚 Total Theory Hours: 90
   🧪 Total Lab Hours: 18
```

---

## 🎯 Next Steps

### Immediate:
1. Test with real database (`node test-real-db.js`)
2. Verify all sections generate correctly
3. Check timetable quality (gaps, distribution)

### Phase 1 (Days 4-5):
1. Build `FitnessCalculator.js` - Score timetable quality
2. Add soft constraint checking
3. Test fitness scoring

### Phase 2 (Week 2):
1. Build `GeneticAlgorithm.js` - Evolution operators
2. Integrate with GreedyBuilder
3. Test improvements

### Phase 3 (Week 3):
1. Build `BeesAlgorithm.js` - Local refinement
2. Complete triple hybrid integration
3. Final testing

### Phase 4 (Week 4):
1. API endpoints in backend
2. Frontend UI component
3. Database save/load
4. PDF/Excel export

---

## 📞 Need Help?

Check these files:
- **PROGRESS.md** - Detailed technical progress
- **SUMMARY_FOR_MANISH.md** - Comprehensive explanation
- **CONSTRAINTS.md** - All constraint details

---

**Status:** 🟢 Ready to test with real database!  
**Next:** Run `node test-real-db.js` and see the magic! ✨
