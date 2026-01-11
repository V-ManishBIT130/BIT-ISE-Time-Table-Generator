# Teacher's Timetable View - Feature Documentation

## Overview
A comprehensive view that displays each teacher's complete weekly schedule across all sections, showing all assigned theory classes and lab sessions.

**Date Added:** November 12, 2025  
**Component:** Phase 3 Enhancement  
**Status:** ✅ Complete

---

## Features

### 1. Teacher Selection
- Dropdown list of all teachers in the system
- Search by teacher name or short form
- Filter by semester type (Odd/Even)
- Filter by academic year

### 2. Schedule Display Modes

#### Grid View (Weekly Calendar)
- Visual weekly timetable grid (Monday-Friday)
- 30-minute time slot granularity (8:00 AM - 5:00 PM)
- Color-coded entries:
  - **Blue gradient**: Theory classes
  - **Pink gradient**: Lab sessions
- Hover effects for detailed information
- Responsive grid layout

#### List View
- Chronological list of all classes and labs
- Grouped by type (Theory / Labs)
- Detailed information for each session:
  - Day and time
  - Section and semester
  - Subject/Lab name
  - Classroom/Lab room location
  - Role (for labs: Teacher 1 or Teacher 2)

### 3. Statistics Dashboard
Three stat cards showing:
- **Theory Classes**: Count + weekly hours
- **Lab Sessions**: Count + weekly hours  
- **Total**: Combined sessions + total hours

### 4. Information Displayed

#### Theory Classes
- Section name (e.g., 3A, 5B)
- Semester number
- Day and time
- Subject name and short form
- Classroom location
- Fixed slot indicator (for OEC/PEC)

#### Lab Sessions
- Section name
- Semester number
- Day and time (2-hour blocks)
- All batches assigned (e.g., 3A1, 3A2, 3A3)
- Lab names for each batch
- Lab room locations
- Teacher role (Teacher 1 or Teacher 2)

---

## API Endpoint

### GET /api/timetables/teacher-schedule/:teacherId

**Purpose:** Fetch complete schedule for a specific teacher

**Parameters:**
- `teacherId` (path parameter): MongoDB ObjectId of the teacher
- `sem_type` (query): 'odd' or 'even' (optional)
- `academic_year` (query): e.g., '2024-25' (optional)

**Response:**
```json
{
  "success": true,
  "teacher_id": "64abc...",
  "schedule": {
    "theory_classes": [
      {
        "timetable_id": "...",
        "section_name": "3A",
        "sem": 3,
        "day": "Monday",
        "start_time": "10:00",
        "end_time": "11:00",
        "duration_hours": 1,
        "subject_name": "Data Structures",
        "subject_shortform": "DS",
        "classroom_name": "Room 301",
        "is_fixed_slot": false
      }
    ],
    "lab_sessions": [
      {
        "timetable_id": "...",
        "section_name": "3A",
        "sem": 3,
        "day": "Tuesday",
        "start_time": "14:00",
        "end_time": "16:00",
        "duration_hours": 2,
        "batches": [
          {
            "batch_name": "3A1",
            "lab_name": "Data Structures Lab",
            "lab_shortform": "DSL",
            "lab_room_name": "ISE-301",
            "role": "Teacher 1"
          },
          {
            "batch_name": "3A2",
            "lab_name": "Web Tech Lab",
            "lab_shortform": "WTL",
            "lab_room_name": "ISE-302",
            "role": "Teacher 2"
          }
        ]
      }
    ]
  },
  "statistics": {
    "total_theory_classes": 12,
    "total_lab_sessions": 6,
    "total_sessions": 18,
    "theory_hours": 12,
    "lab_hours": 12,
    "total_hours": 24
  }
}
```

---

## Implementation Details

### Backend Logic (`timetables.js`)
1. Fetches all timetables for selected semester type and academic year
2. Iterates through each timetable's theory_slots and lab_slots
3. Checks if teacher_id matches:
   - For theory: `slot.teacher_id === teacherId`
   - For labs: `batch.teacher1_id === teacherId` OR `batch.teacher2_id === teacherId`
4. Aggregates lab sessions (multiple batches at same time = one session)
5. Sorts by day and time (Monday-Friday, chronological)
6. Calculates statistics (counts and hours)

### Frontend Component (`TeacherTimetableView.jsx`)
- **State Management:**
  - Selected teacher, semester type, academic year
  - Schedule data and statistics
  - View mode (grid/list)
  - Loading and error states

- **Grid View:**
  - CSS Grid layout: 6 columns (time + 5 days)
  - 18 rows (30-minute slots from 8:00-17:00)
  - Dynamic positioning using `grid-row-start` and `grid-row-end`
  - Span calculation: `Math.ceil(duration * 2)` slots

- **List View:**
  - Separate sections for theory and labs
  - Sorted chronologically
  - Expandable batch information for labs

---

## User Workflow

1. Navigate to **Dashboard → Phase 3 → Teacher View** (👨‍🏫)
2. Select teacher from dropdown
3. Choose semester type (Odd/Even)
4. (Optional) Adjust academic year
5. Click **"🔍 View Schedule"**
6. View statistics dashboard
7. Switch between Grid View (📅) and List View (📋)
8. Hover over slots in grid view for details
9. Export/print schedule (future enhancement)

---

## Benefits

### For Teachers
- ✅ See complete weekly schedule at a glance
- ✅ Know exactly when and where they teach
- ✅ Identify free periods for preparation
- ✅ Plan office hours around teaching schedule

### For Administrators
- ✅ Verify teacher workload distribution
- ✅ Check for overloaded/underutilized teachers
- ✅ Resolve scheduling conflicts
- ✅ Balance teaching hours across faculty

### For Department
- ✅ Fair workload allocation
- ✅ Transparency in scheduling
- ✅ Easy conflict resolution
- ✅ Better resource planning

---

## Technical Highlights

### 1. Efficient Aggregation
- Single database query fetches all timetables
- In-memory aggregation (fast for 18 sections)
- Smart lab session merging (same time = one entry)

### 2. Responsive Design
- Desktop: Full grid view with all details
- Tablet: Condensed grid with smaller text
- Mobile: Automatic switch to list view

### 3. Visual Hierarchy
- Color coding by type (theory vs labs)
- Gradient backgrounds for modern look
- Hover effects for interactivity
- Badge system for quick identification

### 4. Accessibility
- Clear labels and icons
- High contrast colors
- Keyboard navigation support
- Screen reader friendly

---

## Future Enhancements

1. **Export Functionality**
   - PDF export for printing
   - Excel export for editing
   - iCal format for calendar integration

2. **Conflict Highlighting**
   - Show overlapping sessions in red
   - Detect consecutive teaching hours
   - Flag excessive workload

3. **Comparison View**
   - Compare 2-3 teachers side-by-side
   - Identify load imbalances
   - Suggest swaps for better distribution

4. **Filters & Search**
   - Filter by day of week
   - Search by subject/section
   - Show only theory or only labs

5. **Personal Teacher Portal**
   - Login for individual teachers
   - View only their schedule
   - Mobile app integration

---

## Testing Checklist

- [x] Backend API returns correct data
- [x] Teacher dropdown populated from database
- [x] Grid view renders all slots correctly
- [x] List view shows detailed information
- [x] Statistics calculated accurately
- [x] View mode toggle works
- [x] Responsive design on mobile
- [x] Error handling for missing data
- [x] Loading states display properly
- [x] Empty state shown when no schedule

---

## Related Components
- `TimetableViewer.jsx` - Section-based view
- `TimetableEditor.jsx` - Manual editing
- `Teachers.jsx` - Teacher management
- `TeacherAssignments.jsx` - Pre-assignment system

---

**Last Updated:** November 12, 2025
