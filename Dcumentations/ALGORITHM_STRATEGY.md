# 🧠 Algorithm Strategy & Implementation

## Overview
This document describes the scheduling algorithms, their strategies, and implementation approaches used in timetable generation.

---

## 1. Overall Generation Strategy

### 7-Step Process
1. **Step 1:** Load sections and initialize timetables
2. **Step 2:** Block fixed time slots (OEC/PEC)
3. **Step 3:** Schedule lab sessions
4. **Step 4:** Schedule theory classes
5. **Step 5:** Assign teachers to labs
6. **Step 6:** Assign classrooms to theory slots
7. **Step 7:** Validate and finalize

### Why This Order?
- Fixed slots first (no flexibility)
- Labs next (strict constraints)
- Theory after (most flexible)
- Resource assignment deferred (easier conflict resolution)

---

## 2. Fixed Slot Blocking (Step 2)

### Purpose
Reserve time slots for OEC and PEC before scheduling other subjects.

### Input Required
Admin provides before generation:
- Subject name
- Day and time (fixed)
- Applicable sections

### Process
1. For each fixed slot input:
   - Mark time as blocked in timetable
   - Set `is_fixed_slot: true`
   - Store subject details
2. These slots become unavailable for other subjects

### Why First?
- No flexibility in timing
- Must be honored by all other scheduling
- Prevents conflicts early

---

## 3. Lab Scheduling Algorithm (Step 3)

### Strategy
**In-Memory Global Room Tracking + Better Distribution**

### Key Components

#### Batch Rotation Formula
`labIndex = (round + batchNum - 1) % totalLabs`

Ensures every batch rotates through all labs fairly.

#### Global Room Tracker
Maintains map of which rooms are used when across ALL sections.

Key format: `roomId_day_startTime_endTime`

#### Dynamic Room Assignment
Instead of pre-assigning rooms, algorithm finds ANY compatible free room during scheduling.

### Process Flow
1. Clear global room tracker
2. Sort sections for better distribution (interleave by semester)
3. For each section:
   - Get available day-slot combinations (shuffled)
   - For each combination:
     - Validate time slot (working hours, no breaks)
     - Check theory conflicts
     - Check lab conflicts (no consecutive labs)
     - Check daily lab limits
     - **Try to schedule all 3 batches:**
       - Calculate which lab each batch does (rotation)
       - Find compatible free room for each
       - Check global room availability
       - If all succeed → Commit schedule
       - If any fail → Try next time slot
4. Save all lab slots to database

### Conflict Prevention
✅ Global room conflicts (inter-section)  
✅ Internal room conflicts (intra-slot)  
✅ Batch rotation guaranteed  
✅ Consecutive lab prohibition  
✅ Daily lab limits  
✅ Theory slot avoidance

---

## 4. Theory Scheduling Algorithm (Step 4)

### Strategy
**Greedy Algorithm with Random Distribution + Gap Minimization**

### Priority Order
1. Regular ISE subjects (hardest first by hrs_per_week)
2. Other department subjects
3. Project subjects (lowest priority)

### Key Features

#### Subject Filtering
- Load all teacher assignments
- Include Other Dept and Project subjects
- **CRITICAL:** Filter out subjects already in fixed slots (OEC/PEC)
- Only schedule remaining subjects

#### Session Splitting
Based on `hrs_per_week` and `max_hrs_per_day`:
- 3 hrs/week, max 2/day → Split as 2+1
- 4 hrs/week, max 2/day → Split as 2+2
- Can also split as 1+1+1 based on availability

#### Gap Scoring System
Each time slot receives a score based on:
- **Gap filling:** 0 (fills gap), 1 (extends block), 10+ (isolated)
- **Subject diversity:** +50 if subject already on that day
- **Early start penalty:** +5 to +100 based on 8 AM limit
- **Day variety:** Slight bonus for adding to single-subject days

Algorithm selects slot with LOWEST score (best fit).

#### Random Distribution
- Days and slots shuffled before evaluation
- Prevents clustering on Monday/Tuesday
- More natural timetable appearance

### Process Flow
1. Clear global teacher tracker
2. For each section:
   - Load assigned subjects
   - Filter out fixed slot subjects
   - Sort by hrs_per_week (descending)
   - **For each subject:**
     - Calculate session splits
     - **For each session:**
       - Evaluate ALL day-slot combinations
       - Score each slot (gap + diversity + early start)
       - Select BEST slot (lowest score)
       - Check teacher availability (global)
       - If available → Schedule + mark teacher busy
       - If not → Try next best slot
3. Save all theory slots to database

### Conflict Prevention
✅ Teacher conflicts (global across sections)  
✅ Time slot conflicts (no double-booking)  
✅ Break avoidance  
✅ Early start limit (max 3 days at 8 AM)  
✅ Day length constraints  
✅ Fixed slot avoidance  
✅ Lab slot avoidance

---

## 5. Gap Minimization Details

### Scoring Logic

**Adjacent Classes (Best):**
- Both before and after: Score = 0 (fills complete gap)
- One side adjacent: Score = 1 (extends block)

**Isolated Slot (Worst):**
- Base penalty: 10
- Plus: 2 points per hour of nearest gap
- Example: 3-hour gap = 10 + (3 × 2) = 16 points

**Subject Already on Day:**
- Heavy penalty: +50 points
- Strongly discourages same subject multiple times per day

**Day Variety:**
- Empty day: +2 (slight penalty to fill existing days first)
- Single-subject day: -3 (bonus for adding variety!)
- Multi-subject day: 0 (neutral)

### Example Scenario
**Monday current schedule:**
- 9:00-10:00: Data Structures
- 12:00-1:00: DBMS

**Evaluating slot for AI (new subject):**
- 10:00-11:00: Score = 1 (adjacent to DS) + 0 (new subject) = **1** ✅
- 11:00-12:00: Score = 0 (fills gap!) + 0 (new subject) = **0** ✅✅
- 3:00-4:00: Score = 10 (isolated) + 4 (2hr gap) = **14** ❌

**Evaluating slot for Data Structures (again):**
- 11:00-12:00: Score = 0 (fills gap) + 50 (already on day) = **50** ❌

Algorithm chooses 11:00-12:00 for AI (score 0, perfect gap fill with variety).

---

## 6. Early Start Preference

### Penalty System
When evaluating 8:00 AM slots:

| Current Early Days | Penalty | Effect |
|-------------------|---------|--------|
| **3+ days** | +100 | Effectively blocks (very high score) |
| **2 days** | +20 | Strong discouragement |
| **0-1 days** | +5 | Minor preference for later starts |

### Integration
Added to gap score, influencing slot selection naturally without hard blocking.

### Benefits
- Still uses 8 AM when necessary
- Prefers later starts when gaps exist
- Respects 3-day limit automatically

---

## 7. Day Length Validation

### Real-Time Checking
During slot evaluation:
1. Check if day already has early start (8 AM)
2. Calculate session end time
3. If 8 AM day and ends >4 PM → Reject slot
4. If later start and ends >5 PM → Reject slot

### Prevents Violations
Built into scheduling logic, not just post-validation.

---

## 8. Teacher Conflict Prevention

### Global Teacher Schedule
Map structure: `teacherId_day_startTime` → slot details

### Before Scheduling
1. Check if teacher already busy at this time
2. Search across ALL sections (not just current)
3. If busy → Skip slot, try next
4. If free → Proceed

### After Scheduling
Mark teacher as busy in global map for this time.

### Applies To
✅ Regular ISE subjects  
✅ Professional Electives (PEC)  
❌ Other Dept (no ISE teacher)  
❌ Projects (no teacher)  
❌ OEC (other dept teaches)

---

## 9. Data Flush Strategy

### Problem
Each step builds on previous steps. Re-running a step must clear its own data AND all future steps.

### Solution
**Targeted Flushing:**

- **Step 2 flush:** Clears steps 2-7, keeps Step 1 (section init)
- **Step 3 flush:** Clears steps 3-7, keeps Steps 1-2 (fixed slots)
- **Step 4 flush:** Clears steps 4-7, keeps Steps 1-3 (labs)

### Implementation
Filter timetable slots based on `is_fixed_slot` flag:
- Keep slots with `is_fixed_slot: true` (from Step 2)
- Remove all other theory slots (from Step 4)
- Lab slots cleared completely if re-running Step 3

---

## 10. Section Interleaving Optimization

### Problem
Sequential section processing: 3A, 3B, 3C, 5A, 5B, 5C...  
Result: Later sections starved of good slots.

### Solution
**Interleave by semester:**  
Process order: 3A, 5A, 7A, 3B, 5B, 7B, 3C, 5C, 7C

### Benefits
✅ Fair resource distribution across semesters  
✅ No semester gets disadvantaged  
✅ Better overall quality

---

## 11. Success Metrics & Reporting

### Lab Scheduling Metrics
- Total lab sessions scheduled
- Total batches scheduled
- Success rate (%)
- Unresolved conflicts (with reasons)
- Room utilization

### Theory Scheduling Metrics
- Total subjects found
- Subjects in fixed slots (excluded)
- Subjects scheduled in Step 4
- Success rate for Step 4
- Early start distribution
- Teacher conflict count
- Day length violations

### Console Logging
Comprehensive logs show:
- Each slot scheduled
- Conflicts detected and resolved
- Gap scores for debugging
- Early start tracking
- Final statistics per section

---

## 12. Validation Steps

### Post-Generation Checks
After generating all timetables:

✅ **Teacher Conflicts:**
- Search for same teacher at same time across sections
- Report any conflicts found

✅ **Day Length Constraints:**
- Check start time vs. end time per day
- Report violations

✅ **Fixed Slot Integrity:**
- Verify fixed slots unchanged
- No duplicates or overwrites

✅ **Batch Synchronization:**
- All batches busy when any batch in lab
- No partial section availability

---

**Last Updated:** January 2025
