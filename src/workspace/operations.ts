/**
 * Workspace operations for repository management.
 * @module
 */

import { join } from "@std/path";
import { exists } from "@std/fs";
import type { CloneStatus, RepoWithStatus, Workspace } from "../types.ts";
import {
  getAheadBehind,
  getCurrentBranch,
  getGitStatus,
  getLastCommitDate,
  isGitRepo,
} from "../git/mod.ts";
import { cloneRepo, cloneRepoWithProgress } from "../git/mod.ts";

/**
 * Get status of all repositories in workspace.
 *
 * @param workspace - Workspace model
 * @returns Array of repositories with status information
 *
 * @example
 * ```ts
 * const workspace = await loadWorkspace(".");
 * const status = await getStatus(workspace);
 * for (const repo of status) {
 *   console.log(`${repo.name}: ${repo.cloneStatus} ${repo.gitStatus}`);
 * }
 * ```
 */
export async function getStatus(workspace: Workspace): Promise<RepoWithStatus[]> {
  const repos: RepoWithStatus[] = [];

  for (const [namespace, inventory] of workspace.namespaces) {
    for (const repo of inventory.repos) {
      // Skip repos with local_path = false
      if (repo.local_path === false) {
        continue;
      }

      const localPath = repo.local_path || repo.name;
      const absolutePath = join(workspace.rootPath, namespace, localPath);

      let cloneStatus: CloneStatus;
      const repoExists = await exists(absolutePath);

      if (!repoExists) {
        cloneStatus = "missing";
      } else {
        const isGit = await isGitRepo(absolutePath);
        cloneStatus = isGit ? "cloned" : "partial";
      }

      const repoWithStatus: RepoWithStatus = {
        ...repo,
        namespace,
        cloneStatus,
        absolutePath,
      };

      // Get git status for cloned repos
      if (cloneStatus === "cloned") {
        repoWithStatus.gitStatus = await getGitStatus(absolutePath);
        repoWithStatus.currentBranch = await getCurrentBranch(absolutePath) || undefined;
        repoWithStatus.lastActivity = await getLastCommitDate(absolutePath) || undefined;

        const aheadBehind = await getAheadBehind(absolutePath);
        if (aheadBehind) {
          repoWithStatus.ahead = aheadBehind.ahead;
          repoWithStatus.behind = aheadBehind.behind;
        }
      }

      repos.push(repoWithStatus);
    }
  }

  return repos;
}

/**
 * Clone repositories matching criteria.
 *
 * @param workspace - Workspace model
 * @param options - Clone options
 * @returns Result with cloned and skipped repositories
 *
 * @example
 * ```ts
 * const result = await clone(workspace, { pattern: "viola", showProgress: true });
 * console.log(`Cloned ${result.cloned.length} repos`);
 * ```
 */
export async function clone(
  workspace: Workspace,
  options: {
    pattern?: string;
    namespace?: string;
    category?: string;
    status?: string;
    all?: boolean;
    showProgress?: boolean;
  } = {},
): Promise<{ cloned: string[]; skipped: string[]; failed: string[] }> {
  const cloned: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  const repos = await getStatus(workspace);

  for (const repo of repos) {
    // Skip already cloned repos
    if (repo.cloneStatus === "cloned") {
      skipped.push(repo.name);
      continue;
    }

    // Apply filters
    if (options.namespace && repo.namespace !== options.namespace) {
      continue;
    }

    if (options.category && repo.category !== options.category) {
      continue;
    }

    if (options.status && repo.status !== options.status) {
      continue;
    }

    if (options.pattern && !repo.name.includes(options.pattern)) {
      continue;
    }

    if (!options.all && !options.pattern && !options.namespace && !options.category) {
      // No filter specified, skip
      continue;
    }

    // Clone the repository
    const originRemote = repo.remotes.find((r) => r.name === "origin") || repo.remotes[0];
    if (!originRemote) {
      failed.push(repo.name);
      continue;
    }

    const cloneFn = options.showProgress ? cloneRepoWithProgress : cloneRepo;
    const success = await cloneFn(originRemote.url, repo.absolutePath!);

    if (success) {
      cloned.push(repo.name);
    } else {
      failed.push(repo.name);
    }
  }

  return { cloned, skipped, failed };
}

/**
 * Synchronize workspace structure with inventory definitions.
 *
 * @param workspace - Workspace model
 * @param options - Sync options
 * @returns Result with created directories and orphaned repos
 */
export async function sync(
  workspace: Workspace,
  options: {
    fetch?: boolean;
    prune?: boolean;
    dryRun?: boolean;
  } = {},
): Promise<{
  created: string[];
  orphaned: string[];
  fetched: string[];
}> {
  const created: string[] = [];
  const orphaned: string[] = [];
  const fetched: string[] = [];

  // Create missing directories for namespace inventories
  for (const [namespace] of workspace.namespaces) {
    const namespacePath = join(workspace.rootPath, namespace);
    if (!await exists(namespacePath)) {
      if (!options.dryRun) {
        await Deno.mkdir(namespacePath, { recursive: true });
      }
      created.push(namespace);
    }
  }

  // Fetch remotes if requested
  if (options.fetch) {
    const repos = await getStatus(workspace);
    for (const repo of repos) {
      if (repo.cloneStatus === "cloned" && repo.keep_in_sync) {
        const { fetchAllRemotes } = await import("../git/mod.ts");
        const success = await fetchAllRemotes(repo.absolutePath!);
        if (success) {
          fetched.push(repo.name);
        }
      }
    }
  }

  return { created, orphaned, fetched };
}

