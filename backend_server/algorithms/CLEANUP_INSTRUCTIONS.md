# Algorithm Files Cleanup Instructions

## ✅ CORRECT FILES (Keep These)

1. `step1_load_sections.js` - Load sections and initialize
2. `step2_fixed_slots.js` - Block fixed OEC/PEC slots (NO classroom assignment)
3. `step3_schedule_labs_v2.js` - Schedule labs with batches
4. `step4_schedule_theory_breaks.js` - Schedule theory and breaks (NO classroom assignment)
5. `step5_assign_classrooms.js` - Assign classrooms to theory slots (ONLY step that assigns classrooms)
6. `step6_assign_teachers.js` - Assign teachers to lab slots (2 per lab, fall back to 1)
7. `step7_validate.js` - Validate and finalize
8. `timetable_generator.js` - Main orchestrator

## ❌ DELETED FILES (Cleanup Complete - Dec 30, 2025)

1. **`step5_assign_teachers.js`** - ✅ DELETED
   - This was the old Step 5 file
   - Now Step 6 logic is in `step6_assign_teachers.js`
   - Deleted on Dec 30, 2025

2. **`step6_assign_classrooms.js`** - DUPLICATE
   - This is a duplicate of `step5_assign_classrooms.js`
   - Never used in routes
   - Can be safely deleted

3. **`step6_validate.js`** - OLD VERSION
   - Old validation logic
   - Replaced by `step7_validate.js`
   - Can be safely deleted

## How to Delete (PowerShell)

```powershell
cd "C:\Users\V Manish\Desktop\BIT-ISE-Time-Table-Generator\backend_server\algorithms"
Remove-Item step5_assign_teachers.js
Remove-Item step6_assign_classrooms.js
Remove-Item step6_validate.js
```

## Verification

After deletion, you should have exactly 8 files in the algorithms folder:
- step1_load_sections.js
- step2_fixed_slots.js
- step3_schedule_labs_v2.js
- step4_schedule_theory_breaks.js
- step5_assign_classrooms.js
- step6_assign_teachers.js
- step7_validate.js
- timetable_generator.js

## All References Updated

✅ `routes/timetables.js` - Now imports from correct files
✅ `algorithms/timetable_generator.js` - Now imports from correct files
✅ All step numbers match their actual sequence
