/**
 * Relationship type definitions for tyvi.
 *
 * Relationships track connections between people:
 * - Type of relationship (mentor, collaborator, etc.)
 * - Dynamic (strengths, friction areas)
 * - History via log entries
 *
 * Relationships are bidirectional but stored per-person.
 * Use ctx:// references for the other party.
 *
 * @module
 */

// ============================================================================
// Relationship Types
// ============================================================================

/**
 * Type of relationship between two people.
 */
export type RelationshipType =
  | "mentor"
  | "mentee"
  | "frequent-collaborator"
  | "occasional-collaborator"
  | "productive-tension"
  | "complementary"
  | "historical"
  | "new";

/**
 * Status of a relationship.
 */
export type RelationshipStatus = "active" | "dormant" | "ended";

// ============================================================================
// Relationship Dynamic
// ============================================================================

/**
 * Dynamic aspects of a relationship - how it actually works.
 */
export interface RelationshipDynamic {
  /** Summary of the relationship dynamic */
  summary: string;
  /** Areas where the relationship is strong */
  strengths?: string[];
  /** Areas of friction or tension */
  friction?: string[];
  /** Focus areas of collaboration */
  areas?: string[];
  /** Complementary skills/traits */
  complements?: string[];
}

// ============================================================================
// Relationship Log
// ============================================================================

/**
 * Event types for relationship log entries.
 */
export type RelationshipEventType =
  | "established"
  | "collaboration"
  | "tension"
  | "resolution"
  | "growth"
  | "milestone"
  | "shift"
  | "ended";

/**
 * Log entry for relationship events.
 */
export interface RelationshipLogEntry {
  /** ISO timestamp of the event */
  timestamp: string;
  /** Type of event */
  event: RelationshipEventType;
  /** Description of the event */
  note: string;
  /** Reference to a related memory (ctx://) */
  memory_ref?: string;
  /** Impact on relationship (positive/negative/neutral) */
  impact?: "positive" | "negative" | "neutral";
}

// ============================================================================
// Relationship Entry
// ============================================================================

/**
 * A single relationship definition.
 */
export interface RelationshipEntry {
  /** ctx:// reference to the other person */
  with: string;
  /** Type of relationship */
  type: RelationshipType;
  /** Current status */
  status: RelationshipStatus;
  /** ISO date when relationship began */
  since: string;
  /** Relationship dynamic */
  dynamic: RelationshipDynamic;
  /** History log */
  log: RelationshipLogEntry[];
  /** Optional notes */
  notes?: string;
}

// ============================================================================
// Relationship Collection
// ============================================================================

/**
 * Collection of relationships for a person.
 * Stored in a separate file from the person definition.
 */
export interface RelationshipCollection {
  /** Person these relationships belong to (ctx://) */
  person: string;
  /** All relationships */
  relationships: RelationshipEntry[];
}

/**
 * TOML structure for relationship files.
 */
export interface RelationshipFile {
  relationship: RelationshipEntry[];
}

// ============================================================================
// Relationship Summary
// ============================================================================

/**
 * Lightweight summary of a relationship for listings.
 */
export interface RelationshipSummary {
  /** Other person's ID */
  withId: string;
  /** Other person's name */
  withName: string;
  /** Relationship type */
  type: RelationshipType;
  /** Current status */
  status: RelationshipStatus;
  /** How long established */
  since: string;
  /** One-line summary */
  summary: string;
}

// ============================================================================
// Relationship Query
// ============================================================================

/**
 * Parameters for querying relationships.
 */
export interface RelationshipQuery {
  /** Filter by person */
  person?: string;
  /** Filter by relationship type */
  type?: RelationshipType | RelationshipType[];
  /** Filter by status */
  status?: RelationshipStatus | RelationshipStatus[];
  /** Include inactive relationships */
  includeInactive?: boolean;
}
