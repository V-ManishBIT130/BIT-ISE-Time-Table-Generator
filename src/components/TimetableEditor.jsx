import { useState, useEffect, useRef } from 'react'
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import axios from 'axios'
import './TimetableEditor.css'

/**
 * TIMETABLE EDITOR - DRAG & DROP WITH PROTECTED SLOTS
 * 
 * CRITICAL FIX (Nov 2025):
 * ========================
 * Labs and Fixed Slots (OEC/PEC) are now PROTECTED from being overridden.
 * 
 * Changes Made:
 * 1. Added HARD BLOCK conflict detection for lab slots
 * 2. Added HARD BLOCK conflict detection for fixed slots (OEC/PEC)
 * 3. Time overlap checking (not just exact time match)
 * 4. Visual indicators: 🔒 for fixed slots, 🧪 for labs
 * 5. Enhanced CSS: thicker borders + glow effect for protected slots
 * 6. Alert modal changed: Hard blocks show error (no "OK to proceed")
 * 
 * Protected Slots:
 * - Lab Sessions: Cannot be moved or overridden (orange with 🧪)
 * - Fixed Slots (OEC/PEC): Cannot be moved or overridden (teal with 🔒)
 * 
 * Theory slots can still be dragged, but will be BLOCKED if:
 * - Target time overlaps with any lab session
 * - Target time overlaps with any fixed slot (OEC/PEC)
 */

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

