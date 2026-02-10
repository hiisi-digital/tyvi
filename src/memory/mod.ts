/**
 * Memory system module.
 *
 * Provides operations for managing memories with fading and reinforcement.
 *
 * @module
 */

import type {
  Memory,
  MemoryFilters,
  MemoryInput,
  MemoryQuery,
  MemorySummary,
  PruneResult,
  ReinforcementResult,
} from "../types/mod.ts";

import { listMemoryIds, readMemory, writeMemory } from "./storage.ts";
import { createMemory, pruneWeakMemories } from "./lifecycle.ts";
import { applyReinforcement, shouldReinforce } from "./reinforcement.ts";
import { filterMemories, queryMemories } from "./query.ts";
import { logReinforcement } from "./logs.ts";

// ============================================================================
// Public API
// ============================================================================

/**
 * Recall memories matching a query.
 *
 * Returns full memory objects with filtering, sorting, and pagination.
 *
 * @param dataPath - Base data directory path
 * @param query - Query parameters
 * @returns Array of matching memories
 *
 * @example
 * ```ts
 * const memories = await recallMemories("/data", {
 *   person: "ctx://person/alex",
 *   topic: "oauth",
 *   minStrength: 0.3,
 *   sortBy: "strength",
 *   limit: 10
 * });
 * ```
 */
export async function recallMemories(
  dataPath: string,
  query: MemoryQuery,
): Promise<Memory[]> {
  const memoryIds = await listMemoryIds(dataPath);
  const memories: Memory[] = [];

  for (const id of memoryIds) {
    try {
      const memory = await readMemory(dataPath, id);
      memories.push(memory);
    } catch (error) {
      console.error(`Failed to read memory ${id}:`, error);
    }
  }

  return queryMemories(memories, query);
}

/**
 * List memories with simple filtering.
 *
 * Returns lightweight memory summaries.
 *
 * @param dataPath - Base data directory path
 * @param filters - Optional filter criteria
 * @returns Array of memory summaries
 *
 * @example
 * ```ts
 * const summaries = await listMemories("/data", {
 *   person: "ctx://person/alex",
 *   topic: "security",
 *   includeWeak: false
 * });
 * ```
 */
export async function listMemories(
  dataPath: string,
  filters?: MemoryFilters,
): Promise<MemorySummary[]> {
  const memoryIds = await listMemoryIds(dataPath);
  const memories: Memory[] = [];

  for (const id of memoryIds) {
    try {
      const memory = await readMemory(dataPath, id);
      memories.push(memory);
    } catch (error) {
      console.error(`Failed to read memory ${id}:`, error);
    }
  }

  return filterMemories(memories, filters);
}

/**
 * Record a new memory.
 *
 * @param dataPath - Base data directory path
 * @param input - Memory input data
 * @returns Created memory
 *
 * @example
 * ```ts
 * const memory = await recordMemory("/data", {
 *   person: "ctx://person/alex",
 *   content: {
 *     summary: "Led OAuth2 design review",
 *     detail: "Discovered missing PKCE in mobile flow",
 *     significance: "high"
 *   },
 *   tags: {
 *     topics: ["oauth", "security"],
 *     people: ["ctx://person/viktor"],
 *     outcome: "positive"
 *   }
 * });
 * ```
 */
export async function recordMemory(
  dataPath: string,
  input: MemoryInput,
): Promise<Memory> {
  return await createMemory(dataPath, input);
}

/**
 * Reinforce an existing memory.
 *
 * Increases memory strength when referenced or related events occur.
 *
 * @param dataPath - Base data directory path
 * @param id - Memory ID to reinforce
 * @param reason - Reason for reinforcement
 * @returns Reinforcement result with strength changes
 *
 * @example
 * ```ts
 * const result = await reinforceMemory(
 *   "/data",
 *   "alex-oauth-2025-02",
 *   "Referenced during OAuth implementation"
 * );
 * console.log(`Strength: ${result.previousStrength} → ${result.newStrength}`);
 * ```
 */
export async function reinforceMemory(
  dataPath: string,
  id: string,
  reason: string,
): Promise<ReinforcementResult> {
  const memory = await readMemory(dataPath, id);

  // Check if reinforcement is meaningful
  if (!shouldReinforce(memory)) {
    return {
      id: memory.id,
      previousStrength: memory.strength.current,
      newStrength: memory.strength.current,
      delta: 0,
      reason: "Reinforcement skipped (too recent or too strong)",
    };
  }

  // Apply reinforcement
  const result = applyReinforcement(memory, reason);

  // Log the reinforcement
  logReinforcement(memory, reason, result.delta);

  // Save updated memory
  await writeMemory(dataPath, memory);

  return result;
}

/**
 * Prune weak memories below threshold.
 *
 * Removes memories that have faded below the minimum strength threshold.
 *
 * @param dataPath - Base data directory path
 * @returns Prune result with count and IDs of removed memories
 *
 * @example
 * ```ts
 * const result = await pruneMemories("/data");
 * console.log(`Pruned ${result.pruned} of ${result.checked} memories`);
 * ```
 */
export async function pruneMemories(dataPath: string): Promise<PruneResult> {
  return await pruneWeakMemories(dataPath);
}

// ============================================================================
// Re-export utility types and functions for advanced usage
// ============================================================================

export { calculateStrength, getDefaultHalfLife, getMemoryStrength } from "./strength.ts";
export { calculateSimilarity, findSimilarMemories } from "./similarity.ts";
export { toMemorySummary } from "./query.ts";
