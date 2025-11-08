# 🎓 Department Scope & Semester Management

## Overview
This document defines which semesters the ISE department manages and how timetable generation is scoped.

---

## 1. Semester Responsibility

### Rule
ISE department manages **only semesters 3-8** (3rd to 8th semester students).

### Reason
First two semesters (1st & 2nd) are handled by a common department across all branches.

### Valid Semesters
✅ Semester 3, 4, 5, 6, 7, 8  
❌ Semester 1, 2

---

## 2. Semester Type Separation (CRITICAL!)

### Rule
Odd and Even semester timetables are **COMPLETELY SEPARATE** and generated at different times of the year.

### Academic Year Structure

**First Half (August - December): ODD SEMESTERS**
- Semester 3 (Odd) - Sections: 3A, 3B, 3C
- Semester 5 (Odd) - Sections: 5A, 5B, 5C
- Semester 7 (Odd) - Sections: 7A, 7B, 7C

**Second Half (January - May): EVEN SEMESTERS**
- Semester 4 (Even) - Sections: 4A, 4B, 4C
- Semester 6 (Even) - Sections: 6A, 6B, 6C
- Semester 8 (Even) - Sections: 8A, 8B, 8C

### Generation Scope

**When generating ODD semesters:**
- Include ONLY odd semester sections (3A, 3B, 3C, 5A, 5B, 5C, 7A, 7B, 7C)
- Total: 9 sections

**When generating EVEN semesters:**
- Include ONLY even semester sections (4A, 4B, 4C, 6A, 6B, 6C, 8A, 8B, 8C)
- Total: 9 sections

**Never mix:** Odd and even semesters never run simultaneously

---

## 3. Timetable Generation Strategy

### Main Goal
**Generate ALL CONFLICT-FREE TIMETABLES ACROSS ALL SECTIONS** ⭐

### Strategy
Generate SEPARATE timetable documents (one per section) in ONE algorithm run that checks conflicts across ALL sections.

### Critical Requirements

#### 1. Cross-Section Teacher Conflict Prevention
**Rule:** A teacher cannot be in two sections at the same time.

**Example:**
- Prof. DC teaches Data Structures in Section 3A
- Prof. DC teaches AI in Section 5A
- ❌ INVALID: DC scheduled at Monday 10-12 AM for BOTH 3A and 5A
- ✅ VALID: DC scheduled at Monday 10-12 AM for 3A, then Monday 2-4 PM for 5A

**Algorithm ensures:**
- Teacher is never double-booked
- Checks ALL sections before assigning teacher to any time slot

#### 2. Cross-Section Room Conflict Prevention
**Rule:** A lab room cannot be used by two batches at the same time.

**Example:**
- Lab Room ISE-301 can handle DSL Lab
- ❌ INVALID: Batch 3A1 AND Batch 5B2 both using ISE-301 at Monday 8-10 AM
- ✅ VALID: 3A1 uses ISE-301 Monday 8-10 AM, 5B2 uses ISE-301 Tuesday 10-12 AM

**Algorithm ensures:**
- No lab room double-booking across ALL sections
- Checks ALL sections before assigning room to any time slot

#### 3. Cross-Section Classroom Conflict Prevention
**Rule:** A theory classroom cannot be used by two sections at the same time.

**Example:**
- Classroom ISE-LH1 is available
- ❌ INVALID: Section 3B DBMS AND Section 5A AI both using ISE-LH1 at Monday 10-12 AM
- ✅ VALID: 3B uses ISE-LH1 Monday 10-12 AM, 5A uses ISE-LH1 Tuesday 9-11 AM

**Algorithm ensures:**
- No classroom double-booking across ALL sections
- Checks ALL sections before assigning classroom to any time slot

### Output Structure
- One timetable document per section
- Each timetable is complete and independent
- All timetables are globally conflict-free
- Can be viewed/printed separately per section

### Benefits
✅ Zero resource conflicts across all sections  
✅ Realistic timetables (teachers/rooms can't be in two places)  
✅ Efficient resource utilization  
✅ Each section gets independent timetable document  
✅ Easy to view/print per section  
✅ Globally consistent and conflict-free

---

## 4. Generation Process

### Input
- Semester type (Odd or Even)
- Academic year (e.g., "2024-25")

### Process
1. Load ALL sections for the semester type
2. For each resource assignment:
   - Check availability across ALL sections
   - Prevent double-booking
3. Generate one timetable per section

### Output
- 9 separate timetable documents (one per section)
- All globally conflict-free
- Ready for viewing/printing

---

**Last Updated:** January 2025
