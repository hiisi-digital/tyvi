/**
 * Atom type definitions for tyvi.
 *
 * Atoms are the building blocks of personality:
 * - Traits: bipolar axes (-100 to +100)
 * - Skills: technical capabilities (0 to 100)
 * - Experience: domain familiarity (0 to 100)
 * - Stacks: technology proficiency (0 to 100)
 * - Quirks: binary personality markers
 * - Phrases: conditional communication flavor
 *
 * @module
 */

// ============================================================================
// Composition System
// ============================================================================

/**
 * A composition rule that derives values from other values.
 * Used in trait, skill, experience, and stack definitions.
 */
export interface CompositionRule {
  /** Human-readable description of what this rule does */
  description: string;
  /** Expression to evaluate (e.g., "trait.detail-focus * 0.5") */
  expression: string;
  /** Weight of this rule in the final computation (0-1) */
  weight: number;
}

/**
 * Composition section with rules.
 */
export interface Composition {
  rule: CompositionRule[];
}

// ============================================================================
// Trait Types
// ============================================================================

/**
 * A point on a trait axis spectrum.
 * Traits range from -100 to +100 with 0 being neutral/balanced.
 */
export interface AxisPoint {
  /** Term used for this point (e.g., "bold", "prudent", "cautious") */
  term: string;
  /** Extreme version of the term (optional, for ±70-100 range) */
  extreme?: string;
  /** Description of behavior at this point */
  description: string;
}

/**
 * Definition of a trait axis with negative, neutral, and positive poles.
 */
export interface TraitAxis {
  /** Unique identifier (e.g., "trait.caution") */
  id: string;
  /** Negative end of the axis (-100 to -30) */
  negative: AxisPoint;
  /** Neutral point of the axis (-30 to +30) */
  neutral: AxisPoint;
  /** Positive end of the axis (+30 to +100) */
  positive: AxisPoint;
}

/**
 * A complete trait definition with axis and composition rules.
 */
export interface Trait {
  /** The trait axis definition */
  axis: TraitAxis;
  /** Rules for computing this trait from other values */
  composition?: Composition;
}

// ============================================================================
// Skill Types
// ============================================================================

/**
 * Level definitions for a skill (0, 20, 40, 60, 80, 100).
 */
export interface SkillLevels {
  0: string;
  20: string;
  40: string;
  60: string;
  80: string;
  100: string;
}

/**
 * A skill definition representing technical capability.
 */
export interface Skill {
  /** Unique identifier (e.g., "skill.type-system-design") */
  id: string;
  /** Category (e.g., "architecture", "implementation") */
  category: string;
  /** Description */
  description: {
    name: string;
    summary: string;
  };
  /** Level descriptions */
  levels: SkillLevels;
  /** Rules for computing this skill */
  composition?: Composition;
}

// ============================================================================
// Experience Types
// ============================================================================

/**
 * Level definitions for experience (0, 20, 40, 60, 80, 100).
 */
export interface ExperienceLevels {
  0: string;
  20: string;
  40: string;
  60: string;
  80: string;
  100: string;
}

/**
 * An experience definition representing domain familiarity.
 */
export interface Experience {
  /** Unique identifier (e.g., "exp.rust-ecosystem") */
  id: string;
  /** Category (e.g., "language", "framework") */
  category: string;
  /** Description */
  description: {
    name: string;
    summary: string;
  };
  /** Level descriptions */
  levels: ExperienceLevels;
  /** Rules for computing this experience */
  composition?: Composition;
}

// ============================================================================
// Stack Types
// ============================================================================

/**
 * Level definitions for stack proficiency (0, 20, 40, 60, 80, 100).
 */
export interface StackLevels {
  0: string;
  20: string;
  40: string;
  60: string;
  80: string;
  100: string;
}

/**
 * A stack definition representing technology proficiency.
 */
export interface Stack {
  /** Unique identifier (e.g., "stack.rust") */
  id: string;
  /** Category (e.g., "language", "database") */
  category: string;
  /** Description */
  description: {
    name: string;
    summary: string;
  };
  /** Level descriptions */
  levels: StackLevels;
  /** Rules for computing this stack */
  composition?: Composition;
}

// ============================================================================
// Quirk Types
// ============================================================================

/**
 * Conditions for auto-assigning a quirk.
 * Uses arrays (any_of/all_of) not inline logic.
 */
export interface QuirkAutoAssign {
  /** Any condition being true triggers assignment */
  any_of?: string[];
  /** All conditions must be true for assignment */
  all_of?: string[];
}

/**
 * Overdone behavior when quirk is too dominant.
 */
export interface QuirkOverdone {
  note: string;
}

/**
 * A quirk definition - binary personality markers.
 */
export interface Quirk {
  /** Unique identifier (e.g., "quirk.edge-case-hunter") */
  id: string;
  /** Description */
  description: {
    /** Display name */
    name: string;
    /** Short summary of the quirk */
    summary: string;
  };
  /** Manifestations */
  manifestations: {
    /** List of observable behaviors */
    behaviors: string[];
  };
  /** Optional auto-assignment conditions */
  auto_assign?: QuirkAutoAssign;
  /** Optional note about when this quirk is overdone */
  overdone?: QuirkOverdone;
}

/**
 * TOML structure for quirk files.
 */
export interface QuirkAtom {
  quirk: Quirk;
}

// ============================================================================
// Phrase Types
// ============================================================================

/**
 * Conditions for when a phrase style applies.
 */
export interface PhraseConditions {
  /** Any condition being true applies this phrase */
  any_of?: string[];
  /** All conditions must be true for this phrase */
  all_of?: string[];
}

/**
 * A phrase atom defining communication flavor.
 */
export interface Phrase {
  /** Unique identifier (e.g., "phrase.edge-case-questioning") */
  id: string;
  /** Description */
  description: {
    name: string;
    summary: string;
  };
  /** Conditions for when this phrase applies */
  conditions?: PhraseConditions;
  /** Examples of the flavor (not literal text) */
  examples: {
    variations: string[];
  };
  /** Usage notes */
  usage?: {
    note: string;
  };
}

/**
 * TOML structure for phrase files.
 */
export interface PhraseAtom {
  phrase: Phrase;
}

// ============================================================================
// Loaded Atoms Collection
// ============================================================================

/**
 * All loaded atoms from the data directory.
 */
export interface Atoms {
  /** All trait definitions by ID */
  traits: Map<string, Trait>;
  /** All skill definitions by ID */
  skills: Map<string, Skill>;
  /** All experience definitions by ID */
  experience: Map<string, Experience>;
  /** All stack definitions by ID */
  stacks: Map<string, Stack>;
  /** All quirk definitions by ID */
  quirks: Map<string, Quirk>;
  /** All phrase definitions by ID */
  phrases: Map<string, Phrase>;
}
