/**
 * Memory log entry management.
 * 
 * Tracks all events that happen to a memory:
 * - Creation
 * - Reinforcement
 * - References
 * - Updates
 * - Pruning
 * 
 * @module
 */

import type { Memory, MemoryLogEntry, MemoryEventType } from "../types/mod.ts";

/**
 * Add a log entry to a memory's event log.
 * 
 * @param memory - Memory to add log to (will be mutated)
 * @param event - Event type
 * @param note - Description of the event
 * @param options - Optional parameters
 */
export function addLogEntry(
  memory: Memory,
  event: MemoryEventType,
  note: string,
  options: {
    strengthDelta?: number;
    relatedMemory?: string;
    timestamp?: Date;
  } = {}
): void {
  const entry: MemoryLogEntry = {
    timestamp: (options.timestamp || new Date()).toISOString(),
    event,
    note,
    strength_delta: options.strengthDelta,
    related_memory: options.relatedMemory
  };
  
  memory.log.push(entry);
}

/**
 * Create initial log entry for a new memory.
 * 
 * @param memory - Memory that was created (will be mutated)
 * @param note - Optional note about creation context
 */
export function logCreation(memory: Memory, note?: string): void {
  addLogEntry(
    memory,
    "created",
    note || "Memory created",
    { strengthDelta: memory.strength.initial }
  );
}

/**
 * Log a reinforcement event.
 * 
 * @param memory - Memory that was reinforced (will be mutated)
 * @param reason - Reason for reinforcement
 * @param delta - Strength delta applied
 * @param relatedMemory - Optional related memory ID
 */
export function logReinforcement(
  memory: Memory,
  reason: string,
  delta: number,
  relatedMemory?: string
): void {
  addLogEntry(
    memory,
    "reinforced",
    reason,
    { strengthDelta: delta, relatedMemory }
  );
}

/**
 * Log a reference event (memory was accessed/recalled).
 * 
 * @param memory - Memory that was referenced (will be mutated)
 * @param context - Context in which memory was referenced
 */
export function logReference(memory: Memory, context: string): void {
  addLogEntry(
    memory,
    "referenced",
    `Referenced in: ${context}`
  );
}

/**
 * Log a relation event (linked to another memory).
 * 
 * @param memory - Memory that was related (will be mutated)
 * @param relatedMemoryId - ID of related memory
 * @param relationReason - Why they are related
 */
export function logRelation(
  memory: Memory,
  relatedMemoryId: string,
  relationReason: string
): void {
  addLogEntry(
    memory,
    "related",
    relationReason,
    { relatedMemory: relatedMemoryId }
  );
}

/**
 * Log an update event.
 * 
 * @param memory - Memory that was updated (will be mutated)
 * @param changes - Description of changes made
 */
export function logUpdate(memory: Memory, changes: string): void {
  addLogEntry(
    memory,
    "updated",
    changes
  );
}

/**
 * Log a pruning event.
 * 
 * @param memory - Memory that was pruned (will be mutated)
 * @param reason - Reason for pruning
 * @param finalStrength - Final strength before pruning
 */
export function logPruning(memory: Memory, reason: string, finalStrength: number): void {
  addLogEntry(
    memory,
    "pruned",
    reason,
    { strengthDelta: -finalStrength }
  );
}

/**
 * Get recent log entries for a memory.
 * 
 * @param memory - Memory to get logs from
 * @param limit - Maximum number of entries to return
 * @returns Array of recent log entries, newest first
 */
export function getRecentLogs(memory: Memory, limit: number = 10): MemoryLogEntry[] {
  return memory.log
    .slice(-limit)
    .reverse();
}

/**
 * Filter log entries by event type.
 * 
 * @param memory - Memory to filter logs from
 * @param eventType - Event type to filter by
 * @returns Array of matching log entries
 */
export function filterLogsByType(
  memory: Memory,
  eventType: MemoryEventType
): MemoryLogEntry[] {
  return memory.log.filter(entry => entry.event === eventType);
}
