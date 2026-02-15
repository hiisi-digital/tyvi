# Test Gaps

Comprehensive audit of every test gap in the tyvi test suite. Tests are organized by severity: what
will actually cause bugs in real usage, not just theoretical coverage gaps.

**Total: 340 tests passing. Many are tautological or happy-path only.**

---

## Legend

- `[C]` Critical — will cause real bugs, high blast radius
- `[H]` High — likely to cause bugs in normal usage
- `[M]` Medium — edge case but realistic
- `[L]` Low — defensive, unlikely but worth covering

Tests marked with `PRUNE` are candidates for removal (they test nothing meaningful).

---

## 1. Guards: Shell Integration (`src/devspace/shell.ts`)

### Tests to prune

| Test                                                          | Why it's useless                                                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `generateShellInit - bash script contains root and lab paths` | Tests that TypeScript template literal interpolation works. The template hard-codes `${rootPath}` — of course the output contains the root path. |
| `generateShellInit - fish script uses switch syntax`          | Tests that a constant string contains a constant. The template hard-codes `switch`.                                                              |
| `generateShellInit - includes whitelist paths`                | Same — tests template interpolation of `${specialPath}`.                                                                                         |
| `generateHook - pre-commit contains tyvi marker`              | The string literal contains "tyvi git guard". This tests the Go/TypeScript string constant system.                                               |
| `generateHook - pre-commit is valid shell script`             | Checks `startsWith("#!/bin/sh")`. This is checking a constant. Does NOT validate shell syntax.                                                   |
| `generateHook - pre-commit checks TYVI_ALLOW_COMMIT`          | Checks that a constant string contains a constant substring.                                                                                     |

### Missing tests

- `[C]` **Generated bash script is syntactically valid.** Run `bash -n` on the output. A typo in the
  template would pass all current tests but produce a broken shell function that silently fails.
- `[C]` **Generated fish script is syntactically valid.** Run `fish -n` on the output. Fish has
  different quoting rules — the `case "${labPath}*"` pattern uses bash-style quoting that may not
  work correctly in fish.
- `[C]` **Shell script actually blocks git in a blocked directory.** Create a temp devspace,
  generate the init script, source it in a subshell, run `git status` from a blocked path, verify
  exit code is 1.
- `[C]` **Shell script allows git in lab.** Same setup, run from lab path, verify exit code is 0.
- `[C]` **Shell script allows git at project root.** Same setup, run from root, verify exit code
  is 0.
- `[H]` **Path with spaces.** `rootPath = "/tmp/my project"` — the template does `"${rootPath}"` but
  shell word splitting may still break things.
- `[H]` **Path with special characters.** `$`, backticks, double quotes in path names. The template
  does no escaping.
- `[H]` **Symlink bypass.** If `$PWD` resolves through a symlink, the `case` statement won't match
  the resolved path. This is a real security bypass.
- `[H]` **Whitelist prefix collision.** Whitelist entry `.staging/@test/special` also matches
  `.staging/@test/special-EVIL`. The pattern uses `"${p}"*)` which is a prefix match.
- `[M]` **`detectShell()` unit tests.** Currently untested entirely. Should test with mocked env
  vars for each shell type.
- `[M]` **`hasExistingAlias` is always false.** Dead code. Either implement or remove.
- `[M]` **`writeShellInit` with fish shell.** Verify `.fish` extension and fish-specific content.
- `[L]` **Empty whitelist generates valid script.** No whitelist paths → no `whitelistChecks` lines.
  Verify the script isn't broken by empty interpolation.

---

## 2. Guards: direnv (`src/devspace/direnv.ts`)

### Tests to prune

| Test                                                  | Why it's useless                                                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `generateEnvrc - root location sets TYVI_ROOT`        | Tests that a string literal contains "TYVI_ROOT". The function is a three-way switch returning constant strings. |
| `generateEnvrc - lab location sets TYVI_IN_LAB`       | Same pattern.                                                                                                    |
| `generateEnvrc - parent location sources init script` | Same pattern.                                                                                                    |

### Missing tests

