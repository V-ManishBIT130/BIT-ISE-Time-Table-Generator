// ============================================
// FILE: TimetableStructure.js
// PURPOSE: Define how we represent a timetable in code
// LEARN: This is our "chromosome" - the DNA of a timetable
// ============================================

/**
 * CLASS: Timetable
 * 
 * This is the CORE data structure that represents a complete weekly timetable.
 * Think of it as a "solution candidate" that the algorithm will evolve.
 * 
 * COMPONENTS:
 * 1. theory_slots: All theory class sessions
 * 2. lab_slots: All lab sessions (with batch assignments)
 * 3. fitness: Score indicating how good this timetable is (higher = better)
 * 4. violations: Detailed list of constraint violations
 */
class Timetable {
  constructor() {
    // ==========================================
    // THEORY SLOTS
    // Stores: When and where each theory class happens
    // ==========================================
    this.theory_slots = [];
    // Example structure:
    // {
    //   id: "slot_001",
    //   subject_id: ObjectId("..."),
    //   subject_name: "Data Structures",
    //   subject_shortform: "DS",
    //   section_id: ObjectId("..."),
    //   section_name: "3A",
    //   teacher_id: ObjectId("..."),
    //   teacher_name: "Prof. Deeksha Chandra",
    //   teacher_shortform: "DC",
    //   classroom_id: ObjectId("..."),
    //   classroom_name: "ISE-601",
    //   day: "Monday",
    //   start_time: "08:00",
    //   end_time: "10:00",
    //   duration_hours: 2,
    //   subject_type: "regular_theory" // regular_theory, other_dept, project, oec, pec
    // }

    // ==========================================
    // LAB SLOTS
    // Stores: When and where each lab session happens
    // IMPORTANT: All batches of a section together (batch sync!)
    // ==========================================
    this.lab_slots = [];
    // Example structure:
    // {
    //   id: "lab_slot_001",
    //   lab_id: ObjectId("..."),
    //   lab_name: "Data Structures Lab",
    //   lab_shortform: "DSL",
    //   section_id: ObjectId("..."),
    //   section_name: "3A",
    //   batches: [
    //     {
    //       batch_name: "3A1",
    //       teacher1_id: ObjectId("..."),
    //       teacher1_name: "Prof. DC",
    //       teacher2_id: ObjectId("..."),
    //       teacher2_name: "Prof. AK",
    //       lab_room_id: ObjectId("..."),
    //       lab_room_name: "ISE-301"
    //     },
    //     {
    //       batch_name: "3A2",
    //       teacher1_id: ObjectId("..."),
    //       teacher1_name: "Prof. Rajeev",
    //       teacher2_id: ObjectId("..."),
    //       teacher2_name: "Prof. Suman",
    //       lab_room_id: ObjectId("..."),
    //       lab_room_name: "ISE-302"
    //     },
    //     {
    //       batch_name: "3A3",
    //       teacher1_id: ObjectId("..."),
    //       teacher1_name: "Prof. Arjun",
    //       teacher2_id: ObjectId("..."),
    //       teacher2_name: "Prof. Priya",
    //       lab_room_id: ObjectId("..."),
    //       lab_room_name: "ISE-303"
    //     }
    //   ],
    //   day: "Monday",
    //   start_time: "08:00",
    //   end_time: "10:00",
    //   duration_hours: 2 // Always 2 hours for labs
    // }

    // ==========================================
    // FITNESS SCORE
    // Higher is better! (0 = perfect, negative = violations)
    // ==========================================
    this.fitness = -Infinity;

    // ==========================================
    // VIOLATIONS
    // Detailed breakdown of what's wrong with this timetable
    // Helps us understand WHY fitness is low
    // ==========================================
    this.violations = {
      hard_constraints: [],  // MUST be zero for valid timetable
      soft_constraints: []   // Should be minimized for quality
    };
    // Example:
    // hard_constraints: [
    //   { type: 'teacher_conflict', teacher: 'DC', day: 'Monday', time: '08:00-10:00' },
    //   { type: 'room_conflict', room: 'ISE-601', day: 'Monday', time: '08:00-10:00' }
    // ]
    // soft_constraints: [
    //   { type: 'excessive_gap', section: '3A', day: 'Monday', gap_minutes: 60 },
    //   { type: 'non_consecutive_theory', subject: 'DS', section: '3A' }
    // ]

    // ==========================================
    // METADATA
    // Additional information for tracking
    // ==========================================
    this.metadata = {
      generation: 0,           // Which generation created this
      created_by: 'unknown',   // greedy, crossover, mutation, etc.
      parent_ids: [],          // IDs of parent timetables (for GA)
      created_at: new Date()
    };
  }

