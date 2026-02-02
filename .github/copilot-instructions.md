# Copilot Instructions for tyvi

Config-driven workspace orchestration for multi-repo development environments. Runtime: Deno (TypeScript).

## Project Context

This tool manages multi-repo workspaces through config files:
- `tyvi.toml` at workspace root defines global settings
- `inventory.toml` in each namespace directory defines repos
- Commands operate on the workspace: init, status, clone, sync, list, add, remove

## Before Starting Work

- **Check current branch**: If not main, you are likely working on a PR
- **Check for branch TODO**: Look for `TODO.{branch-name}.md`, use it instead of main `TODO.md`
- **Read docs/DESIGN.md**: Understand the architecture before making changes
- **Read docs/TODO.md**: Know what tasks need implementation
- **Search for existing code**: Grep codebase for similar functions before writing new ones

## Core Principles

### 1. Config-Driven Operation

All behavior is driven by config files. No magic directory detection or implicit behavior.

**Implications:**
- Parse config first, operate on the result
- Missing config is an error, not a fallback to defaults
- Every operation should trace back to config

### 2. Clear Error Messages

Every error must tell the user what went wrong and suggest recovery.

**Implications:**
- Include context in errors (what file, what field, what was expected)
- Suggest how to fix the problem
- Never just say "error" or "failed"

```typescript
// good
throw new Error(
  `Repository 'viola' not found in inventory.\n` +
  `Searched: @hiisi/inventory.toml\n` +
  `Did you mean: viola-cli, viola-default-lints?\n` +
  `To add: tyvi add git@github.com:hiisi-digital/viola.git`
);

// bad
throw new Error("repo not found");
```

### 3. No Hidden State

All state lives in config files or git repos. No hidden databases, caches, or lock files.

**Implications:**
- Operations are idempotent
- Users can inspect and edit config directly
- Tool works offline except for clone/fetch

### 4. Graceful Degradation

Never crash on missing files or partial config. Degrade gracefully and report.

**Implications:**
- Missing optional fields get defaults
- Missing repos are reported, not errors
- Orphaned repos are warned about, not deleted

### 5. Design Before Code

Order: Design -> Types -> Tests -> Implementation

**Implications:**
- DESIGN.md must be accurate before coding
- Write tests first when possible
- Never modify tests to make them pass; fix the code

### 6. Reuse First

Search for existing code before writing anything new.

**Implications:**
- Check what exists before implementing
- Extract shared logic to utilities
- Check Deno std library before writing helpers

## File Structure

```
tyvi/
├── mod.ts                    # Main export
├── deno.json                 # Package manifest
├── src/
│   ├── cli/
│   │   ├── mod.ts            # CLI entry point
│   │   ├── commands/         # Individual commands
│   │   └── output.ts         # Terminal output formatting
│   ├── config/
│   │   ├── mod.ts
│   │   ├── workspace.ts      # tyvi.toml parsing
│   │   ├── inventory.ts      # inventory.toml parsing
│   │   └── types.ts          # Config type definitions
│   ├── workspace/
│   │   ├── mod.ts
│   │   ├── operations.ts     # Workspace operations
│   │   └── discovery.ts      # Find workspaces/inventories
│   ├── git/
│   │   ├── mod.ts
│   │   ├── clone.ts
│   │   ├── status.ts
│   │   └── remote.ts
│   └── types.ts              # Shared types
└── tests/
    └── fixtures/
```

## Coding Standards

### TypeScript

- Strict mode enabled (noImplicitAny, strictNullChecks)
- No `any` types; use `unknown` and narrow
- Prefer `interface` for object shapes, `type` for unions
- Use `readonly` for immutable data
- Explicit return types on exported functions

### Naming

- Files: `kebab-case.ts`
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Error Handling

Always provide context and recovery suggestions:

```typescript
// good
if (!workspace) {
  console.error(`No tyvi.toml found in ${cwd} or parent directories.`);
  console.error(`Run 'tyvi init' to create a workspace.`);
  Deno.exit(1);
}

// bad
if (!workspace) {
  throw new Error("workspace not found");
}
```

### Documentation

- All exported functions must have JSDoc
- Include `@example` for complex functions
- Keep descriptions concise

## Workflow

### Before Starting

1. Read docs/DESIGN.md to understand architecture
2. Read docs/TODO.md for current tasks
3. Check existing code for patterns to follow

### Implementation Process

1. Write types first
2. Write tests (TDD preferred)
3. Implement the minimal solution
4. Refactor for clarity
5. Add documentation

### Before Marking Done

1. All tests pass (`deno test`)
2. Type checking passes (`deno check mod.ts`)
3. Error messages are helpful
4. Output is readable

## Commits

Format: `type: lowercase message`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### Good Examples

- `feat: add clone command with pattern matching`
- `fix: handle missing inventory.toml gracefully`
- `refactor: extract git operations to separate module`
- `test: add workspace discovery tests`

### Bad Examples

- `Added feature` (no type)
- `WIP` (not descriptive)
- `fix stuff` (not specific)

## Don't

- Add external dependencies (only Deno std allowed)
- Mix types and logic in same file
- Modify tests to make them pass
- Use magic strings or numbers
- Write helper functions inline; extract to shared modules
- Skip reading DESIGN.md before implementing
- Leave TODO comments without issue reference
- Use emojis in code or docs (except status indicators like checkmarks)
- Crash on missing optional config

## Dependencies

Only Deno std library is allowed:

- `@std/path` - Path utilities
- `@std/fs` - File system utilities
- `@std/toml` - TOML parsing
- `@std/fmt` - Terminal formatting
- `@std/assert` - Testing

Do not add external dependencies without explicit approval.

## Code Constraints

| Rule | Limit | Reason |
|------|-------|--------|
| Max file size | 500 LOC (prefer <300) | Maintainability |
| Max exports per file | ~5 | Single responsibility |
| Function length | <50 LOC | Readability |

## Output Guidelines

Status output should be scannable:

```
@hiisi
  viola/
    viola ............... ✓ clean (main) 3 days ago
    viola-cli ........... ✓ clean (main ↑2) 1 day ago

Summary: 2 cloned, 0 dirty
```

Guidelines:
- Align columns for easy scanning
- Use symbols for status (✓, !, -, ?)
- Include summary at end
- Support --quiet for minimal output
- Support --json for machine-readable output

## Testing Guidelines

### Unit Tests

Test config parsing and individual operations:

```typescript
Deno.test("parseInventory - handles missing optional fields", () => {
  const toml = `
[[repos]]
name = "my-repo"
remotes = [{ name = "origin", url = "git@github.com:org/repo.git" }]
`;
  const config = parseInventory(toml);
  assertEquals(config.repos[0].status, "active"); // default
  assertEquals(config.repos[0].keep_in_sync, true); // default
});
```

### Integration Tests

Test full workflows with fixture directories:

```typescript
Deno.test("clone - clones matching repos", async () => {
  const workspace = await loadWorkspace("tests/fixtures/valid-workspace");
  const result = await clone(workspace, { pattern: "viola" });
  assertEquals(result.cloned.length, 2);
});
```

## Review Checklist

Before marking work complete:

- [ ] All tests pass (`deno test`)
- [ ] Type checking passes (`deno check mod.ts`)
- [ ] Error messages are clear and actionable
- [ ] Output is readable and aligned
- [ ] No TODO comments without issue reference
- [ ] Code follows project conventions
- [ ] DESIGN.md matches implementation
