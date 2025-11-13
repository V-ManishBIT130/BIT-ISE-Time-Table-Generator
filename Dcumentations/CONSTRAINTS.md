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

### 1.2 Semester Type Separation (CRITICAL!)
**Rule:** Odd and Even semester timetables are COMPLETELY SEPARATE and generated at different times of the year.

**Academic Year Structure:**
```
First Half (Aug-Dec): ODD SEMESTERS
├── Semester 3 (Odd) - Sections: 3A, 3B, 3C
├── Semester 5 (Odd) - Sections: 5A, 5B, 5C
└── Semester 7 (Odd) - Sections: 7A, 7B, 7C

Second Half (Jan-May): EVEN SEMESTERS
├── Semester 4 (Even) - Sections: 4A, 4B, 4C
├── Semester 6 (Even) - Sections: 6A, 6B, 6C
└── Semester 8 (Even) - Sections: 8A, 8B, 8C
```

**Generation Scope:**
- **When generating ODD sems:** Include ONLY odd semester sections (3A, 3B, 3C, 5A, 5B, 5C, 7A, 7B, 7C)
- **When generating EVEN sems:** Include ONLY even semester sections (4A, 4B, 4C, 6A, 6B, 6C, 8A, 8B, 8C)
- **Never mix:** Odd and even semesters never run simultaneously

**Example:**
```
Admin Action: "Generate Timetable for Odd Semesters"

Algorithm processes:
├── ALL sections from Semester 3 (odd)
├── ALL sections from Semester 5 (odd)
├── ALL sections from Semester 7 (odd)
└── Generates conflict-free timetables for each section

Output:
├── Timetable for Section 3A ✅
├── Timetable for Section 3B ✅
├── Timetable for Section 3C ✅
├── Timetable for Section 5A ✅
├── Timetable for Section 5B ✅
├── Timetable for Section 5C ✅
├── Timetable for Section 7A ✅
├── Timetable for Section 7B ✅
└── Timetable for Section 7C ✅

All 9 timetables are globally conflict-free!
```

---

### 1.3 Timetable Generation Strategy (THE MAIN GOAL)
**Rule:** Generate SEPARATE timetable documents (one per section) in ONE algorithm run that checks conflicts across ALL sections.

**Main Goal:** **ALL CONFLICT-FREE TIMETABLES ACROSS ALL SECTIONS** ⭐

**Critical Requirements:**

**1. Cross-Section Teacher Conflict Prevention:**
```
Example:
Prof. DC teaches:
├── Data Structures → Section 3A
└── AI → Section 5A

❌ INVALID: DC scheduled at Monday 10-12 for BOTH 3A and 5A
✅ VALID: DC scheduled at Monday 10-12 for 3A, then Monday 2-4 for 5A

Algorithm MUST ensure:
- Prof. DC is never in two places at the same time
- Check ALL sections before assigning teacher to time slot
```

**2. Cross-Section Room Conflict Prevention:**
```
Example:
Lab Room ISE-301 assigned to:
├── Batch 3A1 (DSL Lab)
└── Batch 5B2 (CN Lab)

❌ INVALID: Both batches using ISE-301 at Monday 8-10 AM
✅ VALID: 3A1 uses ISE-301 Monday 8-10, 5B2 uses ISE-301 Tuesday 10-12

Algorithm MUST ensure:
- No lab room double-booking across ALL sections
- Check ALL sections before assigning room to time slot
```

**3. Cross-Section Theory Classroom Conflict Prevention:**
```
Example:
Classroom ISE-LH1 needed for:
├── Section 3B: DBMS Theory
└── Section 5A: AI Theory

❌ INVALID: Both sections using ISE-LH1 at Monday 10-12
✅ VALID: 3B uses ISE-LH1 Monday 10-12, 5A uses ISE-LH1 Tuesday 9-11

Algorithm MUST ensure:
- No classroom double-booking across ALL sections
- Check ALL sections before assigning classroom to time slot
```

**4. Individual Section Output:**
```
Output Structure:
├── One timetable document per section
├── Each timetable is complete and independent
├── But all timetables are globally conflict-free
└── Can be viewed/printed separately per section

Example:
- Section 3A timetable (standalone document)
- Section 3B timetable (standalone document)
- Section 5A timetable (standalone document)
... (all conflict-free when checked together)
```

**Implementation:**
```javascript
// Phase 3 Algorithm
function generateTimetables(semesterType) {
  // Load ALL sections of this semester type
  const sections = getSections({ sem_type: semesterType })
  // Example for 'odd': [3A, 3B, 3C, 5A, 5B, 5C, 7A, 7B, 7C]
  
  // Generate timetables for ALL sections simultaneously
  // Conflict checking spans ALL sections
  const timetables = {}
  
  for (const section of sections) {
    timetables[section.id] = {
      section_id: section.id,
      section_name: section.name,
      sem: section.sem,
      theory_slots: [],
      lab_slots: []
    }
  }
  
  // Schedule activities checking conflicts across ALL sections
  scheduleAllActivities(timetables, sections)
  
  // Save each section's timetable as separate document
  for (const sectionId in timetables) {
    saveTimetable(timetables[sectionId])
  }
  
  return timetables
}
```

**Validation:**
```javascript
// Before assigning any resource (teacher/room/classroom) at a time slot
function canAssignResource(resource, timeSlot, currentSection, allSections) {
  // Check if resource is free across ALL sections at this time
  for (const section of allSections) {
    if (isResourceBusy(resource, timeSlot, section)) {
      return false // ❌ Conflict found!
    }
  }
  return true // ✅ Safe to assign
}
```

**Benefits:**
- ✅ Zero resource conflicts across all sections
- ✅ Realistic timetables (teachers can't be in two places)
- ✅ Efficient resource utilization
- ✅ Each section gets independent timetable document
- ✅ Easy to view/print per section
- ✅ Globally consistent and conflict-free

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
  max_hrs_per_day: 2      // Maximum hours in one day (can be consecutive)
}
```

**Scheduling Strategy - Greedy with Random Distribution:**

**Priority Order:**
```
1. Regular ISE subjects (requires_teacher_assignment = true)
2. Other department subjects (is_non_ise_subject = true)
3. Project subjects (is_project = true) - lowest priority, flexible placement
```

**Key Principles:**
- ✅ Classes spread randomly across the week (avoid clustering on few days)
- ✅ Consecutive hours allowed if within max_hrs_per_day
- ✅ Split flexibly: 2+1, 1+1+1, etc. based on availability
- ✅ Sort subjects by hrs_per_week (descending) for scheduling order

**Example 1: 3 hrs/week, max 2 hrs/day**
```
Option A (Consecutive on same day):
├── Monday: 9:00-11:00 (2 hours consecutive) ✅
├── Thursday: 10:00-11:00 (1 hour)
└── Total: 3 hours spread across week

Option B (Split differently):
├── Monday: 9:00-10:00 (1 hour)
├── Wednesday: 10:00-11:00 (1 hour)
├── Friday: 2:00-3:00 (1 hour)
└── Total: 3 hours, randomly distributed

✅ Both valid - algorithm prefers random spread
```

**Example 2: 4 hrs/week, max 2 hrs/day**
```
Option A (2+2 split):
├── Tuesday: 9:00-11:00 (2 hours consecutive) ✅
├── Friday: 2:00-4:00 (2 hours consecutive) ✅
└── Total: 4 hours ✅

Option B (1+2+1 split):
├── Monday: 9:00-10:00 (1 hour)
├── Wednesday: 10:00-12:00 (2 hours consecutive) ✅
├── Friday: 3:00-4:00 (1 hour)
└── Total: 4 hours, better distribution

✅ Both valid - prefer wider spread
```

**Invalid Example:**
```
Subject: DBMS (4 hrs/week, max 2 hrs/day)

❌ Monday: 9:00-1:00 (4 hours) - Violates max_hrs_per_day!
❌ Week total: 5 hours - Exceeds hrs_per_week!
```

**Key Rules:**
- ✅ Total weekly hours MUST equal `hrs_per_week`
- ✅ Consecutive hours on same day CANNOT exceed `max_hrs_per_day`
- ✅ Random distribution preferred (shuffle time slots)
- ✅ Algorithm decides split based on:
  - Available time slots
  - Teacher availability (for ISE subjects)
  - Avoid clustering on specific days
  - Break placement constraints

**Batch Handling for Theory:**
- ✅ All batches (3A1, 3A2, 3A3) attend together as ONE section
- ✅ Full section (e.g., 60 students) in ONE classroom
- ❌ Cannot split batches into different rooms for theory

**Classroom Assignment:**
- ⏭️ Classroom assignment deferred to separate step (after theory time slots finalized)
- ℹ️ Theory scheduling focuses ONLY on time slot allocation (no classroom conflicts checked)
- ✅ Reduces constraint burden during scheduling
- ✅ Separate classroom assignment step handles room allocation with its own constraints

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
**Rule:** Lab sessions should ideally have 2 teachers supervising, but can function with 1 teacher if necessary.

**Reason:** Two teachers provide better supervision quality and hands-on assistance, but flexibility is needed to accommodate teacher availability constraints.

**Priority Order:**
1. **Ideal:** 2 qualified teachers ✅✅ (preferred)
2. **Acceptable:** 1 qualified teacher ✅ (if 2nd not available)
3. **Flagged:** 0 teachers ⚠️ (needs admin attention)

**Example:**
```
Lab Session: Data Structures Lab (DSL)
├── Batch 3A1
├── Scenario A (Ideal): Teacher 1: DC + Teacher 2: AK ✅✅
├── Scenario B (Acceptable): Teacher 1: DC only ✅
└── Scenario C (Needs Review): No teachers assigned ⚠️
```

**Implementation:**
- Teachers are assigned AFTER time slots are finalized in Phase 3
- Algorithm attempts 2 teachers first, falls back to 1 if needed
- Unassigned labs are flagged in generation report for admin review

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
**Rule:** Lab rooms are automatically assigned in Phase 2 based on equipment compatibility and even distribution strategy.

**Reason:** 
- Lab rooms are constrained by equipment/software requirements
- Automatic assignment ensures even distribution across available rooms
- Minimizes conflicts during Phase 3 scheduling
- Teachers are assigned later in Phase 3 for maximum flexibility

**Automatic Assignment Strategy:**

**Step 1: Filter Compatible Rooms**
```
For each section's lab (e.g., Section 5A, DV Lab):
├── Query dept_labs where lab_subjects_handled includes "DV Lab"
├── Result: Compatible rooms [612A, 612B, 612C, 604A]
└── These rooms have required equipment (graphics cards, visualization software)

