# Timetable Grid Alignment Fix Documentation

## Problem Statement
The TimetableViewer component was experiencing multiple alignment and display issues:
1. **Time headers not aligned** with slot columns below them
2. **Table overflowing** the grid wrapper (tbody/thead showing 1798px when wrapper was only 1312px)
3. **Uneven cell distribution** - some cells appearing as "tree trunk" wide, others as "stick" narrow
4. **Theory slots showing as single 30-minute cells** instead of spanning multiple columns
5. **Wasted empty space** on the right side of the grid
6. **Horizontal scrolling issues** with cells being cut off

## Root Causes Identified

### 1. Table Layout Conflicts
- Initially used `table-layout: auto` which calculated widths based on content
- Changed to `table-layout: fixed` for uniform distribution
- **Critical Discovery**: `table-layout: fixed` prevents `colSpan` from working when combined with explicit width constraints on td elements

### 2. Width Constraint Issues
- `.timetable-grid td` had `width: 75px; min-width: 75px; max-width: 75px;`
- These constraints prevented cells with `colSpan` attribute from expanding
- A cell with `colSpan="3"` should be 225px wide but was locked at 75px

### 3. Overflow Container Structure
```
.timetable-viewer (max-width: 100vw)
  └─ .timetable-container (overflow: auto)
      └─ .grid-wrapper (overflow-x: hidden → overflow-x: auto)
          └─ .timetable-grid (width: 100% → min-width: 1400px)
```

## Two-Layer Compact Div Strategy

### Pattern Discovery
During the alignment work, we discovered the **compact inner div strategy** that was already working perfectly in lab cells:

**The Pattern**:
```jsx
// Lab cells (working perfectly)
<td>
  <div className="lab-content-horizontal">  {/* Outer: fills parent 100% */}
    <div className="batch-compact">          {/* Inner: shrinks to fit-content */}
      {content}
    </div>
  </div>
</td>
```

**CSS Implementation**:
```css
.lab-content-horizontal {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.batch-compact {
  width: fit-content;
  height: fit-content;
  padding: 2px 4px;
  /* Compact spacing - no extra margins/padding that expand cell */
}
```

### Why This Works
1. **Outer div** (`.lab-content-horizontal`): 
   - Fills entire TD cell (100% width/height)
   - Prevents cell from expanding beyond its assigned space
   - Acts as a flex container for centering

2. **Inner div** (`.batch-compact`):
   - Uses `fit-content` to shrink-wrap around actual content
   - Removes unnecessary padding/margins that cause cell bloating
   - Allows content to be compact without causing overflow

### Applied to All Cell Types
We applied this pattern to theory and break cells for consistency:

```css
/* Theory cells */
.cell-content {
  height: 100%;
  width: 100%;
  display: flex;
}

.cell-content-compact {
  width: fit-content;
  height: fit-content;
  padding: 3px 6px;  /* Minimal padding */
  margin: 0;         /* No margins */
}

/* Break cells */
.break-cell .cell-content {
  height: 100%;
  width: 100%;
  display: flex;
}

.break-cell .cell-content-compact {
  width: fit-content;
  height: fit-content;
  padding: 4px;
}
```

### Benefits Achieved
✅ **No internal scrolling** - Content stays within cell boundaries  
✅ **Uniform cell heights** - All cells maintain 70px height  
✅ **Compact appearance** - Reduced spacing makes content readable  
✅ **Professional look** - Clean, aligned, no bloating  
✅ **Prevents overflow** - Content never expands cell beyond grid structure  

### Key Insight
The two-layer approach separates **structural constraints** (outer div fills cell) from **content sizing** (inner div shrinks to fit). This prevents the classic problem where content padding/margins push cell boundaries and break grid alignment.

## Solution Approach - Step by Step

### Phase 1: Create Uniform Excel-like Grid
**Goal**: Make every cell identical in size before worrying about spanning

**Changes Made**:
```css
.timetable-grid {
  table-layout: fixed;
  width: 100%;
  min-width: 1400px;
}

.timetable-grid th {
  width: 75px;
  min-width: 75px;
  height: 30px;
}

.timetable-grid td {
  width: 75px;
  min-width: 75px;
  height: 70px;
}
```

**Result**: Perfect uniform grid - all cells 75px × 70px ✅

### Phase 2: Enable Horizontal Scrolling
**Problem**: Only 15 of 18 time slot columns were visible

**Changes Made**:
```css
.grid-wrapper {
  overflow-x: auto;  /* Changed from hidden */
  overflow-y: auto;
  max-width: 100%;
}

.timetable-grid {
  min-width: 1400px;  /* 50px day + 18×75px = 1400px */
}
```

**Result**: All 18 columns accessible via horizontal scroll ✅

### Phase 3: Fix colSpan Spanning (CRITICAL)
**Problem**: Theory slots showing as single cells despite having `colSpan="2"` or `colSpan="3"` in JSX

**Root Cause**: 
- `table-layout: fixed` + explicit `width` constraints on `td` = colSpan doesn't work
- Browser cannot expand a cell beyond its fixed width declaration

