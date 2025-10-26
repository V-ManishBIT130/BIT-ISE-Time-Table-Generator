# 📋 ISE Department Timetable Constraints

This document outlines all the constraints and rules for generating timetables for the Information Science and Engineering (ISE) department at BIT.

---

## 🎓 **1. DEPARTMENT SCOPE CONSTRAINTS**

### 1.1 Semester Responsibility
**Rule:** ISE department manages only semesters 3-8 (3rd to 8th semester students).

**Reason:** First two semesters (1st & 2nd) are handled by a common department across all branches.

**Example:**
```
✅ Valid: Semester 3, 4, 5, 6, 7, 8
❌ Invalid: Semester 1, 2
```

**Implementation:**
- `subjects_model.js`: `sem: { min: 3, max: 8 }`
- `syllabus_labs_model.js`: `lab_sem: { min: 3, max: 8 }`
- All timetable generation focuses on these 6 semesters only

---

## 👥 **2. SECTION & BATCH CONSTRAINTS**

### 2.1 Section Structure
**Rule:** Each semester has multiple sections (A, B, C, etc.), each containing a fixed number of students.

**Example:**
```
Semester 3:
├── Section A: 60 students
├── Section B: 55 students
└── Section C: 58 students
```

### 2.2 Batch Division
**Rule:** Each section is divided into exactly 3 batches for lab purposes.

**Reason:** Lab rooms have limited capacity (~30 computers), requiring smaller groups for hands-on work.

**Example:**
```
Section 3A (60 students):
├── Batch 3A1: 20 students
├── Batch 3A2: 20 students
└── Batch 3A3: 20 students
```

**Implementation:**
- `ise_sections_model.js`: `num_batches: { type: Number, default: 3 }`
- Batch names include semester prefix: "3A1", "3A2", "3A3" (not just "A1", "A2", "A3")

### 2.3 Batch Naming Convention
**Rule:** Batch names must include semester number as prefix for global uniqueness.

**Example:**
```
✅ Correct: 3A1, 3A2, 3A3 (Semester 3, Section A, Batches 1-3)
❌ Wrong: A1, A2, A3 (ambiguous - which semester?)
```

**Reason:** Prevents confusion across semesters, enables easier tracking and reporting.

---

## 📚 **3. SUBJECT CONSTRAINTS**

### 3.1 Subject Categories
**Rule:** Subjects are categorized based on teaching requirements:

1. **Theory Subjects (Regular):** Require ISE teacher assignment
2. **Project Subjects:** No teacher assignment, just time allocation
3. **Open Electives:** Non-ISE department subjects, no ISE teacher
4. **Non-ISE Subjects:** Handled by other departments

**Implementation:**
```javascript
subject: {
  requires_teacher_assignment: Boolean,  // Does this need ISE teacher?
  is_project: Boolean                    // Is this a project subject?
}
```

### 3.2 Project Subject Handling
**Rule:** Project subjects (Major Project, Minor Project) require:
- ✅ Time slot allocation (must be in timetable)
- ❌ NO teacher assignment (students work independently)
- ❌ NO classroom assignment (flexible location)

**Example:**
```
Subject: Major Project (BCS801)
├── is_project: true
├── requires_teacher_assignment: false
├── Time Slot: Monday 1:30-3:30 PM ✅
├── Teacher: None ❌
└── Classroom: None ❌
```

**Reason:** Projects are self-directed with periodic reviews, not requiring continuous classroom presence.

### 3.3 Subject Shortforms
**Rule:** Every subject must have a shortform for compact display.

**Example:**
```
Subject: Data Structures
├── Code: BCS301
├── Shortform: DS ✅
└── Display in UI: "DS" instead of "BCS301"
```

**Reason:** Improves readability in compact UIs, easier for users to identify subjects quickly.

---

## 🧪 **4. LAB CONSTRAINTS**

### 4.1 Lab Equipment Requirements
**Rule:** Labs have specific equipment/software requirements that limit which physical rooms can be used.

**Reason:** Not all lab rooms are equipped equally. Some labs need special software, hardware, or tools.

