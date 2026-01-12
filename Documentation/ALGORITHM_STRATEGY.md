# 🧠 Algorithm Strategy & Implementation

**Last Updated:** January 12, 2026  
**Lab Scheduling Success Rate:** 100% for all semesters (27/27 labs)  
**Teacher Assignment Success Rate:** 96.30% (78/81 batches with 2 teachers)  
**Key Innovations:** 
- Dual Randomization with Smart Diversity Shuffle (Lab Scheduling)
- Fisher-Yates Shuffle within Hierarchy (Teacher Assignment)

---

## 🎉 Recent Breakthroughs

### Dual Randomization System (Nov 2025) - Step 3
**Problem:** Single-dimension randomization (time slots only) insufficient  
**Solution:** Randomize time slots + section order + semester priority  
**Result:** 100% success, 10,800 unique strategy combinations

### Hierarchical Teacher Assignment (Jan 2026) - Step 6
**Problem:** Deterministic assignments, single teacher per lab, no workload management  
**Solution:** Three-phase hierarchical system with 2-teacher requirement + Fisher-Yates shuffle  
**Result:** 96.30% success (78/81 with 2 teachers), variety between runs, workload balanced

### Key Learnings
1. **Multi-Dimensional Randomization:** Time + order + priority beats single-axis shuffling (Step 3)
2. **Smart Diversity > Pure Random:** Prefer different days/times prevents clustering (Step 3)
3. **Pattern Analysis Works:** Studied successful runs to discover optimal slot pattern (Step 3)
4. **Hierarchical Degradation:** Strict → Fallback → Balance handles NP-hard problems (Step 6)
5. **Randomization Must Preserve Constraints:** Only shuffle within equal-workload groups (Step 6)
6. **Two Teachers > One:** Better supervision, knowledge sharing, coverage (Step 6)

### Success Metrics
```
Lab Scheduling (Step 3):
  Before Multi-Pass:     70% success (20/27 labs)
  After Multi-Pass:      93% success (25/27 labs)  
  After Dual Random:    100% success (27/27 labs) ✅

Teacher Assignment (Step 6):
  Before Hierarchy:      100% success but no rank respect
  After Hierarchy:       100% success but only 1 teacher/batch
  After 2-Teacher Logic: 96% with 2 teachers, 1% with 1 teacher, 3% with 0 teachers ✅
  With Randomization:    Different pairings each run while maintaining 96% success ✅
```

See [HIERARCHICAL_TEACHER_ASSIGNMENT.md](HIERARCHICAL_TEACHER_ASSIGNMENT.md), [MULTI_PASS_RETRY_SYSTEM.md](MULTI_PASS_RETRY_SYSTEM.md), and [LESSONS_LEARNED.md](LESSONS_LEARNED.md) for details.

---

## 1. The 7-Step Process

### Correct Step Order
1. **Step 1:** Load Sections - Initialize empty timetables for all sections
2. **Step 2:** Block Fixed Slots - Reserve OEC/PEC time slots
3. **Step 3:** Schedule Labs - Assign lab sessions with batch rotation (Dual Randomization)
4. **Step 4:** Schedule Theory + Breaks - Place theory classes with load balancing
5. **Step 5:** Assign Classrooms - Allocate theory classrooms (fixed → regular → skip projects)
6. **Step 6:** Assign Lab Teachers - Assign 2 teachers per lab with hierarchy & randomization
7. **Step 7:** Validate & Finalize - Check constraints and mark complete

### Why This Order?
**Constraint hierarchy (most restrictive → most flexible):**
- **Fixed slots** → No flexibility (must be honored)
- **Labs** → Strict constraints (2-hour blocks, batch rotation, room availability)
- **Theory** → Moderate flexibility (1-hour slots, can be spread across days)
- **Classrooms** → Resource allocation (depends on scheduled slots)
- **Teachers** → Human resources (depends on scheduled slots + classrooms)
- **Teachers** → Resource allocation (depends on scheduled slots)
- **Validation** → Final check (all constraints satisfied)