- `[H]` **`generateEnvrc` values are correct, not just present.** Current tests check
  `includes("TYVI_ROOT")` but not that the value is `rootPath`. If it set `TYVI_ROOT="/wrong"`,
  tests still pass.
- `[H]` **`writeEnvrc("parent")` doesn't clobber existing `.envrc`.** Writes to
  `resolve(rootPath, "..")/.envrc` with NO backup. If user has an existing `.envrc` in the parent,
  it's overwritten silently.
- `[H]` **`generateEnvrc("parent")` hard-codes `init.sh`.** Fish users get a parent `.envrc` that
  sources `init.sh` instead of `init.fish`. No test.
- `[M]` **`hasDirenv()` returns false when not installed.** Trivial wrapper but should have basic
  test.
- `[M]` **`allowDirenv()` error path.** Throws on failure, never tested.
- `[L]` **Path with special characters in `.envrc` content.** `rootPath` with `$` or quotes would
  break the exported env vars.

---

## 3. Guards: Hooks (`src/devspace/hooks.ts`)

### Existing tests — keep

The hooks tests (hasHooks, installHooks, removeHooks backup/restore lifecycle) are mostly
legitimate. They test real filesystem operations and state transitions. Keep all of them.

### Missing tests

- `[C]` **Hook actually blocks a commit from a non-root directory.** Install hook in a real git
  repo, create a file, `git add`, attempt `git commit` from a subdirectory. Verify exit code is 1
  and commit didn't happen.
- `[C]` **Hook allows a commit from root.** Same setup, commit from root. Verify success.
- `[C]` **Hook respects `TYVI_ALLOW_COMMIT`.** Set env var, commit from subdirectory. Verify
  success.
- `[H]` **`hasHooks` false positive.** User has a non-tyvi pre-commit hook. `hasHooks()` returns
  `true`. But tyvi hooks are NOT installed. `validateGuards` then incorrectly reports hooks are
  fine. This is a real semantic bug.
- `[M]` **Backup collision.** If `.bak` already exists from a previous cycle, `installHooks()`
  overwrites it silently. User loses their original hook backup.
- `[M]` **Double install overwrites without backup.** First install backs up user hook. Second
  install sees tyvi hook → no backup. But `.bak` from first install is still there. This is correct
  but untested.

---

## 4. Guards: Validation (`src/devspace/validation.ts`)

### Missing tests

- `[H]` **RC file false negative.** The check on line 75 passes if `rcContent.includes("tyvi")` —
  even a comment like `# TODO: look at tyvi` would satisfy it. The check should verify the actual
  source line, not just the word "tyvi".
- `[H]` **RC file check with init script present.** The entire RC file check path (lines 70-84) has
  zero test coverage. No test creates both a shell init script AND an RC file to exercise this
  logic.
- `[M]` **`hasHooks` semantic mismatch.** Validation uses `hasHooks()` which returns true for ANY
  pre-commit hook. Should check if it's specifically a tyvi hook. Not tested because the bug isn't
  in validation.ts but in hooks.ts — but the integration is untested.
- `[M]` **Stale shell init script.** Validation checks `exists()` but not content. A zero-byte file
  or wrong-path script passes validation. Not critical but misleading.
- `[L]` **direnv validation path.** Whether `hasDirenv()` returns true depends on CI environment.
  Direnv checks are silently skipped if not installed.

---

## 5. Config (`src/config/`)

### Missing tests

- `[C]` **`[workspace]` backward compatibility.** `parseDevspaceConfig` accepts `parsed.workspace`
  as fallback (line 33 of devspace.ts). Zero test coverage. CLAUDE.md explicitly requires this. If
  it regresses, existing users' configs silently fail.
- `[C]` **Empty inventory after `initDevspace`.** `initDevspace` creates
  `"# Repository inventory\n"` (no `[[repos]]`). `parseInventoryConfig` may throw because
  `parsed.repos` is undefined. The sequence `initDevspace()` → `loadDevspace()` has never been
  tested together.
- `[H]` **Type coercion.** `name = 42` (number instead of string), `paths = "@default"` (string
  instead of array). The parser has type guards (`typeof devspace.name === "string"`) but they're
  never exercised.
