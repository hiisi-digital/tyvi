/**
 * Git restriction checking for devspaces.
 *
 * Implements the git guard logic that prevents accidental commits
 * in the wrong locations.
 *
 * @module
 */

import { dirname, join, resolve, SEPARATOR } from "@std/path";
import { exists } from "@std/fs";
import type { Devspace } from "../types/devspace.ts";
import type { GitCheckResult } from "../types/git.ts";

/**
 * Check if git operations are allowed at the given path.
 *
 * Returns information about whether git is allowed and why.
 *
 * @param devspace - The devspace configuration
 * @param path - The path where git operation is being attempted
 * @returns Check result with allowed status and reason
 *
 * @example
 * ```ts
 * const result = checkGitAllowed(devspace, "/home/user/.lab/myrepo");
 * if (!result.allowed) {
 *   console.error(result.message);
 *   console.log(result.suggestion);
 * }
 * ```
 */
export function checkGitAllowed(devspace: Devspace, path: string): GitCheckResult {
  // If git restrictions are disabled, allow everything
  if (devspace.config.devspace.git_policy?.enabled === false) {
    return {
      allowed: true,
      reason: "outside_project",
      message: "Git restrictions are disabled",
    };
  }

  const absolutePath = resolve(path);
  const rootPath = resolve(devspace.rootPath);

  // Check if path is outside the devspace entirely
  if (!absolutePath.startsWith(rootPath)) {
    return {
      allowed: true,
      reason: "outside_project",
      message: "Path is outside devspace - tyvi has no restrictions here",
    };
  }

  // Check if in lab (always allowed)
  if (isInLab(devspace, absolutePath)) {
    const suggestTyvi = devspace.config.devspace.git_policy?.suggestTyviGit !== false;
    return {
      allowed: true,
      reason: "lab",
      message: "Git allowed in lab",
      suggestion: suggestTyvi
        ? "Tip: Use 'tyvi commit' for better workflow integration"
        : undefined,
    };
  }

  // Check if at devspace root exactly (allowed for tyvi meta operations)
  if (absolutePath === rootPath) {
    return {
      allowed: true,
      reason: "root",
      message: "Git allowed at devspace root",
      suggestion: "This allows managing tyvi config and inventory files",
    };
  }

  // Check if in whitelist
  if (isInWhitelist(devspace, absolutePath)) {
    return {
      allowed: true,
      reason: "whitelist",
      message: "Git allowed by whitelist configuration",
    };
  }

  // Otherwise, blocked
  return {
    allowed: false,
    reason: "blocked",
    message: getBlockedMessage(devspace, absolutePath),
    suggestion: "Move repo to lab with: tyvi load <repo-name>",
  };
}

/**
 * Find the devspace root by walking up from the given path.
 *
 * Looks for tyvi.toml to identify the devspace root.
 *
 * @param from - Path to start searching from
 * @returns Path to devspace root, or null if not in a devspace
 *
 * @example
 * ```ts
 * const root = await findDevspaceRoot("/home/user/.lab/myrepo");
 * if (root) {
 *   console.log("Devspace root:", root);
 * }
 * ```
 */
export async function findDevspaceRoot(from: string): Promise<string | null> {
  let current = resolve(from);
  const root = resolve("/");

  while (current !== root) {
    const configPath = join(current, "tyvi.toml");
    if (await exists(configPath)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return null;
}

/**
 * Get a helpful message for when git is blocked.
 *
 * Provides context about why git is blocked and what to do instead.
 *
 * @param devspace - The devspace configuration
 * @param path - The path where git was blocked
 * @returns Formatted error message
 */
export function getBlockedMessage(devspace: Devspace, path: string): string {
  const rootPath = devspace.rootPath;
  const labPath = resolve(
    rootPath,
    devspace.config.devspace.lab_path || ".lab",
  );
  const stagingPath = resolve(
    rootPath,
    devspace.config.devspace.staging_path || ".staging",
  );

  const relativePath = path.replace(rootPath, "");

  let location = "unknown location";
  if (path.startsWith(stagingPath)) {
    location = "staging directory (cold storage)";
  } else if (path.startsWith(rootPath)) {
    location = "devspace managed directory";
  }

  return `Git operations blocked in ${location}

Current path: ${relativePath}
Devspace root: ${rootPath}

Git is only allowed in:
  • Lab directory: ${labPath}
  • Devspace root: ${rootPath}

Repos in staging are "cold" - not meant for direct work.
Use 'tyvi load <repo-name>' to move a repo to lab for active development.`;
}

/**
 * Check if a path is inside the configured lab directory.
 *
 * @param devspace - The devspace configuration
 * @param path - The path to check
 * @returns True if path is in lab
 */
export function isInLab(devspace: Devspace, path: string): boolean {
  const rootPath = resolve(devspace.rootPath);
  const labPath = resolve(
    rootPath,
    devspace.config.devspace.lab_path || ".lab",
  );

  const absolutePath = resolve(path);
  
  // Check exact match or subdirectory (with proper separator)
  return absolutePath === labPath || 
         absolutePath.startsWith(labPath + SEPARATOR);
}

/**
 * Check if a path is in the whitelist.
 *
 * Whitelist paths are relative to devspace root and allow git operations
 * even outside lab.
 *
 * @param devspace - The devspace configuration
 * @param path - The path to check
 * @returns True if path is in whitelist
 */
export function isInWhitelist(devspace: Devspace, path: string): boolean {
  const whitelist = devspace.config.devspace.git_policy?.allowed_paths || [];
  const rootPath = resolve(devspace.rootPath);
  const absolutePath = resolve(path);

  for (const whitelistPath of whitelist) {
    const absoluteWhitelistPath = resolve(rootPath, whitelistPath);
    // Check exact match or subdirectory (with proper separator)
    if (absolutePath === absoluteWhitelistPath || 
        absolutePath.startsWith(absoluteWhitelistPath + SEPARATOR)) {
      return true;
    }
  }

  return false;
}