**Real Example from College:**
```
DV Lab (Data Visualization):
├── Requirements: Graphics cards, visualization software
├── Compatible Rooms: 612A, 612B, 612C, 604A ✅
└── Incompatible Rooms: General labs without graphics software ❌

DVP Lab (Data Visualization Project):
├── Requirements: Project tools, collaboration software
├── Compatible Rooms: 612A, 612C, 604A ✅
└── Incompatible Rooms: 612B (lacks project tools) ❌

DSL Lab (Data Structures):
├── Requirements: Basic programming environment
├── Compatible Rooms: ANY general-purpose lab ✅
└── No special equipment needed
```

**Impact on System:**
- Lab room assignment CANNOT be automated
- Admin must manually select rooms in Phase 2
- System must filter available rooms based on lab type

**Implementation:**
- `dept_labs_model.js`: `lab_subjects_handled` array defines which labs a room supports
- UI shows only compatible rooms in dropdown for each lab

### 4.2 Lab Teacher Requirement
**Rule:** Every lab session MUST have exactly 2 teachers supervising.

**Reason:** Safety, supervision quality, and hands-on assistance for students.

**Example:**
```
Lab Session: Data Structures Lab (DSL)
├── Batch 3A1
├── Teacher 1: Prof. Deeksha Chandra (DC) ✅
├── Teacher 2: Prof. Arjun Kumar (AK) ✅
└── Invalid: Only 1 teacher ❌
```

**Implementation:**
- `syllabus_labs_model.js`: `requires_two_teachers: { default: true }`
- `teacher_lab_assign_model.js`: Pre-save validation ensures exactly 2 teachers
- `lab_session_model.js`: Validates 2 teachers per batch in session

### 4.2 Lab Teacher Requirement
**Rule:** Every lab session MUST have exactly 2 teachers supervising.

**Reason:** Safety, supervision quality, and hands-on assistance for students.

**Example:**
```
Lab Session: Data Structures Lab (DSL)
├── Batch 3A1
├── Teacher 1: Prof. Deeksha Chandra (DC) ✅
├── Teacher 2: Prof. Arjun Kumar (AK) ✅
└── Invalid: Only 1 teacher ❌
```

**Implementation:**
- `syllabus_labs_model.js`: `requires_two_teachers: { default: true }`
- `teacher_lab_assign_model.js`: Pre-save validation ensures exactly 2 teachers
- `lab_session_model.js`: Validates 2 teachers per batch in session

### 4.3 Lab Duration
**Rule:** Every lab session is exactly 2 hours (no exceptions).

**Example:**
```
✅ Valid: 8:30 AM - 10:30 AM (2 hours)
✅ Valid: 10:30 AM - 12:30 PM (2 hours)
❌ Invalid: 8:30 AM - 10:00 AM (1.5 hours)
❌ Invalid: 8:30 AM - 11:30 AM (3 hours)
```

**Implementation:**
- `syllabus_labs_model.js`: `duration_hours: { default: 2 }`
- Backend validation checks end_time - start_time = 120 minutes

### 4.4 Lab Subject Support
**Rule:** A physical lab room can support multiple syllabus labs based on equipment/software.

**Example:**
```
Lab Room ISE-301:
├── Equipment: General-purpose computers
├── Can Support:
│   ├── Data Structures Lab (DSL) ✅
│   ├── AI Lab ✅
│   └── Web Development Lab ✅
└── Cannot Support:
    └── Hardware Lab ❌ (requires special equipment)

Lab Room 612A:
├── Equipment: High-end graphics cards, visualization software
├── Can Support:
│   ├── Data Visualization Lab (DV) ✅
│   └── Data Visualization Project (DVP) ✅
└── Cannot Support:
    └── Basic programming labs ❌ (overkill, reserved for special needs)
```

**Implementation:**
- `dept_labs_model.js`: `lab_subjects_handled: [ObjectId]` (array of supported labs)
- UI filters lab rooms based on selected lab subject
- **Important:** Lab room assignment is FIXED in Phase 2, not Phase 3
- **Reason:** Equipment/software constraints require manual room selection

### 4.4 Lab Room Assignment Constraint
**Rule:** Lab rooms must be assigned in Phase 2 (not auto-assigned in Phase 3).

**Reason:** Not all lab rooms can support all labs due to equipment/software requirements.

