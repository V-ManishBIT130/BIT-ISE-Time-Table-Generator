import { useState, useEffect } from 'react'
import axios from 'axios'
import './Classrooms.css'

/**
 * Classrooms Management Component
 * - Manage department theory classrooms
 * - Add/Edit/Delete classrooms
 * - Track room numbers and capacity
 */
function Classrooms() {
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentClassroom, setCurrentClassroom] = useState(null)
  const [formData, setFormData] = useState({
    room_no: '',
    capacity: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchClassrooms()
  }, [])

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get('/api/classrooms')
      setClassrooms(response.data.data || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching classrooms:', err)
      setError('Failed to load classrooms')
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const openAddModal = () => {
    setEditMode(false)
    setCurrentClassroom(null)
    setFormData({
      room_no: '',
      capacity: ''
    })
    setShowModal(true)
    setError('')
  }

  const openEditModal = (classroom) => {
    setEditMode(true)
    setCurrentClassroom(classroom)
    setFormData({
      room_no: classroom.room_no,
      capacity: classroom.capacity || ''
    })
    setShowModal(true)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const payload = {
        room_no: formData.room_no.toUpperCase(),
        capacity: formData.capacity || undefined,
        room_type: 'theory'
      }

      if (editMode) {
        await axios.put(`/api/classrooms/${currentClassroom._id}`, payload)
      } else {
        await axios.post('/api/classrooms', payload)
      }

      fetchClassrooms()
      setShowModal(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this classroom?')) return

    try {
      await axios.delete(`/api/classrooms/${id}`)
      fetchClassrooms()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete classroom')
    }
  }

  if (loading) {
    return <div className="loading">Loading classrooms...</div>
  }

  return (
    <div className="classrooms-page">
      <div className="page-header">
        <div>
          <h1>Classrooms Management</h1>
          <p>Manage department theory classrooms for timetable scheduling</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Classroom
        </button>
      </div>

      {error && !showModal && (
        <div className="alert alert-danger">{error}</div>
      )}

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">🏫</div>
          <div className="stat-info">
            <h3>{classrooms.length}</h3>
            <p>Total Classrooms</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💺</div>
          <div className="stat-info">
            <h3>
              {classrooms.reduce((sum, c) => sum + (c.capacity || 0), 0)}
            </h3>
            <p>Total Capacity</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>
              {classrooms.length > 0 
                ? Math.round(classrooms.reduce((sum, c) => sum + (c.capacity || 0), 0) / classrooms.length)
                : 0}
            </h3>
            <p>Avg Capacity</p>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Room Number</th>
              <th>Capacity</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classrooms.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                  No classrooms added yet. Click "Add Classroom" to get started.
                </td>
              </tr>
            ) : (
              classrooms.map(classroom => (
                <tr key={classroom._id}>
                  <td>
                    <strong className="room-number">{classroom.room_no}</strong>
                  </td>
                  <td>
                    {classroom.capacity ? (
                      <span className="capacity-badge">
                        💺 {classroom.capacity} seats
                      </span>
                    ) : (
                      <span className="text-muted">Not specified</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-theory">Theory</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-icon btn-edit" 
                        onClick={() => openEditModal(classroom)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon btn-delete" 
                        onClick={() => handleDelete(classroom._id)}
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
              <h2>{editMode ? 'Edit Classroom' : 'Add New Classroom'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Room Number *</label>
                <input
                  type="text"
                  name="room_no"
                  value={formData.room_no}
                  onChange={handleInputChange}
                  placeholder="e.g., C301, C302, ISE-101"
                  required
                  style={{ textTransform: 'uppercase' }}
                />
                <small className="form-hint">
                  Enter the classroom number (will be auto-converted to uppercase)
                </small>
              </div>

              <div className="form-group">
                <label>Capacity (Optional)</label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  placeholder="e.g., 60"
                  min="1"
                  max="200"
                />
                <small className="form-hint">
                  Number of students the classroom can accommodate (not critical for scheduling)
                </small>
              </div>

              <div className="info-box">
                <strong>ℹ️ Note:</strong> All classrooms are marked as "Theory" type. 
                Lab rooms are managed separately in the Lab Rooms section.
              </div>

              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editMode ? 'Update Classroom' : 'Add Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Classrooms
