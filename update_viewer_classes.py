import re

# Read the file
with open('src/components/TimetableViewer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define all replacements - className attributes only
replacements = [
    (r'className="empty-cell"', 'className="viewer-empty-cell"'),
    (r'className="break-cell"', 'className="viewer-break-cell"'),
    (r'className="lab-cell"', 'className="viewer-lab-cell"'),
    (r'className="subject-code"', 'className="viewer-subject-code"'),
    (r'className="teacher-name"', 'className="viewer-teacher-name"'),
    (r'className="cell-content"', 'className="viewer-cell-content"'),
    (r'className="cell-content-compact"', 'className="viewer-cell-content-compact"'),
    (r'className="day-label"', 'className="viewer-day-label"'),
    (r'className="time-header"', 'className="viewer-time-header"'),
    (r'className="day-header"', 'className="viewer-day-header"'),
    (r'className="fixed-badge"', 'className="viewer-fixed-badge"'),
    (r'className="classroom-badge', 'className="viewer-classroom-badge'),
    (r'className="break-icon"', 'className="viewer-break-icon"'),
    (r'className="break-label"', 'className="viewer-break-label"'),
    (r'className="time-range"', 'className="viewer-time-range"'),
    (r'className="lab-content-horizontal"', 'className="viewer-lab-content-horizontal"'),
    (r'className="batch-compact"', 'className="viewer-batch-compact"'),
    (r'className="batch-name-compact"', 'className="viewer-batch-name-compact"'),
    (r'className="batch-lab-compact"', 'className="viewer-batch-lab-compact"'),
    (r'className="batch-room-compact"', 'className="viewer-batch-room-compact"'),
    (r'className="batch-teacher-compact"', 'className="viewer-batch-teacher-compact"'),
    (r'className="timetable-grid"', 'className="viewer-timetable-grid"'),
]

# Apply all replacements
for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

# Write back
with open('src/components/TimetableViewer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully updated TimetableViewer.jsx with viewer- prefixes")
