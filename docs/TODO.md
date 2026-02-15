# tyvi TODO

Implementation tasks for the core library.

---

## Legend

- `[ ]` - Not started
- `[~]` - In progress
- `[x]` - Complete
- `[!]` - Blocked / needs attention

---

## Phase 1: Foundation ✓

### Project Setup

- [x] Initialize deno.json with dependencies
- [x] Set up TypeScript strict mode
- [x] Create mod.ts entry point
- [x] Add LICENSE (MPL-2.0)
- [x] Set up test infrastructure
- [x] Configure CI workflow

### Core Types

- [x] Create src/types/ directory structure
- [x] atoms.ts — Traits, skills, quirks, phrases, composition rules
- [x] people.ts — Person, ComputedPerson, computation trace
- [x] memory.ts — Memory, fading, reinforcement, queries
- [x] context.ts — URI scheme, scope hierarchy, resolution
- [x] relationship.ts — Relationship entries and dynamics
- [x] config.ts — Global config, caching, validation
- [x] devspace.ts — Repos, inventory, devspace config, operations
- [x] mod.ts — Re-export all types

### JSON Schemas

- [ ] Move schemas/ from tyvi-mcp
- [ ] Ensure all schemas are complete
- [ ] Add devspace.schema.json
- [ ] Add inventory.schema.json

---

## Phase 2: Computation Engine ✓

### Files Implemented

- [x] `lexer.ts` — Expression tokenizer (Moo-based)
- [x] `parser.ts` — Recursive descent parser
- [x] `ast.ts` — AST node types
- [x] `evaluator.ts` — Expression evaluator with context
- [x] `dependencies.ts` — Dependency analysis and cycle detection
- [x] `rules.ts` — Rule application
- [x] `mod.ts` — Module exports
- [x] `README.md` — Documentation

### Tests

- [x] Lexer tests (19 tests)
- [x] Parser tests (36 tests)
- [x] Evaluator tests (78 tests)
- [x] Dependencies tests (27 tests)

---

## Phase 3: Atoms System ✓

### Files Implemented

- [x] `traits.ts` — Load trait axis definitions
- [x] `skills.ts` — Load skill definitions
- [x] `quirks.ts` — Load quirk definitions
- [x] `phrases.ts` — Load phrase definitions
- [x] `experience.ts` — Load experience definitions
- [x] `stacks.ts` — Load stack definitions
- [x] `mod.ts` — Module exports with `loadAtoms()` function

### Tests

- [x] Atoms loading tests (14 tests)

---

## Phase 4: People System ✓

### Files Implemented

- [x] `computation.ts` — Person computation pipeline
- [x] `loading.ts` — Load person TOML files
- [x] `mod.ts` — Module exports

### Public API

- [x] `loadPerson(dataPath, id)` — Load raw person definition
- [x] `computePerson(dataPath, id)` — Compute all derived values
- [x] `listPeople(dataPath)` — List all people summaries

### Tests

- [x] People system tests (7 tests)

---

## Phase 5: Memory System ✓

### Files Implemented

- [x] `storage.ts` — Memory read/write with TOML
- [x] `strength.ts` — Strength calculation with exponential decay
- [x] `reinforcement.ts` — Memory reinforcement logic
- [x] `similarity.ts` — Similarity detection (Jaccard + time proximity)
- [x] `query.ts` — Memory queries with filtering and sorting
- [x] `lifecycle.ts` — Create, update, prune operations
- [x] `logs.ts` — Log entry management
- [x] `paths.ts` — Path utilities
- [x] `mod.ts` — Module exports

### Public API

- [x] `recallMemories(dataPath, query)` — Query memories
- [x] `listMemories(dataPath, filters)` — List memory summaries
- [x] `recordMemory(dataPath, input)` — Create new memory
- [x] `reinforceMemory(dataPath, id, reason)` — Reinforce existing
- [x] `pruneMemories(dataPath)` — Remove weak memories

### Tests

- [x] Memory system tests (15+ tests)
- [x] Manual decay formula verification

---

## Phase 6: Context Resolution ✓

### Files Implemented

- [x] `uri.ts` — Parse ctx:// URIs
- [x] `scope.ts` — Scope hierarchy and chain building
- [x] `resolution.ts` — Resolve references with fallback
- [x] `search.ts` — Search context by query
- [x] `mod.ts` — Module exports

### Public API

- [x] `parseUri(uri)` — Parse ctx:// URI into components
- [x] `resolveContext(dataPath, uri)` — Resolve with fallback
- [x] `searchContext(dataPath, query)` — Search all context

### Tests

- [x] Context resolution tests (40 tests)

---

## Phase 7: Devspace Operations ✓

### Rename and Restructure

- [x] Rename src/workspace/ to src/devspace/
- [x] Update all imports
- [x] Rename functions to use "devspace" terminology

### Core Operations

- [x] `load(devspace, pattern)` — Move repos from staging to lab (symlink)
- [x] `unload(devspace, pattern)` — Move repos from lab to staging
- [x] `checkGitAllowed(devspace, path)` — Check git policy
- [x] `getBlockedMessage(devspace, path)` — Get guidance message
- [x] `findDevspaceRoot(from)` — Find devspace root directory
- [x] `getStatus(devspace)` — Get status of all repos
- [x] `listRepos(devspace)` — List repos without git checks
- [x] `clone(devspace, options)` — Clone repos to staging
- [x] `sync(devspace, options)` — Synchronize devspace
- [x] `addRepo(devspace, url, options)` — Add repo to inventory
- [x] `removeRepo(devspace, name, options)` — Remove repo from inventory

