import { useState, useEffect } from 'react'
import axios from 'axios'
import './TimetableGenerator.css'

/**
 * Timetable Generator Component
 * 
 * Purpose: Generate conflict-free timetables for ALL sections at once
 * - Generates for entire semester type (odd/even)
 * - All sections: 3A-3C, 5A-5C, 7A-7C for odd semester
 * - Uses hybrid optimization (Greedy → GA → Bee Colony)
 * - Ensures zero conflicts across all sections
 */
function TimetableGenerator() {
  const [sections, setSections] = useState([])
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    fetchSections()
  }, [])

  const fetchSections = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/timetables/sections')
      setSections(response.data.sections || [])
    } catch (err) {
      console.error('Error fetching sections:', err)
      setError('Failed to load sections')
    }
  }

  const handleGenerateAll = async () => {
    if (!confirm(
      '🚀 Generate Timetables for ALL ODD SEMESTER Sections?\n\n' +
      'This will create conflict-free timetables for:\n' +
      '• Semester 3: Sections 3A, 3B, 3C\n' +
      '• Semester 5: Sections 5A, 5B, 5C\n' +
      '• Semester 7: Sections 7A, 7B, 7C\n\n' +
      'Process:\n' +
      '✓ Greedy initialization\n' +
      '✓ Genetic Algorithm optimization\n' +
      '✓ Bee Colony refinement\n' +
      '✓ Zero conflict guarantee\n\n' +
      'This may take 2-5 minutes. Continue?'
    )) {
      return
    }

    setGenerating(true)
    setError(null)
    setResults(null)
    setProgress('Initializing generation process...')

    try {
      // Generate for all odd semester sections
      const response = await axios.post('http://localhost:5000/api/timetables/generate-all', {
        semesterType: 'odd',
        semesters: [3, 5, 7]
      })

      if (response.data.success) {
        setResults(response.data)
        setProgress(null)
        
        const stats = response.data.statistics
        alert(
          `✅ SUCCESS!\n\n` +
          `Generated ${stats.successful} timetables successfully!\n\n` +
          `Statistics:\n` +
          `• Total sections: ${stats.total_sections}\n` +
          `• Successful: ${stats.successful}\n` +
          `• Failed: ${stats.failed}\n` +
          `• Total slots: ${stats.total_slots}\n` +
          `• Theory hours: ${stats.total_theory_hours}\n` +
          `• Lab hours: ${stats.total_lab_hours}\n\n` +
          `You can now view timetables in the "View TT" page!`
        )
      } else {
        throw new Error(response.data.message || 'Generation failed')
      }
    } catch (err) {
      console.error('Error generating timetables:', err)
      const errorMsg = err.response?.data?.message || err.message || 'Failed to generate timetables'
      setError(errorMsg)
      setProgress(null)
      alert(`❌ Error!\n\n${errorMsg}`)
    } finally {
      setGenerating(false)
    }
  }

  // Group sections by semester
  const groupedSections = {}
  sections.forEach(section => {
    const key = `${section.sem} (${section.sem_type})`
    if (!groupedSections[key]) {
      groupedSections[key] = []
    }
    groupedSections[key].push(section)
  })

  return (
    <div className="timetable-generator-page">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>⚡ Timetable Generator</h1>
            <p className="subtitle">Generate conflict-free timetables for all sections</p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="overview-section">
        <div className="overview-card">
          <div className="card-icon">📚</div>
          <div className="card-content">
            <h3>{sections.length}</h3>
            <p>Total Sections</p>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon">🎓</div>
          <div className="card-content">
            <h3>{sections.filter(s => s.sem_type === 'odd').length}</h3>
            <p>Odd Semester Sections</p>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <h3>{sections.filter(s => s.has_timetable).length}</h3>
            <p>Generated</p>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="sections-overview">
        <h2>📋 Available Sections</h2>
        <div className="sections-grid">
          {Object.entries(groupedSections).map(([semester, secs]) => (
            <div key={semester} className="semester-group">
              <h3>Semester {semester}</h3>
              <div className="section-items">
                {secs.map(section => (
                  <div key={section._id} className="section-item">
                    <div className="section-header">
                      <span className="section-name">Section {section.section_name}</span>
                      {section.has_timetable && <span className="badge-generated">✓ Generated</span>}
                    </div>
                    <div className="section-details">
                      <span>📦 {section.split_batches} batches</span>
                      <span>📝 {section.theory_count || 0} theory</span>
                      <span>🔬 {section.lab_count || 0} labs</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generation Controls */}
      <div className="generation-section">
        <div className="generation-card">
          <h2>🚀 Generate Timetables</h2>
          <p className="generation-description">
            Generate optimized, conflict-free timetables for all odd semester sections at once.
            The system will use a hybrid algorithm combining Greedy initialization, Genetic Algorithm
            optimization, and Bee Colony refinement to ensure zero conflicts.
          </p>

          <div className="algorithm-info">
            <h3>📊 Algorithm Pipeline:</h3>
            <div className="pipeline-steps">
              <div className="pipeline-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Greedy Builder</h4>
                  <p>Creates initial timetable using heuristics</p>
                </div>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Genetic Algorithm</h4>
                  <p>Evolves solution through crossover & mutation</p>
                </div>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Bee Colony</h4>
                  <p>Fine-tunes using swarm intelligence</p>
                </div>
              </div>
            </div>
          </div>

          <div className="generation-actions">
            <button
              className="btn-generate-all"
              onClick={handleGenerateAll}
              disabled={generating}
            >
              {generating ? (
                <>
                  <span className="spinner"></span>
                  Generating... Please wait
                </>
              ) : (
                <>
                  <span className="icon">⚡</span>
                  Generate All Odd Semester Timetables
                </>
              )}
            </button>

            {generating && progress && (
              <div className="progress-message">
                <span className="pulse-dot"></span>
                {progress}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-error">
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="results-section">
          <h2>✅ Generation Results</h2>
          
          <div className="results-stats">
            <div className="stat-card success">
              <div className="stat-number">{results.statistics.successful}</div>
              <div className="stat-label">Successful</div>
            </div>
            <div className="stat-card failed">
              <div className="stat-number">{results.statistics.failed}</div>
              <div className="stat-label">Failed</div>
            </div>
            <div className="stat-card total">
              <div className="stat-number">{results.statistics.total_slots}</div>
              <div className="stat-label">Total Slots</div>
            </div>
          </div>

          <div className="results-details">
            <h3>📊 Detailed Results:</h3>
            {results.timetables && results.timetables.map((tt, index) => (
              <div key={index} className={`result-item ${tt.is_valid ? 'valid' : 'invalid'}`}>
                <div className="result-header">
                  <span className="result-icon">{tt.is_valid ? '✅' : '❌'}</span>
                  <span className="result-title">
                    Semester {tt.semester} - Section {tt.section}
                  </span>
                </div>
                <div className="result-info">
                  <span>📝 {tt.theory_slots} theory slots</span>
                  <span>🔬 {tt.lab_slots} lab slots</span>
                  <span>📊 {tt.total_slots} total slots</span>
                  <span className={tt.is_valid ? 'status-valid' : 'status-invalid'}>
                    {tt.is_valid ? 'Conflict-Free' : 'Has Conflicts'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {results.errors && results.errors.length > 0 && (
            <div className="results-errors">
              <h3>⚠️ Errors:</h3>
              {results.errors.map((err, index) => (
                <div key={index} className="error-item">
                  {err}
                </div>
              ))}
            </div>
          )}

          <div className="next-steps">
            <p>
              <strong>Next:</strong> Go to <a href="/dashboard/view">View Timetables</a> to see the generated schedules!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimetableGenerator
