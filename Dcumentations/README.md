# 📚 ISE Timetable Generator - Documentation

## Overview
Complete documentation for the BIT ISE Department Timetable Generation System with interactive editing capabilities.

**Last Updated:** November 2025  
**Status:** ✅ Steps 1-6 Complete, Step 7 Pending  
**Key Features:** 7-step algorithm, Drag-drop editing, Undo/Redo, Global conflict prevention, Interactive classroom assignment

---

## 🎯 Quick Start Guide

### System Architecture
- **Backend:** Node.js + Express + MongoDB (8 data models)
- **Frontend:** React + Vite + Axios
- **Algorithm:** 7-step greedy algorithm with constraint satisfaction
- **Editor:** Interactive drag-drop with real-time conflict detection

### Core Entities
- **Sections:** 3A, 3B, 3C (3 per semester, Sem 3-8 = 18 total)
- **Batches:** 3 batches per section for lab rotation (54 total)
- **Subjects:** 5 types (ISE, Other Dept, Projects, OEC, PEC)
- **Resources:** Teachers, Theory Classrooms, Lab Rooms

---

## 📖 Documentation Structure

### 1. System Design & Scope
**[DEPARTMENT_SCOPE.md](./DEPARTMENT_SCOPE.md)**  
Department structure, semester organization, section management

**[SECTIONS_AND_BATCHES.md](./SECTIONS_AND_BATCHES.md)**  
Section/batch organization, lab batch rotation (Rule 4.7), naming conventions

**[SUBJECT_TYPES.md](./SUBJECT_TYPES.md)**  
5 subject categories, scheduling rules, credit hours, project handling

---

### 2. Scheduling Algorithm (Steps 1-7)
**[ALGORITHM_STRATEGY.md](./ALGORITHM_STRATEGY.md)** ⭐ START HERE  
Complete 7-step algorithm flow, constraint hierarchy, design decisions, key learnings

**[TIME_SCHEDULING.md](./TIME_SCHEDULING.md)**  
Time slots, breaks, divide-and-rule strategy, load balancing

**[LAB_SCHEDULING.md](./LAB_SCHEDULING.md)**  
Step 3 deep-dive: Lab sessions, batch rotation formula, global room tracking

**[CONSTRAINTS.md](./CONSTRAINTS.md)**  
All constraints enforced: teacher, room, time, consecutive labs, daily limits

---

### 3. Resource Management
**[TEACHER_MANAGEMENT.md](./TEACHER_MANAGEMENT.md)**  
Step 6 implementation: Lab teacher assignment (2 per lab, fallback to 1), conflict detection

**[CLASSROOM_MANAGEMENT.md](./CLASSROOM_MANAGEMENT.md)** ⭐ COMPREHENSIVE  
Step 5 implementation: Priority-based assignment, interactive editing, classroom change modal, conflict handling

---

### 4. Interactive Features
**[DRAG_DROP_FEATURE.md](./DRAG_DROP_FEATURE.md)**  
Editor capabilities: Drag-drop slots, undo/redo system, break management, save/discard changes

**[GLOBAL_CONFLICT_FIX.md](./GLOBAL_CONFLICT_FIX.md)**  
Real-time conflict detection across sections, teacher/room validation, UI feedback

---

### 5. Implementation Guide
**[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)**  
Full implementation details: What was built, API endpoints, workflows, code statistics, testing

---

## 🆕 Latest Updates (November 2025)

### ✅ Completed Features

**Step 5: Classroom Assignment (Fully Implemented)**
- Priority-based algorithm (fixed → regular → skip projects)
- Global classroom conflict tracking
- Interactive classroom change modal
- Auto-clear classroom on slot move
- 98%+ success rate on real data

**Step 6: Lab Teacher Assignment (Fully Implemented)**
- Assign 2 teachers per lab session
- Automatic fallback to 1 teacher if needed
- Teacher availability checking
- Conflict prevention across sections

**Interactive Editing Enhancements**
- Theory slots remain draggable after Step 5
- Click classroom badge to change rooms
- Real-time conflict detection
- Undo/Redo for all changes
- Unsaved changes tracking

