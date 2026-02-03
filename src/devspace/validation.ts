/**
 * Validation of git guards and devspace setup.
 *
 * Checks that all git restrictions are properly installed and configured.
 *
 * @module
 */

import { exists } from "@std/fs";
import { join } from "@std/path";
import type { Devspace } from "../types/devspace.ts";
import type { ValidationIssue, ValidationResult } from "../types/git.ts";
import { hasHooks } from "./hooks.ts";
import { hasDirenv } from "./shell.ts";

/**
 * Validate that all git guards are properly installed.
 *
 * Performs a comprehensive check of the devspace setup:
 * - Configuration is valid
 * - Required directories exist
 * - Git hooks are installed
 * - Shell integration is available (warning only)
 * - direnv configuration is present (warning if direnv installed)
 *
 * @param devspace - The devspace configuration
 * @returns Validation result with any issues found
 *
 * @example
 * ```ts
 * const result = await validateGuards(devspace);
 * if (!result.valid) {
 *   console.error("Validation failed:");
 *   for (const issue of result.issues) {
 *     console.error(`  [${issue.severity}] ${issue.message}`);
 *   }
 * }
 * ```
 */
export async function validateGuards(devspace: Devspace): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  // 1. Check tyvi.toml has git policy section
  if (!devspace.config.devspace.git_policy) {
    issues.push({
      type: "config",
      severity: "warning",
      message: "No [devspace.git_policy] section in tyvi.toml",
      fix: "Add [devspace.git_policy] section with enabled = true",
    });
  } else if (devspace.config.devspace.git_policy.enabled === false) {
    issues.push({
      type: "config",
      severity: "warning",
      message: "Git restrictions are disabled in configuration",
      fix: "Set git_policy.enabled = true in tyvi.toml to enable restrictions",
    });
  }

  // 2. Check lab directory exists
  const labPath = join(
    devspace.rootPath,
    devspace.config.devspace.lab_path || ".lab",
  );
  if (!await exists(labPath)) {
    issues.push({
      type: "paths",
      severity: "error",
      message: `Lab directory does not exist: ${labPath}`,
      fix: `Create directory: mkdir -p ${labPath}`,
    });
  }

  // 3. Check staging directory exists
  const stagingPath = join(
    devspace.rootPath,
    devspace.config.devspace.staging_path || ".staging",
  );
  if (!await exists(stagingPath)) {
    issues.push({
      type: "paths",
      severity: "error",
      message: `Staging directory does not exist: ${stagingPath}`,
      fix: `Create directory: mkdir -p ${stagingPath}`,
    });
  }

  // 4. Check git hooks installed
  if (!await hasHooks(devspace)) {
    issues.push({
      type: "hooks",
      severity: "error",
      message: "Git pre-commit hook not installed",
      fix: "Run 'tyvi init --install-hooks' to install git hooks",
    });
  }

  // 5. Check shell init script exists (warning only)
  const shellInitPath = join(devspace.rootPath, ".tyvi-git.sh");
  if (!await exists(shellInitPath)) {
    issues.push({
      type: "shell",
      severity: "warning",
      message: "Shell init script not found",
      fix: "Run 'tyvi init --install-shell-integration' to create shell integration",
    });
  }

  // 6. Check direnv .envrc if direnv is available
  const direnvAvailable = await hasDirenv();
  if (direnvAvailable) {
    const envrcPath = join(devspace.rootPath, ".envrc");
    if (!await exists(envrcPath)) {
      issues.push({
        type: "direnv",
        severity: "warning",
        message: "direnv is installed but .envrc not found at devspace root",
        fix: "Run 'tyvi init --install-direnv' to create .envrc files",
      });
    }

    const labEnvrcPath = join(labPath, ".envrc");
    if (!await exists(labEnvrcPath)) {
      issues.push({
        type: "direnv",
        severity: "warning",
        message: "direnv is installed but .envrc not found in lab",
        fix: "Run 'tyvi init --install-direnv' to create .envrc files",
      });
    }
  }

  // 7. Check .git directory exists
  const gitDir = join(devspace.rootPath, ".git");
  if (!await exists(gitDir)) {
    issues.push({
      type: "config",
      severity: "error",
      message: "Devspace root is not a git repository",
      fix: `Run 'git init' in ${devspace.rootPath}`,
    });
  }

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
  };
}
