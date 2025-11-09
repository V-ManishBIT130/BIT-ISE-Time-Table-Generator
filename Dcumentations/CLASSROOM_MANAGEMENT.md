# 🏫 Classroom Management & Assignment (Step 5)

## Overview
Step 5 assigns classrooms to theory slots using a priority-based algorithm with global conflict prevention. After assignment, admins can edit classrooms interactively while the system maintains conflict-free scheduling.

---

## Assignment Strategy (Step 5 Algorithm)

### Priority Order
1. **Fixed Slots First** (OEC/PEC) - Highest priority
2. **Regular Theory Slots** - Second priority  
3. **Project Slots** - Skipped (no classroom needed)

### Global Conflict Prevention
- Maintains in-memory room usage tracker across ALL sections
- Key format: `roomId_day_startTime`
- Prevents double-booking at the same time

### Process Flow
1. Fetch all available theory classrooms
2. Build global classroom schedule (what's used when)
3. For each timetable:
   - Process fixed slots → Assign first available room
   - Process regular slots → Assign first available room
   - Skip project slots
4. Save updated timetables to database

### Results Tracked
- Fixed slots assigned
- Regular slots assigned
- Unassigned slots (if rooms ran out)
- Success rate percentage

---

## Interactive Editing (Post-Step 5)

### Editing Philosophy
After Step 5, theory slots remain **editable** to allow schedule adjustments:
- **Drag slots** to different times
- **Change classrooms** via modal
- **Delete slots** if needed
- System maintains conflict-free state throughout

### Key Features

#### 1. Flexible Slot Movement
- Theory slots stay draggable even after Step 5
- When moved, classroom assignment is **cleared automatically**
- This frees up the room for other slots
- Admin must reassign classroom after moving

**Example Workflow:**
```
Initial: Monday 10:00 - DS + Room 301
Action: Drag DS to Monday 11:30
Result: Monday 11:30 - DS + (No Room) 
        Monday 10:00 - Empty + Room 301 freed
```

#### 2. Classroom Change Modal
- Appears when clicking classroom badge
- Shows current room and slot details
- Displays only **available rooms** at that time slot
- Real-time conflict detection
- One-click room reassignment

#### 3. Break Management
- Breaks remain fully editable after Step 5
- Can add/delete custom breaks anytime
- Doesn't affect classroom assignments
- Locked slots (fixed/labs) stay protected

### Editing Restrictions
- **Fixed slots** (OEC/PEC) → Cannot move or delete
- **Lab slots** → Cannot move or delete (batch rotation must stay intact)
- **Theory slots** → Fully editable
- **Breaks** → Fully editable

---

## Conflict Detection

### Three Levels of Validation

#### 1. Backend Algorithm (Step 5)
- Runs during initial classroom assignment
- Checks all sections before assigning
- Prevents conflicts globally

#### 2. Available Rooms API
- Called when opening "Change Room" modal
- Queries database for occupied rooms at specific time
- Returns only free rooms

#### 3. Update Classroom API
- Validates before saving change
- Checks if room is still available (race condition protection)
- Returns 409 Conflict if room was just taken

### Conflict Types Handled
✅ Same classroom, same time, different section  
✅ Fixed slot conflicts (cannot override)  
✅ Lab session conflicts (cannot override)  
✅ Race conditions (optimistic locking)

---

## User Workflows

### Workflow 1: Run Step 5 (Initial Assignment)
1. Navigate to **TimetableGenerator**
2. Run Steps 1-4 first
3. Click **"Run Step 5: Assign Classrooms"**
4. View results showing:
   - Fixed slots assigned: X/Y
   - Regular slots assigned: X/Y
   - Success rate: Z%
5. Go to **TimetableViewer** to see classroom badges on slots

### Workflow 2: Change Classroom
1. Navigate to **TimetableEditor**
2. Select semester and section
3. Click **classroom badge** on any theory slot
4. Modal opens showing:
   - Current room
   - Slot details (subject, teacher, time)
   - List of available rooms
5. Click desired room
6. System validates and updates
7. Classroom badge updates instantly

### Workflow 3: Move Slot (Clears Classroom)
1. Navigate to **TimetableEditor**
2. Drag theory slot to new time
3. System clears classroom assignment automatically
4. Badge changes to **"⚠️ No Room"**
5. Click badge to assign new room
6. Select room from available list

### Workflow 4: Undo Changes
1. Make any edit (move slot, change room, etc.)
2. Press **Ctrl+Z** or click **Undo button**
3. Change is reverted
4. Classroom restored to previous state

---

## Classroom Types & Equipment

### Theory Classrooms
- Regular lecture rooms
- Capacity: 60-70 students
- Basic equipment: Projector, whiteboard

### Lab Rooms
- Computer labs with workstations
- Capacity: 30 students (2-3 per PC)
- Equipment: Computers, network, projector

### Compatibility Rules
- Theory subjects → Theory classrooms only
- Lab sessions → Lab rooms only
- No mixing (validated at assignment time)

---

## Best Practices

### For Admins
1. **Run Step 5 after Steps 1-4 are complete**
2. **Check success rate** - if low, investigate unassigned slots
3. **Use TimetableViewer first** to see overall picture
4. **Then use TimetableEditor** for fine-tuning
5. **Make small changes** and save frequently

### For Developers
1. **Always clear previous assignments** before re-running Step 5
2. **Use global trackers** to prevent conflicts
3. **Validate on both frontend and backend**
4. **Handle race conditions** with 409 Conflict responses
5. **Log conflicts** for debugging

---

## API Reference

### POST /api/timetables/step5
Runs classroom assignment algorithm
```
Request: { sem_type: "odd", academic_year: "2024-2025" }
Response: {
  success: true,
  data: {
    fixed_slots_assigned: 12,
    regular_slots_assigned: 138,
    unassigned_slots: 3,
    success_rate: 98.0
  }
}
```

### GET /api/timetables/available-rooms
Fetches free classrooms at specific time
```
Query: ?day=Monday&start_time=10:00&sem_type=odd&academic_year=2024-2025
Response: {
  available_rooms: [
    { _id: "...", classroom_name: "C301", room_type: "THEORY" }
  ]
}
```

### PATCH /api/timetables/:id/theory-slot/:slotId/classroom
Updates classroom for a slot
```
Body: { classroom_id: "...", classroom_name: "C305" }
Response: { success: true, message: "Classroom updated" }
```

---

## Key Learnings

### What Works Well
✅ Priority-based assignment (fixed first)  
✅ Global conflict tracking  
✅ Flexible editing after assignment  
✅ Auto-clear classroom on slot move  
✅ Real-time conflict detection  

### Design Decisions
- **Why clear classroom on move?** → Prevents conflicts and frees up room
- **Why allow editing after Step 5?** → Admins need flexibility for adjustments
- **Why separate Step 5 from Step 4?** → Easier to rerun just classroom assignment
- **Why modal for room change?** → Clear context, focused action, prevents errors

### Future Enhancements
- Bulk room reassignment
- Room capacity validation
- Proximity-based suggestions
- Conflict preview before change & Assignment

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
