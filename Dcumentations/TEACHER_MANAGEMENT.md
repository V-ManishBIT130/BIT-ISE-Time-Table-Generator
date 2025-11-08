# 👨‍🏫 Teacher Management & Assignment

## Overview
This document defines rules for teacher assignment, workload management, and conflict prevention.

---

## 1. Teacher Categories

### ISE Faculty
- Teach Regular ISE subjects
- Teach Professional Electives (PEC)
- Supervise labs (2 teachers per lab session)
- Workload is tracked and counted

### Other Department Faculty
- Teach Other Department subjects
- Handle their own scheduling
- NOT tracked in ISE workload
- Represented as "[Other Dept]" in ISE timetables

---

## 2. Teacher Assignment Rules

### Subjects Requiring ISE Teachers
✅ Regular Theory subjects (`requires_teacher_assignment: true`)  
✅ Professional Electives (PEC) - Semester 7  
✅ Lab sessions (2 teachers per session)

### Subjects NOT Requiring ISE Teachers
❌ Other Department subjects  
❌ Open Electives (OEC) - handled by offering department  
❌ Project subjects (self-directed)

---

## 3. Pre-Assignment System

### Database: Teacher Assignments
Teachers are **pre-assigned** to subjects before timetable generation.

### Assignment Fields
- Teacher ID
- Subject ID
- Semester
- Semester Type (Odd/Even)
- Section (A, B, C, etc.)

### Purpose
- Admin decides WHO teaches WHAT before scheduling
- Algorithm only decides WHEN they teach
- Separates personnel decisions from timetable logic

### Example
**Pre-Assignment:**
- Dr. A → Data Structures → Semester 3, Section A
- Dr. B → DBMS → Semester 3, Section A
- Dr. C → AI → Semester 5, Section A

**Algorithm decides:**
- When does Dr. A teach Data Structures? → Monday 10-12 AM
- When does Dr. B teach DBMS? → Tuesday 9-11 AM
- etc.

---

## 4. Teacher Conflict Prevention (CRITICAL!)

### Rule
A teacher cannot be assigned to multiple sections/classes at the same time.

### Global Teacher Tracking
System maintains a global teacher schedule across ALL sections.

### Conflict Check Process
Before assigning teacher to time slot:
1. Check if teacher is busy at that time in ANY section
2. If busy → Skip this time slot, try next
3. If free → Assign teacher, mark as busy

### Example
**Dr. DC's Schedule:**
- Monday 10-12 AM: Teaching Data Structures in Section 3A

**Algorithm tries to schedule:**
- Monday 10-12 AM: AI in Section 5A (needs Dr. DC)

**Result:**
❌ Conflict detected! Dr. DC already teaching 3A  
✅ Algorithm tries different time: Monday 2-4 PM for 5A

---

## 5. Cross-Section Conflict Prevention

### How It Works
Global teacher schedule tracker is shared across ALL sections being generated.

### Example Scenario
**Generating Odd Semester Timetables (9 sections total):**

When scheduling Section 3A:
- Assigns Dr. X to Monday 10:00 AM

When later scheduling Section 5B:
- Tries to assign Dr. X to Monday 10:00 AM
- **BLOCKED** by global tracker
- Must find different time

### Benefits
✅ Zero teacher double-booking  
✅ Realistic timetables  
✅ Prevents scheduling impossibilities  
✅ Automatic conflict resolution

---

## 6. Lab Teacher Assignment

### Rule
Each lab session requires **TWO teachers** for supervision.

### Reason
- 60-90 students doing labs simultaneously (3 batches)
- Need adequate supervision across multiple rooms
- Safety and guidance requirements
- Quality learning experience

### Assignment Timing
Teachers assigned to labs in **Step 5** (after lab slots created).

### Teacher Availability Check
Before assigning lab teachers:
✅ Check both teachers are free at lab time  
✅ Verify no conflicts with theory classes  
✅ Ensure no other lab assignments at same time

