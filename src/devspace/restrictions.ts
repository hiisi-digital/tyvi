/**
 * Git restriction checking for devspaces.
 *
 * Enforces git policy by checking whether git operations are allowed
 * at a given path based on devspace configuration.
 *
 * @module
 */

import { resolve } from "@std/path";
import type { Devspace, GitCheckResult } from "../types/mod.ts";

/**
 * Resolve a configured path relative to the devspace root.
 */
function resolveConfigPath(rootPath: string, configPath: string): string {
  return resolve(rootPath, configPath);
}

/**
 * Check if git operations are allowed at the given path.
 *
 * Uses the devspace's `git_policy` configuration to determine
 * whether git is allowed. All paths are resolved from config.
 *
 * @param devspace - Devspace model with config
 * @param path - Absolute path to check
 * @returns Result indicating whether git is allowed and why
 */
export function checkGitAllowed(
  devspace: Devspace,
  path: string,
): GitCheckResult {
  const policy = devspace.config.devspace.git_policy;

  // No policy or not enabled: allow everything
  if (!policy || !policy.enabled) {
    return { allowed: true, reason: "outside_project" };
  }

  const absPath = resolve(path);
  const rootPath = resolve(devspace.rootPath);

  // Check if path is outside the devspace project entirely
  if (!absPath.startsWith(rootPath + "/") && absPath !== rootPath) {
    // Also check lab path since it may be a sibling (e.g., ../.lab)
    const labPath = resolveConfigPath(
      rootPath,
      devspace.config.devspace.lab_path ?? ".lab",
    );
    if (absPath.startsWith(labPath + "/") || absPath === labPath) {
      return { allowed: true, reason: "lab" };
    }

    return { allowed: true, reason: "outside_project" };
  }

  // Check if at devspace root exactly
  if (absPath === rootPath) {
    return { allowed: true, reason: "root" };
  }

  // Check if in configured lab path
  const labPath = resolveConfigPath(
    rootPath,
    devspace.config.devspace.lab_path ?? ".lab",
  );
  if (absPath.startsWith(labPath + "/") || absPath === labPath) {
    return { allowed: true, reason: "lab" };
  }

  // Check whitelist (allowed_paths from git_policy)
  for (const allowedPath of policy.allowed_paths) {
    const resolvedAllowed = resolveConfigPath(rootPath, allowedPath);
    if (
      absPath.startsWith(resolvedAllowed + "/") || absPath === resolvedAllowed
    ) {
      return { allowed: true, reason: "whitelist" };
    }
  }

  // Blocked
  return {
    allowed: false,
    reason: "blocked",
    message: `Git operations blocked at ${absPath}`,
    suggestion: `Use 'tyvi load <repo>' to load a repo to lab, or 'cd ${labPath}' to work in lab.`,
  };
}

/**
 * Get a formatted message explaining why git is blocked.
 *
 * @param devspace - Devspace model with config
 * @param path - Path where git was attempted
 * @returns Formatted block message with alternatives
 */
export function getBlockedMessage(
  devspace: Devspace,
  path: string,
): string {
  const rootPath = resolve(devspace.rootPath);
  const labPath = resolveConfigPath(
    rootPath,
    devspace.config.devspace.lab_path ?? ".lab",
  );

  const lines = [
    "Git operations blocked here.",
    "",
    `Location: ${resolve(path)}`,
    `Tyvi root: ${rootPath}`,
    "",
    "This path is inside your tyvi project but not in an allowed area.",
    "",
    "Allowed locations:",
    `  ${rootPath}    (project root only)`,
    `  ${labPath}     (lab)`,
  ];

  // Add whitelist paths if any
  const policy = devspace.config.devspace.git_policy;
  if (policy?.allowed_paths.length) {
    for (const p of policy.allowed_paths) {
      lines.push(`  ${resolveConfigPath(rootPath, p)}    (whitelist)`);
    }
  }

  lines.push("");
  lines.push("Options:");
  lines.push("  1. Load a repo to lab:");
  lines.push("     tyvi load <pattern>");
  lines.push("");
  lines.push("  2. Work in lab directly:");
  lines.push(`     cd ${labPath}/<repo>`);

  return lines.join("\n");
}