**Example:**
```
Scenario: Section 5A needs DV Lab (Data Visualization)

Available Rooms for DV:
├── 612A ✅ (has visualization software + graphics card)
├── 612B ✅ (has visualization software)
├── 612C ✅ (has visualization software)
├── 604A ✅ (newly equipped)
└── ISE-301 ❌ (general lab, no graphics software)

Phase 2 Assignment:
├── Batch 5A1 → Teachers: DC+AK → Room: 612A (admin chooses based on equipment)
├── Batch 5A2 → Teachers: Rajeev+Suman → Room: 612B
└── Batch 5A3 → Teachers: Arjun+Priya → Room: 604A

Why Fixed in Phase 2?
1. DV lab requires special graphics software (not in all rooms)
2. Admin knows which rooms have working equipment
3. Some rooms may be under maintenance
4. Can't be auto-assigned - requires human knowledge of equipment status
```

**Another Example:**
```
DVP Lab (Data Visualization Project):
├── Can use: 612A, 612C, 604A ✅
└── Cannot use: 612B ❌ (doesn't have project collaboration tools)

DSL Lab (Data Structures):
├── Can use: ANY general-purpose lab ✅
└── No special equipment needed
```

**Implementation in Workflow:**
```
Phase 2 (LabAssignments.jsx):
└── Admin MUST select:
    ├── 2 Teachers per batch ✅
    └── 1 Lab Room per batch ✅ (FIXED, not optional!)

Phase 3 (Timetable Generation):
└── Algorithm ONLY finds TIME SLOT
    (Teachers + Rooms already decided in Phase 2)
```

### 4.5 Lab Room Assignment Constraint
**Rule:** Lab rooms must be assigned in Phase 2 (not auto-assigned in Phase 3).

**Reason:** Not all lab rooms can support all labs due to equipment/software requirements.

**Example:**
```
Scenario: Section 5A needs DV Lab (Data Visualization)

Available Rooms for DV:
├── 612A ✅ (has visualization software + graphics card)
├── 612B ✅ (has visualization software)
├── 612C ✅ (has visualization software)
├── 604A ✅ (newly equipped)
└── ISE-301 ❌ (general lab, no graphics software)

Phase 2 Assignment:
├── Batch 5A1 → Teachers: DC+AK → Room: 612A (admin chooses based on equipment)
├── Batch 5A2 → Teachers: Rajeev+Suman → Room: 612B
└── Batch 5A3 → Teachers: Arjun+Priya → Room: 604A

Why Fixed in Phase 2?
1. DV lab requires special graphics software (not in all rooms)
2. Admin knows which rooms have working equipment
3. Some rooms may be under maintenance
4. Can't be auto-assigned - requires human knowledge of equipment status
```

**Another Example:**
```
DVP Lab (Data Visualization Project):
├── Can use: 612A, 612C, 604A ✅
└── Cannot use: 612B ❌ (doesn't have project collaboration tools)

DSL Lab (Data Structures):
├── Can use: ANY general-purpose lab ✅
└── No special equipment needed
```

**Implementation in Workflow:**
```
Phase 2 (LabAssignments.jsx):
└── Admin MUST select:
    ├── 2 Teachers per batch ✅
    └── 1 Lab Room per batch ✅ (FIXED, not optional!)

Phase 3 (Timetable Generation):
└── Algorithm ONLY finds TIME SLOT
    (Teachers + Rooms already decided in Phase 2)
```

### 4.6 Lab Shortforms
**Rule:** Every lab must have a shortform for compact display.

**Example:**
```
Lab: Data Structures Lab
├── Code: BCS303LAB
├── Shortform: DSL ✅
└── Display in UI: "DSL" instead of "BCS303LAB"
```

---

## ⏰ **5. SCHEDULING CONSTRAINTS**

### 5.1 Batch Synchronization (CRITICAL!)
**Rule:** All batches of a section MUST be together in time doing SOME activity.

**Valid Scenarios:**

**Scenario A: Theory Class (All Together)**
```
Monday 10:30-12:30 - Section 3A:
All 60 students (3A1 + 3A2 + 3A3) → Data Structures Theory → ISE-LH1 → Prof. DC

✅ All batches physically together in ONE classroom
```

**Scenario B: Same Lab (Parallel Rooms)**
```
Monday 8:30-10:30 - Section 3A:
├── Batch 3A1 → DSL → Room ISE-301 → DC + AK
├── Batch 3A2 → DSL → Room ISE-302 → Rajeev + Suman
└── Batch 3A3 → DSL → Room ISE-303 → Arjun + Priya

✅ All batches doing SAME lab at SAME time in DIFFERENT rooms
```

