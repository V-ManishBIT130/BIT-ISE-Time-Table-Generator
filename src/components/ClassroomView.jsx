import { useState, useEffect } from 'react'
import axios from 'axios'
import DepartmentHeader from './DepartmentHeader'
import './ClassroomView.css'

/**
 * Classroom View Component
 * 
 * Shows a classroom's complete weekly schedule including:
 * - Theory classes (with sections, subjects, teachers)
 * - Occupancy visualization
 * - Real-time availability tracking
 * 
 * Organized in a weekly grid view for easy visualization
 */
function ClassroomView() {
  const [classrooms, setClassrooms] = useState([])
  const [selectedClassroom, setSelectedClassroom] = useState(null)
  const [semType, setSemType] = useState('odd')
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  // Fetch all classrooms
  useEffect(() => {
    fetchClassrooms()
  }, [])

  // Auto-fetch schedule when classroom, semType, or academicYear changes
  useEffect(() => {
    if (selectedClassroom) {
      fetchClassroomSchedule()
    } else {
      setSchedule([])
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassroom, semType, academicYear])

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/classrooms')
      if (response.data.success) {
        // Filter only theory classrooms and sort by room number
        const theoryRooms = response.data.data
          .filter(room => room.room_type === 'theory')
          .sort((a, b) => a.room_no.localeCompare(b.room_no))
        setClassrooms(theoryRooms)
      }
    } catch (err) {
      console.error('Error fetching classrooms:', err)
    }
  }

  const fetchClassroomSchedule = async () => {
    if (!selectedClassroom) {
      setError('Please select a classroom')
      return
    }

    setLoading(true)
    setError(null)

    console.log('🔍 Fetching schedule for classroom:', selectedClassroom)
    console.log('📋 Filters:', { semType, academicYear })

    try {
      // Fetch all timetables for the semester
      const response = await axios.get('http://localhost:5000/api/timetables', {
        params: {
          sem_type: semType,
          academic_year: academicYear
        }
      })

      if (response.data.success) {
        const allTimetables = response.data.data
        const classroomSchedule = []

        // Extract all theory slots that use this classroom
        for (const timetable of allTimetables) {
          if (timetable.theory_slots && Array.isArray(timetable.theory_slots)) {
            for (const slot of timetable.theory_slots) {
              if (slot.classroom_name === selectedClassroom) {
                classroomSchedule.push({
                  section_name: timetable.section_name,
                  sem: timetable.sem,
                  day: slot.day,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  duration_hours: slot.duration_hours || 1,
                  subject_name: slot.subject_name,
                  subject_shortform: slot.subject_shortform,
                  teacher_name: slot.teacher_name,
                  is_fixed_slot: slot.is_fixed_slot || false
                })
              }
            }
          }
        }

        // Sort by day and time
        const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 }
        classroomSchedule.sort((a, b) => {
          if (dayOrder[a.day] !== dayOrder[b.day]) {
            return dayOrder[a.day] - dayOrder[b.day]
          }
          return a.start_time.localeCompare(b.start_time)
        })

        setSchedule(classroomSchedule)
        console.log(`✅ Found ${classroomSchedule.length} classes using this classroom`)
      } else {
        setError(response.data.message || 'Failed to fetch schedule')
      }
    } catch (err) {
      console.error('❌ Error fetching classroom schedule:', err)
      setError(err.response?.data?.message || 'Failed to fetch classroom schedule')
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

  // Get time slot index for grid positioning (30-min slots)
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
    const grid = {}
    DAYS.forEach(day => {
      grid[day] = []
    })

    schedule.forEach(cls => {
      grid[cls.day].push(cls)
    })

    // Sort each day by start time
    Object.keys(grid).forEach(day => {
      grid[day].sort((a, b) => a.start_time.localeCompare(b.start_time))
    })

    return grid
  }

  const weeklyGrid = buildWeeklyGrid()

  // Calculate statistics
  const calculateStatistics = () => {
    const totalClasses = schedule.length
    const totalHours = schedule.reduce((sum, cls) => sum + (cls.duration_hours || 1), 0)
    
    // Calculate utilization per day
    const utilizationByDay = {}
    DAYS.forEach(day => {
      const dayClasses = schedule.filter(cls => cls.day === day)
      const dayHours = dayClasses.reduce((sum, cls) => sum + (cls.duration_hours || 1), 0)
      utilizationByDay[day] = {
        classes: dayClasses.length,
        hours: dayHours,
        percentage: Math.round((dayHours / 9) * 100) // 9 hours available (8 AM - 5 PM)
      }
    })

    return {
      totalClasses,
      totalHours,
      averagePerDay: (totalClasses / 5).toFixed(1),
      utilizationByDay
    }
  }

  const statistics = schedule.length > 0 ? calculateStatistics() : null

  return (
    <div className="classroom-view-container">
      <DepartmentHeader 
        title="Classroom View" 
        subtitle="View classroom occupancy and schedules across all sections"
      />

      {/* Controls */}
      <div className="classroom-controls-panel">
        <div className="classroom-control-item">
          <label>Select Classroom:</label>
          <select
            value={selectedClassroom || ''}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            className="classroom-control-dropdown"
          >
            <option value="">-- Choose Classroom --</option>
            {classrooms.map(room => (
              <option key={room._id} value={room.room_no}>
                {room.room_no}
              </option>
            ))}
          </select>
        </div>

        <div className="classroom-control-item">
          <label>Semester Type:</label>
          <select
            value={semType}
            onChange={(e) => setSemType(e.target.value)}
            className="classroom-control-dropdown"
          >
            <option value="odd">Odd (3, 5, 7)</option>
            <option value="even">Even (4, 6, 8)</option>
          </select>
        </div>

        <div className="classroom-control-item">
          <label>Academic Year:</label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="classroom-control-textbox"
          >
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
            <option value="2027-2028">2027-2028</option>
            <option value="2028-2029">2028-2029</option>
            <option value="2029-2030">2029-2030</option>
          </select>
        </div>

        {loading && (
          <div className="classroom-loading-badge">
            Loading...
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="classroom-error-alert">
          {error}
        </div>
      )}

      {/* Schedule Display - Grid View */}
      {schedule.length > 0 && (
        <div className="classroom-schedule-panel">
          <div className="classroom-timetable-grid">
            {/* Header Row with Time Slots */}
            <div className="classroom-grid-header">
              <div className="classroom-corner-label">Day/Time</div>
              {TIME_SLOTS.map(time => (
                <div
                  key={time}
                  className="classroom-time-label"
                  style={{ gridColumn: `span ${SLOTS_PER_HOUR}` }}
                >
                  {formatTimeSlot(time)}
                </div>
              ))}
            </div>

            {/* Day Rows */}
            {DAYS.map(day => (
              <div key={day} className="classroom-day-row">
                <div className="classroom-day-label">{day.substring(0, 3)}</div>
                <div className="classroom-slots-grid">
                  {weeklyGrid[day].map((item, idx) => {
                    const startIdx = getTimeSlotIndex(item.start_time)
                    const span = getTimeSpan(item.duration_hours)
                    
                    const gridStart = Math.max(1, startIdx + 1)
                    const gridEnd = gridStart + span

                    return (
                      <div
                        key={idx}
                        className={`classroom-schedule-block ${item.is_fixed_slot ? 'fixed-slot' : ''}`}
                        style={{
                          gridColumnStart: gridStart,
                          gridColumnEnd: gridEnd
                        }}
                      >
                        <div className="classroom-block-content">
                          <div className="classroom-block-header">
                            <span className="classroom-section-label">{item.section_name}</span>
                            {item.is_fixed_slot && <span className="classroom-fixed-badge">🔒</span>}
                          </div>
                          <div className="classroom-subject-label">{item.subject_name}</div>
                          <div className="classroom-time-label-small">
                            {formatTime(item.start_time)}-{formatTime(item.end_time)}
                          </div>
                          <div className="classroom-teacher-label">{item.teacher_name}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && schedule.length === 0 && selectedClassroom && (
        <div className="classroom-empty-state">
          <p>📭 No classes scheduled for <strong>{selectedClassroom}</strong> in this semester.</p>
          <p>This classroom is currently unused or no timetables have been generated yet.</p>
        </div>
      )}

      {!selectedClassroom && (
        <div className="classroom-empty-state">
          <p>👆 Select a classroom from the dropdown above to view its schedule</p>
        </div>
      )}
    </div>
  )
}

export default ClassroomView
