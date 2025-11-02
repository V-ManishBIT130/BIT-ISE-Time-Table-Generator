import { useState, useEffect } from 'react'
import axios from 'axios'
import './LabAssignments.css'

/**
 * Lab Assignments Viewer (Phase 2)
 * 
 * Purpose: VIEW auto-generated lab assignments (created by Phase2AutoAssigner.js)
 * 
 * Database Model: Teacher_Lab_Assignments
 * Schema:
 *  - lab_id: Reference to Syllabus_Labs
 *  - sem: Semester number (3, 5, 7)
 *  - sem_type: 'odd' or 'even'
 *  - section: Section name ('A', 'B', 'C')
 *  - batch_number: Batch number (1, 2, 3)
 *  - teacher_ids: Array of 2 teacher ObjectIds (always exactly 2)
 *  - assigned_lab_room: Reference to Dept_Labs
 *  - scheduled_day: Day of week (filled during timetable generation)
 *  - scheduled_start_time: Start time (filled during timetable generation)
 *  - scheduled_end_time: End time (filled during timetable generation)
 * 
 * This component only DISPLAYS assignments. 
 * To regenerate, run: node backend_server/algorithms/generate-phase2-assignments.js
 */

function LabAssignments() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [allAssignments, setAllAssignments] = useState([])
  const [generating, setGenerating] = useState(false)

  // Fetch all assignments on mount
  useEffect(() => {
    fetchAllAssignments()
  }, [])

  const fetchAllAssignments = async () => {
    try {
      setLoading(true)
      const response = await axios.get('http://localhost:5000/api/lab-assignments')
      setAllAssignments(response.data.data || [])
      setError(null)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching assignments:', err)
      setError('Failed to load assignments')
      setLoading(false)
    }
  }

  const handleGenerateLabAssignments = async () => {
    if (!confirm('⚠️ This will regenerate ALL lab assignments with fresh data from the database.\n\n✓ Old assignments will be replaced\n✓ Uses latest teacher data\n✓ Generates conflict-free assignments\n✓ All 9 sections (3A-3C, 5A-5C, 7A-7C)\n\nContinue?')) {
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const response = await axios.post('http://localhost:5000/api/timetables/generate-lab-assignments')
      
      // Show success message
      alert(`✅ Success!\n\n${response.data.message}\n\nTotal Assignments Created: ${response.data.totalAssignments}\n\nDetails:\n${response.data.results.map(r => `• Semester ${r.semester} (${r.semesterType}): ${r.assignments} assignments`).join('\n')}`)
      
      // Refresh assignments to show new data
      await fetchAllAssignments()
      
    } catch (err) {
      console.error('Error generating lab assignments:', err)
      const errorMsg = err.response?.data?.message || 'Failed to generate lab assignments'
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
            <h1>Lab Assignments ({allAssignments.length} total)</h1>
            <p className="subtitle">Phase 2: Auto-generated conflict-free lab assignments</p>
          </div>
          <button 
            className="btn-generate"
            onClick={handleGenerateLabAssignments}
            disabled={generating}
          >
            {generating ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              <>
                <span className="icon">🔄</span>
                Generate Lab Assignments
              </>
            )}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {allAssignments.length === 0 ? (
        <div className="no-data">No assignments found</div>
      ) : (
        <div className="sections-grid">
          {sortedSections.map(({ sem, section, assignments }) => {
            const labs = getLabsForSection(assignments)
            const batches = getBatchNumbers(assignments)
            
            return (
              <div key={`${sem}-${section}`} className="section-card">
                <h2>{sem === 3 ? '3rd' : sem === 5 ? '5th' : '7th'} Sem {section} Section</h2>
                
                {batches.map(batchNum => (
                  <div key={batchNum} className="batch-table">
                    <h3>{sem}{section}{batchNum} labs</h3>
                    <table className="assignment-table">
                      <thead>
                        <tr>
                          <th>Lab Name</th>
                          <th>Teacher 1</th>
                          <th>Teacher 2</th>
                          <th>Lab No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labs.map(labName => {
                          const assignment = findAssignment(assignments, labName, batchNum)
                          return (
                            <tr key={`${batchNum}-${labName}`}>
                              <td>{labName}</td>
                              <td>
                                {assignment?.teacher_ids[0]?.teacher_shortform || ''}
                              </td>
                              <td>
                                {assignment?.teacher_ids[1]?.teacher_shortform || ''}
                              </td>
                              <td>
                                {assignment?.assigned_lab_room?.labRoom_no || ''}
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
