import { useState, useEffect } from 'react'
import axios from 'axios'
import './Labs.css'

/**
 * Labs Management Component
 * - Manage lab subjects
 * - Fixed 2-hour duration
 * - Requires two teachers
 * - Filter by semester and type
 */
function Labs() {
  const [labs, setLabs] = useState([])
  const [filteredLabs, setFilteredLabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentLab, setCurrentLab] = useState(null)
  const [filters, setFilters] = useState({
    semester: '',
    semType: ''
  })
  const [formData, setFormData] = useState({
    lab_code: '',
    lab_name: '',
    lab_shortform: '',
    lab_sem: '',
    duration_hours: 2,
    requires_two_teachers: true
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLabs()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [labs, filters])

  const fetchLabs = async () => {
    try {
      const response = await axios.get('/api/labs')
      setLabs(response.data.data || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching labs:', err)
      setError('Failed to load labs')
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...labs]

    if (filters.semester) {
      filtered = filtered.filter(l => l.lab_sem === parseInt(filters.semester))
    }

    if (filters.semType) {
      filtered = filtered.filter(l => l.lab_sem_type === filters.semType)
    }

    setFilteredLabs(filtered)
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
    setCurrentLab(null)
    setFormData({
      lab_code: '',
      lab_name: '',
      lab_shortform: '',
      lab_sem: '',
      duration_hours: 2,
      requires_two_teachers: true
    })
    setShowModal(true)
    setError('')
  }

  const openEditModal = (lab) => {
    setEditMode(true)
    setCurrentLab(lab)
    setFormData({
      lab_code: lab.lab_code,
      lab_name: lab.lab_name,
      lab_shortform: lab.lab_shortform,
      lab_sem: lab.lab_sem,
      duration_hours: lab.duration_hours,
      requires_two_teachers: lab.requires_two_teachers
    })
    setShowModal(true)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      // Auto-determine semester type based on semester number
      const semesterType = parseInt(formData.lab_sem) % 2 === 0 ? 'even' : 'odd'
      const dataToSubmit = {
        ...formData,
        lab_sem_type: semesterType
      }

      if (editMode) {
        await axios.put(`/api/labs/${currentLab._id}`, dataToSubmit)
      } else {
        await axios.post('/api/labs', dataToSubmit)
      }
      fetchLabs()
      setShowModal(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lab?')) return

    try {
      await axios.delete(`/api/labs/${id}`)
      fetchLabs()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete lab')
    }
  }

  const clearFilters = () => {
    setFilters({ semester: '', semType: '' })
  }

  if (loading) {
    return <div className="loading">Loading labs...</div>
  }

  return (
    <div className="labs-page">
      <div className="page-header">
        <div>
          <h1>Labs Management</h1>
          <p>Manage laboratory subjects (2-hour duration, 2 teachers required)</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Lab
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
          Showing {filteredLabs.length} of {labs.length} labs
        </div>
      </div>

      {error && !showModal && (
        <div className="alert alert-danger">{error}</div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Lab Code</th>
              <th>Lab Name</th>
              <th>Semester</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Teachers Required</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLabs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                  {labs.length === 0 
                    ? 'No labs added yet. Click "Add Lab" to get started.'
                    : 'No labs match the selected filters.'}
                </td>
              </tr>
            ) : (
              filteredLabs.map(lab => (
                <tr key={lab._id}>
                  <td><strong>{lab.lab_code}</strong></td>
                  <td>{lab.lab_name}</td>
                  <td>{lab.lab_sem}</td>
                  <td>
                    <span className={`badge badge-${lab.lab_sem_type}`}>
                      {lab.lab_sem_type}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-duration">{lab.duration_hours} hours</span>
                  </td>
                  <td>
                    <span className="badge badge-teachers">2 Teachers</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-icon btn-edit" 
                        onClick={() => openEditModal(lab)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon btn-delete" 
                        onClick={() => handleDelete(lab._id)}
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
              <h2>{editMode ? 'Edit Lab' : 'Add New Lab'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Lab Code *</label>
                  <input
                    type="text"
                    name="lab_code"
                    value={formData.lab_code}
                    onChange={handleInputChange}
                    placeholder="e.g., CS302L"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Lab Name *</label>
                  <input
                    type="text"
                    name="lab_name"
                    value={formData.lab_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Data Structures Lab"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Short Form *</label>
                  <input
                    type="text"
                    name="lab_shortform"
                    value={formData.lab_shortform}
                    onChange={handleInputChange}
                    placeholder="e.g., DSL, DBMSL, CNL"
                    required
                  />
                  <small className="form-hint">Used for teacher selection display</small>
                </div>
                <div className="form-group">
                  <label>Semester *</label>
                  <select
                    name="lab_sem"
                    value={formData.lab_sem}
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

              <div className="info-box">
                <div className="info-item">
                  <strong>⏱️ Duration:</strong> Fixed at 2 hours (standard lab session)
                </div>
                <div className="info-item">
                  <strong>👥 Teachers:</strong> Requires 2 teachers per session
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
                  {editMode ? 'Update Lab' : 'Add Lab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Labs
