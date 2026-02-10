/**
 * Memory strength calculation with exponential decay.
 *
 * Formula: strength(t) = max(min_strength, initial * (0.5 ^ (days / half_life)))
 *
 * @module
 */

import type { Memory, MemoryFade, MemoryStrength } from "../types/mod.ts";

/**
 * Calculate current memory strength based on time elapsed and decay parameters.
 *
 * Uses exponential decay formula:
 * strength(t) = max(min_strength, initial * (0.5 ^ (days_since_reinforcement / half_life)))
 *
 * @param strength - Memory strength tracking
 * @param fade - Memory fade parameters
 * @param now - Current time (defaults to now)
 * @returns Current strength value (0.0 to 1.0+)
 *
 * @example
 * ```ts
 * const strength = {
 *   initial: 1.0,
 *   current: 1.0,
 *   last_reinforced: "2025-01-01T00:00:00Z",
 *   reinforcement_count: 0
 * };
 * const fade = { half_life_days: 90, min_strength: 0.1 };
 * const now = new Date("2025-03-31T00:00:00Z"); // 90 days later
 *
 * const currentStrength = calculateStrength(strength, fade, now);
 * // currentStrength ≈ 0.5 (half-life reached)
 * ```
 */
export function calculateStrength(
  strength: MemoryStrength,
  fade: MemoryFade,
  now: Date = new Date(),
): number {
  const lastReinforced = new Date(strength.last_reinforced);
  const daysSinceReinforcement = (now.getTime() - lastReinforced.getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay: 0.5 ^ (days / half_life)
  const decayFactor = Math.pow(0.5, daysSinceReinforcement / fade.half_life_days);
  const decayedStrength = strength.initial * decayFactor;

  // Apply minimum strength floor
  return Math.max(fade.min_strength, decayedStrength);
}

/**
 * Calculate current strength for a complete memory object.
 *
 * @param memory - Memory object
 * @param now - Current time (defaults to now)
 * @returns Current strength value
 */
export function getMemoryStrength(memory: Memory, now: Date = new Date()): number {
  return calculateStrength(memory.strength, memory.fade, now);
}

/**
 * Check if a memory is considered "weak" (below a threshold).
 *
 * @param memory - Memory object
 * @param threshold - Strength threshold (default: 0.2)
 * @param now - Current time (defaults to now)
 * @returns True if memory strength is below threshold
 */
export function isWeakMemory(
  memory: Memory,
  threshold: number = 0.2,
  now: Date = new Date(),
): boolean {
  return getMemoryStrength(memory, now) < threshold;
}

/**
 * Get default half-life based on significance level.
 *
 * - high: 180 days (6 months)
 * - medium: 90 days (3 months)
 * - low: 30 days (1 month)
 *
 * @param significance - Memory significance level
 * @returns Default half-life in days
 */
export function getDefaultHalfLife(significance: "high" | "medium" | "low"): number {
  switch (significance) {
    case "high":
      return 180;
    case "medium":
      return 90;
    case "low":
      return 30;
  }
}
