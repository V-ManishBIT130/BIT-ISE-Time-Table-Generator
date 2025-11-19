import { useState, useEffect } from 'react'
import axios from 'axios'
import DepartmentHeader from './DepartmentHeader'
import './DeptLabs.css'

/**
 * Department Labs Management Component
 * - Manage department lab rooms
 * - Assign which syllabus labs each room can handle
 * - Track lab room numbers and capacity
 */
function DeptLabs() {
  const [deptLabs, setDeptLabs] = useState([])
  const [syllabusLabs, setSyllabusLabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentLab, setCurrentLab] = useState(null)
  const [formData, setFormData] = useState({
    labRoom_no: '',
    lab_subjects_handled: [],
    capacity: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [deptLabsRes, syllabusLabsRes] = await Promise.all([
        axios.get('/api/dept-labs'),
        axios.get('/api/labs')
      ])
      setDeptLabs(deptLabsRes.data.data || [])
      setSyllabusLabs(syllabusLabsRes.data.data || [])
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

  const handleLabToggle = (labId) => {
    setFormData(prev => {
      const current = prev.lab_subjects_handled
      if (current.includes(labId)) {
        return { ...prev, lab_subjects_handled: current.filter(id => id !== labId) }
      } else {
        return { ...prev, lab_subjects_handled: [...current, labId] }
      }
    })
  }

  const groupBySemester = (items) => {
    const grouped = {}
    items.forEach(item => {
      const sem = item.lab_sem
      if (!grouped[sem]) {
        grouped[sem] = []
      }
      grouped[sem].push(item)
    })
    return grouped
  }

  const openAddModal = () => {
    setEditMode(false)
    setCurrentLab(null)
    setFormData({
      labRoom_no: '',
      lab_subjects_handled: [],
      capacity: ''
    })
    setShowModal(true)
    setError('')
  }

  const openEditModal = (lab) => {
    setEditMode(true)
    setCurrentLab(lab)
    setFormData({
      labRoom_no: lab.labRoom_no,
      lab_subjects_handled: lab.lab_subjects_handled?.map(l => l._id || l) || [],
      capacity: lab.capacity || ''
    })
    setShowModal(true)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const payload = {
        labRoom_no: formData.labRoom_no.toUpperCase(),
        lab_subjects_handled: formData.lab_subjects_handled,
        capacity: formData.capacity || undefined
      }

      if (editMode) {
        await axios.put(`/api/dept-labs/${currentLab._id}`, payload)
      } else {
        await axios.post('/api/dept-labs', payload)
      }

      fetchData()
      setShowModal(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lab room?')) return

    try {
      await axios.delete(`/api/dept-labs/${id}`)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete lab room')
    }
  }

  if (loading) {
    return <div className="loading">Loading lab rooms...</div>
  }

  return (
    <div className="dept-labs-page">
      <DepartmentHeader
        title="Lab Rooms Management"
        subtitle="Manage department lab rooms and assign supported lab subjects"
      />

      {error && !showModal && (
        <div className="alert alert-danger">{error}</div>
      )}

      <div className="primary-btn-div">
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Lab Room
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Lab Room Number</th>
              <th>Capacity</th>
              <th>Supported Labs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deptLabs.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                  No lab rooms added yet. Click "Add Lab Room" to get started.
                </td>
              </tr>
            ) : (
              deptLabs.map(lab => (
                <tr key={lab._id}>
                  <td>
                    <strong className="lab-room-number">{lab.labRoom_no}</strong>
                  </td>
                  <td>
                    {lab.capacity ? (
                      <span className="capacity-badge">
                        💻 {lab.capacity} systems
                      </span>
                    ) : (
                      <span className="text-muted">Not specified</span>
                    )}
                  </td>
                  <td>
                    {lab.lab_subjects_handled?.length > 0 ? (
                      <div className="lab-tags">
                        {lab.lab_subjects_handled.map((sylLab, idx) => (
                          <span key={idx} className="lab-tag">
                            {sylLab.lab_shortform || sylLab.lab_code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">No labs assigned</span>
                    )}
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
              <h2>{editMode ? 'Edit Lab Room' : 'Add New Lab Room'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Lab Room Number *</label>
                  <input
                    type="text"
                    name="labRoom_no"
                    value={formData.labRoom_no}
                    onChange={handleInputChange}
                    placeholder="e.g., 612A, 614B, ISE-LAB-1"
                    required
                    style={{ textTransform: 'uppercase' }}
                  />
                  <small className="form-hint">
                    Enter lab room number (will be auto-converted to uppercase)
                  </small>
                </div>
                <div className="form-group">
                  <label>Capacity (Optional)</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    placeholder="e.g., 30, 40, 60"
                    min="1"
                    max="100"
                  />
                  <small className="form-hint">Number of systems/students</small>
                </div>
              </div>

              <div className="form-group">
                <label>Supported Lab Subjects</label>
                <p className="form-description">
                  Select which syllabus labs can be conducted in this lab room
                </p>
                <div className="compact-selection-container">
                  {syllabusLabs.length === 0 ? (
                    <p className="text-muted">No syllabus labs available. Add labs first.</p>
                  ) : (
                    (() => {
                      const labsBySem = groupBySemester(syllabusLabs)
                      const semesters = Object.keys(labsBySem).sort((a, b) => a - b)

                      return semesters.map(sem => {
                        const semLabs = labsBySem[sem]
                        const selectedCount = semLabs.filter(l =>
                          formData.lab_subjects_handled.includes(l._id)
                        ).length

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
                                  className={`compact-item-btn ${formData.lab_subjects_handled.includes(lab._id) ? 'selected' : ''}`}
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

              <div className="info-box">
                <strong>ℹ️ Note:</strong> A lab room can support multiple syllabus labs.
                Select all labs that can be conducted in this room based on available equipment/software.
              </div>

              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editMode ? 'Update Lab Room' : 'Add Lab Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeptLabs
