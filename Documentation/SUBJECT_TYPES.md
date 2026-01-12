# 📚 Subject Types & Categories

## Overview
Subjects are categorized into 5 types based on teaching and scheduling requirements. Each type has different rules for teacher assignment, classroom allocation, and time slot management.

---

## Summary Table

| Subject Type | ISE Teacher? | Classroom? | Time Slot? | Workload Count? | Fixed Slot? | `requires_teacher_assignment` |
|--------------|-------------|------------|------------|-----------------|-------------|------------------------------|
| **Regular Theory** | ✅ Yes | ✅ Yes | ✅ Yes (flexible) | ✅ Yes | ❌ No | ✅ `true` |
| **Other Dept** | ❌ No | ✅ Yes (reserved) | ✅ Yes (flexible) | ❌ No | ❌ No | ❌ `false` |
| **Project** | ❌ No | ❌ No | ✅ Yes (flexible) | ❌ No | ❌ No | ❌ `false` |
| **OEC (Sem 7)** | ❌ No | ✅ Yes (reserved) | ✅ Yes (FIXED) | ❌ No | ✅ Yes | ❌ `false` |
| **PEC (Sem 7)** | ✅ Yes | ✅ Yes | ✅ Yes (FIXED) | ✅ Yes | ✅ Yes | ✅ `true` |

**Note on Step 7 Validation:** The `requires_teacher_assignment` flag is used during Step 7 validation to determine which subjects should be checked for teacher assignment completeness. Only subjects with `requires_teacher_assignment = true` are validated. This prevents false positives for subjects like Math, OEC, and Projects that don't need ISE teacher assignment.

---

## 1. Regular Theory Subjects

### Definition
Core ISE curriculum subjects taught by ISE department faculty.

### Examples
- Data Structures
- DBMS
- AI
- Computer Networks
- Operating Systems

### Scheduling Requirements
✅ Requires ISE teacher assignment  
✅ Requires classroom assignment (ISE department rooms)  
✅ Requires time slot allocation  
✅ Teacher workload counted

### Characteristics
- Full ISE department control
- Flexible scheduling (algorithm decides timing)
- Subject to `hrs_per_week` and `max_hrs_per_day` constraints

---

## 2. Other Department Subjects

### Definition
Subjects taught by other departments (Math, Physics, Management, etc.) but attended by ISE students.

### Examples
- Mathematics-III
- Engineering Physics
- Business Management
- Technical Writing

### Scheduling Requirements
❌ NO ISE teacher assignment (other dept handles teacher)  
✅ Requires classroom assignment (ISE dept reserves own classroom)  
✅ Requires time slot allocation (ISE timetable reserves slot)  
❌ NOT counted in ISE teacher workload

### Reason for Classification
ISE students need the time slot and classroom reserved, but teaching is handled externally by the offering department.

### Display
- Subject: Math-III
- Teacher: [Other Dept]
- Room: ISE-601
- Time: Monday 10-12 AM

---

## 3. Project Subjects

### Definition
Self-directed student work with periodic reviews (no continuous teaching).

### Examples
- Minor Project
- Major Project
- Internship

### Scheduling Requirements
❌ NO teacher assignment (students work independently)  
❌ NO classroom assignment (flexible - labs, library, groups)  
✅ Requires time slot allocation (for periodic reviews/meetings)  
❌ NOT counted in teacher workload

### Reason for Classification
Projects require time allocation but not fixed teaching resources. Students use this time for independent work and periodic faculty guidance.

### Display
- Subject: Major Project
- Time: Monday 1:30-3:30 PM
- Location: Flexible (no fixed room)
- Teacher: N/A

---

## 4. Open Elective Courses (OEC)

### Definition
College-wide electives offered to students from ALL departments, taught by offering department (may or may not be ISE).

### Examples
- Machine Learning (offered by CSE)
- IoT (offered by ECE)
- Blockchain (offered by ISE)

### Applicable To
**Semester 7 students only**

### Scheduling Requirements
❌ NO ISE teacher assignment (offering dept handles teacher)  
✅ Requires classroom assignment (ISE dept reserves own classroom)  
✅ Requires FIXED time slot (pre-decided, given as input)  
❌ NOT counted in ISE teacher workload

### Key Constraint - FIXED Time Slots

**Rule:** OEC time slots are FIXED college-wide before timetable generation.

**Reason:** Students from different branches must attend at the same time.

**Example:**
- OEC: Machine Learning
- Fixed Time: Friday 1:30-3:30 PM (college-decided)
- All sections (7A, 7B, 7C) choosing ML attend at THIS exact time

