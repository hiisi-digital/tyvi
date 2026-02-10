# TODO: Git Guards Implementation

> Implement git restrictions, shell integration, and validation API.

Based on: [`DESIGN.GIT.md`](./DESIGN.GIT.md)

---

## Phase 1: Core Types & Config

- [ ] Add types in `src/types/git.ts`
  - `GitPolicy` interface
  - `GitCheckResult` interface
  - `ShellIntegration` interface
  - `InitOptions` interface
  - `ValidationResult` interface
  - `ValidationIssue` interface

- [ ] Extend `src/types/devspace.ts`
  - Add `git` section to `DevspaceConfig`
  - Add `GitPolicy` field

- [ ] Update `src/config/devspace.ts`
  - Parse `[devspace.git]` section from tyvi.toml
  - Handle whitelist as array or file reference
  - Default values: `enabled=true`, `allowSubmodules=false`, `whitelist=[]`

---

## Phase 2: Core API Functions

- [ ] Create `src/devspace/git.ts`
  ```typescript
  // Check if git allowed at path
  checkGitAllowed(devspace: Devspace, path: string): GitCheckResult

  // Find devspace root from any path
  findDevspaceRoot(from: string): string | null

  // Get helpful message when blocked
  getBlockedMessage(devspace: Devspace, path: string): string

  // Check if path is in lab
  isInLab(devspace: Devspace, path: string): boolean

  // Check if path is in whitelist
  isInWhitelist(devspace: Devspace, path: string): boolean
  ```

- [ ] Create `src/devspace/tyvi-git.ts`
  ```typescript
  // Execute git through tyvi wrapper
  tyviGit(
    devspace: Devspace,
    args: string[],
    options?: TyviGitOptions
  ): Promise<GitResult>
  ```

---

## Phase 3: Shell Integration

- [ ] Create `src/devspace/shell.ts`
  ```typescript
  // Detect shell and RC file
  detectShell(): ShellIntegration

  // Check for existing git alias
  hasExistingGitAlias(shell: ShellIntegration): Promise<boolean>

  // Get existing alias value
  getExistingGitAlias(shell: ShellIntegration): Promise<string | null>
  ```

- [ ] Create shell init templates
  - `src/devspace/templates/init.bash.ts` — Bash/Zsh template
  - `src/devspace/templates/init.fish.ts` — Fish template
  - Templates include:
    - Alias preservation logic
    - Fast path for non-tyvi dirs
    - Lab detection
    - Blocked message display

- [ ] Create `src/devspace/shell-init.ts`
  ```typescript
  // Generate shell init script content
  generateShellInit(devspace: Devspace, shell: 'bash' | 'zsh' | 'fish'): string

  // Write init script to disk
  writeShellInit(devspace: Devspace): Promise<string>

  // Append source line to RC file
  appendToRcFile(rcFile: string, initPath: string): Promise<void>
  ```

---

## Phase 4: direnv Integration

- [ ] Create `src/devspace/direnv.ts`
  ```typescript
  // Check if direnv available
  hasDirenv(): boolean

  // Generate .envrc content
  generateEnvrc(
    devspace: Devspace,
    location: 'root' | 'lab' | 'parent'
  ): string

  // Write .envrc files
  writeEnvrc(devspace: Devspace, location: 'root' | 'lab' | 'parent'): Promise<void>

  // Allow direnv (run direnv allow)
  allowDirenv(path: string): Promise<void>
  ```

---

## Phase 5: Git Hooks

- [ ] Create `src/devspace/hooks.ts`
  ```typescript
  // Install git hooks in tyvi project
  installHooks(devspace: Devspace): Promise<void>

  // Generate hook script content
  generateHook(hookType: 'pre-commit'): string

  // Check if hooks installed
  hasHooks(devspace: Devspace): boolean
  ```

---

## Phase 6: Initialization

- [ ] Extend `src/devspace/operations.ts` or create `src/devspace/init.ts`
  ```typescript
  // Full initialization with guards
  initDevspace(
    root: string,
    options: InitOptions
  ): Promise<InitResult>
  ```

- [ ] Init flow:
  1. Create tyvi.toml with git policy
  2. Create .staging/ directory
  3. Create lab directory (sibling)
  4. Install git hooks
  5. If direnv: create .envrc files
  6. If no direnv: prompt for shell integration
  7. Write shell init script
  8. Append to RC file (if opted in)

---

## Phase 7: Validation

- [ ] Create `src/devspace/validation.ts`
  ```typescript
  // Validate all guards are in place
  validateGuards(devspace: Devspace): Promise<ValidationResult>
  ```

- [ ] Validation checks:
  - [ ] tyvi.toml exists and valid
  - [ ] Git policy section present
  - [ ] Shell init script exists
  - [ ] RC file sources init script (check if line present)
  - [ ] If direnv: .envrc files exist
  - [ ] Git hooks installed
  - [ ] Lab directory exists
  - [ ] Staging directory exists

---

## Phase 8: Exports

- [ ] Update `src/devspace/mod.ts` — export all new functions
- [ ] Update `mod.ts` — export public API

Public API additions:

```typescript
// Git restrictions
export { checkGitAllowed, findDevspaceRoot, getBlockedMessage } from "./devspace/git.ts";
export { tyviGit } from "./devspace/tyvi-git.ts";

// Shell integration
export { detectShell, generateShellInit } from "./devspace/shell.ts";

// direnv
export { generateEnvrc, hasDirenv } from "./devspace/direnv.ts";

// Hooks
export { hasHooks, installHooks } from "./devspace/hooks.ts";

// Init & validation
export { initDevspace, validateGuards } from "./devspace/init.ts";

// Types
export type {
  GitCheckResult,
  GitPolicy,
  InitOptions,
  ShellIntegration,
  ValidationResult,
} from "./types/git.ts";
```

---

## Phase 9: Tests

- [ ] `tests/git_policy_test.ts`
  - Test `checkGitAllowed` for all scenarios
  - Test whitelist parsing (array and file)
  - Test lab detection with symlinks

- [ ] `tests/shell_integration_test.ts`
  - Test shell detection for bash/zsh/fish
  - Test RC file detection
  - Test alias preservation

- [ ] `tests/init_test.ts`
  - Test full init flow
  - Test with/without direnv
  - Test hook installation

- [ ] `tests/validation_test.ts`
  - Test validation detects missing guards
  - Test validation passes with all guards

---

## Notes for Implementation

### Performance

- Shell function must be fast; use early exit for non-tyvi paths
- Cache `findDevspaceRoot` result in shell function via env var

### Shell Compatibility

- Bash and Zsh share same syntax for function/alias
- Fish uses different syntax (`function git ... end`)
- Test on all three shells

### Symlink Handling

- `$PWD` preserves logical path (symlink), use this for lab detection
- `pwd -P` gives physical path, use for validation

### Error Messages

- Always actionable
- Show both current location and allowed locations
- Provide exact commands user can run

---

## Related

- [`DESIGN.GIT.md`](./DESIGN.GIT.md) — Full design specification
- [`DESIGN.md`](./DESIGN.md) — Core tyvi design
- `tyvi-cli/docs/TODO.md` — CLI needs corresponding commands
