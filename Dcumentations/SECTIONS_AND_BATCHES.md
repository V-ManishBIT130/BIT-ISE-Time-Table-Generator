# 👥 Sections & Batches Structure

## Overview
This document defines how students are organized into sections and batches for timetable purposes.

---

## 1. Section Structure

### Rule
Each semester has multiple sections (A, B, C, etc.), each containing a fixed number of students.

### Example
**Semester 3:**
- Section A: 60 students
- Section B: 55 students
- Section C: 58 students

### Section Naming
- Format: `{Semester}{Letter}`
- Examples: 3A, 5B, 7C

---

## 2. Batch Division

### Rule
Each section is divided into exactly **3 batches** for lab purposes.

### Reason
Lab rooms have limited capacity (~30 computers), requiring smaller groups for hands-on work.

### Example
**Section 3A (60 students):**
- Batch 3A1: 20 students
- Batch 3A2: 20 students
- Batch 3A3: 20 students

---

## 3. Batch Naming Convention

### Rule
Batch names MUST include semester number as prefix for global uniqueness.

### Format
`{Semester}{Section}{BatchNumber}`

### Examples
✅ **Correct:** 3A1, 3A2, 3A3 (Semester 3, Section A, Batches 1-3)  
✅ **Correct:** 5B1, 5B2, 5B3 (Semester 5, Section B, Batches 1-3)  
❌ **Wrong:** A1, A2, A3 (ambiguous - which semester?)

### Reason
Prevents confusion across semesters, enables easier tracking and reporting.

---

## 4. Theory Class Batch Handling

### Rule
For theory subjects, ALL batches attend together as ONE section.

### Example
**Theory Class - Data Structures:**
- All students from Section 3A attend together
- Batches 3A1, 3A2, 3A3 combined
- Full section (60 students) in ONE classroom
- Cannot split batches into different rooms for theory

---

## 5. Lab Class Batch Handling

### Rule
For lab subjects, batches attend separately in different rooms (batch rotation).

### Example
**Lab Session - Monday 8-10 AM:**
- Batch 3A1: DSL Lab in Room ISE-301
- Batch 3A2: Web Tech Lab in Room ISE-302
- Batch 3A3: DBMS Lab in Room ISE-303

### Batch Synchronization (CRITICAL!)
**Rule:** All batches of a section MUST be in labs at the SAME time.

**Reason:** 
- Cannot have some batches in lab while others in theory class
- All students of section must be occupied simultaneously

**Example:**
✅ **Allowed:** Monday 8-10 AM - All three batches (3A1, 3A2, 3A3) in different labs  
❌ **Not Allowed:** Monday 8-10 AM - Only 3A1 in lab, others in theory class

---

## 6. Batch Rotation Strategy

### Rule
Batches rotate through labs using a fixed rotation formula.

### Formula
`labIndex = (round + batchNum - 1) % totalLabs`

### Example
**Section 3A with 3 labs (DSL, Web, DBMS):**

| Round | Batch 3A1 | Batch 3A2 | Batch 3A3 |
|-------|-----------|-----------|-----------|
| 1 | DSL | Web | DBMS |
| 2 | Web | DBMS | DSL |
| 3 | DBMS | DSL | Web |

### Benefits
- Every batch experiences every lab
- Fair distribution of learning opportunities
- No batch favoritism

---

## 7. Section Independence

### Rule
Each section has its own independent timetable.

### Characteristics
- Separate schedule
- Can have different timings for same subjects
- Own classroom assignments
- Independent batch rotations

### Example
- Section 3A: Data Structures on Monday 10-12 AM
- Section 3B: Data Structures on Tuesday 9-11 AM
- Both valid, no dependency

---

**Last Updated:** January 2025
