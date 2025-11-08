# ⏰ Time Scheduling & Working Hours

## Overview
This document defines working hours, break times, and time slot allocation rules for timetable generation.

---

## 1. Working Hours

### College Timings
- **Start Time:** 8:00 AM
- **End Time:** 5:00 PM (17:00)
- **Working Days:** Monday to Friday (5 days)
- **Saturday:** Sometimes included for labs/makeup classes

---

## 2. Standard Breaks

### Default Break Times
**Break 1 (Morning):**
- Time: 11:00 AM - 11:30 AM
- Duration: 30 minutes
- Type: Tea/Snack break

**Break 2 (Afternoon):**
- Time: 1:30 PM - 2:00 PM
- Duration: 30 minutes
- Type: Lunch break

### Flexible Break Management
- Breaks are NOT strictly fixed at these times
- Can be adjusted based on lab schedules
- Maximum 2 breaks per day (30 minutes each)
- Algorithm ensures breaks don't conflict with labs

---

## 3. Time Slot Duration

### Theory Classes
- **Standard Duration:** 1 hour per slot
- **Can be consecutive:** Yes, up to `max_hrs_per_day`
- **Example:** 2-hour session = 10:00-12:00 (two consecutive 1-hour slots)

### Lab Sessions
- **Fixed Duration:** 2 hours per session
- **Not divisible:** Always scheduled as complete 2-hour blocks
- **Example:** 8:00-10:00, 10:00-12:00, 2:00-4:00

---

## 4. Available Time Slots

### Theory Time Slots (1 hour each)
- 8:00-9:00 AM
- 9:00-10:00 AM
- 10:00-11:00 AM
- **[BREAK: 11:00-11:30 AM]**
- 11:30-12:30 PM
- 12:30-1:30 PM
- **[BREAK: 1:30-2:00 PM]**
- 2:00-3:00 PM
- 3:00-4:00 PM
- 4:00-5:00 PM

### Lab Time Slots (2 hours each)
- 8:00-10:00 AM
- 10:00-12:00 PM
- 12:00-2:00 PM (includes lunch time)
- 2:00-4:00 PM
- 3:00-5:00 PM

---

## 5. Early Start Preference

### Rule
Limit 8:00 AM classes to **maximum 3 days per week**.

### Reason
- Addresses concerns for students/teachers commuting from far distances
- Better work-life balance
- Reduces morning rush stress

### Counting
Includes BOTH theory and lab slots starting at 8:00 AM.

### Example
✅ **Allowed:**
- Monday: 8:00 AM start (Lab)
- Tuesday: 9:00 AM start
- Wednesday: 8:00 AM start (Theory)
- Thursday: 10:00 AM start
- Friday: 8:00 AM start (Lab)
- **Total: 3 early starts** ✅

❌ **Blocked:**
- Monday, Tuesday, Wednesday, Thursday all at 8:00 AM
- **Total: 4 early starts** ❌

---

## 6. Day Length Constraints (NEW)

### Rule 1: 8 AM Start Days
**If day starts at 8:00 AM → Must end by 4:00 PM (16:00)**

**Reason:** Prevents overly long/hectic days (8 hours maximum).

**Example:**
✅ Monday: 8:00 AM - 4:00 PM (allowed)  
❌ Monday: 8:00 AM - 5:00 PM (too long!)

### Rule 2: Later Start Days
**If day starts after 8:00 AM → Can end by 5:00 PM (17:00)**

**Reason:** Normal workday length with later start gives more flexibility.

**Example:**
✅ Tuesday: 9:00 AM - 5:00 PM (allowed)  
✅ Wednesday: 10:00 AM - 5:00 PM (allowed)

### Benefits
✅ Students get home earlier after early starts  
✅ Reasonable workday length  
✅ Flexibility for later start days  
✅ Prevents scheduling violations

---

## 7. Gap Minimization

### Goal
Minimize empty slots between classes for efficient time usage.

### Strategy
Algorithm prefers:
1. **Filling gaps:** Placing classes between existing classes (gap score = 0)
2. **Extending blocks:** Adding classes adjacent to existing ones (gap score = 1)
3. **Avoid isolation:** Discourages isolated slots with long gaps (gap score = 10+)

