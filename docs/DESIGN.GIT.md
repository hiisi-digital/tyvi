# tyvi Git Restrictions Design

> Controls git operations within tyvi devspaces to enforce safe workflows.

---

## Overview

tyvi enforces git restrictions to prevent accidental operations in wrong locations. The core
principle: **git is blocked everywhere in a tyvi project except designated areas**.

This is implemented via:

1. Shell integration (primary enforcement)
2. direnv integration (when available)
3. Git hooks (defense in depth)
4. Validation API (for consumers like tyvi-cli, tyvi-mcp)

---

## Git Policy

### Allowed Locations

| Location                           | Git Allowed | Notes                               |
| ---------------------------------- | ----------- | ----------------------------------- |
| Tyvi root (has `tyvi.toml`)        | ✓ Limited   | Only targeting tyvi project itself  |
| `.lab/*` (configured lab path)     | ✓ Full      | Live workspace, symlinks to staging |
| Whitelist paths (config)           | ✓ Full      | Explicit escape hatch               |
| `.staging/*`                       | ✗ BLOCKED   | Internal only; tyvi uses wrapper    |
| Content dirs (`atoms/`, `people/`) | ✗ BLOCKED   | Not repos                           |
| Anywhere else in project           | ✗ BLOCKED   | Use `tyvi git`                      |

### Blocked Response

When git is blocked, provide:

1. Clear explanation of why
2. Current location vs allowed locations
3. Actionable alternatives (`tyvi load`, `tyvi git`, `cd`)

---

## Directory Structure

```
~/                              # User home
├── .ctl/                       # Tyvi project root
│   ├── tyvi.toml               # Config (has git policy)
│   ├── .git/                   # Tyvi project is itself a repo
│   │   └── hooks/              # Defense-in-depth hooks
│   ├── .staging/               # Repos cloned here (git BLOCKED)
│   │   ├── @hiisi/
│   │   │   └── viola/          # Actual repo
│   │   └── @orgrinrt/
│   │       └── nutshell/
│   ├── atoms/                  # Content (git BLOCKED)
│   ├── people/                 # Content (git BLOCKED)
│   └── .state/                 # Runtime state
│
└── .lab/                       # Sibling; symlinks (git ALLOWED)
    ├── viola -> ~/.ctl/.staging/@hiisi/viola
    └── nutshell -> ~/.ctl/.staging/@orgrinrt/nutshell
```

---

## Configuration

### tyvi.toml

```toml
[devspace]
name = "control-center"
lab = "../.lab"               # Relative to tyvi root
staging = ".staging"          # Relative to tyvi root

[devspace.git]
# Enable git restrictions (default: true)
enabled = true

# Allow git submodule operations in tyvi root
allow_submodules = false

# Explicit whitelist (relative paths or file reference)
# whitelist = ["some/special/path"]
# whitelist = ".git-allowed.txt"
whitelist = []

# Show tip to use tyvi git even when allowed
suggest_tyvi_git = true
```

### Whitelist File Format

If `whitelist` references a file (e.g., `.git-allowed.txt`):

```
# Paths where git is allowed (one per line)
# Relative to tyvi root
# Comments start with #
# Empty lines ignored

# Example: special repo that needs direct access
# .staging/@hiisi/special-repo
```

---

## Shell Integration

### Detection Logic

The shell function must:

