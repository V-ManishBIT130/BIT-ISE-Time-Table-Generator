import { useState, useEffect } from 'react'
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
    step6: null,
    step7: null
  })
  const navigate = useNavigate()

  // Fetch existing timetables to check which steps were completed
  useEffect(() => {
    fetchExistingStepStatus()
  }, [semType, academicYear])

  const fetchExistingStepStatus = async () => {
    try {
      // Fetch all timetables for current semester
      const response = await axios.get('/api/timetables', {
        params: {
          sem_type: semType,
          academic_year: academicYear
        }
      })

      if (response.data.success && response.data.data.length > 0) {
        // Get the first timetable to check metadata
        const sampleTimetable = response.data.data[0]
        const metadata = sampleTimetable.generation_metadata

        console.log('📊 [LOAD STATUS] Found existing timetables:', {
          count: response.data.data.length,
          current_step: metadata?.current_step,
          metadata
        })

        // Reconstruct step results based on metadata
        const reconstructedResults = {}

        // Step 1: Load Sections
        if (metadata?.current_step >= 1) {
          reconstructedResults.step1 = {
            success: true,
            message: `${response.data.data.length} sections loaded`,
            data: { sections_count: response.data.data.length }
          }
        }

        // Step 2: Block Fixed Slots (aggregate from all timetables)
        if (metadata?.current_step >= 2) {
          let totalFixedSlots = 0
          response.data.data.forEach(tt => {
            const fixedSlots = tt.theory_slots?.filter(slot => slot.is_fixed_slot === true) || []
            totalFixedSlots += fixedSlots.length
          })
          
          reconstructedResults.step2 = {
            success: true,
            message: `${totalFixedSlots} fixed slots added`,
            data: { fixed_slots_added: totalFixedSlots }
          }
        }

        // Step 3: Schedule Labs (aggregate from all timetables)
        if (metadata?.current_step >= 3) {
          let totalLabsScheduled = 0
          let totalLabsExpected = 0
          
          // Count scheduled labs
          response.data.data.forEach(tt => {
            totalLabsScheduled += tt.lab_slots?.length || 0
          })
          
          console.log('🔍 [STEP 3 STATUS] Scheduled labs:', totalLabsScheduled)
          
          // Try to get expected count from metadata
          let sectionsWithMetadata = 0
          response.data.data.forEach(tt => {
            if (tt.generation_metadata?.step3_summary) {
              const expected = parseFloat(tt.generation_metadata.step3_summary.lab_sessions_expected || 0)
              totalLabsExpected += expected
              sectionsWithMetadata++
              console.log(`   ✅ Section ${tt.section_name}: ${tt.lab_slots?.length || 0}/${expected} labs`)
            }
          })
          
          console.log('🔍 [STEP 3 STATUS] Total expected:', totalLabsExpected)
          
          // If no expected count in metadata, use scheduled count as expected (assumes 100% success)
          if (totalLabsExpected === 0) {
            console.log('ℹ️ [STEP 3 STATUS] No step3_summary metadata found (timetables may have been created before this feature)')
            console.log('ℹ️ [STEP 3 STATUS] Re-run Step 3 to populate metadata, or using scheduled count as fallback')
            totalLabsExpected = totalLabsScheduled
          }
          
          const labSuccessRate = totalLabsExpected > 0 ? (totalLabsScheduled / totalLabsExpected) * 100 : 100
          
          reconstructedResults.step3 = {
            success: true,
            message: 'Lab scheduling completed',
            data: {
              lab_sessions_scheduled: totalLabsScheduled,
              lab_sessions_expected: totalLabsExpected,
              success_rate: labSuccessRate,
              unresolved_conflicts: 0
            }
          }
        }

        // Step 4: Schedule Theory + Breaks (aggregate from all timetables)
        if (metadata?.current_step >= 4) {
          let totalTheoryScheduled = 0
          
          response.data.data.forEach(tt => {
            // Count only non-fixed, non-lab theory slots
            const theorySlots = tt.theory_slots?.filter(slot => 
              slot.is_fixed_slot !== true
            ) || []
            totalTheoryScheduled += theorySlots.length
          })
          
          reconstructedResults.step4 = {
            success: true,
            message: 'Theory scheduling completed',
            data: {
              theory_slots_scheduled: totalTheoryScheduled,
              sections_processed: response.data.data.length
            }
          }
        }

        // Step 5: Assign Classrooms (aggregate from all timetables)
        // Step 5: Assign Classrooms (reconstruct from actual data)
        if (metadata?.current_step >= 5) {
          console.log('🔍 [STEP 5 CHECK] Metadata current_step:', metadata.current_step)
          console.log('🔍 [STEP 5 CHECK] Number of timetables:', response.data.data.length)
          
          let totalSlotsAssigned = 0
          let totalSlotsUnassigned = 0
          let totalFixedAssigned = 0
          
          response.data.data.forEach(tt => {
            console.log(`🔍 [STEP 5 CHECK] Section ${tt.section_name}:`, {
              total_theory_slots: tt.theory_slots?.length || 0,
              has_classrooms: tt.theory_slots?.filter(s => s.classroom_name).length || 0
            })
            
            // Count theory slots with classrooms assigned
            const assignedSlots = tt.theory_slots?.filter(slot => 
              slot.classroom_name && !slot.is_project
            ) || []
            
            // Count fixed slots with classrooms
            const fixedWithRooms = tt.theory_slots?.filter(slot =>
              slot.is_fixed_slot && slot.classroom_name
            ) || []
            
            // Count theory slots without classrooms (excluding projects)
            const unassignedSlots = tt.theory_slots?.filter(slot =>
              !slot.classroom_name && !slot.is_fixed_slot && !slot.is_project
            ) || []
            
            totalSlotsAssigned += assignedSlots.length
            totalFixedAssigned += fixedWithRooms.length
            totalSlotsUnassigned += unassignedSlots.length
            
            console.log(`   Section ${tt.section_name}: ${assignedSlots.length} assigned, ${unassignedSlots.length} unassigned`)
          })
          
          console.log('🏫 [STEP 5 STATUS] Total:', {
            assigned: totalSlotsAssigned,
            fixed: totalFixedAssigned,
            unassigned: totalSlotsUnassigned,
            total: totalSlotsAssigned + totalFixedAssigned
          })
          
          const totalSlots = totalSlotsAssigned + totalFixedAssigned + totalSlotsUnassigned
          const totalAssigned = totalSlotsAssigned + totalFixedAssigned
          const successRate = totalSlots > 0 ? Math.round((totalAssigned / totalSlots) * 100) : 0
          
          reconstructedResults.step5 = {
            success: true,
            message: 'Classroom assignment completed',
            data: {
              fixed_slots_assigned: totalFixedAssigned,
              fixed_slots_unassigned: 0, // We counted already assigned fixed slots
              regular_slots_assigned: totalSlotsAssigned,
              regular_slots_unassigned: totalSlotsUnassigned,
              total_unassigned: totalSlotsUnassigned,
              success_rate: successRate,
              projects_skipped: 0
            }
          }
          
          console.log('✅ [STEP 5 RESULT] Created step5 result:', reconstructedResults.step5)
        } else {
          console.log('❌ [STEP 5 CHECK] Not reconstructing - current_step:', metadata?.current_step)
        }

        // Step 6: Assign Teachers (aggregate from all timetables)
        if (metadata?.current_step >= 6) {
          let totalBatches = 0
          let batchesWithTwoTeachers = 0
          let batchesWithOneTeacher = 0
          let batchesWithNoTeachers = 0
          
          response.data.data.forEach(tt => {
            const labSlots = tt.lab_slots || []
            labSlots.forEach(slot => {
              const batches = slot.batches || []
              batches.forEach(batch => {
                totalBatches++
                if (batch.teacher1_id && batch.teacher2_id) {
                  batchesWithTwoTeachers++
                } else if (batch.teacher1_id || batch.teacher2_id) {
                  batchesWithOneTeacher++
                } else {
                  batchesWithNoTeachers++
                }
              })
            })
          })
          
          const successRate = totalBatches > 0 
            ? ((batchesWithTwoTeachers + batchesWithOneTeacher) / totalBatches * 100).toFixed(2) 
            : 0
          
          reconstructedResults.step6 = {
            success: true,
            message: 'Teacher assignment completed',
            data: {
              sections_processed: response.data.data.length,
              total_batches: totalBatches,
              batches_with_two_teachers: batchesWithTwoTeachers,
              batches_with_one_teacher: batchesWithOneTeacher,
              batches_with_no_teachers: batchesWithNoTeachers,
              success_rate: successRate
            }
          }
          
          console.log('✅ [STEP 6 RESULT] Created step6 result:', reconstructedResults.step6)
        }

        // Step 7: Validate
        if (metadata?.current_step >= 7 && metadata.step7_summary) {
          reconstructedResults.step7 = {
            success: true,
            message: 'Validation completed',
            data: metadata.step7_summary
          }
        }

        setStepResults(reconstructedResults)
        console.log('✅ [LOAD STATUS] Step results restored:', reconstructedResults)
      } else {
        // No timetables exist - reset step results
        setStepResults({
          step1: null,
          step2: null,
          step3: null,
          step4: null,
          step5: null,
          step6: null,
          step7: null
        })
        console.log('ℹ️ [LOAD STATUS] No existing timetables found')
      }
    } catch (err) {
      console.error('❌ [LOAD STATUS] Error fetching step status:', err)
      // Don't show error to user - just means no timetables exist yet
    }
  }

  const handleStepExecution = async (stepNumber, stepName) => {
    if (!confirm(`⚠️ WARNING: This will clear existing timetables and execute ${stepName}.\n\nAre you sure you want to continue?`)) {
      return
    }

    setGenerating(true)
    setCurrentStep(stepNumber)
    setError('')
    setResult(null)
    
    // Clear future steps when running a step
    setStepResults(prev => {
      const newResults = { ...prev }
      // Clear all steps after the current one
      for (let i = stepNumber + 1; i <= 7; i++) {
        delete newResults[`step${i}`]
      }
      console.log(`🧹 [STEP ${stepNumber}] Cleared future steps ${stepNumber + 1} to 7`)
      return newResults
    })

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
        
        // Special handling for Step 3 - show detailed report
        if (stepNumber === 3 && response.data.data) {
          const data = response.data.data
          const successRate = data.success_rate || 0
          const scheduled = data.lab_sessions_scheduled || 0
          const expected = data.lab_sessions_expected || 0
          const batches = data.batches_scheduled || 0
          const sections = data.sections_processed || 0
          const unresolved = data.unresolved_conflicts || 0
          
          let alertMessage = `✅ STEP 3 COMPLETED: Lab Scheduling Report\n\n`
          alertMessage += `📊 SUCCESSFULLY SCHEDULED:\n`
          alertMessage += `   Total Lab Sessions: ${scheduled}/${expected} (${successRate.toFixed(2)}%)\n`
          alertMessage += `   Total Batches: ${batches}\n`
          alertMessage += `   Sections Processed: ${sections}\n\n`
          
          if (unresolved > 0) {
            alertMessage += `⚠️ UNRESOLVED CONFLICTS:\n`
            alertMessage += `   ${unresolved} lab session(s) could not be scheduled\n\n`
            
            if (data.unresolved_details && data.unresolved_details.length > 0) {
              alertMessage += `Details:\n`
              data.unresolved_details.slice(0, 3).forEach(conflict => {
                alertMessage += `   • ${conflict.section} - Round ${conflict.round}: ${conflict.reason}\n`
              })
              if (data.unresolved_details.length > 3) {
                alertMessage += `   ... and ${data.unresolved_details.length - 3} more\n`
              }
            }
          } else {
            alertMessage += `🎉 PERFECT! All labs scheduled with ZERO conflicts!\n`
          }
          
          alert(alertMessage)
        } 
        // Special handling for Step 4 - show theory scheduling report
        else if (stepNumber === 4 && response.data.data) {
          const data = response.data.data
          const sections = data.sections_processed || 0
          const slotsScheduled = data.theory_slots_scheduled || 0
          const totalFound = data.total_subjects_found || 0
          const totalToSchedule = data.subjects_to_schedule_step4 || 0
          const totalScheduled = data.total_scheduled || 0
          const fixedSlots = data.subjects_in_fixed_slots || 0
          const successRate = data.success_rate || 0
          
          let alertMessage = `✅ STEP 4 COMPLETED: Theory Scheduling Report\n\n`
          alertMessage += `📊 OVERALL SUMMARY:\n`
          alertMessage += `   Sections Processed: ${sections}\n`
          alertMessage += `   Total Subjects Found: ${totalFound}\n`
          alertMessage += `   Already in Fixed Slots: ${fixedSlots}\n`
          alertMessage += `   Subjects to Schedule: ${totalToSchedule}\n`
          alertMessage += `   Subjects Scheduled: ${totalScheduled}/${totalToSchedule}\n`
          alertMessage += `   Theory Slots Created: ${slotsScheduled}\n`
          alertMessage += `   Success Rate: ${successRate.toFixed(2)}%\n\n`
          
          // Category breakdown if available
          if (data.regular_ise_found !== undefined) {
            alertMessage += `📚 BREAKDOWN BY CATEGORY:\n`
            alertMessage += `   ISE Subjects: ${data.regular_ise_scheduled || 0}/${data.regular_ise_found || 0}\n`
            alertMessage += `   Other Dept: ${data.other_dept_scheduled || 0}/${data.other_dept_found || 0}\n`
            alertMessage += `   Projects: ${data.projects_scheduled || 0}/${data.projects_found || 0}\n\n`
          }
          
          if (totalScheduled < totalToSchedule) {
            alertMessage += `⚠️ NOTICE:\n`
            alertMessage += `   ${totalToSchedule - totalScheduled} subject(s) could not be scheduled\n`
            alertMessage += `   Check the detailed report in Timetable Viewer\n\n`
          }
          
          alertMessage += `💡 View detailed per-section statistics in Timetable Viewer!\n`
          alertMessage += `📅 Click "View Timetables" button to see the results!`
          
          alert(alertMessage)
        }
        // Special handling for Step 5 - show classroom assignment report
        else if (stepNumber === 5 && response.data.data) {
          const data = response.data.data
          const fixedTotal = data.fixed_slots_assigned + data.fixed_slots_unassigned
          const regularTotal = data.regular_slots_assigned + data.regular_slots_unassigned
          const fixedRate = fixedTotal > 0 ? ((data.fixed_slots_assigned / fixedTotal) * 100).toFixed(1) : '0.0'
          const regularRate = regularTotal > 0 ? ((data.regular_slots_assigned / regularTotal) * 100).toFixed(1) : '0.0'
          
          let alertMessage = `✅ STEP 5 COMPLETED: Classroom Assignment Report\n\n`
          alertMessage += `📌 FIXED SLOTS (OEC/PEC):\n`
          alertMessage += `   Assigned: ${data.fixed_slots_assigned}/${fixedTotal} (${fixedRate}%)\n`
          if (data.fixed_slots_unassigned > 0) {
            alertMessage += `   ⚠️ Unassigned: ${data.fixed_slots_unassigned}\n`
          }
          alertMessage += `\n📚 REGULAR SLOTS (ISE/Other Dept):\n`
          alertMessage += `   Assigned: ${data.regular_slots_assigned}/${regularTotal} (${regularRate}%)\n`
          if (data.regular_slots_unassigned > 0) {
            alertMessage += `   ⚠️ Unassigned: ${data.regular_slots_unassigned}\n`
          }
          if (data.projects_skipped > 0) {
            alertMessage += `\n⏭️ PROJECTS SKIPPED: ${data.projects_skipped} (no classroom needed)\n`
          }
          alertMessage += `\n🎯 OVERALL SUCCESS: ${data.success_rate}%\n`
          alertMessage += `   Total Assigned: ${data.total_assigned}\n`
          alertMessage += `   Total Unassigned: ${data.total_unassigned}\n`
          
          alert(alertMessage)
        }
        else {
          alert(`✅ ${stepName} completed successfully!`)
        }
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
        // Clear step results after deletion
        setStepResults({
          step1: null,
          step2: null,
          step3: null,
          step4: null,
          step5: null,
          step6: null,
          step7: null
        })
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
                ✅ {stepResults.step3.data.lab_sessions_scheduled}/{stepResults.step3.data.lab_sessions_expected} labs scheduled ({stepResults.step3.data.success_rate.toFixed(1)}%)
                {stepResults.step3.data.unresolved_conflicts > 0 && (
                  <span style={{ color: '#ff9800', marginLeft: '8px' }}>
                    ⚠️ {stepResults.step3.data.unresolved_conflicts} unresolved
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="step-card">
            <div className="step-header">
              <span className="step-number">4</span>
              <h4>Schedule Theory + Breaks</h4>
            </div>
            <p>Assign theory classes with load balancing and integrated breaks</p>
            <button
              className="step-btn"
              onClick={() => handleStepExecution(4, 'Step 4: Schedule Theory + Breaks')}
              disabled={generating}
            >
              {generating && currentStep === 4 ? '⏳ Running...' : '▶️ Run Step 4'}
            </button>
            {stepResults.step4 && (
              <div className="step-result">
                ✅ {stepResults.step4.data?.theory_slots_scheduled || 0} theory slots scheduled
                {stepResults.step4.data?.sections_processed && ` across ${stepResults.step4.data.sections_processed} sections`}
              </div>
            )}
          </div>

          <div className="step-card">
            <div className="step-header">
              <span className="step-number">5</span>
              <h4>Assign Classrooms</h4>
            </div>
            <p>Assign theory classrooms (fixed slots first, then regular)</p>
            <button
              className="step-btn"
              onClick={() => handleStepExecution(5, 'Step 5: Assign Classrooms')}
              disabled={generating}
            >
              {generating && currentStep === 5 ? '⏳ Running...' : '▶️ Run Step 5'}
            </button>
            {stepResults.step5 && (
              <div className="step-result">
                ✅ Classrooms Assigned ({stepResults.step5.data?.success_rate}% success)
                <br />
                <small style={{ fontSize: '0.85em', color: '#666' }}>
                  📌 Fixed: {stepResults.step5.data?.fixed_slots_assigned}/{stepResults.step5.data?.fixed_slots_assigned + stepResults.step5.data?.fixed_slots_unassigned || 0}
                  {' | '}
                  📚 Regular: {stepResults.step5.data?.regular_slots_assigned}/{stepResults.step5.data?.regular_slots_assigned + stepResults.step5.data?.regular_slots_unassigned || 0}
                  {stepResults.step5.data?.projects_skipped > 0 && (
                    <span> | ⏭️ Projects: {stepResults.step5.data.projects_skipped}</span>
                  )}
                </small>
                {(stepResults.step5.data?.fixed_slots_unassigned > 0 || stepResults.step5.data?.regular_slots_unassigned > 0) && (
                  <div style={{ color: '#ff9800', marginTop: '4px', fontSize: '0.9em' }}>
                    ⚠️ {stepResults.step5.data.total_unassigned} slot(s) unassigned
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="step-card">
            <div className="step-header">
              <span className="step-number">6</span>
              <h4>Assign Lab Teachers</h4>
            </div>
            <p>Dynamically assign 2 or 1 teachers per lab</p>
            <button
              className="step-btn"
              onClick={() => handleStepExecution(6, 'Step 6: Assign Teachers')}
              disabled={generating}
            >
              {generating && currentStep === 6 ? '⏳ Running...' : '▶️ Run Step 6'}
            </button>
            {stepResults.step6 && (
              <div className="step-result">
                <div className="result-header">✅ Teacher Assignment Complete</div>
                {stepResults.step6.data && (
                  <div className="result-details">
                    <div className="result-item">
                      <span className="label">Total Batches:</span>
                      <span className="value">{stepResults.step6.data.total_batches}</span>
                    </div>
                    <div className="result-item success">
                      <span className="label">👥 With 2 Teachers:</span>
                      <span className="value">{stepResults.step6.data.batches_with_two_teachers}</span>
                    </div>
                    <div className="result-item warning">
                      <span className="label">👤 With 1 Teacher:</span>
                      <span className="value">{stepResults.step6.data.batches_with_one_teacher}</span>
                    </div>
                    {stepResults.step6.data.batches_with_no_teachers > 0 && (
                      <div className="result-item error">
                        <span className="label">❌ With 0 Teachers:</span>
                        <span className="value">{stepResults.step6.data.batches_with_no_teachers}</span>
                      </div>
                    )}
                    <div className="result-item">
                      <span className="label">Success Rate:</span>
                      <span className="value">{stepResults.step6.data.success_rate}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="step-card">
            <div className="step-header">
              <span className="step-number">7</span>
              <h4>Validate & Finalize</h4>
            </div>
            <p>Check conflicts and mark as complete</p>
            <button
              className="step-btn"
              onClick={() => handleStepExecution(7, 'Step 7: Validate')}
              disabled={generating}
            >
              {generating && currentStep === 7 ? '⏳ Running...' : '▶️ Run Step 7'}
            </button>
            {stepResults.step7 && (
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
        </div>
      )}
    </div>
  )
}

export default TimetableGenerator
