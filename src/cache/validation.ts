/**
 * Cache validation: verify entries, run scheduled checks, prune stale data.
 *
 * Validation tiers:
 * - Daily: check section hashes (fast)
 * - Weekly: full file hash check
 * - Monthly: deep validation (recompute and compare)
 *
 * @module
 */

import type { CacheEntry, CacheStorage, ValidationSchedule } from "../types/config.ts";
import { verifySourceHash } from "./hashing.ts";

/** Milliseconds per day. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Validate a single cache entry by checking all source hashes.
 *
 * @param entry - Cache entry to validate
 * @param dataPath - Absolute path to the data root
 * @returns true if all source hashes still match
 */
export async function validateEntry(
  entry: CacheEntry<unknown>,
  dataPath: string,
): Promise<boolean> {
  for (const sourceHash of entry.meta.source_hashes) {
    const valid = await verifySourceHash(sourceHash, dataPath);
    if (!valid) return false;
  }
  return true;
}

/**
 * Validate all entries in storage, removing invalid ones.
 *
 * @param storage - Cache storage to validate
 * @param dataPath - Absolute path to the data root
 * @returns Updated CacheStorage with invalid entries removed
 */
export async function validateStorage(
  storage: CacheStorage,
  dataPath: string,
): Promise<CacheStorage> {
  const entries = new Map<string, CacheEntry<unknown>>();

  for (const [key, entry] of storage.entries) {
    const valid = await validateEntry(entry, dataPath);
    if (valid) {
      const updated: CacheEntry<unknown> = {
        ...entry,
        meta: {
          ...entry.meta,
          last_validated: new Date().toISOString(),
        },
      };
      entries.set(key, updated);
    }
  }

  return {
    entries,
    last_pruned: storage.last_pruned,
    count: entries.size,
  };
}

/**
 * Check if a validation tier should run based on the schedule.
 *
 * @param schedule - Current validation schedule
 * @param tier - Which tier to check
 * @returns true if enough time has passed since the last run
 */
export function shouldRunValidation(
  schedule: ValidationSchedule,
  tier: "daily" | "weekly" | "monthly",
): boolean {
  const config = schedule[tier];
  if (!config.enabled) return false;
  if (!config.lastRun) return true;

  const lastRun = new Date(config.lastRun).getTime();
  const now = Date.now();
  const elapsed = now - lastRun;

  const thresholds: Record<string, number> = {
    daily: MS_PER_DAY,
    weekly: 7 * MS_PER_DAY,
    monthly: 30 * MS_PER_DAY,
  };

  return elapsed >= thresholds[tier]!;
}

/**
 * Remove cache entries older than a given age.
 *
 * @param storage - Cache storage to prune
 * @param maxAgeMs - Maximum age in milliseconds
 * @returns Updated CacheStorage with old entries removed
 */
export function pruneOldEntries(
  storage: CacheStorage,
  maxAgeMs: number,
): CacheStorage {
  const now = Date.now();
  const entries = new Map<string, CacheEntry<unknown>>();

  for (const [key, entry] of storage.entries) {
    const createdAt = new Date(entry.meta.created_at).getTime();
    if (now - createdAt < maxAgeMs) {
      entries.set(key, entry);
    }
  }

  return {
    entries,
    last_pruned: new Date().toISOString(),
    count: entries.size,
  };
}
