import { useState, useEffect } from 'react'
import axios from 'axios'
import './Subjects.css'

/**
 * Subjects Management Component
 * - Manage theory subjects
 * - Filter by semester (1-8) and type (odd/even)
 * - Add/Edit/Delete subjects
 * - Set weekly hours and max hours per day
 */
function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [filteredSubjects, setFilteredSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentSubject, setCurrentSubject] = useState(null)
  const [filters, setFilters] = useState({
    semester: '',
    semType: ''
  })
  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    subject_sem: '',
    hrs_per_week: '',
    max_hrs_Day: '1',
    is_project: false,
    is_non_ise_subject: false,
    is_open_elective: false,
    is_professional_elective: false,
    fixed_schedule: []
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSubjects()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [subjects, filters])

  const fetchSubjects = async () => {
    try {
      const response = await axios.get('/api/subjects')
      setSubjects(response.data.data || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching subjects:', err)
      setError('Failed to load subjects')
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...subjects]

    if (filters.semester) {
      filtered = filtered.filter(s => s.subject_sem === parseInt(filters.semester))
    }

    if (filters.semType) {
      filtered = filtered.filter(s => s.subject_sem_type === filters.semType)
    }

    setFilteredSubjects(filtered)
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters({ ...filters, [name]: value })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const addFixedScheduleSlot = () => {
    setFormData({
      ...formData,
      fixed_schedule: [
        ...formData.fixed_schedule,
        { day: 'Monday', start_time: '08:00 AM', end_time: '09:00 AM' }
      ]
    })
  }

  const removeFixedScheduleSlot = (index) => {
    const updated = formData.fixed_schedule.filter((_, i) => i !== index)
    setFormData({ ...formData, fixed_schedule: updated })
  }

  const updateFixedScheduleSlot = (index, field, value) => {
    const updated = [...formData.fixed_schedule]
    updated[index][field] = value
    setFormData({ ...formData, fixed_schedule: updated })
  }

  // Time options for 12-hour format
  const timeOptions = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM'
  ]

  const openAddModal = () => {
    setEditMode(false)
    setCurrentSubject(null)
    setFormData({
      subject_code: '',
      subject_name: '',
      subject_sem: '',
      hrs_per_week: '',
      max_hrs_Day: '1',
      is_project: false,
      is_non_ise_subject: false,
      is_open_elective: false,
      is_professional_elective: false,
      fixed_schedule: []
    })
    setShowModal(true)
    setError('')
  }

  const openEditModal = (subject) => {
    setEditMode(true)
    setCurrentSubject(subject)
    setFormData({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      subject_sem: subject.subject_sem,
      hrs_per_week: subject.hrs_per_week,
      max_hrs_Day: subject.max_hrs_Day,
      is_project: subject.is_project || false,
      is_non_ise_subject: subject.is_non_ise_subject || false,
      is_open_elective: subject.is_open_elective || false,
      is_professional_elective: subject.is_professional_elective || false,
      fixed_schedule: subject.fixed_schedule || []
    })
    setShowModal(true)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      // Auto-determine semester type based on semester number
      const semesterType = parseInt(formData.subject_sem) % 2 === 0 ? 'even' : 'odd'
      
      // Determine if teacher assignment is needed
      // No teacher needed if:
      // 1. It's a project (Major/Mini Project)
      // 2. It's a non-ISE subject (Maths, Physics, etc. handled by other departments)
      // 3. It's an Open Elective (taught by external teacher)
      // Teacher needed for:
      // - Regular ISE subjects
      // - Professional Elective (ISE teacher with fixed schedule)
      const needsTeacher = !formData.is_project && !formData.is_non_ise_subject && !formData.is_open_elective
      
      // Auto-set has_fixed_schedule flag
      const hasFixedSchedule = formData.is_open_elective || formData.is_professional_elective
      
      const dataToSubmit = {
        ...formData,
        subject_sem_type: semesterType,
        requires_teacher_assignment: needsTeacher,
        has_fixed_schedule: hasFixedSchedule
      }

      if (editMode) {
        await axios.put(`/api/subjects/${currentSubject._id}`, dataToSubmit)
      } else {
        await axios.post('/api/subjects', dataToSubmit)
      }
      fetchSubjects()
      setShowModal(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return

    try {
      await axios.delete(`/api/subjects/${id}`)
      fetchSubjects()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete subject')
    }
  }

  const clearFilters = () => {
    setFilters({ semester: '', semType: '' })
  }

  if (loading) {
    return <div className="loading">Loading subjects...</div>
  }

  return (
    <div className="subjects-page">
      <div className="page-header">
        <div>
          <h1>Subjects Management</h1>
          <p>Manage theory subjects for ISE department</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Subject
        </button>
      </div>

      {/* Filters */}
      <div className="filters-card">
        <div className="filters-row">
          <div className="filter-group">
            <label>Semester</label>
            <select name="semester" value={filters.semester} onChange={handleFilterChange}>
              <option value="">All Semesters</option>
              <option value="3">3rd Semester</option>
              <option value="4">4th Semester</option>
              <option value="5">5th Semester</option>
              <option value="6">6th Semester</option>
              <option value="7">7th Semester</option>
              <option value="8">8th Semester</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Type</label>
            <select name="semType" value={filters.semType} onChange={handleFilterChange}>
              <option value="">All Types</option>
              <option value="odd">Odd Semester</option>
              <option value="even">Even Semester</option>
            </select>
          </div>

          <button className="btn btn-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        <div className="filter-info">
          Showing {filteredSubjects.length} of {subjects.length} subjects
        </div>
      </div>

      {error && !showModal && (
        <div className="alert alert-danger">{error}</div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Subject Code</th>
              <th>Subject Name</th>
              <th>Semester</th>
              <th>Type</th>
              <th>Hrs/Week</th>
              <th>Max Hrs/Day</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubjects.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                  {subjects.length === 0 
                    ? 'No subjects added yet. Click "Add Subject" to get started.'
                    : 'No subjects match the selected filters.'}
                </td>
              </tr>
            ) : (
              filteredSubjects.map(subject => (
                <tr key={subject._id}>
                  <td><strong>{subject.subject_code}</strong></td>
                  <td>{subject.subject_name}</td>
                  <td>{subject.subject_sem}</td>
                  <td>
                    <span className={`badge badge-${subject.subject_sem_type}`}>
                      {subject.subject_sem_type}
                    </span>
                  </td>
                  <td>{subject.has_fixed_schedule ? 'Fixed' : `${subject.hrs_per_week} hrs`}</td>
                  <td>{subject.has_fixed_schedule ? 'Fixed' : `${subject.max_hrs_Day} hrs`}</td>
                  <td>
                    {subject.is_open_elective ? (
                      <span className="badge badge-open-elective">Open Elective</span>
                    ) : subject.is_professional_elective ? (
                      <span className="badge badge-prof-elective">Prof Elective</span>
                    ) : subject.is_non_ise_subject ? (
                      <span className="badge badge-non-ise">Other Dept</span>
                    ) : subject.is_project ? (
                      <span className="badge badge-project">Project</span>
                    ) : (
                      <span className="badge badge-theory">Theory</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-icon btn-edit" 
                        onClick={() => openEditModal(subject)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon btn-delete" 
                        onClick={() => handleDelete(subject._id)}
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
              <h2>{editMode ? 'Edit Subject' : 'Add New Subject'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Subject Code *</label>
                  <input
                    type="text"
                    name="subject_code"
                    value={formData.subject_code}
                    onChange={handleInputChange}
                    placeholder="e.g., CS301"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Subject Name *</label>
                  <input
                    type="text"
                    name="subject_name"
                    value={formData.subject_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Data Structures"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Semester *</label>
                  <select
                    name="subject_sem"
                    value={formData.subject_sem}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Semester</option>
                    <option value="3">3rd Semester (Odd)</option>
                    <option value="4">4th Semester (Even)</option>
                    <option value="5">5th Semester (Odd)</option>
                    <option value="6">6th Semester (Even)</option>
                    <option value="7">7th Semester (Odd)</option>
                    <option value="8">8th Semester (Even)</option>
                  </select>
                  <small className="form-hint">Type will be auto-determined</small>
                </div>
              </div>

              {/* Subject Category Section */}
              <div className="form-section-header">
                <h3>Subject Category</h3>
                <p>Select the category that describes this subject</p>
              </div>

              <div className="category-options">
                <div className="category-option">
                  <label className="category-label">
                    <input
                      type="checkbox"
                      checked={!formData.is_non_ise_subject && !formData.is_project && !formData.is_open_elective && !formData.is_professional_elective}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ 
                            ...formData, 
                            is_non_ise_subject: false,
                            is_project: false,
                            is_open_elective: false,
                            is_professional_elective: false
                          })
                        }
                      }}
                      style={{ width: 'auto', marginRight: '12px' }}
                    />
                    <div className="category-content">
                      <strong>Regular ISE Theory Subject</strong>
                      <span className="category-badge badge-theory">Theory</span>
                    </div>
                  </label>
                  <small className="category-hint">
                    ✓ Normal ISE department subjects<br />
                    ✓ Requires ISE teacher assignment<br />
                    <strong>Example:</strong> Data Structures, OS, DBMS
                  </small>
                </div>

                <div className="category-option">
                  <label className="category-label">
                    <input
                      type="checkbox"
                      name="is_non_ise_subject"
                      checked={formData.is_non_ise_subject}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setFormData({ 
                          ...formData, 
                          is_non_ise_subject: checked,
                          is_project: checked ? false : formData.is_project,
                          is_open_elective: checked ? false : formData.is_open_elective,
                          is_professional_elective: checked ? false : formData.is_professional_elective
                        })
                      }}
                      style={{ width: 'auto', marginRight: '12px' }}
                    />
                    <div className="category-content">
                      <strong>Other Department Subject</strong>
                      <span className="category-badge badge-non-ise">Other Dept</span>
                    </div>
                  </label>
                  <small className="category-hint">
                    ✓ Handled by other departments<br />
                    ✓ No ISE teacher needed<br />
                    <strong>Example:</strong> Mathematics-III, Physics
                  </small>
                </div>

                <div className="category-option">
                  <label className="category-label">
                    <input
                      type="checkbox"
                      name="is_project"
                      checked={formData.is_project}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setFormData({ 
                          ...formData, 
                          is_project: checked,
                          is_non_ise_subject: checked ? false : formData.is_non_ise_subject,
                          is_open_elective: checked ? false : formData.is_open_elective,
                          is_professional_elective: checked ? false : formData.is_professional_elective
                        })
                      }}
                      style={{ width: 'auto', marginRight: '12px' }}
                    />
                    <div className="category-content">
                      <strong>Project Subject</strong>
                      <span className="category-badge badge-project">Project</span>
                    </div>
                  </label>
                  <small className="category-hint">
                    ✓ Major/Mini Project<br />
                    ✓ No teacher needed<br />
                    <strong>Example:</strong> Major Project
                  </small>
                </div>

                <div className="category-option">
                  <label className="category-label">
                    <input
                      type="checkbox"
                      name="is_open_elective"
                      checked={formData.is_open_elective}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setFormData({ 
                          ...formData, 
                          is_open_elective: checked,
                          is_non_ise_subject: checked ? false : formData.is_non_ise_subject,
                          is_project: checked ? false : formData.is_project,
                          is_professional_elective: checked ? false : formData.is_professional_elective
                        })
                      }}
                      style={{ width: 'auto', marginRight: '12px' }}
                    />
                    <div className="category-content">
                      <strong>Open Elective Course</strong>
                      <span className="category-badge badge-open-elective">Open Elective</span>
                    </div>
                  </label>
                  <small className="category-hint">
                    ✓ Taught by external teacher<br />
                    ✓ Fixed time slots (7th sem)<br />
                    ✓ No ISE teacher needed<br />
                    <strong>Example:</strong> Open Elective Course
                  </small>
                </div>

                <div className="category-option">
                  <label className="category-label">
                    <input
                      type="checkbox"
                      name="is_professional_elective"
                      checked={formData.is_professional_elective}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setFormData({ 
                          ...formData, 
                          is_professional_elective: checked,
                          is_non_ise_subject: checked ? false : formData.is_non_ise_subject,
                          is_project: checked ? false : formData.is_project,
                          is_open_elective: checked ? false : formData.is_open_elective
                        })
                      }}
                      style={{ width: 'auto', marginRight: '12px' }}
                    />
                    <div className="category-content">
                      <strong>Professional Elective Course</strong>
                      <span className="category-badge badge-prof-elective">Prof Elective</span>
                    </div>
                  </label>
                  <small className="category-hint">
                    ✓ Taught by ISE teacher<br />
                    ✓ Fixed time slots (7th sem)<br />
                    ✓ Requires ISE teacher assignment<br />
                    <strong>Example:</strong> Professional Elective
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Hours per Week *</label>
                  <input
                    type="number"
                    name="hrs_per_week"
                    value={formData.hrs_per_week}
                    onChange={handleInputChange}
                    placeholder={formData.is_project ? "e.g., 12 (for Major Project)" : "e.g., 4"}
                    min="1"
                    max={formData.is_project ? "20" : "10"}
                    required
                    disabled={formData.is_open_elective || formData.is_professional_elective}
                  />
                  <small className="form-hint">
                    {formData.is_open_elective || formData.is_professional_elective
                      ? 'Auto-calculated from fixed time slots'
                      : formData.is_project 
                      ? 'Projects: 4 hrs (Mini) or 12 hrs (Major)' 
                      : 'Regular subjects: 3-4 hours typical'}
                  </small>
                </div>
                <div className="form-group">
                  <label>Max Hours per Day *</label>
                  <input
                    type="number"
                    name="max_hrs_Day"
                    value={formData.max_hrs_Day}
                    onChange={handleInputChange}
                    min="1"
                    max={formData.is_project ? "12" : "3"}
                    required
                    disabled={formData.is_open_elective || formData.is_professional_elective}
                  />
                  <small className="form-hint">
                    {formData.is_open_elective || formData.is_professional_elective
                      ? 'Auto-determined from fixed slots'
                      : formData.is_project 
                      ? 'Projects can have higher daily hours (up to 12)' 
                      : 'Usually 1 hour (prevents back-to-back)'}
                  </small>
                </div>
              </div>

              {/* Fixed Schedule Section */}
              {(formData.is_open_elective || formData.is_professional_elective) && (
                <div className="fixed-schedule-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ margin: 0, fontWeight: '600' }}>Fixed Time Slots</label>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={addFixedScheduleSlot}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      + Add Slot
                    </button>
                  </div>

                  {formData.fixed_schedule.length === 0 ? (
                    <p style={{ color: '#999', fontStyle: 'italic', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                      No fixed slots added. Click "+ Add Slot" to define specific timings.
                    </p>
                  ) : (
                    formData.fixed_schedule.map((slot, index) => (
                      <div key={index} className="fixed-slot-row" style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '13px', marginBottom: '6px', display: 'block' }}>Day</label>
                          <select
                            value={slot.day}
                            onChange={(e) => updateFixedScheduleSlot(index, 'day', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                          >
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                            <option value="Saturday">Saturday</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '13px', marginBottom: '6px', display: 'block' }}>Start Time</label>
                          <select
                            value={slot.start_time}
                            onChange={(e) => updateFixedScheduleSlot(index, 'start_time', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                          >
                            {timeOptions.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '13px', marginBottom: '6px', display: 'block' }}>End Time</label>
                          <select
                            value={slot.end_time}
                            onChange={(e) => updateFixedScheduleSlot(index, 'end_time', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                          >
                            {timeOptions.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFixedScheduleSlot(index)}
                          style={{ padding: '8px 12px', background: '#ffebee', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#c33' }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editMode ? 'Update Subject' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Subjects
