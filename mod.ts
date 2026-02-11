/**
 * @module
 * Core library for devspace orchestration, people computation, and context management.
 *
 * tyvi manages multi-repo devspaces through declarative config files.
 * Define your repositories in inventory.toml files, organize them by namespace,
 * and use the library to load, unload, clone, sync, and track status.
 *
 * This is the core library. For CLI access, use tyvi-cli.
 * For AI agent access via MCP, use tyvi-mcp.
 *
 * @example
 * ```ts
 * import { loadDevspace, getStatus } from "@hiisi/tyvi";
 *
 * const devspace = await loadDevspace(".");
 * const status = await getStatus(devspace);
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

// Re-export all types from the types module
export type {
  // Atom types
  Atoms,
  AxisPoint,
  // Config types
  CacheEntry,
  CacheMeta,
  CacheStorage,
  // Devspace types
  CloneResult,
  CloneStatus,
  Composition,
  CompositionRule,
  // People types
  ComputationTrace,
  ComputedPerson,
  Config,
  ConfigDefaults,
  ConfigMeta,
  ConfigPaths,
  // Context types
  ContextContent,
  ContextContentType,
  ContextProvenance,
  ContextRef,
  ContextSearchQuery,
  ContextSearchResult,
  ContextSearchResults,
  Devspace,
  DevspaceConfig,
  DevspaceDefaults,
  DevspaceNamespaces,
  DevspaceSection,
  DiscoveredEntry,
  DiscoveredEntryType,
  Experience,
  ExperienceLevels,
  ExtState,
  ExtStateEntry,
  GitCheckResult,
  GitPolicy,
  GitStatus,
  InitOptions,
  InitResult,
  InventoryConfig,
  InventoryMeta,
  LabState,
  LabStateEntry,
  LoadResult,
  // Memory types
  Memory,
  MemoryContent,
  MemoryEventType,
  MemoryFade,
  MemoryFile,
  MemoryFilters,
  MemoryInput,
  MemoryLogEntry,
  MemoryOutcome,
  MemoryQuery,
  MemorySignificance,
  MemoryStrength,
  MemorySummary,
  MemoryTags,
  MigrateEntryResult,
  MigrateRepoOptions,
  OrgAliases,
  OrgEmails,
  ParsedUri,
  Person,
  PersonCustom,
  PersonIdentity,
  PersonOrgs,
  PersonQuirks,
  PersonSummary,
  PersonTools,
  Phrase,
  PhraseAtom,
  PhraseConditions,
  PruneResult,
  Quirk,
  QuirkAtom,
  QuirkAutoAssign,
  QuirkOverdone,
  RefBatch,
  RefBatchResult,
  ReinforcementResult,
  // Relationship types
  RelationshipCollection,
  RelationshipDynamic,
  RelationshipEntry,
  RelationshipEventType,
  RelationshipFile,
  RelationshipLogEntry,
  RelationshipQuery,
  RelationshipStatus,
  RelationshipSummary,
  RelationshipType,
  RemoteDefinition,
  RepoDefinition,
  RepoListing,
  RepoStatus,
  RepoWithStatus,
  ResolvedContext,
  RuleApplication,
  ScanResult,
  Scope,
  ScopeChain,
  ScopeLevel,
  ShellIntegration,
  SimilarityResult,
  Skill,
  SkillLevels,
  SourceHash,
  Stack,
  StackLevels,
  SyncOptions,
  SyncResult,
  Trait,
  TraitAxis,
  UnloadResult,
  UriScheme,
  ValidationIssue,
  ValidationResult,
  ValidationSchedule,
  ValueTrace,
  VisibilityGrant,
  VisibilityRules,
} from "./src/types/mod.ts";

// ============================================================================
// Devspace Operations
// ============================================================================

// Re-export config and devspace loading
export { findDevspaceRoot, initDevspace, loadDevspace, loadInventory } from "./src/config/mod.ts";

// Re-export devspace operations
export {
  addRepo,
  clone,
  getStatus,
  listRepos,
  load,
  removeRepo,
  sync,
  unload,
} from "./src/devspace/mod.ts";

// Re-export git restriction checking
export { checkGitAllowed, getBlockedMessage } from "./src/devspace/mod.ts";

// Re-export migration operations
export { deleteEntry, migrateRepo, scanDirectory, suggestNamespace } from "./src/devspace/mod.ts";

// Re-export shell integration
export {
  appendToRcFile,
  detectShell,
  generateShellInit,
  writeShellInit,
} from "./src/devspace/mod.ts";

// Re-export direnv integration
export { allowDirenv, generateEnvrc, hasDirenv, writeEnvrc } from "./src/devspace/mod.ts";

// Re-export git hooks
export { generateHook, hasHooks, installHooks, removeHooks } from "./src/devspace/mod.ts";

// Re-export validation
export { validateGuards } from "./src/devspace/mod.ts";

// Re-export git utilities
export { getCurrentBranch, getGitStatus, isGitRepo } from "./src/git/mod.ts";

// ============================================================================
// Computation Engine
// ============================================================================

// Re-export computation module
export {
  // Dependencies
  analyzeDependencies,
  // AST constructors
  binaryOp,
  buildDependencyGraph,
  // Rules
  buildRuleCollection,
  combineResults,
  comparisonOp,
  // Evaluator
  createContext,
  createRule,
  evaluate,
  EvaluationError,
  Evaluator,
  extractDependencies,
  formatCycle,
  functionCall,
  getBaseValue,
  getRuleEvaluationOrder,
  getTargetType,
  identifier,
  isCircular,
  // Lexer
  Lexer,
  LexerError,
  logCircularDependency,
  normalizeValue,
  numberLiteral,
  // Parser
  parse,
  ParseError,
  Parser,
  RuleEngineError,
  specialValue,
  tokenize,
  TokenType,
  wildcard,
} from "./src/computation/mod.ts";

export type {
  // AST types
  BinaryOp,
  ComparisonOp,
  // Rule types
  CompositionRule as ComputationRule,
  // Dependency types
  Dependency,
  DependencyAnalysis,
  // Evaluator types
  EvaluationContext,
  Expression,
  ExpressionNode,
  FunctionCall,
  Identifier,
  NumberLiteral,
  RuleCollection,
  RuleResult,
  SpecialValue,
  // Lexer types
  Token,
  ValueType,
  Wildcard,
} from "./src/computation/mod.ts";

/**
 * Create an empty computation trace for debugging.
 *
 * Helper function for initializing a trace when computation details aren't needed.
 *
 * @returns Empty computation trace
 */
export function createEmptyTrace(): import("./src/types/mod.ts").ComputationTrace {
  return {
    values: new Map(),
    circularDependencies: [],
    computationOrder: [],
  };
}

// ============================================================================
// Atoms Operations
// ============================================================================

export {
  loadAtoms,
  loadExperience,
  loadPhrases,
  loadQuirks,
  loadSkills,
  loadStacks,
  loadTraits,
} from "./src/atoms/mod.ts";

// ============================================================================
// People Operations
// ============================================================================

export { computeFromData, computePerson, listPeople, loadPerson } from "./src/people/mod.ts";

// ============================================================================
// Memory Operations
// ============================================================================

export {
  calculateSimilarity,
  calculateStrength,
  findSimilarMemories,
  getDefaultHalfLife,
  // Utility exports for advanced usage
  getMemoryStrength,
  listMemories,
  pruneMemories,
  recallMemories,
  recordMemory,
  reinforceMemory,
  toMemorySummary,
} from "./src/memory/mod.ts";

// ============================================================================
// Relationship Operations
// ============================================================================

export {
  addRelationshipLogEntry,
  listRelationships,
  loadRelationships,
} from "./src/relationships/mod.ts";

// ============================================================================
// Context Operations
// ============================================================================

export {
  buildScopeChain,
  buildUri,
  canResolve,
  createScope,
  formatScope,
  getVisibleScopes,
  parseUri,
  resolveContext,
  resolveContextBatch,
  scopeMatches,
  searchContext,
  validateUri,
} from "./src/context/mod.ts";