- `[H]` **Multiple namespace paths.** Every fixture uses `paths = ["@default"]`. Real devspaces have
  `paths = ["@hiisi", "@contrib"]`. Multi-namespace loading (lines 96-107 of config/mod.ts) is
  untested with multiple namespaces.
- `[H]` **Meta defaults DON'T override explicit repo values.** Test checks propagation but never
  verifies that an explicit `status = "active"` on a repo takes precedence over
  `[meta.defaults] status = "stable"`.
- `[M]` **Corrupt inventory in one namespace.** `loadDevspace` catches errors per-namespace (line
  103-105 of config/mod.ts) and continues. This error recovery path is never tested.
- `[M]` **`findDevspaceRoot` walk-up behavior.** Never tested from a subdirectory.
- `[M]` **Config with unknown/extra fields.** Does the parser silently ignore them or throw?
- `[L]` **Duplicate repo names in same inventory.** Silently accepted. May cause issues downstream.

---

## 6. Devspace Operations (`src/devspace/operations.ts`)

### Entire public API functions with zero tests

- `[C]` **`removeRepo`** — Text-based TOML surgery with a line-by-line state machine. The most
  fragile code in the entire codebase. Failure modes:
  - `[[repos]]` header and `name =` on adjacent lines vs separated by blank lines
  - Comments between fields of a repo section
  - Single-quoted `name = 'repo'` instead of double quotes
  - Removing the last repo (trailing content handling)
  - Removing a repo followed by `[meta.defaults]` section
  - `name =` line that partially matches (e.g., removing "foo" shouldn't remove "foobar")
- `[C]` **`addRepo`** — Builds TOML by string concatenation. Partially mitigated by
  `escapeTOMLString` and `validateRepoName`, but:
  - URL containing `"`, `\n`, other TOML-special characters
  - Appending to an inventory that doesn't end with newline
  - Appending to an empty inventory file
  - Duplicate repo name (should it error or silently duplicate?)
- `[H]` **`clone`** — Has a bug: `options.status` filter is applied (line 196-198) but is NOT
  included in the "has any filter" check (line 204). So `clone(devspace, { status: "active" })`
  silently clones nothing. Zero tests to catch this.
- `[H]` **`sync`** — Creates directories, optionally fetches. Untested.
- `[H]` **`listRepos`** — Lightweight listing. Untested.

### Missing tests for tested functions

- `[C]` **`load` — symlink target is correct.** Tests verify `stat.isSymlink` but never call
  `Deno.readLink()` to verify the symlink POINTS to the right staging directory. If the
  implementation linked to the wrong directory, all tests pass.
- `[C]` **`load` — content accessible through symlink.** Create a file in staging, load repo, verify
  the file is readable through the lab symlink.
- `[H]` **`load` — name collision across namespaces.** Two namespaces with repos named "shared" →
  second load should fail with "path already exists". Handled in code (lines 507-512) but untested.
- `[H]` **`unload` — non-symlink path.** When lab contains a real directory (not symlink), unload
  checks git status and moves back. This entire branch (lines 606-634) is untested:
  - Dirty repo → refuses with "has uncommitted changes"
  - Unpushed commits → refuses with "has unpushed commits"
  - Force flag bypasses checks
  - `Deno.rename` back to staging
- `[H]` **`unload` — stale state after manual deletion.** If user manually deletes a lab symlink,
  unload should clean up the state entry. This IS tested but only for the "missing" case, not for
  "broken symlink" case.
- `[M]` **`load` with pattern matching.** Tests always load by `all: true`. Never tests `pattern`
  matching.
- `[M]` **`load` with namespace filter.** Never tested.
- `[L]` **`load` with `local_path = false` repos.** Should skip them. Untested.

---

## 7. Devspace Migration (`src/devspace/migration.ts`)

### Entire functions with zero tests

- `[H]` **`migrateRepo`** — Complex function with:
  - Copy vs move strategy
  - Cross-filesystem fallback (rename fails → copy + delete)
  - Target already exists check
  - Inventory append
  - Remote URL collection
  - No TOML escaping on remote URLs (line 329: `url = "${url}"`)
- `[H]` **`scanDirectory`** — Directory enumeration with:
  - Git repo detection
  - Tyvi project detection
  - Internal path skipping
  - Retained path skipping
  - Symlink entries
- `[M]` **`deleteEntry`** — Trivial but should verify.
- `[M]` **`suggestNamespace`** — SSH and HTTPS URL parsing.
  - SSH URLs with port: `git@github.com:22:org/repo.git`
  - HTTPS URLs with auth: `https://user@github.com/org/repo.git`
  - Non-standard hosts: `git@gitlab.company.com:org/repo.git`
  - No remote URL → `@default` fallback

---

## 8. Devspace State (`src/devspace/state.ts`)

### Missing tests

- `[H]` **`readLabState` with corrupt TOML.** Returns `{ repos: [] }` for non-array `repos`. But
  what about TOML parse errors (invalid syntax)?
- `[H]` **`readLabState` with malformed entries.** `repos as LabState["repos"]` cast without
  validation. Entries missing `name` or `namespace` → `undefined` fields downstream.
- `[M]` **`writeLabState` → `readLabState` round-trip.** Write state, read back, verify identical.
  Tests stringify/parse fidelity.
- `[M]` **Empty content handling.** `readLabState` handles `!content.trim()` → empty state. Never
  tested.
- `[L]` **ExtState operations.** `readExtState`/`writeExtState` have same patterns, same gaps.

---

## 9. Restrictions (`src/devspace/restrictions.ts`)

### Existing tests — mostly good

The restriction tests are the best-quality tests in the suite. They test real logic (path matching,
whitelist, root detection). Keep all of them.

### Missing tests

- `[H]` **Symlink bypass.** `resolve()` does NOT follow symlinks. If user accesses a blocked path
  via symlink, `startsWith` won't match. `checkGitAllowed` would return `allowed: true` for a path
  that should be blocked. This is a real security bypass on macOS/Linux.
- `[H]` **Case sensitivity bypass on macOS.** HFS+/APFS is case-insensitive.
  `/tmp/Devspace/.staging` and `/tmp/devspace/.staging` are the same directory, but `startsWith` is
  case-sensitive. User could bypass by using different casing.
- `[M]` **Trailing slashes.** `resolve()` strips them, so this is probably fine, but untested.
- `[M]` **Path traversal in whitelist.** `allowed_paths = [".ci"]` — does `.ci/../../.staging/repo`
  bypass? `resolve()` should canonicalize `..`, but untested.
- `[L]` **Empty path.** `checkGitAllowed(devspace, "")` → `resolve("")` = cwd. Behavior depends on
  where test runner is.
- `[L]` **`getBlockedMessage` content verification.** Tests never check the message output. It's
  purely cosmetic, but if it shows wrong paths, users get confused.

---

## 10. Relationships (`src/relationships/mod.ts`)

### Tests to prune

| Test                                                     | Why it's useless                                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `loadRelationships - parses relationship file correctly` | Pure fixture echo. Every assertion copies a value from the TOML file. Tests `@std/toml` parse, not the relationships module. |
| `loadRelationships - parses dynamic fields`              | Same pattern. `assertEquals(summary, "Strong technical collaborators...")` is copying a fixture string.                      |

### Missing tests

- `[C]` **Missing `dynamic` section crashes `listRelationships`.** Line 110: `rel.dynamic.summary` —
  if `dynamic` is undefined (perfectly valid TOML omission), this throws
  `Cannot read properties of undefined`. The type says `dynamic` is required but TOML has no
  enforcement.
- `[C]` **`stringify` round-trip corrupts file.** `addRelationshipLogEntry` reads TOML, mutates JS
  object, writes with `stringify`. Comments are destroyed, key ordering may change, formatting
  changes. No test verifies the rest of the file is intact after adding a log entry.
- `[H]` **Typo in TOML key silently drops data.** `relatioship` instead of `relationship` →
  `parsed.relationship` is `undefined` → `parsed.relationship ?? []` returns empty array. No error,
  relationships silently vanish.
- `[H]` **Invalid `with` URI format.** `with = "garbage"` or `with = "ctx://team/foo"` →
  `replace("ctx://person/", "")` returns "garbage" or "ctx://team/foo". No validation. No test.
- `[H]` **Multiple person files for `listRelationships`.** Current fixture has 1 file. The
  scan-and-aggregate across multiple files is untested.
- `[H]` **`person` filter in `listRelationships`.** Lines 74-79 accept both bare IDs and `ctx://`
  URIs. Never tested.
- `[H]` **Array-type filters.** `query.type` and `query.status` accept arrays (lines 86-87, 92-93).
  The `Array.isArray` branching is dead code from test perspective.
- `[M]` **Missing `log` section.** `loadRelationships` returns `undefined` for `rel.log`. Consumers
  accessing `.log` directly crash. `addRelationshipLogEntry` handles it (line 152-154) but load
  doesn't normalize.
- `[M]` **Invalid enum values.** `type = "best-friend"`, `status = "complicated"` — silently
  accepted.
- `[M]` **Duplicate `with` references.** Two relationships both pointing to `ctx://person/viktor`.
  `addRelationshipLogEntry` finds the first one only.
- `[M]` **Path traversal in personId.** `personId = "../../../etc/passwd"` is interpolated into a
  file path on line 35.
- `[L]` **Empty arrays.** `strengths = []`, `friction = []`. Probably fine but untested.

---

## 11. Integration Gaps (Cross-Module)

These are the most dangerous because they involve contracts between modules that no test verifies.

- `[C]` **`initDevspace` → `loadDevspace` sequence.** `initDevspace` creates empty inventory files.
  `loadDevspace` parses them. If the empty format isn't valid for parsing, the most basic user flow
  is broken.
- `[C]` **Guard layers working together.** Shell wrapper sets `TYVI_ALLOW_COMMIT`. Hook checks
  `TYVI_ALLOW_COMMIT`. direnv sets `TYVI_ROOT`. No test verifies these contracts.
- `[H]` **`writeShellInit` + `appendToRcFile` + `validateGuards`.** Setup sequence → validate. If
  setup half-fails, what does validation report?
- `[H]` **`generateShellInit` vs `generateHook` path matching disagree.** Shell wrapper checks
  against interpolated TypeScript paths; hook checks `git rev-parse --show-toplevel`. These could
  disagree (symlinks, mount points).
- `[H]` **`hasHooks()` returns true for non-tyvi hooks, but `validateGuards` treats it as "tyvi
  hooks installed".** Then `installHooks` would back up the user's hook and replace it. Semantic
  mismatch across three functions.
- `[H]` **`load` + `unload` round-trip.** Load a repo, unload it, verify state is clean and staging
  is intact. Never tested end-to-end.
- `[M]` **`writeEnvrc("parent")` destructiveness.** Writes `.envrc` to parent directory. No backup,
  no warning about existing files.

---

## Summary by Priority

| Priority | Count | Action                                          |
| -------- | ----- | ----------------------------------------------- |
| Critical | 18    | Fix immediately — these WILL cause bugs         |
| High     | 28    | Fix soon — likely to cause bugs in normal usage |
| Medium   | 22    | Fix eventually — edge cases but realistic       |
| Low      | 10    | Nice to have — defensive coverage               |
| Prune    | 9     | Remove — testing nothing meaningful             |

### Tests to write first (Critical)

1. Shell script syntax validation (`bash -n`, `fish -n` on generated scripts)
2. Shell script functional test (blocks git in blocked dir, allows in lab/root)
3. Hook functional test (blocks commit from subdirectory, allows from root)
4. `[workspace]` backward compatibility parsing
5. `initDevspace` → `loadDevspace` sequence
6. Missing `dynamic` section crash in `listRelationships`
7. `removeRepo` TOML surgery (multiple scenarios)
8. `addRepo` basic operation
9. `load` symlink target verification (`readLink`)
10. `stringify` round-trip fidelity for relationships
