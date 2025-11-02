/**
 * ============================================
 * BEE COLONY OPTIMIZATION ALGORITHM
 * ============================================
 * 
 * Inspired by the foraging behavior of honey bees:
 * - Scout Bees: Explore new solutions randomly
 * - Employed Bees: Exploit good solutions with local search
 * - Onlooker Bees: Follow employed bees based on solution quality
 * - Abandonment: Poor solutions are replaced by new random ones
 * 
 * ADVANTAGES over Genetic Algorithm:
 * - Better exploration-exploitation balance
 * - More diverse solution space coverage
 * - Adaptive neighborhood search
 * - Natural escape from local optima
 */

import TeacherConflictValidator from './validators/TeacherConflictValidator.js';
import RoomConflictValidator from './validators/RoomConflictValidator.js';
import { Timetable } from './utils/TimetableStructure.js';

class BeeAlgorithm {
  constructor(options = {}) {
    // Bee colony parameters
    this.colonySize = options.colonySize || 50; // Total food sources
    this.scoutBees = Math.floor(this.colonySize * 0.1); // 10% scouts
    this.employedBees = this.colonySize - this.scoutBees;
    this.onlookerBees = this.employedBees;
    this.maxCycles = options.maxCycles || 300;
    this.limit = options.limit || 50; // Abandonment threshold
    this.neighborhoodSize = options.neighborhoodSize || 3; // Local search range
    
    this.bestSolution = null;
    this.bestFitness = -Infinity;
    this.stagnationCounter = 0;
    this.maxStagnation = 50;
    
    console.log('\n🐝 BEE COLONY OPTIMIZATION INITIALIZED');
    console.log(`   Colony: ${this.colonySize} food sources`);
    console.log(`   Scouts: ${this.scoutBees} | Employed: ${this.employedBees} | Onlookers: ${this.onlookerBees}`);
    console.log(`   Max Cycles: ${this.maxCycles}`);
    console.log(`   Abandonment Limit: ${this.limit}`);
  }

