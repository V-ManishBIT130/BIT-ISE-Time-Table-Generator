import re

# Read the file
with open('src/components/TimetableEditor.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define all replacements - className attributes only
replacements = [
    (r'className="timetable-grid"', 'className="editor-timetable-grid"'),
    (r'className="subject-code"', 'className="editor-subject-code"'),
]

# Apply all replacements
for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

# Write back
with open('src/components/TimetableEditor.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully updated TimetableEditor.jsx with editor- prefixes")
