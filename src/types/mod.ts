/**
 * Type definitions for tyvi.
 *
 * This module re-exports all types used throughout the tyvi ecosystem.
 * Import from here rather than individual files.
 *
 * @module
 */

// Devspace types (repos, inventory, config)
export type {
    CloneResult, CloneStatus, Devspace, DevspaceConfig, DevspaceDefaults, DevspaceNamespaces, DevspaceSection, ExtState, ExtStateEntry, GitPolicy, GitStatus, InventoryConfig, InventoryMeta, LabState, LabStateEntry, LoadResult, RemoteDefinition,
    RepoDefinition, RepoStatus, RepoWithStatus, SyncOptions, SyncResult, UnloadResult
} from "./devspace.ts";

// Git restriction and shell integration types
export type {
    GitCheckResult, InitOptions, InitResult, ShellIntegration, ValidationIssue, ValidationResult
} from "./git.ts";

// Atom types (traits, skills, quirks, phrases)
export type {
    Atoms, AxisPoint, Composition, CompositionRule, Experience, ExperienceLevels, Phrase,
    PhraseAtom, PhraseConditions, Quirk,
    QuirkAtom, QuirkAutoAssign,
    QuirkOverdone, Skill, SkillLevels, Stack, StackLevels, Trait, TraitAxis
} from "./atoms.ts";

// People types (Person, ComputedPerson)
export type {
    ComputationTrace,
    ComputedPerson, Person, PersonCustom, PersonIdentity,
    PersonOrgs,
    PersonQuirks, PersonSummary, PersonTools, RuleApplication,
    ValueTrace
} from "./people.ts";

// Memory types
export type {
    Memory, MemoryContent, MemoryEventType, MemoryFade, MemoryFile, MemoryFilters, MemoryInput, MemoryLogEntry, MemoryOutcome, MemoryQuery, MemorySignificance, MemoryStrength, MemorySummary, MemoryTags, PruneResult, ReinforcementResult, SimilarityResult
} from "./memory.ts";

// Context types (URI scheme, scope, resolution)
export type {
    ContextContent,
    ContextContentType,
    ContextProvenance, ContextRef, ContextSearchQuery,
    ContextSearchResult,
    ContextSearchResults, ParsedUri, RefBatch,
    RefBatchResult, ResolvedContext, Scope,
    ScopeChain, ScopeLevel, UriScheme, VisibilityGrant, VisibilityRules
} from "./context.ts";

// Relationship types
export type {
    RelationshipCollection, RelationshipDynamic, RelationshipEntry, RelationshipEventType, RelationshipFile, RelationshipLogEntry, RelationshipQuery, RelationshipStatus, RelationshipSummary, RelationshipType
} from "./relationship.ts";

// Config types (global config, caching)
export type {
    CacheEntry, CacheMeta, CacheStorage, Config, ConfigDefaults, ConfigMeta, ConfigPaths, OrgAliases,
    OrgEmails, SourceHash, ValidationSchedule
} from "./config.ts";