Example Filters:
DV Lab → Rooms: [612A, 612B, 612C, 604A] (4 rooms with graphics)
CN Lab → Rooms: [ISE-301, ISE-302, ISE-303, ISE-304] (4 general rooms)
DSL Lab → Rooms: [ISE-301, ISE-302, ISE-303, ISE-304, ISE-305] (5 general rooms)
```

**Step 2: Even Distribution (Round-Robin)**
```
For each section's lab, assign rooms to batches evenly:

Section 5A, DV Lab (3 batches):
Compatible Rooms: [612A, 612B, 612C, 604A]

Assignment:
├── Batch 5A1 → Room: 612A (rooms[0 % 4] = rooms[0])
├── Batch 5A2 → Room: 612B (rooms[1 % 4] = rooms[1])
└── Batch 5A3 → Room: 612C (rooms[2 % 4] = rooms[2])

Section 5B, DV Lab (3 batches):
Compatible Rooms: [612A, 612B, 612C, 604A]

Assignment:
├── Batch 5B1 → Room: 604A (rooms[3 % 4] = rooms[3]) ← Starts from next available
├── Batch 5B2 → Room: 612A (rooms[4 % 4] = rooms[0]) ← Wraps around
└── Batch 5B3 → Room: 612B (rooms[5 % 4] = rooms[1])

✅ Even distribution: Each room used roughly equally
✅ Minimizes conflicts: Different sections tend to get different rooms
```

**Step 3: Global Room Distribution Tracking**
```javascript
// Track global room usage across all sections
roomUsageCounter = {
  "612A": 0,
  "612B": 0,
  "612C": 0,
  "604A": 0
}

// For each batch assignment, pick least-used compatible room
function assignRoom(batch, lab, compatibleRooms) {
  // Sort rooms by usage count (ascending)
  sortedRooms = compatibleRooms.sort((a, b) => 
    roomUsageCounter[a] - roomUsageCounter[b]
  )
  
  // Pick least-used room
  assignedRoom = sortedRooms[0]
  roomUsageCounter[assignedRoom]++
  
  return assignedRoom
}

Result:
├── Batch 5A1, DV Lab → 612A (usage: 0 → 1)
├── Batch 5A2, DV Lab → 612B (usage: 0 → 1)
├── Batch 5A3, DV Lab → 612C (usage: 0 → 1)
├── Batch 5B1, DV Lab → 604A (usage: 0 → 1)
├── Batch 5B2, DV Lab → 612A (usage: 1 → 2) ← Least used
└── Batch 5B3, DV Lab → 612B (usage: 1 → 2)

✅ Fair distribution across all rooms
```

**Example Output:**
```
Phase 2 Automatic Room Assignments:

Section 5A:
├── Batch 5A1, CN Lab → Room: ISE-301 ✅
├── Batch 5A2, CN Lab → Room: ISE-302 ✅
├── Batch 5A3, CN Lab → Room: ISE-303 ✅
├── Batch 5A1, DV Lab → Room: 612A ✅
├── Batch 5A2, DV Lab → Room: 612B ✅
└── Batch 5A3, DV Lab → Room: 612C ✅

Section 5B:
├── Batch 5B1, CN Lab → Room: ISE-304 ✅ (next available)
├── Batch 5B2, CN Lab → Room: ISE-301 ✅ (wrap around)
├── Batch 5B3, CN Lab → Room: ISE-302 ✅
├── Batch 5B1, DV Lab → Room: 604A ✅ (next available)
├── Batch 5B2, DV Lab → Room: 612A ✅ (wrap around, least used)
└── Batch 5B3, DV Lab → Room: 612B ✅

All assignments automatically generated!
```

**Benefits:**
- ✅ Automatic: No manual selection needed
- ✅ Equipment-compatible: Only assigns suitable rooms
- ✅ Even distribution: Rooms used fairly across sections
- ✅ Conflict minimization: Different sections likely get different rooms
- ✅ Predictable: Deterministic algorithm (repeatable results)
- ✅ Scalable: Works for any number of sections/labs/rooms

**Algorithm Implementation:**
- Location: `backend_server/algorithms/auto_lab_room_assignment.js`
- Functions:
  - `autoAssignLabRooms(semType, academicYear)` → Performs actual assignment & saves to DB
  - `previewLabRoomAssignments(semType, academicYear)` → Preview without saving (testing)

**Why Room Assignment Before Phase 3:**
1. Equipment constraints are hard (cannot be changed during scheduling)
2. Pre-assignment simplifies Phase 3 (only need to find time slots)
3. Even distribution prevents bottlenecks
4. Reduces Phase 3 complexity (fewer variables to optimize)

**Why Teachers NOT Assigned in Phase 2:**
1. Teacher availability varies with time slots (soft constraint)
2. Pre-assigning creates rigid constraints that reduce scheduling success
3. Dynamic assignment in Phase 3 maximizes flexibility
4. Teacher conflicts can be resolved by trying different teachers

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

**Parallel Lab Scheduling (Batch Rotation Strategy):**

Due to the **batch rotation formula** (`labIndex = (round + batchNum - 1) % totalLabs`), batches in the same section ALWAYS do DIFFERENT labs at the SAME time. This is not optional - it's how the rotation ensures every batch completes every lab.

**How It Works:**
```
Section 3A has 5 labs: DSL, DVP, OS, OOPS, DDCO
3 Batches: 3A1, 3A2, 3A3

Round 1 (e.g., Friday 3:00-5:00 PM):
├── Batch 3A1: DSL (labIndex = (0+1-1) % 5 = 0) → Lab #0
├── Batch 3A2: DVP (labIndex = (0+2-1) % 5 = 1) → Lab #1  
└── Batch 3A3: OS (labIndex = (0+3-1) % 5 = 2) → Lab #2

Round 2 (e.g., Monday 8:00-10:00 AM):
├── Batch 3A1: DVP (labIndex = (1+1-1) % 5 = 1) → Lab #1
├── Batch 3A2: OS (labIndex = (1+2-1) % 5 = 2) → Lab #2
└── Batch 3A3: OOPS (labIndex = (1+3-1) % 5 = 3) → Lab #3

Round 3 (e.g., Tuesday 10:00-12:00 PM):
├── Batch 3A1: OS (labIndex = (2+1-1) % 5 = 2) → Lab #2
├── Batch 3A2: OOPS (labIndex = (2+2-1) % 5 = 3) → Lab #3
└── Batch 3A3: DDCO (labIndex = (2+3-1) % 5 = 4) → Lab #4

... continues for 5 rounds total
```

**Real Example from Screenshot:**
```
Friday 3:00-5:00 PM - Section 3A:
├── Batch 3A1 → OS Lab → Room 612C → Teachers: TBD
├── Batch 3A2 → OOPS Lab → Room 612A → Teachers: TBD  
└── Batch 3A3 → DVP Lab → Room 604A → Teachers: TBD

✅ All batches doing DIFFERENT labs at SAME time (batch rotation)
✅ All batches in DIFFERENT rooms (no conflicts)
✅ Batch synchronization maintained (all in labs together)
```

**Why Batches CANNOT Do Same Lab Simultaneously:**

The batch rotation formula **mathematically guarantees** that batches are always offset by 1 lab:
- Batch 1 is on lab `(round + 1 - 1) % totalLabs = round % totalLabs`
- Batch 2 is on lab `(round + 2 - 1) % totalLabs = (round + 1) % totalLabs`
- Batch 3 is on lab `(round + 3 - 1) % totalLabs = (round + 2) % totalLabs`

So they're always doing labs at indices: `round`, `round+1`, `round+2` (mod totalLabs) - never the same!

**Critical Phase 2 Requirement:**

Since batches do DIFFERENT labs in each round, Phase 2 MUST assign DIFFERENT rooms to each batch for their respective labs in that round:

```
Phase 2 Room Assignment (Rotation-Aware):

Round 1:
├── Batch 3A1 needs DSL → Assign Room ISE-301 ✅
├── Batch 3A2 needs DVP → Assign Room 604A ✅ (DIFFERENT from ISE-301)
└── Batch 3A3 needs OS → Assign Room 612C ✅ (DIFFERENT from both)

