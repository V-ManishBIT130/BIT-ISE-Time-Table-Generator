import { useState, useEffect } from 'react'
import axios from 'axios'
import './TimetableViewer.css'

/**
 * Timetable Viewer Component
 * 
 * Purpose: Display weekly timetables for all sections
 * Features:
 * - Section selector dropdown
 * - Weekly grid view (Monday-Friday)
 * - Shows theory classes + lab sessions
 * - Color-coded by subject type
 * - Teacher and room information
 * - Print-friendly layout
 */
function TimetableViewer() {
  const [sections, setSections] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  const [timetable, setTimetable] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)

  // Time slots for the week
  const timeSlots = [
    { start: '08:00', end: '09:00', label: '8:00 AM' },
    { start: '09:00', end: '10:00', label: '9:00 AM' },
    { start: '10:00', end: '11:00', label: '10:00 AM' },
    { start: '11:00', end: '12:00', label: '11:00 AM' },
    { start: '12:00', end: '13:00', label: '12:00 PM' },
    { start: '13:00', end: '14:00', label: '1:00 PM' },
    { start: '14:00', end: '15:00', label: '2:00 PM' },
    { start: '15:00', end: '16:00', label: '3:00 PM' },
    { start: '16:00', end: '17:00', label: '4:00 PM' }
  ]

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  useEffect(() => {
    fetchSections()
  }, [])

  useEffect(() => {
    if (selectedSection) {
      fetchTimetable(selectedSection._id)
    }
  }, [selectedSection])

  const fetchSections = async () => {
    try {
      setLoading(true)
      const response = await axios.get('http://localhost:5000/api/timetables/sections')
      setSections(response.data.sections || [])
      if (response.data.sections.length > 0) {
        setSelectedSection(response.data.sections[0])
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching sections:', err)
      setError('Failed to load sections')
      setLoading(false)
    }
  }

  const fetchTimetable = async (sectionId) => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`http://localhost:5000/api/timetables/view/${sectionId}`)
      setTimetable(response.data.timetable)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching timetable:', err)
      if (err.response?.status === 404) {
        setError('No timetable generated for this section yet')
      } else {
        setError('Failed to load timetable')
      }
      setTimetable(null)
      setLoading(false)
    }
  }

  const handleGenerateTimetable = async () => {
    if (!selectedSection) return
    
    if (!confirm(`Generate timetable for ${selectedSection.section_name} (Sem ${selectedSection.sem})?\n\nThis will create a new optimized timetable.`)) {
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const response = await axios.post('http://localhost:5000/api/timetables/generate-section', {
        sectionId: selectedSection._id
      })

      if (response.data.success) {
        alert(`✅ Success!\n\n${response.data.message}`)
        await fetchTimetable(selectedSection._id)
      } else {
        throw new Error(response.data.message || 'Generation failed')
      }
    } catch (err) {
      console.error('Error generating timetable:', err)
      const errorMsg = err.response?.data?.message || err.message || 'Failed to generate timetable'
      setError(errorMsg)
      alert(`❌ Error!\n\n${errorMsg}`)
    } finally {
      setGenerating(false)
    }
  }

  const getSlotContent = (day, timeSlot) => {
    if (!timetable) return null

    const slots = []

    // Check theory slots
    if (timetable.theory_slots) {
      timetable.theory_slots.forEach(slot => {
        if (slot.day === day && slot.start_time === timeSlot.start) {
          slots.push({
            type: 'theory',
            ...slot
          })
        }
      })
    }

    // Check lab slots
    if (timetable.lab_slots) {
      timetable.lab_slots.forEach(slot => {
        if (slot.day === day && slot.start_time === timeSlot.start) {
          slots.push({
            type: 'lab',
            ...slot
          })
        }
      })
    }

    return slots
  }

  const renderSlotContent = (slots) => {
    if (!slots || slots.length === 0) {
      return <div className="empty-slot">-</div>
    }

    return slots.map((slot, index) => {
      if (slot.type === 'theory') {
        return (
          <div key={index} className="slot-content theory-slot">
            <div className="slot-header">
              <span className="subject-code">{slot.subject_shortform}</span>
              <span className="slot-type">Theory</span>
            </div>
            <div className="slot-body">
              <div className="slot-info">
                <span className="info-label">👨‍🏫</span>
                <span className="info-value">{slot.teacher_shortform}</span>
              </div>
              <div className="slot-info">
                <span className="info-label">🏫</span>
                <span className="info-value">{slot.classroom_name}</span>
              </div>
            </div>
            <div className="slot-time">
              {slot.start_time} - {slot.end_time}
            </div>
          </div>
        )
      } else if (slot.type === 'lab') {
        return (
          <div key={index} className="slot-content lab-slot">
            <div className="slot-header">
              <span className="subject-code">{slot.lab_shortform}</span>
              <span className="slot-type">Lab</span>
            </div>
            <div className="slot-body">
              {slot.batch_activities && slot.batch_activities.map((activity, idx) => (
                <div key={idx} className="batch-activity">
                  <div className="batch-header">
                    <strong>{activity.batch_name}</strong>
                  </div>
                  <div className="slot-info">
                    <span className="info-label">🔬</span>
                    <span className="info-value">{activity.lab_shortform}</span>
                  </div>
                  <div className="slot-info">
                    <span className="info-label">👨‍🏫</span>
                    <span className="info-value">
                      {activity.teacher1_shortform} + {activity.teacher2_shortform}
                    </span>
                  </div>
                  <div className="slot-info">
                    <span className="info-label">🏫</span>
                    <span className="info-value">{activity.lab_room_name}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="slot-time">
              {slot.start_time} - {slot.end_time}
            </div>
          </div>
        )
      }
    })
  }

  if (loading && sections.length === 0) {
    return <div className="loading">Loading sections...</div>
  }

  return (
    <div className="timetable-viewer">
      <div className="viewer-header">
        <div className="header-content">
          <div>
            <h1>📅 Timetable Viewer</h1>
            <p className="subtitle">View weekly timetables for all sections</p>
          </div>
          
          <div className="header-controls">
            <div className="section-selector">
              <label>Select Section:</label>
              <select 
                value={selectedSection?._id || ''} 
                onChange={(e) => {
                  const section = sections.find(s => s._id === e.target.value)
                  setSelectedSection(section)
                }}
                disabled={generating}
              >
                {sections.map(section => (
                  <option key={section._id} value={section._id}>
                    Semester {section.sem} - Section {section.section_name}
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              className="btn-generate"
              onClick={handleGenerateTimetable}
              disabled={generating || !selectedSection}
            >
              {generating ? (
                <>
                  <span className="spinner"></span>
                  Generating...
                </>
              ) : (
                <>
                  <span className="icon">⚡</span>
                  Generate Timetable
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning">
          {error}
          {error.includes('No timetable') && (
            <div style={{ marginTop: '10px' }}>
              <button 
                className="btn-generate-inline"
                onClick={handleGenerateTimetable}
                disabled={generating}
              >
                Click here to generate
              </button>
            </div>
          )}
        </div>
      )}

      {selectedSection && (
        <div className="section-info">
          <h2>
            Semester {selectedSection.sem} - Section {selectedSection.section_name}
            {selectedSection.split_batches > 1 && ` (${selectedSection.split_batches} batches)`}
          </h2>
          {selectedSection.batch_names && (
            <p className="batch-names">
              Batches: {selectedSection.batch_names.join(', ')}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading timetable...</div>
      ) : timetable ? (
        <div className="timetable-container">
          <table className="timetable-grid">
            <thead>
              <tr>
                <th className="time-column">Time</th>
                {days.map(day => (
                  <th key={day} className="day-column">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((timeSlot, index) => (
                <tr key={index} className="time-row">
                  <td className="time-cell">
                    <div className="time-label">{timeSlot.label}</div>
                    <div className="time-range">{timeSlot.start}-{timeSlot.end}</div>
                  </td>
                  {days.map(day => {
                    const slots = getSlotContent(day, timeSlot)
                    return (
                      <td key={day} className="timetable-cell">
                        {renderSlotContent(slots)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !error ? (
        <div className="no-data">
          <p>📋 No timetable available for this section</p>
          <button 
            className="btn-generate"
            onClick={handleGenerateTimetable}
            disabled={generating}
          >
            Generate Timetable
          </button>
        </div>
      ) : null}

      {timetable && (
        <div className="timetable-legend">
          <h3>Legend</h3>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-color theory-color"></span>
              <span>Theory Classes</span>
            </div>
            <div className="legend-item">
              <span className="legend-color lab-color"></span>
              <span>Lab Sessions (All batches run simultaneously)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimetableViewer
