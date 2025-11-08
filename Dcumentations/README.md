# 📚 ISE Timetable Generator - Documentation

## Overview
Complete documentation for the ISE Department Timetable Generation System at BIT.

---

## Documentation Files

### Core Constraints
1. **[DEPARTMENT_SCOPE.md](./DEPARTMENT_SCOPE.md)**
   - Department semester responsibility (Semesters 3-8)
   - Odd/Even semester separation
   - Cross-section conflict prevention strategy

2. **[SECTIONS_AND_BATCHES.md](./SECTIONS_AND_BATCHES.md)**
   - Section structure and naming
   - Batch division rules (3 batches per section)
   - Batch synchronization requirements
   - Batch rotation strategy

3. **[SUBJECT_TYPES.md](./SUBJECT_TYPES.md)**
   - 5 subject categories (Regular, Other Dept, Project, OEC, PEC)
   - Scheduling requirements by type
   - Fixed vs flexible time slots
   - Batch handling for each type

### Scheduling Constraints
4. **[LAB_SCHEDULING.md](./LAB_SCHEDULING.md)**
   - Lab duration and structure (2-hour sessions)
   - Batch rotation formula (Rule 4.7)
   - Room equipment compatibility
   - Conflict prevention (global + internal)
   - Daily lab limits (new constraints)
   - Consecutive lab prohibition

5. **[TIME_SCHEDULING.md](./TIME_SCHEDULING.md)**
   - Working hours (8 AM - 5 PM)
   - Standard breaks (11:00-11:30, 1:30-2:00)
   - Time slot durations (theory: 1hr, labs: 2hr)
   - Early start preference (max 3 days at 8 AM)
   - Day length constraints
   - Gap minimization strategy
   - Subject diversity scoring

### Resource Management
6. **[TEACHER_MANAGEMENT.md](./TEACHER_MANAGEMENT.md)**
   - Teacher categories (ISE vs Other Dept)
   - Pre-assignment system
   - Global conflict prevention
   - Lab teacher requirements (2 per session)
   - Workload calculation
   - Display conventions

7. **[CLASSROOM_MANAGEMENT.md](./CLASSROOM_MANAGEMENT.md)**
   - Classroom types (theory vs lab)
   - Assignment timing (Step 6 vs Step 3)
   - Capacity requirements
   - Equipment compatibility
   - Conflict prevention
   - Dynamic room selection

### Algorithm Details
8. **[ALGORITHM_STRATEGY.md](./ALGORITHM_STRATEGY.md)**
   - 7-step generation process
   - Fixed slot blocking (Step 2)
   - Lab scheduling algorithm (Step 3)
   - Theory scheduling algorithm (Step 4)
   - Gap minimization scoring
   - Early start penalties
   - Teacher conflict prevention
   - Data flush strategy
   - Section interleaving optimization

### Feature Documentation
9. **[DRAG_DROP_FEATURE.md](./DRAG_DROP_FEATURE.md)**
   - Manual timetable editor
   - Drag & drop functionality
   - Conflict detection (local + global)
   - Custom breaks management
   - UI/UX workflow
   - Testing checklist

10. **[GLOBAL_CONFLICT_FIX.md](./GLOBAL_CONFLICT_FIX.md)**
    - Cross-section teacher conflict detection
    - Backend API implementation
    - Frontend validation
    - Bug fixes (save function crash)
    - Testing scenarios

11. **[LATE_START_PREFERENCE.md](./LATE_START_PREFERENCE.md)**
    - Early start limit (max 3 days at 8 AM)
    - Day length constraints
    - Penalty system
    - Lab + theory coordination
    - Configuration options
    - Benefits and testing

---

## Quick Start Guide

### For Developers
1. Start with **DEPARTMENT_SCOPE.md** - Understand what the system manages
2. Read **SECTIONS_AND_BATCHES.md** - Learn organizational structure
3. Review **SUBJECT_TYPES.md** - Know the 5 subject categories
4. Study **ALGORITHM_STRATEGY.md** - See how it all comes together

### For Users
1. Check **DRAG_DROP_FEATURE.md** - Learn manual editing
2. Review **LATE_START_PREFERENCE.md** - Understand scheduling preferences
3. See **GLOBAL_CONFLICT_FIX.md** - Know how conflicts are detected

### For Testing
1. **LAB_SCHEDULING.md** - Lab-specific test cases
2. **TIME_SCHEDULING.md** - Time constraint validation
3. **TEACHER_MANAGEMENT.md** - Teacher conflict testing
4. **CLASSROOM_MANAGEMENT.md** - Room assignment testing

---

## System Architecture

### Database Models
- `ise_sections_model.js` - Section definitions
- `subjects_model.js` - Subject details and categories
- `syllabus_labs_model.js` - Lab definitions
- `teachers_models.js` - Teacher information
- `pre_assign_teacher_model.js` - Teacher-subject assignments
- `dept_labs_model.js` - Lab rooms and equipment
- `timetable_model.js` - Generated timetables

### Algorithm Files
- `step1_load_sections.js` - Initialize timetables
- `step2_fixed_slots.js` - Block OEC/PEC slots
- `step3_schedule_labs_v2.js` - Lab scheduling with dynamic rooms
- `step4_schedule_theory_breaks.js` - Theory scheduling with gap minimization
- `step5_assign_teachers.js` - Lab teacher assignment
- `step6_validate.js` - Classroom assignment and validation
- `timetable_generator.js` - Main orchestrator

### Frontend Components
- `TimetableGenerator.jsx` - Generation UI
- `TimetableViewer.jsx` - View timetables (read-only)
- `TimetableEditor.jsx` - Edit timetables (drag-drop)
- `Dashboard.jsx` - Main navigation
- `Teachers.jsx`, `Subjects.jsx`, `Labs.jsx`, etc. - Master data management

---

## Key Concepts

### Global Conflict Prevention
All resource assignments (teachers, rooms, classrooms) check across **ALL sections** being generated, not just the current section. This ensures no teacher or room is double-booked.

### Batch Synchronization
All 3 batches of a section must be busy at the same time. Cannot have some batches free while others in class.

### Fixed vs Flexible Slots
- **Fixed (OEC/PEC):** Time decided before generation, cannot change
- **Flexible (Regular/Other Dept):** Algorithm decides timing

### Subject Diversity
Algorithm prevents scheduling the same subject multiple times on the same day to provide variety for students.

### Gap Minimization
Algorithm prefers filling empty time slots between existing classes rather than creating isolated slots.

---

## Important Rules

### Rule 4.7 (Batch Rotation)
`labIndex = (round + batchNum - 1) % totalLabs`

Ensures every batch experiences every lab through systematic rotation.

### Early Start Limit
Maximum **3 days per week** can start at 8:00 AM (includes both theory and lab).

### Day Length Constraints
- 8 AM start days → End by 4 PM
- Later start days → Can end at 5 PM

### Daily Lab Limits
- **3+ labs per semester:** Max 2 labs per day
- **Exactly 2 labs per semester:** Must be on different days

---

## Version History

- **v3.0 (Current)** - Dynamic room assignment, daily lab limits, global conflict detection
- **v2.0** - Gap minimization, late start preference, day length constraints
- **v1.0** - Initial timetable generation with basic constraints

---

## Support

For questions or issues, contact the ISE Department or refer to specific documentation files for detailed explanations.

**Last Updated:** January 2025