  // ==========================================
  // METHOD: clone
  // PURPOSE: Create an exact copy of this timetable
  // WHY: GA needs to copy and modify timetables
  // ==========================================
  clone() {
    const cloned = new Timetable();
    
    // Deep clone theory slots (array of objects)
    cloned.theory_slots = this.theory_slots.map(slot => ({ ...slot }));
    
    // Deep clone lab slots (more complex - nested batches)
    cloned.lab_slots = this.lab_slots.map(slot => ({
      ...slot,
      batches: slot.batches.map(batch => ({ ...batch }))
    }));
    
    cloned.fitness = this.fitness;
    cloned.violations = {
      hard_constraints: [...this.violations.hard_constraints],
      soft_constraints: [...this.violations.soft_constraints]
    };
    cloned.metadata = { ...this.metadata };
    
    return cloned;
  }

  // ==========================================
  // METHOD: getTotalSlots
  // PURPOSE: Count how many time slots are scheduled
  // ==========================================
  getTotalSlots() {
    return this.theory_slots.length + this.lab_slots.length;
  }

  // ==========================================
  // METHOD: getHardViolationCount
  // PURPOSE: Count critical constraint violations
  // WHY: Hard violations = invalid timetable
  // ==========================================
  getHardViolationCount() {
    return this.violations.hard_constraints.length;
  }

  // ==========================================
  // METHOD: getSoftViolationCount
  // PURPOSE: Count quality constraint violations
  // WHY: Soft violations = valid but not optimal
  // ==========================================
  getSoftViolationCount() {
    return this.violations.soft_constraints.length;
  }

  // ==========================================
  // METHOD: isValid
  // PURPOSE: Check if timetable has zero hard violations
  // ==========================================
  isValid() {
    return this.getHardViolationCount() === 0;
  }

  // ==========================================
  // METHOD: toString
  // PURPOSE: Human-readable summary for debugging
  // ==========================================
  toString() {
    return `Timetable [Fitness: ${this.fitness}, Slots: ${this.getTotalSlots()}, ` +
           `Hard Violations: ${this.getHardViolationCount()}, ` +
           `Soft Violations: ${this.getSoftViolationCount()}]`;
  }

  // ==========================================
  // METHOD: getSummary
  // PURPOSE: Detailed statistics for analysis
  // ==========================================
  getSummary() {
    return {
      total_slots: this.getTotalSlots(),
      theory_slots: this.theory_slots.length,
      lab_slots: this.lab_slots.length,
      fitness: this.fitness,
      hard_violations: this.getHardViolationCount(),
      soft_violations: this.getSoftViolationCount(),
      is_valid: this.isValid(),
      metadata: this.metadata
    };
  }
}

// ==========================================
// HELPER: Time utilities
// PURPOSE: Work with time strings ("08:00", "10:30")
// ==========================================
class TimeUtils {
  /**
   * Convert time string to minutes since midnight
   * Example: "08:00" → 480, "10:30" → 630
   */
  static timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes to time string
   * Example: 480 → "08:00", 630 → "10:30"
   */
  static minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Check if two time ranges overlap
   * Example: (08:00-10:00) overlaps with (09:00-11:00) → true
   *          (08:00-10:00) overlaps with (10:00-12:00) → false (exact boundary OK)
   */
  static timeRangesOverlap(start1, end1, start2, end2) {
    const start1Min = this.timeToMinutes(start1);
    const end1Min = this.timeToMinutes(end1);
    const start2Min = this.timeToMinutes(start2);
    const end2Min = this.timeToMinutes(end2);

    // Overlap if: start1 < end2 AND start2 < end1
    return start1Min < end2Min && start2Min < end1Min;
  }

  /**
   * Calculate gap between two consecutive time slots
   * Returns gap in minutes, or -1 if they overlap
   */
  static calculateGap(end1, start2) {
    const end1Min = this.timeToMinutes(end1);
    const start2Min = this.timeToMinutes(start2);
    return start2Min - end1Min;
  }

  /**
   * Add minutes to a time string
   * Example: addMinutes("08:00", 120) → "10:00"
   */
  static addMinutes(timeStr, minutesToAdd) {
    const totalMinutes = this.timeToMinutes(timeStr) + minutesToAdd;
    return this.minutesToTime(totalMinutes);
  }
}

// ==========================================
// EXPORTS
// ==========================================
export { Timetable, TimeUtils };
