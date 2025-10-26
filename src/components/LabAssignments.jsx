import { useState, useEffect } from 'react'
import axios from 'axios'
import './LabAssignments.css'

/**
 * Lab Assignments Component (Phase 2)
 * 
 * Purpose: Assign teachers to lab batches BEFORE scheduling
 * - Select section and lab
 * - Assign exactly 2 teachers per batch
 * - No time slots yet (Phase 3)
 * 
 * Constraint: Must assign teachers to ALL batches of a section for a lab
 */

function LabAssignments() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Master data
  const [sections, setSections] = useState([])
  const [labs, setLabs] = useState([])
  const [teachers, setTeachers] = useState([])
  const [deptLabs, setDeptLabs] = useState([])
  
  // Form state
  const [selectedSection, setSelectedSection] = useState(null)
  const [selectedLab, setSelectedLab] = useState(null)
  const [batchAssignments, setBatchAssignments] = useState([])
  
  // Existing assignments
  const [existingAssignments, setExistingAssignments] = useState([])
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Fetch master data
  useEffect(() => {
    fetchMasterData()
  }, [])

  const fetchMasterData = async () => {
    try {
      setLoading(true)
      
      const [sectionsRes, labsRes, teachersRes, deptLabsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/sections'),
        axios.get('http://localhost:5000/api/labs'),
        axios.get('http://localhost:5000/api/teachers'),
        axios.get('http://localhost:5000/api/dept-labs')
      ])

      setSections(sectionsRes.data.data || [])
      setLabs(labsRes.data.data || [])
      setTeachers(teachersRes.data.data || [])
      setDeptLabs(deptLabsRes.data.data || [])
      
      setLoading(false)
    } catch (err) {
      console.error('Error fetching master data:', err)
      setError('Failed to load data')
      setLoading(false)
    }
  }

  // Fetch existing assignments when section changes
  useEffect(() => {
    if (selectedSection) {
      fetchExistingAssignments()
    }
  }, [selectedSection])

  const fetchExistingAssignments = async () => {
    if (!selectedSection) return

    try {
      const response = await axios.get('http://localhost:5000/api/lab-assignments', {
        params: {
          sem: selectedSection.sem,
          sem_type: selectedSection.sem_type,
          section: selectedSection.section_name
        }
      })
      
      setExistingAssignments(response.data.data || [])
    } catch (err) {
      console.error('Error fetching existing assignments:', err)
    }
  }

  // Initialize batch assignments when lab is selected
  const handleLabSelect = (lab) => {
    setSelectedLab(lab)
    
    if (!selectedSection) {
      alert('Please select a section first')
      return
    }

    // Check if assignment already exists
    const existing = existingAssignments.filter(
      a => a.lab_id._id === lab._id
    )

    if (existing.length > 0) {
      // Load existing assignments
      const assignments = selectedSection.batch_names.map(batchName => {
        const batchNumber = parseInt(batchName.slice(-1))
        const existingBatch = existing.find(e => e.batch_number === batchNumber)
        
        return {
          batch_name: batchName,
          batch_number: batchNumber,
          teacher1: existingBatch?.teacher_ids[0]?._id || '',
          teacher2: existingBatch?.teacher_ids[1]?._id || '',
          lab_room: existingBatch?.assigned_lab_room?._id || '',
          _id: existingBatch?._id
        }
      })
      
      setBatchAssignments(assignments)
      setIsEditMode(true)
    } else {
      // Initialize empty assignments
      const assignments = selectedSection.batch_names.map(batchName => ({
        batch_name: batchName,
        batch_number: parseInt(batchName.slice(-1)),
        teacher1: '',
        teacher2: '',
        lab_room: ''
      }))
      
      setBatchAssignments(assignments)
      setIsEditMode(false)
    }
    
    setShowModal(true)
  }

  // Update batch assignment
  const updateBatchAssignment = (batchIndex, field, value) => {
    const updated = [...batchAssignments]
    updated[batchIndex][field] = value
    setBatchAssignments(updated)
  }

  // Get eligible teachers for a lab
  const getEligibleTeachers = (labId) => {
    return teachers.filter(teacher => 
      teacher.labs_handled.some(lab => lab._id === labId)
    )
  }

  // Get eligible lab rooms for a lab
  const getEligibleLabRooms = (labId) => {
    return deptLabs.filter(deptLab => 
      deptLab.lab_subjects_handled.some(lab => lab._id === labId)
    )
  }

  // Validate assignments
  const validateAssignments = () => {
    for (let i = 0; i < batchAssignments.length; i++) {
      const assignment = batchAssignments[i]
      
      if (!assignment.teacher1 || !assignment.teacher2) {
        alert(`Batch ${assignment.batch_name}: Please select 2 teachers`)
        return false
      }
      
      if (assignment.teacher1 === assignment.teacher2) {
        alert(`Batch ${assignment.batch_name}: Cannot assign same teacher twice`)
        return false
      }
      
      if (!assignment.lab_room) {
        alert(`Batch ${assignment.batch_name}: Please select a lab room`)
        return false
      }
    }
    
    return true
  }

  // Save assignments
  const handleSaveAssignments = async () => {
    if (!validateAssignments()) return

    try {
      setLoading(true)

      // Save each batch assignment
      for (const assignment of batchAssignments) {
        const payload = {
          lab_id: selectedLab._id,
          sem: selectedSection.sem,
          sem_type: selectedSection.sem_type,
          section: selectedSection.section_name,
          batch_number: assignment.batch_number,
          teacher_ids: [assignment.teacher1, assignment.teacher2],
          assigned_lab_room: assignment.lab_room
        }

        if (isEditMode && assignment._id) {
          // Update existing
          await axios.put(`http://localhost:5000/api/lab-assignments/${assignment._id}`, payload)
        } else {
          // Create new
          await axios.post('http://localhost:5000/api/lab-assignments', payload)
        }
      }

      alert(`Lab assignments ${isEditMode ? 'updated' : 'saved'} successfully!`)
      setShowModal(false)
      fetchExistingAssignments()
      
    } catch (err) {
      console.error('Error saving assignments:', err)
      alert(err.response?.data?.message || 'Failed to save assignments')
    } finally {
      setLoading(false)
    }
  }

  // Delete assignment
  const handleDeleteAssignment = async (labId) => {
    if (!confirm('Delete all assignments for this lab?')) return

    try {
      const toDelete = existingAssignments.filter(a => a.lab_id._id === labId)
      
      for (const assignment of toDelete) {
        await axios.delete(`http://localhost:5000/api/lab-assignments/${assignment._id}`)
      }
      
      alert('Lab assignments deleted successfully')
      fetchExistingAssignments()
      
    } catch (err) {
      console.error('Error deleting assignments:', err)
      alert('Failed to delete assignments')
    }
  }

  // Group existing assignments by lab
  const groupedAssignments = existingAssignments.reduce((acc, assignment) => {
    const labId = assignment.lab_id._id
    if (!acc[labId]) {
      acc[labId] = {
        lab: assignment.lab_id,
        batches: []
      }
    }
    acc[labId].batches.push(assignment)
    return acc
  }, {})

  if (loading && sections.length === 0) {
    return <div className="loading">Loading lab assignments...</div>
  }

  return (
    <div className="lab-assignments-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>📚 Lab Assignments (Phase 2)</h1>
          <p>Assign teachers to lab batches before scheduling</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Section Selector */}
      <div className="selector-card">
        <h3>Step 1: Select Section</h3>
        <div className="section-grid">
          {sections.map(section => (
            <button
              key={section._id}
              className={`section-btn ${selectedSection?._id === section._id ? 'selected' : ''}`}
              onClick={() => setSelectedSection(section)}
            >
              <div className="section-badge">
                Semester {section.sem} - Section {section.section_name}
              </div>
              <div className="section-info">
                {section.total_students} students | {section.num_batches} batches
              </div>
              <div className="batch-names">
                {section.batch_names.join(', ')}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lab Selector */}
      {selectedSection && (
        <div className="selector-card">
          <h3>Step 2: Select Lab to Assign</h3>
          <div className="labs-grid">
            {labs
              .filter(lab => 
                lab.lab_sem === selectedSection.sem && 
                lab.lab_sem_type === selectedSection.sem_type
              )
              .map(lab => {
                const isAssigned = existingAssignments.some(a => a.lab_id._id === lab._id)
                
                return (
                  <button
                    key={lab._id}
                    className={`lab-btn ${isAssigned ? 'assigned' : ''}`}
                    onClick={() => handleLabSelect(lab)}
                  >
                    <div className="lab-shortform">{lab.lab_shortform}</div>
                    <div className="lab-name">{lab.lab_name}</div>
                    <div className="lab-code">{lab.lab_code}</div>
                    {isAssigned && <span className="assigned-badge">✓ Assigned</span>}
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* Existing Assignments Display */}
      {selectedSection && Object.keys(groupedAssignments).length > 0 && (
        <div className="assignments-display">
          <h3>Existing Assignments for Section {selectedSection.sem}{selectedSection.section_name}</h3>
          
          {Object.values(groupedAssignments).map(group => (
            <div key={group.lab._id} className="assignment-card">
              <div className="assignment-header">
                <div>
                  <h4>{group.lab.lab_shortform} - {group.lab.lab_name}</h4>
                  <span className="lab-code-small">{group.lab.lab_code}</span>
                </div>
                <div className="action-buttons">
                  <button 
                    className="btn-icon btn-edit"
                    onClick={() => handleLabSelect(group.lab)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-icon btn-delete"
                    onClick={() => handleDeleteAssignment(group.lab._id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="batches-table">
                <table>
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Teacher 1</th>
                      <th>Teacher 2</th>
                      <th>Lab Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.batches
                      .sort((a, b) => a.batch_number - b.batch_number)
                      .map(batch => (
                        <tr key={batch._id}>
                          <td>
                            <span className="batch-badge">
                              {selectedSection.sem}{selectedSection.section_name}{batch.batch_number}
                            </span>
                          </td>
                          <td>
                            {batch.teacher_ids[0]?.name || 'N/A'}
                            {batch.teacher_ids[0]?.teacher_shortform && 
                              <span className="teacher-shortform"> ({batch.teacher_ids[0].teacher_shortform})</span>
                            }
                          </td>
                          <td>
                            {batch.teacher_ids[1]?.name || 'N/A'}
                            {batch.teacher_ids[1]?.teacher_shortform && 
                              <span className="teacher-shortform"> ({batch.teacher_ids[1].teacher_shortform})</span>
                            }
                          </td>
                          <td>
                            <span className="room-badge">
                              {batch.assigned_lab_room?.labRoom_no || 'Not assigned'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      {showModal && selectedLab && (
        <div className="modal-overlay">
          <div className="modal-content assignment-modal">
            <div className="modal-header">
              <h2>
                {isEditMode ? 'Edit' : 'Assign'} Teachers for {selectedLab.lab_shortform}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="info-box">
                <strong>Section:</strong> {selectedSection.sem}{selectedSection.section_name} | 
                <strong> Lab:</strong> {selectedLab.lab_name} ({selectedLab.lab_code}) | 
                <strong> Batches:</strong> {batchAssignments.length}
              </div>

              <p className="assignment-instruction">
                Assign exactly 2 teachers and 1 lab room to each batch:
              </p>

              {batchAssignments.map((assignment, index) => (
                <div key={assignment.batch_name} className="batch-assignment-row">
                  <div className="batch-header">
                    <span className="batch-badge-large">Batch {assignment.batch_name}</span>
                  </div>

                  <div className="assignment-inputs">
                    {/* Teacher 1 */}
                    <div className="form-group">
                      <label>Teacher 1 *</label>
                      <select
                        value={assignment.teacher1}
                        onChange={(e) => updateBatchAssignment(index, 'teacher1', e.target.value)}
                        required
                      >
                        <option value="">-- Select Teacher 1 --</option>
                        {getEligibleTeachers(selectedLab._id).map(teacher => (
                          <option 
                            key={teacher._id} 
                            value={teacher._id}
                            disabled={assignment.teacher2 === teacher._id}
                          >
                            {teacher.name} {teacher.teacher_shortform && `(${teacher.teacher_shortform})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Teacher 2 */}
                    <div className="form-group">
                      <label>Teacher 2 *</label>
                      <select
                        value={assignment.teacher2}
                        onChange={(e) => updateBatchAssignment(index, 'teacher2', e.target.value)}
                        required
                      >
                        <option value="">-- Select Teacher 2 --</option>
                        {getEligibleTeachers(selectedLab._id).map(teacher => (
                          <option 
                            key={teacher._id} 
                            value={teacher._id}
                            disabled={assignment.teacher1 === teacher._id}
                          >
                            {teacher.name} {teacher.teacher_shortform && `(${teacher.teacher_shortform})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lab Room */}
                    <div className="form-group">
                      <label>Lab Room *</label>
                      <select
                        value={assignment.lab_room}
                        onChange={(e) => updateBatchAssignment(index, 'lab_room', e.target.value)}
                        required
                      >
                        <option value="">-- Select Lab Room --</option>
                        {getEligibleLabRooms(selectedLab._id).map(deptLab => (
                          <option key={deptLab._id} value={deptLab._id}>
                            {deptLab.labRoom_no} (Capacity: {deptLab.capacity || 'N/A'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveAssignments}>
                {isEditMode ? 'Update' : 'Save'} Assignments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LabAssignments