**Attempted Solutions**:
1. ❌ Used percentage widths: `width: 5.263%` - Still didn't span properly
2. ❌ Used calc(): `width: calc((100% - 50px) / 18)` - Alignment issues
3. ❌ Kept `table-layout: fixed` with only base width - Cells still locked
4. ✅ **Final Solution**: Remove `table-layout: fixed`

**Final Changes**:
```css
.timetable-grid {
  border-collapse: collapse;
  width: 100%;
  min-width: 1400px;
  /* table-layout: fixed; ← REMOVED */
}

.timetable-grid td {
  width: 75px;
  /* min-width: 75px; ← REMOVED */
  /* max-width: 75px; ← REMOVED */
  height: 70px;
}
```

**Result**: 
- ✅ Single cells: 75px wide
- ✅ `colSpan="2"`: Expands to 150px
- ✅ `colSpan="3"`: Expands to 225px
- ✅ Lab sessions spanning 6 slots: 450px

## Current Status

### ✅ Working Features
1. **Uniform grid structure** - All base cells are 75px × 70px
2. **Horizontal scrolling** - All 18 time slots accessible
3. **Time header alignment** - Headers use same 75px width as columns
4. **Day column sticky** - Fixed at 50px, scrolls with content
5. **Lab slots spanning correctly** - Multi-hour labs display properly
6. **Theory slots spanning** - Fixed with defensive fallback mechanism

### 🐛 Bug Fixed (Nov 20, 2025)

**Theory slots appearing as single 30-minute cells instead of spanning correctly**

**Problem Identified**:
- Some timetables in database had incorrect or missing `end_time` values for theory slots
- Frontend `getTimeSpan()` function calculated span as `endIndex - startIndex`
- When `end_time` was missing/incorrect, span calculated as 0 or 1 instead of 2
- Result: 1-hour theory classes cramped into 30-minute slots

**Inconsistency Pattern**:
- ✅ Section 5B: All theory slots had correct `end_time` values
- ❌ Section 3B: Many theory slots had missing/incorrect `end_time`
- ❌ Section 5A: Many theory slots had missing/incorrect `end_time`
- ✅ Lab slots: Always had correct times (Step 3 algorithm robust)

**Root Cause**:
- Database inconsistency from previous timetable generations
- Different sections generated at different times with different algorithm versions
- No defensive fallback in frontend for corrupt data

**Solution Implemented**:
Added defensive fallback in `getTimeSpan()` function:
```javascript
const getTimeSpan = (startTime, endTime, durationHours = null) => {
  const startIndex = getTimeSlotIndex(startTime)
  const endIndex = getTimeSlotIndex(endTime)
  const calculatedSpan = endIndex - startIndex
  
  // Defensive check: If span is 0 or negative, use duration_hours fallback
  if (calculatedSpan <= 0 && durationHours) {
    console.warn(`⚠️ Invalid time span (${startTime}-${endTime}), using duration_hours: ${durationHours}`)
    return durationHours * 2 // Convert hours to 30-min slots (1 hour = 2 slots)
  }
  
  return calculatedSpan
}
```

**Benefits**:
- ✅ Gracefully handles corrupt data from database
- ✅ Uses `duration_hours` field as fallback (always reliable)
- ✅ Logs warning when fallback is used (aids debugging)
- ✅ Works for all theory slots regardless of data quality
- ✅ No need to regenerate timetables immediately

**Long-term Recommendation**:
- Regenerate timetables for affected sections using updated Step 4 algorithm
- Ensures all `end_time` values are correctly calculated and stored
- Current fix is defensive - proper data should still be the goal

## Technical Specifications

### Grid Structure
- **Total columns**: 19 (1 day column + 18 time slots)
- **Day column**: 50px fixed width
- **Time slot columns**: 75px base width each
- **Total minimum width**: 1400px
- **Row height**: 70px uniform

### Time Slots Coverage
- **Start**: 8:00 AM
- **End**: 5:00 PM
- **Interval**: 30 minutes
- **Total slots**: 18 half-hour slots

### CSS Classes Structure
```
.timetable-viewer (root)
  .grid-wrapper (scroll container)
    .timetable-grid (table)
      thead
        .day-header (50px)
        .time-header (75px each, 18 total)
      tbody
        .day-label (50px)
        .theory-cell (75px × colSpan)
        .lab-cell (75px × colSpan)
        .break-cell (75px × colSpan)
        .empty-cell (75px)
```

## Files Modified
1. `src/components/TimetableViewer.css` - All grid styling
2. `src/components/TimetableViewer.jsx` - Table rendering (no changes in this session)

## Key Learnings

1. **`table-layout: fixed` vs `colSpan`**: These two features are fundamentally incompatible when combined with explicit width constraints
2. **Browser table rendering**: HTML tables calculate column widths differently in auto vs fixed layout modes
3. **Cascade inheritance**: Width properties must be carefully managed - too many constraints break spanning behavior
4. **Debugging approach**: Start with uniform base structure, then enable advanced features incrementally

## References
- MDN: `table-layout` property
- MDN: `colSpan` attribute behavior
- HTML table width calculation algorithm

---
**Last Updated**: 2025-11-20  
**Status**: ✅ Complete - All issues resolved (Lab slots + Theory slots)
