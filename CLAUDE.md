# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## What is tyvi?

Core Deno/TypeScript library for devspace orchestration, people computation, memory systems, and
context resolution. The name is Finnish for "base/trunk". This is a **library only** — CLI is in
`tyvi-cli`, MCP server in `tyvi-mcp`.

**No built-in data.** All atoms, people, memories, and content come from user devspace projects.

## CRITICAL: Read First

- **`docs/DESIGN.md`** — Architecture decisions (read before implementing)
- **`docs/TODO.md`** — Current tasks and priorities
- **`docs/TODO.DEPRECATION.md`** — Migration tracking (code moving from tyvi-mcp)
- **`docs/DESIGN.GIT.md`** — Git restrictions and shell integration

Search before writing. Check if functionality already exists.

## Commands

```bash
# Run all tests
deno test --allow-read --allow-write --allow-run

# Run a single test file
deno test --allow-read --allow-write --allow-run tests/memory_test.ts

# Type check
deno check mod.ts

# Lint and format
deno lint
deno fmt
```

## Development Order

```
1. Design    → DESIGN.md must be accurate for this change
2. Types     → Define in src/types/ before implementation
3. Tests     → Write to fail initially
4. Implement → Code until tests pass
```

**Never modify tests during implementation.** If tests are wrong, fix the design first.

## Architecture

```
mod.ts                  # Public API — all exports go through here
src/
├── types/              # All type definitions — types ONLY, no logic
├── computation/        # Expression language engine (lexer → parser → AST → evaluator)
│                       # Also: dependency analysis, rule application, quirk/phrase matching
├── atoms/              # Load atom definitions from TOML (traits, skills, quirks, phrases, etc.)
├── people/             # Person computation pipeline: load anchors → apply rules → computed person
├── memory/             # Memory system: storage, exponential decay fading, reinforcement, similarity
├── context/            # URI-based context resolution (ctx:// scheme) with scope hierarchy + fallback
├── devspace/           # Devspace operations: load, unload, clone, sync, git policy
├── config/             # TOML config parsing (tyvi.toml, inventory.toml)
├── git/                # Git operations (clone, status, remote)
└── cache/              # Caching system
tests/
├── computation/        # Computation engine tests (lexer, parser, evaluator, dependencies)
├── fixtures/           # Test fixture TOML files
└── *_test.ts           # Module-level test files
```

Each `src/` subdirectory has a `mod.ts` that re-exports its public API. The root `mod.ts` re-exports
from all modules.

## Core Principles

### Everything Computed

No fixed defaults. Every value derives from explicitly defined anchor values and composition rules
that propagate. Person definitions contain only what makes them unique — everything else is
computed.

### Data Separate from Logic

Types live in `src/types/` only — no functions, no logic. Implementation modules import types, never
define them. If a file exports both types AND logic, refactor immediately.

### Lightweight References

Use `ctx://` references, never hard-code data:

```toml
# Good
people = ["ctx://person/viktor", "ctx://person/graydon"]

# Bad
people = ["viktor", "graydon"]
```

### Scoped Context with Fallback

URI scheme: `ctx://[~org/][~team/]{type}/{path}` — hierarchy: Global → Org → Team. Lower scopes
inherit from higher unless overridden.

### Config-Driven

All behavior defined in TOML config files. No magic, no implicit behavior, no hidden state.

## Code Constraints

| Rule                 | Limit                      | Reason                  |
| -------------------- | -------------------------- | ----------------------- |
| Max file size        | 500 LOC (prefer <300)      | AI agent context limits |
| Max exports per file | ~5                         | Single responsibility   |
| Function length      | <50 LOC                    | Readability             |
| Types location       | `src/types/` only          | Separation of concerns  |
| Test stubs           | None — use real operations | Test reality            |

## Coding Standards

- **Strict TypeScript** — no `any`, use `unknown` and narrow
- **Explicit return types** on exported functions
- **JSDoc required** on all public API functions
- **Files**: `kebab-case.ts` / Functions: `camelCase` / Types: `PascalCase` / Constants:
  `SCREAMING_SNAKE_CASE`
- **Conditions**: Use `any_of`/`all_of` arrays, not inline `&&`/`||` logic
- **Terminology**: Use "devspace" (not "workspace"), "people" (not "crew"/"agents")
- **Backward compat**: Support both `[workspace]` and `[devspace]` sections in tyvi.toml

## Dependencies

Only Deno std library plus `moo` for lexing:

- `@std/path` — Path utilities
- `@std/fs` — File system utilities
- `@std/toml` — TOML parsing
- `moo` — Lexer tokenization

Do not add new dependencies without explicit approval.

## Commit Style

Format: `type: lowercase message`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

```
feat: add memory fading calculation

Implements T015.
```

Rules: no scope unless truly necessary, subject starts lowercase, reference task ID in body if
applicable.

## Reuse First

Before writing ANY code:

1. Need a function? Search existing modules
2. Need a type? Check `src/types/`
3. Found something similar? Extract and generalize it
4. Nothing exists? Write it in a shared location, not inline

## When Blocked

- Missing dependencies? Stop, report to user
- Architectural change needed? Check DESIGN.md, ask user
- Test failures? Fix tests or implementation, never skip
- Merge conflicts? Stop, do not attempt resolution

## Current State

Phases 1–6 are complete (types, computation engine, atoms, people, memory, context — 247 passing
tests). Phase 7 (devspace operations — load/unload, state management, git policy) is in progress.
See `docs/TODO.md` for full details.

## Related Repos

- **tyvi-cli** — Human interface (terminal commands), thin wrapper
- **tyvi-mcp** — AI agent interface (MCP protocol), thin wrapper
- **.ctl** — Devspace data project that dogfoods tyvi
