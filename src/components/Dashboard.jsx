import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import './Dashboard.css'

/**
 * Dashboard Layout Component
 * - Sidebar navigation
 * - User info display
 * - Logout functionality
 * - Nested routes via <Outlet />
 */
function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('isAuthenticated')
    navigate('/')
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>BIT ISE TT</h2>
          <button className="toggle-btn" onClick={toggleSidebar}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <div className="user-info">
          <div className="user-avatar">
            {user.user_name?.[0]?.toUpperCase() || 'U'}
          </div>
          {sidebarOpen && (
            <div className="user-details">
              <p className="user-name">{user.user_name || 'User'}</p>
              <p className="user-role">Administrator</p>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <p className="nav-title">{sidebarOpen ? 'Phase 1: Master Data' : 'P1'}</p>
            <NavLink to="/dashboard" end className="nav-link">
              <span className="nav-icon">📊</span>
              {sidebarOpen && <span>Overview</span>}
            </NavLink>
            <NavLink to="/dashboard/teachers" className="nav-link">
              <span className="nav-icon">👨‍🏫</span>
              {sidebarOpen && <span>Teachers</span>}
            </NavLink>
            <NavLink to="/dashboard/subjects" className="nav-link">
              <span className="nav-icon">📚</span>
              {sidebarOpen && <span>Subjects</span>}
            </NavLink>
            <NavLink to="/dashboard/labs" className="nav-link">
              <span className="nav-icon">🔬</span>
              {sidebarOpen && <span>Labs</span>}
            </NavLink>
            <NavLink to="/dashboard/sections" className="nav-link">
              <span className="nav-icon">👥</span>
              {sidebarOpen && <span>Sections</span>}
            </NavLink>
            <NavLink to="/dashboard/classrooms" className="nav-link">
              <span className="nav-icon">🏫</span>
              {sidebarOpen && <span>Classrooms</span>}
            </NavLink>
            <NavLink to="/dashboard/dept-labs" className="nav-link">
              <span className="nav-icon">🧪</span>
              {sidebarOpen && <span>Lab Rooms</span>}
            </NavLink>
          </div>

          <div className="nav-section">
            <p className="nav-title">{sidebarOpen ? 'Phase 2: Pre-Assignments' : 'P2'}</p>
            <NavLink to="/dashboard/teacher-assignments" className="nav-link">
              <span className="nav-icon">📝</span>
              {sidebarOpen && <span>Subject Assign</span>}
            </NavLink>
          </div>

          <div className="nav-section">
            <p className="nav-title">{sidebarOpen ? 'Phase 3: Generate' : 'P3'}</p>
            <NavLink to="/dashboard/generate" className="nav-link">
              <span className="nav-icon">⚡</span>
              {sidebarOpen && <span>Generate TT</span>}
            </NavLink>
            <NavLink to="/dashboard/view" className="nav-link">
              <span className="nav-icon">👁️</span>
              {sidebarOpen && <span>View TT</span>}
            </NavLink>
            <NavLink to="/dashboard/editor" className="nav-link">
              <span className="nav-icon">✏️</span>
              {sidebarOpen && <span>Edit TT</span>}
            </NavLink>
            <NavLink to="/dashboard/teacher-view" className="nav-link">
              <span className="nav-icon">👨‍🏫</span>
              {sidebarOpen && <span>Teacher View</span>}
            </NavLink>
            <NavLink to="/dashboard/labs-view" className="nav-link">
              <span className="nav-icon">🧪</span>
              {sidebarOpen && <span>Lab's View</span>}
            </NavLink>
          </div>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          {sidebarOpen && <span>Logout</span>}
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Dashboard
