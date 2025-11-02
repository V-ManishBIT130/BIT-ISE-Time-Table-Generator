// ============================================
// FILE: GeneticAlgorithm.js
// PURPOSE: Optimize timetables using Genetic Algorithm (Phase 1)
// LEARN: Evolutionary algorithm for constraint satisfaction
// ============================================

import { Timetable, TimeUtils } from './utils/TimetableStructure.js';
import TeacherConflictValidator from './validators/TeacherConflictValidator.js';
import RoomConflictValidator from './validators/RoomConflictValidator.js';

/**
 * CLASS: GeneticAlgorithm
 * 
 * WHAT IT DOES:
 * Takes a "good" timetable from Greedy (fitness ~-200)
 * Evolves it over generations to eliminate conflicts
 * Target: fitness = 0 (zero violations)
 * 
 * STRATEGY:
 * 1. Create population from initial timetable (with mutations)
 * 2. Evaluate fitness of each timetable
 * 3. Select best timetables (tournament selection)
 * 4. Create offspring (crossover + mutation)
 * 5. Replace worst timetables with offspring
 * 6. Repeat until fitness = 0 or max generations reached
 * 
 * GENETIC OPERATORS:
 * - Crossover: Swap time slots between two parent timetables
 * - Mutation: Randomly change time slot of a subject/lab
 * - Selection: Keep best performing timetables
 */
class GeneticAlgorithm {
  
  constructor(config = {}) {
    // GA Parameters (tunable)
    this.POPULATION_SIZE = config.populationSize || 100;  // Increased from 50
    this.MAX_GENERATIONS = config.maxGenerations || 300;   // Increased from 200
    this.CROSSOVER_RATE = config.crossoverRate || 0.7;
    this.MUTATION_RATE = config.mutationRate || 0.4;       // Increased from 0.2
    this.TOURNAMENT_SIZE = config.tournamentSize || 5;
    this.ELITISM_COUNT = config.elitismCount || 3;         // Keep top 3
    
    // Early stopping - if no improvement for N generations
    this.STAGNATION_LIMIT = config.stagnationLimit || 50;
    
    // Working hours for time slot mutations
    this.WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    this.availableTimeSlots = this.generateTimeSlots();
    
    console.log('[GeneticAlgorithm] Initialized with config:');
    console.log(`  Population: ${this.POPULATION_SIZE}`);
    console.log(`  Max Generations: ${this.MAX_GENERATIONS}`);
    console.log(`  Crossover Rate: ${this.CROSSOVER_RATE}`);
    console.log(`  Mutation Rate: ${this.MUTATION_RATE}`);
  }
  
  /**
   * METHOD: generateTimeSlots
   * PURPOSE: Create all possible time slots within working hours
   */
  generateTimeSlots() {
    const slots = [];
    
    for (const day of this.WORKING_DAYS) {
      let currentTime = '08:00';
      const endTime = '17:00';
      
      while (TimeUtils.timeToMinutes(currentTime) < TimeUtils.timeToMinutes(endTime)) {
        // 1-hour slot
        const oneHourEnd = TimeUtils.addMinutes(currentTime, 60);
        if (TimeUtils.timeToMinutes(oneHourEnd) <= TimeUtils.timeToMinutes(endTime)) {
          slots.push({
            day: day,
            start_time: currentTime,
            end_time: oneHourEnd,
            duration_hours: 1
          });
        }
        
        // 2-hour slot
        const twoHourEnd = TimeUtils.addMinutes(currentTime, 120);
        if (TimeUtils.timeToMinutes(twoHourEnd) <= TimeUtils.timeToMinutes(endTime)) {
          slots.push({
            day: day,
            start_time: currentTime,
            end_time: twoHourEnd,
            duration_hours: 2
          });
        }
        
        currentTime = TimeUtils.addMinutes(currentTime, 60);
      }
    }
    
    return slots;
  }
  
  /**
   * METHOD: evolve
   * PURPOSE: Main GA loop - evolve timetable to fitness = 0
   * INPUT: initialTimetable - Starting timetable from Greedy
   * OUTPUT: Optimized timetable with zero conflicts
   */
  async evolve(initialTimetable, phase2Data) {
    console.log('\n' + '='.repeat(70));
    console.log('🧬 GENETIC ALGORITHM - STARTING EVOLUTION');
    console.log('='.repeat(70));
    
    // Step 1: Create initial population
    console.log('\n📊 Step 1: Creating initial population...');
    let population = this.createInitialPopulation(initialTimetable);
    
    // Evaluate initial population
    this.evaluatePopulation(population);
    
    let bestTimetable = this.getBestTimetable(population);
    let bestFitness = bestTimetable.getFitness();
    
    console.log(`   Initial best fitness: ${bestFitness}`);
    console.log(`   Target fitness: 0 (zero conflicts)\n`);
    
    // Step 2: Evolution loop
    console.log('🔄 Step 2: Starting evolution...\n');
    
    let stagnationCounter = 0;
    let lastBestFitness = bestFitness;
    
    for (let generation = 1; generation <= this.MAX_GENERATIONS; generation++) {
      // Create new generation
      const newPopulation = [];
      
      // Elitism: Keep best timetables unchanged
      const sortedPopulation = [...population].sort((a, b) => b.getFitness() - a.getFitness());
      for (let i = 0; i < this.ELITISM_COUNT; i++) {
        newPopulation.push(sortedPopulation[i].clone());
      }
      
      // Fill rest of population with offspring
      while (newPopulation.length < this.POPULATION_SIZE) {
        // Selection
        const parent1 = this.tournamentSelection(population);
        const parent2 = this.tournamentSelection(population);
        
        // Crossover
        let offspring;
        if (Math.random() < this.CROSSOVER_RATE) {
          offspring = this.crossover(parent1, parent2);
        } else {
          offspring = parent1.clone();
        }
        
        // Mutation
        if (Math.random() < this.MUTATION_RATE) {
          this.mutate(offspring, phase2Data);
        }
        
        newPopulation.push(offspring);
      }
      
      // Evaluate new population
      population = newPopulation;
      this.evaluatePopulation(population);
      
      // Track best
      const currentBest = this.getBestTimetable(population);
      const currentFitness = currentBest.getFitness();
      
      // Check for improvement
      if (currentFitness > bestFitness) {
        bestFitness = currentFitness;
        bestTimetable = currentBest.clone();
        stagnationCounter = 0;
        console.log(`   Gen ${generation}: 🔥 New best fitness = ${bestFitness}`);
      } else if (currentFitness === lastBestFitness) {
        stagnationCounter++;
      }
      
      lastBestFitness = currentFitness;
      
      // Progress report every 20 generations
      if (generation % 20 === 0) {
        const avgFitness = population.reduce((sum, t) => sum + t.getFitness(), 0) / population.length;
        console.log(`   Gen ${generation}: Best = ${bestFitness}, Avg = ${avgFitness.toFixed(2)}, Stagnant = ${stagnationCounter}`);
      }
      
      // Check if we reached perfection
      if (bestFitness === 0) {
        console.log(`\n🎉 PERFECT! Zero conflicts achieved at generation ${generation}!`);
        break;
      }
      
      // Early stopping if no improvement
      if (stagnationCounter >= this.STAGNATION_LIMIT) {
        console.log(`\n⚠️  Stopping early - no improvement for ${this.STAGNATION_LIMIT} generations`);
        break;
      }
    }
    
    // Final report
    console.log('\n' + '='.repeat(70));
    console.log('🧬 GENETIC ALGORITHM - COMPLETE');
    console.log('='.repeat(70));
    console.log(`   Final best fitness: ${bestFitness}`);
    console.log(`   Improvement: ${bestFitness - initialTimetable.getFitness()} points`);
    
    const conflicts = this.analyzeConflicts(bestTimetable);
    console.log(`\n   📊 Final Conflicts:`);
    console.log(`      Teacher conflicts: ${conflicts.teacherConflicts}`);
    console.log(`      Room conflicts: ${conflicts.roomConflicts}`);
    console.log(`      Total hard violations: ${conflicts.teacherConflicts + conflicts.roomConflicts}`);
    
    return bestTimetable;
  }
  
  /**
   * METHOD: createInitialPopulation
   * PURPOSE: Create population by mutating initial timetable
   */
  createInitialPopulation(initialTimetable) {
    const population = [];
    
    // Add the original timetable
    population.push(initialTimetable.clone());
    
    // Create variations by mutation
    for (let i = 1; i < this.POPULATION_SIZE; i++) {
      const mutated = initialTimetable.clone();
      
      // Apply multiple random mutations
      const mutationCount = Math.floor(Math.random() * 5) + 1;  // 1-5 mutations
      for (let j = 0; j < mutationCount; j++) {
        this.mutateRandomSlot(mutated);
      }
      
      population.push(mutated);
    }
    
    console.log(`   ✅ Created ${population.length} timetables`);
    return population;
  }
  
  /**
   * METHOD: evaluatePopulation
   * PURPOSE: Calculate fitness for all timetables
   */
  evaluatePopulation(population) {
    for (const timetable of population) {
      if (timetable.getFitness() === -Infinity) {
        this.calculateFitness(timetable);
      }
    }
  }
  
  /**
   * METHOD: calculateFitness
   * PURPOSE: Evaluate timetable quality (higher = better, 0 = perfect)
   * 
   * FITNESS FUNCTION:
   * - Hard constraints (MUST be zero): -100 per violation
   *   • Teacher conflicts (same teacher, same time)
   *   • Room conflicts (same room, same time)
   * 
   * - Soft constraints (minimize): -1 to -10 per violation
   *   • Gaps > 30 min: -5
   *   • Classes after 4 PM: -2
   *   • Unbalanced days: -3
   */
  calculateFitness(timetable) {
    let fitness = 0;
    
    // Hard Constraints
    const teacherConflicts = TeacherConflictValidator.validate(timetable);
    const roomConflicts = RoomConflictValidator.validate(timetable);
    
    fitness -= teacherConflicts.length * 100;  // Critical
    fitness -= roomConflicts.length * 100;     // Critical
    
    // Soft Constraints (TODO: Implement in future)
    // fitness -= this.countLargeGaps(timetable) * 5;
    // fitness -= this.countLateClasses(timetable) * 2;
    // fitness -= this.measureDayBalance(timetable) * 3;
    
    timetable.setFitness(fitness);
    return fitness;
  }
  
  /**
   * METHOD: analyzeConflicts
   * PURPOSE: Get detailed conflict breakdown
   */
  analyzeConflicts(timetable) {
    const teacherConflicts = TeacherConflictValidator.validate(timetable);
    const roomConflicts = RoomConflictValidator.validate(timetable);
    
    return {
      teacherConflicts: teacherConflicts.length,
      roomConflicts: roomConflicts.length,
      totalHardViolations: teacherConflicts.length + roomConflicts.length
    };
  }
  
  /**
   * METHOD: tournamentSelection
   * PURPOSE: Select parent using tournament (pick best from random sample)
   */
  tournamentSelection(population) {
    const tournament = [];
    
    for (let i = 0; i < this.TOURNAMENT_SIZE; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push(population[randomIndex]);
    }
    
    // Return best from tournament
    tournament.sort((a, b) => b.getFitness() - a.getFitness());
    return tournament[0];
  }
  
  /**
   * METHOD: crossover
   * PURPOSE: Create offspring by combining two parents
   * STRATEGY: Randomly swap theory slots between parents
   */
  crossover(parent1, parent2) {
    const offspring = parent1.clone();
    
    // Randomly swap some theory slots from parent2
    const swapCount = Math.floor(offspring.theory_slots.length * 0.3);  // Swap 30%
    
    for (let i = 0; i < swapCount; i++) {
      const randomIndex = Math.floor(Math.random() * offspring.theory_slots.length);
      
      if (randomIndex < parent2.theory_slots.length) {
        offspring.theory_slots[randomIndex] = { ...parent2.theory_slots[randomIndex] };
      }
    }
    
    // Reset fitness (needs recalculation)
    offspring.setFitness(-Infinity);
    
    return offspring;
  }
  
  /**
   * METHOD: mutate
   * PURPOSE: Intelligently modify timetable to resolve conflicts
   * STRATEGY: Target specific conflicting slots and move them to conflict-free slots
   */
  mutate(timetable, phase2Data) {
    // Find slots with conflicts
    const teacherConflicts = TeacherConflictValidator.validate(timetable);
    const roomConflicts = RoomConflictValidator.validate(timetable);
    
    if (teacherConflicts.length > 0) {
      // SMART MUTATION: Fix teacher conflicts by moving conflicting slots
      for (let i = 0; i < Math.min(2, teacherConflicts.length); i++) {
        const conflict = teacherConflicts[i];
        this.resolveTeacherConflict(timetable, conflict, phase2Data);
      }
    }
    
    if (roomConflicts.length > 0) {
      // SMART MUTATION: Fix room conflicts by moving conflicting slots
      for (let i = 0; i < Math.min(2, roomConflicts.length); i++) {
        const conflict = roomConflicts[i];
        this.resolveRoomConflict(timetable, conflict, phase2Data);
      }
    }
    
    // If no conflicts, do random exploration
    if (teacherConflicts.length === 0 && roomConflicts.length === 0) {
      this.mutateRandomSlot(timetable);
    }
    
    // Reset fitness
    timetable.setFitness(-Infinity);
  }
  
  /**
   * METHOD: resolveTeacherConflict
   * PURPOSE: Move one of the conflicting slots to a time when teacher is free
   */
  resolveTeacherConflict(timetable, conflict, phase2Data) {
    // Conflict has: teacher_id, day, start_time, conflicting_slots[]
    const conflictingSlots = conflict.slots || [];
    
    if (conflictingSlots.length < 2) return;
    
    // Pick one slot to move (prefer theory over lab since labs are harder to move)
    const slotToMove = conflictingSlots.find(s => s.type === 'theory') || conflictingSlots[0];
    
    if (slotToMove.type === 'theory') {
      // Find the actual slot in timetable
      const slotIndex = timetable.theory_slots.findIndex(s => 
        s.day === slotToMove.day && 
        s.start_time === slotToMove.start_time &&
        s.teacher_id?.toString() === conflict.teacher_id?.toString()
      );
      
      if (slotIndex >= 0) {
        const slot = timetable.theory_slots[slotIndex];
        
        // Find a conflict-free time slot for this teacher
        const newSlot = this.findConflictFreeSlot(timetable, slot, 'teacher');
        
        if (newSlot) {
          slot.day = newSlot.day;
          slot.start_time = newSlot.start_time;
          slot.end_time = newSlot.end_time;
        }
      }
    }
  }
  
