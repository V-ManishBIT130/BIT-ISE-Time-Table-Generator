# Console Logging Guide - Timetable Editor

## Overview
The TimetableEditor now has comprehensive console logging to verify all operations and conflicts in real-time.

## 🎯 What's Been Implemented

### 1. ✅ **ALL Breaks Are Now Draggable**
   - Default breaks (11:00 AM, 1:30 PM) can now be moved
   - Custom breaks can be moved
   - Visual indicator shows "Default" vs "Custom"
   - Default breaks show drag handle (⋮⋮)

### 2. ✅ **Real-Time Conflict Detection**
   - Checks teacher conflicts across **ALL** sections:
     - Theory slots ✓
     - Lab slots ✓
     - Fixed slots ✓
   - Checks time slot conflicts:
     - Theory classes ✓
     - Lab sessions ✓
     - Break times ✓
   - Checks day length constraints
   - Checks max hours per day

### 3. ✅ **Comprehensive Console Logging**

## 📝 Console Log Events

### **When User Drags a Slot:**
```
👆 [DRAG START] User started dragging: {slotId}
📚 [THEORY DRAG] Dragging theory slot: {subject, teacher}
```

### **When User Drops a Slot:**
```
🔄 [DRAG END] Slot dropped: {slotId, newDay, newTime, dropZone}
📚 [MOVE THEORY] Moving theory slot: {subject, teacher, from, to}
```

### **Conflict Detection:**
```
🔍 [CONFLICT CHECK] Running conflict detection...
🔍 [CONFLICT DETECTION] Checking conflicts for: {subject, teacher, teacher_id, target}
   📚 [THEORY CHECK] Teacher busy in theory? true/false
   🧪 [LAB CHECK] Teacher busy in lab? true/false
   ❌ [TEACHER CONFLICT] Teacher is busy teaching: {subject_name}
   ⏰ [SLOT CHECK] Time slot occupied? {theory, lab, break}
   ❌ [SLOT CONFLICT] Time occupied by: Break/Lab/Class
   ⚠️ [MAX HOURS WARNING] Day exceeds 8 hours: {totalHours}
🎯 [CONFLICT RESULT] {hasConflicts, conflictCount, types}
```

### **Conflict Resolution:**
```
✅ [NO CONFLICTS] Move is safe
❌ [CONFLICTS FOUND] {conflicts array}
⚠️ [CONFLICT MODAL] Showing user conflict warning
⚠️ [USER OVERRIDE] User chose to proceed despite conflicts
🚫 [USER CANCELLED] Move cancelled due to conflicts
```

### **State Updates:**
```
💾 [STATE UPDATE] Theory slot moved successfully: {updatedSlot}
💾 [STATE UPDATE] Break moved successfully: {updatedBreak}
✅ [UPDATE SUCCESS] Slot position updated in state
```

### **Break Operations:**
```
☕ [MOVE BREAK] Moving break from {oldDay oldTime} to {newDay newStartTime}
☕ [ADD BREAK] User clicked to add break at {day, timeStr}
✅ [ADD BREAK SUCCESS] Break added to {day time}
🗑️ [DELETE BREAK] Removing break: {day, startTime}
✅ [DELETE SUCCESS] Break removed
```

### **Save/Revert Operations:**
```
💾 [SAVE] Starting save process... {unsavedChanges, theorySlots, breaks, changeHistory}
🔄 [SAVE] Sending data to backend...
✅ [SAVE SUCCESS] All changes saved to database!
❌ [SAVE ERROR] Failed to save changes: {error}

↩️ [REVERT] User wants to revert {count} changes
🔄 [REVERT] Re-fetching original data from database...
✅ [REVERT SUCCESS] Changes reverted
🚫 [REVERT CANCELLED] User cancelled revert
```

### **Blocked Operations:**
```
🚫 [BLOCKED] Cannot drag fixed/lab slot
🚫 [BLOCKED] Cannot move fixed slot
ℹ️ [NO CHANGE] Slot dropped in same position
```

## 🔍 How to Use Console Logs for Verification

### **Verify Teacher Conflict Detection:**
1. Open browser console (F12)
2. Drag a theory slot to a time where that teacher has a lab
3. Look for:
   ```
   🔍 [CONFLICT CHECK] Running conflict detection...
      🧪 [LAB CHECK] Teacher busy in lab? true
      ❌ [TEACHER CONFLICT] Teacher is busy teaching: "CN Lab"
   ❌ [CONFLICTS FOUND] [{type: 'teacher', message: '...'}]
   ```

### **Verify Break Movement:**
1. Drag default break (11:00 AM) to new time
2. Look for:
   ```
   👆 [DRAG START] User started dragging: break_Monday_11:00
   ☕ [MOVE BREAK] Moving break from Monday 11:00 to Monday 10:00
   💾 [STATE UPDATE] Break moved successfully
   ```