Round 2:
├── Batch 3A1 needs DVP → Assign Room 604B ✅
├── Batch 3A2 needs OS → Assign Room 612A ✅ (DIFFERENT from 604B)
└── Batch 3A3 needs OOPS → Assign Room ISE-302 ✅ (DIFFERENT from both)

✅ No room conflicts within any round!
✅ Each batch gets appropriate equipment for their specific lab
✅ Phase 3 can schedule any round at any time without conflicts
```

**Algorithm Implementation:**
- Phase 2: Simulate batch rotation, assign rooms per batch per lab
- Within each round: Ensure all 3 batches get DIFFERENT rooms
- Across rounds: Rooms can be reused (different time slots)
- Phase 3: Pick time slots knowing rooms are already conflict-free

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

### 4.8 No Consecutive Lab Sessions (CRITICAL!)
**Rule:** A section CANNOT have lab sessions in consecutive time slots on the same day.

**Reason:** Lab sessions are physically and mentally intensive. Students need a break or theory class between lab sessions for better learning and to avoid fatigue.

**Invalid Examples:**
```
❌ INVALID - Section 3A Schedule (Monday):
├── 8:00-10:00: Lab Session (DSL)
└── 10:00-12:00: Lab Session (DBMS Lab) ❌ CONSECUTIVE!

❌ INVALID - Section 5A Schedule (Tuesday):
├── 10:00-12:00: Lab Session (CN Lab)
└── 12:00-2:00: Lab Session (DV Lab) ❌ CONSECUTIVE!

❌ INVALID - Section 7A Schedule (Wednesday):
├── 2:00-4:00: Lab Session (AI Lab)
└── 4:00-6:00: Lab Session (ML Lab) ❌ CONSECUTIVE!
```

**Valid Examples:**
```
✅ VALID - Section 3A Schedule (Monday):
├── 8:00-10:00: Lab Session (DSL)
├── 10:00-10:30: Break
├── 10:30-12:30: Theory Class (Data Structures)
└── 2:00-4:00: Lab Session (DBMS Lab) ✅ (Not consecutive, gap with theory)

✅ VALID - Section 5A Schedule (Tuesday):
├── 8:00-10:00: Theory Class (AI)
├── 10:00-12:00: Lab Session (CN Lab) ✅
├── 12:00-1:00: Theory Class (DBMS)
└── 2:00-4:00: Lab Session (DV Lab) ✅ (Not consecutive, gap with theory)

✅ VALID - Section 7A Schedule (Wednesday):
├── 8:00-10:00: Lab Session (AI Lab)
├── 10:00-10:30: Break
├── 10:30-12:30: Theory Classes
├── 12:30-1:00: Break
└── 1:00-3:00: Theory Classes ✅ (No second lab session today)
```

**Definition of "Consecutive":**
```
Consecutive = Lab sessions with NO gap or ONLY a break (≤30 min) between them

Examples:
├── Lab 8-10, Lab 10-12 → ❌ Consecutive (no gap)
├── Lab 8-10, Break 10-10:30, Lab 10:30-12:30 → ❌ Consecutive (only break)
├── Lab 8-10, Theory 10-12, Lab 12-2 → ✅ Not consecutive (theory between)
└── Lab 8-10, Theory 10-10:30, Lab 10:30-12:30 → ✅ Not consecutive (theory between)
```

**Algorithm Validation:**
```javascript
function hasConsecutiveLabSessions(section, day, schedule) {
  const daySlots = schedule.filter(slot => slot.day === day)
  daySlots.sort((a, b) => a.start_time - b.start_time)
  
  for (let i = 0; i < daySlots.length - 1; i++) {
    const current = daySlots[i]
    const next = daySlots[i + 1]
    
    // Check if both are lab sessions
    if (current.type === 'lab' && next.type === 'lab') {
      // Check if they're consecutive (end time of current = start time of next)
      // OR only a short break (≤30 min) between them
      const gap = calculateGap(current.end_time, next.start_time)
      
      if (gap <= 30) {
        return true // ❌ Consecutive labs detected!
      }
    }
  }
  
  return false // ✅ No consecutive labs
}
```

**Implementation:**
- Before assigning a lab session, check if previous/next slot is also a lab
- If yes, ensure there's a theory class (>30 min) between them
- Reject assignment if it creates consecutive lab sessions
- Validation applies within same section's daily schedule

**Benefits:**
- ✅ Prevents student fatigue from continuous lab work
- ✅ Allows mental break between hands-on sessions
- ✅ Better learning outcomes with mixed schedule
- ✅ More realistic and humane timetable

---

### 4.9 Daily Lab Limit (Updated Nov 13, 2025)
**Rule:** A section can have MAXIMUM 3 lab sessions per day (updated from 2).

**Reason:** Faculty input confirmed 3 labs/day is manageable with proper gaps (no consecutive labs).

**Valid Examples:**
```
✅ VALID - Section 3A Schedule (Monday):
├── 8:00-10:00: Lab Session (DSL)
├── 10:00-12:00: Theory Classes
├── 12:00-14:00: Lab Session (DBMS Lab)
├── 14:00-16:00: Theory Classes
└── 16:00-18:00: Lab Session (OOPS Lab) ✅ 3 labs with gaps

✅ VALID - Section 5A Schedule (Tuesday):
├── 8:00-10:00: Lab Session (CN Lab)
├── 10:00-12:00: Theory Classes
└── 14:00-16:00: Lab Session (AI Lab) ✅ Only 2 labs (under limit)
```

**Invalid Examples:**
```
❌ INVALID - Section 3A Schedule (Wednesday):
├── 8:00-10:00: Lab Session 1
├── 10:00-12:00: Theory
├── 12:00-14:00: Lab Session 2
├── 14:00-16:00: Theory
└── 16:00-18:00: Lab Session 3
    + Trying to add 4th lab ❌ EXCEEDS LIMIT
```

**Implementation:**
- Algorithm counts labs scheduled per day for each section
- Before adding new lab, checks if count < 3
- Rejects slot if limit would be exceeded
- Ensures non-consecutive constraint still enforced

**Result:** Increased from 2 to 3 labs/day achieved 100% success rate (27/27 labs scheduled) while maintaining quality (no consecutive labs).

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

**Scenario B: Labs with Batch Rotation (Most Common)** ⭐
```
Friday 3:00-5:00 PM - Section 3A (Round 1):
├── Batch 3A1 → OS Lab → Room 612C → DC + AK
├── Batch 3A2 → OOPS Lab → Room 612A → Rajeev + Suman
└── Batch 3A3 → DVP Lab → Room 604A → Arjun + Priya

✅ All batches doing DIFFERENT labs at SAME time in DIFFERENT rooms
✅ This is the natural result of batch rotation formula
✅ Each batch progresses through different lab in the sequence
```

**Why Batch Rotation Creates Different Labs:**
```
The batch rotation formula: labIndex = (round + batchNum - 1) % totalLabs

Mathematically guarantees batches are offset:
├── Batch 1 does lab at index: round
├── Batch 2 does lab at index: round + 1
└── Batch 3 does lab at index: round + 2

They can NEVER do the same lab simultaneously!

Example with 5 labs (DSL, DVP, OS, OOPS, DDCO):
Round 0: Batch 1→DSL(0), Batch 2→DVP(1), Batch 3→OS(2)
Round 1: Batch 1→DVP(1), Batch 2→OS(2), Batch 3→OOPS(3)
Round 2: Batch 1→OS(2), Batch 2→OOPS(3), Batch 3→DDCO(4)
... always different labs per round!
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
- ✅ Labs: All in labs at SAME time (batch rotation ensures different labs)
- ❌ Never: One batch busy, another free, another in different activity type
- ⚠️ **Note:** Batches doing the SAME lab simultaneously is impossible with batch rotation

**Implementation:**
- `lab_session_model.js`: Groups all batches under single time slot
- Pre-save validation ensures all batches present
- Unique index: `(section_id, scheduled_day, scheduled_start_time)`
- Batch rotation formula enforced in Phase 3 scheduling

### 5.2 Working Hours and Time Structure
**Rule:** Classes operate within department working hours: 8:00 AM to 5:00 PM, Monday through Friday.

**Working Schedule:**
```
Days: Monday, Tuesday, Wednesday, Thursday, Friday
Hours: 8:00 AM - 5:00 PM (9 hours total per day)
Weekends: Saturday, Sunday (NO classes)
```

**Time Slot Flexibility:**
- ✅ Algorithm allocates slots in fixed 1-hour blocks (8-9, 9-10, 10-11, etc.)
- ✅ Theory classes: 1-hour blocks (can be consecutive based on max_hrs_per_day)
- ✅ Labs: Always 2-hour blocks
- ✅ Randomized distribution: Classes spread across the week to avoid clustering

**Time Structure:**
```
08:00-09:00 → Slot 1
09:00-10:00 → Slot 2
10:00-11:00 → Slot 3
11:00-11:30 → Break 1 (default, adjustable)
11:30-12:30 → Slot 4
12:30-13:00 → Slot 5
13:00-13:30 → Break 2 (default, adjustable)
13:30-14:30 → Slot 6
14:30-15:30 → Slot 7
15:30-16:30 → Slot 8
16:30-17:00 → Buffer/End of day
```

**Note:** 
- 1-hour time slots provide standard scheduling granularity
- Breaks are inserted during theory scheduling (not post-processing)
- Classes are randomly distributed across the week to prevent clustering

### 5.3 Break Management (CRITICAL!)
**Rule:** Breaks are inserted DURING theory scheduling (Step 4) based on default timings and lab schedule conflicts.

**Default Break Timings:**
```
Break 1 (Morning): 11:00 AM - 11:30 AM
Break 2 (Afternoon): 1:30 PM - 2:00 PM
```

**Break Adjustment Logic:**
```
For each section, each day:
  1. Start with default break slots (11:00-11:30, 13:30-14:00)
  2. If lab already scheduled during default break time:
     → Adjust break to different time
     → Ensure break comes after at least 2 hours of continuous classes
  3. Breaks are 30 minutes, max 2 per day
  4. Theory classes scheduled around breaks (not over them)
```

**Example Scenarios:**

**Scenario A: No Lab Conflicts**
```
Monday - Section 3A:
├── 08:00-10:00: Lab (DSL)
├── 10:00-11:00: Theory (DS)
├── 11:00-11:30: BREAK 1 ✅ (default time, no conflict)
├── 11:30-12:30: Theory (DBMS)
├── 12:30-13:00: Theory (COA)
├── 13:00-13:30: BREAK 2 ✅ (default time, no conflict)
└── 13:30-15:30: Lab (CN Lab)
```

**Scenario B: Lab Conflicts with Default Break**
```
Tuesday - Section 5A:
├── 08:00-09:00: Theory (AI)
├── 09:00-10:00: Theory (ML)
├── 10:00-12:00: Lab (AI Lab) ⚠️ (conflicts with 11:00-11:30 break)
├── 12:00-12:30: BREAK 1 ✅ (adjusted from 11:00 to 12:00)
├── 12:30-13:00: Theory (DBMS)
├── 13:00-13:30: BREAK 2 ✅ (default time works)
└── 13:30-15:30: Lab (DV Lab)

Logic: Lab at 10-12 conflicts with default 11-11:30 break
       → Move break to 12:00-12:30 (after 2 hrs of classes + lab)
```

**Break Constraints:**
- ✅ Exactly 30 minutes each
- ✅ Maximum 2 per day
- ✅ After at least 2 hours of continuous classes (if adjusted)
- ✅ Avoid conflicts with labs
- ✅ Consecutive theory classes allowed (based on max_hrs_per_day)

**Implementation:**
```javascript
// During theory scheduling (Step 4):
function getAvailableBreakSlots(section, day, labSlots) {
  const defaultBreaks = [
    { start: "11:00", end: "11:30" },
    { start: "13:30", end: "14:00" }
  ]
  
  // Check if labs conflict with default breaks
  const availableBreaks = []
  for (const breakSlot of defaultBreaks) {
    if (!hasLabConflict(labSlots, day, breakSlot.start, breakSlot.end)) {
      availableBreaks.push(breakSlot)
    }
  }
  
  // If conflict, find alternative slots after 2 hrs of classes
  if (availableBreaks.length < 2) {
    // Adjust break placement logic...
  }
  
  return availableBreaks
}
```

**Benefits:**
- ✅ Proactive break management during scheduling (not post-processing)
- ✅ Default breaks provide consistency when possible
- ✅ Flexible adjustment when labs conflict
- ✅ Ensures students get breaks after sustained class periods

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

### 8.2 Lab Room Assignment per Batch
**Rule:** Each lab for a specific batch must have exactly ONE lab room assigned in Phase 2.

**Example:**
```
✅ Valid:
Lab: DSL
Batch: 3A1
Lab Room: ISE-301

❌ Invalid:
Lab: DSL
Batch: 3A1
Multiple Room Assignments:
├── Room: ISE-301
└── Room: ISE-302 (Duplicate!)
```

**Note:** Teachers are NOT assigned in Phase 2. They are dynamically assigned in Phase 3 after time slots are finalized.

**Implementation:**
- Unique index on `(lab_id, sem, sem_type, section, batch_number)`
- Only `assigned_lab_room` field required in Phase 2
- Teacher fields (`teacher1_id`, `teacher2_id`) added during Phase 3

### 8.3 Teacher Eligibility Check
**Rule:** Before assignment in Phase 3, verify teacher has declared capability for that lab.

**Example:**
```
Assignment Request (Phase 3):
├── Lab: Data Structures Lab (DSL)
├── Batch: 3A1
└── Candidate Teacher: Prof. DC

Check:
├── Does DC's labs_handled include "DSL"?
└── If NO → ❌ Skip this teacher, try next
    If YES → ✅ Assign teacher
```

**Implementation:** 
- Phase 3 algorithm filters teachers by capability before assignment
- No backend validation needed in Phase 2 (teachers not assigned yet)

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
└── Lab Room Assignments (FULLY AUTOMATIC based on equipment & even distribution)

AUTOMATIC LAB ROOM ASSIGNMENT:
Algorithm automatically assigns lab rooms based on:
1. Equipment compatibility (query dept_labs.lab_subjects_handled)
2. Even distribution (global room usage counter)
3. Round-robin allocation (spreads load across rooms)

Output: Assignment data (teachers for theory, rooms for labs, NO time slots yet)

Example - AUTOMATIC Room Assignment:
Section 5A, DV Lab (3 batches):
├── Query: dept_labs where "DV Lab" in lab_subjects_handled
├── Compatible Rooms: [612A, 612B, 612C, 604A]
├── Batch 5A1: Room 612A ✅ (auto-assigned, least used)
├── Batch 5A2: Room 612B ✅ (auto-assigned, next least used)
└── Batch 5A3: Room 612C ✅ (auto-assigned, next least used)

Section 5B, DV Lab (3 batches):
├── Batch 5B1: Room 604A ✅ (auto-assigned, next in rotation)
├── Batch 5B2: Room 612A ✅ (auto-assigned, wrap around)
└── Batch 5B3: Room 612B ✅ (auto-assigned, wrap around)

Benefits:
✅ No manual input needed
✅ Even distribution prevents bottlenecks
✅ Equipment-compatible rooms guaranteed
✅ Minimizes conflicts for Phase 3 scheduling

Status: Rooms FIXED (automatic), Teachers pending (Phase 3), Time slots pending (Phase 3)
```

**Phase 3: Timetable Generation (Automated)**
```
Input: Phase 2 assignments (theory teachers + lab rooms already decided)

Algorithm: 
├── Step 1: Find optimal TIME SLOTS for all activities
├── Step 2: Assign teachers to labs (2 if possible, 1 if needed)
└── Constraint satisfaction approach

Output: Complete timetable with time slots and lab teachers

Example:
Monday 8:30-10:30 - Section 5A:
├── Batch 5A1 → DV → Room 612A (from Phase 2) → Teachers: DC+AK (Phase 3)
├── Batch 5A2 → DV → Room 612B (from Phase 2) → Teachers: Rajeev+Suman (Phase 3)
└── Batch 5A3 → DV → Room 604A (from Phase 2) → Teachers: Arjun+Priya (Phase 3)

Algorithm decided:
├── Time slot: Monday 8:30-10:30
└── Lab teachers: Dynamically assigned based on availability
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
      ✅ Check: Lab room automatically assigned?
      ❌ Missing: Flag batch as unassigned (should not happen with automatic assignment)
      
Note: Room assignment is AUTOMATIC in Phase 2
      Algorithm ensures all batches get equipment-compatible rooms
      Teachers are NOT checked in Phase 2 validation
      (Teachers assigned dynamically in Phase 3)
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
    lab_rooms: [
      { section: "5A", batch: "5A2", lab: "CN Lab", reason: "No room assigned" },
      { section: "5A", batch: "5A3", lab: "DV Lab", reason: "No room assigned" }
    ],
    pec_options: [
      { option: "Advanced AI", reason: "No teacher assigned" }
    ]
  }
}

// Show to admin:
"⚠️ Phase 2 Incomplete! The following items are not assigned:
- Section 3A: Data Structures (no teacher)
- Section 5A, Batch 5A2: CN Lab (no room)
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
- Lab teachers assigned dynamically in Phase 3 (even if rooms missing, will be flagged)

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
  lab_hours = Σ(2 hours × number_of_lab_sessions_assigned)
  
Note: Lab teachers are assigned in Phase 3 after time slots are finalized
  
Example - Prof. DC (after Phase 3 generation):
├── DSL (Batch 3A1): 2 hours (assigned as teacher1)
├── DSL (Batch 3B2): 2 hours (assigned as teacher2)
├── CN Lab (Batch 5A1): 2 hours (assigned as teacher1)
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

Lab Assignments (Phase 3):
├── DSL - Batch 3A1: 2 hours (teacher1)
├── DSL - Batch 3B2: 2 hours (teacher2)
├── CN Lab - Batch 5A1: 2 hours (teacher1)
└── Subtotal: 6 hours

Note: Some labs may have only 1 teacher if 2nd unavailable

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
- `Lab_Room_Assignments` - Lab room assignments per batch (Phase 2)
- `Lab_Sessions` - Scheduled lab sessions with time slots (Phase 3)
- `Timetables` - Final timetable per section (Phase 3 output)

### 12.2 Timetable Model Structure
**Purpose:** Store the complete generated timetable for each section.

