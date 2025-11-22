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
  const [timetableStats, setTimetableStats] = useState({
    totalTimetables: 0,
    oddSemTimetables: 0,
    evenSemTimetables: 0,
    recentGenerations: [],
    loading: true
  })

  useEffect(() => {
    fetchStats()
    fetchTimetableStats()
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

  const fetchTimetableStats = async () => {
    try {
      const response = await axios.get('/api/timetables/stats')
      setTimetableStats({
        totalTimetables: response.data.totalTimetables || 0,
        oddSemTimetables: response.data.oddSemTimetables || 0,
        evenSemTimetables: response.data.evenSemTimetables || 0,
        recentGenerations: response.data.recentGenerations || [],
        loading: false
      })
    } catch (error) {
      console.error('Error fetching timetable stats:', error)
      setTimetableStats(prev => ({ ...prev, loading: false }))
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

      {/* Main Content with Background Image */}
      <div className="content-with-background">
        <div className="background-overlay"></div>
        <div className="content-wrapper">
          {/* Phase 1 Stats */}
          <div className="section">
      </div>


      {/* System Overview */}
      <div className="section">
        <h2>🎯 System Overview</h2>
        <div className="overview-grid">
          <div className="overview-card">
            <div className="overview-header">
              <h3>Algorithm Performance</h3>
            </div>
            <div className="overview-content">
              <div className="overview-item">
                <span className="label">Success Rate:</span>
                <span className="value success">100%</span>
              </div>
              <div className="overview-item">
                <span className="label">Labs Scheduled:</span>
                <span className="value">27/27 (All Semesters)</span>
              </div>
              <div className="overview-item">
                <span className="label">Algorithm Type:</span>
                <span className="value">7-Step Greedy + Dual Randomization GA</span>
              </div>
              <div className="overview-item">
                <span className="label">Conflict Resolution:</span>
                <span className="value">Zero Double-Booking ✅</span>
              </div>
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-header">
              <h3>Department Scope</h3>
            </div>
            <div className="overview-content">
              <div className="overview-item">
                <span className="label">Managed Semesters:</span>
                <span className="value">3rd to 8th (6 semesters)</span>
              </div>
              <div className="overview-item">
                <span className="label">Active Sections:</span>
                <span className="value">9 sections (A/B/C per sem)</span>
              </div>
              <div className="overview-item">
                <span className="label">Lab Batches:</span>
                <span className="value">27 batches (3 per section)</span>
              </div>
              <div className="overview-item">
                <span className="label">Working Days:</span>
                <span className="value">Monday - Friday (8AM - 5PM)</span>
              </div>
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-header">
              <h3>Subject Categories</h3>
            </div>
            <div className="overview-content">
              <div className="overview-item">
                <span className="label">Regular ISE Subjects:</span>
                <span className="value">Core department courses</span>
              </div>
              <div className="overview-item">
                <span className="label">Other Department:</span>
                <span className="value">External faculty subjects</span>
              </div>
              <div className="overview-item">
                <span className="label">Projects:</span>
                <span className="value">Mini/Major Projects (no classroom)</span>
              </div>
              <div className="overview-item">
                <span className="label">Electives (7th Sem):</span>
                <span className="value">OEC/PEC (fixed slots)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {timetableStats.recentGenerations && timetableStats.recentGenerations.length > 0 && (
        <div className="section">
          <h2>📊 Recent Timetable Generations</h2>
          <div className="recent-activity">
            {timetableStats.recentGenerations.map((gen, idx) => (
              <div key={idx} className="activity-card">
                <div className="activity-icon">✅</div>
                <div className="activity-details">
                  <h4>{gen.section_name} - Semester {gen.sem}</h4>
                  <p className="activity-meta">
                    <span>📅 {new Date(gen.generation_date).toLocaleDateString()}</span>
                    <span>⏱️ {gen.generation_metadata?.generation_time_ms ? `${(gen.generation_metadata.generation_time_ms / 1000).toFixed(2)}s` : 'N/A'}</span>
                    {gen.generation_metadata?.theory_scheduling_summary && (
                      <span>📈 {gen.generation_metadata.theory_scheduling_summary.success_rate || '0%'} Success</span>
                    )}
                  </p>
                  <div className="activity-stats">
                    <span className="stat-badge theory">
                      📚 {gen.theory_slots?.length || 0} Theory Slots
                    </span>
                    <span className="stat-badge lab">
                      🧪 {gen.lab_slots?.length || 0} Lab Sessions
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Constraints Followed */}
      <div className="section">
        <h2>🔒 Features & Top Constraints Followed</h2>
        <div className="constraints-grid">
          <div className="constraint-card critical">
            <div className="constraint-header">
              <span className="constraint-icon">🚫</span>
              <h4>Zero Resource Conflicts</h4>
            </div>
            <p>No teacher or room can be in two places at once across ALL sections</p>
          </div>

          <div className="constraint-card critical">
            <div className="constraint-header">
              <span className="constraint-icon">🔄</span>
              <h4>Batch Rotation (Rule 4.7)</h4>
            </div>
            <p>Every batch rotates through all labs using fixed formula for fair distribution</p>
          </div>

          <div className="constraint-card high">
            <div className="constraint-header">
              <span className="constraint-icon">⏰</span>
              <h4>No Consecutive Labs</h4>
            </div>
            <p>Minimum 2-hour break required between lab sessions for same batch</p>
          </div>

          <div className="constraint-card high">
            <div className="constraint-header">
              <span className="constraint-icon">🔗</span>
              <h4>Synchronized Batches</h4>
            </div>
            <p>All batches of a section must be in labs at the same time slot</p>
          </div>

          <div className="constraint-card medium">
            <div className="constraint-header">
              <span className="constraint-icon">🎯</span>
              <h4>Fixed Slots (OEC/PEC)</h4>
            </div>
            <p>7th semester electives have pre-decided time slots - blocked first</p>
          </div>

          <div className="constraint-card medium">
            <div className="constraint-header">
              <span className="constraint-icon">📊</span>
              <h4>Semester Separation</h4>
            </div>
            <p>Odd and even semesters generated separately - never mixed</p>
          </div>

          <div className="constraint-card medium">
            <div className="constraint-header">
              <span className="constraint-icon">🏗️</span>
              <h4>Cross-Section Validation</h4>
            </div>
            <p>All timetables generated in one run with global conflict checking</p>
          </div>

          <div className="constraint-card low">
            <div className="constraint-header">
              <span className="constraint-icon">⏱️</span>
              <h4>30-Minute Tracking</h4>
            </div>
            <p>Conflicts detected at 30-minute segment level for precision</p>
          </div>

          <div className="constraint-card low">
            <div className="constraint-header">
              <span className="constraint-icon">📚</span>
              <h4>Subject Categories</h4>
            </div>
            <p>5 types: Regular ISE, Other Dept, Projects, OEC, PEC - each with specific rules</p>
          </div>

          <div className="constraint-card low">
            <div className="constraint-header">
              <span className="constraint-icon">🎲</span>
              <h4>Dual Randomization</h4>
            </div>
            <p>Time slots + section order + priority randomized for 10,800 combinations</p>
          </div>

          <div className="constraint-card critical">
            <div className="constraint-header">
              <span className="constraint-icon">👨‍🏫</span>
              <h4>Teacher Conflict Prevention</h4>
            </div>
            <p>No teacher can be in two sections simultaneously - global tracking enforced</p>
          </div>

          <div className="constraint-card high">
            <div className="constraint-header">
              <span className="constraint-icon">🏫</span>
              <h4>Classroom Priority System</h4>
            </div>
            <p>Fixed slots get classrooms first, then regular theory, projects skipped</p>
          </div>

          <div className="constraint-card medium">
            <div className="constraint-header">
              <span className="constraint-icon">⏰</span>
              <h4>Working Hours: 8 AM - 5 PM</h4>
            </div>
            <p>Monday to Friday only, with default breaks at 11:00 and 1:30 PM</p>
          </div>

          <div className="constraint-card medium">
            <div className="constraint-header">
              <span className="constraint-icon">📐</span>
              <h4>Divide-and-Rule Strategy</h4>
            </div>
            <p>Theory classes distributed across days to reduce fatigue and improve learning</p>
          </div>

          <div className="constraint-card low">
            <div className="constraint-header">
              <span className="constraint-icon">🔧</span>
              <h4>Lab Room Compatibility</h4>
            </div>
            <p>Each lab room has specific equipment - only compatible labs can be assigned</p>
          </div>

          <div className="constraint-card low">
            <div className="constraint-header">
              <span className="constraint-icon">👥</span>
              <h4>2 Teachers Per Lab</h4>
            </div>
            <p>Lab sessions require two ISE teachers for supervision - fallback to one if needed</p>
          </div>

          <div className="constraint-card medium">
            <div className="constraint-header">
              <span className="constraint-icon">✏️</span>
              <h4>Post-Generation Editing</h4>
            </div>
            <p>Theory slots remain draggable and editable while maintaining conflict-free state</p>
          </div>

          <div className="constraint-card low">
            <div className="constraint-header">
              <span className="constraint-icon">📅</span>
              <h4>Proven Lab Time Slots</h4>
            </div>
            <p>5 historical time slots: 8-10, 10-12, 12-2, 2-4, 3-5 - achieve 100% success rate</p>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardHome
