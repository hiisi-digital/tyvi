# tyvi

Config-driven workspace orchestration for multi-repo development environments.

The name comes from Finnish "tyvi" meaning "base" or "trunk"; the foundational part from which branches grow.

## What is this?

`tyvi` manages multi-repo workspaces through declarative config files. Define your repositories in `inventory.toml` files, organize them by namespace, and use simple commands to clone, sync, and track status across all of them.

## Installation

```bash
deno install -A jsr:@hiisi/tyvi
```

## Quick Start

### 1. Initialize a workspace

```bash
mkdir my-workspace && cd my-workspace
tyvi init
```

This creates:
- `tyvi.toml` with workspace settings
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

## Commands

| Command | Description |
|---------|-------------|
| `tyvi init` | Initialize a new workspace |
| `tyvi status` | Show status of all managed repos |
| `tyvi clone <pattern>` | Clone repos matching pattern |
| `tyvi sync` | Sync workspace structure with inventory |
| `tyvi list` | List repos from inventory |
| `tyvi add <url>` | Add a repo to inventory |
| `tyvi remove <name>` | Remove a repo from inventory |

## Workspace Structure

```
workspace/
├── tyvi.toml              # Workspace config
├── @myorg/
│   ├── inventory.toml     # Namespace inventory
│   ├── apps/
│   │   └── my-app/        # Cloned repo
│   └── libs/
│       └── shared-lib/    # Cloned repo
└── @another-org/
    ├── inventory.toml
    └── tools/
        └── some-tool/
```

## Configuration

### tyvi.toml

```toml
[workspace]
name = "my-workspace"

[workspace.namespaces]
default = "@myorg"
paths = ["@myorg", "@another-org"]

[defaults]
clone_method = "ssh"
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

- **Config-driven**: All behavior defined in config files
- **No hidden state**: Everything in config or git
- **Clear errors**: Always tell what went wrong and how to fix it
- **Offline-first**: Works without network except clone/fetch

## Support

If you use this project or learned something from it, consider supporting development:

<a href="https://buymeacoffee.com/orgrinrt" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>

## License

This project is licensed under the terms of the **Mozilla Public License 2.0**.

`SPDX-License-Identifier: MPL-2.0`
