# 🎯 Drag & Drop Manual Timetable Editor

## Overview

Interactive timetable editor allowing manual adjustments through drag-and-drop functionality with Undo/Redo support, real-time conflict detection, and automatic database persistence.

**Last Updated:** December 31, 2025

---

## Features

### 1. Drag & Drop Functionality
- **Theory Slots:** Drag to new day/time positions
- **Fixed Slots:** Can change classrooms but not time (OEC/PEC subjects)
- **Break Slots:** Click to add custom 30-minute breaks
- **Real-time Preview:** Visual feedback during drag operations
- **Conflict Detection:** Automatic validation before saving

### 2. Undo/Redo System (November 2025)

**Capabilities:**
- ✅ Revert any accidental change
- ✅ Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)
- ✅ UI buttons with action counts
- ✅ 6 action types tracked: move_slot, move_break, add_break, delete_break, remove_default_break, change_classroom

**Usage:**
- `Ctrl+Z` - Undo last action
- `Ctrl+Y` or `Ctrl+Shift+Z` - Redo
- Buttons auto-disable when stacks empty

### 3. Auto-Save Functionality (December 2025)

**Automatic Database Persistence:**
- All operations save immediately: drag-drop, classroom changes, breaks, undo, redo
- Frontend and database always synchronized
- No data loss on page refresh or navigation
- Optimistic UI updates with background database sync

**Benefits:** Zero manual saves required, impossible to forget saving, modern UX standard.

### 4. Always-On Classroom Visibility (December 2025)

**Automatic Display:**
- Available classrooms shown by default in every empty time slot
- No toggle button required
- Compact green badges for multiple rooms
- Cross mark when no rooms available
- Hourglass while loading

**Impact:** Removed one extra click per session, instant access to critical scheduling information.

### 5. Break Management

**Operations:**
- Add 30-minute breaks by clicking empty slots
- Delete custom breaks
- Remove default breaks (11:00-11:30, 13:30-14:00)
- All changes persist with `isRemoved` flag
- Respects removed breaks in conflict detection

### 6. Conflict Detection

**Local Conflicts (Same Section):**
- Teacher time conflicts
- Room double-booking
- Time slot overlaps
- Respects removed default breaks

**Global Conflicts (Cross-Section):**
- Teacher teaching multiple sections simultaneously
- Backend validates across all timetables
- Detailed warnings with section information
- Fixed ObjectId comparison for proper exclusion (December 2025)

---

## User Interface

### Edit Mode Features
- Active slot highlighted in blue
- Cursor changes to indicate draggable items
- Red border for conflict warnings
- Unsaved changes counter
- Undo/Redo buttons with keyboard shortcut hints
- "Add Break" mode toggle

### View Mode Features
- Read-only display
- Custom breaks shown (excluding removed defaults)
- Color-coded subjects
- Compact layout

---

## Color Coding

| Subject Type | Color | Example |
|--------------|-------|---------|
| **ISE Subjects** | Blue | Data Structures, DBMS |
| **Other Dept** | Purple | Mathematics, Physics |
| **Fixed Slots (OEC/PEC)** | Teal | Open Elective, Prof Elective |
| **Labs** | Orange | DSL Lab, DBMS Lab |
| **Breaks** | Yellow | Morning Break, Lunch |

---

## Workflow

### Making Changes
1. Select section from dropdown
2. Toggle "Edit Mode"
3. Click slot to select
4. Drag to new position OR click "Add Break"
5. System validates conflicts (respects removed breaks)
6. Use Ctrl+Z if mistake made
7. Changes auto-save immediately
8. No manual save button needed

### Undo/Redo Workflow
**Scenario: Accidental drag**
1. Drag SEPM from Mon 10:00 → Tue 14:00
2. Realize it was wrong
3. Press Ctrl+Z (or click Undo button)
4. SEPM returns to Mon 10:00
5. Auto-saves the undo operation

### Conflict Resolution
When conflict detected:
- Warning displayed with conflict details
- Respects removed breaks (no false warnings)
- Options: Force save or cancel
- Recommendation: Resolve conflict or undo
- Teacher conflicts show which section has the conflict

---

## Critical Fixes (December 2025)

### Break Persistence Fix
**Problem:** Breaks appeared in UI but didn't persist to database.

**Root Cause:** React state updates are asynchronous. `autoSave()` was called immediately after `setTimetable()` but read old state.

**Solution:** Pass fresh data directly to autoSave instead of relying on state closure.

### Cache Invalidation Fix
**Problem:** Moving slots cleared only specific cache keys. Other empty slots showed stale "✗ No rooms" even when rooms were free.

**Solution:** Clear entire cache on any change. All EmptyCells refetch fresh data.

### Fixed Slots Classroom Editing
**Problem:** OEC/PEC subjects couldn't change classrooms even though time was fixed.

**Solution:** Allow classroom changes for `cell.type === 'fixed'` while keeping time locked.

### Classroom Assignment Overwrites
**Problem:** Drag slot (auto-saves) → Assign classroom via PATCH (saves) → Auto-save runs with stale state (overwrites).

**Solution:** Remove redundant auto-save after PATCH. Backend already saved.

---

## API Endpoints

### Update Theory Slots and Breaks
```
PUT /api/timetables/:timetableId/update-slots
Body: { theory_slots, breaks }
```

### Update Single Slot Classroom
```
PATCH /api/timetables/:timetableId/theory-slot/:slotId/classroom
Body: { classroom_id, classroom_name, current_day, current_start_time }
```

### Check Teacher Conflict
```
GET /api/timetables/check-teacher-conflict
Params: { teacher_id, day, start_time, end_time, exclude_timetable_id }
```

### Get Available Rooms
```
GET /api/timetables/available-rooms
Params: { day, start_time, end_time, exclude_timetable_id, exclude_slot_id }
```

---

## Implementation Notes

### Cache Strategy
- `availableClassroomsCache` - React state for caching room availability
- `bypassCacheKeys` - useRef for synchronous tracking during state updates
- `timetableVersion` - Counter to trigger global EmptyCell refetch
- Full cache clearing on any slot/classroom change

### State Management
- Optimistic UI updates for immediate feedback
- Auto-save after every operation
- Undo/Redo stacks track complete action history
- No manual save button required

### Conflict Detection
- Local checks scan current timetable state
- Global checks query backend for other sections
- Proper ObjectId comparison using `.toString()`
- Excludes current timetable from backend checks