**Scenario C: Different Labs (Parallel Rooms)** ⭐
```
Monday 8:30-10:30 - Section 3A:
├── Batch 3A1 → DSL → Room ISE-301 → DC + AK
├── Batch 3A2 → DBMS Lab → Room ISE-304 → Rajeev + Suman
└── Batch 3A3 → AI Lab → Room ISE-307 → Arjun + Priya

✅ All batches doing DIFFERENT labs at SAME time in DIFFERENT rooms
```

**Invalid Scenario:**
```
Monday 8:30-10:30 - Section 3A:
├── Batch 3A1 → DSL (lab)
├── Batch 3A2 → FREE TIME ❌
└── Batch 3A3 → Data Structures Theory ❌

❌ WRONG! One batch in lab, one free, one in theory at SAME time
```

**Key Points:**
- ✅ All batches must have **SAME start time** and **SAME end time**
- ✅ Theory: All together in ONE room
- ✅ Labs: All in labs (same OR different labs)
- ❌ Never: One batch busy, another free, another in different activity type

**Implementation:**
- `lab_session_model.js`: Groups all batches under single time slot
- Pre-save validation ensures all batches present
- Unique index: `(section_id, scheduled_day, scheduled_start_time)`

### 5.2 No Excessive Gaps
**Rule:** There should be no gaps longer than 30 minutes between classes.

**Example:**
```
Section 3A Schedule:
├── 8:30-10:30: Data Structures Theory
├── 10:30-11:00: Break (30 min) ✅
├── 11:00-1:00: DBMS Theory
├── 1:00-1:30: Lunch Break (30 min) ✅
└── 1:30-3:30: Lab Session

✅ All gaps ≤ 30 minutes
```

**Invalid:**
```
Section 3A Schedule:
├── 8:30-10:30: Data Structures Theory
├── 10:30-12:00: GAP (90 min) ❌ TOO LONG!
└── 12:00-2:00: DBMS Theory

❌ 90-minute gap violates constraint
```

**Reason:** Maintains student engagement, efficient use of time, prevents idle periods.

### 5.3 Weekly Schedule Pattern
**Rule:** Classes run Monday through Friday only (no weekends).

**Working Days:** Monday, Tuesday, Wednesday, Thursday, Friday
**Non-Working Days:** Saturday, Sunday

**Implementation:**
- `lab_session_model.js`: `scheduled_day: { enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }`

---

## 👨‍🏫 **6. TEACHER CONSTRAINTS**

### 6.1 Teacher Capability Declaration
**Rule:** Teachers must declare which subjects and labs they CAN handle (Phase 1: Master Data).

**Example:**
```
Teacher: Prof. Deeksha Chandra (DC)
├── Can Teach Subjects:
│   ├── Data Structures (DS) ✅
│   ├── DBMS ✅
│   └── AI ✅
├── Can Handle Labs:
│   ├── Data Structures Lab (DSL) ✅
│   └── AI Lab ✅
└── Cannot Teach: Web Development ❌
```

**Implementation:**
- `teachers_models.js`: `canTeach_subjects: [ObjectId]`, `labs_handled: [ObjectId]`
- UI filters subjects/labs based on teacher capabilities

### 6.2 Teacher Assignment vs Capability
**Rule:** Teacher capability (Phase 1) ≠ Teacher assignment (Phase 2)

**Phase 1: Capability Declaration (One-Time Setup)**
```
Prof. DC CAN teach: DS, DBMS, AI
(Just indicating capability, not assigning specific sections)
```

**Phase 2: Actual Assignment (Per Semester)**
```
Prof. DC WILL teach this semester:
├── Data Structures → Section 3A ✅
├── DBMS → Section 3B ✅
└── AI → Not assigned this semester
```

**Reason:** Separates capability management from workload assignment, allows flexibility in scheduling.

### 6.3 Teacher Shortforms
**Rule:** Every teacher must have a shortform for compact display.

**Example:**
```
Teacher: Prof. Deeksha Chandra
├── Shortform: DC ✅
├── Display: "Prof. Deeksha Chandra (DC)"
└── Max Length: 5 characters
```

**Implementation:**
- `teachers_models.js`: `teacher_shortform: { type: String, maxlength: 5 }`
- UI input: Auto-uppercase, max 5 characters

