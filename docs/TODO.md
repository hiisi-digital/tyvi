# tyvi TODO

Implementation tasks for the core library.

---

## Legend

- `[ ]` - Not started
- `[~]` - In progress
- `[x]` - Complete
- `[!]` - Blocked / needs attention

---

## Phase 1: Foundation (Partial)

### Project Setup
- [x] Initialize deno.json with dependencies
- [x] Set up TypeScript strict mode
- [x] Create mod.ts entry point
- [x] Add LICENSE (MPL-2.0)
- [ ] Set up test infrastructure
- [ ] Configure CI workflow

### Core Types (from tyvi-mcp)
- [ ] Move types.ts from tyvi-mcp
- [ ] Organize into src/types/ directory
- [ ] Split into atoms.ts, people.ts, memory.ts, devspace.ts, context.ts
- [ ] Export all from types/mod.ts

### JSON Schemas (from tyvi-mcp)
- [ ] Move schemas/ from tyvi-mcp
- [ ] Ensure all schemas are complete
- [ ] Add devspace.schema.json
- [ ] Add inventory.schema.json

---

## Phase 2: Computation Engine (from tyvi-mcp)

### Move from tyvi-mcp
- [ ] Move src/computation/ directory
- [ ] Move src/parsing/ directory (if separate)
- [ ] Update imports

### Computation Components
- [x] Lexer (tokenize expressions)
- [x] Parser (build AST)
- [x] AST node types
- [x] Evaluator (compute values)
- [x] Dependency analysis
- [x] Rule application engine
- [x] Quirk auto-assignment
- [x] Phrase matching

### Tests
- [ ] Move computation tests from tyvi-mcp
- [ ] Ensure all pass after move

---

## Phase 3: People System (from tyvi-mcp)

### Move from tyvi-mcp
- [ ] Move src/people/ directory
- [ ] Move src/atoms/ directory
- [ ] Update imports

### People Components
- [x] Person TOML loading
- [x] Full computation pipeline
- [ ] Person listing
- [ ] Computed value caching

### Atom Loading
- [ ] Trait axis loading
- [ ] Skill definition loading
- [ ] Quirk definition loading
- [ ] Phrase atom loading
- [ ] Experience loading
- [ ] Stack loading

### Tests
- [ ] Move people tests from tyvi-mcp
- [ ] Ensure all pass after move

---

## Phase 4: Memory System (from tyvi-mcp)

### Move from tyvi-mcp
- [ ] Move src/memory/ directory
- [ ] Update imports

### Memory Components
- [x] Storage (read/write)
- [x] Strength calculation
- [x] Reinforcement logic
- [x] Similarity detection
- [x] Query system
- [x] Lifecycle (create, update, prune)
- [x] Log management

### Tests
- [ ] Move memory tests from tyvi-mcp
- [ ] Ensure all pass after move

---

## Phase 5: Context Resolution (from tyvi-mcp)

### Move from tyvi-mcp
- [ ] Move src/context/ directory
- [ ] Update imports

### Context Components
- [ ] URI parsing (ctx://, model://, etc.)
- [ ] Scope hierarchy (global → org → team)
- [ ] Reference resolution
- [ ] Fallback behavior
- [ ] Provenance annotation

### Tests
- [ ] Move context tests from tyvi-mcp
- [ ] Ensure all pass after move

---

## Phase 6: Devspace System (existing + new)

### Config Parsing (existing)
- [x] tyvi.toml parsing
- [x] inventory.toml parsing
- [ ] Add [devspace] section support
- [ ] Add [devspace.git_policy] support
- [ ] Add trusted_orgs parsing

### Git Operations (existing)
- [x] Check if directory is git repo
- [x] Get repository status
- [x] Get current branch
- [x] Clone operations
- [x] Fetch operations

### State Management (new)
- [ ] Create .state/ directory structure
- [ ] Implement .state/lab.toml read/write
- [ ] Implement .state/ext.toml read/write
- [ ] Track loaded repos with timestamps

### Load/Unload Operations (new)
- [ ] Implement load operation
- [ ] Clone to staging if missing
- [ ] Move from staging to lab
- [ ] Handle naming collisions
- [ ] Update lab state
- [ ] Implement unload operation
- [ ] Check for uncommitted changes
- [ ] Check for unpushed commits
- [ ] Move from lab to staging
- [ ] Update lab state

### Git Restrictions (new)
- [ ] Implement checkGitAllowed
- [ ] Parse allowed_paths from config
- [ ] Check path against allowed list
- [ ] Implement getDevspaceHint
- [ ] Implement findDevspaceRoot

### External Repos (new)
- [ ] Implement ext operation
- [ ] Check trusted_orgs
- [ ] Prompt for inventory addition (delegate to CLI)
- [ ] Clone to .tmp/ext/
- [ ] Track in .state/ext.toml

---

## Phase 7: Caching System

### Cache Infrastructure
- [ ] Create .cache/ directory structure
- [ ] Binary serialization format (MessagePack?)
- [ ] Cache file read/write
- [ ] Cache metadata storage

### Hash-Based Invalidation
- [ ] File hashing utilities
- [ ] Section-level hashing for TOML
- [ ] Source hash storage
- [ ] Hash comparison on access

### Validation Schedule
- [ ] Daily section hash check
- [ ] Weekly full hash check
- [ ] Monthly deep validation

### Summary Caching
- [ ] Person summary generation
- [ ] Memory summary generation
- [ ] Fast binary storage

---

## Phase 8: Public API

### Export Design
- [ ] Design clean public API surface
- [ ] Export from mod.ts
- [ ] Ensure internal modules not exposed
- [ ] Document all exports with JSDoc

### API Functions
- [ ] Devspace: loadDevspace, load, unload, clone, sync
- [ ] Devspace: checkGitAllowed, getDevspaceHint, findDevspaceRoot
- [ ] People: loadPerson, computePerson, listPeople, loadAtoms
- [ ] Memory: recallMemories, listMemories, recordMemory, reinforceMemory
- [ ] Context: parseUri, resolveContext, searchContext

---

## Phase 9: Testing

### Unit Tests
- [ ] Types validation tests
- [ ] Config parsing tests
- [ ] Computation engine tests
- [ ] Memory system tests
- [ ] Context resolution tests
- [ ] Devspace operation tests

### Integration Tests
- [ ] Full person computation
- [ ] Memory lifecycle
- [ ] Context fallback
- [ ] Load/unload workflow

### Test Fixtures
- [ ] Example devspace
- [ ] Example atoms
- [ ] Example people
- [ ] Example memories

---

## Phase 10: Documentation

### Code Documentation
- [ ] JSDoc for all public functions
- [ ] Examples in doc comments
- [ ] Type documentation

### README
- [ ] Installation instructions
- [ ] Quick start guide
- [ ] API overview
- [ ] Link to detailed docs

---

## Blocked

These require completing the migration first:

- [!] Remove CLI from tyvi (after tyvi-cli works)
- [!] Public API finalization (after all modules moved)
- [!] Full test suite (after all code moved)

---

## Notes

### Migration Order

1. Types and schemas (foundation)
2. Computation engine (no deps on other tyvi-mcp code)
3. Atoms loading (depends on types)
4. People system (depends on computation, atoms)
5. Memory system (depends on types)
6. Context resolution (depends on types)
7. Wire up devspace to use all systems

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
