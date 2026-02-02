/**
 * Context resolution system.
 *
 * Provides URI-based context resolution with scoped fallback behavior.
 *
 * @module
 */

// Re-export types
export type {
  ContextContent,
  ContextContentType,
  ContextProvenance,
  ContextRef,
  ContextSearchQuery,
  ContextSearchResult,
  ContextSearchResults,
  ParsedUri,
  RefBatch,
  RefBatchResult,
  ResolvedContext,
  Scope,
  ScopeChain,
  ScopeLevel,
  UriScheme,
  VisibilityGrant,
  VisibilityRules,
} from "../types/mod.ts";

// URI parsing
export { buildUri, parseUri, validateUri } from "./uri.ts";

// Scope management
export {
  buildScopeChain,
  createScope,
  formatScope,
  getVisibleScopes,
  scopeMatches,
} from "./scope.ts";

// Resolution
export {
  canResolve,
  resolveContext,
  resolveContextBatch,
} from "./resolution.ts";

// Search
export { searchContext } from "./search.ts";
