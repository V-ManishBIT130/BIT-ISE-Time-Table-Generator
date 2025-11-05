import express from "express";
import conn from "./db.js";
import cors from "cors";
import "dotenv/config"

// Import all routes
import authRoutes from "./routes/auth.js"
import teachersRoutes from "./routes/teachers.js"
import subjectsRoutes from "./routes/subjects.js"
import labsRoutes from "./routes/labs.js"
import sectionsRoutes from "./routes/sections.js"
import classroomsRoutes from "./routes/classrooms.js"
import deptLabsRoutes from "./routes/dept-labs.js"
import teacherAssignmentsRoutes from "./routes/teacher-assignments.js"
import timetablesRoutes from "./routes/timetables.js" // Phase 3 timetable generation with dynamic room assignment

// Connect to MongoDB
conn();

const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// Health check route
app.get('/', (req, res) =>{
  res.json({ 
    message: "BIT ISE Timetable Generator API",
    status: "Running",
    version: "1.0.0"
  });
});

// Mount all API routes
app.use('/api/auth', authRoutes)
app.use('/api/teachers', teachersRoutes)
app.use('/api/subjects', subjectsRoutes)
app.use('/api/labs', labsRoutes)
app.use('/api/sections', sectionsRoutes)
app.use('/api/classrooms', classroomsRoutes)
app.use('/api/dept-labs', deptLabsRoutes)
app.use('/api/teacher-assignments', teacherAssignmentsRoutes)
app.use('/api/timetables', timetablesRoutes) // Phase 3 timetable generation with dynamic room assignment

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Start server
app.listen(port, ()=>{
  console.log(`✅ Server listening on port ${port}`);
  console.log(`📡 Backend API: http://localhost:${port}/`);
  console.log(`🔗 Available routes:`);
  console.log(`   - POST http://localhost:${port}/api/auth/login`);
  console.log(`   - GET  http://localhost:${port}/api/teachers`);
  console.log(`   - GET  http://localhost:${port}/api/subjects`);
  console.log(`   - GET  http://localhost:${port}/api/labs`);
  console.log(`   - GET  http://localhost:${port}/api/sections`);
  console.log(`   - GET  http://localhost:${port}/api/classrooms`);
  console.log(`   - GET  http://localhost:${port}/api/dept-labs`);
  console.log(`   - GET  http://localhost:${port}/api/teacher-assignments`);
  console.log(`   - GET  http://localhost:${port}/api/lab-assignments`);
});