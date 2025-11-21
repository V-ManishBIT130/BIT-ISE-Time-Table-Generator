## Lab Grid Header Alignment Fix

### Problem
The time interval headers in the lab grid view (`LabsView.jsx`) are not evenly spread to cover the gaps and align properly with the grid cells below.

### Root Cause
Looking at `LabsView.css`:
- `.schedule-header` (line 248-256) uses flexbox with `justify-content: space-between`
- This doesn't evenly distribute the headers across the available width
- The `.labs-time-slots-container` below uses CSS Grid with `repeat(9, 1fr)` which divides evenly

###Solution
Change `.schedule-header` from flexbox to CSS Grid matching the structure below:

**Current:**
```css
.schedule-header {
  display: flex;
  justify-content: space-between;
  ...
}
```

**Change to:**
```css
.schedule-header {
  display: grid;
  grid-template-columns: 86px repeat(9, 1fr);
  ...
}
```

This matches the grid structure of the rows below (86px for day label + 9 equal columns for time slots).

### Additional Changes Needed
1. Add `box-sizing: border-box;` to `.corner-cell` and `.time-header`
2. Add `display: flex; align-items: center; justify-content: center;` to `.time-header` for proper centering within each grid cell

### Files to Modify
- `src/components/LabsView.css` - lines 248-284
