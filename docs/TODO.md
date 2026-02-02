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
- [ ] Set up test infrastructure
- [ ] Configure CI workflow

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

## Phase 2: Computation Engine

**Source:** Copy from `tyvi-mcp/src/computation/`

### Files to Move
- [ ] `lexer.ts` — Expression tokenizer
- [ ] `parser.ts` — Expression parser  
- [ ] `ast.ts` — AST node types
- [ ] `evaluator.ts` — Expression evaluator
- [ ] `dependencies.ts` — Dependency analysis
- [ ] `rules.ts` — Rule application
- [ ] `quirks.ts` — Quirk auto-assignment
- [ ] `phrases.ts` — Phrase matching
- [ ] `mod.ts` — Module exports
- [ ] `README.md` — Documentation

### After Move
- [ ] Update imports to use `../types/mod.ts`
- [ ] Export from main `mod.ts`
- [ ] Move computation tests from tyvi-mcp/tests/computation/
- [ ] Ensure all tests pass

---

## Phase 3: Atoms System

**Source:** Copy from `tyvi-mcp/src/atoms/`

### Files to Create/Move
- [ ] `traits.ts` — Load trait axis definitions
- [ ] `skills.ts` — Load skill definitions
- [ ] `quirks.ts` — Load quirk definitions
- [ ] `phrases.ts` — Load phrase definitions
- [ ] `experience.ts` — Load experience definitions
- [ ] `stacks.ts` — Load stack definitions
- [ ] `mod.ts` — Module exports with `loadAtoms()` function

### Implementation
- [ ] Parse TOML files from data/atoms/ directories
- [ ] Return `Atoms` type from types/atoms.ts
- [ ] Handle missing files gracefully
- [ ] Cache loaded atoms

---

## Phase 4: People System

**Source:** Copy from `tyvi-mcp/src/people/`

### Files to Move
- [ ] `computation.ts` — Full person computation pipeline
- [ ] `loading.ts` — Load person TOML files
- [ ] `mod.ts` — Module exports

### Public API
- [ ] `loadPerson(dataPath, id)` — Load raw person definition
- [ ] `computePerson(dataPath, id)` — Compute all derived values
- [ ] `listPeople(dataPath)` — List all people summaries

### After Move
- [ ] Update imports
- [ ] Export from main mod.ts
- [ ] Move tests from tyvi-mcp/tests/people/

---

## Phase 5: Memory System

**Source:** Copy from `tyvi-mcp/src/memory/`

### Files to Move
- [ ] `storage.ts` — Memory read/write
- [ ] `strength.ts` — Strength calculation with decay
- [ ] `reinforcement.ts` — Memory reinforcement logic
- [ ] `similarity.ts` — Similarity detection between memories
- [ ] `query.ts` — Memory queries
- [ ] `lifecycle.ts` — Create, update, prune operations
- [ ] `logs.ts` — Log entry management
- [ ] `paths.ts` — Path utilities for memory files
- [ ] `mod.ts` — Module exports

### Public API
- [ ] `recallMemories(dataPath, query)` — Query memories
- [ ] `listMemories(dataPath, filters)` — List memory summaries
- [ ] `recordMemory(dataPath, input)` — Create new memory
- [ ] `reinforceMemory(dataPath, id, reason)` — Reinforce existing
- [ ] `pruneMemories(dataPath)` — Remove weak memories

### After Move
- [ ] Update imports
- [ ] Export from main mod.ts
- [ ] Move tests from tyvi-mcp/tests/memory/

---

## Phase 6: Context Resolution

**Source:** Copy from `tyvi-mcp/src/context/`

### Files to Move/Create
- [ ] `uri.ts` — Parse ctx:// URIs
- [ ] `scope.ts` — Scope hierarchy and chain building
- [ ] `resolution.ts` — Resolve references with fallback
- [ ] `search.ts` — Search context by query
- [ ] `mod.ts` — Module exports

### Public API
- [ ] `parseUri(uri)` — Parse ctx:// URI into components
- [ ] `resolveContext(dataPath, uri)` — Resolve with fallback
- [ ] `searchContext(dataPath, query)` — Search all context

### After Move
- [ ] Update imports
- [ ] Export from main mod.ts
- [ ] Write tests for URI parsing and resolution

---

## Phase 7: Devspace Operations

**Enhance existing:** `src/workspace/` → rename to `src/devspace/`

### Rename and Restructure
- [ ] Rename src/workspace/ to src/devspace/
- [ ] Update all imports
- [ ] Rename functions to use "devspace" terminology

### New Operations
- [ ] `load(devspace, pattern)` — Move repos from staging to lab
- [ ] `unload(devspace, pattern)` — Move repos from lab to staging
- [ ] `checkGitAllowed(devspace, path)` — Check git policy
- [ ] `getDevspaceHint(devspace)` — Get guidance message
- [ ] `findDevspaceRoot(from)` — Find devspace root directory

### State Management
- [ ] Create .state/ directory handling
- [ ] Implement lab.toml read/write
- [ ] Implement ext.toml read/write
- [ ] Track loaded repos with timestamps

---

## Phase 8: Schemas & Testing Prep

### Schemas
- [ ] Copy schemas/ from tyvi-mcp
- [ ] Add devspace.schema.json
- [ ] Add inventory.schema.json

---

## Phase 9: Testing

### Test Infrastructure
- [ ] Create tests/ directory structure
- [ ] Set up test utilities and fixtures
- [ ] Configure test tasks in deno.json

### Test Suites
- [ ] Computation engine tests
- [ ] Atoms loading tests
- [ ] People computation tests
- [ ] Memory system tests
- [ ] Context resolution tests
- [ ] Devspace operation tests

### Integration Tests
- [ ] Full person computation pipeline
- [ ] Memory lifecycle (create, reinforce, prune)
- [ ] Context fallback chain
- [ ] Load/unload workflow

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
- [ ] GitHub Actions workflow
- [ ] Test on PR
- [ ] Publish to JSR

---

## Notes

### Migration Order

The recommended order for migration is:

1. **Computation engine** — No dependencies on other tyvi-mcp code
2. **Atoms loading** — Depends only on types
3. **People system** — Depends on computation, atoms
4. **Memory system** — Depends only on types
5. **Context resolution** — Depends only on types
6. **Wire up devspace** — Uses all systems

### Design Principles

- **Core library**: No CLI code, no user interaction
- **Clean exports**: Only expose public API from mod.ts
- **Testable**: All modules independently testable
- **No opinions**: Configuration drives behavior

### Dependencies

Only Deno std library:
- `@std/path` — Path utilities
- `@std/fs` — File system utilities
- `@std/toml` — TOML parsing

No external dependencies.

---

## Related Documents

- `docs/DESIGN.md` — Architecture decisions
- `docs/TODO.DEPRECATION.md` — Migration tracking
- `tyvi-cli/docs/DESIGN.md` — CLI interface design
- `tyvi-mcp/docs/DESIGN.md` — MCP server design
