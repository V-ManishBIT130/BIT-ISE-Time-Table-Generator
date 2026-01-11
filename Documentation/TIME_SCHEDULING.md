# ⏰ Time Scheduling & Working Hours

## Overview
Defines working hours, break management, and the **Divide-and-Rule** scheduling strategy for optimal class distribution.

**Last Updated:** November 2025

---

## 1. Working Hours

- **Start Time:** 8:00 AM
- **End Time:** 5:00 PM (17:00)
- **Working Days:** Monday to Friday
- **Saturday:** Occasionally for makeup classes

---

## 2. Break Management

### Default Breaks
- **Morning Break:** 11:00-11:30 AM (30 min)
- **Lunch Break:** 13:30-14:00 PM (30 min)

### Dynamic Break System (November 2025)
- ✅ **Custom Breaks** - Add breaks at any empty slot via Editor
- ✅ **Remove Default Breaks** - Delete default breaks to free slots for theory
- ✅ **Break Persistence** - Breaks saved to database with `isRemoved` flag
- ✅ **Conflict-Free** - Breaks respect lab schedules and theory slots

---

## 3. Time Slot Duration

### Theory Classes (30-minute granularity)
- **Standard:** 1 hour per slot
- **Can be consecutive:** Yes, but subject to Divide-and-Rule strategy
- **Time Slots:** 18 half-hour slots from 8:00 AM to 5:00 PM

### Lab Sessions (2-hour blocks)
- **Fixed Duration:** 2 hours (non-divisible)
- **Proven Time Slots (5 slots from historical analysis - Nov 13, 2025):**
  - 08:00-10:00
  - 10:00-12:00
  - 12:00-14:00
  - 14:00-16:00
  - 15:00-17:00 (overlaps with 14:00-16:00, but uses different rooms)
- **Total Combinations:** 25 (5 slots × 5 days)
- **Success Pattern:** These exact slots achieved 100% success in historical runs
- **Conflict Prevention:** 30-minute segment granularity prevents same-room overlaps

---

## 4. 🎯 Divide-and-Rule Scheduling Strategy (NEW)

### Goal
**Maximize distribution** of classes across the week to reduce student/teacher fatigue and improve learning retention.

### For Regular ISE & Other Dept Subjects

**Priority 1 (BEST): All 1-hour sessions on different days**
```
Example: SEPM (4 hrs/week)
Sessions: [1, 1, 1, 1]
Result:
  Monday:    10:00-11:00
  Tuesday:   14:00-15:00
  Thursday:  11:30-12:30
  Friday:    09:00-10:00
```
✅ Maximum distribution, minimal fatigue

**Priority 2 (FALLBACK): One 2-hour block + 1-hour sessions**
```
Example: TOC (5 hrs/week)
Sessions: [2, 1, 1, 1]
Result:
  Monday:    11:30-13:30 (2-hr block)
  Wednesday: 10:00-11:00
  Thursday:  14:00-15:00
  Friday:    09:00-10:00
```
✅ Balanced approach

**Priority 3 (LAST RESORT): Multiple 2-hour blocks**
```
Example: CN (4 hrs/week)
Sessions: [2, 2]
Result:
  Monday:    11:30-13:30
  Thursday:  14:00-16:00
```
⚠️ Only if Priorities 1 & 2 fail

### For Project Subjects
**Always keep consecutive blocks**
```
Example: Mini Project (2 hrs/week)
Sessions: [2]
Result:
  Monday: 11:30-13:30 (continuous work time)
```
✅ Projects need uninterrupted blocks

### Benefits
- 📚 Better learning retention (spaced repetition)
- 😊 Reduced mental fatigue
- 🎯 More variety in daily schedule
- ⏰ Flexible time management

---

## 5. Early Start Preference

**Rule:** Maximum 3 days per week starting at 8:00 AM

**Reason:**
- Reduces commute stress
- Better work-life balance
- Phased implementation across sections

**Applies to:** Both theory and lab slots

---
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
