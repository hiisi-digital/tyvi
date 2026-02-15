/**
 * Cache system for tyvi.
 *
 * Provides content hashing, storage, and validation for caching
 * expensive computations (atom loading, person computation, context resolution).
 *
 * @module
 */

export { buildSourceHash, hashDirectory, hashFile, verifySourceHash } from "./hashing.ts";

export {
  createEmptyStorage,
  getCacheEntry,
  readCache,
  removeCacheEntry,
  setCacheEntry,
  writeCache,
} from "./storage.ts";

export {
  pruneOldEntries,
  shouldRunValidation,
  validateEntry,
  validateStorage,
} from "./validation.ts";
