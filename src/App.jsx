import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import DashboardHome from './components/DashboardHome'
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
          
          {/* Phase 1: Master Data routes - Will create these next */}
          <Route path="teachers" element={<div className="placeholder">Teachers Management Coming Soon...</div>} />
          <Route path="subjects" element={<div className="placeholder">Subjects Management Coming Soon...</div>} />
          <Route path="labs" element={<div className="placeholder">Labs Management Coming Soon...</div>} />
          <Route path="sections" element={<div className="placeholder">Sections Management Coming Soon...</div>} />
          <Route path="classrooms" element={<div className="placeholder">Classrooms Management Coming Soon...</div>} />
          <Route path="dept-labs" element={<div className="placeholder">Lab Rooms Management Coming Soon...</div>} />
          
          {/* Phase 2: Assignment routes */}
          <Route path="teacher-assignments" element={<div className="placeholder">Teacher Assignments Coming Soon...</div>} />
          <Route path="lab-assignments" element={<div className="placeholder">Lab Assignments Coming Soon...</div>} />
          
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
