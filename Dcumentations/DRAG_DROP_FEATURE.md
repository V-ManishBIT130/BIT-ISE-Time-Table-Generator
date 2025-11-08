# 🎯 Drag & Drop Manual Timetable Editor

## Overview
Interactive timetable editor allowing manual adjustments through drag-and-drop functionality with real-time conflict detection and database persistence.

---

## Features

### 1. Drag & Drop Functionality
- **Theory Slots:** Drag to new day/time positions
- **Break Slots:** Click to add custom 30-minute breaks
- **Real-time Preview:** Visual feedback during drag operations
- **Conflict Detection:** Automatic validation before saving

### 2. Conflict Detection

#### Local Conflicts (Same Section)
- Teacher time conflicts within same section
- Room double-booking
- Time slot overlaps

#### Global Conflicts (Cross-Section)
- Teacher teaching in multiple sections simultaneously
- Backend API validates across all timetables
- Detailed conflict warnings with section information

### 3. Custom Breaks
- **Click-based system:** Click empty slot to add break
- **Duration:** 30 minutes per break
- **Limit:** Maximum 2 breaks per day
- **Persistence:** Saved to database for viewing

---

## User Interface

### Edit Mode Features
- **Active Slot Highlight:** Selected slot highlighted in blue
- **Draggable Indicators:** Cursor changes to indicate draggable items
- **Conflict Warnings:** Red border for slots with conflicts
- **Unsaved Changes:** Orange "Save Changes" button when modified
- **Break Addition:** "Add Break" mode toggle

### View Mode Features
- **Read-only Display:** No editing allowed
- **Custom Breaks Shown:** Displays all breaks from database
- **Color-coded Subjects:** Visual distinction by subject type
- **Compact Layout:** Clean timetable grid

---

## Color Coding System

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
5. System validates conflicts
6. Click "Save Changes"
7. Confirm save operation

### Conflict Resolution
When conflict detected:
- **Warning displayed** with conflict details
- **Options:** Force save or cancel
- **Recommendation:** Resolve conflict by choosing different time
- **Teacher conflicts:** Shows which section has the conflict

---

## Technical Implementation

### Libraries Used
- `@dnd-kit/core`: Core drag-and-drop engine
- `@dnd-kit/sortable`: Sortable grid functionality  
- `@dnd-kit/utilities`: Helper utilities
- `@dnd-kit/modifiers`: Constraint modifiers

### Sensor Configuration
- **Pointer Sensor:** 8px activation distance
- **Prevents:** Accidental drags from clicks
- **Touch Support:** Works on mobile devices

### API Endpoints
- **PUT `/api/timetables/:id/update-slots`:** Save manual edits
- **GET `/api/timetables/check-teacher-conflict`:** Global conflict check

---

## Known Limitations

### Current
- No undo/redo functionality
- Alert/confirm dialogs (not custom modals)
- No keyboard shortcuts
- Classroom conflicts not detected in real-time

### Future Enhancements
- Toast notifications instead of alerts
- Undo/redo history
- Keyboard shortcuts (Ctrl+Z, Ctrl+S)
- Classroom conflict detection
- Batch operations (move multiple slots)

---

## Best Practices

### When to Use Manual Editor
✅ Fine-tuning generated timetables  
✅ Adjusting for last-minute changes  
✅ Adding custom breaks  
✅ Resolving specific conflicts

### When NOT to Use
❌ Creating timetables from scratch  
❌ Major restructuring (use regeneration)  
❌ Changing subject hours (update database instead)

---

## Testing Checklist

✅ Drag theory slots to different days/times  
✅ Add custom breaks  
✅ Delete breaks  
✅ Save changes to database  
✅ View custom breaks in View Mode  
✅ Test global teacher conflict detection  
✅ Test same-section conflicts  
✅ Cancel unsaved changes

---

**Last Updated:** January 2025  
**Related Files:**
- `TimetableEditor.jsx` (main editor)
- `TimetableViewer.jsx` (view mode)
- `backend_server/routes/timetables.js` (API endpoints)


## Overview
Interactive timetable editor allowing manual adjustments through drag-and-drop functionality with real-time conflict detection and database persistence.

---

## Features

### 1. Drag & Drop Functionality
- **Theory Slots:** Drag to new day/time positions
- **Break Slots:** Click to add custom 30-minute breaks
- **Real-time Preview:** Visual feedback during drag operations
- **Conflict Detection:** Automatic validation before saving

### 2. Conflict Detection

#### Local Conflicts (Same Section)
- Teacher time conflicts within same section
- Room double-booking
- Time slot overlaps

#### Global Conflicts (Cross-Section)
- Teacher teaching in multiple sections simultaneously
- Backend API validates across all timetables
- Detailed conflict warnings with section information

### 3. Custom Breaks
- **Click-based system:** Click empty slot to add break
- **Duration:** 30 minutes per break
- **Limit:** Maximum 2 breaks per day
- **Persistence:** Saved to database for viewing

---

## User Interface

