import { useState, useEffect } from 'react'
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import axios from 'axios'
import './TimetableEditor.css'

// Draggable Slot Component
function DraggableSlot({ slot, children }) {
  const slotId = slot._id || slot.id || 'unknown'
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: slotId,
    data: slot,
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  )
}

// Droppable Zone Component
function DroppableZone({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  return (
    <td 
      ref={setNodeRef}
      className={`drop-zone ${isOver ? 'drag-over' : ''}`}
    >
      {children}
    </td>
  )
}

function TimetableEditor() {
  const [sections, setSections] = useState([])
  const [selectedSection, setSelectedSection] = useState('')
  const [timetable, setTimetable] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [semType, setSemType] = useState('odd')
  const [activeSlot, setActiveSlot] = useState(null)
  const [conflicts, setConflicts] = useState([])
  const [changeHistory, setChangeHistory] = useState([])
  const [unsavedChanges, setUnsavedChanges] = useState(0)
  const [addBreakMode, setAddBreakMode] = useState(false)

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  )

  // Time slots: 8:00 AM to 5:00 PM in 30-minute intervals
  const timeSlots = [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
  ]

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Default break times (11:00-11:30 AM and 1:30-2:00 PM)
  const defaultBreakTimes = [
    { start: '11:00', end: '11:30' },
    { start: '13:30', end: '14:00' }
  ]

  // Helper: Convert 24-hour to 12-hour format
  const convertTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Helper: Convert 12-hour to 24-hour format
  const convertTo24Hour = (time12) => {
    const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!match) return time12
    
    let [, hours, minutes, period] = match
    hours = parseInt(hours)
    
    if (period.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hours = 0
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`
  }

  // Helper: Calculate time slot index
  const getTimeSlotIndex = (time) => {
    const [hours, minutes] = time.split(':').map(Number)
    const startHour = 8
    const totalMinutes = (hours - startHour) * 60 + minutes
    return Math.floor(totalMinutes / 30)
  }

  // Helper: Calculate span (number of 30-min slots)
  const getTimeSpan = (startTime, endTime) => {
    const startIndex = getTimeSlotIndex(startTime)
    const endIndex = getTimeSlotIndex(endTime)
    return endIndex - startIndex
  }

  // Fetch sections
  useEffect(() => {
    fetchSections()
  }, [semType])

  const fetchSections = async () => {
    try {
      const response = await axios.get('/api/sections', {
        params: { sem_type: semType }
      })
      setSections(response.data.data || [])
    } catch (err) {
      console.error('Error fetching sections:', err)
      setError('Failed to fetch sections')
    }
  }

  // Fetch timetable for selected section
  const fetchTimetable = async (sectionId) => {
    if (!sectionId) return

    setLoading(true)
    setError('')
    setTimetable(null)
    setConflicts([])
    setChangeHistory([])
    setUnsavedChanges(0)

    try {
      const response = await axios.get(`/api/timetables/${sectionId}`, {
        params: { sem_type: semType }
      })

      if (response.data.success) {
        setTimetable(response.data.data)
      } else {
        setError('No timetable found for this section')
      }
    } catch (err) {
      console.error('Error fetching timetable:', err)
      if (err.response?.status === 404) {
        setError('No timetable generated yet for this section. Please run Step 4 first.')
      } else {
        setError('Failed to fetch timetable')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSectionChange = (e) => {
    const sectionId = e.target.value
    setSelectedSection(sectionId)
    fetchTimetable(sectionId)
  }

  // Drag handlers
  const handleDragStart = (event) => {
    const { active } = event
    const slotId = active.id
    
    console.log('👆 [DRAG START] User started dragging:', slotId)
    
    // Check if it's a break slot
    if (slotId.startsWith('break_')) {
      const breakData = JSON.parse(active.data.current)
      console.log('☕ [BREAK DRAG] Dragging break slot')
      setActiveSlot({ ...breakData, isBreak: true })
      return
    }
    
    // Find the slot being dragged
    const slot = timetable.theory_slots.find(s => s._id === slotId)
    
    // Only allow dragging non-fixed, non-lab theory slots
    if (slot && !slot.is_fixed_slot) {
      console.log('📚 [THEORY DRAG] Dragging theory slot:', {
        subject: slot.subject_shortform,
        teacher: slot.teacher_name
      })
      setActiveSlot(slot)
    } else {
      console.log('🚫 [BLOCKED] Cannot drag fixed/lab slot')
    }
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    
    setActiveSlot(null)

    if (!over) return // Dropped outside

    const slotId = active.id
    const dropZone = over.id // Format: "Monday_8:00 AM"
    
    const [newDay, newTimeStr] = dropZone.split('_')
    const newStartTime = convertTo24Hour(newTimeStr)

    console.log('🔄 [DRAG END] Slot dropped:', {
      slotId,
      newDay,
      newTime: newTimeStr,
      dropZone
    })

    // Handle break slot movement
    if (slotId.startsWith('break_')) {
      const [, oldDay, oldTime] = slotId.split('_')
      
      console.log('☕ [MOVE BREAK] Moving break from', `${oldDay} ${oldTime}`, 'to', `${newDay} ${newStartTime}`)
      
      if (!timetable.breaks) {
        timetable.breaks = []
      }
      
      const breakIndex = timetable.breaks.findIndex(b => 
        b.day === oldDay && b.start_time === oldTime
      )
      
      if (breakIndex !== -1) {
        const updatedBreaks = [...timetable.breaks]
        updatedBreaks[breakIndex] = {
          ...updatedBreaks[breakIndex],
          day: newDay,
          start_time: newStartTime,
          end_time: addHours(newStartTime, 0.5)
        }
        
        console.log('💾 [STATE UPDATE] Break moved successfully')
        
        setTimetable(prev => ({
          ...prev,
          breaks: updatedBreaks
        }))
        
        setUnsavedChanges(prev => prev + 1)
      }
      
      return
    }

    // Find the slot
    const slot = timetable.theory_slots.find(s => s._id === slotId)
    
    if (!slot || slot.is_fixed_slot) {
      console.log('🚫 [BLOCKED] Cannot move fixed slot')
      return // Can't move fixed slots
    }

    // Check if actually moved
    if (slot.day === newDay && slot.start_time === newStartTime) {
      console.log('ℹ️ [NO CHANGE] Slot dropped in same position')
      return // No change
    }

    console.log('📚 [MOVE THEORY] Moving theory slot:', {
      subject: slot.subject_shortform,
      teacher: slot.teacher_name,
      from: `${slot.day} ${slot.start_time}`,
      to: `${newDay} ${newStartTime}`
    })

    // Calculate new end time
    const duration = slot.duration_hours || 1
    const newEndTime = addHours(newStartTime, duration)

    // Check for conflicts
    console.log('🔍 [CONFLICT CHECK] Running conflict detection...')
    const conflictCheck = await checkConflicts(slot, newDay, newStartTime, newEndTime)
    
    if (conflictCheck.hasConflicts) {
      console.error('❌ [CONFLICTS FOUND]', conflictCheck.conflicts)
      setConflicts(conflictCheck.conflicts)
      // Show conflict modal - user can revert or force
      showConflictModal(slot, newDay, newStartTime, newEndTime, conflictCheck.conflicts)
    } else {
      console.log('✅ [NO CONFLICTS] Move is safe, updating...')
      // No conflicts - update immediately
      await updateSlotPosition(slot, newDay, newStartTime, newEndTime)
    }
  }

  // Helper: Add hours to time
  const addHours = (time, hours) => {
    const [h, m] = time.split(':').map(Number)
    const totalMinutes = h * 60 + m + (hours * 60)
    const newHours = Math.floor(totalMinutes / 60)
    const newMinutes = totalMinutes % 60
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
  }

  // Check conflicts
  const checkConflicts = async (slot, newDay, newStartTime, newEndTime) => {
    console.log('🔍 [CONFLICT DETECTION] Checking conflicts for:', {
      subject: slot.subject_name,
      teacher: slot.teacher_name,
      teacher_id: slot.teacher_id,
      target: `${newDay} ${convertTo12Hour(newStartTime)}`
    })

    const conflicts = []

    // Check 1: Teacher conflict ACROSS ALL SECTIONS (backend check)
    if (slot.teacher_id && slot.teacher_name !== '[Other Dept]') {
      console.log('   🌐 [GLOBAL CHECK] Checking teacher conflicts across all sections...')
      
      try {
        const response = await axios.get('/api/timetables/check-teacher-conflict', {
          params: {
            teacher_id: slot.teacher_id,
            day: newDay,
            start_time: newStartTime,
            exclude_timetable_id: timetable._id,
            exclude_slot_id: slot._id
          }
        })

        if (response.data.hasConflict) {
          const conflict = response.data.conflict
          console.log('   ❌ [GLOBAL CONFLICT] Teacher is teaching in another section!', conflict)
          conflicts.push({
            type: 'teacher_global',
            message: `❌ GLOBAL Teacher Conflict: ${slot.teacher_name} is already teaching "${conflict.subject}" in Section ${conflict.section} at ${newDay} ${convertTo12Hour(newStartTime)}`
          })
        } else {
          console.log('   ✅ [GLOBAL CHECK] No conflicts in other sections')
        }
      } catch (err) {
        console.error('   ⚠️ [GLOBAL CHECK ERROR] Could not verify global conflicts:', err)
        // Continue with local checks even if backend fails
      }
    }

    // Check 2: Teacher conflict within CURRENT section (theory + labs)
    if (slot.teacher_id) {
      // Check in theory slots
      const teacherBusyTheory = timetable.theory_slots.some(s => 
        s._id !== slot._id &&
        s.teacher_id === slot.teacher_id &&
        s.day === newDay &&
        s.start_time === newStartTime
      )
      
      console.log('   📚 [THEORY CHECK] Teacher busy in theory (same section)?', teacherBusyTheory)
      
      // Check in lab slots
      const teacherBusyLab = (timetable.lab_slots || []).some(s => 
        s.teacher_id === slot.teacher_id &&
        s.day === newDay &&
        s.start_time === newStartTime
      )
      
      console.log('   🧪 [LAB CHECK] Teacher busy in lab (same section)?', teacherBusyLab)
      
      if (teacherBusyTheory || teacherBusyLab) {
        const otherSlot = teacherBusyTheory 
          ? timetable.theory_slots.find(s => 
              s._id !== slot._id && 
              s.teacher_id === slot.teacher_id && 
              s.day === newDay && 
              s.start_time === newStartTime
            )
          : (timetable.lab_slots || []).find(s => 
              s.teacher_id === slot.teacher_id && 
              s.day === newDay && 
              s.start_time === newStartTime
            )
        
        console.log('   ❌ [TEACHER CONFLICT] Teacher is busy teaching (same section):', otherSlot?.subject_name || otherSlot?.subject_shortform)
        conflicts.push({
          type: 'teacher',
          message: `❌ Teacher Conflict (Same Section): ${slot.teacher_name} is already teaching "${otherSlot?.subject_name || otherSlot?.subject_shortform}" at ${newDay} ${convertTo12Hour(newStartTime)}`
        })
      }
    }

    // Check 3: Time slot conflict (section already has class - theory, lab, OR break)
    const slotBusyTheory = timetable.theory_slots.some(s =>
      s._id !== slot._id &&
      s.day === newDay &&
      s.start_time === newStartTime
    )
    
    const slotBusyLab = (timetable.lab_slots || []).some(s =>
      s.day === newDay &&
      s.start_time === newStartTime
    )
    
    const slotBusyBreak = (timetable.breaks || []).some(b =>
      b.day === newDay &&
      b.start_time === newStartTime
    )

    console.log('   ⏰ [SLOT CHECK] Time slot occupied?', {
      theory: slotBusyTheory,
      lab: slotBusyLab,
      break: slotBusyBreak
    })

    if (slotBusyTheory || slotBusyLab || slotBusyBreak) {
      let conflictType = slotBusyBreak ? 'Break' : slotBusyLab ? 'Lab' : 'Class'
      console.log('   ❌ [SLOT CONFLICT] Time occupied by:', conflictType)
      conflicts.push({
        type: 'slot',
        message: `❌ Time Slot Conflict: ${newDay} ${convertTo12Hour(newStartTime)} is already occupied by a ${conflictType}`
      })
    }

    // Check 3: Break time conflict (if moving TO a default break time)
    const isDefaultBreakTime = (newStartTime === '11:00' || newStartTime === '13:30')
    if (isDefaultBreakTime) {
      conflicts.push({
        type: 'break',
        message: `⚠️ Warning: Scheduling during default break time (${convertTo12Hour(newStartTime)}). This will override the break.`
      })
    }

    // Check 4: Day length constraint (8 AM start → 4 PM end)
    const hasEarlyStart = [...(timetable.theory_slots || []), ...(timetable.lab_slots || [])].some(s =>
      s.day === newDay && s.start_time === '08:00'
    )
    
    if (hasEarlyStart && newEndTime > '16:00') {
      conflicts.push({
        type: 'day_length',
        message: `❌ Day Length Violation: ${newDay} starts at 8:00 AM, cannot extend past 4:00 PM (new slot ends at ${convertTo12Hour(newEndTime)})`
      })
    }

    // Check 5: Max hours per day (check if adding this slot exceeds limits)
    const daySlots = [...(timetable.theory_slots || []), ...(timetable.lab_slots || [])].filter(s =>
      s.day === newDay && s._id !== slot._id // Exclude the slot being moved
    )
    
    const totalHours = daySlots.reduce((sum, s) => sum + (s.duration_hours || 1), 0) + (slot.duration_hours || 1)
    
    if (totalHours > 8) {
      console.log('   ⚠️ [MAX HOURS WARNING] Day exceeds 8 hours:', totalHours)
      conflicts.push({
        type: 'max_hours',
        message: `⚠️ Warning: ${newDay} will have ${totalHours} hours of classes (recommended max: 8 hours)`
      })
    }

    console.log('🎯 [CONFLICT RESULT]', {
      hasConflicts: conflicts.length > 0,
      conflictCount: conflicts.length,
      types: conflicts.map(c => c.type)
    })

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    }
  }

  // Show conflict modal
  const showConflictModal = (slot, newDay, newStartTime, newEndTime, conflicts) => {
    console.log('⚠️ [CONFLICT MODAL] Showing user conflict warning')
    const message = `⚠️ CONFLICTS DETECTED!\n\nMoving: ${slot.subject_shortform} (${slot.teacher_name})\nTo: ${newDay} ${convertTo12Hour(newStartTime)}\n\nConflicts:\n${conflicts.map(c => `❌ ${c.message}`).join('\n')}\n\nDo you want to continue anyway?`
    
    if (confirm(message)) {
      console.log('⚠️ [USER OVERRIDE] User chose to proceed despite conflicts')
      updateSlotPosition(slot, newDay, newStartTime, newEndTime, true) // Force update
    } else {
      console.log('🚫 [USER CANCELLED] Move cancelled due to conflicts')
      // Revert - no action needed (state unchanged)
      setConflicts([])
    }
  }

  // Update slot position
  const updateSlotPosition = async (slot, newDay, newStartTime, newEndTime, forced = false) => {
    console.log('💾 [UPDATE POSITION] Updating slot position in state', {
      forced,
      slot: slot.subject_shortform
    })

    try {
      // Optimistic update
      const updatedTheorySlots = timetable.theory_slots.map(s => 
        s._id === slot._id
          ? { ...s, day: newDay, start_time: newStartTime, end_time: newEndTime }
          : s
      )

      setTimetable(prev => ({
        ...prev,
        theory_slots: updatedTheorySlots
      }))

      // Track change
      setChangeHistory(prev => [...prev, {
        slotId: slot._id,
        from: { day: slot.day, start_time: slot.start_time },
        to: { day: newDay, start_time: newStartTime },
        timestamp: new Date(),
        forced
      }])

      setUnsavedChanges(prev => prev + 1)
      setConflicts([])

      console.log('✅ [UPDATE SUCCESS] Slot position updated in state')

    } catch (err) {
      console.error('❌ [UPDATE ERROR] Failed to update slot:', err)
      alert('Failed to update slot position')
    }
  }

  // Save all changes to database
  const saveChanges = async () => {
    if (unsavedChanges === 0) return

    console.log('💾 [SAVE] Starting save process...', {
      unsavedChanges,
      theorySlots: timetable?.theory_slots?.length || 0,
      breaks: timetable?.breaks?.length || 0,
      changeHistory: changeHistory.length
    })

    try {
      console.log('🔄 [SAVE] Sending data to backend...')
      
      const response = await axios.put(
        `/api/timetables/${timetable._id}/update-slots`,
        {
          theory_slots: timetable.theory_slots || [],
          breaks: timetable.breaks || []
        }
      )

      if (response.data.success) {
        console.log('✅ [SAVE SUCCESS] All changes saved to database!')
        alert(`✅ Successfully saved ${unsavedChanges} changes!`)
        setUnsavedChanges(0)
        setChangeHistory([])
      } else {
        console.error('❌ [SAVE FAILED] Backend returned failure')
        alert('❌ Failed to save changes')
      }
      
    } catch (err) {
      console.error('❌ [SAVE ERROR] Failed to save changes:', err)
      alert('❌ Failed to save changes: ' + (err.response?.data?.message || err.message))
    }
  }

  // Revert all changes
  const revertChanges = () => {
    if (unsavedChanges === 0) return

    console.log('↩️ [REVERT] User wants to revert', unsavedChanges, 'changes')

    if (confirm(`Revert ${unsavedChanges} unsaved changes?`)) {
      console.log('🔄 [REVERT] Re-fetching original data from database...')
      fetchTimetable(selectedSection) // Re-fetch fresh data
      console.log('✅ [REVERT SUCCESS] Changes reverted')
    } else {
      console.log('🚫 [REVERT CANCELLED] User cancelled revert')
    }
  }

  // Delete a break
  const deleteBreak = (day, startTime) => {
    if (!confirm('Delete this break?')) return

    console.log('🗑️ [DELETE BREAK] Removing break:', { day, startTime })

    const updatedBreaks = timetable.breaks.filter(b => 
      !(b.day === day && b.start_time === startTime)
    )

    setTimetable(prev => ({
      ...prev,
      breaks: updatedBreaks
    }))

    setUnsavedChanges(prev => prev + 1)
    console.log('✅ [DELETE SUCCESS] Break removed')
  }

  // Handle slot click for adding break
  const handleSlotClick = (day, timeStr) => {
    if (!addBreakMode) return

    console.log('☕ [ADD BREAK] User clicked to add break at', { day, timeStr })

    const startTime = convertTo24Hour(timeStr)
    
    const newBreak = {
      day: day,
      start_time: startTime,
      end_time: addHours(startTime, 0.5), // 30 minutes
      label: 'Break'
    }

    const updatedBreaks = [...(timetable.breaks || []), newBreak]
    
    setTimetable(prev => ({
      ...prev,
      breaks: updatedBreaks
    }))

    setUnsavedChanges(prev => prev + 1)
    setAddBreakMode(false) // Deactivate after adding
    
    console.log('✅ [ADD BREAK SUCCESS] Break added to', `${day} ${convertTo12Hour(startTime)}`)
  }

  // Build grid data
  const buildDayGrid = (day) => {
    const cells = Array(timeSlots.length).fill(null).map(() => ({ type: 'empty' }))

    // Add default breaks (if no custom breaks exist for that slot)
    const customBreaks = timetable.breaks || []
    
    defaultBreakTimes.forEach((breakTime) => {
      const startIndex = getTimeSlotIndex(breakTime.start)
      const span = getTimeSpan(breakTime.start, breakTime.end)
      
      // Check if there's already a custom break at this time
      const hasCustomBreak = customBreaks.some(b => 
        b.day === day && b.start_time === breakTime.start
      )
      
      if (!hasCustomBreak) {
        cells[startIndex] = {
          type: 'break',
          span,
          data: {
            day,
            start_time: breakTime.start,
            end_time: breakTime.end,
            label: 'Break',
            isDefault: true
          }
        }
        
        for (let i = 1; i < span; i++) {
          cells[startIndex + i] = { type: 'occupied' }
        }
      }
    })

    // Add custom breaks
    customBreaks.forEach((breakSlot) => {
      if (breakSlot.day === day) {
        const startIndex = getTimeSlotIndex(breakSlot.start_time)
        const span = getTimeSpan(breakSlot.start_time, breakSlot.end_time)

        cells[startIndex] = {
          type: 'break',
          span,
          data: {
            ...breakSlot,
            isDefault: false
          }
        }

        for (let i = 1; i < span; i++) {
          cells[startIndex + i] = { type: 'occupied' }
        }
      }
    })

    // Add theory slots
    timetable.theory_slots?.forEach((slot) => {
      if (slot.day === day) {
        const startIndex = getTimeSlotIndex(slot.start_time)
        const span = getTimeSpan(slot.start_time, slot.end_time)

        // Only add if not overlapping with breaks
        if (cells[startIndex].type === 'empty' || cells[startIndex].type === 'break') {
          cells[startIndex] = {
            type: slot.is_fixed_slot ? 'fixed' : 'theory',
            span,
            data: slot
          }

          for (let i = 1; i < span; i++) {
            cells[startIndex + i] = { type: 'occupied' }
          }
        }
      }
    })

    // Add lab slots (non-draggable)
    timetable.lab_slots?.forEach((slot) => {
      if (slot.day === day) {
        const startIndex = getTimeSlotIndex(slot.start_time)
        const span = getTimeSpan(slot.start_time, slot.end_time)

        // Only add if not overlapping
        if (cells[startIndex].type === 'empty' || cells[startIndex].type === 'break') {
          cells[startIndex] = {
            type: 'lab',
            span,
            data: slot
          }

          for (let i = 1; i < span; i++) {
            cells[startIndex + i] = { type: 'occupied' }
          }
        }
      }
    })

    return cells
  }

  // Render cell
  const renderCell = (cell, day, timeIndex) => {
    if (cell.type === 'occupied') {
      return null // Spanned by previous cell
    }

    const dropZoneId = `${day}_${timeSlots[timeIndex]}`

    if (cell.type === 'empty') {
      // Drop zone for dragging OR click zone for add-break mode
      return (
        <DroppableZone key={timeIndex} id={dropZoneId}>
          <div 
            className={`drop-zone-inner ${addBreakMode ? 'add-break-active' : ''}`}
            onClick={() => handleSlotClick(day, timeSlots[timeIndex])}
            style={{ cursor: addBreakMode ? 'pointer' : 'default' }}
          >
            {addBreakMode ? '☕ Click to add break' : 'Drop here'}
          </div>
        </DroppableZone>
      )
    }

    // Handle break cells
    if (cell.type === 'break') {
      const breakData = cell.data
      const breakId = `break_${breakData.day}_${breakData.start_time}`
      
      const breakContent = (
        <div className="slot-content">
          <div className="slot-header">
            <span className="slot-subject">☕ {breakData.label || 'Break'}</span>
            <span className="drag-handle">⋮⋮</span>
            {breakData.isDefault && <span className="break-badge">Default</span>}
          </div>
          <div className="slot-details">
            <span className="slot-time">{convertTo12Hour(breakData.start_time)} - {convertTo12Hour(breakData.end_time)}</span>
            {!breakData.isDefault && (
              <button 
                className="delete-break-btn"
                onClick={() => deleteBreak(breakData.day, breakData.start_time)}
                title="Delete this break"
              >
                🗑️ Delete
              </button>
            )}
          </div>
        </div>
      )

      // ALL breaks are now draggable (including default ones!)
      return (
        <td 
          key={timeIndex} 
          colSpan={cell.span} 
          className="slot-cell break-slot draggable"
        >
          <DraggableSlot slot={{ _id: breakId, ...breakData }}>
            {breakContent}
          </DraggableSlot>
        </td>
      )
    }

    const slot = cell.data
    const isDraggable = cell.type === 'theory' && !cell.data.is_fixed_slot

    const slotContent = (
      <div className="slot-content">
        <div className="slot-header">
          <span className="slot-subject">{slot.subject_shortform || slot.subject_name}</span>
          {isDraggable && <span className="drag-handle">⋮⋮</span>}
          {cell.type === 'fixed' && <span className="fixed-badge">🔒 Fixed</span>}
          {cell.type === 'lab' && <span className="lab-badge">🧪 Lab</span>}
        </div>
        <div className="slot-details">
          <span className="slot-teacher">{slot.teacher_name}</span>
          <span className="slot-time">{convertTo12Hour(slot.start_time)} - {convertTo12Hour(slot.end_time)}</span>
        </div>
      </div>
    )

    if (isDraggable) {
      return (
        <td 
          key={timeIndex} 
          colSpan={cell.span} 
          className={`slot-cell ${cell.type}-slot draggable`}
        >
          <DraggableSlot slot={slot}>
            {slotContent}
          </DraggableSlot>
        </td>
      )
    }

    return (
      <td 
        key={timeIndex} 
        colSpan={cell.span} 
        className={`slot-cell ${cell.type}-slot fixed`}
      >
        {slotContent}
      </td>
    )
  }

  return (
    <div className="timetable-editor">
      <div className="editor-header">
        <h2>✏️ Timetable Editor</h2>
        <p>Drag & drop theory classes to adjust schedule (Labs and fixed slots cannot be moved)</p>
      </div>

      <div className="editor-controls">
        <div className="control-group">
          <label>Semester Type:</label>
          <div className="button-group">
            <button
              className={`toggle-btn ${semType === 'odd' ? 'active' : ''}`}
              onClick={() => setSemType('odd')}
            >
              {semType === 'odd' ? '✓ ' : ''}Odd
            </button>
            <button
              className={`toggle-btn ${semType === 'even' ? 'active' : ''}`}
              onClick={() => setSemType('even')}
            >
              {semType === 'even' ? '✓ ' : ''}Even
            </button>
          </div>
        </div>

        <div className="control-group">
          <label htmlFor="section-select">Section:</label>
          <select
            id="section-select"
            value={selectedSection}
            onChange={handleSectionChange}
            disabled={sections.length === 0}
          >
            <option value="">-- Choose a section --</option>
            {sections.map((section) => (
              <option key={section._id} value={section._id}>
                Semester {section.sem} - Section {section.section_name}
              </option>
            ))}
          </select>
        </div>

        {unsavedChanges > 0 && (
          <div className="changes-indicator">
            <span className="changes-count">⚠️ {unsavedChanges} unsaved changes</span>
            <button className="btn-save" onClick={saveChanges}>💾 Save All</button>
            <button className="btn-revert" onClick={revertChanges}>↩️ Revert</button>
          </div>
        )}
      </div>

      {loading && <div className="loading">Loading timetable...</div>}
      {error && <div className="error-message">{error}</div>}

      {timetable && (
        <div className="add-break-instruction">
          <button 
            className={`btn-add-break-mode ${addBreakMode ? 'active' : ''}`}
            onClick={() => setAddBreakMode(!addBreakMode)}
          >
            {addBreakMode ? '✅ Add Break Mode Active - Click any empty slot!' : '☕ Add Break'}
          </button>
          {addBreakMode && (
            <button 
              className="btn-cancel-mode"
              onClick={() => setAddBreakMode(false)}
            >
              ✗ Cancel
            </button>
          )}
        </div>
      )}

      {timetable && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          <div className="editor-grid">
            <table className="timetable-grid">
              <thead>
                <tr>
                  <th className="day-header">Day / Time</th>
                  {timeSlots.map((time, idx) => (
                    <th key={idx} className="time-header">
                      {time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDays.map((day) => {
                  const dayCells = buildDayGrid(day)
                  return (
                    <tr key={day}>
                      <td className="day-label">{day}</td>
                      {dayCells.map((cell, timeIndex) => renderCell(cell, day, timeIndex))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <DragOverlay>
            {activeSlot && (
              <div className="drag-preview">
                <div className="slot-content">
                  {activeSlot.isBreak ? (
                    <>
                      <span className="slot-subject">☕ {activeSlot.label || 'Break'}</span>
                      <span className="slot-time">{convertTo12Hour(activeSlot.start_time)} - {convertTo12Hour(activeSlot.end_time)}</span>
                    </>
                  ) : (
                    <>
                      <span className="slot-subject">{activeSlot.subject_shortform}</span>
                      <span className="slot-teacher">{activeSlot.teacher_name}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {conflicts.length > 0 && (
        <div className="conflicts-panel">
          <h4>⚠️ Conflicts Detected</h4>
          {conflicts.map((conflict, idx) => (
            <div key={idx} className="conflict-item">
              ❌ {conflict.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TimetableEditor
