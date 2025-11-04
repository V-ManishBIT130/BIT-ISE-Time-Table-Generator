import { useState, useEffect } from 'react'
import axios from 'axios'
import './LabAssignments.css'

/**
 * Lab Room Assignments Viewer (Phase 2 - AUTOMATIC)
 * 
 * Purpose: VIEW auto-generated lab room assignments
 * Database Model: Lab_Room_Assignments (lab_room_assignment_model.js)
 * 
 * Schema:
 *  - lab_id: Reference to Syllabus_Labs
 *  - sem: Semester number (3-8)
 *  - sem_type: 'odd' or 'even'
 *  - section: Section name ('A', 'B', 'C')
 *  - batch_number: Batch number (1, 2, 3)
 *  - assigned_lab_room: Reference to Dept_Labs (AUTOMATIC)
 *  - assignment_metadata: { compatible_rooms_count, room_usage_rank, assigned_at }
 * 
 * Teachers NOT assigned here (Phase 3)
 * Time slots NOT assigned here (Phase 3)
 * 
 * This component:
 * 1. Displays current automatic lab room assignments
 * 2. Allows regenerating assignments with one click
 * 3. Shows room distribution statistics
 */

function LabAssignments() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [allAssignments, setAllAssignments] = useState([])
  const [generating, setGenerating] = useState(false)
  const [selectedSemType, setSelectedSemType] = useState('odd') // odd or even

  // Fetch all assignments on mount and when sem type changes
  useEffect(() => {
    fetchAllAssignments()
  }, [selectedSemType])

  const fetchAllAssignments = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/lab-room-assignments', {
        params: { sem_type: selectedSemType }
      })
      setAllAssignments(response.data.data || [])
      setError(null)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching lab room assignments:', err)
      setError('Failed to load lab room assignments')
      setLoading(false)
    }
  }

  const handleGenerateLabRoomAssignments = async () => {
    if (!confirm(
      `⚠️ AUTOMATIC LAB ROOM ASSIGNMENT\n\n` +
      `This will automatically assign lab rooms for ALL ${selectedSemType.toUpperCase()} semester sections.\n\n` +
      `✓ Equipment-compatible rooms guaranteed\n` +
      `✓ Even distribution across available rooms\n` +
      `✓ Conflict-minimized for Phase 3 scheduling\n` +
      `✓ Old ${selectedSemType} assignments will be replaced\n\n` +
      `Teachers will be assigned in Phase 3 (not here)\n\n` +
      `Continue with automatic assignment?`
    )) {
      return
    }

    setGenerating(true)
    setError(null)

    try {
      console.log(`🤖 Starting automatic lab room assignment for ${selectedSemType} semester...`)
      
      const response = await axios.post('/api/lab-room-assignments/auto-assign', {
        sem_type: selectedSemType
        //academic_year: '2024-2025' // You can make this dynamic later
      })
      
      const { data } = response.data
      
      // Show detailed success message
      let message = `✅ AUTOMATIC ASSIGNMENT COMPLETE!\n\n`
      message += `Semester Type: ${selectedSemType.toUpperCase()}\n\n`
      message += `📊 Statistics:\n`
      message += `• Total Assignments: ${data.totalAssignments}\n`
      message += `• Sections Processed: ${data.sectionsProcessed}\n`
      message += `• Labs Processed: ${data.labsProcessed}\n`
      message += `• Deleted Old Assignments: ${data.deletedOldAssignments}\n\n`
      
      if (data.roomDistribution && Object.keys(data.roomDistribution).length > 0) {
        message += `🏢 Room Distribution:\n`
        Object.entries(data.roomDistribution)
          .sort((a, b) => b[1] - a[1])
          .forEach(([room, count]) => {
            message += `• ${room}: ${count} assignments\n`
          })
      }
      
      alert(message)
      
      // Refresh assignments to show new data
      await fetchAllAssignments()
      
    } catch (err) {
      console.error('Error generating lab room assignments:', err)
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to generate lab room assignments'
      setError(errorMsg)
      alert(`❌ Error!\n\n${errorMsg}`)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading lab assignments...</div>
  }

  // Group assignments by semester and section
  const groupedBySemSection = {}
  allAssignments.forEach(assignment => {
    const key = `${assignment.sem}-${assignment.section}`
    if (!groupedBySemSection[key]) {
      groupedBySemSection[key] = {
        sem: assignment.sem,
        section: assignment.section,
        assignments: []
      }
    }
    groupedBySemSection[key].assignments.push(assignment)
  })

  // Sort sections
  const sortedSections = Object.values(groupedBySemSection).sort((a, b) => {
    if (a.sem !== b.sem) return a.sem - b.sem
    return a.section.localeCompare(b.section)
  })

  // Get all unique labs for a section (sorted)
  const getLabsForSection = (assignments) => {
    const labsSet = new Set()
    assignments.forEach(a => labsSet.add(a.lab_id.lab_shortform))
    return Array.from(labsSet).sort()
  }

  // Get batches for a section
  const getBatchNumbers = (assignments) => {
    const batches = new Set()
    assignments.forEach(a => batches.add(a.batch_number))
    return Array.from(batches).sort((a, b) => a - b)
  }

  // Find assignment for specific lab and batch
  const findAssignment = (assignments, labShortform, batchNum) => {
    return assignments.find(a => 
      a.lab_id.lab_shortform === labShortform && a.batch_number === batchNum
    )
  }

  return (
    <div className="lab-assignments-page">
      <div className="header">
        <div className="header-content">
          <div>
            <h1>🤖 Automatic Lab Room Assignments</h1>
            <p className="subtitle">Phase 2: Equipment-compatible rooms assigned automatically</p>
            <p className="info-text">
              ℹ️ Rooms assigned based on equipment compatibility + even distribution. 
              Teachers will be assigned in Phase 3.
            </p>
          </div>
          <div className="header-actions">
            {/* Semester Type Selector */}
            <div className="sem-type-selector">
              <button 
                className={`sem-type-btn ${selectedSemType === 'odd' ? 'active' : ''}`}
                onClick={() => setSelectedSemType('odd')}
              >
                Odd Semester
              </button>
              <button 
                className={`sem-type-btn ${selectedSemType === 'even' ? 'active' : ''}`}
                onClick={() => setSelectedSemType('even')}
              >
                Even Semester
              </button>
            </div>
            
            <button 
              className="btn-generate"
              onClick={handleGenerateLabRoomAssignments}
              disabled={generating || loading}
            >
              {generating ? (
                <>
                  <span className="spinner"></span>
                  Assigning Rooms...
                </>
              ) : (
                <>
                  <span className="icon">🤖</span>
                  Auto-Assign Rooms ({selectedSemType})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {allAssignments.length === 0 ? (
        <div className="no-data">
          <h3>No lab room assignments found for {selectedSemType} semester</h3>
          <p>Click "Auto-Assign Rooms" to automatically generate assignments based on equipment compatibility</p>
        </div>
      ) : (
        <div className="sections-grid">
          <div className="stats-card">
            <h3>📊 Assignment Statistics</h3>
            <p><strong>Semester Type:</strong> {selectedSemType.toUpperCase()}</p>
            <p><strong>Total Assignments:</strong> {allAssignments.length}</p>
            <p><strong>Note:</strong> Teachers will be assigned dynamically in Phase 3</p>
          </div>
          
          {sortedSections.map(({ sem, section, assignments }) => {
            const labs = getLabsForSection(assignments)
            const batches = getBatchNumbers(assignments)
            
            return (
              <div key={`${sem}-${section}`} className="section-card">
                <h2>Semester {sem} - Section {section}</h2>
                <p className="section-info">{assignments.length} lab room assignments</p>
                
                {batches.map(batchNum => (
                  <div key={batchNum} className="batch-table">
                    <h3>Batch {sem}{section}{batchNum}</h3>
                    <table className="assignment-table">
                      <thead>
                        <tr>
                          <th>Lab</th>
                          <th>Assigned Room</th>
                          <th>Compatible Rooms</th>
                          <th>Usage Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labs.map(labName => {
                          const assignment = findAssignment(assignments, labName, batchNum)
                          return (
                            <tr key={`${batchNum}-${labName}`}>
                              <td><strong>{labName}</strong></td>
                              <td>
                                {assignment?.assigned_lab_room?.labRoom_no || 'N/A'}
                              </td>
                              <td>
                                {assignment?.assignment_metadata?.compatible_rooms_count || 'N/A'}
                              </td>
                              <td>
                                {assignment?.assignment_metadata?.room_usage_rank !== undefined 
                                  ? assignment.assignment_metadata.room_usage_rank 
                                  : 'N/A'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LabAssignments
