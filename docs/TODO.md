# tyvi TODO

Implementation tasks for the core library.

---

## Active Branches

| Branch | Focus | Status |
|--------|-------|--------|
| `feat/test-refactor-devspace` | Test fixes, workspace→devspace rename, devspace ops | [~] In progress |

See `docs/TODO.feat-test-refactor-devspace.md` for branch-specific tasks.

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

## Phase 8: Schemas

- [ ] Copy schemas/ from tyvi-mcp
- [ ] Add devspace.schema.json
- [ ] Add inventory.schema.json

---

## Phase 9: Cache System

- [ ] Implement cache storage
- [ ] Content hashing
- [ ] Cache validation
- [ ] Export from mod.ts

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

## Test Summary

**Total: 247 passing tests**

| Module | Tests |
|--------|-------|
| Computation (lexer) | 19 |
| Computation (parser) | 36 |
| Computation (evaluator) | 78 |
| Computation (dependencies) | 27 |
| Atoms | 14 |
| People | 7 |
| Memory | 15 |
| Context | 40 |
| Config | 9 |
| Workspace | 2 |

---

## Notes

### Design Principles

- **Core library**: No CLI code, no user interaction
- **Clean exports**: Only expose public API from mod.ts
- **Testable**: All modules independently testable
- **No opinions**: Configuration drives behavior
- **No built-in data**: All data comes from user projects

### Dependencies

Only Deno std library:
- `@std/path` — Path utilities
- `@std/fs` — File system utilities
- `@std/toml` — TOML parsing

No external dependencies.

---

## Related Documents

- `docs/DESIGN.md` — Architecture decisions
- `docs/MEMORY.md` — Memory system documentation
- `docs/IMPLEMENTATION_SUMMARY.md` — Memory implementation details
- `tyvi-cli/docs/DESIGN.md` — CLI interface design
- `tyvi-mcp/docs/DESIGN.md` — MCP server design
