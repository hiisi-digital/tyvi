# Memory System Implementation

This document describes the memory system implementation migrated to tyvi core library.

## Files Implemented

All files are located in `src/memory/`:

1. **paths.ts** - Path utilities for memory file operations
2. **storage.ts** - Read/write memory TOML files
3. **strength.ts** - Exponential decay calculation
4. **reinforcement.ts** - Memory reinforcement logic
5. **similarity.ts** - Memory similarity detection
6. **logs.ts** - Event log management
7. **query.ts** - Memory filtering and sorting
8. **lifecycle.ts** - Create, update, and prune operations
9. **mod.ts** - Public API exports

## Public API

The following functions are exported from `src/memory/mod.ts` and re-exported from the main
`mod.ts`:

### Core Operations

```typescript
// Query memories with filtering and sorting
recallMemories(dataPath: string, query: MemoryQuery): Promise<Memory[]>

// List memories with simple filters (returns summaries)
listMemories(dataPath: string, filters?: MemoryFilters): Promise<MemorySummary[]>

// Create a new memory
recordMemory(dataPath: string, input: MemoryInput): Promise<Memory>

// Reinforce an existing memory
reinforceMemory(dataPath: string, id: string, reason: string): Promise<ReinforcementResult>

// Prune weak memories below threshold
pruneMemories(dataPath: string): Promise<PruneResult>
```

### Utility Functions

```typescript
// Calculate current memory strength
getMemoryStrength(memory: Memory, now?: Date): number

// Calculate strength with decay parameters
calculateStrength(strength: MemoryStrength, fade: MemoryFade, now?: Date): number

// Get default half-life by significance
getDefaultHalfLife(significance: "high" | "medium" | "low"): number

// Calculate similarity between memories
calculateSimilarity(memory1: Memory, memory2: Memory): SimilarityResult

// Find similar memories
findSimilarMemories(
  targetMemory: Memory,
  allMemories: Memory[],
  minScore?: number,
  limit?: number
): SimilarityResult[]

// Convert memory to summary
toMemorySummary(memory: Memory, now?: Date): MemorySummary
```

## Strength Decay Formula

The memory strength decays exponentially over time according to:

```
strength(t) = max(min_strength, initial * (0.5 ^ (days_since_reinforcement / half_life)))
```

### Default Half-Life Values

- **High significance**: 180 days (6 months)
- **Medium significance**: 90 days (3 months)
- **Low significance**: 30 days (1 month)

### Verification

Manual tests confirm the formula works correctly:

- After 0 days: strength = 1.000
- After 45 days (half of 90-day half-life): strength ≈ 0.707
- After 90 days (one half-life): strength = 0.500
- After 180 days (two half-lives): strength = 0.250
- After 270 days (three half-lives): strength = 0.125

## Reinforcement

When a memory is reinforced:

1. Current strength is calculated with decay
2. Reinforcement delta is calculated: `0.15 * (1.0 - current_strength)`
3. Initial strength is increased by the delta
4. Last reinforced timestamp is updated
5. Reinforcement count is incremented
6. Event is logged

Reinforcement is skipped if:

- Memory is already very strong (> 1.5)
- Memory was reinforced recently (< 24 hours ago)

## Similarity Detection

Memories are compared using weighted scoring:

- **Topic overlap**: 40% (Jaccard similarity)
- **People overlap**: 30% (Jaccard similarity)
- **Same outcome**: 15% (boolean)
- **Time proximity**: 15% (exponential decay, 90-day half-life)

Similarity scores range from 0.0 to 1.0, where 1.0 indicates very similar memories.

## Query Operations

### Filtering

Memories can be filtered by:

- Person (ctx:// reference)
- Topics (single or array)
- People involved (single or array)
- Outcome (single or array)
- Minimum strength threshold
- Date range (since/until)

### Sorting

Memories can be sorted by:

- Strength (current calculated strength)
- Created date
- Last reinforced date

Both ascending and descending order are supported.

### Pagination

Use `limit` and `offset` parameters for pagination.

## Lifecycle Operations

### Creating Memories

```typescript
const memory = await recordMemory(dataPath, {
  person: "ctx://person/alex",
  content: {
    summary: "Led OAuth2 design review",
    detail: "Discovered missing PKCE in mobile flow",
    significance: "high",
  },
  tags: {
    topics: ["oauth", "security"],
    people: ["ctx://person/viktor"],
    outcome: "positive",
  },
});
```

Memory IDs are auto-generated in format: `{person}-{topic-slug}-{YYYY-MM}`

### Pruning Weak Memories

Pruning removes memories that have decayed below a threshold (default: 0.15):

```typescript
const result = await pruneMemories(dataPath);
console.log(`Pruned ${result.pruned} of ${result.checked} memories`);
```

Before deletion, memories are marked with a pruning log entry.

## File Format

Memories are stored as TOML files in `{dataPath}/memories/{id}.toml`:

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
reinforcement_count = 0

[memory.fade]
half_life_days = 180
min_strength = 0.1

[[memory.log]]
timestamp = "2025-02-01T14:30:00Z"
event = "created"
note = "Memory created"
strength_delta = 1.0
```

## Testing

Comprehensive tests are provided in `tests/memory_test.ts`:

- Storage operations (read, write, list)
- Strength calculation and decay
- Reinforcement logic
- Similarity detection
- Query filtering and sorting
- Lifecycle operations (create, prune)

Manual verification tests confirm:

- ✓ Exponential decay formula is correct
- ✓ Minimum strength floor is respected
- ✓ Default half-life values work
- ✓ Memory creation works
- ✓ Reinforcement increases strength
- ✓ Pruning removes weak memories

## Dependencies

Only Deno standard library:

- `@std/toml` - TOML parsing/serialization
- `@std/fs` - File system operations
- `@std/path` - Path utilities

No external dependencies.