### 6.4 No Teacher Conflicts
**Rule:** A teacher cannot be assigned to multiple classes at the same time.

**Example:**
```
Monday 8:30-10:30:
├── Section 3A: Data Structures → Prof. DC ✅
└── Section 3B: DBMS → Prof. DC ❌ (CONFLICT!)

❌ Prof. DC cannot teach two classes simultaneously
```

**Implementation:** Phase 3 algorithm must check teacher availability before scheduling.

---

## 🏫 **7. CLASSROOM CONSTRAINTS**

### 7.1 Theory Classroom Types
**Rule:** Theory classrooms are categorized by capacity and equipment.

**Example:**
```
Classroom: ISE-LH1 (Large Lecture Hall)
├── Capacity: 120 students (optional info)
├── Equipment: Projector, Audio System
└── Suitable for: Large sections

Classroom: ISE-601 (Regular Classroom)
├── Capacity: 60 students (optional info)
├── Equipment: Whiteboard
└── Suitable for: Standard sections
```

**Note:** Capacity is stored for informational purposes only, not used for validation or constraints.

### 7.2 Project Subjects - No Classroom
**Rule:** Project subjects do NOT require classroom assignment.

**Example:**
```
Subject: Major Project
├── Time Slot: Monday 1:30-3:30 ✅ (allocated)
├── Teacher: None ✅
└── Classroom: None ✅ (students work in labs/library/groups)
```

**Reason:** Project work is flexible, doesn't need fixed classroom space.

### 7.3 Classroom Auto-Uppercase
**Rule:** All classroom/lab room numbers must be stored in uppercase.

**Example:**
```
Input: "ise-lh1", "612a"
Stored: "ISE-LH1", "612A" ✅
```

**Implementation:** Frontend auto-converts input to uppercase before submission.

---

## 🔄 **8. ASSIGNMENT CONSTRAINTS**

### 8.1 Unique Assignment per Subject per Section
**Rule:** Each subject in a section can have only ONE teacher assigned.

**Example:**
```
✅ Valid:
Subject: Data Structures
Section: 3A
Teacher: Prof. DC

❌ Invalid:
Subject: Data Structures
Section: 3A
Teachers: Prof. DC AND Prof. AK (Cannot have 2 teachers for same subject-section)
```

**Implementation:**
- `pre_assign_teacher_model.js`: Unique index on `(subject_id, sem, sem_type, section)`

### 8.2 Unique Assignment per Lab per Batch
**Rule:** Each lab for a specific batch can have only ONE teacher pair AND one lab room assigned.

**Example:**
```
✅ Valid:
Lab: DSL
Batch: 3A1
Teachers: DC + AK
Lab Room: ISE-301

❌ Invalid:
Lab: DSL
Batch: 3A1
Multiple Assignments:
├── Teachers: DC + AK, Room: ISE-301
└── Teachers: Rajeev + Suman, Room: ISE-302 (Duplicate!)
```

**Implementation:**
- `teacher_lab_assign_model.js`: Unique index on `(lab_id, sem, sem_type, section, batch_number)`
- Includes `assigned_lab_room` field (required in Phase 2)

### 8.3 Teacher Eligibility Check
**Rule:** Before assignment, verify teacher has declared capability for that subject/lab.

**Example:**
```
Assignment Request:
├── Subject: Web Development
├── Section: 3A
└── Teacher: Prof. DC

Check:
├── Does DC's canTeach_subjects include "Web Development"?
└── If NO → ❌ Reject assignment
    If YES → ✅ Allow assignment
```

**Implementation:** Backend validation in POST `/api/lab-assignments` and `/api/teacher-assignments`

---

## 📊 **9. DATA INTEGRITY CONSTRAINTS**

### 9.1 Semester Type Matching
**Rule:** Subjects/Labs must match the semester's odd/even type.

**Example:**
```
Semester 3 (Odd):
✅ Can have: Subjects with sem_type = "odd"
❌ Cannot have: Subjects with sem_type = "even"

Semester 4 (Even):
✅ Can have: Subjects with sem_type = "even"
❌ Cannot have: Subjects with sem_type = "odd"
```

**Implementation:** UI filters subjects/labs based on section's `sem_type`

### 9.2 Atomic Lab Sessions
**Rule:** Lab sessions must be saved atomically (all batches together or none).