### Example
**Current Schedule:**
- Monday: 9:00-10:00 (Class A)
- Monday: 12:00-1:00 (Class B)

**Gap: 10:00-12:00 (2 hours empty)**

**Algorithm prefers:**
✅ Schedule Class C at 10:00-11:00 (fills part of gap, score = 1)  
✅ Schedule Class D at 11:00-12:00 (completes gap, score = 0)

**Algorithm avoids:**
❌ Schedule Class E at 3:00-4:00 (creates new isolated slot, score = 10+)

---

## 8. Subject Diversity Scoring

### Rule
Prevent single-subject days (avoid scheduling the same subject multiple times on the same day).

### Penalty System
- **Subject already on day:** +50 penalty (heavy discouragement)
- **Day has variety:** Slight bonus for adding different subjects
- **Empty day:** Small penalty (+2) to prefer filling existing days first

### Example
**Section 3A - Monday:**
- Already scheduled: Data Structures at 9:00-10:00

**Algorithm evaluates:**
❌ Schedule Data Structures again at 11:00-12:00 (penalty +50)  
✅ Schedule DBMS at 11:00-12:00 (no penalty, adds variety)

### Benefits
✅ Students experience multiple subjects per day  
✅ Prevents monotony  
✅ Better learning distribution

---

## 9. Break Adjustment for Labs

### Rule
If labs conflict with default break times, breaks are adjusted.

### Process
1. Check if any lab overlaps with default break (11:00-11:30 or 1:30-2:00)
2. If conflict exists, skip that break for the day
3. Can find alternative break time if needed

### Example
**Monday Schedule:**
- 8:00-10:00: Labs (Batch rotation)
- 10:00-11:00: Theory
- 11:00-11:30: **BREAK** ✅ (no lab conflict)
- 11:30-12:30: Theory
- 12:30-2:00: **LAB** (conflicts with lunch break)
- 2:00-3:00: Theory

**Result:** Morning break kept, afternoon break skipped due to lab.

---

## 10. Custom Breaks (Manual Editing)

### Feature
Users can add custom breaks when manually editing timetables.

### Rules
- Click on time slot to add break
- Each break: 30 minutes minimum
- Maximum 2 breaks per day
- Stored in database as break array
- Displayed in both Edit and View modes

### Use Cases
- Adjust breaks around late labs
- Add makeup breaks for long days
- Faculty meeting slots
- Administrative requirements

---

## 11. Time Slot Validation

### Checks Performed
Before scheduling any slot, algorithm verifies:

✅ **Within working hours:** 8:00 AM - 5:00 PM  
✅ **No break conflicts:** Not during default break times  
✅ **No lab conflicts:** Theory doesn't overlap with labs  
✅ **No theory conflicts:** No double-booking for section  
✅ **Day length respected:** Early start days end by 4 PM  
✅ **Early start limit:** Max 3 days at 8:00 AM

### Invalid Slot Examples
❌ Theory at 7:00 AM (before working hours)  
❌ Theory at 11:15 AM (during break)  
❌ Theory at 5:30 PM (after working hours)  
❌ 4th day starting at 8:00 AM (exceeds limit)  
❌ 8 AM start day ending at 5 PM (too long)

---

## 12. Scheduling Priority

### Time Slot Allocation Order
1. **Fixed slots first** (OEC/PEC) - Step 2
2. **Lab sessions** - Step 3
3. **Theory classes** - Step 4
4. **Breaks** - Inserted/adjusted as needed

### Why This Order?
- Fixed slots have no flexibility
- Labs have strict constraints (rooms, batches)
- Theory is most flexible
- Breaks adjust around fixed schedule

---

## 13. Random Distribution

### Strategy
Time slots are shuffled before scheduling to avoid patterns.

### Benefits
✅ Prevents clustering on specific days  
✅ Distributes classes evenly across week  
✅ Avoids always using Monday 8:00 AM first  
✅ More natural timetable appearance

### Example Without Shuffle
All sections would start with Monday 8:00 AM, creating unnatural uniformity.

### Example With Shuffle
- Section 3A: Starts Tuesday 9:00 AM
- Section 3B: Starts Monday 10:00 AM
- Section 3C: Starts Wednesday 8:00 AM
- Better variety across sections ✅

---

**Last Updated:** January 2025