**Algorithm Behavior:**
- BLOCKS the fixed time slot for the section
- Assigns ISE classroom (e.g., ISE-LH1)
- Does NOT assign ISE teacher (offering dept handles)

### Batch Handling
All batches of section stay together (batch synchronization maintained).

---

## 5. Professional Elective Courses (PEC)

### Definition
ISE-specific electives where students choose from 2-3 options within ISE curriculum.

### Examples
**Options for Semester 7:**
- Option A: Advanced AI
- Option B: Cloud Computing
- Option C: Cyber Security

### Applicable To
**Semester 7 students only**

### Scheduling Requirements
✅ Requires ISE teacher assignment (ISE faculty teaches)  
✅ Requires classroom assignment (ISE department rooms)  
✅ Requires FIXED time slot (pre-decided, given as input)  
✅ Counted in ISE teacher workload

### Key Constraint - FIXED Parallel Slots

**Rule:** All PEC options run in PARALLEL at the SAME time in DIFFERENT rooms.

**Reason:** Students choose one option and cannot be in two places.

**Example:**
- PEC Slot: Monday 10:30-12:30 (fixed for all options)
- Section 7A students divided:
  - 20 students choose Advanced AI → Room ISE-601, Teacher Dr. A
  - 25 students choose Cloud Computing → Room ISE-602, Teacher Dr. B
  - 15 students choose Cyber Security → Room ISE-603, Teacher Dr. C

**Algorithm Behavior:**
- BLOCKS Monday 10:30-12:30 for Section 7A
- Assigns 3 separate classrooms
- Assigns 3 different ISE teachers
- Students attend based on their individual choice

### Batch Handling
All batches of section stay together (batch synchronization maintained). Choice is individual, not batch-based.

---

## 6. Theory Subject Scheduling Rules

### Flexible Scheduling Fields
All theory subjects (Regular, Other Dept, Projects) have:
- `hrs_per_week`: Total weekly hours (e.g., 3, 4, 5)
- `max_hrs_per_day`: Maximum consecutive hours in one day (e.g., 2)

### Scheduling Strategy
**Priority Order:**
1. Regular ISE subjects
2. Other department subjects
3. Project subjects (lowest priority)

**Key Principles:**
- Classes spread randomly across the week
- Consecutive hours allowed if within `max_hrs_per_day`
- Split flexibly: 2+1, 1+1+1, etc. based on availability
- Sort subjects by `hrs_per_week` (descending) for scheduling order

### Example 1: 3 hrs/week, max 2 hrs/day
**Option A:**
- Monday: 9:00-11:00 AM (2 hours consecutive)
- Thursday: 10:00-11:00 AM (1 hour)
- Total: 3 hours across week ✅

**Option B:**
- Monday: 9:00-10:00 AM (1 hour)
- Wednesday: 10:00-11:00 AM (1 hour)
- Friday: 2:00-3:00 PM (1 hour)
- Total: 3 hours, better distribution ✅

### Example 2: 4 hrs/week, max 2 hrs/day
**Option A:**
- Tuesday: 9:00-11:00 AM (2 hours consecutive)
- Friday: 2:00-4:00 PM (2 hours consecutive)
- Total: 4 hours ✅

**Option B:**
- Monday: 9:00-10:00 AM (1 hour)
- Wednesday: 10:00-12:00 PM (2 hours consecutive)
- Friday: 3:00-4:00 PM (1 hour)
- Total: 4 hours, wider spread ✅

### Invalid Examples
❌ Monday: 9:00-1:00 PM (4 hours) - Violates `max_hrs_per_day = 2`  
❌ Week total: 5 hours - Exceeds `hrs_per_week = 4`

---

## 7. Fixed Slot Subjects (OEC & PEC)

### When Fixed Slots Are Defined
**Before timetable generation**, admin provides:
- Subject name
- Fixed day and time
- Applicable sections

### Algorithm Behavior
1. **Blocks the time slot** in Step 2 (before scheduling other subjects)
2. Marks as `is_fixed_slot: true`
3. Ensures no other subject scheduled at that time
4. Step 4 (theory scheduling) **skips** these subjects

### Important Note
Fixed subjects (OEC/PEC) are NOT re-scheduled in Step 4. They are placed in Step 2 and remain untouched.

---

## 8. Batch Synchronization

### Rule (Applies to ALL Subject Types)
When any subject is scheduled (theory or lab), ALL batches of the section must be occupied at that time.

### Why?
Cannot have some batches free while others in class - leads to scheduling chaos.

### How It Works
- **Theory Classes:** All batches attend together in one room
- **Lab Classes:** All batches in different labs simultaneously
- **Fixed Slots:** All batches marked as busy during that time

---

**Last Updated:** January 2025