**Reason:** Enforces "batches together in time" constraint at database level.

**Implementation:**
- `lab_session_model.js`: Single document contains ALL batch assignments
- Pre-save hook validates all batches present
- Cannot save partial sessions

### 9.3 No Orphaned Assignments
**Rule:** Assignments cannot exist without valid references to teachers, subjects, sections.

**Implementation:**
- MongoDB ObjectId references with foreign key constraints
- `ref: 'Teacher'`, `ref: 'Subjects'`, `ref: 'ISE_Sections'`
- Backend validation checks existence before creating assignments

---

## 🎯 **10. BUSINESS LOGIC CONSTRAINTS**

### 10.1 Three-Phase Workflow
**Rule:** Timetable generation follows strict phase sequence.

**Phase 1: Master Data (One-Time Setup)**
```
Input:
├── Teachers (with capabilities)
├── Subjects (with categorization)
├── Labs (with requirements)
├── Sections (with batches)
├── Classrooms (theory rooms)
└── Dept Labs (lab rooms)
```

**Phase 2: Assignments (Per Semester)**
```
Input:
├── Teacher-Subject Assignments (which teacher teaches which subject to which section)
└── Teacher-Lab Assignments (which teachers + which lab room for which batch)
    └── Includes lab room selection (FIXED due to equipment constraints)

Output: Complete assignment data (teachers + rooms, NO time slots yet)

Example:
Section 5A, DV Lab:
├── Batch 5A1: Teachers DC+AK → Room 612A ✅
├── Batch 5A2: Teachers Rajeev+Suman → Room 612B ✅
└── Batch 5A3: Teachers Arjun+Priya → Room 604A ✅

Status: Teachers + Rooms FIXED, Time slots pending
```

**Phase 3: Timetable Generation (Automated)**
```
Input: Phase 2 assignments (teachers + rooms already decided)
Algorithm: Constraint satisfaction, finds optimal TIME SLOTS only
Output: Complete timetable with time slots

Example:
Monday 8:30-10:30 - Section 5A:
├── Batch 5A1 → DV → DC+AK → Room 612A (from Phase 2)
├── Batch 5A2 → DV → Rajeev+Suman → Room 612B (from Phase 2)
└── Batch 5A3 → DV → Arjun+Priya → Room 604A (from Phase 2)

Algorithm only found: "Monday 8:30-10:30"
Everything else was decided in Phase 2
```

**Rule:** Cannot skip phases. Phase 2 needs Phase 1 data. Phase 3 needs Phase 2 data.

### 10.2 Subject Filtering by Assignment Requirement
**Rule:** Teachers should only see subjects that require ISE teacher assignment.

**Hidden from Teachers:**
- Project subjects (is_project = true)
- Open electives (requires_teacher_assignment = false)
- Non-ISE subjects (requires_teacher_assignment = false)

**Shown to Teachers:**
- Regular theory subjects (requires_teacher_assignment = true)

**Implementation:**
```javascript
const filteredSubjects = subjects.filter(subject => 
  subject.requires_teacher_assignment === true
)
```

### 10.3 Elective Constraint (Future)
**Rule:** Open electives have fixed schedules across all sections.

**Example:**
```
Open Elective: Machine Learning
├── Time: Fixed by college (e.g., Friday 1:30-3:30 PM)
├── All sections choosing this elective: Must attend at same time
└── Teacher: From another department (not ISE)
```

**Note:** Not yet implemented, planned for Phase 3.

---

## 🔍 **11. UI/UX CONSTRAINTS**

### 11.1 Compact Button Selection
**Rule:** Use compact button UI with semester grouping for multi-select operations.

**Example: Teacher Subject Selection**
```
Semester 3:  [DS] [DBMS] [COA] [Math]  (Selected: 2)
Semester 5:  [AI] [CC] [CN] [SE]       (Selected: 1)
```

**Reason:** Reduces scrolling, improves visibility, semester-based organization aligns with academic structure.

### 11.2 Shortform Priority
**Rule:** Always display shortforms when available, fall back to codes if not.

**Display Logic:**
```javascript
{item.shortform || item.code}
// Example: "DS" instead of "BCS301"
```

### 11.3 Auto-Uppercase Inputs
**Rule:** Classroom/Lab room numbers must be auto-converted to uppercase.

