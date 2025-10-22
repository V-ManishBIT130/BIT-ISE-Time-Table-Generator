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
    labAssignments: 0,
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
        teacherAssignments,
        labAssignments
      ] = await Promise.all([
        axios.get('/api/teachers'),
        axios.get('/api/subjects'),
        axios.get('/api/labs'),
        axios.get('/api/sections'),
        axios.get('/api/classrooms'),
        axios.get('/api/dept-labs'),
        axios.get('/api/teacher-assignments'),
        axios.get('/api/lab-assignments')
      ])

      setStats({
        teachers: teachers.data.count || 0,
        subjects: subjects.data.count || 0,
        labs: labs.data.count || 0,
        sections: sections.data.count || 0,
        classrooms: classrooms.data.count || 0,
        deptLabs: deptLabs.data.count || 0,
        teacherAssignments: teacherAssignments.data.count || 0,
        labAssignments: labAssignments.data.count || 0,
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

  const phase2Complete = stats.teacherAssignments > 0 && 
                         stats.labAssignments > 0

  return (
    <div className="dashboard-home">
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>BIT ISE Time Table Generator - Current Status</p>
      </div>

      {/* Progress Phases */}
      <div className="phases">
        <div className={`phase-card ${phase1Complete ? 'complete' : 'pending'}`}>
          <div className="phase-icon">📝</div>
          <h3>Phase 1: Master Data</h3>
          <p>{phase1Complete ? 'Complete ✓' : 'In Progress...'}</p>
        </div>
        <div className={`phase-card ${phase2Complete ? 'complete' : 'pending'}`}>
          <div className="phase-icon">🎯</div>
          <h3>Phase 2: Pre-Assignment</h3>
          <p>{phase2Complete ? 'Complete ✓' : 'Pending'}</p>
        </div>
        <div className="phase-card pending">
          <div className="phase-icon">⚡</div>
          <h3>Phase 3: Generation</h3>
          <p>Coming Soon</p>
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
              <p>Subject Assignments</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🧬</div>
            <div className="stat-content">
              <h3>{stats.labAssignments}</h3>
              <p>Lab Assignments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {!phase1Complete && (
        <div className="alert alert-warning">
          <strong>⚠️ Action Required:</strong> Complete Phase 1 by adding all master data before proceeding to Phase 2.
        </div>
      )}

      {phase1Complete && !phase2Complete && (
        <div className="alert alert-info">
          <strong>ℹ️ Next Step:</strong> Phase 1 is complete! Proceed to Phase 2 to assign teachers to subjects and labs.
        </div>
      )}

      {phase2Complete && (
        <div className="alert alert-success">
          <strong>✅ Ready:</strong> Phases 1 & 2 complete! You can now proceed to generate the timetable.
        </div>
      )}
    </div>
  )
}

export default DashboardHome
