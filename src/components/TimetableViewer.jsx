import { useState, useEffect } from 'react'
import axios from 'axios'
import DepartmentHeader from './DepartmentHeader'
import './TimetableViewer.css'

function TimetableViewer() {
  const [sections, setSections] = useState([])
  const [selectedSection, setSelectedSection] = useState('')
  const [timetable, setTimetable] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [semType, setSemType] = useState('odd')
  const [theorySummaryExpanded, setTheorySummaryExpanded] = useState(false)

  // Time slots: 8:00 AM to 4:30 PM in 30-minute intervals
  // Note: Last slot (4:30 PM) represents 4:30-5:00 PM (working hours end at 5:00 PM)
  const timeSlots = [
    '8:00 AM - 8:30 AM', '8:30 AM - 9:00 AM', '9:00 AM - 9:30 AM', '9:30 AM - 10:00 AM',
    '10:00 AM - 10:30 AM', '10:30 AM - 11:00 AM', '11:00 AM - 11:30 AM', '11:30 AM - 12:00 PM',
    '12:00 PM - 12:30 PM', '12:30 PM - 1:00 PM', '1:00 PM - 1:30 PM', '1:30 PM - 2:00 PM',
    '2:00 PM - 2:30 PM', '2:30 PM - 3:00 PM', '3:00 PM - 3:30 PM', '3:30 PM - 4:00 PM',
    '4:00 PM - 4:30 PM', '4:30 PM - 5:00 PM'
  ]

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const weekDaysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

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

  // Helper: Detect teacher conflicts
  // ONLY checks non-fixed slots (fixed slots verified in Step 2)
  const detectTeacherConflicts = (theorySlots) => {
    if (!theorySlots) return []
    
    const conflicts = []
    const teacherSchedule = new Map()
    
    theorySlots.forEach(slot => {
      // Skip fixed slots (verified in Step 2)
      if (slot.is_fixed_slot === true) return
      
      // Skip slots without teachers
      if (!slot.teacher_id || slot.teacher_name === '[Other Dept]') return
      
      const key = `${slot.teacher_id}_${slot.day}_${slot.start_time}`
      
      if (teacherSchedule.has(key)) {
        const existingSlot = teacherSchedule.get(key)
        conflicts.push({
          teacher: slot.teacher_name,
          day: slot.day,
          time: convertTo12Hour(slot.start_time),
          subjects: [existingSlot.subject_shortform, slot.subject_shortform]
        })
      } else {
        teacherSchedule.set(key, slot)
      }
    })
    
    return conflicts
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
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📊 FULL TIMETABLE DATA RECEIVED:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('   • Section:', response.data.data.section_name)
        console.log('   • Sem:', response.data.data.sem)
        console.log('   • Academic Year:', response.data.data.academic_year)
        console.log('   • Theory Slots:', response.data.data.theory_slots?.length)
        console.log('   • Lab Slots:', response.data.data.lab_slots?.length)
        console.log('   • Breaks Array:', response.data.data.breaks?.length || 0)
        console.log('\n☕ [BREAKS DATA] Detailed break information:')
        if (response.data.data.breaks && response.data.data.breaks.length > 0) {
          console.log('   ✅ Breaks array exists with', response.data.data.breaks.length, 'breaks')
          response.data.data.breaks.forEach((brk, idx) => {
            console.log(`      Break ${idx + 1}: ${brk.day} ${brk.start_time}-${brk.end_time} (${brk.label})`)
          })
        } else if (response.data.data.breaks && response.data.data.breaks.length === 0) {
          console.log('   ⚠️ Breaks array exists but is EMPTY')
        } else {
          console.log('   ❌ Breaks array does NOT exist (will use default breaks)')
        }
        console.log('\n📊 GENERATION METADATA:')
        console.log('   • Current Step:', response.data.data.generation_metadata?.current_step)
        console.log('   • Steps Completed:', response.data.data.generation_metadata?.steps_completed)
        console.log('\n📚 THEORY SCHEDULING SUMMARY:')
        if (response.data.data?.generation_metadata?.theory_scheduling_summary) {
          const summary = response.data.data.generation_metadata.theory_scheduling_summary
          console.log('   ✅ SUMMARY EXISTS!')
          console.log('   • Total Subjects:', summary.total_subjects_found)
          console.log('   • Regular ISE:', `${summary.regular_ise_scheduled}/${summary.regular_ise_found}`)
          console.log('   • Other Dept:', `${summary.other_dept_scheduled}/${summary.other_dept_found}`)
          console.log('   • Projects:', `${summary.projects_scheduled}/${summary.projects_found}`)
          console.log('   • Success Rate:', summary.success_rate + '%')
        } else {
          console.log('   ❌ SUMMARY IS UNDEFINED!')
          console.log('   This means Step 4 needs to be re-run with updated code.')
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
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
    console.log(`\n🔨 [BUILD GRID] Building grid for ${day}...`)
    const cells = new Array(timeSlots.length).fill(null)

    if (!timetable) return cells

    console.log(`   📊 [INITIAL STATE] Empty cells array created (${cells.length} slots)`)

    // First, process theory and lab slots to mark occupied times
    // Theory slots (medium priority)
    console.log(`   📚 [THEORY PROCESSING] Processing ${timetable.theory_slots?.length || 0} theory slots...`)
    timetable.theory_slots?.forEach((slot) => {
      if (slot.day === day) {
        const startIndex = getTimeSlotIndex(slot.start_time)
        const span = getTimeSpan(slot.start_time, slot.end_time)

        console.log(`      ✅ Theory: ${slot.subject_shortform} at ${slot.start_time}-${slot.end_time} (index ${startIndex}, span ${span})`)

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

    // Process lab slots (highest priority - will override everything)
    console.log(`   🧪 [LAB PROCESSING] Processing ${timetable.lab_slots?.length || 0} lab slots...`)
    timetable.lab_slots?.forEach((slot) => {
      if (slot.day === day) {
        const startIndex = getTimeSlotIndex(slot.start_time)
        const span = getTimeSpan(slot.start_time, slot.end_time)

        console.log(`      ✅ Lab: Session at ${slot.start_time}-${slot.end_time} (index ${startIndex}, span ${span})`)

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

    // LAST: Process breaks - only fill empty slots (lowest priority)
    // SMART MERGE: Combine default breaks with custom breaks
    console.log(`   ☕ [BREAK PROCESSING] Checking timetable.breaks...`)
    console.log(`      • timetable.breaks exists? ${!!timetable.breaks}`)
    console.log(`      • timetable.breaks length: ${timetable.breaks?.length || 0}`)
    console.log(`      • timetable.breaks content:`, timetable.breaks)

    // Default breaks for all days
    const defaultBreaks = [
      { day: 'Monday', start_time: '11:00', end_time: '11:30', label: 'Default', isDefault: true },
      { day: 'Monday', start_time: '13:30', end_time: '14:00', label: 'Default', isDefault: true },
      { day: 'Tuesday', start_time: '11:00', end_time: '11:30', label: 'Default', isDefault: true },
      { day: 'Tuesday', start_time: '13:30', end_time: '14:00', label: 'Default', isDefault: true },
      { day: 'Wednesday', start_time: '11:00', end_time: '11:30', label: 'Default', isDefault: true },
      { day: 'Wednesday', start_time: '13:30', end_time: '14:00', label: 'Default', isDefault: true },
      { day: 'Thursday', start_time: '11:00', end_time: '11:30', label: 'Default', isDefault: true },
      { day: 'Thursday', start_time: '13:30', end_time: '14:00', label: 'Default', isDefault: true },
      { day: 'Friday', start_time: '11:00', end_time: '11:30', label: 'Default', isDefault: true },
      { day: 'Friday', start_time: '13:30', end_time: '14:00', label: 'Default', isDefault: true }
    ]

    // Get custom breaks for this day from database (exclude removed markers)
    const customBreaksForDay = (timetable.breaks || []).filter(b => b.day === day && !b.isRemoved)
    
    // Get removed default breaks for this day
    const removedDefaultBreaks = (timetable.breaks || []).filter(b => 
      b.day === day && b.isDefault && b.isRemoved
    )
    
    // Get default breaks for this day (excluding any that were removed by user)
    const defaultBreaksForDay = defaultBreaks.filter(b => {
      const isRemovedByUser = removedDefaultBreaks.some(removed => 
        removed.start_time === b.start_time && removed.end_time === b.end_time
      )
      return b.day === day && !isRemovedByUser
    })
    
    console.log(`      • Custom breaks for ${day}: ${customBreaksForDay.length}`)
    console.log(`      • Default breaks for ${day}: ${defaultBreaksForDay.length}`)
    console.log(`      • Removed default breaks for ${day}: ${removedDefaultBreaks.length}`)
    
    // Merge logic: Custom breaks override defaults at same time slot
    const mergedBreaks = [...defaultBreaksForDay]
    
    customBreaksForDay.forEach(customBreak => {
      // Check if this custom break replaces a default break (same time)
      const replacesDefaultIndex = mergedBreaks.findIndex(
        defBreak => defBreak.start_time === customBreak.start_time && 
                    defBreak.end_time === customBreak.end_time
      )
      
      if (replacesDefaultIndex >= 0) {
        // Replace default with custom at same time
        mergedBreaks[replacesDefaultIndex] = customBreak
        console.log(`      🔄 Custom break replaces default at ${customBreak.start_time}`)
      } else {
        // Add as new custom break (different time)
        mergedBreaks.push(customBreak)
        console.log(`      ➕ Adding new custom break at ${customBreak.start_time}`)
      }
    })

    const breaks = mergedBreaks
    console.log(`   ☕ [BREAKS TO PROCESS] ${breaks.length} breaks for ${day}:`, breaks)

    breaks.forEach((breakSlot, idx) => {
      const startIndex = getTimeSlotIndex(breakSlot.start_time)
      const span = getTimeSpan(breakSlot.start_time, breakSlot.end_time)
      
      console.log(`\n      🔍 [BREAK ${idx + 1}] Checking break at ${breakSlot.start_time}-${breakSlot.end_time}`)
      console.log(`         • Start index: ${startIndex}`)
      console.log(`         • Span: ${span}`)
      console.log(`         • Label: ${breakSlot.label}`)
      
      // Only add break if ALL slots in the span are empty (not occupied by theory/labs)
      let canAddBreak = true
      for (let i = 0; i < span; i++) {
        const checkIndex = startIndex + i
        const cellState = cells[checkIndex]
        console.log(`         • Checking cell[${checkIndex}]: ${cellState === null ? 'EMPTY' : cellState.type}`)
        
        if (cells[checkIndex] !== null) {
          canAddBreak = false
          console.log(`         ❌ Cell[${checkIndex}] is occupied by ${cellState.type}! Cannot add break.`)
          break
        }
      }
      
      if (canAddBreak && startIndex >= 0) {
        console.log(`         ✅ All cells empty! Adding break...`)
        cells[startIndex] = {
          type: 'break',
          span: span,
          start_time: breakSlot.start_time,
          end_time: breakSlot.end_time,
          label: breakSlot.label || 'Break'
        }

        // Mark occupied cells
        for (let i = 1; i < span; i++) {
          cells[startIndex + i] = { type: 'occupied' }
        }
        console.log(`         ✅ Break added successfully!`)
      } else {
        console.log(`         ❌ Cannot add break (canAddBreak: ${canAddBreak}, startIndex: ${startIndex})`)
      }
    })

    console.log(`\n   📊 [FINAL GRID] Grid for ${day} complete. Summary:`)
    const summary = cells.reduce((acc, cell, idx) => {
      if (cell === null) acc.empty++
      else if (cell.type === 'theory') acc.theory++
      else if (cell.type === 'lab') acc.lab++
      else if (cell.type === 'break') acc.break++
      else if (cell.type === 'occupied') acc.occupied++
      return acc
    }, { empty: 0, theory: 0, lab: 0, break: 0, occupied: 0 })
    console.log(`      • Empty: ${summary.empty}`)
    console.log(`      • Theory: ${summary.theory}`)
    console.log(`      • Lab: ${summary.lab}`)
    console.log(`      • Break: ${summary.break}`)
    console.log(`      • Occupied: ${summary.occupied}`)
    console.log(`   ✅ [BUILD COMPLETE] Grid for ${day} ready!\n`)

    return cells
  }

  const renderCell = (cell, dayIndex, timeIndex) => {
    if (!cell) {
      return <td key={`${dayIndex}-${timeIndex}`} className="empty-cell"></td>
    }

    if (cell.type === 'occupied') {
      return null // Skip occupied cells (already spanned)
    }

    if (cell.type === 'break') {
      return (
        <td key={`${dayIndex}-${timeIndex}`} className="break-cell" colSpan={cell.span}>
          <div className="cell-content">
            <div className="break-icon">☕</div>
            <div className="break-label">BREAK</div>
            <div className="time-range">
              {convertTo12Hour(cell.start_time)} - {convertTo12Hour(cell.end_time)}
            </div>
          </div>
        </td>
      )
    }

    if (cell.type === 'theory') {
      const slot = cell.data
      // Determine subject type for color coding
      let subjectType = 'regular-ise'
      if (slot.is_fixed_slot) subjectType = 'fixed'
      else if (slot.teacher_name === '[Other Dept]') subjectType = 'other-dept'
      else if (slot.subject_name?.toLowerCase().includes('project')) subjectType = 'project'
      
      return (
        <td
          key={`${dayIndex}-${timeIndex}`}
          className={`theory-cell theory-${subjectType}`}
          colSpan={cell.span}
          title={`${slot.subject_name}\n${slot.teacher_name}\n${convertTo12Hour(slot.start_time)} - ${convertTo12Hour(slot.end_time)}${slot.classroom_name ? `\nRoom: ${slot.classroom_name}` : ''}`}
        >
          <div className="cell-content">
            <div className="subject-code">{slot.subject_shortform}</div>
            <div className="teacher-name">{slot.teacher_shortform}</div>
            <div className="time-range">
              {convertTo12Hour(slot.start_time)} - {convertTo12Hour(slot.end_time)}
            </div>
            {slot.is_fixed_slot && <div className="fixed-badge">FIXED</div>}
            {slot.is_project !== true && slot.classroom_name && (
              <div className={`classroom-badge ${slot.is_fixed_slot ? 'fixed-classroom' : 'regular-classroom'}`} title={`Classroom: ${slot.classroom_name}`}>
                📍 {slot.classroom_name}
              </div>
            )}
          </div>
        </td>
      )
    }

    if (cell.type === 'lab') {
      const slot = cell.data
      
      // Extract batch details for display (including teachers per batch)
      const batchDetails = slot.batches?.map(b => ({
        name: b.batch_name,
        lab: b.lab_shortform || b.lab_name,
        room: b.lab_room_name || 'TBD',
        teacher1: b.teacher1_shortform || b.teacher1_name,
        teacher2: b.teacher2_shortform || b.teacher2_name
      })) || []
      
      return (
        <td
          key={`${dayIndex}-${timeIndex}`}
          className="lab-cell"
          colSpan={cell.span}
          title={`Lab Session\n${batchDetails.map(b => `${b.name}: ${b.lab} in ${b.room}\nTeachers: ${b.teacher1 || 'TBD'}${b.teacher2 ? ', ' + b.teacher2 : ''}`).join('\n')}\n${convertTo12Hour(slot.start_time)} - ${convertTo12Hour(slot.end_time)}`}
        >
          <div className="lab-content-horizontal">
            {batchDetails.map((b, idx) => (
              <div key={idx} className="batch-compact">
                <div className="batch-name-compact">{b.name}</div>
                <div className="batch-lab-compact">{b.lab}</div>
                <div className="batch-room-compact">{b.room}</div>
                {b.teacher1 && <div className="batch-teacher-compact">{b.teacher1}</div>}
                {b.teacher2 && <div className="batch-teacher-compact">{b.teacher2}</div>}
              </div>
            ))}
          </div>
        </td>
      )
    }

    return null
  }

  return (
    <div className="timetable-viewer">
      <DepartmentHeader 
        title="Timetable Viewer" 
        subtitle="View generated timetables in grid format with 30-minute intervals"
      />
      
      

      <div className="viewer-controls">
        <div className="controls-left">
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
                  Semester {section.sem} - {section.section_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {timetable && timetable.generation_metadata?.theory_scheduling_summary && (
          <div className="summary-inline">
            <div className="summary-stats-inline">
              <div className="stat-compact">
                <span className="stat-value">{timetable.generation_metadata.theory_scheduling_summary.total_subjects_found}</span>
                <span className="stat-label">Subjects</span>
              </div>
              <div className="stat-compact success">
                <span className="stat-value">{timetable.generation_metadata.theory_scheduling_summary.success_rate}%</span>
                <span className="stat-label">Success</span>
              </div>
              <div className="stat-compact">
                <span className="stat-value">{timetable.generation_metadata.theory_scheduling_summary.total_scheduled}/{timetable.generation_metadata.theory_scheduling_summary.total_subjects_found}</span>
                <span className="stat-label">Scheduled</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && <div className="loading">Loading timetable...</div>}
      {error && <div className="error-message">{error}</div>}

      {timetable && (
        <div className="timetable-container">
          <div className="timetable-info">
            <h3>
              Section {timetable.section_name}
            </h3>
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

          {/* Teacher Conflicts Warning */}
          {(() => {
            const conflicts = detectTeacherConflicts(timetable.theory_slots)
            return conflicts.length > 0 && (
              <div className="teacher-conflicts-warning">
                <div className="warning-header">
                  <span className="warning-icon">❌</span>
                  <h4>Teacher Conflicts Detected!</h4>
                </div>
                <div className="warning-content">
                  <p>
                    <strong>{conflicts.length} teacher conflict(s)</strong> found where a teacher is assigned to multiple classes at the same time.
                  </p>
                  <div className="conflicts-list">
                    {conflicts.map((conflict, idx) => (
                      <div key={idx} className="conflict-item">
                        <span className="conflict-teacher">👨‍🏫 {conflict.teacher}</span>
                        <span className="conflict-time">📅 {conflict.day} at {conflict.time}</span>
                        <span className="conflict-subjects">📚 {conflict.subjects.join(' + ')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="warning-action">
                    <p>
                      <strong>Action Required:</strong> This should not happen! Please report this bug to the developer.
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}

          <div className="grid-wrapper">
            <table className="timetable-grid">
              <thead>
                <tr>
                  <th className="day-header">D/T</th>
                  {timeSlots.map((time, idx) => {
                    const [startTime, endTime] = time.split(' - ')
                    return (
                      <th key={idx} className="time-header">
                        <div className="time-start">{startTime}</div>
                        <div className="time-to">to</div>
                        <div className="time-end">{endTime}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {weekDays.map((day, dayIndex) => {
                  const dayCells = buildDayGrid(day)
                  return (
                    <tr key={dayIndex}>
                      <td className="day-label">{weekDaysShort[dayIndex]}</td>
                      {dayCells.map((cell, timeIndex) => renderCell(cell, dayIndex, timeIndex))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && !timetable && selectedSection && (
        <div className="no-data">No timetable data available for this section.</div>
      )}
    </div>
  )
}

export default TimetableViewer
