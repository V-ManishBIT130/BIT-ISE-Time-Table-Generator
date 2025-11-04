import { useState, useEffect } from 'react'
import axios from 'axios'
import './TimetableViewer.css'

function TimetableViewer() {
  const [sections, setSections] = useState([])
  const [selectedSection, setSelectedSection] = useState('')
  const [timetable, setTimetable] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [semType, setSemType] = useState('odd')

  // Time slots: 8:00 AM to 5:00 PM in 30-minute intervals
  const timeSlots = [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
  ]

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  // Helper: Convert 24-hour to 12-hour format
  const convertTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Helper: Calculate time slot index
  const getTimeSlotIndex = (time) => {
    const [hours, minutes] = time.split(':').map(Number)
    const startHour = 8
    const totalMinutes = (hours - startHour) * 60 + minutes
    return Math.floor(totalMinutes / 30)
  }

  // Helper: Calculate span (number of 30-min slots)
  const getTimeSpan = (startTime, endTime) => {
    const startIndex = getTimeSlotIndex(startTime)
    const endIndex = getTimeSlotIndex(endTime)
    return endIndex - startIndex
  }

  // Fetch all sections
  useEffect(() => {
    fetchSections()
  }, [semType])

  const fetchSections = async () => {
    try {
      const response = await axios.get('/api/sections', {
        params: { sem_type: semType }
      })
      setSections(response.data.data || [])
    } catch (err) {
      console.error('Error fetching sections:', err)
      setError('Failed to fetch sections')
    }
  }

  // Fetch timetable for selected section
  const fetchTimetable = async (sectionId) => {
    if (!sectionId) return

    setLoading(true)
    setError('')
    setTimetable(null)

    try {
      const response = await axios.get(`/api/timetables/${sectionId}`, {
        params: { sem_type: semType }
      })

      if (response.data.success) {
        setTimetable(response.data.data)
      } else {
        setError('No timetable found for this section')
      }
    } catch (err) {
      console.error('Error fetching timetable:', err)
      if (err.response?.status === 404) {
        setError('No timetable generated yet for this section')
      } else {
        setError('Failed to fetch timetable')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSectionChange = (e) => {
    const sectionId = e.target.value
    setSelectedSection(sectionId)
    fetchTimetable(sectionId)
  }

  // Calculate unassigned labs
  const getUnassignedLabs = () => {
    if (!timetable) return null

    const semester = timetable.sem
    const expectedLabCount = semester === 3 ? 5 : semester === 5 || semester === 7 ? 2 : 0
    const actualLabCount = timetable.lab_slots?.length || 0
    
    if (actualLabCount >= expectedLabCount) {
      return null // All labs assigned
    }

    const unassignedCount = expectedLabCount - actualLabCount
    return {
      expected: expectedLabCount,
      actual: actualLabCount,
      missing: unassignedCount
    }
  }

  // Build grid cells for each day
  const buildDayGrid = (day) => {
    const cells = new Array(timeSlots.length).fill(null)

    if (!timetable) return cells

    // Process theory slots
    timetable.theory_slots?.forEach((slot) => {
      if (slot.day === day) {
        const startIndex = getTimeSlotIndex(slot.start_time)
        const span = getTimeSpan(slot.start_time, slot.end_time)

        cells[startIndex] = {
          type: 'theory',
          span: span,
          data: slot
        }

        // Mark occupied cells
        for (let i = 1; i < span; i++) {
          cells[startIndex + i] = { type: 'occupied' }
        }
      }
    })

    // Process lab slots
    timetable.lab_slots?.forEach((slot) => {
      if (slot.day === day) {
        const startIndex = getTimeSlotIndex(slot.start_time)
        const span = getTimeSpan(slot.start_time, slot.end_time)

        cells[startIndex] = {
          type: 'lab',
          span: span,
          data: slot
        }

        // Mark occupied cells
        for (let i = 1; i < span; i++) {
          cells[startIndex + i] = { type: 'occupied' }
        }
      }
    })

    return cells
  }

  const renderCell = (cell, dayIndex, timeIndex) => {
    if (!cell) {
      return <td key={`${dayIndex}-${timeIndex}`} className="empty-cell"></td>
    }

    if (cell.type === 'occupied') {
      return null // Skip occupied cells (already spanned)
    }

    if (cell.type === 'theory') {
      const slot = cell.data
      return (
        <td
          key={`${dayIndex}-${timeIndex}`}
          className="theory-cell"
          colSpan={cell.span}
          title={`${slot.subject_name}\n${slot.teacher_name}\n${convertTo12Hour(slot.start_time)} - ${convertTo12Hour(slot.end_time)}`}
        >
          <div className="cell-content">
            <div className="subject-code">{slot.subject_shortform}</div>
            <div className="teacher-name">{slot.teacher_shortform}</div>
            <div className="time-range">
              {convertTo12Hour(slot.start_time)} - {convertTo12Hour(slot.end_time)}
            </div>
            {slot.is_fixed_slot && <div className="fixed-badge">FIXED</div>}
          </div>
        </td>
      )
    }

    if (cell.type === 'lab') {
      const slot = cell.data
      
      // Extract batch details for display
      const batchDetails = slot.batches?.map(b => ({
        name: b.batch_name,
        lab: b.lab_shortform || b.lab_name,
        room: b.lab_room_name || 'TBD'
      })) || []
      
      return (
        <td
          key={`${dayIndex}-${timeIndex}`}
          className="lab-cell"
          colSpan={cell.span}
          title={`Lab Session\n${batchDetails.map(b => `${b.name}: ${b.lab} in ${b.room}`).join('\n')}\n${convertTo12Hour(slot.start_time)} - ${convertTo12Hour(slot.end_time)}`}
        >
          <div className="cell-content">
            <div className="lab-name">LAB SESSION</div>
            <div className="batch-info">
              {batchDetails.map((b, idx) => (
                <div key={idx} className="batch-detail">
                  <strong>{b.name}:</strong> {b.lab} in {b.room}
                </div>
              ))}
            </div>
            <div className="time-range">
              {convertTo12Hour(slot.start_time)} - {convertTo12Hour(slot.end_time)}
            </div>
            {slot.batches?.[0]?.teacher1_name && (
              <div className="teachers-info">
                <span className="teacher-badge">{slot.batches[0].teacher1_shortform || slot.batches[0].teacher1_name}</span>
                {slot.batches[0].teacher2_name && (
                  <span className="teacher-badge">{slot.batches[0].teacher2_shortform || slot.batches[0].teacher2_name}</span>
                )}
              </div>
            )}
          </div>
        </td>
      )
    }

    return null
  }

  return (
    <div className="timetable-viewer">
      <div className="viewer-header">
        <h2>📅 Timetable Viewer</h2>
        <p>View generated timetables in grid format with 30-minute intervals</p>
      </div>

      <div className="viewer-controls">
        <div className="control-group">
          <label>Semester Type:</label>
          <div className="button-group">
            <button
              className={`toggle-btn ${semType === 'odd' ? 'active' : ''}`}
              onClick={() => {
                setSemType('odd')
                setSelectedSection('')
                setTimetable(null)
              }}
            >
              {semType === 'odd' ? '✓ ' : ''}Odd Semester
            </button>
            <button
              className={`toggle-btn ${semType === 'even' ? 'active' : ''}`}
              onClick={() => {
                setSemType('even')
                setSelectedSection('')
                setTimetable(null)
              }}
            >
              {semType === 'even' ? '✓ ' : ''}Even Semester
            </button>
          </div>
        </div>

        <div className="control-group">
          <label htmlFor="section-select">Select Section:</label>
          <select
            id="section-select"
            value={selectedSection}
            onChange={handleSectionChange}
            disabled={sections.length === 0}
          >
            <option value="">-- Choose a section --</option>
            {sections.map((section) => (
              <option key={section._id} value={section._id}>
                Semester {section.sem} - Section {section.section_name} ({section.num_batches} batches)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="loading">Loading timetable...</div>}
      {error && <div className="error-message">{error}</div>}

      {timetable && (
        <div className="timetable-container">
          <div className="timetable-info">
            <h3>
              Section {timetable.section_name} - Semester {timetable.sem} ({timetable.sem_type})
            </h3>
            <div className="metadata">
              <span>Academic Year: {timetable.academic_year}</span>
              <span>Generated: {new Date(timetable.generation_metadata?.generated_at || timetable.generation_date).toLocaleString()}</span>
              <span>Algorithm: {timetable.generation_metadata?.algorithm || 'N/A'}</span>
            </div>
          </div>

          {/* Unassigned Labs Warning */}
          {getUnassignedLabs() && (
            <div className="unassigned-labs-warning">
              <div className="warning-header">
                <span className="warning-icon">⚠️</span>
                <h4>Incomplete Lab Schedule</h4>
              </div>
              <div className="warning-content">
                <p>
                  <strong>{getUnassignedLabs().missing} lab session(s)</strong> could not be automatically scheduled due to room/time conflicts.
                </p>
                <div className="warning-stats">
                  <span className="stat">✅ Assigned: {getUnassignedLabs().actual} labs</span>
                  <span className="stat">❌ Missing: {getUnassignedLabs().missing} labs</span>
                  <span className="stat">📊 Total Required: {getUnassignedLabs().expected} labs</span>
                </div>
                <div className="warning-action">
                  <p>
                    <strong>Action Required:</strong> Please manually assign the missing lab session(s) offline or adjust existing schedules to accommodate them.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid-wrapper">
            <table className="timetable-grid">
              <thead>
                <tr>
                  <th className="day-header">Day / Time</th>
                  {timeSlots.map((time, idx) => (
                    <th key={idx} className="time-header">
                      {time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDays.map((day, dayIndex) => {
                  const dayCells = buildDayGrid(day)
                  return (
                    <tr key={dayIndex}>
                      <td className="day-label">{day}</td>
                      {dayCells.map((cell, timeIndex) => renderCell(cell, dayIndex, timeIndex))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {timetable.generation_metadata?.teacher_assignment_summary && (
            <div className="summary-stats">
              <h4>Teacher Assignment Summary:</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Lab Sessions:</span>
                  <span className="stat-value">{timetable.generation_metadata.teacher_assignment_summary.total_lab_sessions || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Sessions with 2 Teachers:</span>
                  <span className="stat-value">{timetable.generation_metadata.teacher_assignment_summary.sessions_with_2_teachers || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Sessions with 1 Teacher:</span>
                  <span className="stat-value">{timetable.generation_metadata.teacher_assignment_summary.sessions_with_1_teacher || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Sessions with 0 Teachers:</span>
                  <span className="stat-value">{timetable.generation_metadata.teacher_assignment_summary.sessions_with_0_teachers || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Color Legend */}
          <div className="color-legend">
            <h4>📋 Legend</h4>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-box theory-legend"></div>
                <span>Theory Classes (Blue)</span>
              </div>
              <div className="legend-item">
                <div className="legend-box lab-legend"></div>
                <span>Lab Sessions (Orange)</span>
              </div>
              <div className="legend-item">
                <div className="legend-box empty-legend"></div>
                <span>Empty Slots (White)</span>
              </div>
              <div className="legend-item">
                <div className="legend-badge fixed-badge">FIXED</div>
                <span>Fixed Time Slots (OEC/PEC)</span>
              </div>
            </div>
          </div>

          {timetable.flagged_sessions && timetable.flagged_sessions.length > 0 && (
            <div className="flagged-sessions">
              <h4>⚠️ Flagged Sessions (Need Review):</h4>
              <ul>
                {timetable.flagged_sessions.map((flag, idx) => (
                  <li key={idx}>
                    <strong>{flag.session_type}</strong>: {flag.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!loading && !error && !timetable && selectedSection && (
        <div className="no-data">No timetable data available for this section.</div>
      )}
    </div>
  )
}

export default TimetableViewer