**Document Per Section:**
```javascript
{
  _id: ObjectId,
  section_id: ObjectId,  // Reference to ISE_Sections
  section_name: "3A",
  sem: 3,
  sem_type: "odd",
  academic_year: "2024-25",
  generation_date: Date,
  generation_metadata: {
    algorithm: "greedy",
    fitness_score: -150,
    generation_time_ms: 5000,
    teacher_assignment_summary: {
      total_lab_sessions: 15,
      sessions_with_2_teachers: 12,
      sessions_with_1_teacher: 2,
      sessions_with_0_teachers: 1
    }
  },
  
  theory_slots: [
    {
      subject_id: ObjectId,
      subject_name: "Data Structures",
      subject_shortform: "DS",
      teacher_id: ObjectId,
      teacher_name: "Prof. Deeksha Chandra",
      teacher_shortform: "DC",
      classroom_id: ObjectId,
      classroom_name: "ISE-LH1",
      day: "Monday",
      start_time: "10:00",
      end_time: "12:00",
      duration_hours: 2
    }
    // ... more theory slots
  ],
  
  lab_slots: [
    {
      slot_type: "multi_batch_lab",
      day: "Monday",
      start_time: "08:00",
      end_time: "10:00",
      duration_hours: 2,
      batches: [
        {
          batch_number: 1,
          batch_name: "3A1",
          lab_id: ObjectId,
          lab_name: "Data Structures Lab",
          lab_shortform: "DSL",
          lab_room_id: ObjectId,
          lab_room_name: "ISE-301",
          teacher1_id: ObjectId,
          teacher1_name: "Prof. DC",
          teacher1_shortform: "DC",
          teacher2_id: ObjectId,
          teacher2_name: "Prof. AK",
          teacher2_shortform: "AK",
          teacher_status: "2_teachers"
        },
        {
          batch_number: 2,
          batch_name: "3A2",
          lab_id: ObjectId,
          lab_name: "Data Structures Lab",
          lab_shortform: "DSL",
          lab_room_id: ObjectId,
          lab_room_name: "ISE-302",
          teacher1_id: ObjectId,
          teacher1_name: "Prof. Rajeev",
          teacher1_shortform: "RJ",
          teacher2_id: null,
          teacher2_name: null,
          teacher2_shortform: null,
          teacher_status: "1_teacher"
        },
        {
          batch_number: 3,
          batch_name: "3A3",
          lab_id: ObjectId,
          lab_name: "Data Structures Lab",
          lab_shortform: "DSL",
          lab_room_id: ObjectId,
          lab_room_name: "ISE-303",
          teacher1_id: ObjectId,
          teacher1_name: "Prof. Suman",
          teacher1_shortform: "SM",
          teacher2_id: ObjectId,
          teacher2_name: "Prof. Priya",
          teacher2_shortform: "PY",
          teacher_status: "2_teachers"
        }
      ]
    }
    // ... more lab slots
  ],
  
  flagged_sessions: [
    {
      type: "lab",
      batch_name: "3A2",
      lab_name: "DBMS Lab",
      day: "Wednesday",
      start_time: "14:00",
      issue: "Only 1 teacher assigned (ideal: 2)",
      severity: "warning"
    }
  ]
}
```

**Indexes:**
```javascript
// Unique: one timetable per section per semester type per academic year
{ section_id: 1, sem_type: 1, academic_year: 1 }, { unique: true }

// Query optimization: Find all timetables for a semester type
{ sem_type: 1, academic_year: 1 }

// Query optimization: Find timetable by section
{ section_id: 1 }
```

**Benefits:**
- ✅ One document = one section's complete timetable
- ✅ Easy to retrieve individual section timetables
- ✅ Complete information for display/printing
- ✅ Metadata tracks generation quality
- ✅ Flagged sessions for admin review
- ✅ Historical tracking (by academic year)

### 12.3 Unique Indexes
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

// Prevent duplicate lab room assignments per batch
{ lab_id: 1, sem: 1, sem_type: 1, section: 1, batch_number: 1 } // Unique

// Prevent duplicate lab sessions per time slot
{ section_id: 1, scheduled_day: 1, scheduled_start_time: 1 } // Unique

// Prevent duplicate timetables per section per semester type per year
{ section_id: 1, sem_type: 1, academic_year: 1 } // Unique
```

### 12.4 Pre-Save Validations
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

### 13.1 Phase 2 Lab Room Assignment Algorithm
**Purpose:** Assign lab rooms to batches based on equipment compatibility.

**Algorithm Strategy:**
```javascript
For each section:
  For each syllabus lab:
    For each batch (1 to 3):
      1. Filter rooms by equipment compatibility (lab_subjects_handled)
      2. Use round-robin room assignment based on batch number
         → Batch 1: Room[0], Batch 2: Room[1], Batch 3: Room[2]
      3. Save assignment: (section, batch, lab, 1 room)
```

**Critical Insight - Room Rotation per Batch:**
```
Example: CN Lab for Section 5A
├── Batch 5A1 → Room: ISE-301 (rooms[0])
├── Batch 5A2 → Room: ISE-302 (rooms[1])
└── Batch 5A3 → Room: ISE-303 (rooms[2])

WHY: Ensures each batch gets a different room for the same lab
BENEFIT: No room conflicts when batches do same lab in parallel
```

**Room Assignment Strategy:**
- Filter rooms by lab support (`lab_subjects_handled` includes target lab)
- Sort rooms alphabetically for consistency
- Use modulo operator: `roomIndex = (batchNumber - 1) % suitableRooms.length`
- Ensures different rooms for different batches of same lab

**Output:** Complete `Lab_Room_Assignments` collection with all (section, batch, lab, room) combinations.

**Note:** Teachers are NOT assigned in Phase 2. They are dynamically assigned in Phase 3 after time slots are finalized.

---

### 13.2 Phase 3 Timetable Generation Algorithm (Greedy Builder)
**Purpose:** Find optimal TIME SLOTS for all theory subjects and labs, then assign teachers to labs.

**Algorithm Architecture:**
```
Phase 0: Greedy Initialization (Current Implementation)
├── Step A: Generate time slots for all activities
├── Step B: Assign teachers to labs dynamically
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
// NO TEACHERS ASSIGNED YET - only time slots and rooms

BATCH ROTATION STRATEGY (CRITICAL!):
For each time slot round:
  For each batch:
    labIndex = (round + batchIndex) % batch.labs.length
    Schedule: batch[labIndex] at this time slot

EXAMPLE: Section 5A has 2 labs (CN, DV)
Round 1:
├── Batch 5A1: CN Lab (labs[0]) → Room: ISE-301 (Phase 2)
├── Batch 5A2: DV Lab (labs[1]) → Room: 612B (Phase 2)
└── Batch 5A3: CN Lab (labs[0]) → Room: ISE-302 (Phase 2)

Round 2:
├── Batch 5A1: DV Lab (labs[1]) → Room: 612A (Phase 2)
├── Batch 5A2: CN Lab (labs[0]) → Room: ISE-303 (Phase 2)
└── Batch 5A3: DV Lab (labs[1]) → Room: 612C (Phase 2)

Result: All batches complete all labs, no duplicates!
Note: Rooms from Phase 2, Teachers assigned in Step 4
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
3. Pick first available (no room conflicts - rooms already assigned)
4. Teachers NOT checked yet (assigned in Step 4)
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

**Step 4: Assign Teachers to Labs (After All Slots Finalized)**
```javascript
// All time slots are now finalized
// Now assign teachers to each lab session

For each lab_session in timetable:
  qualified_teachers = getQualifiedTeachers(lab_session.lab_id)
  // Filter teachers who have this lab in labs_handled
  
  available_teachers = qualified_teachers.filter(teacher => {
    return !hasConflict(teacher, lab_session.day, lab_session.start_time)
  })
  
  // Sort by current workload (ascending) - fair distribution
  available_teachers.sort((a, b) => a.workload - b.workload)
  
  // Try to assign 2 teachers (ideal)
  if (available_teachers.length >= 2) {
    lab_session.teacher1_id = available_teachers[0]
    lab_session.teacher2_id = available_teachers[1]
    lab_session.teacher_status = "2_teachers" ✅✅
  }
  // Fallback: Assign 1 teacher (acceptable)
  else if (available_teachers.length === 1) {
    lab_session.teacher1_id = available_teachers[0]
    lab_session.teacher2_id = null
    lab_session.teacher_status = "1_teacher" ✅
  }
  // No teachers available (flag for admin)
  else {
    lab_session.teacher1_id = null
    lab_session.teacher2_id = null
    lab_session.teacher_status = "no_teachers" ⚠️
    flagForReview.push(lab_session)
  }
```

**Teacher Assignment Report:**
```
Lab Teacher Assignment Summary:
├── Total Lab Sessions: 45
├── Sessions with 2 Teachers: 38 ✅✅ (84%)
├── Sessions with 1 Teacher: 5 ✅ (11%)
└── Sessions with 0 Teachers: 2 ⚠️ (5%) - Needs Admin Review

Flagged Sessions (Needs Review):
1. Section 5A, Batch 5A3, CN Lab, Monday 8:30-10:30
   → No qualified teachers available
   → Suggestion: Reassign time slot or add teacher capability

2. Section 7B, Batch 7B2, AI Lab, Friday 2:00-4:00
   → No qualified teachers available
   → Suggestion: Reassign time slot or add teacher capability
```

**Conflict Detection (Updated):**
```javascript
checkSlotConflicts(timetable, assignment, slot, type):
  
  // Type: 'theory' or 'lab'
  
  // Check 1: Teacher conflict (for theory only in Steps 1-3)
  - Teacher already teaching another subject at same time?
  - For labs: Teachers not checked during slot assignment (Step 2)
                Teachers checked during teacher assignment (Step 4)
  
  // Check 2: Room conflict
  - Room already occupied at same time?
  - For labs: Check assigned lab room (from Phase 2)
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
    fitness_score: -200 (approximate),
    teacher_assignment_summary: {
      total_lab_sessions: 45,
      sessions_with_2_teachers: 38,
      sessions_with_1_teacher: 5,
      sessions_with_0_teachers: 2
    }
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
          teacher1_id, teacher2_id,  // Assigned in Step 4 (may be null)
          teacher1_name, teacher2_name,
          teacher1_shortform, teacher2_shortform,
          teacher_status,  // "2_teachers", "1_teacher", or "no_teachers"
          lab_room_id, lab_room_name  // From Phase 2
        }
      ],
      day, start_time, end_time, duration_hours: 2
    }
  ],
  
  flagged_sessions: [
    {
      section, batch, lab, day, start_time,
      issue: "No qualified teachers available",
      suggestions: ["Reassign time slot", "Add teacher capability"]
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

### Top 17 Most Important Constraints:

1. **Semester Scope:** Only semesters 3-8 (ISE responsibility)
2. **Semester Type Separation:** Odd and even sems completely separate, generated at different times
3. **Cross-Section Conflict-Free:** ALL sections globally conflict-free (teachers, rooms, classrooms)
4. **Individual Section Timetables:** Separate document per section, but generated in ONE algorithm run
5. **Batch Synchronization:** All batches of a section must be together in time (same OR different labs)
6. **Lab Teachers:** Ideal: 2 teachers per lab, Acceptable: 1 teacher, Flagged: 0 teachers (assigned in Phase 3)
7. **Lab Duration:** Always 2 hours (no exceptions)
8. **No Consecutive Labs:** Section cannot have lab sessions back-to-back on same day ⚠️ NEW
9. **Break Management:** 1-2 breaks per day (30 min each), try for one before/after noon ⚠️ NEW
10. **Lab Equipment Requirements:** Labs need specific rooms based on equipment/software
11. **Lab Room Assignment in Phase 2:** Rooms AUTOMATICALLY assigned (equipment compatibility + even distribution), Teachers in Phase 3
12. **Batch Rotation Strategy:** Batches rotate through labs using formula: `labIndex = (round + batchNumber) % totalLabs`
13. **Room Rotation per Batch:** Different batches get different rooms: `roomIndex = (batchNumber - 1) % suitableRooms.length`
14. **Teacher Assignment Flexibility:** Teachers assigned dynamically in Phase 3 after time slots finalized
15. **Project Subjects:** Time allocation only, no teacher/classroom assignment
16. **Batch Naming:** Include semester prefix (3A1, not A1)
17. **Three-Phase Workflow:** Master Data → Room Assignments → Generation (Time Slots + Lab Teachers)

### 🔧 Critical Implementation Details:

**Algorithm Strategies:**
- ⚠️ **Semester Type Separation:** Generate all odd OR all even semester sections in one run (never mixed)
- ⚠️ **Global Conflict Checking:** Check teacher/room/classroom availability across ALL sections before assignment
- ⚠️ **Individual Section Output:** Save separate timetable document per section (globally conflict-free)
- ⚠️ **Batch Rotation Formula:** `labIndex = (currentRound + batchNumber) % totalLabs` ensures all batches complete all labs
- ⚠️ **Room Distribution:** `roomIndex = (batchNumber - 1) % suitableRooms.length` prevents room conflicts in parallel
- ⚠️ **Load Balancing:** Algorithm sorts time slots by day load (ascending) to distribute workload evenly
- ⚠️ **Greedy Strategy:** Schedule hardest items first (labs before theory, high hrs_per_week first)
- ⚠️ **No Consecutive Labs:** Validate no back-to-back lab sessions for same section on same day
- ⚠️ **Break Management:** Ensure 1-2 breaks (30 min each) per day, distributed before/after noon
- ⚠️ **Teacher Assignment Post-Scheduling:** Teachers assigned AFTER all time slots finalized (Step 4)
- ⚠️ **Teacher Priority:** Try 2 teachers first, fall back to 1 if needed, flag if none available
- ⚠️ **Constraint Satisfaction:** Validate room conflicts, batch sync, consecutive labs during slot assignment

**Phase 2 Room Assignment:**
- ✅ Assigns only lab rooms based on equipment compatibility
- ✅ Fair distribution: Rotates rooms across batches
- ✅ Zero room conflicts guaranteed: Different batches get different rooms for same lab
- ✅ Output: Complete `Lab_Room_Assignments` collection ready for Phase 3
- ❌ No teacher assignment in Phase 2 (deferred to Phase 3 for flexibility)

**Phase 3 Greedy Builder:**
- ✅ Step 1: Block fixed slots (OEC/PEC in Sem 7)
- ✅ Step 2: Schedule labs using batch rotation strategy (rooms from Phase 2)
- ✅ Step 3: Schedule theory using load balancing and hour splitting
- ✅ Step 4: Assign teachers to labs (2 if possible, 1 if needed, flag if none)
- ✅ Result: Complete timetable with all slots + dynamic teacher assignments
- ✅ Report: Teacher assignment summary with flagged sessions
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

**Version:** 5.0 (Cross-Section Conflict-Free + Break & Lab Constraints) 🚀  
**Major Update:** Added global conflict-free generation across all sections, break management, and consecutive lab prevention.

**Key Changes:**
- ✅ **Semester Type Separation:** Odd/even sems completely separate, generated at different times
- ✅ **Cross-Section Conflict-Free:** THE MAIN GOAL - all sections globally conflict-free
- ✅ **Individual Section Timetables:** Separate document per section, generated in ONE algorithm run
- ✅ **Global Resource Checking:** Teachers, rooms, classrooms checked across ALL sections
- ✅ **Break Management:** 1-2 breaks per day (30 min each), distributed before/after noon
- ✅ **No Consecutive Labs:** Section cannot have back-to-back lab sessions on same day
- ✅ **Timetable Model:** New model to store individual section timetables
- ✅ **Back-to-Back Classes:** Allowed if schedule is tight (only 1 break acceptable)

**New Constraints Added:**
1. **Section 1.2:** Semester Type Separation (odd/even never mixed)
2. **Section 1.3:** Timetable Generation Strategy (cross-section conflict-free)
3. **Section 4.8:** No Consecutive Lab Sessions
4. **Section 5.3:** Break Management (updated with flexible 1-2 breaks)
5. **Section 12.2:** Timetable Model Structure

**Algorithm Updates:**
- Generate for ALL sections of semester type in ONE run
- Check conflicts across ALL sections (not just within section)
- Validate no consecutive lab sessions
- Ensure break distribution (1-2 per day, 30 min each)
- Save individual timetable per section
- Global conflict validation before any assignment

**Document Size:** 2,300+ lines  
**Last Updated:** November 3, 2025  
**Status:** PHASE 3 UPDATED - Cross-section conflict-free generation with break & lab constraints

**Document Completeness:**
- ✅ 5 Subject Types (Regular, Other Dept, Project, OEC, PEC)
- ✅ Theory Subject Scheduling (hrs_per_week + max_hrs_per_day)
- ✅ Lab Completeness (all batches get all labs weekly)
- ✅ **NEW:** No Consecutive Lab Sessions
- ✅ Fixed Time Slots (OEC/PEC in Sem 7)
- ✅ Pre-Generation Validation Checklist
- ✅ Teacher Workload Calculation Formula
- ✅ Batch Synchronization (all activities)
- ✅ Working Hours (8 AM - 5 PM, Mon-Fri)
- ✅ **NEW:** Break Management (1-2 breaks, 30 min each)
- ✅ **NEW:** Cross-Section Conflict-Free Generation
- ✅ **NEW:** Individual Section Timetables
- ✅ Phase 2 Lab Room Assignment Algorithm
- ✅ Phase 3 Greedy Builder Strategy (4-step process)
- ✅ Flexible Teacher Assignment (Step 4)
- ✅ **NEW:** Timetable Model for output storage

**Algorithm Implementation Status:**
- ✅ Phase 0 (Greedy): UPDATED - Global conflict checking + break management + no consecutive labs
- 🔄 Phase 1 (Genetic): PLANNED (fitness target: -50)
- 🔄 Phase 2 (Bees): PLANNED (fitness target: 0)

**Ready for Implementation!** 🎯

**Critical Requirements for Implementation:**
1. 🎯 **Main Goal:** ALL CONFLICT-FREE TIMETABLES ACROSS ALL SECTIONS
2. ⚠️ Generate all odd semester sections in ONE algorithm run (or all even)
3. ⚠️ Check teacher availability across ALL sections before assignment
4. ⚠️ Check room availability across ALL sections before assignment
5. ⚠️ Check classroom availability across ALL sections before assignment
6. ⚠️ Validate no consecutive lab sessions within section's daily schedule
7. ⚠️ Ensure 1-2 breaks per day (30 min each), distributed before/after noon
8. ⚠️ Save separate timetable document for each section
9. ⚠️ All timetables globally conflict-free

---

## 🚀 **15. PHASE 3 IMPLEMENTATION STRUCTURE**

### 15.1 Optimized Algorithm Flow

**Your Proposed Approach:**
```
1. Fixed slots + classrooms ✅
2. Lab slots + rooms ✅
3. Theory slots + teachers + classrooms ✅
4. Lab teachers ✅
```

**✅ OPTIMIZED VERSION (with break handling & storage):**
```
1. Fixed slots (OEC/PEC) + classrooms [Sem 7 only]
2. Lab slots + rooms (auto-assigned in Phase 2)
   └─ Constraint: No consecutive labs for same section
3. Theory slots + teachers + classrooms
   └─ 3 slots per subject, respecting max_hrs_per_day
3.5. INSERT BREAKS (NEW STEP!)
   └─ Analyze schedule, insert 1-2 breaks per day (30 min each)
4. Assign Lab Teachers (dynamic, best effort)
   └─ Try 2 teachers, accept 1, flag 0
5. Validate & Save to timetable_model
   └─ ONE document per section
```

---

### 15.2 When Breaks Are Checked

**Answer: STEP 3.5 - After all slots placed, BEFORE validation**

**Why This Timing?**
- ❌ BAD: Check during slot placement → Too constraining
- ✅ GOOD: Insert after schedule built → See full day, place optimally

**Break Insertion Strategy:**
```javascript
For each day:
  1. Find natural gaps > 30 min → Mark as break
  2. Find back-to-back classes near noon → Insert break
  3. Ensure min 1, max 2 breaks per day
  4. Distribute: 1 before noon, 1 after noon (if possible)
```

---

### 15.3 When Timetable Is Stored

**Answer: STEP 5 - After complete validation**

**Storage Timing:**
```
❌ NOT STORED (In-Memory Only):
   - Steps 1-4: All operations on weeklyGrid object
   
✅ STORED TO DATABASE:
   - Step 5: After validation
   - Format: timetable_model document
   - One document = One section's complete week
```

**Storage Flow:**
```javascript
// In-Memory (Steps 1-4):
weeklyGrid = {
  Monday: [
    { type: 'theory', subject, teacher, classroom, time },
    { type: 'break', time: '10:00-10:30' },
    { type: 'lab', lab, batches: [...], rooms: [...], time }
  ],
  Tuesday: [...]
}

// Database (Step 5):
Timetable.create({
  section_id, sem_type, academic_year,
  theory_slots: [...],
  lab_slots: [...],
  breaks: [...],
  flagged_sessions: [...],
  generation_metadata: { generated_at, success_rate }
})
```

---

### 15.4 File Organization

**Backend Structure:**
```
backend_server/
├── algorithms/
│   ├── timetable_generator.js              # Master orchestrator
│   ├── step1_fixed_slots.js                # OEC/PEC placement
│   ├── step2_lab_scheduling.js             # Lab slot finding
│   ├── step3_theory_scheduling.js          # Theory + classrooms
│   ├── step3_5_break_insertion.js          # Break insertion logic
│   ├── step4_lab_teacher_assignment.js     # Dynamic teacher assignment
│   ├── step5_validation_storage.js         # Validate & save
│   └── utils/
│       ├── conflict_checker.js             # Global conflict detection
│       ├── grid_manager.js                 # Weekly grid operations
│       └── availability_checker.js         # Resource availability
│
├── models/
│   └── timetable_model.js                  # OUTPUT storage
│
└── routes/
    └── timetables.js                       # API endpoint
```

---

### 15.5 Global Conflict Tracking

**Problem:** Prevent teacher/room conflicts across sections

**Solution:** Maintain global availability trackers

```javascript
globalAvailability = {
  teachers: {
    'T101': [
      { day: 'Monday', start: '8:30', end: '10:00', section: '5A' },
      { day: 'Tuesday', start: '10:30', end: '12:30', section: '5B' }
    ]
  },
  classrooms: { 'CR1': [...] },
  labRooms: { 'ISE-301': [...] }
}

// Before assigning: Check global availability
isTeacherAvailable(teacherId, day, startTime, endTime)

// After assigning: Update global tracker
markTeacherOccupied(teacherId, day, startTime, endTime, section)
```

---

### 15.6 Summary: Questions Answered

**Q1: Is your approach correct?**
✅ YES! With modifications:
- 1-4: Your original steps ✅
- 3.5: INSERT BREAKS (NEW) ✅
- 5: Validate & Save (explicit) ✅

**Q2: When checking breaks?**
**Step 3.5** - After slots, before validation

**Q3: When storing timetable?**
**Step 5** - After validation, one doc per section

**Q4: Which files for storage?**
- In-memory: `utils/grid_manager.js`
- Database: `algorithms/step5_validation_storage.js` → `models/timetable_model.js`

---

**Note:** This document reflects the complete constraint system for realistic, conflict-free timetable generation across multiple sections.


---

## ?? **16. FINAL SOLUTION: DYNAMIC ROOM ASSIGNMENT (v3.0)**

### 16.1 The Eureka Moment
**Discovery:** Phase 2 room pre-assignments were creating artificial constraints!

**Old Approach (v1.0 - v2.0):**
```
Phase 2: Pre-assign specific rooms to each batch
         +-- 3A Batch 1 + DSL ? Room 612A
         +-- 3A Batch 2 + DSL ? Room 612B
         +-- 3A Batch 3 + DSL ? Room 612C

Phase 3: Use ONLY those pre-assigned rooms
          Problem: What if 612A is occupied by 5A at Monday 10:00?
          Result: Conflicts OR scheduling failures

Step 3.5: Fix conflicts by reassigning rooms (post-processing)
            Band-aid solution, not root cause fix
```

**New Approach (v3.0 - CURRENT):**
```
Phase 2: ELIMINATED!  No pre-assignments needed

Phase 3: DYNAMIC ROOM SELECTION in real-time
          For each batch, determine which lab is needed (Rule 4.7)
          Query ALL compatible rooms for that lab
          Find FIRST room that is:
             Free globally (no other section using it)
             Free internally (no other batch in this section using it)
          Assign that room dynamically

Result: Zero conflicts by design! 
```

---

### 16.2 Implementation: Dynamic Room Selection

**Key Algorithm:**
```javascript
// For Batch 3A1 needing DSL at Monday 10:00-12:00:

// Step 1: Get ALL compatible rooms
compatibleRooms = await DeptLabs.find({
  lab_subjects_handled: labId
})
// Returns: [612A, 612B, 612C, 613]

// Step 2: Find first available room
for (room of compatibleRooms) {
  if (isRoomFreeGlobally(room, day, time) &&
      !usedByOtherBatchesInSection(room)) {
    assignRoom(batch, room)  //  Success!
    break
  }
}
```

**Guarantees:**
-  Rule 4.7: Batch rotation (mathematical formula)
-  No global conflicts (cross-section)
-  No internal conflicts (within section)
-  No consecutive labs
-  No theory overlaps

---

### 16.3 Why This Works

**Maximum Flexibility:**
- Not locked to specific room assignments
- Can use ANY compatible room
- More options = higher success rate

**Real-Time Conflict Prevention:**
- Checks availability BEFORE assignment
- No post-processing needed
- Conflicts impossible by design

**Comprehensive Reporting:**
- Shows success rate (e.g., 18/18 = 100%)
- Lists any unresolved conflicts with details
- Provides actionable recommendations

---

### 16.4 Evolution Summary

| Version | Phase 2 | Phase 3 | Conflicts | Result |
|---------|---------|---------|-----------|--------|
| **v1.0** | Manual | Uses manual | High |  Error-prone |
| **v2.0** | Auto pre-assign | Uses assignments | Medium |  Artificial constraints |
| **v3.0** |  ELIMINATED | Dynamic selection | **Zero** |  **Optimal!** |

---

**FINAL NOTE:** Phase 2 lab room assignments are NO LONGER NEEDED. Phase 3 dynamically selects compatible rooms in real-time, preventing all conflicts by design while guaranteeing Rule 4.7 (batch rotation).

---

## 16. FINAL SOLUTION: DYNAMIC ROOM ASSIGNMENT (v3.0)

### 16.1 The Eureka Moment

Phase 2 room pre-assignments were creating artificial constraints!

Old Approach: Pre-assign specific rooms to each batch, then use only those rooms in Phase 3. Problem: If pre-assigned room is occupied, scheduling fails.

New Approach (v3.0): NO pre-assignments! Phase 3 dynamically selects ANY compatible available room in real-time.

### 16.2 Implementation

For each batch:
1. Determine which lab is needed using Rule 4.7: labIndex = (round + batch - 1) % totalLabs
2. Query ALL compatible rooms for that lab from DeptLabs
3. Find FIRST room that is free globally AND not used by other batches in this section
4. Assign that room dynamically

Result: Zero conflicts by design!

### 16.3 Evolution Summary

- v1.0: Manual Phase 2 assignments
- v2.0: Auto Phase 2 assignments + Step 3.5 conflict resolver
- v3.0 (CURRENT): Phase 2 ELIMINATED, dynamic room selection in Phase 3

FINAL NOTE: Phase 2 lab room assignments are NO LONGER NEEDED. Phase 3 dynamically selects compatible rooms in real-time, preventing all conflicts while guaranteeing Rule 4.7 batch rotation.

---

## 🔄 **17. PHASE 3 ALGORITHM WORKFLOW & DATA RETENTION**

### 17.1 Updated Algorithm Steps (Current Implementation)

**Phase 3 Timetable Generation consists of 7 sequential steps:**

```
Step 1: Load Sections & Initialize Timetables
├── Load all sections for semester type (odd/even)
├── Create empty timetable structure for each section
├── Initialize global tracking (teacher/room availability)
└── Output: Empty timetables ready for scheduling

Step 2: Block Fixed Slots (OEC/PEC for Semester 7)
├── For Semester 7 sections only
├── Block OEC time slots (e.g., Friday 1:30-3:30 PM)
├── Block PEC time slots (e.g., Monday 10:30-12:30 PM)
└── Output: Timetables with fixed slots marked as unavailable

Step 3: Schedule Labs (with integrated break awareness)
├── Use batch rotation formula (Rule 4.7)
├── Dynamic room selection (no Phase 2 dependency)
├── Avoid lab times that conflict with default breaks
├── Prevent consecutive labs for same section
└── Output: Timetables with lab_slots populated (no teachers yet)

Step 4: Schedule Theory Classes (with integrated break management) ⬅️ NEW
├── Priority Order:
│   1. Regular ISE subjects (requires_teacher_assignment = true)
│   2. Other department subjects (is_non_ise_subject = true)  
│   3. Project subjects (is_project = true)
├── Scheduling Strategy:
│   - Sort subjects by hrs_per_week (descending)
│   - Random distribution across week (shuffle time slots)
│   - Respect max_hrs_per_day (consecutive hours allowed)
│   - Check teacher conflicts (for ISE subjects only)
│   - NO classroom assignment (deferred to Step 6)
├── Break Management:
│   - Default breaks: 11:00-11:30 AM, 1:30-2:00 PM
│   - Adjust if lab scheduled during break time
│   - Reserve break slots (30 min each, max 2 per day)
│   - Theory classes scheduled AROUND breaks
└── Output: Timetables with theory_slots populated (no classrooms yet)

Step 5: Assign Teachers to Labs
├── For each lab session (from Step 3)
├── Try to assign 2 teachers (ideal)
├── Fall back to 1 teacher if needed
├── Flag sessions with 0 teachers for review
└── Output: Lab teachers assigned, summary statistics generated

Step 6: Assign Classrooms to Theory Classes ⬅️ NEW
├── For each theory slot (from Step 4)
├── Dynamically find available classroom
├── Check classroom availability (no conflicts)
├── Assign classroom to theory slot
└── Output: Theory classrooms assigned

Step 7: Final Validation & Save
├── Validate constraints:
│   - No teacher conflicts (global check)
│   - No classroom conflicts (global check)
│   - No consecutive labs for sections
│   - Batch synchronization maintained
│   - hrs_per_week requirements met
│   - Break constraints satisfied (30 min, max 2/day)
├── Save timetables to database
└── Output: Complete conflict-free timetables
```

**Key Changes from Previous Design:**
- ✅ Theory scheduling (Step 4) now includes integrated break management
- ✅ Classroom assignment separated to Step 6 (reduces constraint burden)
- ✅ Theory subjects prioritized: Regular ISE → Other Dept → Projects
- ✅ Random distribution strategy for better weekly spread

---

### 17.2 Step-wise Data Retention (CRITICAL!)

**Rule:** Each step execution FLUSHES all existing timetables and starts fresh, retaining only data from completed previous steps.

**Why This Matters:**
```
Problem Scenario:
├── Admin runs Step 1-7 (Full generation) → Timetables saved
├── Admin changes Phase 2 assignments (e.g., swaps teachers)
├── Admin re-runs from Step 1 → Old timetables still exist!
└── Result: Conflicts between old and new timetables

Solution:
├── Each step execution deletes existing timetables for that semester
├── Starts fresh with only Phase 1 & Phase 2 data
└── Result: No conflicts, clean generation every time
```

**Implementation Strategy:**

**Step 1 Execution:**
```javascript
// When user clicks "Run Step 1"
async function loadSectionsAndInitialize(semType, academicYear) {
  // FLUSH: Delete ALL existing timetables for this semester type
  await Timetable.deleteMany({
    sem_type: semType,
    academic_year: academicYear
  })
  
  // Create fresh timetable structures
  const sections = await ISESections.find({ sem_type: semType })
  for (const section of sections) {
    await Timetable.create({
      section_id: section._id,
      sem_type: semType,
      academic_year: academicYear,
      theory_slots: [],
      lab_slots: [],
      generation_metadata: {
        current_step: 1,
        steps_completed: ['load_sections']
      }
    })
  }
}
```

**Step 2 Execution:**
```javascript
// When user clicks "Run Step 2"
async function blockFixedSlots(semType, academicYear) {
  // Load timetables from Step 1 (must exist)
  const timetables = await Timetable.find({
    sem_type: semType,
    academic_year: academicYear
  })
  
  if (timetables.length === 0) {
    throw new Error('Step 1 not completed. Please run Step 1 first.')
  }
  
  // Block fixed slots for Sem 7 sections
  // Updates existing timetable documents in place
  for (const timetable of timetables) {
    if (timetable.sem === 7) {
      // Block OEC/PEC slots
      await Timetable.updateOne(
        { _id: timetable._id },
        { 
          $set: {
            'generation_metadata.current_step': 2,
            'generation_metadata.steps_completed': ['load_sections', 'block_fixed_slots']
          }
        }
      )
    }
  }
}
```

**Step 3-7 Execution:**
```javascript
// Each subsequent step follows the same pattern:
// 1. Load timetables (check previous step completed)
// 2. Update timetables with new data
// 3. Mark current step as completed

// Example: Step 4 (Schedule Theory)
async function scheduleTheory(semType, academicYear) {
  const timetables = await Timetable.find({
    sem_type: semType,
    academic_year: academicYear,
    'generation_metadata.current_step': { $gte: 3 } // Step 3 must be complete
  })
  
  if (timetables.length === 0) {
    throw new Error('Step 3 not completed. Please run Steps 1-3 first.')
  }
  
  // Schedule theory classes (adds to theory_slots)
  // ... algorithm logic ...
  
  // Update metadata
  for (const timetable of timetables) {
    await Timetable.updateOne(
      { _id: timetable._id },
      {
        $set: {
          'generation_metadata.current_step': 4,
          'generation_metadata.steps_completed': [
            'load_sections',
            'block_fixed_slots', 
            'schedule_labs',
            'schedule_theory'
          ]
        }
      }
    )
  }
}
```

**Benefits:**
- ✅ Clean slate with each generation
- ✅ No conflicts between old and new timetables
- ✅ Step dependencies enforced (can't skip steps)
- ✅ Clear audit trail (steps_completed array)
- ✅ Supports partial re-runs (run from any step)

---

### 17.3 Data Flow Diagram

```
Phase 1 (Master Data)
├── Teachers
├── Subjects
├── Labs
├── Sections
├── Classrooms
└── Dept Labs

         ↓

Phase 2 (Assignments)
├── Teacher-Subject Assignments (per section)
└── (Lab room assignments NO LONGER NEEDED - dynamic in Phase 3)

         ↓

Phase 3 (Generation) - Click "Run Step X"
         ↓
    
Step 1: FLUSH old timetables → Create empty structures
Step 2: Load Step 1 data → Block fixed slots
Step 3: Load Step 2 data → Schedule labs (dynamic rooms)
Step 4: Load Step 3 data → Schedule theory (with breaks)
Step 5: Load Step 4 data → Assign lab teachers
Step 6: Load Step 5 data → Assign theory classrooms
Step 7: Load Step 6 data → Validate & save

         ↓

Output: Complete Timetables
├── One document per section
├── All slots assigned (labs + theory)
├── All teachers assigned (labs + theory)
├── All rooms assigned (labs + theory)
├── Breaks integrated
└── Conflict-free (validated)
```

---

### 17.4 Frontend Step Execution

**UI Requirements:**
```javascript
// Step buttons with dependency checking
<Button 
  onClick={() => runStep(1)}
  disabled={false}  // Step 1 always available
>
  Step 1: Load Sections
</Button>

<Button 
  onClick={() => runStep(2)}
  disabled={!isStepCompleted(1)}  // Requires Step 1
>
  Step 2: Block Fixed Slots
</Button>

<Button 
  onClick={() => runStep(3)}
  disabled={!isStepCompleted(2)}  // Requires Step 2
>
  Step 3: Schedule Labs
</Button>

// ... and so on
```

**Step Execution with Flush Confirmation:**
```javascript
async function runStep(stepNumber) {
  if (stepNumber === 1) {
    // Confirm flush
    const confirmed = await confirmDialog(
      'This will delete all existing timetables. Continue?'
    )
    if (!confirmed) return
  }
  
  // Execute step API call
  const response = await axios.post(`/api/timetable/step${stepNumber}`, {
    sem_type: selectedSemType,
    academic_year: academicYear
  })
  
  // Show results
  showToast(response.data.message)
  refreshStepStatus()
}
```

---

### 17.5 Metadata Tracking

**Timetable Document Metadata:**
```javascript
generation_metadata: {
  current_step: 4,  // Last completed step
  steps_completed: [
    'load_sections',
    'block_fixed_slots',
    'schedule_labs',
    'schedule_theory'
  ],
  generated_at: new Date(),
  algorithm: 'greedy',
  teacher_assignment_summary: {
    total_lab_sessions: 18,
    sessions_with_2_teachers: 15,
    sessions_with_1_teacher: 2,
    sessions_with_0_teachers: 1
  },
  break_summary: {
    total_breaks: 10,  // Across all days
    days_with_2_breaks: 4,
    days_with_1_break: 1
  },
  validation_status: 'pending'  // 'pending', 'passed', 'failed'
}
```

This metadata helps track:
- Which steps have been completed
- Can the user run next step?
- Generation statistics
- Audit trail for debugging

---