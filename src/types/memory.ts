/**
 * Memory type definitions for tyvi.
 *
 * Memories are significant events that:
 * - Fade over time (half-life decay)
 * - Can be reinforced when referenced or related events occur
 * - Have tags for topic-based retrieval
 * - Track provenance via ctx:// references
 *
 * @module
 */

// ============================================================================
// Memory Content
// ============================================================================

/**
 * Significance level of a memory.
 */
export type MemorySignificance = "low" | "medium" | "high";

/**
 * Outcome of the event captured by memory.
 */
export type MemoryOutcome = "positive" | "negative" | "neutral" | "mixed";

/**
 * Content of a memory.
 */
export interface MemoryContent {
  /** Short summary of the memory */
  summary: string;
  /** Detailed description (optional) */
  detail?: string;
  /** Significance level affects base half-life */
  significance: MemorySignificance;
}

// ============================================================================
// Memory Tags
// ============================================================================

/**
 * Metadata tags for a memory.
 * Used for retrieval and similarity detection.
 */
export interface MemoryTags {
  /** Topics related to this memory */
  topics: string[];
  /** People involved (ctx:// references) */
  people: string[];
  /** Outcome of the event */
  outcome?: MemoryOutcome;
  /** Optional project reference */
  project?: string;
  /** Optional additional tags */
  custom?: string[];
}

// ============================================================================
// Memory Strength
// ============================================================================

/**
 * Strength tracking for a memory.
 * Strength decays over time but can be reinforced.
 */
export interface MemoryStrength {
  /** Initial strength when created (usually 1.0) */
  initial: number;
  /** Current strength after decay and reinforcement (0.0 to 1.0+) */
  current: number;
  /** ISO timestamp of last reinforcement */
  last_reinforced: string;
  /** Number of times reinforced */
  reinforcement_count: number;
}

/**
 * Fading parameters for a memory.
 * Controls how quickly memories decay.
 */
export interface MemoryFade {
  /** Half-life in days (strength halves every N days) */
  half_life_days: number;
  /** Minimum strength floor (never goes below this) */
  min_strength: number;
}

// ============================================================================
// Memory Log
// ============================================================================

/**
 * Event types for memory log entries.
 */
export type MemoryEventType =
  | "created"
  | "reinforced"
  | "referenced"
  | "related"
  | "updated"
  | "pruned";

/**
 * Log entry for memory events.
 */
export interface MemoryLogEntry {
  /** ISO timestamp of event */
  timestamp: string;
  /** Type of event */
  event: MemoryEventType;
  /** Description of the event */
  note: string;
  /** Change in strength (if applicable) */
  strength_delta?: number;
  /** Related memory ID (for reinforcement/relation events) */
  related_memory?: string;
}

// ============================================================================
// Memory Definition
// ============================================================================

/**
 * A complete memory definition.
 */
export interface Memory {
  /** Unique ID (e.g., "alex-oauth-2025-02") */
  id: string;
  /** Person this memory belongs to (ctx:// reference) */
  person: string;
  /** ISO timestamp when created */
  created: string;
  /** Memory content */
  content: MemoryContent;
  /** Tags for retrieval */
  tags: MemoryTags;
  /** Strength tracking */
  strength: MemoryStrength;
  /** Fading parameters */
  fade: MemoryFade;
  /** Event log */
  log: MemoryLogEntry[];
}

/**
 * TOML structure for memory files.
 */
export interface MemoryFile {
  memory: Memory;
}

// ============================================================================
// Memory Input (Creation)
// ============================================================================

/**
 * Input for creating a new memory.
 * Strength and fading use defaults if not specified.
 */
export interface MemoryInput {
  /** Person this memory is for (ctx:// reference) */
  person: string;
  /** Memory content */
  content: MemoryContent;
  /** Tags */
  tags: MemoryTags;
  /** Optional: override half-life (uses default based on significance otherwise) */
  half_life_days?: number;
  /** Optional: override min strength */
  min_strength?: number;
}

// ============================================================================
// Memory Query
// ============================================================================

/**
 * Parameters for querying memories.
 */
export interface MemoryQuery {
  /** Filter by person (ctx:// reference) */
  person?: string;
  /** Filter by topic(s) */
  topic?: string | string[];
  /** Filter by people involved */
  people?: string | string[];
  /** Filter by outcome */
  outcome?: MemoryOutcome | MemoryOutcome[];
  /** Minimum strength threshold */
  minStrength?: number;
  /** Only memories created after this date */
  since?: Date;
  /** Only memories created before this date */
  until?: Date;
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order */
  sortBy?: "strength" | "created" | "last_reinforced";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

/**
 * Filters for listing memories (simpler than full query).
 */
export interface MemoryFilters {
  /** Filter by person */
  person?: string;
  /** Filter by topic */
  topic?: string;
  /** Include weak memories (below threshold) */
  includeWeak?: boolean;
}

// ============================================================================
// Memory Summary (for listings)
// ============================================================================

/**
 * Lightweight summary of a memory for listings.
 */
export interface MemorySummary {
  /** Memory ID */
  id: string;
  /** Person ID (extracted from ctx:// reference) */
  person: string;
  /** Summary text */
  summary: string;
  /** Current strength */
  strength: number;
  /** Significance level */
  significance: MemorySignificance;
  /** Creation date */
  created: string;
  /** Primary topics */
  topics: string[];
}

// ============================================================================
// Memory Operations Results
// ============================================================================

/**
 * Result of memory reinforcement.
 */
export interface ReinforcementResult {
  /** Memory ID */
  id: string;
  /** Previous strength */
  previousStrength: number;
  /** New strength */
  newStrength: number;
  /** Delta applied */
  delta: number;
  /** Reason for reinforcement */
  reason: string;
}

/**
 * Result of pruning weak memories.
 */
export interface PruneResult {
  /** Number of memories pruned */
  pruned: number;
  /** IDs of pruned memories */
  prunedIds: string[];
  /** Total memories checked */
  checked: number;
  /** Threshold used */
  threshold: number;
}

// ============================================================================
// Memory Similarity
// ============================================================================

/**
 * Result of similarity comparison between memories.
 */
export interface SimilarityResult {
  /** Memory ID */
  memoryId: string;
  /** Similarity score (0.0 to 1.0) */
  score: number;
  /** Matching factors */
  matchingFactors: {
    /** Topic overlap ratio */
    topicOverlap: number;
    /** People overlap ratio */
    peopleOverlap: number;
    /** Same outcome */
    sameOutcome: boolean;
    /** Time proximity in days */
    timeProximityDays: number;
  };
}
