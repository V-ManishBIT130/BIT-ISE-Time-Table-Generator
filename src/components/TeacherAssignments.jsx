import { useState, useEffect } from 'react'
import axios from 'axios'
import DepartmentHeader from './DepartmentHeader'
import './TeacherAssignments.css'

/**
 * Teacher-Subject Assignments Component (Phase 2)
 * 
 * Purpose: Assign teachers to theory subjects BEFORE scheduling
 * - Select section and subject
 * - Assign ONE teacher per subject per section
 * - No time slots yet (Phase 3)
 * - Simpler than lab assignments (no batches, no room, only 1 teacher)
 */

function TeacherAssignments() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Master data
  const [sections, setSections] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  
  // Form state
  const [selectedSection, setSelectedSection] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [semesterTypeFilter, setSemesterTypeFilter] = useState('odd') // 'odd' or 'even'
  
  // Existing assignments
  const [existingAssignments, setExistingAssignments] = useState([])
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentAssignment, setCurrentAssignment] = useState(null)

  // Fetch master data
  useEffect(() => {
    fetchMasterData()
  }, [])

  const fetchMasterData = async () => {
    try {
      setLoading(true)
      
      const [sectionsRes, subjectsRes, teachersRes] = await Promise.all([
        axios.get('http://localhost:5000/api/sections'),
        axios.get('http://localhost:5000/api/subjects'),
        axios.get('http://localhost:5000/api/teachers')
      ])

      setSections(sectionsRes.data.data || [])
      setSubjects(subjectsRes.data.data || [])
      setTeachers(teachersRes.data.data || [])
      
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
      const response = await axios.get('http://localhost:5000/api/teacher-assignments', {
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

  // Open modal for new assignment
  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject)
    
    if (!selectedSection) {
      alert('Please select a section first')
      return
    }

    // Check if assignment already exists
    const existing = existingAssignments.find(
      a => a.subject_id._id === subject._id
    )

    if (existing) {
      // Load existing assignment for editing
      setCurrentAssignment(existing)
      setSelectedTeacher(existing.teacher_id._id)
      setIsEditMode(true)
    } else {
      // New assignment
      setCurrentAssignment(null)
      setSelectedTeacher('')
      setIsEditMode(false)
    }
    
    setShowModal(true)
  }

  // Get eligible teachers for a subject
  const getEligibleTeachers = (subjectId) => {
    return teachers.filter(teacher => 
      teacher.canTeach_subjects.some(subject => subject._id === subjectId)
    )
  }

  // Save assignment
  const handleSaveAssignment = async () => {
    if (!selectedTeacher) {
      alert('Please select a teacher')
      return
    }

    try {
      setLoading(true)

      console.log('=== SAVE ASSIGNMENT DEBUG ===')
      console.log('isEditMode:', isEditMode)
      console.log('currentAssignment:', currentAssignment)
      console.log('selectedTeacher:', selectedTeacher)
      console.log('selectedSubject:', selectedSubject)

      if (isEditMode && currentAssignment) {
        // Update existing assignment - ONLY send teacher_id to avoid unique constraint
        const updatePayload = {
          teacher_id: selectedTeacher
        }
        console.log('UPDATE MODE - Sending PUT request')
        console.log('Assignment ID:', currentAssignment._id)
        console.log('Update Payload:', updatePayload)
        
        await axios.put(`http://localhost:5000/api/teacher-assignments/${currentAssignment._id}`, updatePayload)
        alert('Assignment updated successfully!')
      } else {
        // Create new assignment - send full payload
        const createPayload = {
          teacher_id: selectedTeacher,
          subject_id: selectedSubject._id,
          sem: selectedSection.sem,
          sem_type: selectedSection.sem_type,
          section: selectedSection.section_name
        }
        console.log('CREATE MODE - Sending POST request')
        console.log('Create Payload:', createPayload)
        
        await axios.post('http://localhost:5000/api/teacher-assignments', createPayload)
        alert('Assignment saved successfully!')
      }

      setShowModal(false)
      fetchExistingAssignments()
      
    } catch (err) {
      console.error('Error saving assignment:', err)
      console.error('Error response:', err.response?.data)
      alert(err.response?.data?.message || 'Failed to save assignment')
    } finally {
      setLoading(false)
    }
  }

  // Delete assignment
  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Delete this assignment?')) return

    try {
      await axios.delete(`http://localhost:5000/api/teacher-assignments/${assignmentId}`)
      alert('Assignment deleted successfully')
      fetchExistingAssignments()
    } catch (err) {
      console.error('Error deleting assignment:', err)
      alert('Failed to delete assignment')
    }
  }

  // Validate and clean database
  const handleValidateDatabase = async () => {
    try {
      setLoading(true)
      console.log('🔍 Running database integrity check...')
      
      const response = await axios.post('http://localhost:5000/api/teacher-assignments/validate', {
        autoCleanup: true // Automatically delete orphaned assignments
      })
      
      const { data } = response.data
      
      console.log('Database validation results:', data)
      
      let message = `📊 Database Integrity Check Results:\n\n`
      message += `Total Assignments: ${data.totalAssignments}\n`
      message += `✅ Valid Assignments: ${data.validAssignments}\n`
      message += `⚠️ Orphaned Assignments: ${data.orphanedAssignments}\n`
      
      if (data.cleanedCount > 0) {
        message += `\n🧹 Cleaned up ${data.cleanedCount} orphaned assignments!`
      }
      
      if (data.orphanedDetails && data.orphanedDetails.length > 0) {
        message += `\n\n⚠️ Issues Found:\n`
        data.orphanedDetails.forEach(orphan => {
          message += `- Section ${orphan.sem}${orphan.section}: ${orphan.issues.join(', ')}\n`
        })
      }
      
      alert(message)
      
      // Refresh assignments after cleanup
      if (selectedSection) {
        fetchExistingAssignments()
      }
      
    } catch (err) {
      console.error('Error validating database:', err)
      alert('Failed to validate database: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  if (loading && sections.length === 0) {
    return <div className="loading">Loading teacher assignments...</div>
  }

  return (
    <div className="teacher-assignments-page">
      <DepartmentHeader 
        title="Teacher-Subject Assignments (Phase 2)" 
        subtitle="Assign teachers to theory subjects before scheduling"
      />
      
      {/* Header */}
      <div className="page-header">
        <div></div>
        <button 
          className="btn btn-warning"
          onClick={handleValidateDatabase}
          disabled={loading}
          title="Check for and clean up orphaned assignments"
        >
          🔍 Validate Database
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Section Selector */}
      <div className="selector-card">
        <div className="section-header">
          <h3>Step 1: Select Section</h3>
          <div className="semester-type-toggle">
            <button
              className={`toggle-btn ${semesterTypeFilter === 'odd' ? 'active' : ''}`}
              onClick={() => {
                setSemesterTypeFilter('odd')
                setSelectedSection(null) // Reset selection when switching
              }}
            >
              Odd Semesters
            </button>
            <button
              className={`toggle-btn ${semesterTypeFilter === 'even' ? 'active' : ''}`}
              onClick={() => {
                setSemesterTypeFilter('even')
                setSelectedSection(null) // Reset selection when switching
              }}
            >
              Even Semesters
            </button>
          </div>
        </div>
        <div className="section-grid">
          {sections
            .filter(section => {
              // Filter based on odd/even semester type
              const isOdd = section.sem % 2 !== 0
              return semesterTypeFilter === 'odd' ? isOdd : !isOdd
            })
            .map(section => (
            <button
              key={section._id}
              className={`section-btn ${selectedSection?._id === section._id ? 'selected' : ''}`}
              onClick={() => setSelectedSection(section)}
            >
              <div className="section-badge">
                Semester {section.sem} - Section {section.section_name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Subject Selector */}
      {selectedSection && (
        <div className="selector-card">
          <h3>Step 2: Select Subject to Assign</h3>
          <div className="info-box">
            <strong>ℹ️ Note:</strong> Only subjects requiring ISE teacher assignment are shown. 
            Projects, Open Electives, and Non-ISE subjects are excluded.
          </div>
          <div className="subjects-grid">
            {(() => {
              const filteredSubjects = subjects.filter(subject => 
                subject.subject_sem === selectedSection.sem && 
                subject.subject_sem_type === selectedSection.sem_type &&
                subject.requires_teacher_assignment === true
              )
              
              // Debug logging
              console.log('=== DEBUG INFO ===')
              console.log('Selected Section:', {
                sem: selectedSection.sem,
                sem_type: selectedSection.sem_type,
                section_name: selectedSection.section_name
              })
              console.log('All Subjects Count:', subjects.length)
              console.log('Subjects for this semester:', subjects.filter(s => s.subject_sem === selectedSection.sem).map(s => ({
                code: s.subject_code,
                name: s.subject_name,
                sem_type: s.subject_sem_type,
                requires_assignment: s.requires_teacher_assignment
              })))
              console.log('Filtered Subjects Count:', filteredSubjects.length)
              console.log('Filtered Subjects:', filteredSubjects.map(s => ({
                code: s.subject_code,
                name: s.subject_name,
                requires_assignment: s.requires_teacher_assignment
              })))
              console.log('===================')
              
              if (filteredSubjects.length === 0) {
                return (
                  <div style={{ 
                    padding: '40px', 
                    textAlign: 'center', 
                    color: '#666',
                    gridColumn: '1 / -1'
                  }}>
                    <p style={{ fontSize: '16px', marginBottom: '10px' }}>
                      ⚠️ No subjects found requiring teacher assignment
                    </p>
                    <p style={{ fontSize: '14px', color: '#999' }}>
                      Section: Sem {selectedSection.sem} - {selectedSection.sem_type}
                    </p>
                    <p style={{ fontSize: '13px', color: '#999', marginTop: '10px' }}>
                      Please ensure:
                      <br/>• Subjects exist for this semester and type
                      <br/>• Subjects have "requires_teacher_assignment" = true
                      <br/>• Check the Subjects page to verify
                    </p>
                  </div>
                )
              }
              
              return filteredSubjects.map(subject => {
                const assignment = existingAssignments.find(a => a.subject_id._id === subject._id)
                const isAssigned = !!assignment
                
                // Debug logging for assignment display
                if (subject.subject_code === 'BCS302') {
                  console.log('=== DDCO ASSIGNMENT DEBUG ===')
                  console.log('Subject:', subject.subject_code, subject.subject_name)
                  console.log('Assignment found:', assignment)
                  console.log('isAssigned:', isAssigned)
                  if (assignment) {
                    console.log('Teacher ID object:', assignment.teacher_id)
                    console.log('Teacher shortform:', assignment.teacher_id?.teacher_shortform)
                    console.log('Teacher name:', assignment.teacher_id?.name)
                  }
                  console.log('===========================')
                }
                
                return (
                  <button
                    key={subject._id}
                    className={`subject-btn ${isAssigned ? 'assigned' : ''}`}
                    onClick={() => handleSubjectSelect(subject)}
                  >
                    <div className="subject-shortform">{subject.subject_shortform}</div>
                    <div className="subject-name">{subject.subject_name}</div>
                    <div className="subject-code">{subject.subject_code}</div>
                    <div className="subject-credits">{subject.hrs_per_week} hrs/week</div>
                    {isAssigned && (
                      <div className="assigned-teacher">
                        <span className="assignment-label">Current Assigned Teacher:</span>
                        <span className="teacher-detail">
                          {assignment.teacher_id.teacher_shortform || assignment.teacher_id.name}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Existing Assignments Display */}
      {selectedSection && existingAssignments.length > 0 && (
        <div className="assignments-display">
          <h3>Existing Assignments for Section {selectedSection.sem}{selectedSection.section_name}</h3>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Teacher Assigned</th>
                  <th>Hours/Week</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {existingAssignments
                  .filter(assignment => {
                    // Filter out assignments with null/undefined references (orphaned data)
                    if (!assignment.teacher_id || !assignment.subject_id) {
                      console.warn('⚠️ Orphaned assignment found (null references):', assignment._id);
                      return false;
                    }
                    return true;
                  })
                  .map(assignment => (
                  <tr key={assignment._id}>
                    <td>
                      <span className="subject-code-badge">
                        {assignment.subject_id.subject_shortform || assignment.subject_id.subject_code}
                      </span>
                    </td>
                    <td>{assignment.subject_id.subject_name}</td>
                    <td>
                      <div className="teacher-info">
                        <span className="teacher-name">{assignment.teacher_id.name}</span>
                        {assignment.teacher_id.teacher_shortform && (
                          <span className="teacher-shortform"> ({assignment.teacher_id.teacher_shortform})</span>
                        )}
                      </div>
                    </td>
                    <td>{assignment.subject_id.hrs_per_week} hrs</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon btn-edit"
                          onClick={() => handleSubjectSelect(assignment.subject_id)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-icon btn-delete"
                          onClick={() => handleDeleteAssignment(assignment._id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showModal && selectedSubject && (
        <div className="modal-overlay">
          <div className="modal-content assignment-modal">
            <div className="modal-header">
              <h2>
                {isEditMode ? 'Edit' : 'Assign'} Teacher for {selectedSubject.subject_shortform}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="info-box">
                <strong>Section:</strong> {selectedSection.sem}{selectedSection.section_name} | 
                <strong> Subject:</strong> {selectedSubject.subject_name} ({selectedSubject.subject_code})
              </div>

              <div className="subject-details">
                <h4>{selectedSubject.subject_name}</h4>
                <div className="detail-row">
                  <span className="label">Subject Code:</span>
                  <span className="value">{selectedSubject.subject_code}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Shortform:</span>
                  <span className="value">{selectedSubject.subject_shortform}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Hours per Week:</span>
                  <span className="value">{selectedSubject.hrs_per_week}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Select Teacher *</label>
                <p className="form-description">
                  Choose a teacher who can handle this subject (based on their capability declaration)
                </p>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  required
                  className="teacher-select"
                >
                  <option value="">-- Select Teacher --</option>
                  {getEligibleTeachers(selectedSubject._id).map(teacher => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.name}
                      {teacher.teacher_shortform && ` (${teacher.teacher_shortform})`}
                      {teacher.teacher_position && ` - ${teacher.teacher_position}`}
                    </option>
                  ))}
                </select>
                {getEligibleTeachers(selectedSubject._id).length === 0 && (
                  <p className="warning-text">
                    ⚠️ No teachers are eligible for this subject. Please ensure teachers have declared this subject in their capabilities.
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveAssignment}
                disabled={!selectedTeacher}
              >
                {isEditMode ? 'Update' : 'Save'} Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherAssignments
