# tyvi Deprecation TODO

This document tracks items that need to be deprecated, removed, or migrated.

---

## Status: RESTRUCTURING

tyvi is being restructured from a CLI tool to a **core library**. The CLI is moving to `tyvi-cli`.

---

## Migration: Code Moving INTO This Package

The following code should be moved **from tyvi-mcp to tyvi**:

### Types (src/types.ts → src/types/)

| Item | Status | Notes |
|------|--------|-------|
| CompositionRule | [ ] Move | Core computation type |
| TraitAxis, Trait | [ ] Move | Trait definitions |
| Skill, SkillLevels | [ ] Move | Skill definitions |
| Experience, ExperienceLevels | [ ] Move | Experience definitions |
| Stack, StackLevels | [ ] Move | Stack definitions |
| Quirk, QuirkAutoAssign | [ ] Move | Quirk definitions |
| Phrase, PhraseConditions | [ ] Move | Phrase definitions |
| Person, ComputedPerson | [ ] Move | Person types |
| PersonIdentity, PersonOrgs | [ ] Move | Identity types |
| Memory, MemoryContent, etc. | [ ] Move | Memory types |
| Relationship types | [ ] Move | Relationship types |
| CacheMeta, SourceHash | [ ] Move | Cache types |
| Config types | [ ] Move | Configuration types |

### Computation Engine (src/computation/)

| File | Status | Notes |
|------|--------|-------|
| `lexer.ts` | [ ] Move | Expression tokenizer |
| `parser.ts` | [ ] Move | Expression parser |
| `ast.ts` | [ ] Move | AST node types |
| `evaluator.ts` | [ ] Move | Expression evaluator |
| `dependencies.ts` | [ ] Move | Dependency analysis |
| `rules.ts` | [ ] Move | Rule application |
| `quirks.ts` | [ ] Move | Quirk auto-assignment |
| `phrases.ts` | [ ] Move | Phrase matching |
| `mod.ts` | [ ] Move | Module exports |
| `README.md` | [ ] Move | Documentation |

### People System (src/people/)

| File | Status | Notes |
|------|--------|-------|
| `computation.ts` | [ ] Move | Person computation pipeline |
| `mod.ts` | [ ] Move | Module exports |

### Atoms System (src/atoms/)

| File | Status | Notes |
|------|--------|-------|
| All files | [ ] Move | Atom loading and parsing |

### Memory System (src/memory/)

| File | Status | Notes |
|------|--------|-------|
| `storage.ts` | [ ] Move | Memory read/write |
| `strength.ts` | [ ] Move | Strength calculation |
| `reinforcement.ts` | [ ] Move | Memory reinforcement |
| `similarity.ts` | [ ] Move | Similarity detection |
| `query.ts` | [ ] Move | Memory queries |
| `lifecycle.ts` | [ ] Move | Create, update, prune |
| `logs.ts` | [ ] Move | Log management |
| `paths.ts` | [ ] Move | Path utilities |
| `mod.ts` | [ ] Move | Module exports |
| `README.md` | [ ] Move | Documentation |

### Context System (src/context/)

| File | Status | Notes |
|------|--------|-------|
| All files | [ ] Move | URI parsing, resolution, fallback |

### Schemas (schemas/)

| File | Status | Notes |
|------|--------|-------|
| All `.schema.json` files | [ ] Move | Validation schemas |

### Data (data/)

| Directory | Status | Notes |
|-----------|--------|-------|
| `atoms/` | [ ] Move | Example atom definitions |
| `people/` | [ ] Move | Example person definitions |
| `config.toml` | [ ] Move | Example config |

---

## Migration: Code Moving OUT OF This Package

The following code should be moved **from tyvi to tyvi-cli**:

### CLI (src/cli/)

| File | Status | Notes |
|------|--------|-------|
| `mod.ts` | [ ] Move | CLI entry point |
| `output.ts` | [ ] Move | Terminal formatting |
| `commands/init.ts` | [ ] Move | Init command |
| `commands/status.ts` | [ ] Move | Status command |
| `commands/clone.ts` | [ ] Move | Clone command |
| `commands/sync.ts` | [ ] Move | Sync command |
| `commands/list.ts` | [ ] Move | List command |
| `commands/add.ts` | [ ] Move | Add command |
| `commands/remove.ts` | [ ] Move | Remove command |

### Migration Steps

1. [ ] Move tyvi-mcp code into tyvi
2. [ ] Update all imports within moved code
3. [ ] Verify tests pass
4. [ ] Move CLI code to tyvi-cli
5. [ ] Update tyvi-cli to import from @hiisi/tyvi
6. [ ] Verify CLI works
7. [ ] Delete CLI code from tyvi
8. [ ] Delete moved code from tyvi-mcp

---

## After Migration: Cleanup

### Delete from tyvi

Once CLI is moved to tyvi-cli:

- [ ] `src/cli/` — entire directory
- [ ] CLI-related test files
- [ ] Any CLI-specific utilities

### Delete from tyvi-mcp

Once core code is moved to tyvi:

- [ ] `src/types.ts` — types moved to tyvi
- [ ] `src/computation/` — engine moved to tyvi
- [ ] `src/people/` — people system moved to tyvi
- [ ] `src/atoms/` — atoms system moved to tyvi
- [ ] `src/memory/` — memory system moved to tyvi
- [ ] `src/context/` — context system moved to tyvi
- [ ] `src/parsing/` — parsing utilities moved to tyvi
- [ ] `schemas/` — schemas moved to tyvi
- [ ] `data/` — example data moved to tyvi

---

## Terminology Alignment

Ensure no outdated terminology in moved code:

- [ ] No "workspace" (use "devspace")
- [ ] No "crew" (use "people")
- [ ] No "agents" referring to people (use "people" or "person")
- [ ] No "meet-mcp" references (now "tyvi-mcp")

---

## Rename: src/workspace/ → src/devspace/

- [ ] Rename directory
- [ ] Update all imports
- [ ] Update config file references (workspace.ts → devspace.ts)

---

## Completion Criteria

This deprecation TODO is complete when:

1. [ ] All tyvi-mcp core code lives in tyvi
2. [ ] All tyvi CLI code lives in tyvi-cli
3. [ ] tyvi is a pure library with no CLI
4. [ ] tyvi-mcp is a thin MCP wrapper
5. [ ] tyvi-cli is a thin CLI wrapper
6. [ ] No duplicate code between packages
7. [ ] All terminology is current
8. [ ] All tests pass in all packages