### Edit Mode Features
- **Active Slot Highlight:** Selected slot highlighted in blue
- **Draggable Indicators:** Cursor changes to indicate draggable items
- **Conflict Warnings:** Red border for slots with conflicts
- **Unsaved Changes:** Orange "Save Changes" button when modified
- **Break Addition:** "Add Break" mode toggle

### View Mode Features
- **Read-only Display:** No editing allowed
- **Custom Breaks Shown:** Displays all breaks from database
- **Color-coded Subjects:** Visual distinction by subject type
- **Compact Layout:** Clean timetable grid

---

## Color Coding System

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
5. System validates conflicts
6. Click "Save Changes"
7. Confirm save operation

### Conflict Resolution
When conflict detected:
- **Warning displayed** with conflict details
- **Options:** Force save or cancel
- **Recommendation:** Resolve conflict by choosing different time
- **Teacher conflicts:** Shows which section has the conflict

---

## Technical Implementation

### Libraries Used
- `@dnd-kit/core`: Core drag-and-drop engine
- `@dnd-kit/sortable`: Sortable grid functionality  
- `@dnd-kit/utilities`: Helper utilities
- `@dnd-kit/modifiers`: Constraint modifiers

### Sensor Configuration
- **Pointer Sensor:** 8px activation distance
- **Prevents:** Accidental drags from clicks
- **Touch Support:** Works on mobile devices

### API Endpoints
- **PUT `/api/timetables/:id/update-slots`:** Save manual edits
- **GET `/api/timetables/check-teacher-conflict`:** Global conflict check

---

## Known Limitations

### Current
- No undo/redo functionality
- Alert/confirm dialogs (not custom modals)
- No keyboard shortcuts
- Classroom conflicts not detected in real-time

### Future Enhancements
- Toast notifications instead of alerts
- Undo/redo history
- Keyboard shortcuts (Ctrl+Z, Ctrl+S)
- Classroom conflict detection
- Batch operations (move multiple slots)

---

## Best Practices

### When to Use Manual Editor
✅ Fine-tuning generated timetables  
✅ Adjusting for last-minute changes  
✅ Adding custom breaks  
✅ Resolving specific conflicts

### When NOT to Use
❌ Creating timetables from scratch  
❌ Major restructuring (use regeneration)  
❌ Changing subject hours (update database instead)

---

## Testing Checklist

✅ Drag theory slots to different days/times  
✅ Add custom breaks  
✅ Delete breaks  
✅ Save changes to database  
✅ View custom breaks in View Mode  
✅ Test global teacher conflict detection  
✅ Test same-section conflicts  
✅ Cancel unsaved changes

---

**Last Updated:** January 2025  
**Related Files:**
- `TimetableEditor.jsx` (main editor)
- `TimetableViewer.jsx` (view mode)
- `backend_server/routes/timetables.js` (API endpoints)


## ✅ What's Been Implemented (Phase 1)

