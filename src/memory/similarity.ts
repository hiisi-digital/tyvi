/**
 * Similarity detection between memories.
 *
 * Compares memories based on:
 * - Topic overlap
 * - People involved
 * - Outcome similarity
 * - Time proximity
 *
 * @module
 */

import type { Memory, SimilarityResult } from "../types/mod.ts";

/**
 * Calculate Jaccard similarity between two sets.
 *
 * Jaccard = |A ∩ B| / |A ∪ B|
 *
 * @param setA - First set
 * @param setB - Second set
 * @returns Similarity score (0.0 to 1.0)
 */
function jaccardSimilarity(setA: string[], setB: string[]): number {
  if (setA.length === 0 && setB.length === 0) {
    return 0;
  }

  const intersection = setA.filter((item) => setB.includes(item));
  const union = [...new Set([...setA, ...setB])];

  return intersection.length / union.length;
}

/**
 * Calculate time proximity score between two dates.
 *
 * Returns higher score for memories closer in time:
 * - Same day: 1.0
 * - 1 week: ~0.9
 * - 1 month: ~0.7
 * - 3 months: ~0.5
 * - 1 year+: ~0.1
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Proximity score (0.0 to 1.0)
 */
function calculateTimeProximity(date1: Date, date2: Date): number {
  const daysDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay with 90-day half-life
  return Math.pow(0.5, daysDiff / 90);
}

/**
 * Calculate similarity between two memories.
 *
 * Weighted scoring:
 * - Topic overlap: 40%
 * - People overlap: 30%
 * - Same outcome: 15%
 * - Time proximity: 15%
 *
 * @param memory1 - First memory
 * @param memory2 - Second memory
 * @returns Similarity result with score and matching factors
 */
export function calculateSimilarity(memory1: Memory, memory2: Memory): SimilarityResult {
  // Calculate individual factors
  const topicOverlap = jaccardSimilarity(memory1.tags.topics, memory2.tags.topics);
  const peopleOverlap = jaccardSimilarity(memory1.tags.people, memory2.tags.people);
  const sameOutcome = memory1.tags.outcome === memory2.tags.outcome &&
    memory1.tags.outcome !== undefined;

  const date1 = new Date(memory1.created);
  const date2 = new Date(memory2.created);
  const timeProximity = calculateTimeProximity(date1, date2);
  const timeProximityDays = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);

  // Calculate weighted score
  const score = topicOverlap * 0.4 +
    peopleOverlap * 0.3 +
    (sameOutcome ? 1.0 : 0.0) * 0.15 +
    timeProximity * 0.15;

  return {
    memoryId: memory2.id,
    score,
    matchingFactors: {
      topicOverlap,
      peopleOverlap,
      sameOutcome,
      timeProximityDays,
    },
  };
}

/**
 * Find similar memories to a given memory.
 *
 * @param targetMemory - Memory to find similarities for
 * @param allMemories - Pool of memories to compare against
 * @param minScore - Minimum similarity score threshold (default: 0.3)
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of similar memories, sorted by score descending
 */
export function findSimilarMemories(
  targetMemory: Memory,
  allMemories: Memory[],
  minScore: number = 0.3,
  limit: number = 10,
): SimilarityResult[] {
  const results: SimilarityResult[] = [];

  for (const memory of allMemories) {
    // Skip self-comparison
    if (memory.id === targetMemory.id) {
      continue;
    }

    const similarity = calculateSimilarity(targetMemory, memory);

    if (similarity.score >= minScore) {
      results.push(similarity);
    }
  }

  // Sort by score descending and limit
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
