/**
 * Memory lifecycle operations.
 * 
 * Create, update, and prune memory operations.
 * 
 * @module
 */

import type {
  Memory,
  MemoryInput,
  MemoryStrength,
  MemoryFade,
  PruneResult
} from "../types/mod.ts";
import { readMemory, writeMemory, listMemoryIds, deleteMemory } from "./storage.ts";
import { getDefaultHalfLife, getMemoryStrength, isWeakMemory } from "./strength.ts";
import { logCreation, logPruning } from "./logs.ts";

/**
 * Generate a memory ID from person and timestamp.
 * 
 * Format: {person-id}-{topic-slug}-{month}
 * Example: "alex-oauth-2025-02"
 * 
 * @param person - Person ctx:// reference
 * @param topic - Primary topic
 * @param created - Creation timestamp
 * @returns Generated memory ID
 */
export function generateMemoryId(person: string, topic: string, created: Date): string {
  // Extract person ID from ctx:// reference
  const personId = person.split("/").pop() || "unknown";
  
  // Create topic slug (lowercase, replace spaces with hyphens, limit length)
  const topicSlug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
  
  // Format: YYYY-MM (first 7 characters of ISO string)
  const yearMonth = created.toISOString().slice(0, 7);
  
  return `${personId}-${topicSlug}-${yearMonth}`;
}

/**
 * Create a new memory.
 * 
 * @param dataPath - Base data directory path
 * @param input - Memory input data
 * @param now - Current time (defaults to now)
 * @returns Created memory object
 */
export async function createMemory(
  dataPath: string,
  input: MemoryInput,
  now: Date = new Date()
): Promise<Memory> {
  // Generate ID
  const primaryTopic = input.tags.topics[0] || "memory";
  const id = generateMemoryId(input.person, primaryTopic, now);
  
  // Determine half-life
  const halfLife = input.half_life_days || getDefaultHalfLife(input.content.significance);
  const minStrength = input.min_strength || 0.1;
  const initialStrength = input.initial ?? 1.0;
  
  // Create strength tracking
  const strength: MemoryStrength = {
    initial: initialStrength,
    current: initialStrength,
    last_reinforced: now.toISOString(),
    reinforcement_count: 0
  };
  
  // Create fade parameters
  const fade: MemoryFade = {
    half_life_days: halfLife,
    min_strength: minStrength
  };
  
  // Create memory
  const memory: Memory = {
    id,
    person: input.person,
    created: now.toISOString(),
    content: input.content,
    tags: input.tags,
    strength,
    fade,
    log: []
  };
  
  // Add creation log entry
  logCreation(memory);
  
  // Write to file
  await writeMemory(dataPath, memory);
  
  return memory;
}

/**
 * Update an existing memory.
 * 
 * @param dataPath - Base data directory path
 * @param memoryId - Memory ID to update
 * @param updates - Partial memory updates
 * @returns Updated memory
 */
export async function updateMemory(
  dataPath: string,
  memoryId: string,
  updates: Partial<Pick<Memory, "content" | "tags">>
): Promise<Memory> {
  const memory = await readMemory(dataPath, memoryId);
  
  // Apply updates
  if (updates.content) {
    memory.content = { ...memory.content, ...updates.content };
  }
  if (updates.tags) {
    memory.tags = { ...memory.tags, ...updates.tags };
  }
  
  // Write updated memory
  await writeMemory(dataPath, memory);
  
  return memory;
}

/**
 * Prune weak memories below threshold.
 * 
 * @param dataPath - Base data directory path
 * @param threshold - Strength threshold for pruning (default: 0.15)
 * @param now - Current time (defaults to now)
 * @returns Prune result with count and IDs
 */
export async function pruneWeakMemories(
  dataPath: string,
  threshold: number = 0.15,
  now: Date = new Date()
): Promise<PruneResult> {
  const memoryIds = await listMemoryIds(dataPath);
  const prunedIds: string[] = [];
  
  for (const id of memoryIds) {
    try {
      const memory = await readMemory(dataPath, id);
      
      if (isWeakMemory(memory, threshold, now)) {
        const finalStrength = getMemoryStrength(memory, now);
        
        // Log pruning event
        logPruning(
          memory,
          `Pruned due to low strength (${finalStrength.toFixed(3)} < ${threshold})`,
          finalStrength
        );
        
        // Write final state before deletion
        await writeMemory(dataPath, memory);
        
        // Delete memory file
        await deleteMemory(dataPath, id);
        prunedIds.push(id);
      }
    } catch (error) {
      // Skip memories that can't be read
      console.error(`Failed to process memory ${id}:`, error);
    }
  }
  
  return {
    pruned: prunedIds.length,
    prunedIds,
    checked: memoryIds.length,
    threshold
  };
}
