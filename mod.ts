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
 * import { loadDevspace, load, unload, getStatus } from "@hiisi/tyvi";
 *
 * const devspace = await loadDevspace(".");
 * const status = await getStatus(devspace);
 *
 * // Load a repo to the lab
 * await load(devspace, "viola");
 *
 * // Unload when done
 * await unload(devspace, "viola");
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
    CloneStatus, Composition,
    CompositionRule,
    // People types
    ComputationTrace,
    ComputedPerson, Config,
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
    ContextSearchResults, Devspace,
    DevspaceConfig,
    DevspaceDefaults,
    DevspaceNamespaces,
    DevspaceSection, Experience,
    ExperienceLevels, ExtState,
    ExtStateEntry,
    GitPolicy,
    GitStatus,
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
    MemoryTags, OrgAliases,
    OrgEmails, ParsedUri, Person,
    PersonCustom,
    PersonIdentity,
    PersonOrgs,
    PersonQuirks,
    PersonSummary,
    PersonTools, Phrase,
    PhraseAtom,
    PhraseConditions, PruneResult, Quirk,
    QuirkAtom,
    QuirkAutoAssign,
    QuirkOverdone, RefBatch,
    RefBatchResult, ReinforcementResult,
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
    RelationshipType, RemoteDefinition,
    RepoDefinition,
    RepoStatus,
    RepoWithStatus, ResolvedContext, RuleApplication, Scope,
    ScopeChain,
    ScopeLevel, SimilarityResult, Skill,
    SkillLevels, SourceHash, Stack,
    StackLevels, SyncOptions,
    SyncResult, Trait,
    TraitAxis, UnloadResult, UriScheme, ValidationSchedule, ValueTrace, VisibilityGrant,
    VisibilityRules
} from "./src/types/mod.ts";

// ============================================================================
// Devspace Operations (existing, to be renamed internally)
// ============================================================================

// Re-export config parsing
export { loadInventory } from "./src/config/mod.ts";

// Re-export workspace operations (TODO: rename to devspace internally)
export {
    addRepo,
    clone,
    getStatus,
    removeRepo,
    sync
} from "./src/workspace/mod.ts";

// Re-export git utilities
export {
    getCurrentBranch,
    getGitStatus,
    isGitRepo
} from "./src/git/mod.ts";

// ============================================================================
// Devspace Operations (new API - to be implemented)
// ============================================================================

// TODO: These will be implemented as part of the migration
// export { loadDevspace } from "./src/devspace/mod.ts";
// export { load, unload } from "./src/devspace/operations.ts";
// export { checkGitAllowed, getDevspaceHint, findDevspaceRoot } from "./src/devspace/restrictions.ts";

// ============================================================================
// People Operations
// ============================================================================

export { loadPerson, computePerson, listPeople } from "./src/people/mod.ts";
export { loadAtoms } from "./src/atoms/mod.ts";

// ============================================================================
// Memory Operations (to be migrated from tyvi-mcp)
// ============================================================================

// TODO: These will be implemented after migration
// export { recallMemories, listMemories, recordMemory, reinforceMemory, pruneMemories } from "./src/memory/mod.ts";

// ============================================================================
// Context Operations (to be migrated from tyvi-mcp)
// ============================================================================

// TODO: These will be implemented after migration
// export { parseUri, resolveContext, searchContext } from "./src/context/mod.ts";