**Implementation:**
```javascript
<input 
  style={{ textTransform: 'uppercase' }}
  onChange={(e) => setValue(e.target.value.toUpperCase())}
/>
```

### 11.4 Stats Dashboards
**Rule:** Every master data page should show summary statistics.

**Example:**
```
Teachers Page:
├── 📊 Total Teachers: 15
├── 📚 Total Subject Assignments: 45
└── 🧪 Total Lab Assignments: 30
```

**Reason:** Provides quick overview, helps administrators track completion status.

---

## 🚀 **12. TECHNICAL IMPLEMENTATION CONSTRAINTS**

### 12.1 Database Collections
**Required Collections:**
- `Teachers` - Faculty master data
- `Subjects` - Theory subject definitions
- `Syllabus_Labs` - Lab subject definitions
- `ISE_Sections` - Section and batch structure
- `Classrooms` - Theory classroom inventory
- `Dept_Labs` - Lab room inventory
- `Teacher_Subject_Assignments` - Theory subject assignments (Phase 2)
- `Teacher_Lab_Assignments` - Lab assignments per batch (Phase 2)
- `Lab_Sessions` - Scheduled lab sessions with time slots (Phase 3)

### 12.2 Unique Indexes
**Required Unique Constraints:**
```javascript
// Prevent duplicate subjects
{ subject_code: 1, sem: 1 } // Unique

// Prevent duplicate labs
{ lab_code: 1, lab_sem: 1 } // Unique

// Prevent duplicate sections
{ sem: 1, sem_type: 1, section_name: 1 } // Unique

// Prevent duplicate subject assignments
{ subject_id: 1, sem: 1, sem_type: 1, section: 1 } // Unique

// Prevent duplicate lab assignments per batch
{ lab_id: 1, sem: 1, sem_type: 1, section: 1, batch_number: 1 } // Unique

// Prevent duplicate lab sessions per time slot
{ section_id: 1, scheduled_day: 1, scheduled_start_time: 1 } // Unique
```

### 12.3 Pre-Save Validations
**Required Validations:**

**Lab Assignments:**
- Exactly 2 teachers per lab batch
- Teachers must have lab in `labs_handled`
- Lab room must support the lab subject

**Lab Sessions:**
- All batches of section must be present
- Batch names must match section's batch_names
- Each batch must have exactly 2 teachers
- End time > Start time
- Duration should be 2 hours (warning if not)

**Theory Assignments:**
- Teacher must have subject in `canTeach_subjects`
- One teacher per subject per section

---

## 📝 **SUMMARY: CRITICAL CONSTRAINTS**

### Top 12 Most Important Constraints:

1. **Semester Scope:** Only semesters 3-8 (ISE responsibility)
2. **Batch Synchronization:** All batches of a section must be together in time (same OR different labs)
3. **Lab Teachers:** Exactly 2 teachers per lab batch (always)
4. **Lab Duration:** Always 2 hours (no exceptions)
5. **Lab Equipment Requirements:** ⭐ Labs need specific rooms based on equipment/software (DV needs graphics, DVP needs project tools)
6. **Lab Room Assignment in Phase 2:** ⭐ Rooms must be manually assigned in Phase 2, not auto-assigned (equipment constraints)
7. **Project Subjects:** Time allocation only, no teacher/classroom assignment
8. **Batch Naming:** Include semester prefix (3A1, not A1)
9. **Teacher Capability ≠ Assignment:** Separate capability declaration from workload
10. **No Conflicts:** No teacher/room double-booking at same time
11. **Atomic Sessions:** Lab sessions saved as complete units (all batches)
12. **Three-Phase Workflow:** Master Data → Assignments (Teachers + Rooms) → Generation (Time Slots)

**Note:** Capacity fields (classroom/lab room/section students) are stored for informational purposes only and are NOT used for validation, scheduling, or any constraints.

**Critical Clarification:** Lab room assignments are FIXED in Phase 2 because different labs require different equipment/software. Phase 3 algorithm only finds TIME SLOTS, not room assignments.

---

## 🎓 **END OF CONSTRAINTS DOCUMENT**

**Version:** 1.0  
**Last Updated:** Based on complete project discussion  
**Status:** Comprehensive - Covers all identified constraints

**Note:** This document should be updated as new constraints are discovered during implementation and testing phases.
