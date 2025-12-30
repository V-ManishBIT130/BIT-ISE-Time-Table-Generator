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
import TeacherAssignments from './components/TeacherAssignments'
import TimetableViewer from './components/TimetableViewer'
import TimetableGenerator from './components/TimetableGenerator'
import TimetableEditor from './components/TimetableEditor'
import TeacherTimetableView from './components/TeacherTimetableView'
import LabsView from './components/LabsView'
import ClassroomView from './components/ClassroomView'
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
          
          {/* Phase 2: Pre-assignments */}
          <Route path="teacher-assignments" element={<TeacherAssignments />} />
          
          {/* Phase 3: Timetable Generation & Viewing (with dynamic room assignment) */}
          <Route path="generate" element={<TimetableGenerator />} />
          <Route path="view" element={<TimetableViewer />} />
          <Route path="editor" element={<TimetableEditor />} />
          <Route path="teacher-view" element={<TeacherTimetableView />} />
          <Route path="classroom-view" element={<ClassroomView />} />
          <Route path="labs-view" element={<LabsView />} />
          
        </Route>

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
