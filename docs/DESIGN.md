# tyvi Design Document

## Overview

`tyvi` is a config-driven workspace orchestration tool for managing multi-repo development environments. It provides a structured way to organize, clone, sync, and manage repositories across multiple organizations and namespaces.

The name comes from Finnish "tyvi" meaning "base" or "trunk"; the foundational part from which branches grow.

## Purpose

This tool provides:

1. **Workspace structure management** via `inventory.toml` files
2. **Repository orchestration** with clone, sync, and status operations
3. **Namespace organization** for multi-org development
4. **Config-driven operation** where behavior is defined declaratively

## Core Concepts

### Workspace Root

A tyvi workspace is a directory containing:
- `tyvi.toml` configuration file
- Namespace directories (e.g., `@hiisi/`, `@orgrinrt/`)
- Each namespace has its own `inventory.toml`

```
workspace/
├── tyvi.toml              # Workspace-level config
├── @hiisi/
│   ├── inventory.toml     # Namespace inventory
│   ├── viola/
│   │   ├── viola/         # Cloned repo
│   │   ├── viola-cli/     # Cloned repo
│   │   └── viola-default-lints/
│   └── muse/
│       └── lets-muse/
└── @orgrinrt/
    ├── inventory.toml
    └── agent-tooling/
        └── meet-mcp/
```

### Inventory Files

Each namespace has an `inventory.toml` that defines:
- Namespace metadata and defaults
- Repository definitions with remotes, paths, and status
- Sync and agent configuration

```toml
[meta]
description = "Namespace description"

[meta.defaults]
language = "typescript"
runtime = "deno"

[[repos]]
name = "my-repo"
description = "Repository description"
remotes = [
  { name = "origin", url = "git@github.com:org/repo.git", host = "github" }
]
local_path = "category/my-repo"
status = "active"
keep_in_sync = true
```

### Repository Status

- `active` - Under active development
- `stable` - Stable, minimal changes expected
- `wip` - Work in progress, not ready
- `archived` - No longer maintained
- `needs-review` - Requires manual attention

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           tyvi                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    CLI Interface                          │ │
│  │  tyvi init | status | clone | sync | list                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                             │                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Core Library                           │ │
│  │  - Config parsing (tyvi.toml, inventory.toml)            │ │
│  │  - Workspace operations                                   │ │
│  │  - Repository management                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                             │                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │   Config Layer  │  │   Git Layer     │  │  Output Layer  │  │
│  │   TOML parsing  │  │   Clone/fetch   │  │  Status/logs   │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Commands

### tyvi init

Initialize a new workspace or add tyvi to an existing directory.

```bash
tyvi init                    # Interactive setup
tyvi init --from-template    # Use a template
tyvi init --minimal          # Minimal setup
```

Creates:
- `tyvi.toml` with workspace config
- Default namespace directory structure
- Template `inventory.toml` files

### tyvi status

Show status of all managed repositories.

```bash
tyvi status                  # All repos
tyvi status @hiisi           # Specific namespace
tyvi status viola            # Repos matching pattern
tyvi status --dirty          # Only repos with uncommitted changes
tyvi status --behind         # Only repos behind remote
```

Output shows:
- Clone status (cloned, missing, partial)
- Git status (clean, dirty, ahead, behind)
- Branch information
- Last activity

### tyvi clone

Clone repositories defined in inventory.

```bash
tyvi clone viola             # Clone repos matching pattern
tyvi clone @hiisi/viola      # Clone specific namespace/category
tyvi clone --all             # Clone all repos
tyvi clone --category viola  # Clone by category
tyvi clone --status active   # Clone only active repos
```

### tyvi sync

Synchronize workspace structure with inventory definitions.

```bash
tyvi sync                    # Sync structure
tyvi sync --fetch            # Also fetch all remotes
tyvi sync --prune            # Remove repos not in inventory
```

Operations:
1. Create missing directories
2. Move repos to correct locations if needed
3. Report orphaned repos (local but not in inventory)
4. Optionally fetch all remotes

### tyvi list

List repositories from inventory without checking filesystem.

```bash
tyvi list                    # All repos
tyvi list --cloned           # Only cloned
tyvi list --missing          # Only not cloned
tyvi list --format json      # JSON output
```

### tyvi add

Add a repository to inventory.

```bash
tyvi add git@github.com:org/repo.git
tyvi add org/repo --namespace @hiisi --category tools
```

### tyvi remove

Remove a repository from inventory (optionally delete local clone).

```bash
tyvi remove repo-name
tyvi remove repo-name --delete  # Also delete local files
```

## Configuration

### tyvi.toml

Workspace-level configuration.

```toml
[workspace]
name = "my-workspace"
root = "."

[workspace.namespaces]
default = "@hiisi"
paths = ["@hiisi", "@orgrinrt"]

[defaults]
host = "github"
clone_method = "ssh"  # ssh, https
fetch_on_status = false
```

### inventory.toml

Namespace-level repository inventory.

```toml
[meta]
description = "Namespace description"
last_updated = "2025-02-01"

[meta.defaults]
language = "typescript"
runtime = "deno"
keep_in_sync = true

[[repos]]
name = "my-repo"
description = "What this repo does"
remotes = [
  { name = "origin", url = "git@github.com:org/repo.git", host = "github" }
]
local_path = "category/my-repo"
category = "tools"
status = "active"
language = "typescript"
publish_targets = ["jsr:@scope/package"]
dependencies = ["other-repo"]
keep_in_sync = true
allow_agents = true
notes = "Additional context"
```

### Repository Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Repository name |
| description | string | no | Human description |
| remotes | array | yes | Git remotes |
| local_path | string/false | no | Path relative to namespace, false if not cloned locally |
| category | string | no | Grouping category |
| status | string | no | Repository status |
| language | string | no | Primary language |
| publish_targets | array | no | Where published (jsr, npm, crates.io) |
| dependencies | array | no | Internal dependencies |
| keep_in_sync | bool | no | Include in sync operations |
| allow_agents | bool | no | Allow AI agents to work on this repo |
| notes | string | no | Additional notes |

## File Structure

```
tyvi/
├── mod.ts                    # Main export
├── deno.json                 # Package manifest
├── README.md                 # Usage documentation
├── LICENSE                   # MPL-2.0
├── docs/
│   ├── DESIGN.md             # This file
│   └── TODO.md               # Implementation tasks
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── src/
│   ├── cli/
│   │   ├── mod.ts            # CLI entry point
│   │   ├── commands/
│   │   │   ├── init.ts
│   │   │   ├── status.ts
│   │   │   ├── clone.ts
│   │   │   ├── sync.ts
│   │   │   ├── list.ts
│   │   │   ├── add.ts
│   │   │   └── remove.ts
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
│   │   ├── clone.ts          # Clone operations
│   │   ├── status.ts         # Status checking
│   │   └── remote.ts         # Remote operations
│   └── types.ts              # Shared types
└── tests/
    ├── config_test.ts
    ├── workspace_test.ts
    └── fixtures/
```

## Dependencies

- `@std/path` - Path utilities
- `@std/fs` - File system utilities
- `@std/toml` - TOML parsing
- `@std/fmt` - Terminal formatting

No external dependencies beyond Deno std library.

## Error Handling

All operations should:
- Never crash on missing files or bad config
- Provide clear error messages with context
- Suggest recovery actions
- Support dry-run mode for destructive operations

```typescript
// Good error message
Error: Repository 'viola' not found in inventory.
  Searched: @hiisi/inventory.toml, @orgrinrt/inventory.toml
  Did you mean: viola-cli, viola-default-lints?
  To add: tyvi add git@github.com:hiisi-digital/viola.git
```

## Output Design

Status output should be scannable and useful:

```
@hiisi
  viola/
    viola ............... ✓ clean (main) 3 days ago
    viola-cli ........... ✓ clean (main ↑2) 1 day ago
    viola-default-lints . ! dirty (fix/tests +3 -1) 2 hours ago
  muse/
    lets-muse ........... ✓ clean (main) 1 week ago

@orgrinrt
  agent-tooling/
    meet-mcp ............ - not cloned

Summary: 4 cloned, 1 dirty, 1 not cloned
```

## Design Decisions

### Config over convention

All behavior is driven by config files. No magic directory detection or implicit behavior.

### TOML format

TOML is human-readable, supports comments, and has good tooling. Better than JSON for config, simpler than YAML.

### Namespace-based organization

Namespaces (like npm scopes) keep repos organized and allow different defaults per org.

### Local path flexibility

Repos can have any local path structure. The tool doesn't enforce a layout; it just manages what you define.

### No hidden state

All state is in config files or the git repos themselves. No hidden databases or caches.

## Future Considerations

- Watch mode for continuous status updates
- Integration with github/gitlab APIs for repo discovery
- Workspace templates for common setups
- Hooks for clone/sync events
- TUI mode for interactive management