// Empty Cell Component with Available Rooms
function EmptyCell({ day, time, addBreakMode, onSlotClick, showAvailableClassrooms, fetchRooms, timetableVersion }) {
  const [availableRooms, setAvailableRooms] = useState(null) // null = not loaded yet
  const [loading, setLoading] = useState(false)
  const [lastVersion, setLastVersion] = useState(null)
  
  // Reset available rooms when timetable changes (slot moved, room assigned, etc.)
  useEffect(() => {
    if (timetableVersion !== lastVersion && lastVersion !== null) {
      console.log(`🔄 EmptyCell ${day} ${time}: Timetable changed (v${lastVersion}→v${timetableVersion}), clearing cached rooms and forcing refetch`)
      setAvailableRooms(null)
      setLastVersion(timetableVersion)
      setLoading(false) // Reset loading state to allow immediate refetch
    } else if (lastVersion === null) {
      setLastVersion(timetableVersion)
    }
  }, [timetableVersion, lastVersion, day, time])
  
  useEffect(() => {
    if (showAvailableClassrooms && availableRooms === null && !loading) {
      setLoading(true)
      const loadRooms = async () => {
        try {
          const rooms = await fetchRooms(day, time)
          console.log(`🏫 EmptyCell ${day} ${time}: Received ${rooms?.length || 0} rooms`)
          setAvailableRooms(rooms || [])
        } catch (err) {
          console.error(`Error loading rooms for ${day} ${time}:`, err)
          setAvailableRooms([])
        } finally {
          setLoading(false)
        }
      }
      loadRooms()
    }
  }, [showAvailableClassrooms, day, time, availableRooms, loading, fetchRooms])
  
  // Reset when feature is turned off
  useEffect(() => {
    if (!showAvailableClassrooms) {
      setAvailableRooms(null)
      setLoading(false)
    }
  }, [showAvailableClassrooms])
  
  return (
    <div 
      className={`drop-zone-inner ${addBreakMode ? 'add-break-active' : ''}`}
      onClick={() => onSlotClick(day, time)}
      style={{ cursor: addBreakMode ? 'pointer' : 'default' }}
    >
      {addBreakMode ? (
        '☕ Click to add break'
      ) : showAvailableClassrooms ? (
        <div className="available-rooms-display">
          {loading || availableRooms === null ? (
            <div className="loading-rooms">⏳</div>
          ) : availableRooms.length > 0 ? (
            <>
              <div className="rooms-list">
                {availableRooms.slice(0, 2).map((room, idx) => (
                  <span key={idx} className="room-badge">{room.room_no}</span>
                ))}
                {availableRooms.length > 2 && (
                  <span className="room-more">+{availableRooms.length - 2}</span>
                )}
              </div>
            </>
          ) : (
            <div className="no-rooms">❌ None</div>
          )}
        </div>
      ) : (
        'Drop here'
      )}
    </div>
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
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [selectedSlotForRoom, setSelectedSlotForRoom] = useState(null)
  const [availableRooms, setAvailableRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  
  // NEW: State for unscheduled subjects and available classrooms
  const [unscheduledSubjects, setUnscheduledSubjects] = useState([])
  const [showUnscheduledPanel, setShowUnscheduledPanel] = useState(false)
  const [showAvailableClassrooms, setShowAvailableClassrooms] = useState(false)
  const [availableClassroomsCache, setAvailableClassroomsCache] = useState({})
  
  // NEW: Timetable version counter - increments on every state change to trigger EmptyCell refresh
  const [timetableVersion, setTimetableVersion] = useState(0)
  
  // Helper to update timetable and increment version
  const updateTimetableState = (updater) => {
    setTimetable(updater)
    setTimetableVersion(v => v + 1)
  }
  
  // NEW: Ref to track pending room fetch requests (prevents duplicate API calls)
  const pendingRoomRequests = useRef({})
  
  // NEW: Ref to track cache keys that should bypass cache (just cleared)
  const bypassCacheKeys = useRef(new Set())

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  )

  // Time slots: 8:00 AM to 4:30 PM in 30-minute intervals
  // Note: Last slot (4:30 PM) represents 4:30-5:00 PM (working hours end at 5:00 PM)
  const timeSlots = [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'
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

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyboard = (e) => {
      // Ctrl+Z or Cmd+Z (Mac) for Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      // Ctrl+Y or Ctrl+Shift+Z for Redo
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [undoStack, redoStack, timetable]) // Re-bind when stacks change

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
    setUndoStack([])
    setRedoStack([])

    try {
      const response = await axios.get(`/api/timetables/${sectionId}`, {
        params: { sem_type: semType }
      })

      if (response.data.success) {
        setTimetable(response.data.data)
        // Fetch unscheduled subjects for this section
        fetchUnscheduledSubjects(response.data.data)
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

  // NEW: Fetch unscheduled subjects
  const fetchUnscheduledSubjects = async (tt) => {
    if (!tt) return
    
    try {
      // Get all teacher assignments for this section
      const assignmentsResponse = await axios.get('/api/teacher-assignments', {
        params: {
          section_id: tt.section_id,
          academic_year: tt.academic_year
        }
      })

      if (!assignmentsResponse.data.success) return

      const allAssignments = assignmentsResponse.data.data
      
      console.log(`🔍 Checking unscheduled subjects for ${tt.section_name}:`)
      console.log(`   Total assignments: ${allAssignments.length}`)
      console.log(`   Theory slots: ${tt.theory_slots?.length || 0}`)
      console.log(`   Lab slots: ${tt.lab_slots?.length || 0}`)
      
      // Get all subject IDs that appear in theory_slots OR lab_slots
      const scheduledSubjectIds = new Set()
      
      // Add theory slots (safely)
      if (tt.theory_slots && Array.isArray(tt.theory_slots)) {
        tt.theory_slots.forEach(slot => {
          if (slot.subject_id) {
            scheduledSubjectIds.add(slot.subject_id._id?.toString() || slot.subject_id.toString())
          }
        })
      }
      
      // Add lab slots (safely check if exists)
      if (tt.lab_slots && Array.isArray(tt.lab_slots)) {
        tt.lab_slots.forEach(slot => {
          // Lab slots can have multiple batches, each with their own subject
          if (slot.batches && Array.isArray(slot.batches)) {
            slot.batches.forEach(batch => {
              if (batch.subject_id) {
                scheduledSubjectIds.add(batch.subject_id._id?.toString() || batch.subject_id.toString())
              }
            })
          }
        })
      }

      // Find theory subjects that are assigned but not scheduled anywhere
      const unscheduled = allAssignments.filter(assignment => {
        const subjectId = assignment.subject_id?._id?.toString() || assignment.subject_id?.toString()
        const subjectType = assignment.subject_id?.subject_type
        
        // Only show theory subjects (exclude labs, projects with labs, etc.)
        const isTheorySubject = subjectType === 'THEORY' || 
                               subjectType === 'THEORY_ELECTIVE' ||
                               subjectType === 'PROJECT' ||
                               subjectType === 'OTHER_DEPT'
        
        return isTheorySubject && !scheduledSubjectIds.has(subjectId)
      })

      console.log(`   Scheduled subject IDs: ${Array.from(scheduledSubjectIds).join(', ')}`)
      console.log(`   Unscheduled subjects found: ${unscheduled.length}`)
      if (unscheduled.length > 0) {
        console.log(`   Unscheduled details:`, unscheduled.map(a => ({
          subject_name: a.subject_id?.subject_name,
          subject_code: a.subject_id?.subject_code,
          subject_type: a.subject_id?.subject_type,
          subject_id: a.subject_id?._id?.toString()
        })))
      }

      setUnscheduledSubjects(unscheduled)
      console.log(`📋 Found ${unscheduled.length} unscheduled theory subjects for ${tt.section_name}`)
    } catch (err) {
      console.error('Error fetching unscheduled subjects:', err)
    }
  }

  // NEW: Fetch available classrooms for a specific time slot
  const fetchAvailableClassrooms = async (day, startTime) => {
    if (!timetable) return []
    
    const cacheKey = `${day}_${startTime}`
    
    console.log(`🔍 fetchAvailableClassrooms called for ${cacheKey}`)
    
    // Check if this key should bypass cache (just cleared due to slot move)
    const shouldBypassCache = bypassCacheKeys.current.has(cacheKey)
    if (shouldBypassCache) {
      console.log(`   ⚡ BYPASS CACHE for ${cacheKey} (cache was just cleared)`)
      bypassCacheKeys.current.delete(cacheKey) // Remove from bypass list
    } else if (availableClassroomsCache[cacheKey]) {
      // Check cache only if not in bypass list
      console.log(`   ✅ Cache HIT for ${cacheKey}: ${availableClassroomsCache[cacheKey].length} rooms`)
      return availableClassroomsCache[cacheKey]
    }
    
    // Check if there's already a pending request for this key
    if (pendingRoomRequests.current[cacheKey]) {
      console.log(`   ⏳ Request already pending for ${cacheKey}, waiting...`)
      return pendingRoomRequests.current[cacheKey]
    }
    
    console.log(`   ❌ Cache MISS for ${cacheKey}, fetching from API...`)
    
    // Helper: Convert "8:00 AM" to "08:00" (24-hour format)
    const convertTo24Hour = (time12h) => {
      const [time, period] = time12h.split(' ')
      let [hours, minutes] = time.split(':')
      hours = parseInt(hours)
      
      if (period === 'PM' && hours !== 12) {
        hours += 12
      } else if (period === 'AM' && hours === 12) {
        hours = 0
      }
      
      return `${String(hours).padStart(2, '0')}:${minutes}`
    }
    
    // 🆕 CRITICAL FIX: Check LOCAL state for occupied rooms FIRST (for instant updates)
    const getLocallyOccupiedRooms = (day, startTime) => {
      const startTime24 = convertTo24Hour(startTime)
      const occupiedRoomIds = new Set()
      
      // Check theory slots in current timetable state
      timetable.theory_slots.forEach(slot => {
        if (slot.day === day && slot.classroom_id) {
          // Check if this slot overlaps with the target time
          const slotStart24 = slot.start_time
          const slotEnd24 = slot.end_time
          
          // Calculate 30-min segments for this slot
          const slotStartMinutes = parseInt(slotStart24.split(':')[0]) * 60 + parseInt(slotStart24.split(':')[1])
          const slotEndMinutes = parseInt(slotEnd24.split(':')[0]) * 60 + parseInt(slotEnd24.split(':')[1])
          const targetStartMinutes = parseInt(startTime24.split(':')[0]) * 60 + parseInt(startTime24.split(':')[1])
          const targetEndMinutes = targetStartMinutes + 30
          
          // Check overlap
          if (slotStartMinutes < targetEndMinutes && slotEndMinutes > targetStartMinutes) {
            occupiedRoomIds.add(slot.classroom_id)
          }
        }
      })
      
      console.log(`   🏠 [LOCAL CHECK] Rooms occupied in current state at ${day} ${startTime}:`, Array.from(occupiedRoomIds))
      return occupiedRoomIds
    }
    
    const locallyOccupiedRooms = getLocallyOccupiedRooms(day, startTime)
    
    // Create the promise and store it
    const requestPromise = (async () => {
      try {
        // Convert to 24-hour format for API
        const startTime24 = convertTo24Hour(startTime)
        console.log(`   🔄 Converted ${startTime} → ${startTime24}`)
        
        // CRITICAL FIX: Calculate end time as 30 MINUTES (single slot duration)
        // EmptyCell represents ONE 30-minute slot, not a full hour
        const [hours, minutes] = startTime24.split(':')
        const startMinutes = parseInt(hours) * 60 + parseInt(minutes)
        const endMinutes = startMinutes + 30  // ← FIXED: 30 minutes for single slot
        const endHours = Math.floor(endMinutes / 60)
        const endMins = endMinutes % 60
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
        
        console.log(`   ⏰ Checking availability for single 30-min slot: ${startTime24} - ${endTime}`)
        
        const response = await axios.get('/api/classrooms/available', {
          params: {
            day,
            start_time: startTime24,
            end_time: endTime,
            sem_type: semType,
            academic_year: timetable.academic_year,
            // 🆕 Pass current timetable ID so backend can exclude it from checks
            exclude_timetable_id: timetable._id
          }
        })
        
        if (response.data.success) {
          let rooms = response.data.data
          
          // 🆕 FILTER OUT rooms that are occupied in LOCAL state (unsaved changes)
          const filteredRooms = rooms.filter(room => !locallyOccupiedRooms.has(room._id))
          
          console.log(`   🌐 [API] Returned ${rooms.length} rooms from other sections`)
          console.log(`   ✂️ [FILTER] Removed ${rooms.length - filteredRooms.length} locally occupied rooms`)
          console.log(`   💾 Caching ${filteredRooms.length} rooms for ${cacheKey}:`, filteredRooms.map(r => r.room_no).join(', '))
          
          // Cache the filtered result
          setAvailableClassroomsCache(prev => ({
            ...prev,
            [cacheKey]: filteredRooms
          }))
          
          // Clean up pending request
          delete pendingRoomRequests.current[cacheKey]
          
          return filteredRooms
        }
        
        // Clean up pending request
        delete pendingRoomRequests.current[cacheKey]
        return []
        
      } catch (err) {
        console.error('Error fetching available classrooms:', err)
        // Clean up pending request
        delete pendingRoomRequests.current[cacheKey]
        return []
      }
    })()
    
    // Store the pending promise
    pendingRoomRequests.current[cacheKey] = requestPromise
    
    return requestPromise
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
        const oldBreak = timetable.breaks[breakIndex]
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

        // Add to undo stack
        pushToUndoStack({
          type: 'move_break',
          oldDay: oldDay,
          oldStartTime: oldTime,
          oldEndTime: oldBreak.end_time,
          newDay: newDay,
          newStartTime: newStartTime,
          newEndTime: addHours(newStartTime, 0.5)
        })
        
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
      // Show conflict modal - user can revert or force (unless hard block)
      showConflictModal(slot, newDay, newStartTime, newEndTime, conflictCheck.conflicts, conflictCheck.isHardBlock)
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

    // Check 0: CRITICAL - Lab or Fixed Slot Conflict (HARD BLOCK - cannot override)
    const labConflict = (timetable.lab_slots || []).some(labSlot => {
      if (labSlot.day !== newDay) return false
      // Check if the new time range overlaps with the lab session
      const labStart = labSlot.start_time
      const labEnd = labSlot.end_time
      return (newStartTime < labEnd && newEndTime > labStart)
    })

    const fixedSlotConflict = (timetable.theory_slots || []).some(theorySlot => {
      if (theorySlot._id === slot._id) return false // Skip self
      if (!theorySlot.is_fixed_slot) return false // Only check fixed slots
      if (theorySlot.day !== newDay) return false
      // Check if the new time range overlaps with the fixed slot
      return (newStartTime < theorySlot.end_time && newEndTime > theorySlot.start_time)
    })

    console.log('   🚫 [CRITICAL CHECK] Lab/Fixed slot conflicts?', {
      lab: labConflict,
      fixed: fixedSlotConflict
    })

    if (labConflict) {
      console.log('   ❌ [BLOCKED] Cannot move - LAB SESSION at this time!')
      conflicts.push({
        type: 'lab_hard_block',
        message: `🚫 BLOCKED: Cannot schedule here - Lab session occupies ${newDay} at ${convertTo12Hour(newStartTime)}. Labs cannot be moved or overridden!`,
        isHardBlock: true
      })
    }

    if (fixedSlotConflict) {
      console.log('   ❌ [BLOCKED] Cannot move - FIXED SLOT (OEC/PEC) at this time!')
      conflicts.push({
        type: 'fixed_slot_hard_block',
        message: `🚫 BLOCKED: Cannot schedule here - Fixed slot (OEC/PEC) occupies ${newDay} at ${convertTo12Hour(newStartTime)}. Fixed slots cannot be moved or overridden!`,
        isHardBlock: true
      })
    }

    // If lab or fixed slot conflict detected, return immediately (don't proceed with other checks)
    if (labConflict || fixedSlotConflict) {
      return {
        hasConflicts: true,
        conflicts,
        isHardBlock: true
      }
    }

    // Check 1: Teacher conflict ACROSS ALL SECTIONS (backend check)
    if (slot.teacher_id && slot.teacher_name !== '[Other Dept]') {
      console.log('   🌐 [GLOBAL CHECK] Checking teacher conflicts across all sections...')
      
      try {
        const response = await axios.get('/api/timetables/check-teacher-conflict', {
          params: {
            teacher_id: slot.teacher_id,
            day: newDay,
            start_time: newStartTime,
            end_time: newEndTime,
            exclude_timetable_id: timetable._id,
            exclude_slot_id: slot._id
          }
        })

        if (response.data.hasConflict) {
          const conflict = response.data.conflict
          console.log('   ❌ [GLOBAL CONFLICT] Teacher is teaching in another section!', conflict)
          conflicts.push({
            type: 'teacher_global',
            message: `❌ GLOBAL Teacher Conflict: ${slot.teacher_name} is already teaching "${conflict.subject}" in Section ${conflict.section} at ${newDay} ${conflict.time || convertTo12Hour(newStartTime)}`
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
    // IMPROVED: Check for TIME OVERLAP, not just exact start time match
    const slotBusyTheory = timetable.theory_slots.some(s =>
      s._id !== slot._id &&
      s.day === newDay &&
      (s.start_time < newEndTime && s.end_time > newStartTime) // Overlap check
    )
    
    const slotBusyLab = (timetable.lab_slots || []).some(s =>
      s.day === newDay &&
      (s.start_time < newEndTime && s.end_time > newStartTime) // Overlap check
    )
    
    // Check for ACTIVE breaks only (exclude removed markers)
    const slotBusyBreak = (timetable.breaks || []).some(b =>
      b.day === newDay &&
      b.start_time < newEndTime &&
      b.end_time > newStartTime &&
      !b.isRemoved  // ← CRITICAL: Ignore removed breaks!
    )

    console.log('   ⏰ [SLOT CHECK] Time slot occupied?', {
      theory: slotBusyTheory,
      lab: slotBusyLab,
      break: slotBusyBreak,
      checkingRange: `${newStartTime} - ${newEndTime}`
    })

    if (slotBusyTheory || slotBusyLab || slotBusyBreak) {
      let conflictType = slotBusyBreak ? 'Break' : slotBusyLab ? 'Lab' : 'Class'
      
      // Find the conflicting slot(s) for better error message
      let conflictingItems = []
      if (slotBusyTheory) {
        conflictingItems = timetable.theory_slots.filter(s =>
          s._id !== slot._id &&
          s.day === newDay &&
          (s.start_time < newEndTime && s.end_time > newStartTime)
        )
      } else if (slotBusyLab) {
        conflictingItems = (timetable.lab_slots || []).filter(s =>
          s.day === newDay &&
          (s.start_time < newEndTime && s.end_time > newStartTime)
        )
      }
      
      const conflictDetails = conflictingItems.length > 0
        ? ` - Conflicts with: ${conflictingItems.map(s => `${s.subject_shortform || s.subject_name} (${convertTo12Hour(s.start_time)}-${convertTo12Hour(s.end_time)})`).join(', ')}`
        : ''
      
      console.log('   ❌ [SLOT CONFLICT] Time overlaps with:', conflictType, conflictDetails)
      conflicts.push({
        type: 'slot',
        message: `❌ Time Slot Conflict: ${newDay} ${convertTo12Hour(newStartTime)}-${convertTo12Hour(newEndTime)} overlaps with existing ${conflictType}${conflictDetails}`
      })
    }

    // Check 4: Break time conflict (if moving TO a default break time that hasn't been removed)
    const isDefaultBreakTime = (newStartTime === '11:00' || newStartTime === '13:30')
    
    // Check if this default break was explicitly removed by the user
    const defaultBreakWasRemoved = (timetable.breaks || []).some(b =>
      b.day === newDay &&
      b.start_time === newStartTime &&
      b.isDefault === true &&
      b.isRemoved === true
    )
    
    // Only warn if it's a default break time AND hasn't been removed
    if (isDefaultBreakTime && !defaultBreakWasRemoved) {
      console.log('   ⚠️ [BREAK WARNING] Scheduling over default break time (not removed)')
      conflicts.push({
        type: 'break',
        message: `⚠️ Warning: Scheduling during default break time (${convertTo12Hour(newStartTime)}). This will override the break.`
      })
    } else if (isDefaultBreakTime && defaultBreakWasRemoved) {
      console.log('   ✅ [BREAK REMOVED] Default break was removed - slot is free!')
    }

    // Check 5: Day length constraint (8 AM start → 4 PM end)
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
  const showConflictModal = (slot, newDay, newStartTime, newEndTime, conflicts, isHardBlock = false) => {
    console.log('⚠️ [CONFLICT MODAL] Showing user conflict warning', { isHardBlock })
    
    // Check if any conflict is a hard block (lab or fixed slot)
    const hasHardBlock = conflicts.some(c => c.isHardBlock === true)
    
    if (hasHardBlock) {
      // HARD BLOCK - Cannot proceed!
      const message = `🚫 MOVE BLOCKED!\n\nCannot move: ${slot.subject_shortform} (${slot.teacher_name})\nTo: ${newDay} ${convertTo12Hour(newStartTime)}\n\n${conflicts.map(c => c.message).join('\n')}\n\n❌ This move is NOT ALLOWED. Labs and Fixed Slots (OEC/PEC) are protected and cannot be overridden.`
      
      alert(message)
      console.log('🚫 [HARD BLOCK] Move completely blocked - no user override allowed')
      setConflicts([])
      return // Do not proceed
    }
    
    // SOFT CONFLICTS - Allow user override
    const message = `⚠️ CONFLICTS DETECTED!\n\nMoving: ${slot.subject_shortform} (${slot.teacher_name})\nTo: ${newDay} ${convertTo12Hour(newStartTime)}\n\nConflicts:\n${conflicts.map(c => c.message).join('\n')}\n\nDo you want to continue anyway?`
    
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
      slot: slot.subject_shortform,
      oldPosition: `${slot.day} ${slot.start_time}`,
      newPosition: `${newDay} ${newStartTime}`
    })

    // Check if classrooms were assigned (step >= 5)
    const classroomsAssigned = timetable.generation_metadata?.current_step >= 5
    const hadClassroom = slot.classroom_id || slot.classroom_name

    try {
      // Optimistic update - Reset classroom if step >= 5
      const updatedTheorySlots = timetable.theory_slots.map(s => 
        s._id === slot._id
          ? { 
              ...s, 
              day: newDay, 
              start_time: newStartTime, 
              end_time: newEndTime,
              // Clear classroom assignment if step >= 5
              classroom_id: classroomsAssigned ? null : s.classroom_id,
              classroom_name: classroomsAssigned ? null : s.classroom_name
            }
          : s
      )

      // CRITICAL FIX: Clear cache BEFORE updating timetable state
      // This ensures cache is cleared synchronously before EmptyCell tries to refetch
      if (classroomsAssigned && hadClassroom) {
        console.log('🗑️ [CLASSROOM RESET] Slot moved - clearing old slot cache BEFORE state update:', {
          oldRoom: slot.classroom_name,
          oldPosition: `${slot.day} ${slot.start_time}`,
          slot: slot.subject_shortform,
          duration: slot.duration_hours
        })
        
        // Invalidate cache for BOTH 30-min halves of the old position
        const oldStartCacheKey = `${slot.day}_${convertTo12Hour(slot.start_time)}`
        console.log(`🧹 [CACHE INVALIDATE] Clearing cache for old start: ${oldStartCacheKey}`)
        console.log(`   Old room being freed: ${slot.classroom_name}`)
        console.log(`   Slot duration: ${slot.duration_hours} hour(s)`)
        
        // Add to bypass list so fetchAvailableClassrooms won't use stale cache
        bypassCacheKeys.current.add(oldStartCacheKey)
        
        // If this is a 1-hour slot, also clear the second 30-min half
        if (slot.duration_hours === 1) {
          const [hours, minutes] = slot.start_time.split(':').map(Number)
          const midMinutes = hours * 60 + minutes + 30
          const midHours = Math.floor(midMinutes / 60)
          const midMins = midMinutes % 60
          const midTime24 = `${String(midHours).padStart(2, '0')}:${String(midMins).padStart(2, '0')}`
          const midCacheKey = `${slot.day}_${convertTo12Hour(midTime24)}`
          
          console.log(`🧹 [CACHE INVALIDATE] Also clearing cache for second half: ${midCacheKey}`)
          console.log(`   Both halves freed: ${slot.day} ${convertTo12Hour(slot.start_time)}-${convertTo12Hour(slot.end_time)}`)
          console.log(`   Room ${slot.classroom_name} should now show as available`)
          
          // Add second half to bypass list
          bypassCacheKeys.current.add(midCacheKey)
          
          setAvailableClassroomsCache(prev => {
            const newCache = { ...prev }
            const hadFirstHalf = oldStartCacheKey in prev
            const hadSecondHalf = midCacheKey in prev
            delete newCache[oldStartCacheKey]
            delete newCache[midCacheKey]
            console.log(`   ✅ Cache cleared BEFORE state update - 1st half cached: ${hadFirstHalf}, 2nd half cached: ${hadSecondHalf}`)
            console.log(`   ⚡ Added to bypass list: [${oldStartCacheKey}, ${midCacheKey}]`)
            console.log(`   📊 Remaining cache keys:`, Object.keys(newCache))
            return newCache
          })
        } else {
          // For non-1-hour slots, just clear the start time
          setAvailableClassroomsCache(prev => {
            const newCache = { ...prev }
            const wasCached = oldStartCacheKey in prev
            delete newCache[oldStartCacheKey]
            console.log(`   ✅ Cache cleared BEFORE state update - Was cached: ${wasCached}`)
            console.log(`   ⚡ Added to bypass list: [${oldStartCacheKey}]`)
            console.log(`   📊 Remaining cache keys:`, Object.keys(newCache))
            return newCache
          })
        }
      }

      // NOW update the timetable state (this increments version counter)
      updateTimetableState(prev => ({
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

      // Add to undo stack
      pushToUndoStack({
        type: 'move_slot',
        slotId: slot._id,
        oldDay: slot.day,
        oldStartTime: slot.start_time,
        oldEndTime: slot.end_time,
        oldClassroomId: slot.classroom_id,
        oldClassroomName: slot.classroom_name,
        newDay: newDay,
        newStartTime: newStartTime,
        newEndTime: newEndTime,
        classroomWasReset: classroomsAssigned && hadClassroom
      })

      setUnsavedChanges(prev => prev + 1)
      setConflicts([])

      console.log('✅ [UPDATE SUCCESS] Slot position updated in state')
      
      if (classroomsAssigned && hadClassroom) {
        console.log('⚠️ [USER REMINDER] Classroom was cleared - admin needs to reassign room')
        console.log('🔄 [CACHE STATUS] Old position cache invalidated - will show freed classroom on next fetch')
      }

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
    console.log('🗑️ [DELETE BREAK] Attempting to remove break:', { day, startTime })

    // Check if this is a default break being deleted
    const existingCustomBreak = (timetable.breaks || []).find(b => 
      b.day === day && b.start_time === startTime
    )

    const isDefaultBreak = !existingCustomBreak

    if (isDefaultBreak) {
      // Deleting a default break - confirm with user
      if (!confirm('Remove this default break? This will free the slot for theory classes.')) {
        return
      }

      console.log('☕ [REMOVE DEFAULT] User is removing default break at', `${day} ${startTime}`)

      // Add a "removed" marker to the breaks array
      // This tells the grid builder to skip this default break
      const removedBreakMarker = {
        day: day,
        start_time: startTime,
        end_time: addHours(startTime, 0.5),
        label: 'Removed',
        isDefault: true,
        isRemoved: true  // Special flag to skip default break
      }

      setTimetable(prev => ({
        ...prev,
        breaks: [...(prev.breaks || []), removedBreakMarker]
      }))

      // Add to undo stack
      pushToUndoStack({
        type: 'remove_default_break',
        day: day,
        startTime: startTime,
        endTime: addHours(startTime, 0.5)
      })

      console.log('✅ [REMOVE SUCCESS] Default break removed (slot now free)')
    } else {
      // Deleting a custom break - standard deletion
      if (!confirm('Delete this break?')) {
        return
      }

      console.log('🗑️ [DELETE CUSTOM] Removing custom break at', `${day} ${startTime}`)

      // Find the break data before deleting (for undo)
      const breakToDelete = timetable.breaks.find(b =>
        b.day === day && b.start_time === startTime
      )

      const updatedBreaks = timetable.breaks.filter(b => 
        !(b.day === day && b.start_time === startTime)
      )

      setTimetable(prev => ({
        ...prev,
        breaks: updatedBreaks
      }))

      // Add to undo stack
      if (breakToDelete) {
        pushToUndoStack({
          type: 'delete_break',
          day: day,
          startTime: startTime,
          breakData: breakToDelete
        })
      }

      console.log('✅ [DELETE SUCCESS] Custom break removed')
    }

    setUnsavedChanges(prev => prev + 1)
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

    // Add to undo stack
    pushToUndoStack({
      type: 'add_break',
      day: day,
      startTime: startTime,
      endTime: newBreak.end_time,
      label: 'Break'
    })

    setUnsavedChanges(prev => prev + 1)
    setAddBreakMode(false) // Deactivate after adding
    
    console.log('✅ [ADD BREAK SUCCESS] Break added to', `${day} ${convertTo12Hour(startTime)}`)
  }

  // Fetch available rooms for a slot
  const fetchAvailableRooms = async (day, startTime, endTime) => {
    console.log('🔍 [FETCH ROOMS] Getting available classrooms for', { day, startTime, endTime })
    
    setLoadingRooms(true)
    try {
      const response = await axios.get('/api/timetables/available-rooms', {
        params: {
          day,
          start_time: startTime,
          end_time: endTime,
          sem_type: semType,
          academic_year: timetable.academic_year,
          exclude_timetable_id: timetable._id
        }
      })

      if (response.data.success) {
        console.log('✅ [ROOMS FETCHED]', response.data.available_rooms.length, 'rooms available')
        console.log('   Rooms available for FULL duration', startTime, '-', endTime)
        setAvailableRooms(response.data.available_rooms)
      } else {
        console.error('❌ [FETCH FAILED]', response.data.message)
        setAvailableRooms([])
      }
    } catch (err) {
      console.error('❌ [FETCH ERROR]', err)
      setError('Failed to fetch available rooms')
      setAvailableRooms([])
    } finally {
      setLoadingRooms(false)
    }
  }

  // Open room selection modal
  const handleChangeRoom = async (slot) => {
    console.log('🏫 [CHANGE ROOM] Opening room selector for', slot.subject_shortform)
    
    // Find the CURRENT slot position from state (in case it was just moved)
    const currentSlot = timetable.theory_slots.find(s => s._id === slot._id)
    
    if (!currentSlot) {
      console.error('❌ [CHANGE ROOM ERROR] Slot not found in current timetable')
      setError('Slot not found')
      return
    }
    
    console.log('📍 [CURRENT POSITION]', {
      day: currentSlot.day,
      time: currentSlot.start_time,
      duration: currentSlot.duration_hours,
      subject: currentSlot.subject_shortform
    })
    
    // CRITICAL CHECK: If this is a 1-hour class, verify BOTH 30-minute slots are available
    if (currentSlot.duration_hours === 1) {
      // Check if next 30-minute slot is occupied
      const [hours, minutes] = currentSlot.start_time.split(':').map(Number)
      const nextSlotMinutes = hours * 60 + minutes + 30
      const nextSlotHours = Math.floor(nextSlotMinutes / 60)
      const nextSlotMins = nextSlotMinutes % 60
      const nextSlotTime = `${String(nextSlotHours).padStart(2, '0')}:${String(nextSlotMins).padStart(2, '0')}`
      
      console.log('⏰ [DURATION CHECK] Checking if next slot is available:', nextSlotTime)
      console.log('   Current timetable state:', {
        theory_slots_count: (timetable.theory_slots || []).length,
        lab_slots_count: (timetable.lab_slots || []).length,
        breaks_count: (timetable.breaks || []).length
      })
      
      // Check if any ACTUAL CLASS (not breaks) occupies the next 30-minute time
      // IMPORTANT: Breaks can be overridden, so we only check theory and lab slots
      const allSlots = [
        ...(timetable.theory_slots || []),
        ...(timetable.lab_slots || [])
        // DON'T include breaks - they can be overridden
      ]
      
      console.log(`   Checking ${allSlots.length} total slots (excluding breaks) for conflicts on ${currentSlot.day}`)
      
      const nextSlotEnd = addHours(nextSlotTime, 0.5)
      console.log(`   Next slot time range: ${nextSlotTime} - ${nextSlotEnd}`)
      
      const conflictingSlots = allSlots.filter(s => {
        if (s._id === currentSlot._id) return false // Skip self
        if (s.day !== currentSlot.day) return false // Different day
        
        // Check if this slot overlaps with the next 30-minute period
        const overlaps = (s.start_time < nextSlotEnd && s.end_time > nextSlotTime)
        
        if (overlaps) {
          console.log(`   🚫 Conflict found: ${s.subject_shortform || s.subject_name || 'Lab'} at ${s.start_time}-${s.end_time}`)
        }
        
        return overlaps
      })
      
      const nextSlotOccupied = conflictingSlots.length > 0
      
      if (nextSlotOccupied) {
        console.error('🚫 [BLOCKED] Next 30-minute slot is occupied - cannot assign 1-hour class')
        console.error('   Conflicting slots:', conflictingSlots.map(s => `${s.subject_shortform || s.subject_name || 'Lab Session'} (${s.start_time}-${s.end_time})`).join(', '))
        
        // Better error message showing what type of conflict
        const conflictTypes = conflictingSlots.map(s => {
          if (s.batches) return `Lab Session (${s.batches.length} batches)`
          return s.subject_shortform || s.subject_name || 'Unknown'
        }).join(', ')
        
        alert(`🚫 Cannot assign classroom!\n\nThis is a 1-hour class, but the next 30-minute slot (${convertTo12Hour(nextSlotTime)}) is already occupied.\n\nConflicting class(es): ${conflictTypes}\n\nYou cannot place a 1-hour class here. Please move this class to a time slot where BOTH 30-minute periods are free.`)
        return // Do not open modal
      }
      
      console.log('✅ [DURATION OK] Both 30-minute slots are available')
    }
    
    setSelectedSlotForRoom(currentSlot)
    setShowRoomModal(true)
    
    // Fetch available rooms for this slot's CURRENT time range (full duration)
    console.log('🔍 [ROOM MODAL] Fetching rooms for FULL duration:', currentSlot.start_time, '-', currentSlot.end_time)
    await fetchAvailableRooms(currentSlot.day, currentSlot.start_time, currentSlot.end_time)
  }

  // Update classroom assignment
  const handleUpdateClassroom = async (newRoomId, newRoomName) => {
    if (!selectedSlotForRoom) return

    console.log('💾 [UPDATE ROOM] Assigning', newRoomName, 'to', selectedSlotForRoom.subject_shortform)

    try {
      const response = await axios.patch(
        `/api/timetables/${timetable._id}/theory-slot/${selectedSlotForRoom._id}/classroom`,
        {
          classroom_id: newRoomId,
          classroom_name: newRoomName,
          // Send current position from frontend (in case slot was moved but not saved yet)
          current_day: selectedSlotForRoom.day,
          current_start_time: selectedSlotForRoom.start_time
        }
      )

      if (response.data.success) {
        console.log('✅ [ROOM UPDATED] Classroom assigned successfully')
        
        // Store old values for undo and cache clearing
        const oldRoomId = selectedSlotForRoom.classroom_id
        const oldRoomName = selectedSlotForRoom.classroom_name
        const slotDay = selectedSlotForRoom.day
        const slotStartTime = selectedSlotForRoom.start_time
        const slotDuration = selectedSlotForRoom.duration_hours || 1
        
        // CRITICAL FIX: Clear cache for this slot's time (for BOTH halves if 1-hour)
        console.log('🧹 [CACHE CLEAR] Clearing cache after classroom change')
        console.log(`   Slot: ${slotDay} ${convertTo12Hour(slotStartTime)}`)
        console.log(`   Duration: ${slotDuration} hour(s)`)
        console.log(`   Old room: ${oldRoomName || 'None'} → New room: ${newRoomName}`)
        
        // Clear first half cache
        const firstHalfKey = `${slotDay}_${convertTo12Hour(slotStartTime)}`
        console.log(`   Clearing cache key: ${firstHalfKey}`)
        
        // Add to bypass list (in case EmptyCell tries to fetch during state update batching)
        bypassCacheKeys.current.add(firstHalfKey)
        
        setAvailableClassroomsCache(prev => {
          const newCache = { ...prev }
          delete newCache[firstHalfKey]
          return newCache
        })
        
        // If 1-hour slot, also clear second half cache
        if (slotDuration === 1) {
          const [hours, minutes] = slotStartTime.split(':').map(Number)
          const midMinutes = hours * 60 + minutes + 30
          const midHours = Math.floor(midMinutes / 60)
          const midMins = midMinutes % 60
          const midTime24 = `${String(midHours).padStart(2, '0')}:${String(midMins).padStart(2, '0')}`
          const secondHalfKey = `${slotDay}_${convertTo12Hour(midTime24)}`
          
          console.log(`   Also clearing second half: ${secondHalfKey}`)
          
          // Add second half to bypass list
          bypassCacheKeys.current.add(secondHalfKey)
          
          setAvailableClassroomsCache(prev => {
            const newCache = { ...prev }
            delete newCache[secondHalfKey]
            return newCache
          })
          
          console.log(`   ⚡ Added to bypass list: [${firstHalfKey}, ${secondHalfKey}]`)
        } else {
          console.log(`   ⚡ Added to bypass list: [${firstHalfKey}]`)
        }

        // Update local state
        const updatedTheorySlots = timetable.theory_slots.map(s =>
          s._id === selectedSlotForRoom._id
            ? { ...s, classroom_id: newRoomId, classroom_name: newRoomName }
            : s
        )

        updateTimetableState(prev => ({
          ...prev,
          theory_slots: updatedTheorySlots
        }))
        
        console.log('✅ [CACHE CLEARED] Cache invalidated, EmptyCell will refresh on next check')

        // Add to undo stack
        pushToUndoStack({
          type: 'change_classroom',
          slotId: selectedSlotForRoom._id,
          oldRoomId,
          oldRoomName,
          newRoomId,
          newRoomName
        })

        setUnsavedChanges(prev => prev + 1)
        setShowRoomModal(false)
        setSelectedSlotForRoom(null)
      } else {
        console.error('❌ [UPDATE FAILED]', response.data.message)
        setError(response.data.message || 'Failed to update classroom')
      }
    } catch (err) {
      console.error('❌ [UPDATE ERROR]', err)
      if (err.response?.status === 409) {
        const conflictMsg = '⚠️ Conflict: This classroom is already occupied at this time by another section. Please choose a different room.'
        alert(conflictMsg)
        setError(conflictMsg)
        // Re-fetch available rooms to show updated list (with full duration)
        await fetchAvailableRooms(selectedSlotForRoom.day, selectedSlotForRoom.start_time, selectedSlotForRoom.end_time)
      } else {
        const errorMsg = 'Failed to update classroom: ' + (err.response?.data?.message || err.message)
        alert('❌ ' + errorMsg)
        setError(errorMsg)
      }
    }
  }

  // Close room modal
  const closeRoomModal = () => {
    setShowRoomModal(false)
    setSelectedSlotForRoom(null)
    setAvailableRooms([])
  }

  // Undo/Redo System
  const pushToUndoStack = (action) => {
    console.log('📝 [UNDO STACK] Saving action:', action.type)
    setUndoStack(prev => [...prev, action])
    setRedoStack([]) // Clear redo stack when new action is performed
  }

  const handleUndo = () => {
    if (undoStack.length === 0) {
      console.log('⚠️ [UNDO] Nothing to undo')
      return
    }

    const action = undoStack[undoStack.length - 1]
    console.log('↩️ [UNDO] Reverting action:', action.type)

    // Remove from undo stack
    setUndoStack(prev => prev.slice(0, -1))

    // Apply undo based on action type
    switch (action.type) {
      case 'move_slot':
        // Revert slot to original position (and restore classroom if it was reset)
        const updatedTheorySlots = timetable.theory_slots.map(s =>
          s._id === action.slotId
            ? { 
                ...s, 
                day: action.oldDay, 
                start_time: action.oldStartTime, 
                end_time: action.oldEndTime,
                // Restore classroom if it was reset during move
                classroom_id: action.classroomWasReset ? action.oldClassroomId : s.classroom_id,
                classroom_name: action.classroomWasReset ? action.oldClassroomName : s.classroom_name
              }
            : s
        )
        updateTimetableState(prev => ({
          ...prev,
          theory_slots: updatedTheorySlots
        }))
        setRedoStack(prev => [...prev, action])
        setUnsavedChanges(prev => prev - 1)
        console.log('✅ [UNDO] Slot moved back to', `${action.oldDay} ${action.oldStartTime}`)
        if (action.classroomWasReset) {
          console.log('✅ [UNDO] Classroom restored:', action.oldClassroomName)
        }
        break

      case 'move_break':
        // Revert break to original position
        const updatedBreaksMove = timetable.breaks.map(b =>
          b.day === action.newDay && b.start_time === action.newStartTime
            ? { ...b, day: action.oldDay, start_time: action.oldStartTime, end_time: action.oldEndTime }
            : b
        )
        setTimetable(prev => ({
          ...prev,
          breaks: updatedBreaksMove
        }))
        setRedoStack(prev => [...prev, action])
        setUnsavedChanges(prev => prev - 1)
        console.log('✅ [UNDO] Break moved back to', `${action.oldDay} ${action.oldStartTime}`)
        break

      case 'add_break':
        // Remove the break that was added
        const updatedBreaksRemove = timetable.breaks.filter(b =>
          !(b.day === action.day && b.start_time === action.startTime)
        )
        setTimetable(prev => ({
          ...prev,
          breaks: updatedBreaksRemove
        }))
        setRedoStack(prev => [...prev, action])
        setUnsavedChanges(prev => prev - 1)
        console.log('✅ [UNDO] Break addition reverted')
        break

      case 'delete_break':
        // Re-add the deleted break
        setTimetable(prev => ({
          ...prev,
          breaks: [...(prev.breaks || []), action.breakData]
        }))
        setRedoStack(prev => [...prev, action])
        setUnsavedChanges(prev => prev - 1)
        console.log('✅ [UNDO] Break deletion reverted')
        break

      case 'remove_default_break':
        // Remove the "removed" marker
        const updatedBreaksRestore = timetable.breaks.filter(b =>
          !(b.day === action.day && b.start_time === action.startTime && b.isRemoved)
        )
        setTimetable(prev => ({
          ...prev,
          breaks: updatedBreaksRestore
        }))
        setRedoStack(prev => [...prev, action])
        setUnsavedChanges(prev => prev - 1)
        console.log('✅ [UNDO] Default break restored')
        break

      case 'change_classroom':
        // Revert classroom assignment to old room
        const updatedSlotsUndo = timetable.theory_slots.map(s =>
          s._id === action.slotId
            ? { ...s, classroom_id: action.oldRoomId, classroom_name: action.oldRoomName }
            : s
        )
        setTimetable(prev => ({
          ...prev,
          theory_slots: updatedSlotsUndo
        }))
        setRedoStack(prev => [...prev, action])
        setUnsavedChanges(prev => prev - 1)
        console.log('✅ [UNDO] Classroom reverted to', action.oldRoomName || 'unassigned')
        break

      default:
        console.warn('⚠️ [UNDO] Unknown action type:', action.type)
    }
  }

  const handleRedo = () => {
    if (redoStack.length === 0) {
      console.log('⚠️ [REDO] Nothing to redo')
      return
    }

    const action = redoStack[redoStack.length - 1]
    console.log('↪️ [REDO] Re-applying action:', action.type)

    // Remove from redo stack
    setRedoStack(prev => prev.slice(0, -1))

    // Re-apply action
    switch (action.type) {
      case 'move_slot':
        const updatedTheorySlots = timetable.theory_slots.map(s =>
          s._id === action.slotId
            ? { 
                ...s, 
                day: action.newDay, 
                start_time: action.newStartTime, 
                end_time: action.newEndTime,
                // Clear classroom again if it was reset during original move
                classroom_id: action.classroomWasReset ? null : s.classroom_id,
                classroom_name: action.classroomWasReset ? null : s.classroom_name
              }
            : s
        )
        setTimetable(prev => ({
          ...prev,
          theory_slots: updatedTheorySlots
        }))
        setUndoStack(prev => [...prev, action])
        setUnsavedChanges(prev => prev + 1)
        console.log('✅ [REDO] Slot moved to', `${action.newDay} ${action.newStartTime}`)
        if (action.classroomWasReset) {
          console.log('🗑️ [REDO] Classroom cleared again (needs reassignment)')
        }
        break

      case 'move_break':
        const updatedBreaksMove = timetable.breaks.map(b =>
          b.day === action.oldDay && b.start_time === action.oldStartTime
            ? { ...b, day: action.newDay, start_time: action.newStartTime, end_time: action.newEndTime }
            : b
        )
        setTimetable(prev => ({
          ...prev,
          breaks: updatedBreaksMove
        }))
        setUndoStack(prev => [...prev, action])
        setUnsavedChanges(prev => prev + 1)
        console.log('✅ [REDO] Break moved to', `${action.newDay} ${action.newStartTime}`)
        break

      case 'add_break':
        const newBreak = {
          day: action.day,
          start_time: action.startTime,
          end_time: action.endTime,
          label: action.label
        }
        setTimetable(prev => ({
          ...prev,
          breaks: [...(prev.breaks || []), newBreak]
        }))
        setUndoStack(prev => [...prev, action])
        setUnsavedChanges(prev => prev + 1)
        console.log('✅ [REDO] Break re-added')
        break

      case 'delete_break':
        const updatedBreaksRemove = timetable.breaks.filter(b =>
          !(b.day === action.day && b.start_time === action.startTime)
        )
        setTimetable(prev => ({
          ...prev,
          breaks: updatedBreaksRemove
        }))
        setUndoStack(prev => [...prev, action])
        setUnsavedChanges(prev => prev + 1)
        console.log('✅ [REDO] Break deleted again')
        break

      case 'remove_default_break':
        const removedMarker = {
          day: action.day,
          start_time: action.startTime,
          end_time: action.endTime,
          label: 'Removed',
          isDefault: true,
          isRemoved: true
        }
        setTimetable(prev => ({
          ...prev,
          breaks: [...(prev.breaks || []), removedMarker]
        }))
        setUndoStack(prev => [...prev, action])
        setUnsavedChanges(prev => prev + 1)
        console.log('✅ [REDO] Default break removed again')
        break

      case 'change_classroom':
        // Re-apply classroom assignment to new room
        const updatedSlotsRedo = timetable.theory_slots.map(s =>
          s._id === action.slotId
            ? { ...s, classroom_id: action.newRoomId, classroom_name: action.newRoomName }
            : s
        )
        setTimetable(prev => ({
          ...prev,
          theory_slots: updatedSlotsRedo
        }))
        setUndoStack(prev => [...prev, action])
        setUnsavedChanges(prev => prev + 1)
        console.log('✅ [REDO] Classroom changed to', action.newRoomName)
        break

      default:
        console.warn('⚠️ [REDO] Unknown action type:', action.type)
    }
  }

  // Build grid data
  const buildDayGrid = (day) => {
    const cells = Array(timeSlots.length).fill(null).map(() => ({ type: 'empty' }))

    // Add default breaks (if no custom breaks exist for that slot AND not marked as removed)
    const customBreaks = timetable.breaks || []
    
    defaultBreakTimes.forEach((breakTime) => {
      const startIndex = getTimeSlotIndex(breakTime.start)
      const span = getTimeSpan(breakTime.start, breakTime.end)
      
      // Check if there's already a custom break at this time
      const hasCustomBreak = customBreaks.some(b => 
        b.day === day && b.start_time === breakTime.start && !b.isRemoved
      )

      // Check if this default break was explicitly removed by the user
      const isRemovedByUser = customBreaks.some(b => 
        b.day === day && b.start_time === breakTime.start && b.isDefault && b.isRemoved
      )
      
      // Only show default break if: not replaced by custom AND not removed by user
      if (!hasCustomBreak && !isRemovedByUser) {
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

    // Add custom breaks (skip removed markers)
    customBreaks.forEach((breakSlot) => {
      if (breakSlot.day === day && !breakSlot.isRemoved) {
        const startIndex = getTimeSlotIndex(breakSlot.start_time)
        const span = getTimeSpan(breakSlot.start_time, breakSlot.end_time)

        cells[startIndex] = {
          type: 'break',
          span,
          data: {
            ...breakSlot,
            isDefault: breakSlot.isDefault || false
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
          <EmptyCell
            day={day}
            time={timeSlots[timeIndex]}
            addBreakMode={addBreakMode}
            onSlotClick={handleSlotClick}
            showAvailableClassrooms={showAvailableClassrooms}
            fetchRooms={fetchAvailableClassrooms}
            timetableVersion={timetableVersion}
          />
        </DroppableZone>
      )
    }

    // Handle break cells
    if (cell.type === 'break') {
      const breakData = cell.data
      const breakId = `break_${breakData.day}_${breakData.start_time}`
      
      // Check if editing is allowed (Step 5 completed)
      const classroomsAssigned = timetable.generation_metadata?.current_step >= 5
      
      const breakContent = (
        <div className="slot-content">
          <div className="slot-header">
            <span className="slot-subject">☕ {breakData.label || 'Break'}</span>
            {classroomsAssigned && <span className="drag-handle">⋮⋮</span>}
            {!classroomsAssigned && <span className="locked-badge">🔒 Run Step 5</span>}
            {breakData.isDefault && <span className="break-badge">Default</span>}
          </div>
          <div className="slot-details">
            <span className="slot-time">{convertTo12Hour(breakData.start_time)} - {convertTo12Hour(breakData.end_time)}</span>
            {/* Breaks are only deletable after Step 5 */}
            {classroomsAssigned && (
              <button 
                className="delete-break-btn"
                onClick={() => deleteBreak(breakData.day, breakData.start_time)}
                title={breakData.isDefault ? "Remove default break (frees slot for theory)" : "Delete this break"}
              >
                🗑️ {breakData.isDefault ? 'Remove' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      )

      // Breaks are only draggable after Step 5
      if (classroomsAssigned) {
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
      } else {
        // Before Step 5: breaks are not draggable
        return (
          <td 
            key={timeIndex} 
            colSpan={cell.span} 
            className="slot-cell break-slot fixed"
          >
            {breakContent}
          </td>
        )
      }
    }

    const slot = cell.data
    // Check if classrooms have been assigned (step >= 5)
    const classroomsAssigned = timetable.generation_metadata?.current_step >= 5
    // Theory slots are ONLY draggable AFTER step 5 is completed
    // Before Step 5: No editing allowed (you need classrooms assigned first)
    // After Step 5: Draggable (classroom will be reset on move)
    const isDraggable = classroomsAssigned && cell.type === 'theory' && !cell.data.is_fixed_slot

    const slotContent = (
      <div className="slot-content">
        <div className="slot-header">
          <span className="slot-subject">{slot.subject_shortform || slot.subject_name}</span>
          {isDraggable && <span className="drag-handle">⋮⋮</span>}
          {!classroomsAssigned && cell.type === 'theory' && <span className="locked-badge">🔒 Run Step 5</span>}
          {cell.type === 'fixed' && <span className="fixed-badge">🔒 Fixed</span>}
          {cell.type === 'lab' && <span className="lab-badge">🧪 Lab</span>}
        </div>
        <div className="slot-details">
          <span className="slot-teacher">{slot.teacher_name}</span>
          <span className="slot-time">{convertTo12Hour(slot.start_time)} - {convertTo12Hour(slot.end_time)}</span>
        </div>
        
        {/* Show clickable classroom badge if step >= 5 and classroom assigned */}
        {classroomsAssigned && cell.type === 'theory' && slot.classroom_name && !slot.is_project && (
          <div 
            className={`classroom-badge clickable ${slot.is_fixed_slot ? 'fixed-classroom' : 'regular-classroom'}`}
            onClick={() => handleChangeRoom(slot)}
            title="Click to change classroom"
          >
            📍 {slot.classroom_name} ▼
          </div>
        )}
        
        {/* Show clickable warning badge if step >= 5 but classroom NOT assigned */}
        {classroomsAssigned && cell.type === 'theory' && !slot.classroom_name && !slot.is_project && (
          <div 
            className="warning-badge clickable"
            onClick={() => handleChangeRoom(slot)}
            title="Click to assign classroom"
          >
            ⚠️ Needs Room (Click)
          </div>
        )}
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
        {timetable && timetable.generation_metadata?.current_step >= 5 ? (
          <p>✏️ Drag theory slots to reschedule. <strong>Note:</strong> Moving a slot will clear its classroom assignment - you'll need to reassign a room.</p>
        ) : timetable && timetable.generation_metadata?.current_step === 4 ? (
          <p className="warning-message">⚠️ Editing is disabled until Step 5 (Classroom Assignment) is completed. Please run Step 5 first to assign classrooms, then you can edit the timetable.</p>
        ) : (
          <p>Please complete Step 4 (Theory Scheduling) and Step 5 (Classroom Assignment) before editing the timetable.</p>
        )}
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

        {timetable && (
          <div className="undo-redo-controls">
            <button 
              className="btn-undo" 
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl+Z)"
            >
              ↩️ Undo {undoStack.length > 0 && `(${undoStack.length})`}
            </button>
            <button 
              className="btn-redo" 
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Y)"
            >
              ↪️ Redo {redoStack.length > 0 && `(${redoStack.length})`}
            </button>
          </div>
        )}
        
        {timetable && (
          <div className="editor-features">
            <button 
              className={`btn-feature ${showUnscheduledPanel ? 'active' : ''}`}
              onClick={() => setShowUnscheduledPanel(!showUnscheduledPanel)}
              title="Show/hide unscheduled subjects"
            >
              📋 Unscheduled ({unscheduledSubjects.length})
            </button>
            <button 
              className={`btn-feature ${showAvailableClassrooms ? 'active' : ''}`}
              onClick={() => setShowAvailableClassrooms(!showAvailableClassrooms)}
              title="Show/hide available classrooms in empty slots"
            >
              🏫 Show Available Rooms
            </button>
          </div>
        )}
      </div>

      {loading && <div className="loading">Loading timetable...</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Unscheduled Subjects Panel */}
      {showUnscheduledPanel && unscheduledSubjects.length > 0 && (
        <div className="unscheduled-panel">
          <div className="panel-header">
            <h3>📋 Unscheduled Subjects ({unscheduledSubjects.length})</h3>
            <button 
              className="btn-close-panel"
              onClick={() => setShowUnscheduledPanel(false)}
            >
              ✗
            </button>
          </div>
          <div className="unscheduled-list">
            {unscheduledSubjects.map((assignment, idx) => (
              <div key={idx} className="unscheduled-item">
                <div className="subject-info">
                  <span className="subject-name">{assignment.subject_id?.subject_name || 'Unknown'}</span>
                  <span className="subject-code">({assignment.subject_id?.subject_shortform || 'N/A'})</span>
                </div>
                <div className="assignment-info">
                  <span className="teacher-name">👨‍🏫 {assignment.teacher_id?.name || 'No teacher'}</span>
                  <span className="hours-info">⏰ {assignment.subject_id?.hrs_per_week || 0} hrs/week</span>
                </div>
                <div className="instructions">
                  💡 Drag this subject into an empty slot to schedule it manually
                </div>
              </div>
            ))}
          </div>
          <div className="panel-footer">
            <p>ℹ️ These subjects couldn't be automatically scheduled. You can manually add them by dragging into empty slots.</p>
          </div>
        </div>
      )}

      {timetable && timetable.generation_metadata?.current_step >= 5 && (
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

      {/* Room Selection Modal */}
      {showRoomModal && selectedSlotForRoom && (
        <div className="modal-overlay" onClick={closeRoomModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏫 Change Classroom</h3>
              <button className="modal-close" onClick={closeRoomModal}>✕</button>
            </div>
            
            <div className="modal-body">
              <p><strong>Subject:</strong> {selectedSlotForRoom.subject_name}</p>
              <p><strong>Current Room:</strong> {selectedSlotForRoom.classroom_name || 'Not assigned'}</p>
              <p><strong>Time:</strong> {selectedSlotForRoom.day} {convertTo12Hour(selectedSlotForRoom.start_time)} - {convertTo12Hour(selectedSlotForRoom.end_time)}</p>
              <p><strong>Duration:</strong> {selectedSlotForRoom.duration_hours} hour(s)</p>
              
              <hr />
              
              <div className="info-box" style={{ 
                background: '#e3f2fd', 
                padding: '10px', 
                borderRadius: '5px', 
                marginBottom: '15px',
                border: '1px solid #2196f3'
              }}>
                <p style={{ margin: '0', fontSize: '14px', color: '#1565c0' }}>
                  ℹ️ <strong>Note:</strong> Rooms shown below are available for the <strong>FULL {selectedSlotForRoom.duration_hours}-hour duration</strong> 
                  ({convertTo12Hour(selectedSlotForRoom.start_time)} - {convertTo12Hour(selectedSlotForRoom.end_time)}).
                  {selectedSlotForRoom.duration_hours === 1 && (
                    <span> This includes BOTH 30-minute halves: {convertTo12Hour(selectedSlotForRoom.start_time)} - {convertTo12Hour(addHours(selectedSlotForRoom.start_time, 0.5))} 
                    AND {convertTo12Hour(addHours(selectedSlotForRoom.start_time, 0.5))} - {convertTo12Hour(selectedSlotForRoom.end_time)}.</span>
                  )}
                </p>
              </div>
              
              <h4>Available Classrooms:</h4>
              
              {loadingRooms ? (
                <div className="loading-rooms">Loading available rooms...</div>
              ) : availableRooms.length === 0 ? (
                <div className="no-rooms">⚠️ No classrooms available at this time</div>
              ) : (
                <div className="room-list">
                  {availableRooms.map((room) => (
                    <div 
                      key={room._id} 
                      className={`room-item ${selectedSlotForRoom.classroom_id === room._id ? 'current' : ''}`}
                      onClick={() => handleUpdateClassroom(room._id, room.classroom_name)}
                    >
                      <span className="room-name">📍 {room.classroom_name}</span>
                      <span className="room-type">{room.room_type}</span>
                      {selectedSlotForRoom.classroom_id === room._id && (
                        <span className="current-badge">✓ Current</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeRoomModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimetableEditor
