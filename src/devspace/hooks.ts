/**
 * Git hook management for devspaces.
 *
 * Installs pre-commit hooks that enforce git restrictions at the
 * git level (in addition to shell integration).
 *
 * @module
 */

import { ensureDir, exists } from "@std/fs";
import { join } from "@std/path";
import type { Devspace } from "../types/devspace.ts";

/**
 * Install git hooks in the devspace's .git/hooks/ directory.
 *
 * Creates a pre-commit hook that prevents commits outside allowed locations.
 *
 * @param devspace - The devspace configuration
 * @throws Error if .git directory doesn't exist or hook installation fails
 *
 * @example
 * ```ts
 * await installHooks(devspace);
 * console.log("Git hooks installed");
 * ```
 */
export async function installHooks(devspace: Devspace): Promise<void> {
  const gitDir = join(devspace.rootPath, ".git");

  // Check if .git directory exists
  if (!await exists(gitDir)) {
    throw new Error(
      `No .git directory found at ${devspace.rootPath}\n` +
        "Devspace root must be a git repository to install hooks.",
    );
  }

  const hooksDir = join(gitDir, "hooks");
  await ensureDir(hooksDir);

  const preCommitPath = join(hooksDir, "pre-commit");
  const hookContent = generatePreCommitHook();

  await Deno.writeTextFile(preCommitPath, hookContent);

  // Make the hook executable (Unix systems)
  if (Deno.build.os !== "windows") {
    await Deno.chmod(preCommitPath, 0o755);
  }
}

/**
 * Generate the pre-commit hook script.
 *
 * Creates a shell script that runs before each commit to check
 * if the commit is happening in an allowed location.
 *
 * @returns Shell script content for pre-commit hook
 */
export function generatePreCommitHook(): string {
  return `#!/bin/sh
# tyvi pre-commit hook
# Prevents commits in restricted locations

# Get the git toplevel directory
GIT_TOPLEVEL=$(git rev-parse --show-toplevel 2>/dev/null)
CURRENT_DIR=$(pwd)

# If we're at the git toplevel (devspace root), allow the commit
if [ "$CURRENT_DIR" = "$GIT_TOPLEVEL" ]; then
    exit 0
fi

# If TYVI_ALLOW_COMMIT is set, allow the commit (e.g., in lab)
if [ -n "$TYVI_ALLOW_COMMIT" ]; then
    exit 0
fi

# If TYVI_IN_LAB is set, allow the commit
if [ -n "$TYVI_IN_LAB" ]; then
    exit 0
fi

# Otherwise, block the commit
echo "⚠️  Commit blocked by tyvi git guard" >&2
echo "" >&2
echo "Commits are only allowed in:" >&2
echo "  • Lab directory (active repos)" >&2
echo "  • Devspace root (tyvi config)" >&2
echo "" >&2
echo "Current location: $CURRENT_DIR" >&2
echo "Git toplevel: $GIT_TOPLEVEL" >&2
echo "" >&2
echo "To work on this repo, load it to lab:" >&2
echo "  tyvi load <repo-name>" >&2
echo "" >&2
echo "To temporarily bypass (use with caution):" >&2
echo "  TYVI_ALLOW_COMMIT=1 git commit ..." >&2

exit 1
`;
}

/**
 * Check if hooks are installed.
 *
 * Verifies that the pre-commit hook exists in the devspace.
 *
 * @param devspace - The devspace configuration
 * @returns True if pre-commit hook is installed
 *
 * @example
 * ```ts
 * if (await hasHooks(devspace)) {
 *   console.log("Hooks are installed");
 * } else {
 *   console.log("Run 'tyvi init' to install hooks");
 * }
 * ```
 */
export async function hasHooks(devspace: Devspace): Promise<boolean> {
  const preCommitPath = join(devspace.rootPath, ".git", "hooks", "pre-commit");
  return await exists(preCommitPath);
}
