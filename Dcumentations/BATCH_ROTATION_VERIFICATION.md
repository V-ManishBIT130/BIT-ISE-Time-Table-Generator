# Step 3 Lab Scheduling - Batch Rotation Verification

**Date:** November 12, 2025  
**Purpose:** Verify batch rotation logic ensures ALL batches get ALL labs correctly

---

## ✅ **Processing Order (Updated)**

### **New Order: By Semester Priority**
```
3A → 3B → 3C → 5A → 5B → 5C → 7A → 7B → 7C
```

**Why This Order?**
- ✅ Junior semesters (3rd) get **first pick** of lab rooms/times
- ✅ Senior semesters (7th) schedule last with remaining slots
- ✅ Fair distribution: All sections within same semester get equal priority
- ✅ Prevents 7th sem from "starving" 3rd sem of popular time slots

---

## 🔄 **Batch Rotation Logic - Rule 4.7**

### **The Formula:**
```javascript
labIndex = (roundsScheduled + batchNum - 1) % NUM_LABS
```

### **What This Means:**
Each batch rotates through ALL labs over multiple weeks/rounds, ensuring every batch does every lab exactly once per rotation cycle.

---

## 📊 **Example: 3-Lab Semester (CN, DDCO, DS)**

### **Scenario:**
- **Section:** 3A
- **Labs:** 3 labs (CN, DDCO, DS)
- **Batches:** 3 batches (3A1, 3A2, 3A3)
- **Rounds Needed:** 3 rounds (one per lab)

### **Lab Array (Sorted by lab_code):**
```javascript
labs[0] = CN Lab (Computer Networks)
labs[1] = DDCO Lab (Digital Design)
labs[2] = DS Lab (Data Structures)
```

---

### **Round 1: Monday 10:00-12:00**

**Formula Application:**
```
roundsScheduled = 0 (this is Round 1)

Batch 3A1 (batchNum = 1):
  labIndex = (0 + 1 - 1) % 3 = 0 % 3 = 0
  → labs[0] = CN Lab ✅

Batch 3A2 (batchNum = 2):
  labIndex = (0 + 2 - 1) % 3 = 1 % 3 = 1
  → labs[1] = DDCO Lab ✅

Batch 3A3 (batchNum = 3):
  labIndex = (0 + 3 - 1) % 3 = 2 % 3 = 2
  → labs[2] = DS Lab ✅
```

**Result:**
| Batch | Lab Assigned | Room |
|-------|--------------|------|
| 3A1 | CN Lab | Room A |
| 3A2 | DDCO Lab | Room B |
| 3A3 | DS Lab | Room C |

---

### **Round 2: Tuesday 14:00-16:00**

**Formula Application:**
```
roundsScheduled = 1 (this is Round 2)

Batch 3A1 (batchNum = 1):
  labIndex = (1 + 1 - 1) % 3 = 1 % 3 = 1
  → labs[1] = DDCO Lab ✅ (rotated!)

Batch 3A2 (batchNum = 2):
  labIndex = (1 + 2 - 1) % 3 = 2 % 3 = 2
  → labs[2] = DS Lab ✅ (rotated!)

Batch 3A3 (batchNum = 3):
  labIndex = (1 + 3 - 1) % 3 = 3 % 3 = 0
  → labs[0] = CN Lab ✅ (rotated!)
```

**Result:**
| Batch | Lab Assigned | Room |
|-------|--------------|------|
| 3A1 | DDCO Lab | Room B |
| 3A2 | DS Lab | Room C |
| 3A3 | CN Lab | Room A |

---

### **Round 3: Wednesday 10:00-12:00**

**Formula Application:**
```
roundsScheduled = 2 (this is Round 3)

Batch 3A1 (batchNum = 1):
  labIndex = (2 + 1 - 1) % 3 = 2 % 3 = 2
  → labs[2] = DS Lab ✅ (rotated again!)

Batch 3A2 (batchNum = 2):
  labIndex = (2 + 2 - 1) % 3 = 3 % 3 = 0
  → labs[0] = CN Lab ✅ (rotated again!)

Batch 3A3 (batchNum = 3):
  labIndex = (2 + 3 - 1) % 3 = 4 % 3 = 1
  → labs[1] = DDCO Lab ✅ (rotated again!)
```

**Result:**
| Batch | Lab Assigned | Room |
|-------|--------------|------|
| 3A1 | DS Lab | Room C |
| 3A2 | CN Lab | Room A |
| 3A3 | DDCO Lab | Room B |

---

### **Final Summary - Complete Rotation:**

| Batch | Round 1 | Round 2 | Round 3 | Coverage |
|-------|---------|---------|---------|----------|
| **3A1** | CN Lab | DDCO Lab | DS Lab | ✅ ALL 3 |
| **3A2** | DDCO Lab | DS Lab | CN Lab | ✅ ALL 3 |
| **3A3** | DS Lab | CN Lab | DDCO Lab | ✅ ALL 3 |

**Verification:**
- ✅ Each batch does **ALL 3 labs** (CN, DDCO, DS)
- ✅ Each batch does **each lab exactly once**
- ✅ No batch misses any lab
- ✅ No batch repeats any lab

---

## 🧮 **Mathematical Proof**

### **Theorem: Complete Coverage**

For a section with:
- `N` labs
- `N` batches
- `N` rounds

**Claim:** Every batch will do every lab exactly once.

**Proof:**

For batch `b` in round `r`:
```
labIndex(b, r) = (r + b - 1) mod N
```

**Property 1:** No batch repeats a lab in the same cycle
```
For batch b, across rounds r1 and r2 (where r1 ≠ r2):
  labIndex(b, r1) = (r1 + b - 1) mod N
  labIndex(b, r2) = (r2 + b - 1) mod N
  
  If r1 ≠ r2, then (r1 + b - 1) ≠ (r2 + b - 1)
  Therefore, labIndex(b, r1) ≠ labIndex(b, r2) (within N rounds)
```

**Property 2:** Each batch covers all labs
```
For batch b across N rounds (r = 0 to N-1):
  labIndex(b, 0) = (0 + b - 1) mod N = (b - 1) mod N
  labIndex(b, 1) = (1 + b - 1) mod N = b mod N
  labIndex(b, 2) = (2 + b - 1) mod N = (b + 1) mod N
  ...
  labIndex(b, N-1) = (N-1 + b - 1) mod N = (b + N - 2) mod N

  The sequence (b-1, b, b+1, ..., b+N-2) mod N covers all values 0 to N-1
  Therefore, each batch does all N labs exactly once ✅
```

**QED** ∎

---

## 🎯 **Real-World Example: 5th Semester**

### **Scenario:**
- **Section:** 5A
- **Labs:** AI Lab, CN Lab, DV Lab (3 labs)
- **Batches:** 5A1, 5A2, 5A3
- **Rounds:** 3 rounds needed

### **Week Schedule:**

**Round 1 - Monday 08:00-10:00:**
- 5A1 → AI Lab (Room 612A)
- 5A2 → CN Lab (Room 612B)
- 5A3 → DV Lab (Room 612C)

**Round 2 - Wednesday 14:00-16:00:**
- 5A1 → CN Lab (Room 612B) ✅ Rotated
- 5A2 → DV Lab (Room 612C) ✅ Rotated
- 5A3 → AI Lab (Room 612A) ✅ Rotated

**Round 3 - Friday 10:00-12:00:**
- 5A1 → DV Lab (Room 612C) ✅ Rotated
- 5A2 → AI Lab (Room 612A) ✅ Rotated
- 5A3 → CN Lab (Room 612B) ✅ Rotated

**Result:**
Every batch (5A1, 5A2, 5A3) does all 3 labs (AI, CN, DV) exactly once! ✅

---

## ⚠️ **Important Constraints**

### **1. Same-Time Scheduling (Critical!)**
```javascript
// ALL 3 batches MUST be scheduled at the SAME time
// This is enforced in the code:

for (let batchNum = 1; batchNum <= NUM_BATCHES; batchNum++) {
  // All batches use SAME day, start, end
  const availableRoom = await findAvailableRoom(lab._id, day, start, end)
}

// If ANY batch can't find a room, the ENTIRE round is skipped
if (!allRoomsAvailable) {
  // All 3 batches fail together - maintain synchronization
  continue
}
```

**Why?** Students from all batches must be in labs simultaneously (no batch left in theory class alone).

### **2. Room Compatibility**
Each lab requires specific equipment:
- CN Lab → Needs networking equipment (Room 612A, 612B)
- DV Lab → Needs Python/visualization tools (Room 612C)
- DDCO Lab → Needs hardware design tools (Room 604A, 604B)

**Algorithm ensures:** Each batch gets a room that has the equipment for THEIR assigned lab.

### **3. Conflict Prevention**
- ✅ No room used by 2 batches in same slot (internal conflict prevention)
- ✅ No room used by 2 sections at overlapping times (global conflict prevention with multi-segment tracking)
- ✅ No theory class conflicts
- ✅ No consecutive labs (students need breaks)

---

## 🔍 **Verification Checklist**

### **Before Running Step 3:**
- ✅ All lab subjects defined in `SyllabusLabs` (sorted by lab_code)
- ✅ All lab rooms defined in `DeptLabs` with correct equipment mapping
- ✅ Theory fixed slots (OEC/PEC) already scheduled in Step 2

### **After Running Step 3:**
- ✅ Check logs: "All X rounds successfully scheduled!"
- ✅ Each section has `NUM_LABS` lab sessions scheduled
- ✅ Each lab session has exactly 3 batches
- ✅ Batch rotation follows pattern (verify with logs)
- ✅ No unresolved scheduling conflicts reported

### **Database Verification:**
```javascript
// For any section (e.g., 3A):
const tt = await Timetable.findOne({ section_name: '3A' })

// Check lab_slots array
tt.lab_slots.forEach((slot, roundIndex) => {
  console.log(`Round ${roundIndex + 1}:`)
  slot.batches.forEach(batch => {
    console.log(`  ${batch.batch_name}: ${batch.lab_shortform} in ${batch.lab_room_name}`)
  })
})

// Verify each batch appears 3 times (once per round)
// Verify each batch does all 3 labs (CN, DDCO, DS)
```

---

## 📝 **Summary**

### **Batch Rotation Logic:**
✅ **CORRECT** - Mathematical proof guarantees complete coverage

### **Processing Order:**
✅ **UPDATED** - Now processes 3rd → 5th → 7th semester (fair priority)

### **Conflict Prevention:**
✅ **FIXED** - Multi-segment tracking prevents ALL overlaps (Nov 12 fix)

### **Synchronization:**
✅ **ENFORCED** - All batches scheduled at same time or entire round skipped

### **Room Compatibility:**
✅ **GUARANTEED** - Only assigns rooms with correct equipment

### **Result:**
Every batch of every section gets to do every lab exactly once per rotation cycle, with proper room assignments and zero conflicts! 🎉

---

## 🎓 **Educational Value**

**Why Batch Rotation Matters:**
- **Fair Learning:** All students (across all batches) get equal exposure to all labs
- **Practical Skills:** Students practice in properly equipped labs
- **Time Management:** Clear schedule with no double-booking or conflicts
- **Institutional Efficiency:** Optimal use of limited lab resources

**The algorithm ensures educational equity while maximizing resource utilization!** 📚
