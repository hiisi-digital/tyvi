# tyvi

Core library for devspace orchestration, people computation, and context management.

The name comes from Finnish "tyvi" meaning "base" or "trunk"; the foundational part from which branches grow.

## What is this?

`tyvi` is the **core library** that manages multi-repo devspaces through declarative config files. It provides the types, logic, and functionality for devspace operations, people computation, memory systems, and context resolution.

**tyvi ships no built-in data.** All atoms, people, memories, and content come from your devspace project (like `.ctl/`).

**Note:** Command-line access is provided by [`tyvi-cli`](https://github.com/hiisi-digital/tyvi-cli). The examples below show CLI commands for illustration.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      tyvi (this package)                        │
│                                                                 │
│   Core library: types, computation, people, memory, devspace    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
        ▲                                       ▲
        │ imports                               │ imports
        │                                       │
┌───────┴───────────┐                ┌─────────┴─────────┐
│     tyvi-cli      │                │     tyvi-mcp      │
│                   │                │                   │
│  CLI for humans   │                │  MCP for AI agents│
└───────────────────┘                └───────────────────┘
```

## Installation

### As a library

```typescript
import { loadDevspace, load, unload } from "@hiisi/tyvi";
```

### CLI (via tyvi-cli)

```bash
deno install -A jsr:@hiisi/tyvi-cli
```

## Quick Start

### 1. Initialize a devspace

```bash
mkdir my-devspace && cd my-devspace
tyvi init
```

This creates:
- `tyvi.toml` with devspace settings
- `@default/inventory.toml` as a starting point

### 2. Add repositories to inventory

Edit `@default/inventory.toml`:

```toml
[meta]
description = "My repositories"

[[repos]]
name = "my-app"
remotes = [
  { name = "origin", url = "git@github.com:myorg/my-app.git" }
]
local_path = "apps/my-app"
status = "active"

[[repos]]
name = "shared-lib"
remotes = [
  { name = "origin", url = "git@github.com:myorg/shared-lib.git" }
]
local_path = "libs/shared-lib"
status = "active"
```

### 3. Clone all repositories

```bash
tyvi clone --all
```

### 4. Check status

```bash
tyvi status
```

Output:

```
@default
  apps/
    my-app .............. ✓ clean (main) 2 days ago
  libs/
    shared-lib .......... ! dirty (feature/x +3 -1) 1 hour ago

Summary: 2 cloned, 1 dirty
```

## CLI Commands (via tyvi-cli)

| Command | Description |
|---------|-------------|
| `tyvi init` | Initialize a new devspace |
| `tyvi status` | Show status of all managed repos |
| `tyvi load <pattern>` | Load repos to active lab |
| `tyvi unload <pattern>` | Unload repos from lab to staging |
| `tyvi clone <pattern>` | Clone repos matching pattern |
| `tyvi sync` | Sync devspace structure with inventory |
| `tyvi list` | List repos from inventory |
| `tyvi add <url>` | Add a repo to inventory |
| `tyvi remove <name>` | Remove a repo from inventory |

See [`tyvi-cli`](https://github.com/hiisi-digital/tyvi-cli) for full command documentation.

## Devspace Structure

```
devspace/
├── tyvi.toml              # Devspace config
├── @myorg/
│   └── inventory.toml     # Namespace inventory
├── .staging/              # Cold repos (organized by namespace)
│   └── @myorg/
│       └── my-app/
├── .state/                # Runtime state
│   └── lab.toml
└── .lab/                  # Active repos (flat, git allowed)
    ├── my-app/
    └── shared-lib/
```

## Configuration

### tyvi.toml

```toml
[devspace]
name = "my-devspace"

# Paths (relative to tyvi.toml)
staging_path = ".staging"
lab_path = ".lab"
state_path = ".state"

[devspace.namespaces]
default = "@myorg"
paths = ["@myorg", "@another-org"]
```

### inventory.toml

```toml
[meta]
description = "Organization repositories"

[meta.defaults]
language = "typescript"
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
keep_in_sync = true
```

### Repository Status Values

- `active` - Under active development
- `stable` - Stable, minimal changes expected
- `wip` - Work in progress
- `archived` - No longer maintained
- `needs-review` - Requires attention

## Filtering

Most commands accept patterns:

```bash
tyvi status viola           # Repos with 'viola' in name
tyvi status @hiisi          # Repos in @hiisi namespace
tyvi clone --category tools # Repos in 'tools' category
tyvi clone --status active  # Only active repos
tyvi status --dirty         # Only repos with uncommitted changes
```

## Design Philosophy

- **Core library**: All logic in tyvi, interfaces are thin wrappers
- **Config-driven**: All behavior defined in config files
- **No hidden state**: Everything in config or git
- **Clear errors**: Always tell what went wrong and how to fix it
- **Offline-first**: Works without network except clone/fetch

## Related Packages

- [`tyvi-cli`](https://github.com/hiisi-digital/tyvi-cli) — CLI interface for human interaction
- [`tyvi-mcp`](https://github.com/hiisi-digital/tyvi-mcp) — MCP server for AI agent interaction

## Support

If you use this project or learned something from it, consider supporting development:

<a href="https://buymeacoffee.com/orgrinrt" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>

## License

This project is licensed under the terms of the **Mozilla Public License 2.0**.

`SPDX-License-Identifier: MPL-2.0`
