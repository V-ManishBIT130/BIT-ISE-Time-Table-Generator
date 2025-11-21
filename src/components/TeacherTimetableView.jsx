import { useState, useEffect } from 'react'
import axios from 'axios'
import DepartmentHeader from './DepartmentHeader'
import './TeacherTimetableView.css'

/**
 * Teacher Timetable View Component
 * 
 * Shows a teacher's complete weekly schedule including:
 * - Theory classes (with sections, subjects, classrooms)
 * - Lab sessions (with batches, labs, rooms)
 * - Statistics (total hours, sessions, etc.)
 * 
 * Organized in a weekly grid view for easy visualization
 */
function TeacherTimetableView() {
  const [teachers, setTeachers] = useState([])
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [semType, setSemType] = useState('odd')
  const [academicYear, setAcademicYear] = useState('2024-2025')
  const [schedule, setSchedule] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const TIME_SLOTS = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00'
  ]
  const SLOTS_PER_HOUR = 2
  const SLOT_DURATION_MINUTES = 60 / SLOTS_PER_HOUR
  const GRID_START_HOUR = 8

  // Helper: Format time slot with end time (1-hour blocks) - Compact format
  const formatTimeSlot = (startTime24) => {
    const [hours] = startTime24.split(':').map(Number)
    const endHours = hours + 1
    
    const formatHour = (h) => {
      const period = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      return `${h12}${period}`
    }
    
    return `${formatHour(hours)}-${formatHour(endHours)}`
  }

  // Fetch all teachers
  useEffect(() => {
    fetchTeachers()
  }, [])

  // Auto-fetch schedule when teacher, semType, or academicYear changes
  useEffect(() => {
    if (selectedTeacher) {
      fetchTeacherSchedule()
    } else {
      // Clear schedule when no teacher is selected
      setSchedule(null)
      setStatistics(null)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeacher, semType, academicYear])

  const fetchTeachers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/teachers')
      if (response.data.success) {
        // Sort teachers by name for better UX
        const sortedTeachers = response.data.data.sort((a, b) => 
          a.name.localeCompare(b.name)
        )
        setTeachers(sortedTeachers)
      }
    } catch (err) {
      console.error('Error fetching teachers:', err)
    }
  }

  // Fetch teacher schedule when teacher is selected
  const fetchTeacherSchedule = async () => {
    if (!selectedTeacher) {
      setError('Please select a teacher')
      return
    }

    setLoading(true)
    setError(null)

    console.log('🔍 Fetching schedule for teacher:', selectedTeacher)
    console.log('📋 Filters:', { semType, academicYear })

    try {
      const response = await axios.get(
        `http://localhost:5000/api/timetables/teacher-schedule/${selectedTeacher}`,
        {
          params: {
            sem_type: semType,
            academic_year: academicYear
          }
        }
      )

      console.log('✅ Response received:', response.data)

      if (response.data.success) {
        setSchedule(response.data.schedule)
        setStatistics(response.data.statistics)
        console.log('📊 Schedule set:', response.data.schedule)
        console.log('📈 Statistics:', response.data.statistics)
      } else {
        setError(response.data.message || 'Failed to fetch schedule')
      }
    } catch (err) {
      console.error('❌ Error fetching teacher schedule:', err)
      setError(err.response?.data?.message || 'Failed to fetch teacher schedule')
    } finally {
      setLoading(false)
    }
  }

  // Convert 24-hour time to 12-hour format
  const formatTime = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Get time slot index for grid positioning (1-hour slots)
  const getTimeSlotIndex = (time) => {
    const [hourStr, minuteStr] = time.split(':')
    const hour = parseInt(hourStr)
    const minutes = parseInt(minuteStr)
    const totalMinutes = hour * 60 + minutes
    const startMinutes = GRID_START_HOUR * 60
    const offset = Math.max(0, totalMinutes - startMinutes)
    return Math.round(offset / SLOT_DURATION_MINUTES)
  }

  // Calculate span for grid items based on duration
  const getTimeSpan = (durationHours) => {
    return Math.max(1, Math.round(durationHours * SLOTS_PER_HOUR))
  }

  // Build grid structure for the week
  const buildWeeklyGrid = () => {
    if (!schedule) return {}

    const grid = {}
    DAYS.forEach(day => {
      grid[day] = []
    })

    // Add theory classes
    schedule.theory_classes.forEach(cls => {
      grid[cls.day].push({
        type: 'theory',
        ...cls
      })
    })

    // Add lab sessions
    schedule.lab_sessions.forEach(lab => {
      grid[lab.day].push({
        type: 'lab',
        ...lab
      })
    })

    // Sort each day by start time
    Object.keys(grid).forEach(day => {
      grid[day].sort((a, b) => a.start_time.localeCompare(b.start_time))
    })

    return grid
  }

  const weeklyGrid = buildWeeklyGrid()

  // Get selected teacher name
  const getTeacherName = () => {
    const teacher = teachers.find(t => t._id === selectedTeacher)
    return teacher ? teacher.name : 'Unknown Teacher'
  }

  return (
    <div className="teacher-timetable-view">
      <DepartmentHeader 
        title="Teacher's Timetable View" 
        subtitle="View individual teacher schedules across all sections"
      />
      
      <div className="teacher-page-header">
        {/* Removed redundant h1 */}
      </div>

      {/* Controls */}
      <div className="teacher-controls-section">
        <div className="teacher-control-group">
          <label>Select Teacher:</label>
          <select
            value={selectedTeacher || ''}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="teacher-control-select"
          >
            <option value="">-- Choose Teacher --</option>
            {teachers.map(teacher => (
              <option key={teacher._id} value={teacher._id}>
                {teacher.name} {teacher.teacher_shortform ? `(${teacher.teacher_shortform})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="teacher-control-group">
          <label>Semester Type:</label>
          <select
            value={semType}
            onChange={(e) => setSemType(e.target.value)}
            className="teacher-control-select"
          >
            <option value="odd">Odd (3, 5, 7)</option>
            <option value="even">Even (4, 6, 8)</option>
          </select>
        </div>

        <div className="teacher-control-group">
          <label>Academic Year:</label>
          <input
            type="text"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="2024-2025"
            className="teacher-control-input"
          />
        </div>

        {schedule && (
          <div className="teacher-view-mode-toggle">
            <button
              className={`teacher-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Grid View
            </button>
            <button
              className={`teacher-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List View
            </button>
          </div>
        )}

        {loading && (
          <div className="teacher-loading-indicator">
            Loading schedule...
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="teacher-error-message">
          {error}
        </div>
      )}

      {/* Schedule Display - Grid View */}
      {schedule && viewMode === 'grid' && (
        <div className="schedule-section">
          <div className="timetable-grid">
            {/* Header Row with Time Slots */}
            <div className="grid-header">
              <div className="corner-cell">Day/Time</div>
              {TIME_SLOTS.map(time => (
                <div
                  key={time}
                  className="time-header-cell"
                  style={{ gridColumn: `span ${SLOTS_PER_HOUR}` }}
                >
                  {formatTimeSlot(time)}
                </div>
              ))}
            </div>

            {/* Day Rows */}
            {DAYS.map(day => (
              <div key={day} className="day-row">
                <div className="day-header-cell">{day.substring(0, 3)}</div>
                <div className="time-slots-container">
                  {weeklyGrid[day].map((item, idx) => {
                    const startIdx = getTimeSlotIndex(item.start_time)
                    const span = getTimeSpan(item.duration_hours)
                    
                    // Grid positions are 1-based within the time-slots-container
                    const gridStart = Math.max(1, startIdx + 1)
                    const gridEnd = gridStart + span

                    return (
                      <div
                        key={idx}
                        className={`schedule-item ${item.type}`}
                        style={{
                          gridColumnStart: gridStart,
                          gridColumnEnd: gridEnd
                        }}
                      >
                        {item.type === 'theory' ? (
                          <div className= "content-wrap">
                            <div className="item-header">
                              <span className="item-section">{item.section_name}</span>
                            </div>
                            <div className="item-subject">{item.subject_name}</div>
                            <div className="item-time">
                              {formatTime(item.start_time)}-{formatTime(item.end_time)}
                            </div>
                            <div className="item-location">{item.classroom_name}</div>
                          </div>
                        ) : (
                          <div className="content-wrap">
                            <div className="item-time">
                              {formatTime(item.start_time)}-{formatTime(item.end_time)}
                            </div>
                            {item.batches.map((batch, bIdx) => (
                              <div key={bIdx} className="batch-info">
                                <span className="batch-name">{batch.batch_name}: {batch.lab_shortform}</span>
                                <span className="room-name">@{batch.lab_room_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Statistics Summary - Below Timetable */}
          {statistics && (
            <div className="statistics-summary">
              <h3>Weekly Summary for {getTeacherName()}</h3>
              <ul className="summary-list">
                <li>
                  <strong>Theory Classes:</strong> {statistics.total_theory_classes} sessions ({statistics.theory_hours} hours)
                </li>
                <li>
                  <strong>Lab Sessions:</strong> {statistics.total_lab_sessions} sessions ({statistics.lab_hours} hours)
                </li>
                <li>
                  <strong>Total Teaching Load:</strong> {statistics.total_sessions} sessions ({statistics.total_hours} hours/week)
                </li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {schedule && viewMode === 'list' && (
        <div className="schedule-section">
          
          {/* Theory Classes */}
          {schedule.theory_classes.length > 0 && (
            <div className="list-section">
              <h3>Theory Classes ({schedule.theory_classes.length})</h3>
              <div className="list-container">
                {schedule.theory_classes.map((cls, idx) => (
                  <div key={idx} className="list-item theory">
                    <div className="list-item-header">
                      <span className="list-day">{cls.day}</span>
                      <span className="list-time">
                        {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                      </span>
                    </div>
                    <div className="list-item-content">
                      <div className="list-row">
                        <strong>Section:</strong> {cls.section_name} (Sem {cls.sem})
                      </div>
                      <div className="list-row">
                        <strong>Subject:</strong> {cls.subject_name}
                      </div>
                      <div className="list-row">
                        <strong>Classroom:</strong> {cls.classroom_name}
                      </div>
                      {cls.is_fixed_slot && (
                        <div className="list-row">
                          <span className="fixed-badge">Fixed Slot</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lab Sessions */}
          {schedule.lab_sessions.length > 0 && (
            <div className="list-section">
              <h3>Lab Sessions ({schedule.lab_sessions.length})</h3>
              <div className="list-container">
                {schedule.lab_sessions.map((lab, idx) => (
                  <div key={idx} className="list-item lab">
                    <div className="list-item-header">
                      <span className="list-day">{lab.day}</span>
                      <span className="list-time">
                        {formatTime(lab.start_time)} - {formatTime(lab.end_time)}
                      </span>
                    </div>
                    <div className="list-item-content">
                      <div className="list-row">
                        <strong>Section:</strong> {lab.section_name} (Sem {lab.sem})
                      </div>
                      <div className="batches-list">
                        {lab.batches.map((batch, bIdx) => (
                          <div key={bIdx} className="batch-item">
                            <strong>{batch.batch_name}:</strong> {batch.lab_name}
                            <span className="batch-room">@ {batch.lab_room_name}</span>
                            <span className="batch-role">({batch.role})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {schedule.theory_classes.length === 0 && schedule.lab_sessions.length === 0 && (
            <div className="no-schedule">
              <p>No classes or labs assigned to this teacher for the selected semester.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !schedule && !error && !selectedTeacher && (
        <div className="empty-state">
          <div className="empty-icon">👨‍🏫</div>
          <p>Select a teacher from the dropdown to view their weekly timetable</p>
        </div>
      )}
    </div>
  )
}

export default TeacherTimetableView