### Key Principle: Defer Resource Assignment
- Steps 1-4 focus on **WHEN** (time scheduling)
- Steps 5-6 focus on **WHERE/WHO** (resource assignment)
- This separation makes conflict resolution easier and reruns faster

---

## 2. Step 1: Load Sections

### Purpose
Initialize the scheduling process by creating empty timetable documents.

### Process
1. Query `ise_sections` collection for target semester type (odd/even)
2. Delete any existing timetables for that sem_type + academic_year
3. Create fresh timetable document for each section
4. Initialize empty arrays: `lab_slots`, `theory_slots`
5. Set metadata: `current_step: 1`, `steps_completed: ['load_sections']`

### Why First?
- Provides clean slate
- Prevents leftover data from previous runs
- Establishes section context for all subsequent steps

---

## 3. Step 2: Block Fixed Slots (OEC/PEC)

### Purpose
Reserve specific time slots for Open Elective Courses (OEC) and Professional Elective Courses (PEC) before other scheduling begins.

### Input Required
Admin defines fixed slots with:
- Subject name
- Day of week
- Start time and end time
- Applicable sections (e.g., all Sem 7 sections)

### Process
1. For each predefined fixed slot:
   - Find matching timetables (by semester)
   - Add slot to `theory_slots` array
   - Set flags: `is_fixed_slot: true`, `is_elective: true`
   - Mark time as unavailable for other scheduling
2. Update metadata: `current_step: 2`

### Why Before Labs?
- OEC/PEC have zero flexibility (external dependencies)
- Must be honored by all subsequent steps
- Labs and theory must work around these slots

---

## 4. Step 3: Schedule Labs

### Strategy
**Dynamic room assignment with global conflict tracking**

### Key Innovation: Batch Rotation Formula
```
labIndex = (round + batchNum - 1) % totalLabs
```
This ensures every batch rotates through all labs fairly across weeks.

### Global Room Tracker
- Maintains map of occupied rooms: `roomId_day_startTime_endTime`
- Prevents double-booking across ALL sections
- Cleared at start of each Step 3 run

### Process Flow
1. Clear global room tracker
2. Sort sections for fair distribution (interleave by semester)
3. For each section:
   - Get shuffled list of day-time combinations
   - For each time slot:
     - **Validate slot**:
       - Within working hours (08:00-17:00)
       - Doesn't overlap breaks
       - No theory conflicts
       - Not consecutive to another lab
       - Daily lab limit not exceeded
     - **Try scheduling all 3 batches**:
       - Calculate which lab each batch does (rotation)
       - Find compatible free lab room for each batch
       - Check global room availability
       - If ALL 3 succeed → Commit to database
       - If ANY fail → Try next slot
4. Save all lab slots
5. Update metadata: `current_step: 3`

### Constraints Enforced
✅ 2-hour continuous blocks  
✅ Batch rotation (every batch does every lab)  
✅ No consecutive labs for same section  
✅ Global room conflicts (inter-section)  
✅ Daily lab limits (max 1-2 per day)  
✅ No overlap with fixed slots or breaks

---

## 5. Step 4: Schedule Theory + Breaks

### Strategy
**Divide-and-rule with load balancing**

### Divide-and-Rule Approach
Instead of filling Monday → Friday sequentially:
1. **Divide** subjects into 5 groups (one per day)
2. **Distribute** evenly to balance daily load
3. **Schedule** each day's group across available time slots

### Load Balancing Logic
```
Target subjects per day = Total subjects / 5 days
```
Prevents heavy days and light days.

### Process Flow
1. Get subjects for section (excluding labs, OEC, PEC)
2. **Divide subjects** into 5 day-groups
3. For each day:
   - Get available time slots (exclude labs, fixed, breaks)
   - Schedule day's subjects into slots
   - Add default breaks (11:00-11:30, 13:30-14:00)
4. Save theory slots and breaks
5. Update metadata: `current_step: 4`

### Break Management
- **Default breaks**: Always at 11:00 and 13:30
- **Auto-skip**: If no classes before break, skip it
- **Customizable**: Admins can add/remove breaks in editor

### Constraints Enforced
✅ 1-hour theory slots  
✅ No teacher conflicts (same teacher, same time)  
✅ No overlap with labs or fixed slots  
✅ Even distribution across days  
✅ Breaks inserted automatically

---

## 6. Step 5: Assign Classrooms

### Strategy
**Priority-based assignment with global tracking**

### Priority Order
1. **Fixed slots** (OEC/PEC) - Must get rooms first
2. **Regular theory** - Normal classes
3. **Projects** - Skipped (no classroom needed)

### Global Classroom Tracker
- Tracks which rooms are used when across ALL sections
- Key format: `roomId_day_startTime`
- Prevents classroom double-booking

### Process Flow
1. Fetch all theory classrooms from database
2. Build global classroom schedule
3. For each timetable:
   - **Phase 1**: Assign rooms to fixed slots
   - **Phase 2**: Assign rooms to regular theory slots
   - **Phase 3**: Skip project slots
4. Track results: assigned, unassigned, success rate
5. Update metadata: `current_step: 5`

### Results
- Fixed slots assigned: X/Y
- Regular slots assigned: X/Y
- Unassigned slots: Z (if rooms ran out)
- Success rate: (Assigned / Total) * 100%

---

## 7. Step 6: Assign Lab Teachers

### Strategy
**2 teachers per lab, fallback to 1**

### Process Flow
1. For each timetable's lab slots:
   - Get lab code (e.g., "DDCO-LAB")
   - Query teachers who handle that lab (from `labs_handled` field)
   - **Try assigning 2 teachers**:
     - Check both teachers are free at that time
     - If yes → Assign both
     - If only 1 free → Assign 1
     - If none free → Leave unassigned
2. Track results: 2-teacher slots, 1-teacher slots, no-teacher slots
3. Update metadata: `current_step: 6`

### Results
- Slots with 2 teachers: X
- Slots with 1 teacher: Y
- Slots with no teachers: Z
- Success rate: ((X + Y) / Total) * 100%

---

## 8. Step 7: Validate & Finalize

### Purpose
Final constraint check and completion marking.

### Validations
1. **No teacher conflicts** - Same teacher, same time
2. **No room conflicts** - Same room, same time
3. **All breaks present** - Default breaks exist
4. **Day length reasonable** - Not too long (< 8 hours)
5. **Lab constraints met** - Batch rotation, no consecutive

### Process
1. Run all constraint checks
2. Generate validation report
3. If pass → Mark metadata: `current_step: 7`, `is_complete: true`
4. If fail → Return errors for admin review

---

## Key Learnings

### What Works Well
✅ **Constraint hierarchy** - Most restrictive first (fixed → labs → theory)  
✅ **Deferred resource assignment** - Schedule time first, assign resources later  
✅ **Global conflict tracking** - Prevents double-booking across sections  
✅ **Divide-and-rule** - Even distribution avoids heavy/light days  
✅ **Batch rotation formula** - Guarantees fairness mathematically

### Design Decisions Explained

**Q: Why separate classroom assignment (Step 5) from theory scheduling (Step 4)?**  
A: Easier to rerun just classroom assignment if rooms change, without rescheduling theory.

**Q: Why assign teachers last (Step 6)?**  
A: Teachers are flexible resources. Schedule first, then find available teachers.

**Q: Why validate at the end (Step 7)?**  
A: Steps 1-6 build the schedule. Step 7 confirms it's valid before marking complete.

**Q: Why clear and regenerate instead of incremental updates?**  
A: Cleaner state management, avoids partial/corrupted data, easier debugging.

### Performance Optimizations
- **In-memory trackers** (not database queries) for conflict checking
- **Shuffle time slots** to avoid bias toward early slots
- **Interleave sections** to distribute resources fairly
- **Batch database updates** to reduce I/O

### Future Enhancements
- Parallel section scheduling (currently sequential)
- Machine learning for optimal slot selection
- Constraint relaxation if no solution found
- Multi-day lab sessions support

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
