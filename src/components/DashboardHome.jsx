import { useState, useEffect } from 'react'
import axios from 'axios'
import './DashboardHome.css'

/**
 * Dashboard Home/Overview Component
 * - Shows count of all master data
 * - Quick stats for Phase 1 completion
 * - Links to add new data
 */
function DashboardHome() {
  const [stats, setStats] = useState({
    teachers: 0,
    subjects: 0,
    labs: 0,
    sections: 0,
    classrooms: 0,
    deptLabs: 0,
    teacherAssignments: 0,
    loading: true
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [
        teachers,
        subjects,
        labs,
        sections,
        classrooms,
        deptLabs,
        teacherAssignments
      ] = await Promise.all([
        axios.get('/api/teachers'),
        axios.get('/api/subjects'),
        axios.get('/api/labs'),
        axios.get('/api/sections'),
        axios.get('/api/classrooms'),
        axios.get('/api/dept-labs'),
        axios.get('/api/teacher-assignments')
      ])

      setStats({
        teachers: teachers.data.count || 0,
        subjects: subjects.data.count || 0,
        labs: labs.data.count || 0,
        sections: sections.data.count || 0,
        classrooms: classrooms.data.count || 0,
        deptLabs: deptLabs.data.count || 0,
        teacherAssignments: teacherAssignments.data.count || 0,
        loading: false
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats(prev => ({ ...prev, loading: false }))
    }
  }

  if (stats.loading) {
    return (
      <div className="dashboard-home">
        <div className="loading">Loading dashboard...</div>
      </div>
    )
  }

  const phase1Complete = stats.teachers > 0 && 
                         stats.subjects > 0 && 
                         stats.labs > 0 && 
                         stats.sections > 0 &&
                         stats.classrooms > 0 &&
                         stats.deptLabs > 0

  const phase2Complete = stats.teacherAssignments > 0

  return (
    <div className="dashboard-home">
      {/* Official Institutional Header */}
      <div className="institutional-header">
        <div className="header-logo left-logo">
          <img 
            src="/src/assets/logos/bit-logo.png" 
            alt="BIT Logo" 
            className="institution-logo-img"
            onError={(e) => {
              // Fallback to text logo if image not found
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="logo-circle" style={{ display: 'none' }}>
            <span className="logo-text">BIT</span>
          </div>
        </div>
        
        <div className="institution-details">
          <h1 className="institution-name">Bangalore Institute of Technology</h1>
          <h2 className="department-name">Department of Information Science and Engineering</h2>
          <h3 className="system-title">Timetable Manager and Scheduler</h3>
        </div>
        
        <div className="header-logo right-logo">
          <img 
            src="/src/assets/logos/devsoc-logo.png" 
            alt="DevSoc Logo" 
            className="institution-logo-img"
            onError={(e) => {
              // Fallback to text logo if image not found
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="logo-circle" style={{ display: 'none' }}>
            <span className="logo-text">ISE</span>
          </div>
        </div>
      </div>

      {/* Phase 1 Stats */}
      <div className="section">
        <h2>Phase 1: Master Data Summary</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👨‍🏫</div>
            <div className="stat-content">
              <h3>{stats.teachers}</h3>
              <p>Teachers</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3>{stats.subjects}</h3>
              <p>Subjects</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔬</div>
            <div className="stat-content">
              <h3>{stats.labs}</h3>
              <p>Labs</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>{stats.sections}</h3>
              <p>Sections</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏫</div>
            <div className="stat-content">
              <h3>{stats.classrooms}</h3>
              <p>Classrooms</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🧪</div>
            <div className="stat-content">
              <h3>{stats.deptLabs}</h3>
              <p>Lab Rooms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 2 Stats */}
      <div className="section">
        <h2>Phase 2: Pre-Assignment Summary</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <h3>{stats.teacherAssignments}</h3>
              <p>Theory Subject Assignments</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardHome
