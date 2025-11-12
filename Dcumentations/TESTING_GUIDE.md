# Step 5 Testing Guide

## Prerequisites
1. ✅ Both servers running:
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:5173`
2. ✅ MongoDB connected with sample data
3. ✅ At least one timetable generated through Step 4

## Test Suite 1: Basic Classroom Assignment

### Test 1.1: Run Step 5
**Steps**:
1. Navigate to Timetable Generator
2. Select semester type (Odd/Even)
3. Click "Run Step 5: Assign Classrooms"
4. Wait for completion

**Expected Result**:
- ✅ Success message appears
- ✅ Result shows counts: "Fixed: X, Regular: Y, Projects: Z (skipped)"
- ✅ Console shows phase-by-phase execution
- ✅ No errors in browser console

### Test 1.2: View Classroom Badges
**Steps**:
1. Navigate to Timetable Viewer
2. Select semester and section
3. Scroll through the timetable

**Expected Result**:
- ✅ Blue badges on fixed slots (e.g., "📍 ISE Lab 1")
- ✅ Green badges on regular theory slots (e.g., "📍 Room 301")
- ✅ NO badges on lab sessions
- ✅ NO badges on project slots

### Test 1.3: Re-run Step 5
**Steps**:
1. Go back to Generator
2. Click "Run Step 5" again

**Expected Result**:
- ✅ Previous classroom assignments cleared
- ✅ New assignments made from scratch
- ✅ No duplicate classroom assignments
- ✅ Console shows "Clearing previous assignments..."

## Test Suite 2: Editing Features

### Test 2.1: Theory Slot Locking
**Steps**:
1. Navigate to Timetable Editor
2. Load a timetable with Step 5 completed
3. Try to drag a theory slot

**Expected Result**:
- ✅ Header shows: "🔒 Theory slots locked after classroom assignment..."
- ✅ Theory slots show lock badge (🔒)
- ✅ Theory slots are NOT draggable
- ✅ Drag handle (⋮⋮) is hidden
- ✅ Breaks are still draggable

### Test 2.2: Change Room Button Hover
**Steps**:
1. In Timetable Editor (after Step 5)
2. Hover mouse over a theory slot
3. Move mouse away

**Expected Result**:
- ✅ "🏫 Change Room" button appears on hover
- ✅ Button disappears when mouse leaves
- ✅ Button has purple gradient background
- ✅ Hover effect shows slight elevation

### Test 2.3: Open Room Selection Modal
**Steps**:
1. Hover over a theory slot
2. Click "🏫 Change Room" button

**Expected Result**:
- ✅ Modal opens with fade-in animation
- ✅ Shows subject name, teacher, current room
- ✅ Shows day and time
- ✅ "Available Classrooms" section appears
- ✅ Loading indicator shows briefly

### Test 2.4: Room List Display
**Steps**:
1. Open room modal (see Test 2.3)
2. Wait for rooms to load
3. Check the list

**Expected Result**:
- ✅ List of available classrooms displayed
- ✅ Each room shows: name, type (THEORY/LAB)
- ✅ Current room has blue highlight + "✓ Current" badge
- ✅ Hover effect on room items (green highlight)

### Test 2.5: Change Classroom
**Steps**:
1. Open room modal
2. Click on a different classroom
3. Check the slot

**Expected Result**:
- ✅ Modal closes automatically
- ✅ Classroom badge updates to new room
- ✅ "Unsaved changes" indicator increments
- ✅ Undo button shows "(1)" in label
- ✅ Console logs success message

### Test 2.6: Undo Classroom Change
**Steps**:
1. Make a classroom change (see Test 2.5)
2. Press `Ctrl+Z` (or click Undo button)

**Expected Result**:
- ✅ Classroom badge reverts to old room
- ✅ "Unsaved changes" counter decrements
- ✅ Redo button becomes available
- ✅ Console shows "Classroom reverted to..."

### Test 2.7: Redo Classroom Change
**Steps**:
1. Undo a classroom change (see Test 2.6)
2. Press `Ctrl+Y` (or click Redo button)

**Expected Result**:
- ✅ Classroom badge changes to new room again
- ✅ "Unsaved changes" counter increments
- ✅ Undo button available again
- ✅ Console shows "Classroom changed to..."

### Test 2.8: Save Changes
**Steps**:
1. Make classroom changes
2. Click "💾 Save All" button

**Expected Result**:
- ✅ Loading indicator appears
- ✅ Success message: "Timetable saved successfully!"
- ✅ "Unsaved changes" resets to 0
- ✅ Changes persist after page reload

## Test Suite 3: Conflict Detection

### Test 3.1: No Rooms Available
**Steps**:
1. Manually occupy all classrooms at a specific time (via database)
2. Open room modal for that time slot

**Expected Result**:
- ✅ Modal shows: "⚠️ No classrooms available at this time"
- ✅ No clickable room items
- ✅ Yellow warning background

### Test 3.2: Room Becomes Unavailable (Race Condition)
**Steps**:
1. Open room modal for Slot A
2. In another browser tab, assign the target room to Slot B
3. Go back to first tab and click the room

**Expected Result**:
- ✅ Error message: "⚠️ Conflict: This classroom is no longer available"
- ✅ Modal stays open
- ✅ Available rooms list refreshes
- ✅ Conflicting room removed from list

### Test 3.3: Global Conflict Prevention
**Steps**:
1. Section A: Theory slot at Monday 10:00 → Room 301
2. Section B: Open room modal for Monday 10:00
3. Check available rooms

**Expected Result**:
- ✅ Room 301 does NOT appear in Section B's list
- ✅ Other rooms are available
- ✅ Console shows "Excluding occupied rooms..."

## Test Suite 4: Edge Cases

### Test 4.1: Project Slots
**Steps**:
1. Load timetable after Step 5
2. Check project slots (is_project = true)

**Expected Result**:
- ✅ NO classroom badge on project slots
- ✅ NO "Change Room" button on hover
- ✅ Projects remain unassigned

### Test 4.2: Fixed Slots
**Steps**:
1. Check OEC/PEC fixed slots
2. Hover over fixed slot

**Expected Result**:
- ✅ Blue classroom badge (fixed-classroom style)
- ✅ "Change Room" button still appears
- ✅ Room can be changed (fixed = time, not room)

### Test 4.3: Multiple Quick Changes
**Steps**:
1. Change room for Slot A
2. Immediately change room for Slot B
3. Immediately change Slot A again
4. Press Undo 3 times

**Expected Result**:
- ✅ All changes apply correctly
- ✅ Undo stack maintains order (LIFO)
- ✅ Each undo reverts one change
- ✅ No state corruption

### Test 4.4: Modal Close Without Selection
**Steps**:
1. Open room modal
2. Click outside modal (on overlay)
3. Check slot

**Expected Result**:
- ✅ Modal closes
- ✅ No classroom change occurs
- ✅ "Unsaved changes" unchanged
- ✅ Undo stack unchanged

### Test 4.5: Network Error Handling
**Steps**:
1. Stop backend server
2. Try to open room modal

**Expected Result**:
- ✅ Error message appears
- ✅ Loading state stops
- ✅ Modal shows error state
- ✅ No crash or infinite loading

## Test Suite 5: UI/UX Polish

### Test 5.1: Modal Animations
**Steps**:
1. Open room modal
2. Close modal
3. Open again

**Expected Result**:
- ✅ Smooth fade-in animation
- ✅ Slide-up effect from bottom
- ✅ Close button rotates on hover
- ✅ No flicker or jump

### Test 5.2: Button Hover Effects
**Steps**:
1. Hover over "Change Room" button
2. Hover over room items in modal

**Expected Result**:
- ✅ Change Room button elevates slightly
- ✅ Room items shift right on hover
- ✅ Color transitions are smooth
- ✅ Cursor changes to pointer

### Test 5.3: Color Consistency
**Steps**:
1. Check all classroom badges
2. Check modal design
3. Compare with other components

**Expected Result**:
- ✅ Blue = Fixed slots (matches fixed badge)
- ✅ Green = Regular slots (success color)
- ✅ Purple = Change Room button (accent color)
- ✅ Matches overall theme gradient

### Test 5.4: Responsive Design
**Steps**:
1. Open DevTools
2. Toggle device toolbar
3. Test on mobile sizes (375px, 768px, 1024px)

**Expected Result**:
- ✅ Modal scales to fit screen
- ✅ Room list items stack vertically
- ✅ Buttons remain clickable
- ✅ No horizontal overflow

## Test Suite 6: Performance

### Test 6.1: Large Dataset
**Steps**:
1. Load timetable with 50+ theory slots
2. Hover over multiple slots rapidly
3. Open room modal for different slots

**Expected Result**:
- ✅ No lag in hover detection
- ✅ Modal opens within 300ms
- ✅ Room list renders instantly
- ✅ No memory leaks

### Test 6.2: Undo/Redo Stack Limits
**Steps**:
1. Make 20 consecutive room changes
2. Press Undo 20 times
3. Press Redo 20 times

**Expected Result**:
- ✅ All 20 undos work correctly
- ✅ All 20 redos work correctly
- ✅ Stack memory stable
- ✅ UI remains responsive

## Bug Report Template

If you find issues, report using this format:

```
**Test ID**: [e.g., Test 2.5]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Screenshots**: [Attach if applicable]
**Console Errors**: [Copy from browser console]
**Browser**: [Chrome/Firefox/Safari + version]
```

## Regression Checklist

After any code changes, verify:
- [ ] Step 1-4 still work correctly
- [ ] Break editing still functional
- [ ] Lab slots remain untouched
- [ ] Teacher assignments unaffected
- [ ] Validation step passes
- [ ] Undo/redo for non-classroom actions works

## Automated Testing (Future)

Consider adding:
1. **Unit Tests**: Jest for utility functions
2. **Integration Tests**: API route testing
3. **E2E Tests**: Playwright/Cypress for full workflow
4. **Performance Tests**: Lighthouse CI

## Sign-Off

- [ ] All Test Suite 1 passed
- [ ] All Test Suite 2 passed
- [ ] All Test Suite 3 passed
- [ ] All Test Suite 4 passed
- [ ] All Test Suite 5 passed
- [ ] All Test Suite 6 passed
- [ ] No critical bugs found
- [ ] Documentation updated
- [ ] Ready for production

**Tester**: _______________
**Date**: _______________
**Status**: ⬜ PASS / ⬜ FAIL
