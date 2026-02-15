/**
 * Cache storage: read, write, and manage cached computation results.
 *
 * Storage format is JSON for debuggability. The cache file lives at
 * `{cachePath}/cache.json`. Map entries are serialized as plain objects.
 *
 * @module
 */

import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import type { CacheEntry, CacheMeta, CacheStorage, SourceHash } from "../types/config.ts";

/**
 * Serialized form of CacheStorage (Maps become Records in JSON).
 */
interface SerializedStorage {
  entries: Record<string, CacheEntry<unknown>>;
  last_pruned?: string;
  count: number;
}

/**
 * Read cache from disk.
 *
 * @param cachePath - Directory containing cache.json
 * @returns Deserialized CacheStorage (creates empty if not found)
 */
export async function readCache(cachePath: string): Promise<CacheStorage> {
  const filePath = join(cachePath, "cache.json");
  try {
    const text = await Deno.readTextFile(filePath);
    const data = JSON.parse(text) as SerializedStorage;
    return {
      entries: new Map(Object.entries(data.entries)),
      last_pruned: data.last_pruned,
      count: data.count,
    };
  } catch {
    return createEmptyStorage();
  }
}

/**
 * Write cache to disk.
 *
 * @param cachePath - Directory to write cache.json into
 * @param storage - CacheStorage to persist
 */
export async function writeCache(
  cachePath: string,
  storage: CacheStorage,
): Promise<void> {
  await ensureDir(cachePath);
  const filePath = join(cachePath, "cache.json");
  const data: SerializedStorage = {
    entries: Object.fromEntries(storage.entries),
    last_pruned: storage.last_pruned,
    count: storage.count,
  };
  await Deno.writeTextFile(filePath, JSON.stringify(data, null, 2) + "\n");
}

/**
 * Get a cache entry by key.
 *
 * @param storage - Cache storage to search
 * @param key - Cache key
 * @returns Cache entry or null if not found
 */
export function getCacheEntry<T>(
  storage: CacheStorage,
  key: string,
): CacheEntry<T> | null {
  const entry = storage.entries.get(key);
  if (!entry) return null;
  return entry as CacheEntry<T>;
}

/**
 * Set a cache entry, returning updated storage.
 *
 * @param storage - Current cache storage
 * @param key - Cache key
 * @param value - Value to cache
 * @param sourceHashes - Source file hashes for invalidation
 * @returns Updated CacheStorage with the new entry
 */
export function setCacheEntry<T>(
  storage: CacheStorage,
  key: string,
  value: T,
  sourceHashes: SourceHash[],
): CacheStorage {
  const now = new Date().toISOString();
  const meta: CacheMeta = {
    created_at: now,
    computed_at: now,
    source_hashes: sourceHashes,
    last_validated: now,
    version: 1,
  };
  const entry: CacheEntry<T> = { value, meta };
  const entries = new Map(storage.entries);
  entries.set(key, entry as CacheEntry<unknown>);
  return {
    entries,
    last_pruned: storage.last_pruned,
    count: entries.size,
  };
}

/**
 * Remove a cache entry, returning updated storage.
 *
 * @param storage - Current cache storage
 * @param key - Cache key to remove
 * @returns Updated CacheStorage without the entry
 */
export function removeCacheEntry(
  storage: CacheStorage,
  key: string,
): CacheStorage {
  const entries = new Map(storage.entries);
  entries.delete(key);
  return {
    entries,
    last_pruned: storage.last_pruned,
    count: entries.size,
  };
}

/**
 * Create an empty cache storage.
 *
 * @returns Empty CacheStorage
 */
export function createEmptyStorage(): CacheStorage {
  return {
    entries: new Map(),
    count: 0,
  };
}