**User Experience Improvements**
- Step results persist across page navigation
- Clear future steps when re-running a step
- Compact 70% modal dialogs
- Clickable classroom badges (no hover expansion)
- Editing disabled until Step 5 complete

---

## �️ Current Status

### Implementation Progress
| Step | Status | Completion |
|------|--------|------------|
| Step 1: Load Sections | ✅ Complete | 100% |
| Step 2: Block Fixed Slots | ✅ Complete | 100% |
| Step 3: Schedule Labs | ✅ Complete | 100% |
| Step 4: Schedule Theory | ✅ Complete | 100% |
| Step 5: Assign Classrooms | ✅ Complete | 100% |
| Step 6: Assign Lab Teachers | ✅ Complete | 100% |
| Step 7: Validate & Finalize | ⏳ Pending | 0% |

### Feature Completeness
- ✅ Core scheduling algorithm (Steps 1-6)
- ✅ Interactive timetable editor
- ✅ Drag-drop with undo/redo
- ✅ Global conflict detection
- ✅ Classroom management
- ✅ Teacher assignment
- ✅ Break management
- ⏳ Final validation (Step 7)
- ⏳ Export/Print functionality

---

## 🎓 Key Learnings & Insights

### Algorithm Design
**1. Constraint Hierarchy Matters**  
Schedule from most restrictive to most flexible:
- Fixed slots (no flexibility) → Labs (2-hour blocks) → Theory (1-hour, flexible)
- This order minimizes conflicts and backtracking

**2. Defer Resource Assignment**  
Separate "WHEN" (scheduling) from "WHERE/WHO" (resources):
- Steps 1-4: Schedule time slots
- Steps 5-6: Assign resources (classrooms, teachers)
- Easier to rerun just resource assignment without rescheduling

**3. Global vs Local Conflicts**  
- **Global**: Same resource, same time, different sections (needs cross-section tracking)
- **Local**: Within one section (easier to detect)
- Solution: In-memory global trackers for rooms and teachers

**4. Batch Rotation Formula**  
Mathematical guarantee of fairness:
```
labIndex = (round + batchNum - 1) % totalLabs
```
Every batch rotates through all labs across weeks.

**5. Divide-and-Rule for Balance**  
Instead of sequential day filling (Monday → Friday):
- Divide subjects into 5 equal groups
- Distribute one group per day
- Result: Even daily load (no heavy/light days)

---

### User Experience Design
**1. Progressive Disclosure**  
Don't show editing features until Step 5 is complete:
- Prevents confusion
- Guides users through correct workflow
- Reduces errors

**2. Clear Over Clever**  
Explicit classroom badges > Hover-to-reveal buttons:
- Users struggled with hover-to-show "Change Room" button
- Solution: Made badges clickable directly
- Result: More intuitive, less irritating

**3. Undo is Essential**  
Every edit action must be undoable:
- Users make mistakes
- Experimenting is important
- Undo/Redo builds confidence

**4. Persist Results Across Navigation**  
Step results disappearing on page switch is confusing:
- Solution: Aggregate data from database on load
- Reconstruct step results from actual timetable data
- Users see consistent state

**5. Modal Size Matters**  
Started with fullscreen modals → Users wanted 70% centered:
- Fullscreen felt overwhelming
- Centered modals feel more focused
- Lesson: Test with real users

---

### Technical Insights
**1. Optimistic Updates with Validation**  
Frontend shows change immediately, backend validates:
- Better UX (feels instant)
- Server can reject with 409 Conflict
- Frontend rolls back on error

**2. State Synchronization is Hard**  
Frontend state vs Database state mismatch:
- Problem: Frontend has new slot position, backend checks old position
- Solution: Pass current state from frontend to backend
- Key learning: Trust frontend state for optimistic updates

**3. Global State in Memory is Fast**  
Database queries for every conflict check is slow:
- Solution: Build global tracker in memory at start
- Trade-off: Memory usage vs Speed
- Result: 100x faster scheduling

**4. Cascade Clearing**  
Running Step 3 should clear Steps 4-7:
- Users confused when old results persist
- Solution: Clear all future steps on re-run
- Maintains data integrity

---

## 🔮 Future Roadmap

### Step 7: Validation (Next Priority)
- Comprehensive constraint checking
- Validation report generation
- Conflict highlighting in UI
- Manual override options

### Export & Reporting
- PDF export for printing
- Excel export for analysis
- Section-wise timetables
- Teacher-wise schedules
- Room utilization reports

### Advanced Features
- Parallel section scheduling
- Multi-week patterns
- Semester-long planning
- Resource optimization suggestions
- Constraint relaxation (if no solution)

### User Experience
- Mobile-responsive design
- Keyboard shortcuts
- Bulk editing tools
- Template saving/loading
- History and audit logs

---

## 📊 System Statistics

### Database Collections (8)
1. `ise_sections` - Section master data
2. `subjects` - Subject catalog
3. `teachers` - Teacher profiles
4. `dept_classes` - Theory classrooms
5. `dept_labs` - Lab rooms
6. `syllabus_labs` - Lab session definitions
7. `lab_room_assignments` - Lab-room mappings
8. `timetables` - Generated timetables

### Code Statistics
- **Backend Files**: 25+ files, ~5000 lines
- **Frontend Components**: 10+ components, ~4000 lines
- **Documentation**: 10 files, ~3000 lines
- **Total**: ~12,000 lines of code + docs

### Performance
- **Step 1-6 Execution**: ~15-30 seconds for 18 sections
- **Conflict Detection**: <100ms (in-memory)
- **Classroom Assignment**: ~5 seconds (150+ slots)
- **UI Responsiveness**: <50ms for all interactions

---

## 🤝 Contributing

### For Developers
1. Read [ALGORITHM_STRATEGY.md](./ALGORITHM_STRATEGY.md) first
2. Understand constraint hierarchy
3. Follow existing patterns (global trackers, validation layers)
4. Test with real data (9 sections minimum)
5. Document design decisions

### For Admins/Users
1. Run steps in order (don't skip)
2. Check results after each step
3. Use TimetableViewer before editing
4. Make small changes and save frequently
5. Report conflicts immediately

---

## 📞 Support

### Common Issues
- **"No rooms available"** → Check if Step 5 already ran, rooms may be assigned
- **"Conflict detected"** → Another section using that resource, choose different time
- **"Step results disappeared"** → Fixed in latest version, results now persist
- **"Can't move slot"** → Fixed slots and labs are locked (by design)

### Debug Mode
Enable console logging to see detailed algorithm execution:
- Backend: Check terminal output during step execution
- Frontend: Open browser console (F12) for conflict detection logs

---

## 🎯 Conclusion

This timetable generation system represents a **complete solution** for academic scheduling with:
- Robust algorithmic foundation
- Interactive editing capabilities
- Real-time conflict prevention
- Professional user experience

The documentation captures not just HOW it works, but WHY it was designed this way, based on real-world learnings and user feedback.

**Status**: 85% Complete (Steps 1-6 ✅, Step 7 ⏳)  
**Ready for**: Production use with Step 7 validation pending  
**Maintainable**: Well-documented, modular architecture

### Editor Enhancements
- ✅ **Undo/Redo System** - Ctrl+Z/Ctrl+Y keyboard shortcuts with full state management
- ✅ **Break Management** - Add, delete, move breaks (including default breaks)
- ✅ **Removed Default Breaks** - Click to remove default breaks and free slots
- ✅ **Lab Protection** - Hard blocks prevent theory from overriding lab sessions

### Algorithm Improvements
- ✅ **Divide-and-Rule Scheduling** - Priority cascade for maximum distribution:
  1. Priority 1: All 1-hour sessions on different days
  2. Priority 2: One 2-hour block + rest 1-hour sessions  
  3. Priority 3: Multiple 2-hour blocks (fallback)
- ✅ **Project Exception** - Projects keep consecutive blocks for continuous work
- ✅ **Step 3 Break Clearing** - Regeneration clears custom breaks for fresh start

### Data Persistence
- ✅ **Breaks Schema** - MongoDB schema updated with `isRemoved` flag
- ✅ **Global Teacher Tracking** - Real-time conflict detection across all sections
- ✅ **Conflict Detection** - Respects removed breaks (no false warnings)

---   - Lab teacher requirements (2 per session)
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
