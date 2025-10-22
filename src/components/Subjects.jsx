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
    subject_sem_type: '',
    hrs_per_week: '',
    max_hrs_Day: '1'
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

  const openAddModal = () => {
    setEditMode(false)
    setCurrentSubject(null)
    setFormData({
      subject_code: '',
      subject_name: '',
      subject_sem: '',
      subject_sem_type: '',
      hrs_per_week: '',
      max_hrs_Day: '1'
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
      subject_sem_type: subject.subject_sem_type,
      hrs_per_week: subject.hrs_per_week,
      max_hrs_Day: subject.max_hrs_Day
    })
    setShowModal(true)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editMode) {
        await axios.put(`/api/subjects/${currentSubject._id}`, formData)
      } else {
        await axios.post('/api/subjects', formData)
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
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubjects.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
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
                  <td>{subject.hrs_per_week} hrs</td>
                  <td>{subject.max_hrs_Day} hrs</td>
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
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                    <option value="3">3rd Semester</option>
                    <option value="4">4th Semester</option>
                    <option value="5">5th Semester</option>
                    <option value="6">6th Semester</option>
                    <option value="7">7th Semester</option>
                    <option value="8">8th Semester</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester Type *</label>
                  <select
                    name="subject_sem_type"
                    value={formData.subject_sem_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="odd">Odd Semester</option>
                    <option value="even">Even Semester</option>
                  </select>
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
                    placeholder="e.g., 4"
                    min="1"
                    max="10"
                    required
                  />
                  <small className="form-hint">Typical: 3-4 hours</small>
                </div>
                <div className="form-group">
                  <label>Max Hours per Day *</label>
                  <input
                    type="number"
                    name="max_hrs_Day"
                    value={formData.max_hrs_Day}
                    onChange={handleInputChange}
                    min="1"
                    max="3"
                    required
                  />
                  <small className="form-hint">Usually 1 hour (prevents back-to-back)</small>
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