### State Management

- [x] Create .state/ directory handling
- [x] Implement lab.toml read/write
- [x] Implement ext.toml read/write
- [x] Track loaded repos with timestamps

### Git Guard Integration

- [x] Shell integration (detectShell, generateShellInit, writeShellInit, appendToRcFile)
- [x] direnv integration (hasDirenv, generateEnvrc, writeEnvrc, allowDirenv)
- [x] Git hooks (generateHook, hasHooks, installHooks, removeHooks)
- [x] Guard validation (validateGuards)

### Migration Operations

- [x] `scanDirectory` — Discover entries in a directory
- [x] `migrateRepo` — Move/copy repo to staging + inventory
- [x] `suggestNamespace` — Infer namespace from remote URL
- [x] `deleteEntry` — Remove unwanted entries

### Relationship Operations

- [x] `loadRelationships` — Load per-person relationships
- [x] `listRelationships` — Query relationships with filters
- [x] `addRelationshipLogEntry` — Append events to relationship log

---

## Phase 8: Schemas ✓

### JSON Schemas (draft-07)

- [x] trait-axis.schema.json — Trait axis with bipolar spectrum
- [x] skill.schema.json — Skill/experience/stack definitions (shared structure)
- [x] quirk.schema.json — Binary personality markers
- [x] phrase.schema.json — Conditional communication flavor
- [x] person.schema.json — Person definition with anchor values
- [x] memory.schema.json — Memory with decay/reinforcement
- [x] relationship.schema.json — Relationship collections
- [x] devspace.schema.json — Devspace configuration (tyvi.toml)
- [x] inventory.schema.json — Inventory configuration (inventory.toml)
- [x] Added schemas to JSR publish config

---

## Phase 9: Cache System ✓

### Files Implemented

- [x] `src/cache/hashing.ts` — SHA-256 file/directory hashing, source hash build/verify
- [x] `src/cache/storage.ts` — JSON-based cache read/write, CRUD for entries
- [x] `src/cache/validation.ts` — Entry validation, schedule checking, age-based pruning
- [x] `src/cache/mod.ts` — Module exports

### Public API

- [x] `hashFile(path)` — SHA-256 hash of file contents
- [x] `hashDirectory(path)` — Deterministic hash of all files in directory
- [x] `buildSourceHash(file, dataPath, section?)` — Build SourceHash for cache invalidation
- [x] `verifySourceHash(hash, dataPath)` — Check if source still matches
- [x] `readCache(cachePath)` / `writeCache(cachePath, storage)` — Persist cache to JSON
- [x] `getCacheEntry(storage, key)` / `setCacheEntry(...)` / `removeCacheEntry(...)` — CRUD
- [x] `validateEntry(entry, dataPath)` / `validateStorage(storage, dataPath)` — Verify hashes
- [x] `shouldRunValidation(schedule, tier)` — Check validation schedule
- [x] `pruneOldEntries(storage, maxAgeMs)` — Remove stale entries

### Tests

- [x] Cache tests (22 tests)

### Note

Cache primitives only. Integration into existing functions (loadAtoms, computePerson, etc.) is
deferred until dogfooding identifies real bottlenecks.

---

## Phase 10: Documentation & Polish

### Code Documentation

- [ ] JSDoc for all public functions
- [ ] Examples in doc comments
- [ ] Type documentation

### README

- [ ] Update with new API
- [ ] Add quick start examples
- [ ] Document all exports

### CI/CD

- [x] GitHub Actions CI workflow (test on push/PR)
- [x] Release workflow (manual dispatch → JSR publish)
- [x] Published to JSR as @hiisi/tyvi

---

## Test Summary

**Total: 392 passing tests**

| Module                     | Tests |
| -------------------------- | ----- |
| Computation (lexer)        | 19    |
| Computation (parser)       | 36    |
| Computation (evaluator)    | 78    |
| Computation (dependencies) | 27    |
| Atoms                      | 14    |
| People                     | 13    |
| Memory                     | 18    |
| Context                    | 40    |
| Config                     | 13    |
| Devspace (operations)      | 39    |
| Devspace (migration)       | 18    |
| Devspace (guards)          | 42    |
| Relationships              | 13    |
| Cache                      | 22    |

---

## Notes

### Design Principles

- **Core library**: No CLI code, no user interaction
- **Clean exports**: Only expose public API from mod.ts
- **Testable**: All modules independently testable
- **No opinions**: Configuration drives behavior
- **No built-in data**: All data comes from user projects

### Dependencies

Deno std library plus one external:

- `@std/path` — Path utilities
- `@std/fs` — File system utilities
- `@std/toml` — TOML parsing
- `moo` — Lexer tokenization (computation engine)

---

## Related Documents

- `docs/DESIGN.md` — Architecture decisions
- `docs/MEMORY.md` — Memory system documentation
- `docs/IMPLEMENTATION_SUMMARY.md` — Memory implementation details
- `tyvi-cli/docs/DESIGN.md` — CLI interface design
- `tyvi-mcp/docs/DESIGN.md` — MCP server design
