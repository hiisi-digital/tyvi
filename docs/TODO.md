# TODO - tyvi

Config-driven workspace orchestration for multi-repo development environments.

## Phase 1: Foundation

### Project Setup
- [ ] Initialize deno.json with package metadata
- [ ] Set up imports for @std/path, @std/fs, @std/toml, @std/fmt
- [ ] Create basic module structure
- [ ] Add LICENSE (MPL-2.0)
- [ ] Write README.md with usage examples

### Type Definitions (`src/types.ts`, `src/config/types.ts`)
- [ ] Define WorkspaceConfig interface (tyvi.toml shape)
- [ ] Define InventoryConfig interface (inventory.toml shape)
- [ ] Define RepoDefinition interface
- [ ] Define RemoteDefinition interface
- [ ] Define RepoStatus enum (active, stable, wip, archived, needs-review)
- [ ] Define CloneStatus type (cloned, missing, partial)
- [ ] Define GitStatus type (clean, dirty, ahead, behind)

### Config Parsing (`src/config/`)
- [ ] Implement tyvi.toml parser (`workspace.ts`)
- [ ] Implement inventory.toml parser (`inventory.ts`)
- [ ] Validate config against expected structure
- [ ] Handle missing optional fields with defaults
- [ ] Report clear errors for malformed config

## Phase 2: Core Operations

### Workspace Discovery (`src/workspace/discovery.ts`)
- [ ] Find tyvi.toml from current directory upward
- [ ] Locate all inventory.toml files in namespace directories
- [ ] Build workspace model from discovered config
- [ ] Handle workspace not found gracefully

### Workspace Operations (`src/workspace/operations.ts`)
- [ ] Create directory structure from config
- [ ] Move repos to correct locations
- [ ] Detect orphaned repos (local but not in inventory)
- [ ] Detect missing repos (in inventory but not cloned)

### Git Operations (`src/git/`)
- [ ] Clone repository to specified path (`clone.ts`)
- [ ] Get repository status (clean, dirty, ahead, behind) (`status.ts`)
- [ ] Fetch all remotes (`remote.ts`)
- [ ] Get current branch name
- [ ] Get last commit date
- [ ] Check if directory is a git repo

## Phase 3: CLI Commands

### CLI Framework (`src/cli/mod.ts`)
- [ ] Set up command parsing (use @std/cli or manual)
- [ ] Handle global flags (--help, --version, --quiet, --verbose)
- [ ] Route to subcommand handlers
- [ ] Consistent error handling and exit codes

### Output Formatting (`src/cli/output.ts`)
- [ ] Status table formatting with alignment
- [ ] Color coding for status indicators
- [ ] Progress indicators for long operations
- [ ] JSON output mode
- [ ] Quiet mode (minimal output)

### Command: init (`src/cli/commands/init.ts`)
- [ ] Create tyvi.toml with defaults
- [ ] Create namespace directories
- [ ] Create template inventory.toml files
- [ ] Interactive mode for guided setup
- [ ] Minimal mode for quick setup

### Command: status (`src/cli/commands/status.ts`)
- [ ] Show all repos with clone and git status
- [ ] Filter by namespace pattern
- [ ] Filter by repo name pattern
- [ ] Filter by status (--dirty, --behind, --missing)
- [ ] Summary line at end

### Command: clone (`src/cli/commands/clone.ts`)
- [ ] Clone repos matching pattern
- [ ] Clone by namespace/category
- [ ] Clone all with --all flag
- [ ] Filter by status (--status active)
- [ ] Show progress during clone
- [ ] Skip already cloned repos

### Command: sync (`src/cli/commands/sync.ts`)
- [ ] Create missing directories
- [ ] Move misplaced repos to correct location
- [ ] Report orphaned repos
- [ ] Optional --fetch to update all remotes
- [ ] Optional --prune to remove orphaned repos
- [ ] Dry run mode (--dry-run)

### Command: list (`src/cli/commands/list.ts`)
- [ ] List all repos from inventory
- [ ] Filter by cloned/missing status
- [ ] JSON output format
- [ ] Table output format

### Command: add (`src/cli/commands/add.ts`)
- [ ] Parse git URL to extract repo info
- [ ] Prompt for namespace/category if not specified
- [ ] Add entry to inventory.toml
- [ ] Optionally clone immediately

### Command: remove (`src/cli/commands/remove.ts`)
- [ ] Remove repo from inventory.toml
- [ ] Optionally delete local clone (--delete)
- [ ] Require confirmation for delete

## Phase 4: Testing

### Unit Tests
- [ ] `tests/config_test.ts` - Config parsing
- [ ] `tests/workspace_test.ts` - Workspace operations
- [ ] `tests/git_test.ts` - Git operations (with mocks)
- [ ] `tests/cli_test.ts` - Command parsing

### Test Fixtures
- [ ] `tests/fixtures/valid-workspace/` - Complete workspace
- [ ] `tests/fixtures/minimal-workspace/` - Minimal config
- [ ] `tests/fixtures/invalid-config/` - Malformed config files

### Integration Tests
- [ ] Full init -> clone -> status workflow
- [ ] Sync with moved repos
- [ ] Add and remove repos

## Phase 5: Documentation and Polish

### Documentation
- [ ] Complete README with all commands
- [ ] Document config file formats
- [ ] Add examples for common workflows
- [ ] Document error messages and recovery

### Polish
- [ ] Ensure all tests pass
- [ ] Type checking passes
- [ ] Error messages are helpful
- [ ] Output is readable and scannable

## CI/CD

- [ ] CI workflow (thin wrapper to reusable)
- [ ] Release workflow (thin wrapper to reusable)

## Future Enhancements

### Watch Mode
- [ ] Continuous status updates
- [ ] Notify on status changes

### API Integration
- [ ] GitHub API for repo discovery
- [ ] GitLab API support
- [ ] Auto-populate inventory from org

### Templates
- [ ] Workspace templates
- [ ] Share templates between users

### Hooks
- [ ] Pre/post clone hooks
- [ ] Pre/post sync hooks

### TUI Mode
- [ ] Interactive repo browser
- [ ] Status dashboard
- [ ] Clone/sync with selection

## Notes

### Design Principles

- Config-driven; no magic
- Clear error messages with recovery suggestions
- No hidden state; all in config or git
- Works offline; no required network calls except clone/fetch

### Dependencies

Only Deno std library:
- `@std/path` - Path utilities
- `@std/fs` - File system utilities
- `@std/toml` - TOML parsing
- `@std/fmt` - Terminal formatting

Do not add external dependencies without explicit approval.

### Output Style

Status output should be:
- Scannable (aligned columns, clear indicators)
- Informative (show relevant info, hide noise)
- Actionable (suggest next steps)

```
@hiisi
  viola/
    viola ............... ✓ clean (main) 3 days ago
    viola-cli ........... ✓ clean (main ↑2) 1 day ago

Summary: 2 cloned, 0 dirty
```