### **1. Core Infrastructure**
- ✅ Installed `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- ✅ Created `TimetableEditor.jsx` component (500+ lines)
- ✅ Created `TimetableEditor.css` stylesheet (comprehensive styling)
- ✅ Added navigation link in Dashboard sidebar (✏️ Edit TT)
- ✅ Added route `/dashboard/editor` in App.jsx

### **2. UI Components Built**

#### **Draggable Theory Slots**
- Only **theory classes** are draggable (blue gradient)
- **Fixed slots** (teal) and **lab slots** (orange) are locked 🔒
- Visual drag handle indicator (⋮⋮)
- Smooth grab cursor on hover
- Transform animation while dragging

#### **Droppable Time Zones**
- Empty time slots show "Drop here" placeholder
- Hover effects (border color changes to blue)
- Active drag-over state (green border + glow animation)
- 30-minute interval grid (8:00 AM - 5:00 PM)

#### **Grid Layout**
- 6 days (Mon-Sat) × 18 time slots (30-min each)
- Sticky headers (days + times)
- Responsive overflow scrolling
- Color-coded slots by type

### **3. Features Working**

✅ **Visual Feedback**
- Drag preview overlay (semi-transparent blue card)
- Cursor changes (grab → grabbing)
- Slot opacity reduces while dragging
- Drop zones highlight on hover

✅ **Conflict Detection Logic** (in code, not yet fully wired)
- Teacher conflict checking
- Time slot overlap checking
- Break time validation
- Day length constraint checking

✅ **Change Tracking**
- Unsaved changes counter (⚠️ badge)
- Change history array
- Save/Revert buttons (styled, ready for API)

✅ **Controls**
- Semester type toggle (Odd/Even)
- Section dropdown
- Real-time section filtering

---

## 🚧 Phase 2: Backend Integration (Next Steps)

### **Tasks Remaining**

#### **1. Backend API Endpoint**
Create `PUT /api/timetables/:id/slots/:slotId` to update slot position:

```javascript
// backend_server/routes/timetables.js
router.put('/:timetableId/slots/:slotId', async (req, res) => {
  const { timetableId, slotId } = req.params
  const { day, start_time, end_time, forced } = req.body

  // 1. Find timetable
  const timetable = await Timetable.findById(timetableId)
  
  // 2. Find slot in theory_slots array
  const slot = timetable.theory_slots.id(slotId)
  
  // 3. Run conflict checks
  const conflicts = await checkConflicts(slot, day, start_time, end_time)
  
  // 4. If forced=false and conflicts exist, return 409
  if (!forced && conflicts.length > 0) {
    return res.status(409).json({ conflicts })
  }
  
  // 5. Update slot position
  slot.day = day
  slot.start_time = start_time
  slot.end_time = end_time
  
  // 6. Save and return
  await timetable.save()
  res.json({ success: true, data: timetable })
})
```

#### **2. Wire Up Save/Revert**
- **Save**: Batch-update all changes via API
- **Revert**: Re-fetch original timetable from DB

#### **3. Real-Time Conflict Modal**
- Show conflict details in a modal (not browser `confirm()`)
- Options: "Revert" or "Force Update"
- Visual red/yellow indicators

#### **4. Undo/Redo Stack** (optional enhancement)
- Implement undo functionality
- Limit to last 10 actions

---

## 📋 Phase 3: Polish & Testing (After Phase 2)

### **UI Enhancements**
- [ ] Add loading spinner during drag operations
- [ ] Toast notifications (success/error)
- [ ] Keyboard shortcuts (Ctrl+Z for undo, Ctrl+S for save)
- [ ] Mobile responsiveness improvements

### **Conflict Visualization**
- [ ] Red border around conflicting slots
- [ ] Warning icon on drop zone if conflict detected
- [ ] Conflict summary panel (permanent sidebar)

### **Testing**
- [ ] Test all conflict scenarios:
  - Teacher double-booking
  - Section overlap
  - Break time violations
  - Day length violations
  - Max hours per day exceeded
- [ ] Test edge cases:
  - Dragging to same position (no-op)
  - Dragging lab slots (should fail)
  - Dragging fixed slots (should fail)
  - Multiple rapid drags
  - Network failures during save

---

## 🎨 Current UI Design

### **Color Scheme**
- **Theory (Draggable)**: Blue gradient (#3b82f6 → #2563eb)
- **Fixed Slots**: Teal gradient (#14b8a6 → #0d9488)
- **Lab Slots**: Orange gradient (#f97316 → #ea580c)
- **Drop Zones**: Light gray with dashed border
- **Drag-Over**: Green border with glow animation
- **Unsaved Changes**: Yellow/orange gradient pulsing

### **Icons & Badges**
- ⋮⋮ Drag handle
- 🔒 Fixed badge
- 🧪 Lab badge
- ⚠️ Unsaved changes warning
- 💾 Save button
- ↩️ Revert button

---

## 🚀 How to Test (Phase 1)

1. **Start frontend**:
   ```powershell
   npm run dev
   ```

2. **Login** to dashboard

3. **Click "✏️ Edit TT"** in sidebar

4. **Select section** with generated timetable

5. **Try dragging** a blue theory slot:
   - Hover over slot → cursor becomes grab
   - Click and drag → preview appears
   - Drop on empty zone → (Phase 2 will update DB)

6. **Observe locked slots**:
   - Teal slots (Fixed) → cursor: not-allowed
   - Orange slots (Labs) → cursor: not-allowed

---

## 📊 Code Statistics

- **Lines Added**: ~1,200 lines
  - TimetableEditor.jsx: ~500 lines
  - TimetableEditor.css: ~600 lines
  - Route config: ~10 lines
  - Dashboard nav: ~5 lines

- **Dependencies**: 
  - @dnd-kit/core: ^8.0.0
  - @dnd-kit/sortable: ^9.0.0
  - @dnd-kit/utilities: ^3.2.2

---

## 🎯 Success Criteria (All Phases)

- [x] Phase 1: Drag & drop UI works visually
- [ ] Phase 2: Backend saves slot changes to MongoDB
- [ ] Phase 3: Real-time conflict detection with modal
- [ ] Phase 4: Undo/Revert fully functional
- [ ] Phase 5: Production-ready polish

**Estimated Timeline**: 
- Phase 1: ✅ Complete (2-3 days)
- Phase 2: 3-4 days (backend API + wiring)
- Phase 3: 2-3 days (conflict modal + UI polish)
- **Total**: ~10 days for full feature

---

## 🛠️ Next Immediate Action

**Create Backend API Endpoint** in `backend_server/routes/timetables.js`:

```javascript
// PUT /api/timetables/:timetableId/slots/:slotId
router.put('/:timetableId/slots/:slotId', async (req, res) => {
  // Implementation needed
})
```

This will enable saving drag-drop changes to the database.

---

## 📝 Notes

- Only **theory classes generated by Step 4** are editable
- **Labs and fixed slots remain locked** (as per design)
- Conflict detection logic already written (needs backend integration)
- UI designed for 1920×1080 monitors (responsive down to tablets)
- Change history tracks all moves (for future undo feature)

**Status**: Phase 1 Complete ✅ | Phase 2 Ready to Start 🚀
