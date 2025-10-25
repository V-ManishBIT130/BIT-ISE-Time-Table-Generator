import { useState, useEffect } from 'react'
import axios from 'axios'
import './Sections.css'

/**
 * Sections Management Component
 * - Manage ISE sections for semesters 3-8
 * - Auto-generate batch names (A1, A2, A3 etc.)
 * - Filter by semester and type
 * - Fixed 3 batches per section (constraint Q6)
 */
function Sections() {
  const [sections, setSections] = useState([])
  const [filteredSections, setFilteredSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentSection, setCurrentSection] = useState(null)
  const [filters, setFilters] = useState({
    semester: '',
    semType: ''
  })
  const [formData, setFormData] = useState({
    sem: '',
    section_name: '',
    split_batches: 3, // Fixed to 3 as per constraint
    total_strength: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSections()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [sections, filters])

  const fetchSections = async () => {
    try {
      const response = await axios.get('/api/sections')
      setSections(response.data.data || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching sections:', err)
      setError('Failed to load sections')
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...sections]

    if (filters.semester) {
      filtered = filtered.filter(s => s.sem === parseInt(filters.semester))
    }

    if (filters.semType) {
      filtered = filtered.filter(s => s.sem_type === filters.semType)
    }

    setFilteredSections(filtered)
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
    setCurrentSection(null)
    setFormData({
      sem: '',
      section_name: '',
      split_batches: 3,
      total_strength: ''
    })
    setShowModal(true)
    setError('')
  }

  const openEditModal = (section) => {
    setEditMode(true)
    setCurrentSection(section)
    setFormData({
      sem: section.sem,
      section_name: section.section_name,
      split_batches: section.split_batches,
      total_strength: section.total_strength || ''
    })
    setShowModal(true)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      // Auto-determine semester type based on semester number
      const semType = parseInt(formData.sem) % 2 === 0 ? 'even' : 'odd'

      // Auto-generate batch names with semester prefix (e.g., 3A1, 3A2, 3A3)
      const sem = formData.sem
      const section = formData.section_name
      const batch_names = [
        `${sem}${section}1`,
        `${sem}${section}2`,
        `${sem}${section}3`
      ]

      const payload = {
        ...formData,
        sem_type: semType,
        batch_names,
        total_strength: formData.total_strength || undefined
      }

      if (editMode) {
        await axios.put(`/api/sections/${currentSection._id}`, payload)
      } else {
        await axios.post('/api/sections', payload)
      }

      fetchSections()
      setShowModal(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this section?')) return

    try {
      await axios.delete(`/api/sections/${id}`)
      fetchSections()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete section')
    }
  }

  const clearFilters = () => {
    setFilters({ semester: '', semType: '' })
  }

  if (loading) {
    return <div className="loading">Loading sections...</div>
  }

  return (
    <div className="sections-page">
      <div className="page-header">
        <div>
          <h1>Sections Management</h1>
          <p>Manage ISE department sections and batches for semesters 3-8</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Section
        </button>
      </div>

      {/* Filters */}
      <div className="filters-card">
        <div className="filters-row">
          <div className="filter-group">
            <label>Filter by Semester</label>
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
            <label>Filter by Type</label>
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

        {(filters.semester || filters.semType) && (
          <div className="filter-info">
            Showing {filteredSections.length} of {sections.length} sections
          </div>
        )}
      </div>

      {error && !showModal && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Semester</th>
              <th>Type</th>
              <th>Section</th>
              <th>Batches</th>
              <th>Batch Names</th>
              <th>Strength</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSections.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                  {filters.semester || filters.semType
                    ? 'No sections match the selected filters.'
                    : 'No sections added yet. Click "Add Section" to get started.'}
                </td>
              </tr>
            ) : (
              filteredSections.map(section => (
                <tr key={section._id}>
                  <td><strong>{section.sem}</strong></td>
                  <td>
                    <span className={`badge badge-${section.sem_type}`}>
                      {section.sem_type === 'odd' ? 'Odd' : 'Even'}
                    </span>
                  </td>
                  <td><strong>{section.section_name}</strong></td>
                  <td>
                    <span className="badge">{section.split_batches} batches</span>
                  </td>
                  <td>
                    <div className="batch-tags">
                      {section.batch_names?.map((batch, idx) => (
                        <span key={idx} className="batch-tag">{batch}</span>
                      ))}
                    </div>
                  </td>
                  <td>{section.total_strength || 'N/A'}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-icon btn-edit" 
                        onClick={() => openEditModal(section)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon btn-delete" 
                        onClick={() => handleDelete(section._id)}
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
              <h2>{editMode ? 'Edit Section' : 'Add New Section'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Semester *</label>
                  <select
                    name="sem"
                    value={formData.sem}
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
                </div>

                <div className="form-group">
                  <label>Section Name *</label>
                  <input
                    type="text"
                    name="section_name"
                    value={formData.section_name}
                    onChange={handleInputChange}
                    placeholder="e.g., A, B, C"
                    required
                    maxLength="1"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <small className="form-hint">Single letter (A, B, C, etc.)</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Number of Batches</label>
                  <input
                    type="number"
                    name="split_batches"
                    value={formData.split_batches}
                    disabled
                    style={{ background: '#f5f5f5' }}
                  />
                  <small className="form-hint">Fixed to 3 batches per section (Constraint Q6)</small>
                </div>

                <div className="form-group">
                  <label>Total Strength (Optional)</label>
                  <input
                    type="number"
                    name="total_strength"
                    value={formData.total_strength}
                    onChange={handleInputChange}
                    placeholder="e.g., 60"
                    min="1"
                  />
                  <small className="form-hint">Total students in this section</small>
                </div>
              </div>

              {formData.section_name && formData.sem && (
                <div className="preview-section">
                  <h4>📋 Batch Names Preview:</h4>
                  <div className="batch-preview">
                    <span className="batch-preview-tag">{formData.sem}{formData.section_name}1</span>
                    <span className="batch-preview-tag">{formData.sem}{formData.section_name}2</span>
                    <span className="batch-preview-tag">{formData.sem}{formData.section_name}3</span>
                  </div>
                  <small className="form-hint">These batches will be auto-generated with semester prefix</small>
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
                  {editMode ? 'Update Section' : 'Add Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sections
