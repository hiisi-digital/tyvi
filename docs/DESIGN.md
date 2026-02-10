# tyvi Design Document

> Core library for devspace orchestration, people computation, and context management.

The name comes from Finnish "tyvi" meaning "base" or "trunk"; the foundational part from which
branches grow.

**Related Design Documents:**

- [`DESIGN.GIT.md`](./DESIGN.GIT.md) — Git restrictions and shell integration

---

## Overview

tyvi is the **core library** that contains all types, logic, and functionality for:

- **Devspace management** — repos, staging, lab, git restrictions
- **People system** — atomic personality composition and computation
- **Memory system** — significant events with fading and reinforcement
- **Context resolution** — scoped URI-based context with fallback

tyvi is a **library**, not a CLI. Interfaces are provided by:

| Package      | Purpose                               |
| ------------ | ------------------------------------- |
| **tyvi**     | Core library (this package)           |
| **tyvi-cli** | Human interaction via terminal        |
| **tyvi-mcp** | AI agent interaction via MCP protocol |

---

## Scope

### In Scope

- All types and schemas
- Devspace operations (load, unload, clone, sync)
- Git operations and restriction checking
- Config parsing (tyvi.toml, inventory.toml)
- People computation engine (traits, skills, quirks, phrases)
- Memory system (storage, fading, reinforcement, query)
- Context resolution (URI parsing, scope hierarchy, fallback)
- Relationship tracking
- Caching system

### Out of Scope

**The following are NOT part of tyvi core:**

- CLI argument parsing → see `tyvi-cli`
- Terminal output formatting → see `tyvi-cli`
- User interaction (prompts) → see `tyvi-cli`
- MCP protocol handling → see `tyvi-mcp`
- AI agent instructions → see `tyvi-mcp`

---

## Architecture

```
tyvi/
├── src/
│   ├── types/                  # All type definitions
│   │   ├── atoms.ts            # Traits, skills, quirks, phrases
│   │   ├── people.ts           # Person, ComputedPerson
│   │   ├── memory.ts           # Memory, MemoryQuery
│   │   ├── relationship.ts     # Relationships
│   │   ├── devspace.ts         # Devspace config, inventory, repos
│   │   ├── context.ts          # URI, Scope, Context
│   │   └── mod.ts              # Re-exports all types
│   │
│   ├── atoms/                  # Atom loading and parsing
│   │   ├── traits.ts
│   │   ├── skills.ts
│   │   ├── quirks.ts
│   │   ├── phrases.ts
│   │   └── mod.ts
│   │
│   ├── computation/            # Expression evaluation engine
│   │   ├── lexer.ts            # Tokenize expressions
│   │   ├── parser.ts           # Parse to AST
│   │   ├── ast.ts              # AST node types
│   │   ├── evaluator.ts        # Evaluate expressions
│   │   ├── dependencies.ts     # Dependency analysis
│   │   ├── rules.ts            # Rule application
│   │   ├── quirks.ts           # Quirk auto-assignment
│   │   ├── phrases.ts          # Phrase matching
│   │   └── mod.ts
│   │
│   ├── people/                 # Person computation pipeline
│   │   ├── computation.ts      # Full computation pipeline
│   │   ├── loading.ts          # Load person TOML
│   │   └── mod.ts
│   │
│   ├── memory/                 # Memory system
│   │   ├── storage.ts          # Read/write memories
│   │   ├── strength.ts         # Strength calculation
│   │   ├── reinforcement.ts    # Memory reinforcement
│   │   ├── similarity.ts       # Memory similarity
│   │   ├── query.ts            # Query memories
│   │   ├── lifecycle.ts        # Create, update, prune
│   │   ├── logs.ts             # Memory event logs
│   │   └── mod.ts
│   │
│   ├── context/                # Context resolution
│   │   ├── uri.ts              # Parse ctx:// URIs
│   │   ├── scope.ts            # Scope hierarchy
│   │   ├── resolution.ts       # Resolve references
│   │   ├── fallback.ts         # Fallback behavior
│   │   └── mod.ts
│   │
│   ├── devspace/               # Devspace operations
│   │   ├── operations.ts       # Load, unload, sync
│   │   ├── state.ts            # State file management
│   │   ├── restrictions.ts     # Git policy checking
│   │   └── mod.ts
│   │
│   ├── config/                 # Config parsing
│   │   ├── devspace.ts         # tyvi.toml parsing
│   │   ├── inventory.ts        # inventory.toml parsing
│   │   └── mod.ts
│   │
│   ├── git/                    # Git operations
│   │   ├── status.ts           # Status checking
│   │   ├── clone.ts            # Clone operations
│   │   ├── remote.ts           # Remote operations
│   │   └── mod.ts
│   │
│   └── cache/                  # Caching system
│       ├── storage.ts          # Cache read/write
│       ├── hashing.ts          # Content hashing
│       ├── validation.ts       # Cache validation
│       └── mod.ts
│
├── schemas/                    # JSON schemas for validation
│   ├── trait-axis.schema.json
│   ├── skill.schema.json
│   ├── quirk.schema.json
│   ├── phrase.schema.json
│   ├── person.schema.json
│   ├── memory.schema.json
│   ├── relationship.schema.json
│   ├── devspace.schema.json
│   └── inventory.schema.json
│
├── docs/
│   ├── DESIGN.md               # This file
│   ├── TODO.md                 # Implementation tasks
│   └── TODO.DEPRECATION.md     # Migration tracking
│
├── tests/
├── mod.ts                      # Public API exports
├── deno.json
├── README.md
└── LICENSE
```

