# 🏫 Classroom Management & Assignment

## Overview
This document defines rules for classroom allocation, capacity management, and conflict prevention.

---

## 1. Classroom Types

### Theory Classrooms
**Purpose:** Regular theory classes for full sections.

**Characteristics:**
- Larger capacity (60-90 students)
- Standard seating arrangement
- Projector/teaching equipment
- Examples: ISE-601, ISE-602, ISE-LH1 (Lecture Hall)

### Lab Rooms
**Purpose:** Practical lab sessions for individual batches.

**Characteristics:**
- Smaller capacity (~30 stations)
- Computers/equipment specific to lab type
- Hands-on learning setup
- Examples: ISE-301, ISE-302, ISE-304

---

## 2. Classroom Assignment Rules

### Theory Classes
✅ Require classroom assignment  
- Regular ISE subjects  
- Other Department subjects (ISE reserves classroom)  
- Professional Electives (PEC)  
- Open Electives (OEC - ISE reserves classroom)

❌ Do NOT require classroom  
- Project subjects (flexible location)

### Lab Classes
✅ Always require lab room assignment  
- Assigned during lab scheduling (Step 3)  
- Based on equipment compatibility  
- Dynamic room selection

---

## 3. Theory Classroom Assignment Timing

### Rule
Theory classrooms are assigned in **Step 6** (separate from time slot scheduling).

### Why Deferred?
- Time slots determined first (Steps 2-4)
- Classroom capacity checked after
- Easier to resolve conflicts
- More flexible assignment

### Process
1. Steps 2-4: Determine WHEN classes happen
2. Step 6: Determine WHERE classes happen
3. Validation: Check capacity and conflicts

---

## 4. Lab Room Assignment Timing

### Rule
Lab rooms are assigned **during lab scheduling** (Step 3).

### Why Immediate?
- Room equipment must match lab type
- Batch rotation requires room coordination
- Room conflicts checked in real-time
- Cannot defer (needed for batch assignments)

### Dynamic Selection
Algorithm finds ANY compatible free room at scheduling time (not pre-assigned).

---

## 5. Classroom Capacity

### Theory Classroom Capacity
Must accommodate full section size (all batches together).

### Example
**Section 3A:**
- Total students: 60
- Required classroom capacity: ≥60 seats
- Can assign: ISE-601 (80 seats) ✅
- Cannot assign: Small room (40 seats) ❌

### Lab Room Capacity
Must accommodate one batch size (~20-30 students).

### Example
**Batch 3A1:**
- Students: 20
- Required lab capacity: ≥20 stations
- Can assign: ISE-301 (30 stations) ✅

---

## 6. Classroom Conflict Prevention

### Cross-Section Conflicts
**Rule:** Same classroom cannot be used by multiple sections at the same time.

### Example
❌ **Invalid:**
- Monday 10-12 AM: Section 3A using ISE-601
- Monday 10-12 AM: Section 5B using ISE-601

✅ **Valid:**
- Monday 10-12 AM: Section 3A using ISE-601
- Monday 2-4 PM: Section 5B using ISE-601

### Validation
System checks ALL sections before assigning classroom to prevent conflicts.

---

## 7. Lab Room Equipment Compatibility

### Rule
Lab room must have equipment required for the specific lab subject.

### Equipment Database
Each lab room specifies which lab subjects it can handle.

### Example
**Room ISE-301:**
- Equipment: 30 PCs, C++ compilers, data structure tools
- Can handle: DSL, Programming fundamentals
- Cannot handle: Network lab (needs routers/switches)

**Room ISE-304:**
- Equipment: Routers, switches, cables
- Can handle: Computer Networks Lab
- Cannot handle: Software labs

### Assignment Process
Algorithm queries compatible rooms and selects first available one.

---

## 8. Lab Room Conflict Prevention

### Global Room Tracking
System maintains global schedule of which rooms are used when across ALL sections.

### Types of Conflicts Prevented

#### Intra-Slot Conflicts
Same room cannot be used by multiple batches of SAME section simultaneously.

#### Inter-Section Conflicts
Same room cannot be used by batches from DIFFERENT sections simultaneously.

### Example
**Monday 8-10 AM:**
✅ Batch 3A1 in ISE-301, Batch 3A2 in ISE-302 (different rooms)  
❌ Batch 3A1 AND Batch 5B1 both in ISE-301 (conflict!)

---

## 9. Classroom Display in Timetable

### Theory Classes
- Regular ISE: Room name (e.g., "ISE-601")
- Other Dept: Room name (ISE reserves)
- OEC/PEC: Room name (ISE reserves)
- Projects: "Flexible" or blank (no fixed room)

### Lab Classes
- Room name always shown (e.g., "ISE-301")
- Equipment type implied by room
- Each batch has its own room assignment

---

## 10. Classroom Shortforms

### Purpose
Compact display in timetable UI.

### Format
Usually room number or abbreviated location.

### Examples
- ISE Department Lab 1 → "ISE-301"
- ISE Lecture Hall 1 → "ISE-LH1"
- ISE Classroom 601 → "ISE-601"

---

## 11. Classroom Data Structure

### Theory Classroom Schema
- `classroom_id`: Room's ObjectId
- `classroom_name`: Full name or room number
- `capacity`: Number of seats
- `building`: Building location
- `floor`: Floor number
- `equipment`: Available equipment list

### Lab Room Schema
- `labRoom_id`: Room's ObjectId
- `labRoom_no`: Room number/name
- `total_computers`: Number of stations
- `lab_subjects_handled`: Array of lab IDs this room can handle
- `building`: Building location
- `floor`: Floor number

### Theory Slot Schema
- `classroom_id`: Assigned room's ObjectId
- `classroom_name`: Room name for display
- (Assigned in Step 6)

### Lab Slot - Batch Schema
- `lab_room_id`: Assigned room's ObjectId
- `lab_room_name`: Room name for display
- (Assigned during Step 3)

---

## 12. Classroom Assignment Validation

### Pre-Assignment Checks
Before assigning classroom:
✅ Room capacity ≥ section size  
✅ Room available at this time  
✅ No conflicts with other sections  
✅ Equipment compatible (for labs)

### Post-Assignment Verification
After generating timetables:
✅ All theory slots have classrooms (except projects)  
✅ All lab batches have lab rooms  
✅ No double-booking conflicts  
✅ Capacity constraints satisfied

---

## 13. Manual Editing - Classroom Changes

### Editor Feature
Users can change classroom assignments when manually editing timetables.

### Conflict Detection
System should check for conflicts when user changes classroom (future enhancement).

### Current Behavior
- User can change classroom
- Saves to database
- No real-time conflict detection yet
- User responsibility to avoid conflicts

---

**Last Updated:** January 2025
