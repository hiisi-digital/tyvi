/**
 * Configuration type definitions for tyvi.
 *
 * Global configuration controls:
 * - Organization aliases and emails
 * - Default values for memory, computation, caching
 * - Path configuration for data directories
 *
 * @module
 */

// ============================================================================
// Organization Configuration
// ============================================================================

/**
 * Map of friendly alias to literal org name.
 * e.g., { "hiisi": "hiisi-digital" }
 */
export type OrgAliases = Record<string, string>;

/**
 * Map of org to email pattern.
 * e.g., { "hiisi": "@hiisi.digital" }
 */
export type OrgEmails = Record<string, string>;

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default configuration values for various systems.
 */
export interface ConfigDefaults {
  // Memory defaults
  /** Half-life in days for personal memories */
  memory_half_life_personal?: number;
  /** Half-life in days for org-level memories */
  memory_half_life_org?: number;
  /** Half-life in days for global memories */
  memory_half_life_global?: number;
  /** Minimum strength floor for memories */
  memory_min_strength?: number;
  /** Threshold below which memories are pruned */
  memory_prune_threshold?: number;
  /** Maximum log entries per memory */
  memory_max_log_entries?: number;

  // Computation defaults (starting points for non-anchored values)
  /** Starting point for skills (0-100) */
  skill_starting_point?: number;
  /** Starting point for experience (0-100) */
  experience_starting_point?: number;
  /** Starting point for stacks (0-100) */
  stack_starting_point?: number;
  /** Starting point for traits (-100 to +100, typically 0) */
  trait_starting_point?: number;

  // Cache defaults
  /** Enable daily section hash validation */
  cache_validation_daily?: boolean;
  /** Enable weekly full hash validation */
  cache_validation_weekly_full?: boolean;
  /** Enable summary caching */
  cache_summary_enabled?: boolean;

  // Resolution defaults
  /** Maximum depth for reference resolution */
  max_reference_depth?: number;
}

// ============================================================================
// Path Configuration
// ============================================================================

/**
 * Path configuration for data directories.
 * All paths relative to data root.
 */
export interface ConfigPaths {
  /** Path to atoms directory */
  atoms: string;
  /** Path to people directory */
  people: string;
  /** Path to relationships directory */
  relationships: string;
  /** Path to memories directory */
  memories: string;
  /** Path to cache directory */
  cache: string;
  /** Path to context directory */
  context?: string;
}

// ============================================================================
// Global Configuration
// ============================================================================

/**
 * Configuration metadata.
 */
export interface ConfigMeta {
  /** Config version */
  version: string;
  /** Description */
  description: string;
}

/**
 * Global configuration (config.toml in data root).
 */
export interface Config {
  /** Metadata */
  meta: ConfigMeta;
  /** Organization aliases */
  "org-aliases"?: OrgAliases;
  /** Organization email patterns */
  "org-emails"?: OrgEmails;
  /** Default values */
  defaults?: ConfigDefaults;
  /** Path configuration */
  paths?: ConfigPaths;
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Hash of a source file or section for cache invalidation.
 */
export interface SourceHash {
  /** File path relative to data root */
  file: string;
  /** Section name (for partial invalidation) */
  section?: string;
  /** Hash of content */
  hash: string;
  /** When hash was computed */
  computed_at: string;
}

/**
 * Metadata stored with cached values.
 */
export interface CacheMeta {
  /** When this cache entry was created */
  created_at: string;
  /** When this value was last computed */
  computed_at: string;
  /** Hashes of source files used in computation */
  source_hashes: SourceHash[];
  /** Last time hashes were validated */
  last_validated: string;
  /** Cache entry version (for format changes) */
  version: number;
}

/**
 * A cached computation result.
 */
export interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** Cache metadata */
  meta: CacheMeta;
}

/**
 * Cache storage interface.
 */
export interface CacheStorage {
  /** Cache entries by key */
  entries: Map<string, CacheEntry<unknown>>;
  /** When cache was last pruned */
  last_pruned?: string;
  /** Total entries count */
  count: number;
}

// ============================================================================
// Validation Schedule
// ============================================================================

/**
 * Cache validation schedule.
 */
export interface ValidationSchedule {
  /** Daily: check section hashes */
  daily: {
    enabled: boolean;
    lastRun?: string;
  };
  /** Weekly: full file hash check */
  weekly: {
    enabled: boolean;
    lastRun?: string;
  };
  /** Monthly: deep validation (recompute and compare) */
  monthly: {
    enabled: boolean;
    lastRun?: string;
  };
}
