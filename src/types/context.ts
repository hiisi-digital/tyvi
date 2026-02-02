/**
 * Context type definitions for tyvi.
 *
 * Context resolution uses a URI scheme with scoped fallback:
 * - ctx://person/alex — Global person
 * - ctx://~hiisi/rules/commit-style — Org-scoped
 * - ctx://~hiisi/~correctness/research/types — Team-scoped
 *
 * Scope hierarchy: Global → Org → Team
 * Lower scopes inherit from higher, with automatic fallback.
 *
 * @module
 */

// ============================================================================
// URI Scheme
// ============================================================================

/**
 * Supported URI schemes.
 */
export type UriScheme = "ctx" | "person" | "memory" | "model";

/**
 * Scope level for context resolution.
 */
export type ScopeLevel = "global" | "org" | "team";

/**
 * Parsed components of a ctx:// URI.
 */
export interface ParsedUri {
  /** Original URI string */
  raw: string;
  /** URI scheme (ctx, person, memory, model) */
  scheme: UriScheme;
  /** Organization scope (if present, e.g., "hiisi") */
  org?: string;
  /** Team scope (if present, e.g., "correctness") */
  team?: string;
  /** Resource type (e.g., "person", "rules", "research") */
  type: string;
  /** Resource path after type */
  path: string;
  /** Computed scope level */
  scopeLevel: ScopeLevel;
}

// ============================================================================
// Scope Definition
// ============================================================================

/**
 * A scope defines visibility and inheritance.
 */
export interface Scope {
  /** Scope level */
  level: ScopeLevel;
  /** Organization (for org and team scopes) */
  org?: string;
  /** Team (for team scope only) */
  team?: string;
}

/**
 * Scope with inheritance chain.
 */
export interface ScopeChain {
  /** The scope being queried */
  scope: Scope;
  /** Scopes to fall back to, in order */
  fallbackChain: Scope[];
}

// ============================================================================
// Context Resolution
// ============================================================================

/**
 * Result of context resolution.
 */
export interface ResolvedContext {
  /** The URI that was resolved */
  uri: string;
  /** Parsed URI components */
  parsed: ParsedUri;
  /** The scope where content was found */
  resolvedAt: Scope;
  /** Whether fallback was used */
  usedFallback: boolean;
  /** Content that was found */
  content: ContextContent;
  /** Provenance chain (where each piece came from) */
  provenance: ContextProvenance[];
}

/**
 * Content retrieved from context resolution.
 */
export interface ContextContent {
  /** Content type (determines how to interpret data) */
  type: ContextContentType;
  /** Raw data (parsed from file) */
  data: unknown;
  /** File path where content was found */
  sourcePath: string;
  /** Last modified timestamp */
  lastModified?: string;
}

/**
 * Types of content that can be resolved.
 */
export type ContextContentType =
  | "person"
  | "memory"
  | "rules"
  | "research"
  | "config"
  | "reference"
  | "unknown";

/**
 * Provenance record for context inheritance.
 */
export interface ContextProvenance {
  /** Scope where this piece came from */
  scope: Scope;
  /** What was inherited */
  key: string;
  /** Whether this was the final value or overridden */
  overridden: boolean;
}

// ============================================================================
// Context Search
// ============================================================================

/**
 * Parameters for searching context.
 */
export interface ContextSearchQuery {
  /** Search query string */
  query: string;
  /** Limit results to specific scope */
  scope?: Scope;
  /** Limit to specific content types */
  types?: ContextContentType[];
  /** Maximum results */
  limit?: number;
  /** Include content snippets in results */
  includeSnippets?: boolean;
}

/**
 * A single search result.
 */
export interface ContextSearchResult {
  /** URI of the matching resource */
  uri: string;
  /** Content type */
  type: ContextContentType;
  /** Scope where found */
  scope: Scope;
  /** Relevance score (0.0 to 1.0) */
  score: number;
  /** Title or name of the resource */
  title: string;
  /** Snippet of matching content (if requested) */
  snippet?: string;
}

/**
 * Full search results.
 */
export interface ContextSearchResults {
  /** Query that was executed */
  query: string;
  /** Number of results */
  totalCount: number;
  /** The results */
  results: ContextSearchResult[];
}

// ============================================================================
// Visibility Rules
// ============================================================================

/**
 * Visibility matrix defining what scopes can see.
 *
 * | Scope  | Can See                       |
 * |--------|-------------------------------|
 * | Global | Only global                   |
 * | Org    | Own org + global              |
 * | Team   | Own team + own org + global   |
 */
export interface VisibilityRules {
  /** Whether cross-org references are allowed */
  allowCrossOrg: boolean;
  /** Whether team can see other teams in same org */
  allowCrossTeam: boolean;
  /** Explicit grants (org/team pairs that can see each other) */
  grants?: VisibilityGrant[];
}

/**
 * An explicit visibility grant between scopes.
 */
export interface VisibilityGrant {
  /** Source scope */
  from: Scope;
  /** Target scope that can be seen */
  to: Scope;
  /** What is visible (all or specific paths) */
  paths?: string[];
}

// ============================================================================
// Reference Types
// ============================================================================

/**
 * A lightweight reference to context (used in other types).
 */
export interface ContextRef {
  /** The ctx:// URI */
  uri: string;
  /** Optional display label */
  label?: string;
}

/**
 * Batch of references to resolve.
 */
export interface RefBatch {
  /** References to resolve */
  refs: ContextRef[];
  /** Current scope for resolution */
  fromScope: Scope;
}

/**
 * Result of batch reference resolution.
 */
export interface RefBatchResult {
  /** Successfully resolved references */
  resolved: Map<string, ResolvedContext>;
  /** References that failed to resolve */
  failed: Map<string, string>; // uri -> error message
}