### **Verify Save Functionality:**
1. Make changes (move slots, add breaks)
2. Click "💾 Save All"
3. Look for:
   ```
   💾 [SAVE] Starting save process... {unsavedChanges: 3, ...}
   🔄 [SAVE] Sending data to backend...
   ✅ [SAVE SUCCESS] All changes saved to database!
   ```

## 🎯 Testing Checklist

- [ ] **Drag Theory Slot** → See drag start/end logs
- [ ] **Move to Conflicting Time** → See conflict detection logs
- [ ] **Proceed Despite Conflict** → See user override log
- [ ] **Cancel Conflict** → See user cancelled log
- [ ] **Move Default Break** → See break movement logs
- [ ] **Add Custom Break** → See add break logs
- [ ] **Delete Break** → See delete break logs
- [ ] **Save Changes** → See save process logs
- [ ] **Revert Changes** → See revert logs

## 🚀 What to Look For in Console

### ✅ **Good Signs:**
- Conflict detection runs on every move
- Teacher conflicts detected across theory AND labs
- State updates logged after each change
- Save/revert operations complete successfully

### ❌ **Red Flags:**
- Missing conflict checks
- Teacher conflicts not detected
- State not updating
- Save failures

## 📊 Console Log Format

All logs follow this pattern:
```
{EMOJI} [{CATEGORY}] {Message}: {optional_data}
```

**Categories:**
- `DRAG START/END` - Drag operations
- `CONFLICT CHECK/DETECTION` - Conflict analysis
- `STATE UPDATE` - State changes
- `SAVE/REVERT` - Database operations
- `USER OVERRIDE/CANCELLED` - User decisions
- `ERROR` - Failures

**Emojis:**
- 👆 Drag start
- 🔄 Drag end / Processing
- 🔍 Conflict detection
- ✅ Success
- ❌ Error / Conflict
- ⚠️ Warning
- 💾 Save operation
- 🚫 Blocked action
- ☕ Break operation
- 🗑️ Delete operation
- ↩️ Revert operation

## 🎓 Example Console Output

```javascript
// User drags ML theory slot to Wednesday 2:00 PM (where teacher has CN Lab)
👆 [DRAG START] User started dragging: 673abc...
📚 [THEORY DRAG] Dragging theory slot: {subject: 'ML', teacher: 'Dr. Smith'}
🔄 [DRAG END] Slot dropped: {slotId: '673abc...', newDay: 'Wednesday', newTime: '2:00 PM'}
📚 [MOVE THEORY] Moving theory slot: {subject: 'ML', teacher: 'Dr. Smith', from: 'Monday 10:00', to: 'Wednesday 14:00'}
🔍 [CONFLICT CHECK] Running conflict detection...
🔍 [CONFLICT DETECTION] Checking conflicts for: {subject: 'ML', teacher: 'Dr. Smith', teacher_id: '123xyz', target: 'Wednesday 2:00 PM'}
   📚 [THEORY CHECK] Teacher busy in theory? false
   🧪 [LAB CHECK] Teacher busy in lab? true
   ❌ [TEACHER CONFLICT] Teacher is busy teaching: CN Lab
🎯 [CONFLICT RESULT] {hasConflicts: true, conflictCount: 1, types: ['teacher']}
❌ [CONFLICTS FOUND] [{type: 'teacher', message: '❌ Teacher Conflict: Dr. Smith is already teaching "CN Lab" at Wednesday 2:00 PM'}]
⚠️ [CONFLICT MODAL] Showing user conflict warning
// User clicks "OK" to proceed anyway
⚠️ [USER OVERRIDE] User chose to proceed despite conflicts
💾 [UPDATE POSITION] Updating slot position in state {forced: true, slot: 'ML'}
✅ [UPDATE SUCCESS] Slot position updated in state
```

## 🔧 Troubleshooting

### **Conflict Not Detected:**
- Check if `teacher_id` exists on slot
- Verify lab_slots are being checked
- Look for `[CONFLICT CHECK]` logs

### **State Not Updating:**
- Check for `[STATE UPDATE]` logs
- Verify unsavedChanges counter increases
- Look for React state errors

### **Save Failing:**
- Check `[SAVE ERROR]` logs
- Verify backend endpoint `/api/timetables/:id/update-slots` exists
- Check network tab for API response

---

**Note:** All console logs are prefixed with emojis and categories for easy filtering. Use browser console filters:
- Filter by `[CONFLICT]` to see only conflict checks
- Filter by `[SAVE]` to see only save operations
- Filter by `❌` to see only errors
