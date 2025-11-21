import { useState, useEffect } from 'react'
import axios from 'axios'
import DepartmentHeader from './DepartmentHeader'
import './LabsView.css'

/**
 * Lab's View Component
 * 
 * Purpose: Display lab room occupancy schedule across the week
 * Shows which batch is using which lab at what time
 * Helps identify when labs are full vs empty
 */
function LabsView() {
  const [labRooms, setLabRooms] = useState([])
  const [timetables, setTimetables] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [semType, setSemType] = useState('odd')
  const [academicYear, setAcademicYear] = useState('2024-2025')
  const [selectedLabRoom, setSelectedLabRoom] = useState(null)

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  // 1-hour segments for clearer visibility (shows actual occupancy per hour)
  const TIME_SLOTS = [
    '08:00-09:00',
    '09:00-10:00',
    '10:00-11:00',
    '11:00-12:00',
    '12:00-13:00',
    '13:00-14:00',
    '14:00-15:00',
    '15:00-16:00',
    '16:00-17:00'
  ]

  // Helper: Convert 24-hour time to 12-hour format
  const convertTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
  }

  // Helper: Convert time slot to 12-hour format
  const formatTimeSlot = (slot) => {
    const [start, end] = slot.split('-')
    return `${convertTo12Hour(start)} - ${convertTo12Hour(end)}`
  }

  useEffect(() => {
    fetchLabRooms()
  }, [])

  useEffect(() => {
    if (selectedLabRoom) {
      fetchTimetables()
    }
  }, [semType, academicYear, selectedLabRoom])

  const fetchLabRooms = async () => {
    try {
      const response = await axios.get('/api/dept-labs')
      if (response.data.success) {
        // Sort by room number
        const sorted = response.data.data.sort((a, b) =>
          a.labRoom_no.localeCompare(b.labRoom_no)
        )
        setLabRooms(sorted)
        // Auto-select first lab room
        if (sorted.length > 0) {
          setSelectedLabRoom(sorted[0])
        }
      }
    } catch (err) {
      console.error('Error fetching lab rooms:', err)
      setError('Failed to load lab rooms')
    }
  }

  const fetchTimetables = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axios.get('/api/timetables', {
        params: {
          sem_type: semType,
          academic_year: academicYear
        }
      })

      if (response.data.success) {
        setTimetables(response.data.data)
      }
    } catch (err) {
      console.error('Error fetching timetables:', err)
      setError('Failed to load timetables')
    } finally {
      setLoading(false)
    }
  }

  // Build lab occupancy map for selected lab room only
  // Groups by 2-hour blocks (since all labs are 2 hours)
  const buildLabOccupancy = () => {
    if (!selectedLabRoom) return {}

    const occupancy = {}
    const roomNo = selectedLabRoom.labRoom_no

    // Initialize structure for selected room only with 1-hour segments
    occupancy[roomNo] = {}
    DAYS.forEach(day => {
      occupancy[roomNo][day] = {}
      TIME_SLOTS.forEach(slot => {
        occupancy[roomNo][day][slot] = []
      })
    })

    // Fill in occupancy from timetables
    // Each lab session will be stored only at its START hour
    timetables.forEach(tt => {
      const labSlots = tt.lab_slots || []

      labSlots.forEach(slot => {
        const { day, start_time, end_time, batches } = slot

        if (!batches || batches.length === 0) return

        batches.forEach(batch => {
          const batchRoomNo = batch.lab_room_name

          if (batchRoomNo === roomNo) {
            // Find the 1-hour slot that matches the start time
            const matchingSlot = TIME_SLOTS.find(hourSlot => hourSlot.startsWith(start_time))

            if (matchingSlot && occupancy[roomNo][day] && occupancy[roomNo][day][matchingSlot]) {
              occupancy[roomNo][day][matchingSlot].push({
                batchName: batch.batch_name,
                labName: batch.lab_shortform || batch.lab_name,
                sectionName: tt.section_name,
                sessionTime: `${start_time}-${end_time}`,
                teacher1: batch.teacher1_shortform || batch.teacher1_name || null,
                teacher2: batch.teacher2_shortform || batch.teacher2_name || null,
                duration: 2 // All labs are 2 hours
              })
            }
          }
        })
      })
    })

    return occupancy
  }

  const labOccupancy = buildLabOccupancy()

  // Calculate statistics for selected lab room only
  const calculateStats = () => {
    if (!selectedLabRoom) {
      return { totalSlots: 0, occupiedSlots: 0, emptySlots: 0 }
    }

    let totalSlots = 0
    let occupiedSlots = 0
    let emptySlots = 0

    const roomNo = selectedLabRoom.labRoom_no

    DAYS.forEach(day => {
      TIME_SLOTS.forEach(slot => {
        totalSlots++
        const occupants = labOccupancy[roomNo]?.[day]?.[slot] || []
        if (occupants.length > 0) {
          occupiedSlots++
        } else {
          emptySlots++
        }
      })
    })

    return { totalSlots, occupiedSlots, emptySlots }
  }

  const stats = calculateStats()
  const utilizationRate = stats.totalSlots > 0
    ? ((stats.occupiedSlots / stats.totalSlots) * 100).toFixed(1)
    : 0

  return (
    <div className="labs-view">
      <DepartmentHeader
        title="Lab's View"
        subtitle="Monitor lab room occupancy and batch schedules"
      />

      <div className="labs-page-header">
        {/* Removed redundant h1 */}
      </div>

      {/* Controls */}
      <div className="labs-controls-section">
        <div className="labs-control-group">
          <label>Select Lab Room:</label>
          <select
            value={selectedLabRoom?._id || ''}
            onChange={(e) => {
              const room = labRooms.find(r => r._id === e.target.value)
              setSelectedLabRoom(room)
            }}
            className="labs-control-select"
          >
            <option value="">Select a lab room...</option>
            {labRooms.map(room => (
              <option key={room._id} value={room._id}>
                {room.labRoom_no} - {room.labName}
              </option>
            ))}
          </select>
        </div>

        <div className="labs-control-group">
          <label>Semester Type:</label>
          <div className="labs-button-group">
            <button
              className={`labs-toggle-btn ${semType === 'odd' ? 'active' : ''}`}
              onClick={() => setSemType('odd')}
            >
              Odd Semester
            </button>
            <button
              className={`labs-toggle-btn ${semType === 'even' ? 'active' : ''}`}
              onClick={() => setSemType('even')}
            >
              Even Semester
            </button>
          </div>
        </div>

        <div className="labs-control-group">
          <label>Academic Year:</label>
          <input
            type="text"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="2024-2025"
            className="labs-control-input"
          />
        </div>
      </div>

      {/* Error/Loading */}
      {error && <div className="labs-error-message">❌ {error}</div>}
      {loading && <div className="labs-loading-message">⏳ Loading timetables...</div>}

      {!selectedLabRoom && !loading && (
        <div className="labs-no-selection-message">
          👆 Please select a lab room from the dropdown above
        </div>
      )}

      {/* Lab Schedule Grid */}
      {selectedLabRoom && (
        <div className="lab-schedule-section">
          <h2>🗓 {selectedLabRoom.labRoom_no} - {selectedLabRoom.labName}</h2>

          <div className="lab-schedule-grid">
            {/* Header Row */}
            <div className="schedule-header">
              <div className="corner-cell">D/T</div>
              {TIME_SLOTS.map(slot => (
                <div key={slot} className="labs-time-header">{formatTimeSlot(slot)}</div>
              ))}
            </div>

            {/* Day Rows */}
            {DAYS.map(day => (
              <div key={day} className="labs-day-row">
                <div className="labs-day-header">{day.substring(0, 3)}</div>
                <div className="labs-time-slots-container">
                  {TIME_SLOTS.map((slot, slotIdx) => {
                    const occupants = labOccupancy[selectedLabRoom.labRoom_no]?.[day]?.[slot] || []
                    const isEmpty = occupants.length === 0

                    // Check if previous slot has 2-hour session that spans into this slot
                    if (slotIdx > 0) {
                      const prevSlot = TIME_SLOTS[slotIdx - 1]
                      const prevOccupants = labOccupancy[selectedLabRoom.labRoom_no]?.[day]?.[prevSlot] || []
                      if (prevOccupants.length > 0 && prevOccupants[0].duration === 2) {
                        // This slot is covered by previous 2-hour session, skip rendering
                        return null
                      }
                    }

                    // If this slot has a 2-hour session, span 2 columns (grid-based)
                    const spanCount = (!isEmpty && occupants[0]?.duration === 2) ? 2 : 1
                    const gridStart = slotIdx + 1
                    const gridEnd = gridStart + spanCount

                    return (
                      <div
                        key={slot}
                        className={`time-cell ${isEmpty ? 'empty' : 'occupied'}`}
                        style={{
                          gridColumnStart: gridStart,
                          gridColumnEnd: gridEnd
                        }}
                      >
                        {isEmpty ? (
                          <span className="empty-label">🆓 Free</span>
                        ) : (
                          <div className="occupants-list">
                            {occupants.map((occ, idx) => (
                              <div key={idx} className="occupant-item">
                                <div className="occupant-header">
                                  <span className="batch-name">{occ.batchName}</span>
                                  <span className="lab-name">{occ.labName}</span>
                                </div>
                                <div className="session-time">
                                  {convertTo12Hour(occ.sessionTime.split('-')[0])} - {convertTo12Hour(occ.sessionTime.split('-')[1])}
                                </div>
                               {(occ.teacher1 || occ.teacher2) && (
                                  <div className="teacher-info">
                                    {[occ.teacher1, occ.teacher2].filter(Boolean).join(', ')}
                                  </div>
                                )}
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
          <div className="statistics-section">
            <h3>Weekly Summary for {selectedLabRoom.labRoom_no} - {selectedLabRoom.labName}</h3>
            <ul className="summary-list">
              <li>
                <strong>Total Slots:</strong> {stats.totalSlots} ({DAYS.length} days × {TIME_SLOTS.length} hours)
              </li>
              <li>
                <strong>Occupied Slots:</strong> {stats.occupiedSlots} slots
              </li>
              <li>
                <strong>Empty Slots:</strong> {stats.emptySlots} slots
              </li>
              <li>
                <strong>Utilization Rate:</strong> {utilizationRate}% utilized
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default LabsView