1. **Check if in .lab/** (fast path for allowed)
2. **Find tyvi root** (walk up looking for `tyvi.toml`)
3. **Apply policy** based on location

```bash
# Pseudocode

git() {
  # Fast path: in lab?
  if in_configured_lab(); then
    allow_git()
    return
  fi
  
  tyvi_root = find_tyvi_root()
  
  # Not in tyvi project?
  if tyvi_root is null; then
    allow_git()  # Normal git
    return
  fi
  
  # At tyvi root exactly?
  if pwd == tyvi_root; then
    maybe_suggest_tyvi_git()
    allow_git()  # IDE compat
    return
  fi
  
  # In whitelist?
  if in_whitelist(pwd, tyvi_root); then
    allow_git()
    return
  fi
  
  # Blocked
  show_blocked_message()
  return 1
}
```

### Lab Detection

Lab is a sibling directory. Detect via:

```bash
in_configured_lab() {
  # Check if $PWD matches lab pattern
  # Lab is sibling of tyvi project
  
  # Example: $PWD = /Users/me/.lab/viola
  # Need to verify:
  # 1. Path contains configured lab name (.lab)
  # 2. Sibling of lab is tyvi project
  # 3. That sibling has tyvi.toml
  
  lab_parent = dirname(${PWD%%/.lab*}/.lab)
  
  for sibling in $lab_parent/*; do
    if [ -f "$sibling/tyvi.toml" ]; then
      # Read config, verify this is the configured lab
      return true
    fi
  done
  
  return false
}
```

### Shell RC Detection

tyvi must detect the correct shell config file:

| Shell | Check Order                                         |
| ----- | --------------------------------------------------- |
| zsh   | `~/.zshrc`, `~/.zsh/config`, `~/.config/zsh/.zshrc` |
| bash  | `~/.bashrc`, `~/.bash_profile`                      |
| fish  | `~/.config/fish/config.fish`, `~/.fish/config.fish` |

Algorithm:

1. Detect current shell from `$SHELL`
2. Check which config files exist
3. Use the first existing one
4. If none exist, prompt user for preference

### Alias Preservation

User may have existing git alias. Preserve it:

```bash
# In init.sh, before defining function
if alias git &>/dev/null 2>&1; then
  _tyvi_user_git_alias="$(alias git 2>/dev/null | sed "s/^alias git='//" | sed "s/'$//")"
fi

git() {
  # ... tyvi checks ...
  
  # When allowing, respect user's alias
  if [ -n "$_tyvi_user_git_alias" ]; then
    eval "$_tyvi_user_git_alias" '"$@"'
  else
    command git "$@"
  fi
}
```

---

## direnv Integration

When direnv is available, provides additional enforcement layer.

### Detection

```bash
# Check if direnv is available
command -v direnv &>/dev/null
```

### Setup

Create `.envrc` in:

1. Tyvi project root
2. Lab directory
3. Optionally, tyvi parent directory (if user opts in)

### Tyvi Root .envrc

```bash
# .ctl/.envrc
# Auto-generated by tyvi init

# Export tyvi root for shell function
export TYVI_ROOT="$PWD"

# Wrap git to use tyvi wrapper even in root
git() {
  tyvi git "$@"
}
export -f git
```

### Lab .envrc

```bash
# .lab/.envrc  
# Auto-generated by tyvi init

# Mark that we're in lab (fast path)
export TYVI_IN_LAB=1
export TYVI_ROOT="$(dirname "$PWD")/.ctl"

# Optional: still route through tyvi for tracking
# git() {
#   tyvi git --lab "$@"
# }
# export -f git
```

### Parent Directory .envrc (Optional)

If user opts in, create `.envrc` in tyvi parent to guard siblings:

```bash
# ~/Dev/.envrc (parent of .ctl and .lab)
# Auto-generated by tyvi init (user opted in)

# Re-export to ensure shell function loaded
[[ -f ~/.ctl/shell/init.sh ]] && source ~/.ctl/shell/init.sh
```

---

## Git Hooks

Defense-in-depth layer. Catches IDE and direct binary usage.

### Tyvi Project Hooks

Install in `.ctl/.git/hooks/`:

**pre-commit:**

```bash
#!/bin/sh
# Ensure commits to tyvi project happen from root

TYVI_ROOT="$(git rev-parse --show-toplevel)"

# Allow if at tyvi root
[ "$PWD" = "$TYVI_ROOT" ] && exit 0

# Allow if TYVI_ALLOW_COMMIT is set (by tyvi wrapper)
[ -n "$TYVI_ALLOW_COMMIT" ] && exit 0

# Block
echo "⚠️  Commit from $(pwd) not allowed."
echo ""
echo "Run git from project root:"
echo "  cd $TYVI_ROOT"
echo "  git commit ..."
echo ""
echo "Or use tyvi:"
echo "  tyvi git commit ..."

exit 1
```

### Staging Repo Hooks

NOT installed by default. Staging is internal; tyvi wrapper handles it.

If needed for extra safety, can install via `tyvi sync --install-hooks`.

---

## Core API

tyvi core exports these functions for git restriction handling:

### Types

```typescript
interface GitPolicy {
  enabled: boolean;
  allowSubmodules: boolean;
  whitelist: string[];
  suggestTyviGit: boolean;
}

interface GitCheckResult {
  allowed: boolean;
  reason: "lab" | "root" | "whitelist" | "outside_project" | "blocked";
  message?: string;
  suggestion?: string;
}

interface ShellIntegration {
  shell: "zsh" | "bash" | "fish" | "unknown";
  rcFile: string | null;
  hasExistingAlias: boolean;
  existingAlias?: string;
}

interface InitOptions {
  installShellIntegration: boolean;
  installDirenv: boolean;
  installParentDirenv: boolean;
  installHooks: boolean;
}
```

### Functions

```typescript
// Check if git allowed at path
checkGitAllowed(
  devspace: Devspace, 
  path: string
): GitCheckResult

// Find devspace root from any path
findDevspaceRoot(from: string): string | null

// Get helpful message when blocked
getBlockedMessage(
  devspace: Devspace, 
  path: string
): string

// Detect shell and RC file
detectShell(): ShellIntegration

// Check if direnv available
hasDirenv(): boolean

// Generate shell init script content
generateShellInit(devspace: Devspace): string

// Generate .envrc content
generateEnvrc(
  devspace: Devspace, 
  location: 'root' | 'lab' | 'parent'
): string

// Install git hooks
installHooks(devspace: Devspace): Promise<void>

// Full initialization
initDevspace(
  root: string, 
  options: InitOptions
): Promise<InitResult>

// Validate guards are in place
validateGuards(devspace: Devspace): Promise<ValidationResult>
```

### Validation

```typescript
interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  type: "shell" | "direnv" | "hooks" | "config";
  severity: "error" | "warning";
  message: string;
  fix?: string;
}
```

Validation checks:

1. Shell integration sourced in RC file
2. direnv .envrc present (if direnv available)
3. Git hooks installed
4. Config file valid
5. Lab directory exists and is accessible

---

## tyvi git Wrapper

When users call `tyvi git ...`, the core handles:

1. Determine context (which repo, which location)
2. Set appropriate env vars (`TYVI_ALLOW_COMMIT`, etc.)
3. Execute git in correct directory
4. Track operation if configured

```typescript
interface TyviGitOptions {
  lab?: boolean;      // Force lab context
  repo?: string;      // Specify repo
  allowStaging?: boolean;  // Internal use
}

// Execute git through tyvi wrapper
tyviGit(
  devspace: Devspace,
  args: string[],
  options?: TyviGitOptions
): Promise<GitResult>
```

---

## Init Flow

### With direnv

```
$ tyvi init

Initializing tyvi devspace...

✓ Created tyvi.toml
✓ Created .staging/
✓ Created ../.lab/
✓ Installed git hooks in .git/hooks/

Detected: direnv ✓
✓ Created .envrc (tyvi root)
✓ Created ../.lab/.envrc

Optional: Guard parent directory too?
  This adds .envrc to ~/Dev/ to catch stray git ops.
  [y/n]: n

✓ Git restrictions active

To verify:
  tyvi validate --guards
```

### Without direnv

```
$ tyvi init

Initializing tyvi devspace...

✓ Created tyvi.toml
✓ Created .staging/
✓ Created ../.lab/
✓ Installed git hooks in .git/hooks/

No direnv detected. Shell integration needed.

Detected shell: zsh
Config file: ~/.zshrc

Add shell integration? [y/n]: y

✓ Added to ~/.zshrc:
  source ~/.ctl/shell/init.sh

Restart your shell or run:
  source ~/.zshrc

✓ Git restrictions active
```

---

## Blocked Message Format

When git is blocked:

```
⚠️  Git operations blocked here.

Location: ~/.ctl/atoms/traits/
Tyvi root: ~/.ctl/

This path is inside your tyvi project but not in an allowed area.

Allowed locations:
  ~/.ctl/           (project root only)
  ~/.lab/           (live workspace)

Options:
  1. Load a repo to lab:
     tyvi load <pattern>

  2. Use tyvi git wrapper:
     tyvi git status
     tyvi git commit -m "..."

  3. Work in lab directly:
     cd ~/.lab/<repo>
```

---

## Security Considerations

### Bypass Vectors

| Vector                     | Mitigation                           |
| -------------------------- | ------------------------------------ |
| Direct `/usr/bin/git` call | Git hooks catch commits              |
| Script calling git         | direnv wraps for subshells           |
| IDE git integration        | Hooks catch; most IDEs respect shell |
| `--no-verify` flag         | Hooks still block (not bypassable)   |
| New shell without init     | Document; user responsibility        |

### No Escape Hatch

The restriction is intentional. When blocked:

- Do NOT provide `--force` flag
- Do NOT offer bypass
- Guide user to correct workflow

Whitelist exists for legitimate exceptions configured explicitly.

---

## Implementation Notes

### Performance

Shell function must be fast for non-tyvi paths:

```bash
# Quick exit if clearly not in tyvi project
# Check for marker file existence before walking tree
[ ! -f "tyvi.toml" ] && [ ! -f "../tyvi.toml" ] && [ ! -f "../../tyvi.toml" ] && {
  command git "$@"
  return
}
```

### Fish Shell

Fish doesn't support `export -f`. Use fish functions:

```fish
# ~/.config/fish/functions/git.fish

function git
  # ... tyvi logic ...
  command git $argv
end
```

### Windows Compatibility

Not primary target, but if needed:

- PowerShell function instead of bash
- Use `.envrc` equivalent (direnv works on Windows)
- Git hooks work cross-platform

---

## Related Documents

- `DESIGN.md` — Core tyvi design
- `TODO.md` — Implementation tasks
- `tyvi-cli/docs/DESIGN.md` — CLI interface
- `tyvi-mcp/docs/DESIGN.md` — MCP server interface
