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
**Rule:** Subjects are categorized into 5 types based on teaching and scheduling requirements:

#### **Type 1: Regular Theory Subjects**
**Definition:** Core ISE curriculum subjects taught by ISE department faculty.

**Examples:** Data Structures, DBMS, AI, Computer Networks, Operating Systems

**Scheduling Requirements:**
- ✅ Requires ISE teacher assignment
- ✅ Requires classroom assignment (ISE department rooms)
- ✅ Requires time slot allocation
- ✅ Teacher workload counted

**Characteristics:**
```javascript
{
  requires_teacher_assignment: true,
  is_project: false,
  is_open_elective: false,
  is_professional_elective: false,
  is_non_ise_subject: false
}
```

---

#### **Type 2: Other Department Subjects**
**Definition:** Subjects taught by other departments (Math, Physics, Management, etc.) but attended by ISE students.

**Examples:** Mathematics-III, Engineering Physics, Business Management

**Scheduling Requirements:**
- ❌ NO ISE teacher assignment (other dept handles teacher)
- ✅ Requires classroom assignment (ISE dept reserves own classroom)
- ✅ Requires time slot allocation (ISE timetable reserves slot)
- ❌ NOT counted in ISE teacher workload

**Reason for Classification:** ISE students need the time slot and classroom reserved, but teaching is handled externally.

**Characteristics:**
```javascript
{
  requires_teacher_assignment: false,
  is_non_ise_subject: true,
  is_project: false,
  is_open_elective: false,
  is_professional_elective: false
}
```

**Implementation:**
- Timetable algorithm reserves time slot and classroom
- Display as "Subject: Math-III | Teacher: [Other Dept] | Room: ISE-601"

---

#### **Type 3: Project Subjects**
**Definition:** Self-directed student work with periodic reviews (no continuous teaching).

**Examples:** Minor Project, Major Project, Internship

**Scheduling Requirements:**
- ❌ NO teacher assignment (students work independently)
- ❌ NO classroom assignment (flexible - labs, library, groups)
- ✅ Requires time slot allocation (for periodic reviews/meetings)
- ❌ NOT counted in teacher workload

**Reason for Classification:** Projects require time allocation but not fixed teaching resources.

**Characteristics:**
```javascript
{
  requires_teacher_assignment: false,
  is_project: true,
  is_non_ise_subject: false,
  is_open_elective: false,
  is_professional_elective: false
}
```

**Implementation:**
- Timetable algorithm reserves time slot only
- Display as "Major Project | Monday 1:30-3:30 | No room assigned"

---

#### **Type 4: Open Elective Courses (OEC)**
**Definition:** College-wide electives offered to students from ALL departments, taught by offering department (may or may not be ISE).

**Examples:** Machine Learning (offered by CSE), IoT (offered by ECE), Blockchain (offered by ISE)

**Applicable To:** Semester 7 students only

