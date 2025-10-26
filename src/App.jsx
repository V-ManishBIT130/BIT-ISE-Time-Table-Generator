import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import DashboardHome from './components/DashboardHome'
import Teachers from './components/Teachers'
import Subjects from './components/Subjects'
import Labs from './components/Labs'
import Sections from './components/Sections'
import Classrooms from './components/Classrooms'
import DeptLabs from './components/DeptLabs'
import LabAssignments from './components/LabAssignments'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

/**
 * Main App Component
 * - Handles routing
 * - Login and Dashboard routes
 * - Protected routes for authenticated users
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />

        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          {/* Nested Dashboard Routes */}
          <Route index element={<DashboardHome />} />
          
          {/* Phase 1: Master Data routes */}
          <Route path="teachers" element={<Teachers />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="labs" element={<Labs />} />
          <Route path="sections" element={<Sections />} />
          <Route path="classrooms" element={<Classrooms />} />
          <Route path="dept-labs" element={<DeptLabs />} />
          
          {/* Phase 2: Assignment routes */}
          <Route path="teacher-assignments" element={<div className="placeholder">Teacher Assignments Coming Soon...</div>} />
          <Route path="lab-assignments" element={<LabAssignments />} />
          
          {/* Phase 3: Generation routes */}
          <Route path="generate" element={<div className="placeholder">Generate Timetable Coming Soon...</div>} />
          <Route path="view" element={<div className="placeholder">View Timetable Coming Soon...</div>} />
        </Route>

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
