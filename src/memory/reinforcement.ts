/**
 * Memory reinforcement logic.
 *
 * Reinforcement increases memory strength when:
 * - The memory is explicitly referenced
 * - A similar event occurs
 * - Related context is accessed
 *
 * @module
 */

import type { Memory, ReinforcementResult } from "../types/mod.ts";
import { calculateStrength } from "./strength.ts";

/**
 * Calculate reinforcement delta based on current strength.
 *
 * The reinforcement amount decreases as the memory gets stronger,
 * preventing unlimited growth.
 *
 * Formula: delta = 0.15 * (1.0 - current_strength)
 *
 * This means:
 * - At strength 0.5: delta = 0.075 (7.5% boost)
 * - At strength 0.8: delta = 0.03 (3% boost)
 * - At strength 1.0: delta = 0.0 (no boost)
 *
 * @param currentStrength - Current memory strength
 * @returns Reinforcement delta to add
 */
export function calculateReinforcementDelta(currentStrength: number): number {
  // Cap the calculation at 1.0 to prevent negative deltas for over-strengthened memories
  const cappedStrength = Math.min(currentStrength, 1.0);
  return 0.15 * (1.0 - cappedStrength);
}

/**
 * Apply reinforcement to a memory.
 *
 * Updates:
 * - Initial strength (increased by delta)
 * - Current strength (recalculated from new initial)
 * - Last reinforced timestamp
 * - Reinforcement count (incremented)
 *
 * @param memory - Memory to reinforce (will be mutated)
 * @param reason - Reason for reinforcement
 * @param now - Current time (defaults to now)
 * @returns Result with old and new strength values
 */
export function applyReinforcement(
  memory: Memory,
  reason: string,
  now: Date = new Date(),
): ReinforcementResult {
  // Calculate current strength before reinforcement
  const currentStrength = calculateStrength(memory.strength, memory.fade, now);
  const previousStrength = currentStrength;

  // Calculate reinforcement delta
  const delta = calculateReinforcementDelta(currentStrength);

  // Update initial strength (this is what we boost)
  const newInitial = memory.strength.initial + delta;

  // Update strength tracking
  memory.strength.initial = newInitial;
  memory.strength.last_reinforced = now.toISOString();
  memory.strength.reinforcement_count += 1;

  // Current strength is now equal to initial (since we just reinforced)
  memory.strength.current = newInitial;
  const newStrength = newInitial;

  return {
    id: memory.id,
    previousStrength,
    newStrength,
    delta,
    reason,
  };
}

/**
 * Check if reinforcement would have meaningful effect.
 *
 * Returns false if:
 * - Memory is already very strong (> 1.5)
 * - Memory was reinforced very recently (< 1 day ago)
 *
 * @param memory - Memory to check
 * @param now - Current time (defaults to now)
 * @returns True if reinforcement would be meaningful
 */
export function shouldReinforce(memory: Memory, now: Date = new Date()): boolean {
  const currentStrength = calculateStrength(memory.strength, memory.fade, now);

  // Don't reinforce if already very strong
  if (currentStrength > 1.5) {
    return false;
  }

  // Don't reinforce if just reinforced
  const lastReinforced = new Date(memory.strength.last_reinforced);
  const hoursSinceReinforcement = (now.getTime() - lastReinforced.getTime()) / (1000 * 60 * 60);
  if (hoursSinceReinforcement < 24) {
    return false;
  }

  return true;
}