**Scheduling Requirements:**
- ❌ NO ISE teacher assignment (offering dept handles teacher, even if ISE teaches it)
- ✅ Requires classroom assignment (ISE dept reserves own classroom for ISE students)
- ✅ Requires FIXED time slot (pre-decided, given as input)
- ❌ NOT counted in ISE teacher workload (even if ISE faculty teaches, it's separate from dept load)

**Reason for Classification:** 
- Inter-department course requiring coordination
- Time slots FIXED college-wide (so students from different branches can attend)
- ISE students attend at ISE-reserved classroom, but teaching managed separately

**Key Constraint - FIXED Time Slots:**
```
Input (given before generation):
├── OEC: Machine Learning
├── Fixed Time: Friday 1:30-3:30 PM (college-decided)
└── All sections (3A, 5A, 7A) choosing ML must attend at THIS time

Timetable Algorithm:
├── BLOCKS Friday 1:30-3:30 for Section 7A
├── Assigns ISE classroom (e.g., ISE-LH1)
└── Does NOT assign ISE teacher (handled by offering dept)
```

**Characteristics:**
```javascript
{
  requires_teacher_assignment: false,
  is_open_elective: true,
  fixed_time_slots: true,  // Pre-decided by college
  is_project: false,
  is_non_ise_subject: false,  // May or may not be ISE
  is_professional_elective: false
}
```

**Batch Handling:** All batches of section stay together (batch synchronization maintained).

---

#### **Type 5: Professional Elective Courses (PEC)**
**Definition:** ISE-specific electives where students choose from 2-3 options within ISE curriculum.

**Examples:** 
- Option A: Advanced AI
- Option B: Cloud Computing  
- Option C: Cyber Security

**Applicable To:** Semester 7 students only

**Scheduling Requirements:**
- ✅ Requires ISE teacher assignment (ISE faculty teaches)
- ✅ Requires classroom assignment (ISE department rooms)
- ✅ Requires FIXED time slot (pre-decided, given as input)
- ✅ Counted in ISE teacher workload

**Reason for Classification:**
- Choice-based within ISE department
- Multiple options must run in PARALLEL at SAME time (so students can't be in two places)
- Time slots FIXED to ensure parallel scheduling

**Key Constraint - FIXED Parallel Slots:**
```
Input (given before generation):
├── PEC Slot: Monday 10:30-12:30 (fixed for all PEC options)
├── Section 7A students: 
│   ├── 20 students choose Advanced AI
│   ├── 25 students choose Cloud Computing
│   └── 15 students choose Cyber Security
└── All 3 options run at SAME time in DIFFERENT rooms

Timetable Algorithm:
├── BLOCKS Monday 10:30-12:30 for Section 7A
├── Assigns 3 classrooms: ISE-601, ISE-602, ISE-603
├── Assigns 3 ISE teachers (one per option)
└── Students attend based on their choice
```

**Characteristics:**
```javascript
{
  requires_teacher_assignment: true,
  is_professional_elective: true,
  fixed_time_slots: true,  // Pre-decided for parallel scheduling
  is_project: false,
  is_open_elective: false,
  is_non_ise_subject: false
}
```

**Batch Handling:** All batches of section stay together (batch synchronization maintained). Choice is individual, not batch-based.

---

### 3.2 Summary: Scheduling Requirements by Type

| Subject Type | ISE Teacher? | Classroom? | Time Slot? | Workload Count? | Fixed Slot? |
|--------------|-------------|------------|------------|-----------------|-------------|
| **Regular Theory** | ✅ Yes | ✅ Yes | ✅ Yes (flexible) | ✅ Yes | ❌ No |
| **Other Dept** | ❌ No | ✅ Yes (reserved) | ✅ Yes (flexible) | ❌ No | ❌ No |
| **Project** | ❌ No | ❌ No | ✅ Yes (flexible) | ❌ No | ❌ No |
| **OEC (Sem 7)** | ❌ No | ✅ Yes (reserved) | ✅ Yes (FIXED) | ❌ No | ✅ Yes |
| **PEC (Sem 7)** | ✅ Yes | ✅ Yes | ✅ Yes (FIXED) | ✅ Yes | ✅ Yes |

**Key Insights:**
- **Regular Theory:** Full ISE control, flexible scheduling
- **Other Dept + OEC:** Reserve resources, teaching external
- **Project:** Time only, no fixed resources
- **PEC:** Full ISE control BUT with fixed time constraint
- **Batch Sync:** Applies to ALL types (batches always together in time)

---

### 3.3 Theory Subject Scheduling Rules
**Rule:** Theory subjects have flexible scheduling based on `hrs_per_week` and `max_hrs_per_day` constraints.

**Database Fields:**
```javascript
{
  subject_name: "Data Structures",
  hrs_per_week: 3,        // Total hours needed per week
  max_hrs_per_day: 2      // Maximum hours in one day
}
```

**Scheduling Strategy:**

**Example 1: 3 hrs/week, max 2 hrs/day**
```
Option A (Consecutive):
├── Monday: 9:00-11:00 (2 hours)
├── Wednesday: 10:00-11:00 (1 hour)
└── Total: 3 hours ✅

Option B (Split differently):
├── Monday: 9:00-10:00 (1 hour)
├── Wednesday: 10:00-12:00 (2 hours)
└── Total: 3 hours ✅

✅ Both valid - algorithm decides based on convenience
```

**Example 2: 4 hrs/week, max 2 hrs/day**
```
Option A:
├── Monday: 9:00-11:00 (2 hours)
├── Thursday: 2:00-4:00 (2 hours)
└── Total: 4 hours ✅

Option B:
├── Tuesday: 9:00-11:00 (2 hours)
├── Wednesday: 10:00-11:00 (1 hour)
├── Friday: 2:00-3:00 (1 hour)
└── Total: 4 hours ✅

✅ Both valid - flexible split
```

**Invalid Example:**
```
Subject: DBMS (4 hrs/week, max 2 hrs/day)

❌ Monday: 9:00-1:00 (4 hours) - Violates max_hrs_per_day!
❌ Week total: 5 hours - Exceeds hrs_per_week!
```

**Key Rules:**
- ✅ Total weekly hours MUST equal `hrs_per_week`
- ✅ Any single day session CANNOT exceed `max_hrs_per_day`
- ✅ Sessions can be consecutive or split across different days
- ✅ Algorithm decides optimal split based on:
  - Available time slots
  - Teacher availability
  - Classroom availability
  - Minimizing gaps in student schedule

**Batch Handling for Theory:**
- ✅ All batches (3A1, 3A2, 3A3) attend together as ONE section
- ✅ Full section (e.g., 60 students) in ONE large classroom
- ❌ Cannot split batches into different rooms for theory

**Implementation:**
- Store `max_hrs_per_day` in subjects model
- Algorithm checks: daily_hours ≤ max_hrs_per_day
- Algorithm ensures: Σ(all sessions) = hrs_per_week

---

### 3.4 Subject Shortforms
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

### 3.5 Subject Field Naming Convention ⚠️
**Critical Implementation Detail:** Subject model uses prefixed field names.

**Database Schema:**
```javascript
subject_sem: { type: Number }      // NOT "sem"
subject_sem_type: { type: String } // NOT "sem_type"
```

**Common Mistake:**
```javascript
❌ WRONG: subject.sem === section.sem
✅ CORRECT: subject.subject_sem === section.sem

❌ WRONG: subject.sem_type === section.sem_type
✅ CORRECT: subject.subject_sem_type === section.sem_type
```

**Why This Matters:**
- Filters will return empty arrays if wrong field names used
- No error thrown - silently fails with zero results
- Always use prefixed names when filtering subjects

**Implementation Checklist:**
- ✅ Use `subject.subject_sem` for semester filtering
- ✅ Use `subject.subject_sem_type` for odd/even filtering
- ✅ Use `subject.subject_code` for subject code
- ✅ Use `subject.subject_name` for subject name
- ✅ Use `subject.subject_shortform` for display

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

### 4.7 Weekly Lab Scheduling Requirements (CRITICAL!)
**Rule:** Every batch of a section MUST get ONE session of EACH lab assigned to that semester, scheduled within the weekly timetable.

**Example - Semester 5 Section A:**
```
Assigned Labs for Semester 5:
├── CN Lab (Computer Networks Lab)
└── DV Lab (Data Visualization Lab)

Weekly Timetable MUST include:
Section 5A:
├── Batch 5A1:
│   ├── CN Lab → One 2-hour session (e.g., Monday 8-10 AM)
│   └── DV Lab → One 2-hour session (e.g., Wednesday 2-4 PM)
│
├── Batch 5A2:
│   ├── CN Lab → One 2-hour session (e.g., Monday 8-10 AM)
│   └── DV Lab → One 2-hour session (e.g., Wednesday 2-4 PM)
│
└── Batch 5A3:
    ├── CN Lab → One 2-hour session (e.g., Monday 8-10 AM)
    └── DV Lab → One 2-hour session (e.g., Wednesday 2-4 PM)

✅ All 3 batches get BOTH labs in the week
```

**Parallel Lab Scheduling (Same OR Different Labs):**

**Scenario A: Same Lab in Parallel (Preferred when possible)**
```
Monday 8:00-10:00 - Section 5A:
├── Batch 5A1 → CN Lab → Room ISE-301 → Teachers: DC+AK
├── Batch 5A2 → CN Lab → Room ISE-302 → Teachers: Rajeev+Suman
└── Batch 5A3 → CN Lab → Room ISE-303 → Teachers: Arjun+Priya

✅ All batches doing SAME lab at SAME time (batch sync)
✅ Easier for students/teachers (uniform schedule)
```

**Scenario B: Different Labs in Parallel (When necessary)**
```
Wednesday 2:00-4:00 - Section 5A:
├── Batch 5A1 → DV Lab → Room 612A → Teachers: DC+AK
├── Batch 5A2 → CN Lab → Room ISE-302 → Teachers: Rajeev+Suman
└── Batch 5A3 → DSL Lab → Room ISE-301 → Teachers: Arjun+Priya

✅ All batches doing DIFFERENT labs at SAME time (batch sync maintained)
✅ Flexible - allows more scheduling options
```

**Algorithm Liberty:**
- ✅ Can schedule same lab for all batches in parallel
- ✅ Can schedule different labs for batches in parallel
- ✅ Choice based on:
  - Teacher availability
  - Room availability
  - Minimizing conflicts
  - Optimal time slot utilization

**Critical Constraint - Weekly Completeness:**
```
❌ INVALID: Batch 5A1 gets CN Lab but NOT DV Lab in the week
❌ INVALID: Batch 5A2 gets DV Lab twice but NO CN Lab
✅ VALID: Every batch gets exactly ONE session of EACH lab per week
```

**Implementation:**
- Algorithm must track: Which labs each batch has been assigned
- Before finalizing timetable: Verify all batches have all required labs
- Warning if any lab missing for any batch

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

### 5.2 Working Hours and Time Structure
**Rule:** Classes operate within department working hours: 8:00 AM to 5:00 PM, Monday through Friday.

**Working Schedule:**
```
Days: Monday, Tuesday, Wednesday, Thursday, Friday
Hours: 8:00 AM - 5:00 PM (9 hours total per day)
Weekends: Saturday, Sunday (NO classes)
```

**Time Slot Flexibility:**
- ✅ Algorithm can allocate slots flexibly within 8 AM - 5 PM window
- ✅ Theory classes: Typically 1-2 hour blocks
- ✅ Labs: Always 2-hour blocks
- ✅ No fixed hourly boundaries (can start at 8:30, 9:15, 10:45, etc. as needed)

**Typical Time Structure (Example):**
```
08:00-09:00 → Slot 1 (1 hour)
09:00-10:00 → Slot 2 (1 hour)
10:00-10:30 → Short Break
10:30-11:30 → Slot 3 (1 hour)
11:30-12:30 → Slot 4 (1 hour)
12:30-01:30 → Lunch Break (1 hour)
01:30-02:30 → Slot 5 (1 hour)
02:30-03:30 → Slot 6 (1 hour)
03:30-04:30 → Slot 7 (1 hour)
04:30-05:00 → Buffer/End of day
```

**Note:** Actual time slot allocation is determined by algorithm during Phase 3 generation, within the 8 AM - 5 PM constraint.

### 5.3 No Excessive Gaps
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

**Note:** Actual time slot allocation is determined by algorithm during Phase 3 generation, within the 8 AM - 5 PM constraint.

**Reason:** Maintains student engagement, efficient use of time, prevents idle periods.

### 5.4 Fixed Time Slots for OEC and PEC (Semester 7 Only)
**Rule:** Open Elective Courses (OEC) and Professional Elective Courses (PEC) have PRE-DECIDED fixed time slots that must be honored.

**Input Required (Before Generation):**
```javascript
// Example input for Semester 7 electives
{
  oec_time_slot: {
    day: "Friday",
    start_time: "1:30 PM",
    end_time: "3:30 PM"
  },
  pec_time_slot: {
    day: "Monday", 
    start_time: "10:30 AM",
    end_time: "12:30 PM"
  }
}
```

**Algorithm Behavior:**
```
For Section 7A:
├── OEC: BLOCK Friday 1:30-3:30 PM (fixed, given as input)
│   ├── Reserve ISE classroom
│   ├── NO teacher assignment (external dept)
│   └── All batches together
│
└── PEC: BLOCK Monday 10:30-12:30 PM (fixed, given as input)
    ├── Reserve 3 ISE classrooms (for 3 elective options)
    ├── Assign 3 ISE teachers (one per option)
    └── All batches together (students distributed by choice)
```

**Reason:** 
- **OEC:** College-wide coordination requires fixed slots
- **PEC:** Parallel elective options require same time slot
- Pre-decided slots prevent scheduling conflicts

**Implementation:**
- Store fixed slots in database or configuration
- Algorithm marks these slots as "blocked" for Sem 7 sections
- No flexibility in time allocation for these subjects

### 5.5 Weekly Schedule Pattern
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

### 9.4 Hours Per Week vs Credits
**Rule:** Use `hrs_per_week` field for workload calculations, not `credits`.

**Reason:** 
- `hrs_per_week` represents actual teaching time commitment
- `credits` is an academic metric, not operational
- Timetable generation needs actual hours, not credit values

**Example:**
```
Subject: Data Structures
├── hrs_per_week: 3 ✅ (3 hours of teaching per week)
├── credits: 4 (academic credits - informational only)
└── Use hrs_per_week for:
    ├── Teacher workload calculations
    ├── Timetable slot allocation
    └── Scheduling constraints
```

**Implementation:**
- Display `hrs_per_week` in assignment interfaces
- Use `hrs_per_week` for teacher workload analytics
- Hide `credits` from operational views (only show in subject master data)

**UI Display:**
```javascript
✅ CORRECT: "{subject.hrs_per_week} hrs/week"
❌ WRONG: "{subject.credits} credits"
```

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

---

### 10.2 Pre-Generation Validation Checklist
**Rule:** Before starting Phase 3 generation, validate that Phase 2 assignments are complete.

**Validation Checks:**

**1. Regular Theory Subjects:**
```
For each section:
  For each regular theory subject (requires_teacher_assignment = true):
    ✅ Check: Has teacher been assigned?
    ❌ Missing: Flag as unassigned
```

**2. Lab Batch Assignments:**
```
For each section:
  For each lab in semester:
    For each batch (3 batches per section):
      ✅ Check: 2 teachers assigned?
      ✅ Check: Lab room assigned?
      ❌ Missing: Flag batch as unassigned
```

**3. Professional Elective Courses (PEC - Sem 7 only):**
```
For each PEC option (if semester 7):
  ✅ Check: Has ISE teacher been assigned?
  ✅ Check: Fixed time slot defined?
  ❌ Missing: Flag PEC option as unassigned
```

**4. Other Department & Open Elective Subjects:**
```
For each Other Dept / OEC subject:
  ✅ Check: Marked as non-ISE teacher (no assignment needed)
  ✅ Check: Fixed time slots defined (for OEC in Sem 7)
  ℹ️ Info: These don't need teacher assignment, just slot reservation
```

**5. Project Subjects:**
```
For each project subject:
  ✅ Check: Marked as project (no teacher/classroom needed)
  ℹ️ Info: Only need time slot allocation
```

**User Interaction if Incomplete:**
```javascript
// If validation finds unassigned items:
{
  status: "incomplete",
  unassigned: {
    theory_subjects: [
      { section: "3A", subject: "Data Structures", reason: "No teacher assigned" }
    ],
    lab_batches: [
      { section: "5A", batch: "5A2", lab: "CN Lab", reason: "Only 1 teacher assigned" },
      { section: "5A", batch: "5A3", lab: "DV Lab", reason: "No lab room assigned" }
    ],
    pec_options: [
      { option: "Advanced AI", reason: "No teacher assigned" }
    ]
  }
}

// Show to admin:
"⚠️ Phase 2 Incomplete! The following items are not assigned:
- Section 3A: Data Structures (no teacher)
- Section 5A, Batch 5A2: CN Lab (only 1 teacher)
- Section 5A, Batch 5A3: DV Lab (no room)
- PEC: Advanced AI (no teacher)

Would you like to:
1. ❌ Cancel - Fix assignments first
2. ⚠️ Continue anyway - Generate timetable with gaps (not recommended)
```

**Algorithm Behavior if User Chooses "Continue Anyway":**
- Skip unassigned subjects/labs during generation
- Leave time slots empty for those items
- Mark as "Not Scheduled - Missing Assignment" in final timetable
- Generate workload report excluding unassigned items

**Implementation:**
- Run validation API call before generation
- Display clear warning with list of missing items
- Allow admin to proceed with warning acknowledgment
- Log skipped items in generation report

---

### 10.3 Teacher Workload Calculation (Post-Generation)
**Rule:** After timetable generation, calculate actual hours worked per teacher for workload analysis.

**Calculation Formula:**

**Theory Hours:**
```javascript
For each teacher:
  theory_hours = Σ(subject.hrs_per_week) for all assigned subjects
  
Example - Prof. DC:
├── DS (Section 3A): 3 hrs/week
├── DBMS (Section 3B): 4 hrs/week
└── Theory Total: 7 hours
```

**Lab Hours:**
```javascript
For each teacher:
  lab_hours = Σ(2 hours × number_of_lab_sessions)
  
Example - Prof. DC:
├── DSL (Batch 3A1): 2 hours
├── DSL (Batch 3B2): 2 hours
├── CN Lab (Batch 5A1): 2 hours
└── Lab Total: 6 hours
```

**Total Weekly Workload:**
```javascript
total_workload = theory_hours + lab_hours

Example - Prof. DC:
├── Theory: 7 hours
├── Labs: 6 hours
└── Total: 13 hours/week ✅
```

**Workload Report Format:**
```
Teacher: Prof. Deeksha Chandra (DC)

Theory Assignments:
├── DS (3A): 3 hrs/week
├── DBMS (3B): 4 hrs/week
└── Subtotal: 7 hours

Lab Assignments:
├── DSL - Batch 3A1: 2 hours
├── DSL - Batch 3B2: 2 hours
├── CN Lab - Batch 5A1: 2 hours
└── Subtotal: 6 hours

Total Weekly Workload: 13 hours
Status: ✅ Normal (Typical: 40-50 hrs/week for full-time faculty)
```

**Exclusions from Workload Count:**
- ❌ Project subjects (no continuous teaching)
- ❌ OEC subjects (handled separately, not ISE workload)
- ✅ PEC subjects (if ISE teacher assigned, count hrs_per_week)
- ❌ Other Dept subjects (not ISE teacher)

**Typical Workload Expectations:**
```
Full-time Faculty: 40-50 hours/week
├── Theory: 10-15 hours
├── Labs: 10-15 hours
├── Admin/Meetings: 10-15 hours
└── Research/Prep: 10-15 hours
```

**Implementation:**
- Generate after timetable finalization
- Display in admin dashboard
- Allow export to PDF/Excel
- Highlight teachers with very high/low workloads
- Admin can review and reassign if workload imbalanced

---

### 10.4 Subject Filtering by Assignment Requirement
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

---

### 10.5 Elective Constraint (Future)
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

### 11.1 Debugging and Error Messages
**Rule:** Provide clear, actionable debugging information when filters return empty results.

**Implementation Pattern:**
```javascript
// Always log filter criteria and results
console.log('Filter Criteria:', { sem, sem_type })
console.log('Total Items:', items.length)
console.log('Filtered Items:', filteredItems.length)

// Show user-friendly empty state
if (filteredItems.length === 0) {
  return (
    <div className="empty-state">
      <p>⚠️ No items found</p>
      <p>Criteria: Semester {sem} - {sem_type}</p>
      <p>Troubleshooting:
        • Check if items exist for this semester
        • Verify field names match database schema
        • Check browser console for detailed logs
      </p>
    </div>
  )
}
```

**Why This Matters:**
- Silent failures are hard to debug
- Empty dropdowns confuse users
- Console logs help identify field name mismatches
- Clear messages guide users to solution

**Real Example from Development:**
```
Problem: Subject filter returned empty array
Reason: Used subject.sem instead of subject.subject_sem
Solution: Console logs revealed no subjects matched filter
Fix: Corrected field name to subject.subject_sem
```

### 11.2 Compact Button Selection
**Rule:** Use compact button UI with semester grouping for multi-select operations.

**Example: Teacher Subject Selection**
```
Semester 3:  [DS] [DBMS] [COA] [Math]  (Selected: 2)
Semester 5:  [AI] [CC] [CN] [SE]       (Selected: 1)
```

**Reason:** Reduces scrolling, improves visibility, semester-based organization aligns with academic structure.

### 11.3 Shortform Priority
**Rule:** Always display shortforms when available, fall back to codes if not.

**Display Logic:**
```javascript
{item.shortform || item.code}
// Example: "DS" instead of "BCS301"
```

### 11.4 Auto-Uppercase Inputs
**Rule:** Classroom/Lab room numbers must be auto-converted to uppercase.

**Implementation:**
```javascript
<input 
  style={{ textTransform: 'uppercase' }}
  onChange={(e) => setValue(e.target.value.toUpperCase())}
/>
```

### 11.5 Stats Dashboards
**Rule:** Every master data page should show summary statistics.

**Example:**
```
Teachers Page:
├── 📊 Total Teachers: 15
├── 📚 Total Subject Assignments: 45
└── 🧪 Total Lab Assignments: 30
```

**Reason:** Provides quick overview, helps administrators track completion status.

### 11.6 Workload Display - Hours Not Credits
**Rule:** Show `hrs_per_week` in assignment interfaces, not `credits`.

**Correct Display:**
```javascript
// In subject cards
<div className="subject-hours">{subject.hrs_per_week} hrs/week</div>

// In assignment tables
<td>{assignment.subject_id.hrs_per_week} hrs</td>

// In modal details
<div className="detail-row">
  <span className="label">Hours per Week:</span>
  <span className="value">{subject.hrs_per_week}</span>
</div>
```

**Wrong Display:**
```javascript
❌ <div>{subject.credits} credits</div>  // Don't show credits in operations
```

**Reason:**
- Credits are academic metrics (for transcripts)
- Hours per week are operational metrics (for scheduling)
- Teachers/admins need to see actual time commitment
- Workload calculations depend on hours, not credits

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

**Teacher Workload:**
- Teacher workload is NOT pre-constrained by max hours per week
- Workload is naturally determined by Phase 2 assignments (subjects + labs assigned)
- Post-generation analytics will calculate actual hours worked per teacher
- Typical engineering teacher workload: 40-50 hours per week
- Admin can review workload report after generation and reassign if needed

---

## 🧠 **13. ALGORITHM CONSTRAINTS AND STRATEGIES**

### 13.1 Phase 2 Auto-Assignment Algorithm
**Purpose:** Automatically generate conflict-free lab assignments (teachers + rooms) for all batches.

**Algorithm Strategy:**
```javascript
For each section:
  For each syllabus lab:
    For each batch (1 to 3):
      1. Find 2 qualified teachers (least used first - fair distribution)
      2. Use round-robin room assignment based on batch number
         → Batch 1: Room[0], Batch 2: Room[1], Batch 3: Room[2]
      3. Save assignment: (section, batch, lab, 2 teachers, 1 room)
```

**Critical Insight - Room Rotation per Batch:**
```
Example: CN Lab for Section 5A
├── Batch 5A1 → Teachers: DC+AK → Room: ISE-301 (rooms[0])
├── Batch 5A2 → Teachers: Rajeev+Suman → Room: ISE-302 (rooms[1])
└── Batch 5A3 → Teachers: Arjun+Priya → Room: ISE-303 (rooms[2])

WHY: Ensures each batch gets a different room for the same lab
BENEFIT: No room conflicts when batches do same lab in parallel
```

**Teacher Selection Strategy:**
- Filter teachers by capability (`labs_handled` includes target lab)
- Sort by usage count (ascending) - pick least used teachers first
- Fair workload distribution across all qualified teachers
- Teachers CAN be reused across different batches (no conflicts since batches rotate time slots)

**Room Assignment Strategy:**
- Filter rooms by lab support (`lab_subjects_handled` includes target lab)
- Sort rooms alphabetically for consistency
- Use modulo operator: `roomIndex = (batchNumber - 1) % suitableRooms.length`
- Ensures different rooms for different batches of same lab

**Output:** Complete `Teacher_Lab_Assignments` collection with all (section, batch, lab, teachers, room) combinations.

---

### 13.2 Phase 3 Timetable Generation Algorithm (Greedy Builder)
**Purpose:** Find optimal TIME SLOTS for all theory subjects and labs using constraint satisfaction.

**Algorithm Architecture:**
```
Phase 0: Greedy Initialization (Current Implementation)
├── Generate initial "good enough" timetable
├── Fitness: ~-200 (minor violations acceptable)
└── Much better than random (~-900)

Phase 1: Genetic Algorithm (Future Implementation)
├── Evolve timetable through generations
├── Crossover + Mutation operators
└── Target fitness: ~-50 (few violations)

Phase 2: Bees Algorithm (Future Refinement)
├── Local search for fine-tuning
└── Target fitness: 0 (zero violations)
```

**Current Implementation: Greedy Builder Strategy**

**Step 1: Block Fixed Slots**
```javascript
// For Semester 7 only
Block OEC slots: { day: 'Friday', start: '13:30', end: '15:30' }
Block PEC slots: { day: 'Monday', start: '10:30', end: '12:30' }
// These slots are reserved, cannot be used for other activities
```

**Step 2: Schedule Labs (Hardest First)**
```javascript
// Labs scheduled before theory (less flexible - 2 hour blocks)

BATCH ROTATION STRATEGY (CRITICAL!):
For each time slot round:
  For each batch:
    labIndex = (round + batchIndex) % batch.labs.length
    Schedule: batch[labIndex] at this time slot

EXAMPLE: Section 5A has 2 labs (CN, DV)
Round 1:
├── Batch 5A1: CN Lab (labs[0])
├── Batch 5A2: DV Lab (labs[1])  ← Started at different lab!
└── Batch 5A3: CN Lab (labs[0])

Round 2:
├── Batch 5A1: DV Lab (labs[1])  ← Rotated!
├── Batch 5A2: CN Lab (labs[0])  ← Rotated!
└── Batch 5A3: DV Lab (labs[1])

Result: All batches complete all labs, no duplicates!
```

**Batch Rotation Formula:**
```javascript
labIndex = (currentRound + batchNumber) % totalLabs

Why this works:
- Each batch starts at different lab (offset by batch number)
- Each round, all batches rotate to next lab
- After totalLabs rounds, all batches completed all labs
- No conflicts since batches always in sync (same time slot)
```

**Lab Slot Selection Strategy:**
```javascript
Preferred lab times:
├── 08:00-10:00 (morning slot 1)
├── 10:00-12:00 (morning slot 2)
├── 14:00-16:00 (afternoon slot 1)
└── 16:00-18:00 (afternoon slot 2) [extends beyond 17:00, needs review]

Strategy:
1. Try Monday first, then Tuesday, Wednesday, Thursday, Friday
2. For each day, try time slots in order
3. Pick first available (no conflicts)
```

**Step 3: Schedule Theory (More Flexible)**
```javascript
Sort subjects by hrs_per_week (descending) - hardest first

For each theory subject:
  1. Split hours into sessions respecting max_hrs_per_day
     Example: 3 hrs/week, max 2/day → sessions [2, 1]
  
  2. For each session:
     - Calculate day load (hours already scheduled per day)
     - Sort available slots by day load (prefer least busy days)
     - Try slots in load-balanced order
     - Check conflicts (teacher, room, batch sync)
     - Pick first conflict-free slot
```

**Theory Hour Splitting Logic:**
```javascript
splitTheoryHours(hrsPerWeek, maxHrsPerDay):
  sessions = []
  remaining = hrsPerWeek
  
  while remaining > 0:
    sessionHours = min(remaining, maxHrsPerDay)
    sessions.push(sessionHours)
    remaining -= sessionHours
  
  return sessions

Examples:
- 3 hrs, max 2 → [2, 1]
- 4 hrs, max 2 → [2, 2]
- 5 hrs, max 2 → [2, 2, 1]
- 6 hrs, max 3 → [3, 3]
```

**Slot Availability Strategy - Load Balancing:**
```javascript
// Calculate current hours scheduled per day
hoursPerDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 }

For each existing slot:
  hoursPerDay[slot.day] += slot.duration

// Sort slots by:
// 1. Day load (ascending) - prefer less busy days
// 2. Time (ascending) - prefer earlier slots
sortedSlots = availableSlots.sort((a, b) => {
  if (hoursPerDay[a.day] !== hoursPerDay[b.day])
    return hoursPerDay[a.day] - hoursPerDay[b.day]
  return a.start_time - b.start_time
})

// Try slots in load-balanced order
```

**Conflict Detection:**
```javascript
checkSlotConflicts(timetable, assignment, slot, type):
  
  // Type: 'theory' or 'lab'
  
  // Check 1: Teacher conflict
  - Teacher already teaching another subject at same time?
  - For labs: Check both teacher1 and teacher2
  
  // Check 2: Room conflict
  - Room already occupied at same time?
  - For labs: Check assigned lab room
  - For theory: Check classroom
  
  // Check 3: Batch synchronization
  - Are all batches of section together in time?
  - For labs: All batches must be in labs (same or different)
  - For theory: All batches together in same classroom
  
  Return: true if conflict found, false if slot is free
```

**Working Hours Constraint:**
```javascript
WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
DAY_START = '08:00'
DAY_END = '17:00'

Generate time slots:
- 1-hour slots: 08:00-09:00, 09:00-10:00, ..., 16:00-17:00
- 2-hour slots: 08:00-10:00, 09:00-11:00, ..., 15:00-17:00

Note: Some lab slots extend to 18:00 (needs review for compliance)
```

**Output Structure:**
```javascript
Timetable {
  metadata: {
    created_by: 'greedy',
    generation: 0,
    fitness_score: -200 (approximate)
  },
  
  theory_slots: [
    {
      id, subject_id, subject_name, subject_shortform,
      section_id, section_name,
      teacher_id, teacher_name, teacher_shortform,
      classroom_id, classroom_name,
      day, start_time, end_time, duration_hours
    }
  ],
  
  lab_slots: [
    {
      id, section_id, section_name,
      slot_type: 'multi_batch_lab',
      batches: [
        {
          batch_number, batch_name,
          lab_id, lab_name, lab_shortform,
          teacher1_id, teacher2_id,
          teacher1_name, teacher2_name,
          teacher1_shortform, teacher2_shortform,
          lab_room_id, lab_room_name
        }
      ],
      day, start_time, end_time, duration_hours: 2
    }
  ]
}
```

---

### 13.3 Validation Constraints

**Teacher Conflict Validator:**
```javascript
For each time slot:
  For each teacher:
    Count occurrences of teacher at this (day, start_time)
    If count > 1: CONFLICT! Teacher teaching multiple classes
```

**Room Conflict Validator:**
```javascript
For each time slot:
  For each room:
    Count occurrences of room at this (day, start_time)
    If count > 1: CONFLICT! Room double-booked
```

**Batch Synchronization Validator:**
```javascript
For each time slot (day, start_time):
  Get all activities for section at this time
  
  Check 1: Are all batches present?
  - Section has 3 batches → Must have 3 activities
  
  Check 2: Do all activities have same end time?
  - All must end at same time (batch sync)
  
  If violations found: CONFLICT! Batches not synchronized
```

---

### 13.4 Future Algorithm Enhancements (Phase 1 & 2)

**Genetic Algorithm (Phase 1):**
```
Population: 50-100 timetables
Generations: 100-500 iterations
Selection: Tournament selection (best 10%)
Crossover: Swap time slots between parents
Mutation: Randomly move 1-3 slots
Fitness Function: 
  - Hard constraints: -100 per violation (must be zero)
  - Soft constraints: -1 to -10 per violation (minimize)
Target: Fitness = 0 (zero violations)
```

**Bees Algorithm (Phase 2):**
```
Elite Sites: Top 5 timetables from GA
Scout Bees: Local search around elite sites
Neighborhood: ±30 min time shifts, room swaps
Exploitation: Refine best solutions
Exploration: Search for better alternatives
Target: Fine-tune to absolute zero violations
```

**Fitness Function Components (Future):**
```javascript
fitness_score = 0

// Hard Constraints (MUST be zero)
fitness_score -= teacher_conflicts * 100
fitness_score -= room_conflicts * 100
fitness_score -= batch_sync_violations * 100

// Soft Constraints (minimize)
fitness_score -= gaps_over_30min * 10
fitness_score -= unbalanced_days * 5
fitness_score -= late_classes_after_4pm * 3
fitness_score -= back_to_back_labs * 2

return fitness_score
```

---

## � **11.7 Schema-Route Field Consistency**

**Rule:** Database schema field names MUST exactly match populate path in routes.

**Example Problem:**
```javascript
// ❌ WRONG - Schema has 'classroom' but route uses 'classroom_id'
Schema: scheduled_slots: [{ classroom: ObjectId }]
Route:  .populate('scheduled_slots.classroom_id', 'room_no')
Error:  "Cannot populate path `scheduled_slots.classroom_id`"
```

**Correct Implementation:**
```javascript
// ✅ CORRECT - Field names match
Schema: scheduled_slots: [{ classroom: ObjectId }]
Route:  .populate('scheduled_slots.classroom', 'room_no')
```

**Debugging:**
- Check exact field names in model definition
- Copy field names from schema to populate calls
- Error message will tell you which path failed to populate

---

## 🔄 **11.8 Update Payload Strategy for Unique Constraints**

**Rule:** When updating records with unique constraints, send ONLY the fields being changed.

**Problem:**
```javascript
// ❌ WRONG - Sends all fields including unchanged ones
PUT /api/teacher-assignments/:id
{
  teacher_id: "new_teacher",
  subject_id: "same_subject",  // Triggers unique constraint!
  sem: 3,
  sem_type: "odd",
  section: "A"
}
// Unique index on (subject_id, sem, sem_type, section) fails
```

**Solution:**
```javascript
// ✅ CORRECT - Send only changed field
PUT /api/teacher-assignments/:id
{
  teacher_id: "new_teacher"  // Only this changed
}
// MongoDB updates only teacher_id, unique constraint happy
```

**Implementation Pattern:**
```javascript
// Frontend: Separate payloads for create vs update
if (isEditMode) {
  const updatePayload = { teacher_id: selectedTeacher }  // Only changes
  await axios.put(`/api/assignments/${id}`, updatePayload)
} else {
  const createPayload = {  // Full payload for creation
    teacher_id: selectedTeacher,
    subject_id: subject._id,
    sem: section.sem,
    sem_type: section.sem_type,
    section: section.section_name
  }
  await axios.post('/api/assignments', createPayload)
}
```

**Why This Matters:**
- Unique indexes check if combination already exists
- Sending unchanged fields makes MongoDB think you're creating duplicate
- `findByIdAndUpdate` with minimal payload bypasses constraint

---

## 📊 **11.9 Display Priority: Shortforms First**

**Rule:** Always display shortforms before full names for compact, consistent UI.

**Example:**
```javascript
// ❌ WRONG - Shows full name first
{assignment.teacher_id.name || assignment.teacher_id.teacher_shortform}
// Result: "Dr. Shilpa M" (long, inconsistent)

// ✅ CORRECT - Shows shortform first
{assignment.teacher_id.teacher_shortform || assignment.teacher_id.name}
// Result: "SMD" (compact, consistent)
```

**Rationale:**
- Shortforms save screen space
- Create visual consistency across cards
- Fallback to full name if shortform missing

**Apply Everywhere:**
- Teacher displays
- Subject displays  
- Lab displays
- Assignment cards
- Table cells

---

## 🔍 **11.10 Console Logging Strategy**

**Rule:** Add strategic console logs for debugging complex data flows.

**What to Log:**
```javascript
// Filter criteria and counts
console.log('=== DEBUG INFO ===')
console.log('Filter criteria:', { sem, sem_type, section })
console.log('Total items:', allItems.length)
console.log('Filtered items:', filteredItems.length)
console.log('Filtered items:', filteredItems.map(i => i.code))

// Assignment state changes
console.log('isEditMode:', isEditMode)
console.log('currentAssignment:', currentAssignment)
console.log('Payload:', payload)

// Backend route execution
console.log('=== PUT UPDATE ASSIGNMENT ===')
console.log('Request Body:', req.body)
console.log('Current Assignment:', currentAssignment)
```

**Best Practices:**
- Use clear section headers (`=== TITLE ===`)
- Log both inputs and outputs
- Include relevant context (IDs, codes, names)
- Remove logs after debugging (or add debug flag)

---

## �📝 **SUMMARY: CRITICAL CONSTRAINTS**

### Top 15 Most Important Constraints:

1. **Semester Scope:** Only semesters 3-8 (ISE responsibility)
2. **Batch Synchronization:** All batches of a section must be together in time (same OR different labs)
3. **Lab Teachers:** Exactly 2 teachers per lab batch (always)
4. **Lab Duration:** Always 2 hours (no exceptions)
5. **Lab Equipment Requirements:** ⭐ Labs need specific rooms based on equipment/software (DV needs graphics, DVP needs project tools)
6. **Lab Room Assignment in Phase 2:** ⭐ Rooms must be manually assigned in Phase 2, not auto-assigned (equipment constraints)
7. **Batch Rotation Strategy:** ⭐ Batches rotate through labs using formula: `labIndex = (round + batchNumber) % totalLabs`
8. **Room Rotation per Batch:** ⭐ Different batches get different rooms: `roomIndex = (batchNumber - 1) % suitableRooms.length`
9. **Load Balancing:** Algorithm prefers scheduling on least busy days first (distributes workload evenly)
10. **Project Subjects:** Time allocation only, no teacher/classroom assignment
11. **Batch Naming:** Include semester prefix (3A1, not A1)
12. **Teacher Capability ≠ Assignment:** Separate capability declaration from workload (no upfront hour limits)
13. **No Conflicts:** No teacher/room double-booking at same time (validated by TeacherConflictValidator, RoomConflictValidator)
14. **Atomic Sessions:** Lab sessions saved as complete units (all batches)
15. **Three-Phase Workflow:** Master Data → Assignments (Teachers + Rooms) → Generation (Time Slots)

### 🔧 Critical Implementation Details:

**Algorithm Strategies:**
- ⚠️ **Batch Rotation Formula:** `labIndex = (currentRound + batchNumber) % totalLabs` ensures all batches complete all labs without duplicates
- ⚠️ **Room Distribution:** `roomIndex = (batchNumber - 1) % suitableRooms.length` prevents room conflicts in parallel sessions
- ⚠️ **Load Balancing:** Algorithm sorts time slots by day load (ascending) to distribute workload evenly across week
- ⚠️ **Greedy Strategy:** Schedule hardest items first (labs before theory, high hrs_per_week first)
- ⚠️ **Constraint Satisfaction:** Validate teacher conflicts, room conflicts, batch sync before finalizing each slot

**Phase 2 Auto-Assignment:**
- ✅ Automatically generates (teacher, room) assignments for all batches
- ✅ Fair distribution: Picks least-used teachers and rotates rooms
- ✅ Zero conflicts guaranteed: Different batches get different rooms for same lab
- ✅ Output: Complete `Teacher_Lab_Assignments` collection ready for Phase 3

**Phase 3 Greedy Builder:**
- ✅ Step 1: Block fixed slots (OEC/PEC in Sem 7)
- ✅ Step 2: Schedule labs using batch rotation strategy
- ✅ Step 3: Schedule theory using load balancing and hour splitting
- ✅ Result: Initial timetable with fitness ~-200 (good starting point)
- 🔄 Future: Genetic Algorithm (Phase 1) and Bees Algorithm (Phase 2) will refine to fitness = 0

**Field Naming Convention:**
- ⚠️ Subjects use prefixed fields: `subject_sem`, `subject_sem_type` (NOT `sem`, `sem_type`)
- ⚠️ Always use full field names in filters to avoid silent failures
- ⚠️ Schema field names MUST match populate paths exactly (classroom not classroom_id)

**Workload vs Credits:**
- ✅ Use `hrs_per_week` for scheduling and workload calculations
- ❌ Don't use `credits` for operational decisions (academic metric only)
- Display hours/week in assignment interfaces, not credits

**Update Strategy:**
- ✅ For updates: Send ONLY changed fields to avoid unique constraint conflicts
- ✅ For creates: Send full required payload
- Different payloads for PUT vs POST operations

**Display Best Practices:**
- ✅ Always show shortforms before full names (compact, consistent)
- ✅ Use fallback chain: `shortform || name` or `shortform || code`
- ✅ Apply consistently across all UI components

**Debugging Best Practices:**
- Add console.log statements for filter criteria and results
- Show empty state messages with troubleshooting hints
- Verify field names match database schema exactly
- Log both request and response data for API calls

**Note:** Capacity fields (classroom/lab room/section students) are stored for informational purposes only and are NOT used for validation, scheduling, or any constraints.

**Critical Clarification:** Lab room assignments are FIXED in Phase 2 because different labs require different equipment/software. Phase 3 algorithm only finds TIME SLOTS, not room assignments.

**Workload Management:** Teacher workload is determined by Phase 2 assignments. Post-generation reports show actual hours worked (typically 40-50 hrs/week for full-time faculty). No upfront hour limits are enforced during assignment or generation.

**Capacity Fields:** Capacity information (classroom capacity, lab room capacity, section students) is stored for INFORMATIONAL purposes ONLY. NOT used for validation, assignment restrictions, or scheduling constraints. Algorithm ignores capacity completely.

---

## 🎓 **END OF CONSTRAINTS DOCUMENT**

**Version:** 3.0 (Algorithm Update) 🚀  
**Major Update:** Added Section 13 - Algorithm Constraints and Strategies, documenting Phase 2 Auto-Assignment and Phase 3 Greedy Builder implementations  
**New Content:**
- Phase 2 Auto-Assignment algorithm with batch rotation and room distribution
- Phase 3 Greedy Builder strategy (fixed slots → labs → theory)
- Batch rotation formula: `labIndex = (round + batchNumber) % totalLabs`
- Room distribution formula: `roomIndex = (batchNumber - 1) % suitableRooms.length`
- Load balancing strategy for theory scheduling
- Theory hour splitting logic
- Conflict detection mechanisms (teacher, room, batch sync)
- Future algorithm enhancements (Genetic Algorithm, Bees Algorithm)
- Fitness function components for optimization

**Document Size:** 2,045 lines (added 329 lines)  
**Last Updated:** November 2, 2025  
**Status:** PHASE 3 IMPLEMENTED - Greedy Builder operational, GA and Bees Algorithm planned for future enhancement

**Document Completeness:**
- ✅ 5 Subject Types (Regular, Other Dept, Project, OEC, PEC)
- ✅ Theory Subject Scheduling (hrs_per_week + max_hrs_per_day)
- ✅ Lab Completeness (all batches get all labs weekly)
- ✅ Fixed Time Slots (OEC/PEC in Sem 7)
- ✅ Pre-Generation Validation Checklist
- ✅ Teacher Workload Calculation Formula
- ✅ Batch Synchronization (all activities)
- ✅ Working Hours (8 AM - 5 PM, Mon-Fri)
- ✅ Phase 2 Completeness Handling
- ✅ Capacity Clarification (informational only)
- ✅ **NEW:** Phase 2 Auto-Assignment Algorithm
- ✅ **NEW:** Phase 3 Greedy Builder Strategy
- ✅ **NEW:** Batch Rotation and Room Distribution Formulas
- ✅ **NEW:** Load Balancing and Conflict Detection
- ✅ **NEW:** Future Enhancement Roadmap (GA + Bees)

**Algorithm Implementation Status:**
- ✅ Phase 0 (Greedy): IMPLEMENTED and OPERATIONAL
- 🔄 Phase 1 (Genetic): PLANNED (fitness target: -50)
- 🔄 Phase 2 (Bees): PLANNED (fitness target: 0)

**Ready for Production Testing!** 🎯

**Note:** This document should be updated as algorithms are enhanced and new optimization strategies are discovered during testing and refinement phases.