  /**
   * METHOD: resolveRoomConflict
   * PURPOSE: Move one of the conflicting slots to a different room or time
   */
  resolveRoomConflict(timetable, conflict, phase2Data) {
    const conflictingSlots = conflict.slots || [];
    
    if (conflictingSlots.length < 2) return;
    
    // Pick one slot to move
    const slotToMove = conflictingSlots[0];
    
    if (slotToMove.type === 'theory') {
      const slotIndex = timetable.theory_slots.findIndex(s => 
        s.day === slotToMove.day && 
        s.start_time === slotToMove.start_time &&
        s.classroom_id?.toString() === conflict.classroom_id?.toString()
      );
      
      if (slotIndex >= 0) {
        const slot = timetable.theory_slots[slotIndex];
        
        // Try finding a different time first
        const newSlot = this.findConflictFreeSlot(timetable, slot, 'room');
        
        if (newSlot) {
          slot.day = newSlot.day;
          slot.start_time = newSlot.start_time;
          slot.end_time = newSlot.end_time;
        } else if (phase2Data && phase2Data.classrooms && phase2Data.classrooms.length > 1) {
          // If can't find new time, try different room
          const currentRoomId = slot.classroom_id?.toString();
          const newRoom = phase2Data.classrooms.find(r => r._id.toString() !== currentRoomId);
          
          if (newRoom) {
            slot.classroom_id = newRoom._id;
            slot.classroom_name = newRoom.room_no;
          }
        }
      }
    }
  }
  
  /**
   * METHOD: findConflictFreeSlot
   * PURPOSE: Find a time slot where teacher/room is available
   */
  findConflictFreeSlot(timetable, slot, conflictType) {
    const suitableSlots = this.availableTimeSlots.filter(
      s => s.duration_hours === slot.duration_hours
    );
    
    // Shuffle for randomness
    const shuffled = suitableSlots.sort(() => Math.random() - 0.5);
    
    for (const candidateSlot of shuffled) {
      // Check if this slot causes conflicts
      let hasConflict = false;
      
      for (const existingSlot of timetable.theory_slots) {
        // Skip the slot we're trying to move
        if (existingSlot === slot) continue;
        
        // Check if same time
        if (existingSlot.day !== candidateSlot.day || 
            existingSlot.start_time !== candidateSlot.start_time) {
          continue;
        }
        
        // Check for teacher conflict
        if (conflictType === 'teacher') {
          if (existingSlot.teacher_id?.toString() === slot.teacher_id?.toString()) {
            hasConflict = true;
            break;
          }
        }
        
        // Check for room conflict
        if (conflictType === 'room') {
          if (existingSlot.classroom_id?.toString() === slot.classroom_id?.toString()) {
            hasConflict = true;
            break;
          }
        }
      }
      
      if (!hasConflict) {
        return candidateSlot;
      }
    }
    
    return null;  // No conflict-free slot found
  }
  
  /**
   * METHOD: mutateRandomSlot
   * PURPOSE: Change time slot of a random theory session
   */
  mutateRandomSlot(timetable) {
    if (timetable.theory_slots.length === 0) return;
    
    // Pick random theory slot
    const randomIndex = Math.floor(Math.random() * timetable.theory_slots.length);
    const slot = timetable.theory_slots[randomIndex];
    
    // Find new available time slot with same duration
    const newSlot = this.findRandomAvailableSlot(timetable, slot.duration_hours);
    
    if (newSlot) {
      slot.day = newSlot.day;
      slot.start_time = newSlot.start_time;
      slot.end_time = newSlot.end_time;
    }
  }
  
  /**
   * METHOD: findRandomAvailableSlot
   * PURPOSE: Find a random time slot (not necessarily conflict-free)
   */
  findRandomAvailableSlot(timetable, durationHours) {
    const suitableSlots = this.availableTimeSlots.filter(
      slot => slot.duration_hours === durationHours
    );
    
    if (suitableSlots.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * suitableSlots.length);
    return suitableSlots[randomIndex];
  }
  
  /**
   * METHOD: getBestTimetable
   * PURPOSE: Get timetable with highest fitness
   */
  getBestTimetable(population) {
    return population.reduce((best, current) => 
      current.getFitness() > best.getFitness() ? current : best
    );
  }
}

export default GeneticAlgorithm;
