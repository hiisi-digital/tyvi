# Copilot Instructions - tyvi

> **Core library for devspace orchestration and computation engine.**

## What is tyvi?

**Framework only**. No built-in data, atoms, people, or content.

Provides:
- Types and schemas
- Computation engine (expressions, rules, dependency analysis)
- Loading systems (atoms, people, memory, context)
- Devspace operations (load, unload, clone, sync)
- Context resolution (URI-based, scoped with fallback)
- Config parsing (tyvi.toml, inventory.toml)

Data lives in user projects (like devspace data repos).

## Key Files

- `docs/DESIGN.md` — Architecture decisions (**READ FIRST**)
- `docs/TODO.md` — Implementation tasks
- `src/types/` — All type definitions
- `src/computation/` — Expression evaluation engine (lexer, parser, evaluator)
- `src/config/` — TOML parsing (devspace, inventory)

## Development Rules

**Tests Required**: Run `deno test --allow-read --allow-write` before committing.

**No Built-In Data**: Never add `data/`, `atoms/`, `people/` directories.

**Types First**: Define in `src/types/` before implementation.

**Schema-Driven**: User-facing config MUST have JSON schema in `schemas/`.

**Backward Compat**: Support both `[workspace]` and `[devspace]` in tyvi.toml.

## Commit Style

Format: `type: lowercase message`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

Examples:
- `feat: add memory fading calculation`
- `fix: handle missing trait definitions`
- `refactor: extract uri parsing logic`

## Dependencies

**Only Deno std library**: `@std/path`, `@std/fs`, `@std/toml`

No external dependencies allowed.

## Design Principles

1. **No opinions** — config drives all behavior
2. **No hidden state** — everything in files or explicit state  
3. **Testable** — all modules independently testable
4. **Clean exports** — only public API in mod.ts
5. **Everything computed** — no fixed defaults, values derive from rules

## Architecture

```
src/
├── types/            # All type definitions (atoms, people, memory, etc.)
├── computation/      # Expression language (lexer, parser, evaluator, rules)
├── atoms/            # Atom loading from TOML files
├── people/           # Person computation pipeline
├── memory/           # Memory system (storage, fading, reinforcement)
├── context/          # Context resolution (URI parsing, scope, fallback)
├── devspace/         # Devspace operations (load, unload, restrictions)
├── config/           # Config parsing (tyvi.toml, inventory.toml)
├── git/              # Git operations (clone, status, remote)
└── cache/            # Caching system
```

## When Blocked

- Missing dependencies? Stop, report to user
- Architectural change needed? Check DESIGN.md, ask user
- Test failures? Fix tests or implementation, never skip
- Merge conflicts? Stop, do not attempt resolution

## Error Messages

Always provide context and recovery suggestions:

```typescript
// Good
throw new Error(
  `Invalid tyvi.toml: missing [devspace] section.\n` +
  `Expected format:\n` +
  `[devspace]\n` +
  `name = "my-devspace"`
);

// Bad
throw new Error("config invalid");
```

## Code Style

- **TypeScript strict mode** — no `any`, use `unknown` and narrow
- **Explicit return types** on exported functions
- **JSDoc required** on all public API functions
- **Small files** — prefer <300 LOC, max 500 LOC
- **Extract helpers** — don't inline, create shared utilities

## Related Repos

- **tyvi-cli** — Human interface (terminal commands)
- **tyvi-mcp** — AI agent interface (MCP protocol)
- Example: User's devspace data repo (dogfoods tyvi)