---

## 7. Workload Management

### What Counts Toward Workload
✅ Regular ISE theory subjects  
✅ Professional Electives (PEC)  
✅ Lab supervision

### What Does NOT Count
❌ Other Department subjects (not ISE responsibility)  
❌ Open Electives (offered by other dept)  
❌ Project supervision (periodic, not continuous)

### Workload Calculation
- Theory: Hours per week per subject
- Labs: 2 hours per lab session
- Total: Sum of all teaching hours

### Example
**Dr. A's Workload:**
- Data Structures (3A): 4 hrs/week
- DBMS (3B): 3 hrs/week
- DSL Lab (3A): 2 hrs/week
- Total: 9 hrs/week

---

## 8. Teacher Shortforms

### Purpose
Display compact names in timetable UI for better readability.

### Format
Usually initials or abbreviated names.

### Examples
- Dr. Shashikumar S → "SSK"
- Dr. Mercy S → "SM"
- Dr. Dayanand C → "DC"

### Display Priority
System prefers shortforms over full names in timetable grid view.

---

## 9. Teacher Assignment Validation

### Pre-Generation Checks
Before generating timetables, system verifies:
✅ All required subjects have teacher assignments  
✅ Teachers exist in database  
✅ No duplicate assignments (same teacher, same subject, same section)

### Post-Generation Verification
After generating timetables, system checks:
✅ No teacher conflicts across sections  
✅ All theory slots have teachers (where required)  
✅ All lab slots have 2 teachers (assigned in Step 5)

### Error Reporting
If violations found:
- Console logs detailed conflict information
- Shows which teacher, which sections, what time
- Provides actionable debugging info

---

## 10. Manual Editing - Teacher Conflicts

### Global Conflict Detection
When user manually moves a teacher slot in Editor:
1. Frontend calls backend API
2. Backend checks ALL timetables for conflicts
3. Returns conflict details if found
4. User shown warning before proceeding

### Warning Example
```
⚠️ CONFLICT DETECTED:

❌ GLOBAL Teacher Conflict: 
Dr. Mercy S is already teaching "Data Structures" 
in Section 3A at Monday 11:30 AM

Do you want to proceed anyway?
[OK] [Cancel]
```

### User Options
- **OK:** Force the move (creates conflict - user responsibility)
- **Cancel:** Revert the move (maintains conflict-free state)

---

## 11. Teacher Display in Timetable

### Regular ISE Subjects
- Display: Teacher shortform or full name
- Example: "Dr. Shashikumar S" or "SSK"

### Other Department Subjects
- Display: "[Other Dept]"
- No specific teacher name
- Indicates external teaching

### Project Subjects
- Display: "N/A" or blank
- No teacher assigned
- Self-directed work

### Open Electives (OEC)
- Display: "[Other Dept]"
- Teaching handled by offering department

---

## 12. Teacher Data Structure

### Teacher Assignment Schema
- `teacher_id`: Teacher's ObjectId (reference)
- `teacher_name`: Full name (e.g., "Dr. Shashikumar S")
- `teacher_shortform`: Abbreviated name (e.g., "SSK")
- `subject_id`: Subject's ObjectId (reference)
- `sem`: Semester number (3-8)
- `sem_type`: "Odd" or "Even"
- `section`: Section letter ("A", "B", "C")

### Theory Slot Schema
- `teacher_id`: Assigned teacher's ObjectId
- `teacher_name`: Full name
- `teacher_shortform`: Abbreviated name
- `day`: Day of week
- `start_time`: "10:00"
- `end_time`: "11:00"

### Lab Slot - Batch Schema
- `teacher1_id`, `teacher1_name`, `teacher1_shortform`: First supervisor
- `teacher2_id`, `teacher2_name`, `teacher2_shortform`: Second supervisor
- `teacher_status`: "no_teachers", "partial", or "complete"

---

**Last Updated:** January 2025
