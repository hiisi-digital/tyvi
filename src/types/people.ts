/**
 * People type definitions for tyvi.
 *
 * People are composed from atomic building blocks (traits, skills, quirks, etc.)
 * with anchor values defined in .person.toml files.
 * All other values are computed via composition rules.
 *
 * @module
 */

// ============================================================================
// Person Identity
// ============================================================================

/**
 * A person's identity information.
 */
export interface PersonIdentity {
  /** Unique ID (e.g., "alex") */
  id: string;
  /** Display name */
  name: string;
  /** Pronouns (e.g., "they/them") */
  pronouns?: string;
  /** GitHub username */
  github_username?: string;
}

/**
 * Organization and team membership.
 */
export interface PersonOrgs {
  /** Primary organization (e.g., "hiisi") */
  primary: string;
  /** Teams within the org */
  teams?: string[];
}

// ============================================================================
// Person Anchors (Defined Values)
// ============================================================================

/**
 * Quirks section in person file.
 */
export interface PersonQuirks {
  /** Explicitly assigned quirks */
  explicit: string[];
}

/**
 * Tools section in person file.
 */
export interface PersonTools {
  /** Allowed tools */
  allowed: string[];
}

/**
 * Custom metadata fields.
 */
export interface PersonCustom {
  [key: string]: unknown;
}

// ============================================================================
// Person Definition (Raw)
// ============================================================================

/**
 * A complete person definition as loaded from TOML.
 * Contains only anchor values - the unique defining characteristics.
 */
export interface Person {
  identity: PersonIdentity;
  orgs?: PersonOrgs;
  /** Anchor trait values (-100 to +100) */
  traits?: Record<string, number>;
  /** Anchor skill values (0-100) */
  skills?: Record<string, number>;
  /** Anchor experience values (0-100) */
  experience?: Record<string, number>;
  /** Anchor stack values (0-100) */
  stacks?: Record<string, number>;
  /** Explicitly assigned quirks */
  quirks?: PersonQuirks;
  /** Allowed tools */
  tools?: PersonTools;
  /** Custom fields */
  custom?: PersonCustom;
}

// ============================================================================
// Computation Trace (Debugging)
// ============================================================================

/**
 * Record of a single rule application during computation.
 */
export interface RuleApplication {
  /** Description of what this rule does */
  description: string;
  /** Expression that was evaluated */
  expression: string;
  /** Result of evaluation */
  result: number;
  /** Weight applied to this result */
  weight: number;
}

/**
 * Trace for computing a single value.
 */
export interface ValueTrace {
  /** The value being computed (e.g., "trait.caution") */
  target: string;
  /** Whether this was an anchor value (not computed) */
  isAnchor: boolean;
  /** Anchor values used in computation */
  anchorsUsed: string[];
  /** Rules that were applied */
  rulesApplied: RuleApplication[];
  /** Final computed value */
  finalValue: number;
}

/**
 * Complete trace of person computation for debugging.
 */
export interface ComputationTrace {
  /** Traces for individual values */
  values: Map<string, ValueTrace>;
  /** Circular dependencies encountered (each array is a cycle) */
  circularDependencies: string[][];
  /** Computation order (topologically sorted) */
  computationOrder: string[];
}

// ============================================================================
// Computed Person
// ============================================================================

/**
 * A person with all values computed from anchors and rules.
 */
export interface ComputedPerson {
  identity: PersonIdentity;
  orgs?: PersonOrgs;

  /** All traits (anchors + computed), keyed by trait ID */
  traits: Map<string, number>;
  /** All skills (anchors + computed), keyed by skill ID */
  skills: Map<string, number>;
  /** All experience (anchors + computed), keyed by exp ID */
  experience: Map<string, number>;
  /** All stacks (anchors + computed), keyed by stack ID */
  stacks: Map<string, number>;
  /** All quirks (explicit + auto-assigned) */
  quirks: Set<string>;
  /** Matched phrases based on conditions */
  phrases: string[];
  /** Allowed tools */
  tools?: string[];
  /** Custom fields */
  custom?: PersonCustom;

  /** Computation trace for debugging */
  trace: ComputationTrace;
}

// ============================================================================
// Person Summary (for listings)
// ============================================================================

/**
 * Lightweight summary of a person for listings.
 */
export interface PersonSummary {
  /** Person ID */
  id: string;
  /** Display name */
  name: string;
  /** Primary org */
  org?: string;
  /** Number of anchor traits defined */
  traitCount: number;
  /** Number of anchor skills defined */
  skillCount: number;
  /** Number of explicit quirks */
  quirkCount: number;
}