---

## Devspace System

### Directory Structure

Configurable via `tyvi.toml`:

```
devspace/
├── tyvi.toml                 # Devspace config
├── @hiisi/
│   └── inventory.toml        # Repos by namespace
├── @orgrinrt/
│   └── inventory.toml
├── .staging/                 # Cold repos (organized by namespace)
│   ├── @hiisi/
│   │   └── viola/
│   └── @orgrinrt/
│       └── nutshell/
├── .state/                   # Runtime state
│   ├── lab.toml              # What's loaded
│   └── ext.toml              # External repos
└── .tmp/                     # Scratch space
    └── ext/                  # External repos

.lab/                         # Active work (flat, git allowed)
├── viola/
└── nutshell/
```

### tyvi.toml

```toml
[devspace]
name = "control-center"

staging_path = ".staging"
lab_path = "../.lab"
state_path = ".state"
tmp_path = ".tmp"
ext_path = ".tmp/ext"

trusted_orgs = ["hiisi-digital", "orgrinrt"]

[devspace.namespaces]
paths = ["@hiisi", "@orgrinrt"]
default = "@hiisi"

[devspace.git_policy]
enabled = true
allowed_paths = [".staging", "../.lab", "../.labs"]
```

### Operations

| Operation         | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `load`            | Move repos from staging to lab                        |
| `unload`          | Move repos from lab to staging (requires clean state) |
| `clone`           | Clone repos to staging                                |
| `sync`            | Synchronize devspace with inventory                   |
| `checkGitAllowed` | Check if git operations allowed in path               |

---

## People System

### Atoms

People are composed from atomic building blocks:

| Type       | Range        | Description                                  |
| ---------- | ------------ | -------------------------------------------- |
| Traits     | -100 to +100 | Personality axes (both extremes problematic) |
| Skills     | 0 to 100     | Technical capabilities                       |
| Experience | 0 to 100     | Domain familiarity                           |
| Stacks     | 0 to 100     | Technology proficiency                       |
| Quirks     | boolean      | Binary personality markers                   |
| Phrases    | conditional  | Communication flavor                         |

### Composition Rules

Atoms define rules for computing related values:

```toml
[[composition.rule]]
description = "Detail-focused people tend toward caution"
expression = "trait.detail-focus * 0.5"
weight = 0.4
```

### Expression Language

| Syntax               | Meaning           |
| -------------------- | ----------------- |
| `trait.name`         | Trait value       |
| `skill.name`         | Skill value       |
| `exp.name`           | Experience value  |
| `stack.name`         | Stack value       |
| `avg(...)`           | Average of values |
| `max(...)`           | Maximum           |
| `min(...)`           | Minimum           |
| `clamp(v, min, max)` | Clamp to range    |

### Person Definition

Only anchor values (what makes this person unique):

```toml
[identity]
id = "alex"
name = "Alex"
pronouns = "they/them"
github_username = "alex-dev"

[orgs]
primary = "hiisi"
teams = ["correctness", "core"]

[traits]
detail-focus = 75
perfectionism = 60

[skills]
type-system-design = 85
api-design = 75

[quirks]
explicit = ["edge-case-hunter"]
```

Everything else is computed from these anchors plus composition rules.

---

## Memory System

### Memory Structure

```toml
[memory]
id = "alex-oauth-2025-02"
person = "ctx://person/alex"
created = "2025-02-01T14:30:00Z"

[memory.content]
summary = "Led OAuth2 design review"
detail = "Discovered missing PKCE in mobile flow"
significance = "high"

[memory.tags]
topics = ["oauth", "security"]
people = ["ctx://person/viktor"]
outcome = "positive"

[memory.strength]
initial = 1.0
current = 1.0
last_reinforced = "2025-02-01T14:30:00Z"

[memory.fade]
half_life_days = 90
min_strength = 0.1
```

### Fading and Reinforcement

```
strength(t) = max(min_strength, initial * (0.5 ^ (days / half_life)))
```

Similar memories reinforce each other, increasing strength.

---

## Context Resolution

### URI Scheme

```
ctx://[~org/][~team/]{type}/{path}
```

| Prefix            | Meaning    | Example                                    |
| ----------------- | ---------- | ------------------------------------------ |
| (none)            | Global     | `ctx://person/alex`                        |
| `~{org}/`         | Org scope  | `ctx://~hiisi/rules/commit-style`          |
| `~{org}/~{team}/` | Team scope | `ctx://~hiisi/~correctness/research/types` |

### Scope Hierarchy

```
Global → Org → Team
```

Lower scopes inherit from higher, with automatic fallback.

### Visibility Rules

| Scope  | Can See                     |
| ------ | --------------------------- |
| Global | Only global                 |
| Org    | Own org + global            |
| Team   | Own team + own org + global |

---

## Public API

The library exports these main functions:

### Devspace

```typescript
// Load devspace config
loadDevspace(root: string): Promise<Devspace>

// Operations
load(devspace: Devspace, pattern: string): Promise<LoadResult>
unload(devspace: Devspace, pattern: string): Promise<UnloadResult>
clone(devspace: Devspace, pattern: string): Promise<CloneResult>
sync(devspace: Devspace, options?: SyncOptions): Promise<SyncResult>

// Git restrictions
checkGitAllowed(devspace: Devspace, path: string): boolean
getDevspaceHint(devspace: Devspace): string
findDevspaceRoot(from: string): string | null
```

### People

```typescript
// Load and compute
loadPerson(dataPath: string, id: string): Promise<Person>
computePerson(dataPath: string, id: string): Promise<ComputedPerson>
listPeople(dataPath: string): Promise<PersonSummary[]>

// Atoms
loadAtoms(dataPath: string): Promise<Atoms>
```

### Memory

```typescript
// Query
recallMemories(dataPath: string, query: MemoryQuery): Promise<Memory[]>
listMemories(dataPath: string, filters?: MemoryFilters): Promise<MemorySummary[]>

// Lifecycle
recordMemory(dataPath: string, input: MemoryInput): Promise<Memory>
reinforceMemory(dataPath: string, id: string, event: string): Promise<Memory>
pruneMemories(dataPath: string): Promise<PruneResult>
```

### Context

```typescript
// Resolution
parseUri(uri: string): ParsedUri
resolveContext(dataPath: string, uri: string): Promise<Context>
searchContext(dataPath: string, query: string): Promise<SearchResult[]>
```

---

## Dependencies

Only Deno standard library:

- `@std/path` — Path utilities
- `@std/fs` — File system utilities
- `@std/toml` — TOML parsing

No external dependencies.

---

## Design Principles

### Everything Computed

No fixed defaults. Every value derives from:

1. Explicitly defined anchor values
2. Composition rules that propagate
3. Starting points for computation chains

### Lightweight References

Use `ctx://` references instead of inline data:

```toml
# Good
people = ["ctx://person/viktor", "ctx://person/graydon"]

# Bad
people = ["viktor", "graydon"]
```

### Scoped with Fallback

Context at multiple levels with automatic inheritance. Query team level, get global if team doesn't
override.

### Config-Driven

All behavior defined in config files. No magic, no implicit behavior.

### No Hidden State

All state in:

- Config files (TOML)
- State files (`.state/`)
- Git repos themselves

---

## Open Questions

1. **Cache storage format**: Binary (fast) vs TOML (debuggable)?
2. **Memory similarity algorithm**: Exact threshold for "similar"?
3. **Cross-org people**: Can a person belong to multiple orgs?
4. **Expression complexity**: Limit nesting depth?

---

## Related Documents

- [`DESIGN.GIT.md`](./DESIGN.GIT.md) — Git restrictions, shell integration, validation API
- `TODO.md` — Implementation tasks
- `TODO.DEPRECATION.md` — Migration tracking
- `tyvi-cli/docs/DESIGN.md` — CLI interface design
- `tyvi-mcp/docs/DESIGN.md` — MCP server design
