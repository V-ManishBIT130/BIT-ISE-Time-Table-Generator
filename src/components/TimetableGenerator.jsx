import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import './TimetableGenerator.css'

function TimetableGenerator() {
  const [semType, setSemType] = useState('odd')
  const [academicYear, setAcademicYear] = useState('2024-2025')
  const [generating, setGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [stepResults, setStepResults] = useState({
    step1: null,
    step2: null,
    step3: null,
    step4: null,
    step5: null,
    step6: null
  })
  const navigate = useNavigate()

  const handleStepExecution = async (stepNumber, stepName) => {
    if (!confirm(`⚠️ WARNING: This will clear existing timetables and execute ${stepName}.\n\nAre you sure you want to continue?`)) {
      return
    }

    setGenerating(true)
    setCurrentStep(stepNumber)
    setError('')
    setResult(null)

    try {
      const response = await axios.post(`/api/timetables/step${stepNumber}`, {
        sem_type: semType,
        academic_year: academicYear
      })

      if (response.data.success) {
        setStepResults(prev => ({
          ...prev,
          [`step${stepNumber}`]: response.data
        }))
        setResult(response.data.data)
        alert(`✅ ${stepName} completed successfully!`)
      } else {
        setError(response.data.message || `${stepName} failed`)
      }
    } catch (err) {
      console.error(`Error in ${stepName}:`, err)
      setError(err.response?.data?.message || `Failed to execute ${stepName}`)
    } finally {
      setGenerating(false)
      setCurrentStep(null)
    }
  }

  const handleGenerate = async () => {
    if (!confirm(`⚠️ WARNING: Full Auto Generation will clear existing timetables and run ALL steps.\n\nAre you sure you want to continue?`)) {
      return
    }

    setGenerating(true)
    setError('')
    setResult(null)

    try {
      const response = await axios.post('/api/timetables/generate', {
        sem_type: semType,
        academic_year: academicYear
      })

      if (response.data.success) {
        setResult(response.data.data)
      } else {
        setError(response.data.message || 'Generation failed')
      }
    } catch (err) {
      console.error('Error generating timetables:', err)
      setError(err.response?.data?.message || 'Failed to generate timetables')
    } finally {
      setGenerating(false)
    }
  }

  const handleClearTimetables = async () => {
    if (!confirm(`Are you sure you want to clear all ${semType} semester timetables?`)) {
      return
    }

    try {
      const response = await axios.delete('/api/timetables/clear', {
        params: {
          sem_type: semType,
          academic_year: academicYear
        }
      })

      if (response.data.success) {
        alert(`Deleted ${response.data.deletedCount} timetables`)
        setResult(null)
      }
    } catch (err) {
      console.error('Error clearing timetables:', err)
      alert('Failed to clear timetables')
    }
  }

  return (
    <div className="timetable-generator">
      <div className="generator-header">
        <h2>⚡ Timetable Generator (Phase 3)</h2>
        <p>Generate conflict-free timetables for all sections</p>
      </div>

      <div className="generator-controls">
        <div className="control-group">
          <label>Semester Type:</label>
          <div className="button-group">
            <button
              className={`toggle-btn ${semType === 'odd' ? 'active' : ''}`}
              onClick={() => setSemType('odd')}
              disabled={generating}
            >
              {semType === 'odd' ? '✓ ' : ''}Odd Semester
            </button>
            <button
              className={`toggle-btn ${semType === 'even' ? 'active' : ''}`}
              onClick={() => setSemType('even')}
              disabled={generating}
            >
              {semType === 'even' ? '✓ ' : ''}Even Semester
            </button>
          </div>
        </div>

        <div className="control-group">
          <label htmlFor="academic-year">Academic Year:</label>
          <input
            id="academic-year"
            type="text"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="2024-2025"
            disabled={generating}
          />
        </div>

        <div className="action-buttons">
          <button
            className="view-btn"
            onClick={() => navigate('/dashboard/view')}
          >
            👁️ View Timetables
          </button>

          <button
            className="clear-btn"
            onClick={handleClearTimetables}
            disabled={generating}
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* Step-by-Step Generation */}
      <div className="phased-generation">
        <h3>📋 Step-by-Step Generation (Recommended)</h3>
        <p className="phased-description">
          Execute each step individually to verify and control the timetable generation process.
        </p>

        <div className="steps-container">
          <div className="step-card">
            <div className="step-header">
              <span className="step-number">1</span>
              <h4>Load Sections</h4>
            </div>
            <p>Initialize empty timetables for all sections</p>
            <button
              className="step-btn"
              onClick={() => handleStepExecution(1, 'Step 1: Load Sections')}
              disabled={generating}
            >
              {generating && currentStep === 1 ? '⏳ Running...' : '▶️ Run Step 1'}
            </button>
            {stepResults.step1 && (
              <div className="step-result">
                ✅ {stepResults.step1.data.sections_processed} sections loaded
              </div>
            )}
          </div>

          <div className="step-card">
            <div className="step-header">
              <span className="step-number">2</span>
              <h4>Block Fixed Slots</h4>
            </div>
            <p>Reserve OEC/PEC time slots (Sem 7)</p>
            <button
              className="step-btn"
              onClick={() => handleStepExecution(2, 'Step 2: Block Fixed Slots')}
              disabled={generating}
            >
              {generating && currentStep === 2 ? '⏳ Running...' : '▶️ Run Step 2'}
            </button>
            {stepResults.step2 && (
              <div className="step-result">
                ✅ {stepResults.step2.data.fixed_slots_added} fixed slots added
              </div>
            )}
          </div>

          <div className="step-card">
            <div className="step-header">
              <span className="step-number">3</span>
              <h4>Schedule Labs</h4>
            </div>
            <p>Assign lab sessions with batch rotation</p>
            <button
              className="step-btn"
              onClick={() => handleStepExecution(3, 'Step 3: Schedule Labs')}
              disabled={generating}
            >
              {generating && currentStep === 3 ? '⏳ Running...' : '▶️ Run Step 3'}
            </button>
            {stepResults.step3 && (
              <div className="step-result">
                ✅ Labs scheduled (placeholder)
              </div>
            )}
          </div>

          <div className="step-card">
            <div className="step-header">
              <span className="step-number">4</span>
              <h4>Schedule Theory</h4>
            </div>
            <p>Assign theory classes with load balancing</p>
            <button
              className="step-btn"
              onClick={() => handleStepExecution(4, 'Step 4: Schedule Theory')}
              disabled={generating}
            >
              {generating && currentStep === 4 ? '⏳ Running...' : '▶️ Run Step 4'}
            </button>
            {stepResults.step4 && (
              <div className="step-result">
                ✅ Theory scheduled (placeholder)
              </div>
            )}
          </div>

          <div className="step-card">
            <div className="step-header">
              <span className="step-number">5</span>
              <h4>Assign Lab Teachers</h4>
            </div>
            <p>Dynamically assign 2 or 1 teachers per lab</p>
            <button
              className="step-btn"
              onClick={() => handleStepExecution(5, 'Step 5: Assign Teachers')}
              disabled={generating}
            >
              {generating && currentStep === 5 ? '⏳ Running...' : '▶️ Run Step 5'}
            </button>
            {stepResults.step5 && (
              <div className="step-result">
                ✅ Teachers assigned (placeholder)
              </div>
            )}
          </div>

          <div className="step-card">
            <div className="step-header">
              <span className="step-number">6</span>
              <h4>Validate & Finalize</h4>
            </div>
            <p>Check conflicts and mark as complete</p>
            <button
              className="step-btn"
              onClick={() => handleStepExecution(6, 'Step 6: Validate')}
              disabled={generating}
            >
              {generating && currentStep === 6 ? '⏳ Running...' : '▶️ Run Step 6'}
            </button>
            {stepResults.step6 && (
              <div className="step-result">
                ✅ Validation complete
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Auto Generation */}
      <div className="full-auto-section">
        <h3>⚡ Full Auto Generation (Advanced)</h3>
        <p className="auto-description">
          Run all steps automatically in one go. Use this when you're confident about all settings.
        </p>

        <div className="action-buttons">
          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? '⏳ Generating All Steps...' : '⚡ Generate All (Steps 1-6)'}
          </button>
        </div>
      </div>

      {generating && (
        <div className="generating-status">
          <div className="spinner"></div>
          <p>Generating timetables for {semType} semester...</p>
          <p className="sub-text">This may take a few moments</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <h3>❌ Error</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="result-container">
          <div className="result-header">
            <h3>✅ Generation Complete!</h3>
          </div>

          <div className="result-stats">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{result.sections_processed}</div>
                <div className="stat-label">Sections Processed</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-content">
                <div className="stat-value">{result.generation_time_ms}ms</div>
                <div className="stat-label">Generation Time</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-value">{result.timetables?.length || 0}</div>
                <div className="stat-label">Timetables Generated</div>
              </div>
            </div>
          </div>

          <div className="result-actions">
            <button
              className="view-results-btn"
              onClick={() => navigate('/dashboard/view')}
            >
              👁️ View Generated Timetables
            </button>
          </div>

          {result.timetables && result.timetables.length > 0 && (
            <div className="generated-sections">
              <h4>Generated Sections:</h4>
              <div className="sections-list">
                {result.timetables.map((tt) => (
                  <div key={tt._id} className="section-item">
                    <span className="section-badge">
                      Sem {tt.sem} - {tt.section_name}
                    </span>
                    <span className="section-details">
                      Theory: {tt.theory_slots?.length || 0} | Labs: {tt.lab_slots?.length || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="info-section">
        <h3>ℹ️ Generation Steps</h3>
        <ol>
          <li><strong>Step 1:</strong> Load all sections for semester type</li>
          <li><strong>Step 2:</strong> Block fixed slots (OEC/PEC for Semester 7)</li>
          <li><strong>Step 3:</strong> Schedule labs using batch rotation</li>
          <li><strong>Step 4:</strong> Schedule theory subjects with load balancing</li>
          <li><strong>Step 5:</strong> Assign teachers to labs dynamically</li>
          <li><strong>Step 6:</strong> Validate constraints (no conflicts)</li>
          <li><strong>Step 7:</strong> Save timetables to database</li>
        </ol>
      </div>
    </div>
  )
}

export default TimetableGenerator
