import { useState, useEffect } from 'react'
import axios from 'axios'
import './Teachers.css'

/**
 * Teachers Management Component
 * - View all teachers in a table
 * - Add new teachers
 * - Edit existing teachers
 * - Delete teachers
 * - Multi-select for subjects and labs they can teach/handle
 */
function Teachers() {
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [labs, setLabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentTeacher, setCurrentTeacher] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    teacher_id: '',
    canTeach_subjects: [],
    labs_handled: [],
    hrs_per_week: '',
    teacher_position: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [teachersRes, subjectsRes, labsRes] = await Promise.all([
        axios.get('/api/teachers'),
        axios.get('/api/subjects'),
        axios.get('/api/labs')
      ])
      setTeachers(teachersRes.data.data || [])
      setSubjects(subjectsRes.data.data || [])
      setLabs(labsRes.data.data || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubjectToggle = (subjectId) => {
    setFormData(prev => {
      const current = prev.canTeach_subjects
      if (current.includes(subjectId)) {
        return { ...prev, canTeach_subjects: current.filter(id => id !== subjectId) }
      } else {
        return { ...prev, canTeach_subjects: [...current, subjectId] }
      }
    })
  }

  const handleLabToggle = (labId) => {
    setFormData(prev => {
      const current = prev.labs_handled
      if (current.includes(labId)) {
        return { ...prev, labs_handled: current.filter(id => id !== labId) }
      } else {
        return { ...prev, labs_handled: [...current, labId] }
      }
    })
  }

  const groupBySemester = (items, semesterKey) => {
    const grouped = {}
    items.forEach(item => {
      const sem = item[semesterKey]
      if (!grouped[sem]) {
        grouped[sem] = []
      }
      grouped[sem].push(item)
    })
    return grouped
  }

  const openAddModal = () => {
    setEditMode(false)
    setCurrentTeacher(null)
    setFormData({
      name: '',
      teacher_id: '',
      canTeach_subjects: [],
      labs_handled: [],
      hrs_per_week: '',
      teacher_position: ''
    })
    setShowModal(true)
    setError('')
  }

  const openEditModal = (teacher) => {
    setEditMode(true)
    setCurrentTeacher(teacher)
    setFormData({
      name: teacher.name,
      teacher_id: teacher.teacher_id,
      canTeach_subjects: teacher.canTeach_subjects?.map(s => s._id || s) || [],
      labs_handled: teacher.labs_handled?.map(l => l._id || l) || [],
      hrs_per_week: teacher.hrs_per_week,
      teacher_position: teacher.teacher_position
    })
    setShowModal(true)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editMode) {
        await axios.put(`/api/teachers/${currentTeacher._id}`, formData)
      } else {
        await axios.post('/api/teachers', formData)
      }
      fetchData()
      setShowModal(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return

    try {
      await axios.delete(`/api/teachers/${id}`)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete teacher')
    }
  }

  if (loading) {
    return <div className="loading">Loading teachers...</div>
  }

  return (
    <div className="teachers-page">
      <div className="page-header">
        <div>
          <h1>Teachers Management</h1>
          <p>Manage department teachers and their eligible subjects/labs</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Teacher
        </button>
      </div>

      {error && !showModal && (
        <div className="alert alert-danger">{error}</div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Teacher ID</th>
              <th>Name</th>
              <th>Position</th>
              <th>Hrs/Week</th>
              <th>Can Teach</th>
              <th>Labs Handled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                  No teachers added yet. Click "Add Teacher" to get started.
                </td>
              </tr>
            ) : (
              teachers.map(teacher => (
                <tr key={teacher._id}>
                  <td><strong>{teacher.teacher_id}</strong></td>
                  <td>{teacher.name}</td>
                  <td>{teacher.teacher_position}</td>
                  <td>{teacher.hrs_per_week} hrs</td>
                  <td>
                    {teacher.canTeach_subjects?.length > 0 ? (
                      <span className="badge">{teacher.canTeach_subjects.length} subjects</span>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td>
                    {teacher.labs_handled?.length > 0 ? (
                      <span className="badge">{teacher.labs_handled.length} labs</span>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-icon btn-edit" 
                        onClick={() => openEditModal(teacher)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon btn-delete" 
                        onClick={() => handleDelete(teacher._id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? 'Edit Teacher' : 'Add New Teacher'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Teacher ID *</label>
                  <input
                    type="text"
                    name="teacher_id"
                    value={formData.teacher_id}
                    onChange={handleInputChange}
                    placeholder="e.g., T001"
                    required
                    disabled={editMode}
                  />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Full name"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Position *</label>
                  <select
                    name="teacher_position"
                    value={formData.teacher_position}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select position</option>
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Guest Faculty">Guest Faculty</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Weekly Hours *</label>
                  <input
                    type="number"
                    name="hrs_per_week"
                    value={formData.hrs_per_week}
                    onChange={handleInputChange}
                    placeholder="18"
                    min="1"
                    max="30"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Can Teach Subjects</label>
                <div className="compact-selection-container">
                  {subjects.length === 0 ? (
                    <p className="text-muted">No subjects available. Add subjects first.</p>
                  ) : (
                    (() => {
                      const subjectsBySem = groupBySemester(subjects, 'subject_sem')
                      const semesters = Object.keys(subjectsBySem).sort((a, b) => a - b)
                      
                      return semesters.map(sem => {
                        const semSubjects = subjectsBySem[sem]
                        const selectedCount = semSubjects.filter(s => 
                          formData.canTeach_subjects.includes(s._id)
                        ).length
                        const semType = parseInt(sem) % 2 === 0 ? 'Even' : 'Odd'
                        
                        return (
                          <div key={sem} className="compact-semester-group">
                            <div className="compact-sem-header">
                              <span className="compact-sem-badge">Sem {sem}</span>
                              {selectedCount > 0 && (
                                <span className="compact-count">{selectedCount}</span>
                              )}
                            </div>
                            <div className="compact-items-grid">
                              {semSubjects.map(subject => (
                                <button
                                  key={subject._id}
                                  type="button"
                                  className={`compact-item-btn ${formData.canTeach_subjects.includes(subject._id) ? 'selected' : ''}`}
                                  onClick={() => handleSubjectToggle(subject._id)}
                                  title={`${subject.subject_code} - ${subject.subject_name}`}
                                >
                                  {subject.subject_shortform || subject.subject_code}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })
                    })()
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Labs Handled</label>
                <div className="compact-selection-container">
                  {labs.length === 0 ? (
                    <p className="text-muted">No labs available. Add labs first.</p>
                  ) : (
                    (() => {
                      const labsBySem = groupBySemester(labs, 'lab_sem')
                      const semesters = Object.keys(labsBySem).sort((a, b) => a - b)
                      
                      return semesters.map(sem => {
                        const semLabs = labsBySem[sem]
                        const selectedCount = semLabs.filter(l => 
                          formData.labs_handled.includes(l._id)
                        ).length
                        const semType = parseInt(sem) % 2 === 0 ? 'Even' : 'Odd'
                        
                        return (
                          <div key={sem} className="compact-semester-group">
                            <div className="compact-sem-header">
                              <span className="compact-sem-badge">Sem {sem}</span>
                              {selectedCount > 0 && (
                                <span className="compact-count">{selectedCount}</span>
                              )}
                            </div>
                            <div className="compact-items-grid">
                              {semLabs.map(lab => (
                                <button
                                  key={lab._id}
                                  type="button"
                                  className={`compact-item-btn ${formData.labs_handled.includes(lab._id) ? 'selected' : ''}`}
                                  onClick={() => handleLabToggle(lab._id)}
                                  title={`${lab.lab_code} - ${lab.lab_name}`}
                                >
                                  {lab.lab_shortform || lab.lab_code}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })
                    })()
                  )}
                </div>
              </div>

              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editMode ? 'Update Teacher' : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Teachers