/**
 * Escape a string for safe use in TOML.
 */
function escapeTOMLString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

/**
 * Validate repository name for TOML safety.
 */
function validateRepoName(name: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(
      `Invalid repository name: '${name}'.\n` +
        "Repository names must contain only letters, numbers, hyphens, and underscores.",
    );
  }
}

/**
 * Ensure content ends with a newline and append new content.
 */
function appendToInventory(content: string, newContent: string): string {
  const contentWithNewline = content.endsWith("\n") ? content : content + "\n";
  return contentWithNewline + newContent;
}

/**
 * Add a repository to inventory.
 *
 * @param workspace - Workspace model
 * @param url - Git repository URL
 * @param options - Repository options
 */
export async function addRepo(
  workspace: Workspace,
  url: string,
  options: {
    namespace?: string;
    name?: string;
    category?: string;
    localPath?: string;
  } = {},
): Promise<void> {
  // Extract repo name from URL if not provided
  const repoName = options.name || url.split("/").pop()?.replace(/\.git$/, "") || "repo";

  // Validate repo name for TOML safety
  validateRepoName(repoName);

  const namespace = options.namespace || workspace.config.workspace.namespaces.default;
  const inventoryPath = join(workspace.rootPath, namespace, "inventory.toml");

  // Read existing inventory
  const content = await Deno.readTextFile(inventoryPath);

  // Escape values for TOML
  const escapedName = escapeTOMLString(repoName);
  const escapedUrl = escapeTOMLString(url);

  // Build new repo entry
  const newEntry = `\n[[repos]]\nname = "${escapedName}"\nremotes = [{ name = "origin", url = "${escapedUrl}" }]\n`;

  if (options.category) {
    const localPath = options.localPath || `${options.category}/${repoName}`;
    const escapedLocalPath = escapeTOMLString(localPath);
    const escapedCategory = escapeTOMLString(options.category);
    const fullEntry = newEntry + `local_path = "${escapedLocalPath}"\ncategory = "${escapedCategory}"\n`;
    await Deno.writeTextFile(inventoryPath, appendToInventory(content, fullEntry));
  } else {
    await Deno.writeTextFile(inventoryPath, appendToInventory(content, newEntry));
  }
}

/**
 * Remove a repository from inventory.
 *
 * @param workspace - Workspace model
 * @param repoName - Repository name to remove
 * @param options - Remove options
 */
export async function removeRepo(
  workspace: Workspace,
  repoName: string,
  options: {
    deleteFiles?: boolean;
  } = {},
): Promise<boolean> {
  // Find the repo
  for (const [namespace, inventory] of workspace.namespaces) {
    const repoIndex = inventory.repos.findIndex((r) => r.name === repoName);
    if (repoIndex === -1) continue;

    const repo = inventory.repos[repoIndex];

    // Delete files if requested
    if (options.deleteFiles && repo.local_path !== false) {
      const localPath = repo.local_path || repo.name;
      const absolutePath = join(workspace.rootPath, namespace, localPath);

      if (await exists(absolutePath)) {
        await Deno.remove(absolutePath, { recursive: true });
      }
    }

    // Remove from inventory.toml
    // Note: This is a simple text-based removal. The repo name validation
    // ensures names contain only safe characters (alphanumeric, hyphens, underscores),
    // so we can safely use string matching without worrying about escaped quotes.
    const inventoryPath = join(workspace.rootPath, namespace, "inventory.toml");
    const content = await Deno.readTextFile(inventoryPath);

    // Simple removal - find the [[repos]] section for this repo and remove it
    // This is a simplified approach; a full TOML editor would be better
    const lines = content.split("\n");
    const newLines: string[] = [];
    let inRepoSection = false;
    let currentRepoName = "";

    for (const line of lines) {
      if (line.trim().startsWith("[[repos]]")) {
        inRepoSection = true;
        currentRepoName = "";
      } else if (line.trim().startsWith("name =") && inRepoSection) {
        const match = line.match(/name\s*=\s*"([^"]+)"/);
        if (match) {
          currentRepoName = match[1] || "";
        }
      } else if (line.trim().startsWith("[[") || line.trim().startsWith("[meta")) {
        inRepoSection = false;
      }

      if (currentRepoName === repoName && inRepoSection) {
        // Skip this line (part of the repo we're removing)
        continue;
      } else {
        newLines.push(line);
      }
    }

    await Deno.writeTextFile(inventoryPath, newLines.join("\n"));
    return true;
  }

  return false;
}
