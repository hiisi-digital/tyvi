# TODO: Test Refactor & Devspace Rename

Branch: `feat/test-refactor-devspace`

This branch focuses on:
1. Fixing broken tests (design issues, not code bugs)
2. Renaming workspace/ to devspace/ per DESIGN.md
3. Adding missing devspace operations

---

## Part A: Test Fixes

### Memory Tests (3 failing)

- [ ] `reinforcement - increases memory strength`: Fix test to use initial < 1.0
  - The formula is `delta = 0.15 * (1.0 - current)`. At initial=1.0, delta=0.
  - Create memory with `initial: 0.5` for meaningful reinforcement.

- [ ] `list - returns summaries`: Fix path handling
  - `listMemories(FIXTURES_PATH)` looks at wrong path
  - Memory fixtures are at `tests/fixtures/memories/`
  - `listMemories` expects `dataPath` with `memories/` inside it
  - Either fix fixture structure or adjust test path

- [ ] `list - filter by topic`: Same path issue as above

### Verification
- [ ] All 250 tests pass (currently 247 pass, 3 fail)

---

## Part B: Rename workspace to devspace

### File Operations
- [ ] Rename `src/workspace/` to `src/devspace/`
- [ ] Update `src/workspace/mod.ts` exports to use devspace terminology
- [ ] Update `src/workspace/operations.ts` function names

### Import Updates
- [ ] Update `mod.ts` imports from workspace to devspace
- [ ] Update any internal imports

### Test Updates
- [ ] Rename `tests/workspace_test.ts` to `tests/devspace_test.ts`
- [ ] Update imports in test file
- [ ] Update test assertions for new function names

### Type Updates (if needed)
- [ ] Check `src/types/devspace.ts` for any workspace references
- [ ] Update type names if using "workspace" terminology

---

## Part C: Devspace Operations (Phase 7 from TODO.md)

Per DESIGN.md, these operations need implementation:

### Core Operations
- [ ] `load(devspace, pattern)`: Move repos from staging to lab
- [ ] `unload(devspace, pattern)`: Move repos from lab to staging (requires clean state)
- [ ] `checkGitAllowed(devspace, path)`: Check if git operations allowed in path
- [ ] `getDevspaceHint(devspace)`: Get guidance message for git restrictions
- [ ] `findDevspaceRoot(from)`: Find devspace root directory (locate tyvi.toml)

### State Management
- [ ] Create `.state/` directory handling
- [ ] Implement `lab.toml` read/write (tracks loaded repos)
- [ ] Implement `ext.toml` read/write (tracks external repos)
- [ ] Track loaded repos with timestamps

### Tests
- [ ] Test load operation
- [ ] Test unload operation (clean and dirty states)
- [ ] Test git policy checking
- [ ] Test devspace root finding

---

## Verification Checklist

Before marking complete:

- [ ] All tests pass (target: 260+ tests)
- [ ] `src/devspace/` exists, `src/workspace/` removed
- [ ] DESIGN.md matches implementation
- [ ] TODO.md updated to mark Phase 7 complete
- [ ] mod.ts exports devspace module correctly
- [ ] No workspace references remain (except history/comments)

---

## Notes

Refer to:
- `docs/DESIGN.md` lines 108-129 for devspace module structure
- `docs/DESIGN.md` lines 156-217 for devspace system design
- `src/types/devspace.ts` for type definitions
