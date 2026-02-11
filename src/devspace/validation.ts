/**
 * Guard validation for devspaces.
 *
 * Checks that all git guard layers are properly installed:
 * shell integration, direnv (if available), git hooks, and config.
 *
 * @module
 */

import { exists } from "@std/fs";
import { join, resolve } from "@std/path";
import type { Devspace, ValidationIssue, ValidationResult } from "../types/mod.ts";
import { hasHooks } from "./hooks.ts";
import { hasDirenv } from "./direnv.ts";
import { detectShell } from "./shell.ts";

/**
 * Validate that all devspace guards are properly installed.
 *
 * Checks:
 * 1. tyvi.toml exists and has git policy
 * 2. Shell init script exists
 * 3. RC file sources the init script
 * 4. direnv .envrc files exist (if direnv available)
 * 5. Git hooks installed
 * 6. Lab and staging directories exist
 *
 * @param devspace - Devspace configuration
 * @returns Validation result with issues
 */
export async function validateGuards(
  devspace: Devspace,
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const rootPath = resolve(devspace.rootPath);

  // 1. Config validation
  const policy = devspace.config.devspace.git_policy;
  if (!policy) {
    issues.push({
      type: "config",
      severity: "warning",
      message: "No git_policy section in tyvi.toml",
      fix: "Add [devspace.git_policy] with enabled = true",
    });
  } else if (!policy.enabled) {
    issues.push({
      type: "config",
      severity: "warning",
      message: "Git policy is disabled",
      fix: "Set git_policy.enabled = true in tyvi.toml",
    });
  }

  // 2. Shell init script
  const shellInitSh = join(rootPath, "shell", "init.sh");
  const shellInitFish = join(rootPath, "shell", "init.fish");
  const hasShellInit = await exists(shellInitSh) || await exists(shellInitFish);

  if (!hasShellInit) {
    issues.push({
      type: "shell",
      severity: "error",
      message: "Shell init script not found",
      fix: "Run 'tyvi guards setup' to generate shell integration",
    });
  }

  // 3. RC file check
  const shellInfo = await detectShell();
  if (shellInfo.rcFile && hasShellInit) {
    if (await exists(shellInfo.rcFile)) {
      const rcContent = await Deno.readTextFile(shellInfo.rcFile);
      const initPath = shellInfo.shell === "fish" ? shellInitFish : shellInitSh;
      if (!rcContent.includes(initPath) && !rcContent.includes("tyvi")) {
        issues.push({
          type: "shell",
          severity: "warning",
          message: `Shell init not sourced in ${shellInfo.rcFile}`,
          fix: `Add 'source "${initPath}"' to ${shellInfo.rcFile}`,
        });
      }
    }
  }

  // 4. direnv check
  const direnvAvailable = await hasDirenv();
  if (direnvAvailable) {
    const rootEnvrc = join(rootPath, ".envrc");
    if (!await exists(rootEnvrc)) {
      issues.push({
        type: "direnv",
        severity: "warning",
        message: "No .envrc in devspace root (direnv is available)",
        fix: "Run 'tyvi guards setup' to create .envrc files",
      });
    }

    const labPath = resolve(
      rootPath,
      devspace.config.devspace.lab_path ?? ".lab",
    );
    const labEnvrc = join(labPath, ".envrc");
    if (!await exists(labEnvrc)) {
      issues.push({
        type: "direnv",
        severity: "warning",
        message: "No .envrc in lab directory",
        fix: "Run 'tyvi guards setup' to create .envrc files",
      });
    }
  }

  // 5. Git hooks
  const hooksInstalled = await hasHooks(devspace);
  if (!hooksInstalled) {
    issues.push({
      type: "hooks",
      severity: "warning",
      message: "Git pre-commit hook not installed",
      fix: "Run 'tyvi guards setup' to install hooks",
    });
  }

  // 6. Directory structure
  const labPath = resolve(
    rootPath,
    devspace.config.devspace.lab_path ?? ".lab",
  );
  if (!await exists(labPath)) {
    issues.push({
      type: "config",
      severity: "error",
      message: `Lab directory does not exist: ${labPath}`,
      fix: `Create the lab directory: mkdir -p ${labPath}`,
    });
  }

  const stagingPath = resolve(
    rootPath,
    devspace.config.devspace.staging_path ?? ".staging",
  );
  if (!await exists(stagingPath)) {
    issues.push({
      type: "config",
      severity: "error",
      message: `Staging directory does not exist: ${stagingPath}`,
      fix: `Create the staging directory: mkdir -p ${stagingPath}`,
    });
  }

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
  };
}