  /**
   * Main optimization loop
   */
  optimize(initialTimetable, phase2Data) {
    console.log('\n🐝 STARTING BEE COLONY OPTIMIZATION...\n');
    
    // Initialize food sources (solutions)
    const foodSources = this.initializeFoodSources(initialTimetable, phase2Data);
    
    // Track trials (failures) for each food source
    const trials = new Array(this.colonySize).fill(0);
    
    let previousBest = this.bestFitness;
    
    // Main optimization cycle
    for (let cycle = 0; cycle < this.maxCycles; cycle++) {
      
      // PHASE 1: Employed Bees - Exploit current food sources
      this.employedBeePhase(foodSources, trials, phase2Data);
      
      // PHASE 2: Onlooker Bees - Probabilistically select and improve
      this.onlookerBeePhase(foodSources, trials, phase2Data);
      
      // PHASE 3: Scout Bees - Replace abandoned food sources
      this.scoutBeePhase(foodSources, trials, initialTimetable, phase2Data);
      
      // Check for improvement
      if (this.bestFitness > previousBest) {
        const improvement = this.bestFitness - previousBest;
        console.log(`   🐝 Cycle ${cycle + 1}: Fitness improved by ${improvement.toFixed(0)} → ${this.bestFitness.toFixed(0)}`);
        previousBest = this.bestFitness;
        this.stagnationCounter = 0;
      } else {
        this.stagnationCounter++;
      }
      
      // Progress report every 50 cycles
      if ((cycle + 1) % 50 === 0) {
        const conflicts = this.countConflicts(this.bestSolution);
        console.log(`   📊 Cycle ${cycle + 1}/${this.maxCycles}: Best Fitness = ${this.bestFitness.toFixed(0)}, Conflicts = ${conflicts.teacher + conflicts.room}`);
      }
      
      // Early stopping if solution is perfect
      if (this.bestFitness === 0) {
        console.log(`\n   ✅ Perfect solution found at cycle ${cycle + 1}!`);
        break;
      }
      
      // Early stopping if stagnant
      if (this.stagnationCounter >= this.maxStagnation) {
        console.log(`\n   ⚠️  Stopping early - no improvement for ${this.maxStagnation} cycles`);
        break;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🐝 BEE COLONY OPTIMIZATION - COMPLETE');
    console.log('='.repeat(70));
    console.log(`   Final best fitness: ${this.bestFitness.toFixed(0)}`);
    
    const finalConflicts = this.countConflicts(this.bestSolution);
    console.log(`   Final conflicts: ${finalConflicts.teacher} teacher, ${finalConflicts.room} room`);
    
    return this.bestSolution;
  }

  /**
   * Initialize food sources (random solutions around initial)
   */
  initializeFoodSources(initialTimetable, phase2Data) {
    const foodSources = [];
    
    // First food source is the initial solution
    const initial = initialTimetable.clone();
    initial.fitness = this.evaluateFitness(initial);
    foodSources.push(initial);
    
    if (initial.fitness > this.bestFitness) {
      this.bestFitness = initial.fitness;
      this.bestSolution = initial.clone();
    }
    
    // Generate rest through random perturbations
    for (let i = 1; i < this.colonySize; i++) {
      const neighbor = this.generateNeighbor(initialTimetable, phase2Data, 5);
      neighbor.fitness = this.evaluateFitness(neighbor);
      foodSources.push(neighbor);
      
      if (neighbor.fitness > this.bestFitness) {
        this.bestFitness = neighbor.fitness;
        this.bestSolution = neighbor.clone();
      }
    }
    
    console.log(`   ✓ Initialized ${this.colonySize} food sources`);
    console.log(`   ✓ Initial best fitness: ${this.bestFitness.toFixed(0)}`);
    
    return foodSources;
  }

  /**
   * PHASE 1: Employed Bees - Each employed bee modifies its food source
   */
  employedBeePhase(foodSources, trials, phase2Data) {
    for (let i = 0; i < this.employedBees; i++) {
      const currentSource = foodSources[i];
      
      // Generate neighbor solution
      const neighbor = this.generateNeighbor(currentSource, phase2Data, this.neighborhoodSize);
      neighbor.fitness = this.evaluateFitness(neighbor);
      
      // Greedy selection
      if (neighbor.fitness > currentSource.fitness) {
        foodSources[i] = neighbor;
        trials[i] = 0; // Reset trial counter
        
        // Update global best
        if (neighbor.fitness > this.bestFitness) {
          this.bestFitness = neighbor.fitness;
          this.bestSolution = neighbor.clone();
        }
      } else {
        trials[i]++; // Increment failure counter
      }
    }
  }

  /**
   * PHASE 2: Onlooker Bees - Probabilistically select and improve sources
   */
  onlookerBeePhase(foodSources, trials, phase2Data) {
    // Calculate selection probabilities based on fitness
    const probabilities = this.calculateProbabilities(foodSources);
    
    for (let i = 0; i < this.onlookerBees; i++) {
      // Roulette wheel selection
      const selectedIndex = this.rouletteWheelSelection(probabilities);
      const selectedSource = foodSources[selectedIndex];
      
      // Generate neighbor
      const neighbor = this.generateNeighbor(selectedSource, phase2Data, this.neighborhoodSize);
      neighbor.fitness = this.evaluateFitness(neighbor);
      
      // Greedy selection
      if (neighbor.fitness > selectedSource.fitness) {
        foodSources[selectedIndex] = neighbor;
        trials[selectedIndex] = 0;
        
        // Update global best
        if (neighbor.fitness > this.bestFitness) {
          this.bestFitness = neighbor.fitness;
          this.bestSolution = neighbor.clone();
        }
      } else {
        trials[selectedIndex]++;
      }
    }
  }

  /**
   * PHASE 3: Scout Bees - Replace abandoned food sources
   */
  scoutBeePhase(foodSources, trials, initialTimetable, phase2Data) {
    for (let i = 0; i < this.colonySize; i++) {
      if (trials[i] >= this.limit) {
        // Abandon this food source and generate new random solution
        const newSource = this.generateNeighbor(initialTimetable, phase2Data, 10); // Larger perturbation
        newSource.fitness = this.evaluateFitness(newSource);
        foodSources[i] = newSource;
        trials[i] = 0;
        
        // Update global best if lucky
        if (newSource.fitness > this.bestFitness) {
          this.bestFitness = newSource.fitness;
          this.bestSolution = newSource.clone();
        }
      }
    }
  }

  /**
   * Generate neighbor solution through intelligent mutations
   */
  generateNeighbor(timetable, phase2Data, numMutations) {
    const neighbor = timetable.clone();
    
    // Detect conflicts first
    const teacherConflicts = TeacherConflictValidator.validate(neighbor);
    const roomConflicts = RoomConflictValidator.validate(neighbor);
    
    if (teacherConflicts.length > 0 || roomConflicts.length > 0) {
      // Intelligent conflict resolution
      for (let i = 0; i < Math.min(numMutations, teacherConflicts.length); i++) {
        this.resolveTeacherConflict(neighbor, teacherConflicts[i], phase2Data);
      }
      
      for (let i = 0; i < Math.min(numMutations, roomConflicts.length); i++) {
        this.resolveRoomConflict(neighbor, roomConflicts[i], phase2Data);
      }
    } else {
      // Random perturbation for exploration
      for (let i = 0; i < numMutations; i++) {
        this.randomMutation(neighbor, phase2Data);
      }
    }
    
    return neighbor;
  }

  /**
   * Resolve teacher conflict by moving slot to conflict-free time
   */
  resolveTeacherConflict(timetable, conflict, phase2Data) {
    const slot = conflict.slots[0];
    if (!slot) return;
    
    const newSlot = this.findConflictFreeSlot(timetable, slot, 'teacher');
    if (newSlot) {
      slot.day = newSlot.day;
      slot.time = newSlot.time;
    }
  }

  /**
   * Resolve room conflict by changing room or time
   */
  resolveRoomConflict(timetable, conflict, phase2Data) {
    const slot = conflict.slots[0];
    if (!slot) return;
    
    const newSlot = this.findConflictFreeSlot(timetable, slot, 'room');
    if (newSlot) {
      slot.day = newSlot.day;
      slot.time = newSlot.time;
      if (newSlot.room) slot.room = newSlot.room;
    }
  }

  /**
   * Find conflict-free slot for a given slot
   */
  findConflictFreeSlot(timetable, slot, conflictType) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const times = ['08:00', '10:00', '12:00', '14:00', '16:00'];
    
    // Try different times and days
    for (const day of days) {
      for (const time of times) {
        if (day === slot.day && time === slot.time) continue;
        
        // Check if this time is conflict-free
        const testSlot = { ...slot, day, time };
        
        if (conflictType === 'teacher') {
          const hasConflict = timetable.some(s => 
            s !== slot &&
            s.day === day &&
            s.time === time &&
            s.teacher === slot.teacher
          );
          if (!hasConflict) return { day, time };
        } else if (conflictType === 'room') {
          const hasConflict = timetable.some(s =>
            s !== slot &&
            s.day === day &&
            s.time === time &&
            s.room === slot.room
          );
          if (!hasConflict) return { day, time };
        }
      }
    }
    
    return null;
  }

  /**
   * Random mutation for exploration
   */
  randomMutation(timetable, phase2Data) {
    if (timetable.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * timetable.length);
    const slot = timetable[randomIndex];
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const times = ['08:00', '10:00', '12:00', '14:00', '16:00'];
    
    // Change to random day/time
    slot.day = days[Math.floor(Math.random() * days.length)];
    slot.time = times[Math.floor(Math.random() * times.length)];
  }

  /**
   * Calculate selection probabilities for onlooker bees
   */
  calculateProbabilities(foodSources) {
    // Normalize fitness to positive values
    const minFitness = Math.min(...foodSources.map(f => f.fitness));
    const adjustedFitnesses = foodSources.map(f => f.fitness - minFitness + 1);
    
    const totalFitness = adjustedFitnesses.reduce((sum, f) => sum + f, 0);
    
    if (totalFitness === 0) {
      // Equal probabilities if all same
      return foodSources.map(() => 1 / foodSources.length);
    }
    
    return adjustedFitnesses.map(f => f / totalFitness);
  }

  /**
   * Roulette wheel selection
   */
  rouletteWheelSelection(probabilities) {
    const r = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < probabilities.length; i++) {
      cumulative += probabilities[i];
      if (r <= cumulative) {
        return i;
      }
    }
    
    return probabilities.length - 1;
  }

  /**
   * Evaluate fitness (negative conflicts)
   */
  evaluateFitness(timetable) {
    const teacherConflicts = TeacherConflictValidator.validate(timetable);
    const roomConflicts = RoomConflictValidator.validate(timetable);
    
    // Fitness = negative number of conflicts (0 is best)
    return -(teacherConflicts.length * 100 + roomConflicts.length * 100);
  }

  /**
   * Count conflicts for reporting
   */
  countConflicts(timetable) {
    const teacherConflicts = TeacherConflictValidator.validate(timetable);
    const roomConflicts = RoomConflictValidator.validate(timetable);
    
    return {
      teacher: teacherConflicts.length,
      room: roomConflicts.length
    };
  }
}

export default BeeAlgorithm;
