# 🧪 Lab Scheduling Constraints

## Overview
This document outlines all constraints specific to lab scheduling, including batch rotation, room assignment, and conflict prevention.

---

## 1. Lab Structure

### Duration
Each lab session is exactly **2 hours**.

### Batch Requirement
Labs require SMALLER groups than theory classes due to:
- Limited computer/equipment capacity (~30 per room)
- Hands-on work requiring individual stations
- Safety and supervision requirements

---

## 2. Batch Synchronization (CRITICAL!)

### Rule
All batches of a section MUST be in labs at the SAME time.

### Reason
- Cannot have some batches in lab while others in theory class
- All students of section must be occupied simultaneously
- Simplifies overall timetable scheduling

### Example
**Monday 8-10 AM - Section 3A:**
✅ **Valid:**
- Batch 3A1: DSL Lab in Room ISE-301
- Batch 3A2: Web Tech Lab in Room ISE-302
- Batch 3A3: DBMS Lab in Room ISE-303

❌ **Invalid:**
- Batch 3A1: DSL Lab in Room ISE-301
- Batches 3A2, 3A3: Theory class or free time

---

## 3. Batch Rotation (Rule 4.7)

### Rule
Batches rotate through labs using a fixed rotation formula to ensure every batch experiences every lab.

### Formula
`labIndex = (round + batchNum - 1) % totalLabs`

### Example: Section 3A with 3 Labs

**Labs Available:**
- Lab 1: DSL (Data Structures Lab)
- Lab 2: Web Tech Lab
- Lab 3: DBMS Lab

**Rotation Schedule:**

| Round | Batch 3A1 | Batch 3A2 | Batch 3A3 |
|-------|-----------|-----------|-----------|
| **1** | DSL | Web Tech | DBMS |
| **2** | Web Tech | DBMS | DSL |
| **3** | DBMS | DSL | Web Tech |

### Benefits
✅ Every batch experiences every lab  
✅ Fair distribution of learning opportunities  
✅ No batch favoritism  
✅ Predictable rotation pattern

---

## 4. Lab Room Requirements

### Equipment Compatibility
Each lab room has specific equipment and can only handle compatible lab subjects.

### Example
**Room ISE-301 (DSL Lab):**
- Equipment: 30 PCs with C/C++ compilers, data structure tools
- Can handle: DSL, Programming labs
- Cannot handle: Hardware labs (needs different equipment)

**Room ISE-304 (Network Lab):**
- Equipment: Routers, switches, network cables
- Can handle: Computer Networks Lab
- Cannot handle: Software labs (no programming setup)

### Dynamic Room Assignment
Algorithm finds ANY compatible free room during scheduling (not pre-assigned).

---

## 5. Room Conflict Prevention

### Global Room Tracking
System maintains a global room schedule to prevent conflicts across ALL sections.

### Types of Conflicts Prevented

#### 1. Intra-Slot Conflicts
**Rule:** Same room cannot be used by multiple batches of SAME section at the SAME time.

**Example:**
❌ **Invalid:**
- Monday 8-10 AM: Batch 3A1 AND Batch 3A2 both using ISE-301

✅ **Valid:**
- Monday 8-10 AM: Batch 3A1 in ISE-301, Batch 3A2 in ISE-302

#### 2. Inter-Section Conflicts
**Rule:** Same room cannot be used by batches from DIFFERENT sections at the SAME time.

**Example:**
❌ **Invalid:**
- Monday 8-10 AM: Batch 3A1 AND Batch 5B2 both using ISE-301

✅ **Valid:**
- Monday 8-10 AM: Batch 3A1 in ISE-301
- Tuesday 10-12 AM: Batch 5B2 in ISE-301

---

## 6. Lab Scheduling Constraints

### Consecutive Lab Prohibition
**Rule:** Students should NOT have back-to-back labs (too hectic).

**Example:**
❌ **Invalid:**
- Monday 8-10 AM: DSL Lab
- Monday 10-12 PM: Web Tech Lab (immediately consecutive)

✅ **Valid:**
- Monday 8-10 AM: DSL Lab
- Monday 12-2 PM: Web Tech Lab (with break between)

### Daily Lab Limits (NEW)

#### Constraint 1: For 3+ Labs Per Semester
**Rule:** Maximum 2 lab sessions per day.

**Reason:** Prevents overwhelming students with too many labs in one day.

**Example for Semester 3 (4 labs total):**
✅ **Allowed:**
- Monday: Lab 1, Lab 2 (2 labs)
- Wednesday: Lab 3 (1 lab)
- Friday: Lab 4 (1 lab)

❌ **Blocked:**
- Monday: Lab 1, Lab 2, Lab 3 (3 labs - too many!)

#### Constraint 2: For Exactly 2 Labs Per Semester
**Rule:** Labs must be on different days.

**Reason:** Spreads learning across the week, avoids concentration on one day.

**Example for Semester 5 (2 labs total):**
✅ **Allowed:**
- Monday: Lab 1
- Thursday: Lab 2

❌ **Blocked:**
- Monday: Lab 1, Lab 2 (both on same day)

---

## 7. Theory Slot Conflicts

### Rule
Labs cannot conflict with existing theory slots for the same section.

### Example
**Section 3A has theory class:**
- Monday 10-12 PM: Data Structures Theory

**Lab scheduling must avoid:**
❌ Monday 10-12 PM for ANY batch of Section 3A  
✅ Monday 8-10 AM (before theory)  
✅ Monday 2-4 PM (after theory)

---

## 8. Teacher Assignment for Labs

### Rule
Lab teachers are assigned in Step 5 (after lab slots are created).

### Requirement
Each lab session requires TWO teachers for supervision.

### Why Two Teachers?
- 60-90 students (all 3 batches) doing labs simultaneously
- Need adequate supervision across multiple rooms
- Safety and guidance requirements

### Example
**Monday 8-10 AM - Section 3A Labs:**
- Room ISE-301 (3A1 - DSL): Teacher 1 + Teacher 2
- Room ISE-302 (3A2 - Web): Teacher 3 + Teacher 4
- Room ISE-303 (3A3 - DBMS): Teacher 5 + Teacher 6

**Total: 6 teachers needed for one lab session!**

---

## 9. Lab Scheduling Priority

### Rule
Labs are scheduled BEFORE theory classes.

### Reason
- Labs have stricter constraints (batch rotation, room requirements)
- Theory classes are more flexible
- Easier to fit theory around fixed lab slots

### Scheduling Order
1. **Step 2:** Block fixed slots (OEC/PEC)
2. **Step 3:** Schedule all lab sessions ← LABS HERE
3. **Step 4:** Schedule theory classes ← Theory fits around labs

---

## 10. Lab Scheduling Algorithm

### Strategy
**In-Memory Global Room Tracking + Better Distribution**

### Process
1. **Initialize:** Clear global room tracker
2. **Load Labs:** Get all labs for semester
3. **Calculate Rounds:** Number of rounds = Number of labs
4. **For Each Section:**
   - Get available day-slot combinations (shuffled for distribution)
   - For each combination:
     - Check theory conflicts
     - Check existing lab conflicts
     - Check consecutive lab prohibition
     - Check daily lab limits
     - **Try to schedule all 3 batches:**
       - Calculate which lab each batch does (rotation formula)
       - Find compatible free room for each batch
       - Verify no room conflicts (global check)
     - If all 3 batches can be scheduled → Commit to schedule
5. **Save:** Store all lab slots in database

### Conflict Prevention
✅ Global room conflict prevention  
✅ Internal room conflict prevention (same slot)  
✅ Rule 4.7 batch rotation guaranteed  
✅ Consecutive lab prevention active  
✅ Daily lab limits enforced  
✅ Theory slot conflicts prevented

---

## 11. Lab Data Structure

### Lab Slot Schema
Each lab slot contains:
- `slot_type`: "multi_batch_lab"
- `day`: Day of week
- `start_time`: "08:00"
- `end_time`: "10:00"
- `duration_hours`: 2
- `batches`: Array of 3 batch objects

### Batch Object Schema
Each batch contains:
- `batch_number`: 1, 2, or 3
- `batch_name`: "3A1", "3A2", "3A3"
- `lab_id`: Lab's ObjectId
- `lab_name`: "Data Structures Lab"
- `lab_shortform`: "DSL"
- `lab_room_id`: Room's ObjectId
- `lab_room_name`: "ISE-301"
- `teacher1_id`, `teacher1_name`, `teacher1_shortform`: (assigned in Step 5)
- `teacher2_id`, `teacher2_name`, `teacher2_shortform`: (assigned in Step 5)
- `teacher_status`: "no_teachers" (until Step 5)

---

## 12. Success Metrics

### Expected Output
- All lab sessions scheduled successfully
- Zero room conflicts
- Batch rotation formula followed
- All constraints satisfied

### Reporting
System provides:
- Total lab sessions scheduled
- Total batches scheduled
- Success rate percentage
- Any unresolved scheduling conflicts (with reasons)

---

**Last Updated:** January 2025
