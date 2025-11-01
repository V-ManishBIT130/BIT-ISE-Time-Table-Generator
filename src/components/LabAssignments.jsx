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

  // Fetch all assignments on mount
  useEffect(() => {
    fetchAllAssignments()
  }, [])

  const fetchAllAssignments = async () => {
    try {
      setLoading(true)
      const response = await axios.get('http://localhost:5000/api/lab-assignments')
      setAllAssignments(response.data.data || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching assignments:', err)
      setError('Failed to load assignments')
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading lab assignments...</div>
  }

  return (
    <div className="lab-assignments-page">
      <div className="header">
        <h1>Lab Assignments ({allAssignments.length} total)</h1>
      </div>

      {error && <div className="alert">{error}</div>}

      {allAssignments.length === 0 ? (
        <div className="no-data">No assignments found</div>
      ) : (
        <div className="table-container">
          <table className="excel-table">
            <thead>
              <tr>
                <th>Semester</th>
                <th>Section</th>
                <th>Batch</th>
                <th>Lab</th>
                <th>Lab Code</th>
                <th>Teacher 1</th>
                <th>Teacher 2</th>
                <th>Lab Room</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allAssignments
                .sort((a, b) => {
                  if (a.sem !== b.sem) return a.sem - b.sem
                  if (a.section !== b.section) return a.section.localeCompare(b.section)
                  if (a.batch_number !== b.batch_number) return a.batch_number - b.batch_number
                  return a.lab_id.lab_shortform.localeCompare(b.lab_id.lab_shortform)
                })
                .map((assignment) => (
                  <tr key={assignment._id}>
                    <td>{assignment.sem}</td>
                    <td>{assignment.section}</td>
                    <td>{assignment.batch_number}</td>
                    <td>{assignment.lab_id.lab_shortform}</td>
                    <td>{assignment.lab_id.lab_code}</td>
                    <td>
                      {assignment.teacher_ids[0]?.name || 'N/A'}
                      {assignment.teacher_ids[0]?.teacher_shortform && 
                        ` (${assignment.teacher_ids[0].teacher_shortform})`
                      }
                    </td>
                    <td>
                      {assignment.teacher_ids[1]?.name || 'N/A'}
                      {assignment.teacher_ids[1]?.teacher_shortform && 
                        ` (${assignment.teacher_ids[1].teacher_shortform})`
                      }
                    </td>
                    <td>{assignment.assigned_lab_room?.labRoom_no || 'N/A'}</td>
                    <td>
                      {assignment.scheduled_day ? `Scheduled (${assignment.scheduled_day})` : 'Pending'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default LabAssignments
