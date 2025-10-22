# API Routes Testing Guide

## Base URL
```
http://localhost:5000/api
```

## 1. Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "user_name": "HOD",
  "password": "ise@hod"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "68f4de7a39bbe001533cf543",
    "user_name": "HOD"
  }
}
```

---

## 2. Teachers

### Get All Teachers
```http
GET /api/teachers
```

### Get One Teacher
```http
GET /api/teachers/:id
```

### Create Teacher
```http
POST /api/teachers
Content-Type: application/json

{
  "name": "Prof. John Kumar",
  "email": "john@bit.edu",
  "mobile_num": "+91-9876543210",
  "teacher_id": "T001",
  "canTeach_subjects": [],
  "labs_handled": [],
  "hrs_per_week": 18,
  "teacher_position": "Assistant Professor"
}
```

### Update Teacher
```http
PUT /api/teachers/:id
Content-Type: application/json

{
  "mobile_num": "+91-9999999999"
}
```

### Delete Teacher
```http
DELETE /api/teachers/:id
```

---

## 3. Subjects

### Get All Subjects (with filters)
```http
GET /api/subjects
GET /api/subjects?subject_sem=3&subject_sem_type=odd
```

### Create Subject
```http
POST /api/subjects
Content-Type: application/json

{
  "subject_code": "ISE301",
  "subject_name": "Data Structures",
  "hrs_per_week": 4,
  "subject_sem": 3,
  "subject_sem_type": "odd",
  "max_hrs_Day": 1,
  "duration_hours": 1
}
```

---

## 4. Labs

### Get All Labs
```http
GET /api/labs
GET /api/labs?lab_sem=3&lab_sem_type=odd
```

### Create Lab
```http
POST /api/labs
Content-Type: application/json

{
  "lab_name": "Operating Systems Lab",
  "lab_code": "ISE302L",
  "lab_sem": 3,
  "lab_sem_type": "odd",
  "credits": 2,
  "duration_hours": 2
}
```

---

## 5. Sections

### Get All Sections
```http
GET /api/sections
GET /api/sections?sem=3&sem_type=odd
```

### Create Section
```http
POST /api/sections
Content-Type: application/json

{
  "sem": 3,
  "sem_type": "odd",
  "section_name": "A",
  "split_batches": 3,
  "total_strength": 60
}
```

Note: `batch_names` will be auto-generated as ["A1", "A2", "A3"]

---

## 6. Classrooms

### Get All Classrooms
```http
GET /api/classrooms
```

### Create Classroom
```http
POST /api/classrooms
Content-Type: application/json

{
  "room_no": "C301",
  "capacity": 60
}
```

---

## 7. Department Labs

### Get All Lab Rooms
```http
GET /api/dept-labs
```

### Create Lab Room
```http
POST /api/dept-labs
Content-Type: application/json

{
  "labRoom_no": "612A",
  "lab_subjects_handled": ["<lab_id_1>", "<lab_id_2>"],
  "capacity": 30
}
```

Note: Get `lab_id` from `/api/labs` response

---

## 8. Teacher-Subject Assignments (Phase 2)

### Get All Assignments
```http
GET /api/teacher-assignments
GET /api/teacher-assignments?sem=3&sem_type=odd&section=A
```

### Assign Teacher to Subject
```http
POST /api/teacher-assignments
Content-Type: application/json

{
  "teacher_id": "<teacher_mongodb_id>",
  "subject_id": "<subject_mongodb_id>",
  "sem": 3,
  "sem_type": "odd",
  "section": "A"
}
```

**Validation:**
- Teacher must have subject in `canTeach_subjects`
- One teacher per subject per section

---

## 9. Lab Assignments (Phase 2)

### Get All Lab Assignments
```http
GET /api/lab-assignments
GET /api/lab-assignments?sem=3&sem_type=odd&section=A
```

### Assign Teachers to Lab-Batch
```http
POST /api/lab-assignments
Content-Type: application/json

{
  "lab_id": "<lab_mongodb_id>",
  "sem": 3,
  "sem_type": "odd",
  "section": "A",
  "batch_number": 1,
  "teacher_ids": ["<teacher1_id>", "<teacher2_id>"]
}
```

**Validation:**
- Must be exactly 2 teachers
- Both teachers must have lab in `labs_handled`

---

## Testing Order

1. **Login** - Test authentication
2. **Create Subjects** - Add theory subjects
3. **Create Labs** - Add lab subjects
4. **Create Teachers** - Add teachers with eligible subjects/labs
5. **Create Sections** - Define semester sections
6. **Create Classrooms** - Add theory rooms
7. **Create Dept Labs** - Add lab rooms with supported labs
8. **Assign Teachers to Subjects** - Phase 2 pre-assignment
9. **Assign Teachers to Labs** - Phase 2 pre-assignment

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical details (optional)"
}
```

Common HTTP codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Server Error
