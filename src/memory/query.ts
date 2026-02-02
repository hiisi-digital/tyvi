/**
 * Memory query operations.
 * 
 * Provides filtering, sorting, and pagination for memory retrieval.
 * 
 * @module
 */

import type { Memory, MemoryQuery, MemoryFilters, MemorySummary } from "../types/mod.ts";
import { getMemoryStrength } from "./strength.ts";

/**
 * Check if a memory matches query filters.
 * 
 * @param memory - Memory to check
 * @param query - Query parameters
 * @param now - Current time for strength calculation
 * @returns True if memory matches all query criteria
 */
function matchesQuery(memory: Memory, query: MemoryQuery, now: Date): boolean {
  // Filter by person
  if (query.person && memory.person !== query.person) {
    return false;
  }
  
  // Filter by topics
  if (query.topic) {
    const topics = Array.isArray(query.topic) ? query.topic : [query.topic];
    const hasMatchingTopic = topics.some(topic => 
      memory.tags.topics.includes(topic)
    );
    if (!hasMatchingTopic) {
      return false;
    }
  }
  
  // Filter by people involved
  if (query.people) {
    const people = Array.isArray(query.people) ? query.people : [query.people];
    const hasMatchingPerson = people.some(person => 
      memory.tags.people.includes(person)
    );
    if (!hasMatchingPerson) {
      return false;
    }
  }
  
  // Filter by outcome
  if (query.outcome) {
    const outcomes = Array.isArray(query.outcome) ? query.outcome : [query.outcome];
    if (!memory.tags.outcome || !outcomes.includes(memory.tags.outcome)) {
      return false;
    }
  }
  
  // Filter by minimum strength
  if (query.minStrength !== undefined) {
    const currentStrength = getMemoryStrength(memory, now);
    if (currentStrength < query.minStrength) {
      return false;
    }
  }
  
  // Filter by date range
  const createdDate = new Date(memory.created);
  if (query.since && createdDate < query.since) {
    return false;
  }
  if (query.until && createdDate > query.until) {
    return false;
  }
  
  return true;
}

/**
 * Sort memories by specified criteria.
 * 
 * @param memories - Memories to sort (will be sorted in place)
 * @param sortBy - Field to sort by
 * @param sortOrder - Sort direction
 * @param now - Current time for strength calculation
 */
function sortMemories(
  memories: Memory[],
  sortBy: "strength" | "created" | "last_reinforced" = "strength",
  sortOrder: "asc" | "desc" = "desc",
  now: Date
): void {
  memories.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "strength": {
        const strengthA = getMemoryStrength(a, now);
        const strengthB = getMemoryStrength(b, now);
        comparison = strengthA - strengthB;
        break;
      }
      case "created": {
        const dateA = new Date(a.created).getTime();
        const dateB = new Date(b.created).getTime();
        comparison = dateA - dateB;
        break;
      }
      case "last_reinforced": {
        const dateA = new Date(a.strength.last_reinforced).getTime();
        const dateB = new Date(b.strength.last_reinforced).getTime();
        comparison = dateA - dateB;
        break;
      }
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });
}

/**
 * Query memories with filtering, sorting, and pagination.
 * 
 * @param allMemories - All available memories
 * @param query - Query parameters
 * @param now - Current time (defaults to now)
 * @returns Filtered and sorted memories
 */
export function queryMemories(
  allMemories: Memory[],
  query: MemoryQuery,
  now: Date = new Date()
): Memory[] {
  // Filter memories
  let results = allMemories.filter(memory => matchesQuery(memory, query, now));
  
  // Sort memories
  sortMemories(
    results,
    query.sortBy || "strength",
    query.sortOrder || "desc",
    now
  );
  
  // Apply pagination
  const offset = query.offset || 0;
  const limit = query.limit || results.length;
  
  return results.slice(offset, offset + limit);
}

/**
 * Convert memory to summary format.
 * 
 * @param memory - Memory to summarize
 * @param now - Current time for strength calculation
 * @returns Memory summary
 */
export function toMemorySummary(memory: Memory, now: Date = new Date()): MemorySummary {
  return {
    id: memory.id,
    person: memory.person,
    summary: memory.content.summary,
    strength: getMemoryStrength(memory, now),
    significance: memory.content.significance,
    created: memory.created,
    topics: memory.tags.topics
  };
}

/**
 * Filter memories with simple filters and return summaries.
 * 
 * @param allMemories - All available memories
 * @param filters - Simple filter criteria
 * @param now - Current time (defaults to now)
 * @returns Array of memory summaries
 */
export function filterMemories(
  allMemories: Memory[],
  filters: MemoryFilters = {},
  now: Date = new Date()
): MemorySummary[] {
  let results = allMemories;
  
  // Filter by person
  if (filters.person) {
    results = results.filter(m => m.person === filters.person);
  }
  
  // Filter by topic
  if (filters.topic) {
    results = results.filter(m => m.tags.topics.includes(filters.topic!));
  }
  
  // Filter by strength
  if (!filters.includeWeak) {
    const threshold = 0.2;
    results = results.filter(m => getMemoryStrength(m, now) >= threshold);
  }
  
  // Sort by strength descending
  sortMemories(results, "strength", "desc", now);
  
  return results.map(m => toMemorySummary(m, now));
}
