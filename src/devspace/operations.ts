/**
 * Devspace operations for repository management.
 * @module
 */

import { ensureDir, exists } from "@std/fs";
import { join, resolve } from "@std/path";
import {
  cloneRepo,
  cloneRepoWithProgress,
  getAheadBehind,
  getCurrentBranch,
  getGitStatus,
  getLastCommitDate,
  hasUncommittedChanges,
  isGitRepo,
} from "../git/mod.ts";
import type {
  CloneStatus,
  Devspace,
  LoadResult,
  RepoListing,
  RepoWithStatus,
  UnloadResult,
} from "../types/mod.ts";
import { readLabState, writeLabState } from "./state.ts";

/**
 * Get status of all repositories in devspace.
 *
 * @param devspace - Devspace model
 * @returns Array of repositories with status information
 *
 * @example
 * ```ts
 * const devspace = await loadDevspace(".");
 * const status = await getStatus(devspace);
 * for (const repo of status) {
 *   console.log(`${repo.name}: ${repo.cloneStatus} ${repo.gitStatus}`);
 * }
 * ```
 */
export async function getStatus(devspace: Devspace): Promise<RepoWithStatus[]> {
  const repos: RepoWithStatus[] = [];

  for (const [namespace, inventory] of devspace.namespaces) {
    for (const repo of inventory.repos) {
      // Skip repos with local_path = false
      if (repo.local_path === false) {
        continue;
      }

      const localPath = repo.local_path || repo.name;
      const absolutePath = join(devspace.rootPath, namespace, localPath);

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
 * List all repositories in the devspace without checking git status.
 *
 * Faster than `getStatus()` — only checks whether repos exist on disk
 * and whether they're loaded to lab. No git operations are performed.
 *
 * @param devspace - Devspace model
 * @returns Array of lightweight repo listings
 *
 * @example
 * ```ts
 * const repos = await listRepos(devspace);
 * for (const repo of repos) {
 *   console.log(`${repo.namespace}/${repo.name} ${repo.loaded ? "(loaded)" : ""}`);
 * }
 * ```
 */
export async function listRepos(devspace: Devspace): Promise<RepoListing[]> {
  const repos: RepoListing[] = [];

  const labState = await readLabState(devspace);
  const loadedNames = new Set(labState.repos.map((r) => r.name));

  const stagingBase = resolve(
    devspace.rootPath,
    devspace.config.devspace.staging_path ?? ".staging",
  );

  for (const [namespace, inventory] of devspace.namespaces) {
    for (const repo of inventory.repos) {
      if (repo.local_path === false) continue;

      const localPath = repo.local_path || repo.name;
      const stagingPath = join(stagingBase, namespace, localPath);

      let cloneStatus: CloneStatus;
      if (await exists(stagingPath)) {
        cloneStatus = await isGitRepo(stagingPath) ? "cloned" : "partial";
      } else {
        cloneStatus = "missing";
      }

      repos.push({
        name: repo.name,
        namespace,
        description: repo.description,
        category: repo.category,
        status: repo.status,
        cloneStatus,
        loaded: loadedNames.has(repo.name),
      });
    }
  }

  return repos;
}

/**
 * Clone repositories matching criteria.
 *
 * @param devspace - Devspace model
 * @param options - Clone options
 * @returns Result with cloned and skipped repositories
 *
 * @example
 * ```ts
 * const result = await clone(devspace, { pattern: "viola", showProgress: true });
 * console.log(`Cloned ${result.cloned.length} repos`);
 * ```
 */
export async function clone(
  devspace: Devspace,
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

  const repos = await getStatus(devspace);

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
 * Synchronize devspace structure with inventory definitions.
 *
 * @param devspace - Devspace model
 * @param options - Sync options
 * @returns Result with created directories and orphaned repos
 */
export async function sync(
  devspace: Devspace,
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
  for (const [namespace] of devspace.namespaces) {
    const namespacePath = join(devspace.rootPath, namespace);
    if (!await exists(namespacePath)) {
      if (!options.dryRun) {
        await Deno.mkdir(namespacePath, { recursive: true });
      }
      created.push(namespace);
    }
  }

  // Fetch remotes if requested
  if (options.fetch) {
    const repos = await getStatus(devspace);
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
 * @param devspace - Devspace model
 * @param url - Git repository URL
 * @param options - Repository options
 */
export async function addRepo(
  devspace: Devspace,
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

  const namespace = options.namespace || devspace.config.devspace.namespaces?.default || "@default";
  const inventoryPath = join(devspace.rootPath, namespace, "inventory.toml");

  // Read existing inventory
  const content = await Deno.readTextFile(inventoryPath);

  // Escape values for TOML
  const escapedName = escapeTOMLString(repoName);
  const escapedUrl = escapeTOMLString(url);

  // Build new repo entry
  const newEntry =
    `\n[[repos]]\nname = "${escapedName}"\nremotes = [{ name = "origin", url = "${escapedUrl}" }]\n`;

  if (options.category) {
    const localPath = options.localPath || `${options.category}/${repoName}`;
    const escapedLocalPath = escapeTOMLString(localPath);
    const escapedCategory = escapeTOMLString(options.category);
    const fullEntry = newEntry +
      `local_path = "${escapedLocalPath}"\ncategory = "${escapedCategory}"\n`;
    await Deno.writeTextFile(inventoryPath, appendToInventory(content, fullEntry));
  } else {
    await Deno.writeTextFile(inventoryPath, appendToInventory(content, newEntry));
  }
}

/**
 * Remove a repository from inventory.
 *
 * @param devspace - Devspace model
 * @param repoName - Repository name to remove
 * @param options - Remove options
 */
export async function removeRepo(
  devspace: Devspace,
  repoName: string,
  options: {
    deleteFiles?: boolean;
  } = {},
): Promise<boolean> {
  // Find the repo
  for (const [namespace, inventory] of devspace.namespaces) {
    const repoIndex = inventory.repos.findIndex((r) => r.name === repoName);
    if (repoIndex === -1) continue;

    const repo = inventory.repos[repoIndex];
    if (!repo) continue; // Type guard for TypeScript

    // Delete files if requested
    if (options.deleteFiles && repo.local_path !== false) {
      const localPath = repo.local_path || repo.name;
      const absolutePath = join(devspace.rootPath, namespace, localPath);

      if (await exists(absolutePath)) {
        await Deno.remove(absolutePath, { recursive: true });
      }
    }

    // Remove from inventory.toml
    // Note: This is a simple text-based removal. The repo name validation
    // ensures names contain only safe characters (alphanumeric, hyphens, underscores),
    // so we can safely use string matching without worrying about escaped quotes.
    const inventoryPath = join(devspace.rootPath, namespace, "inventory.toml");
    const content = await Deno.readTextFile(inventoryPath);

    // Remove the [[repos]] section for the target repo.
    // Buffer lines while inside a [[repos]] section until the name is known,
    // then either flush (keep) or discard (remove) the buffered lines.
    const lines = content.split("\n");
    const newLines: string[] = [];
    let inRepoSection = false;
    let currentRepoName = "";
    let sectionBuffer: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith("[[repos]]")) {
        // Flush any previous section buffer (it wasn't the target)
        if (sectionBuffer.length > 0 && currentRepoName !== repoName) {
          newLines.push(...sectionBuffer);
        }
        // Start buffering a new section
        inRepoSection = true;
        currentRepoName = "";
        sectionBuffer = [line];
        continue;
      }

      if (inRepoSection) {
        if (line.trim().startsWith("name =")) {
          const match = line.match(/name\s*=\s*"([^"]+)"/);
          if (match) {
            currentRepoName = match[1] || "";
          }
        }

        // Check if this line starts a new non-repo section
        if (
          (line.trim().startsWith("[[") && !line.trim().startsWith("[[repos]]")) ||
          line.trim().startsWith("[meta")
        ) {
          // Flush buffer if not the target repo
          if (currentRepoName !== repoName) {
            newLines.push(...sectionBuffer);
          }
          inRepoSection = false;
          currentRepoName = "";
          sectionBuffer = [];
          newLines.push(line);
          continue;
        }

        sectionBuffer.push(line);
      } else {
        newLines.push(line);
      }
    }

    // Flush any remaining section buffer
    if (sectionBuffer.length > 0 && currentRepoName !== repoName) {
      newLines.push(...sectionBuffer);
    }

    await Deno.writeTextFile(inventoryPath, newLines.join("\n"));
    return true;
  }

  return false;
}

/**
 * Load repositories from staging to lab by creating symlinks.
 *
 * Repos are symlinked from their staging location (organized by namespace)
 * to the lab directory (flat structure) for active work.
 *
 * All paths are resolved from devspace config (`staging_path`, `lab_path`).
 *
 * @param devspace - Devspace model
 * @param options - Load options (pattern, namespace, or all)
 * @returns Result with loaded, already loaded, and failed repos
 *
 * @example
 * ```ts
 * const result = await load(devspace, { pattern: "viola" });
 * console.log(`Loaded ${result.loaded.length} repos to ${result.labPath}`);
 * ```
 */
export async function load(
  devspace: Devspace,
  options: {
    pattern?: string;
    namespace?: string;
    all?: boolean;
  } = {},
): Promise<LoadResult> {
  const loaded: string[] = [];
  const alreadyLoaded: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];

  const labState = await readLabState(devspace);
  const loadedNames = new Set(labState.repos.map((r) => r.name));

  const stagingBase = resolve(
    devspace.rootPath,
    devspace.config.devspace.staging_path ?? ".staging",
  );
  const labBase = resolve(
    devspace.rootPath,
    devspace.config.devspace.lab_path ?? ".lab",
  );

  for (const [namespace, inventory] of devspace.namespaces) {
    for (const repo of inventory.repos) {
      // Skip repos with local_path = false
      if (repo.local_path === false) continue;

      // Apply filters
      if (options.namespace && namespace !== options.namespace) continue;
      if (options.pattern && !repo.name.includes(options.pattern)) continue;
      if (!options.all && !options.pattern && !options.namespace) continue;

      // Already loaded?
      if (loadedNames.has(repo.name)) {
        alreadyLoaded.push(repo.name);
        continue;
      }

      const localPath = repo.local_path || repo.name;
      const stagingPath = join(stagingBase, namespace, localPath);
      const labPath = join(labBase, repo.name);

      // Check staging path exists
      if (!await exists(stagingPath)) {
        failed.push({
          name: repo.name,
          error: "not cloned in staging; run 'tyvi clone' first",
        });
        continue;
      }

      // Check for name collision in lab
      if (await exists(labPath)) {
        failed.push({
          name: repo.name,
          error: `path already exists at ${labPath}`,
        });
        continue;
      }

      // Create lab directory and symlink
      try {
        await ensureDir(labBase);
        await Deno.symlink(stagingPath, labPath);

        labState.repos.push({
          name: repo.name,
          namespace,
          loaded_at: new Date().toISOString(),
          staging_path: join(namespace, localPath),
        });
        loaded.push(repo.name);
      } catch (err) {
        failed.push({
          name: repo.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Write updated state
  if (loaded.length > 0) {
    await writeLabState(devspace, labState);
  }

  return { loaded, alreadyLoaded, failed, labPath: labBase };
}

/**
 * Unload repositories from lab back to staging.
 *
 * For symlinked repos, the symlink is removed (the repo stays in staging).
 * For moved repos (non-symlink), git status is checked first:
 * refuses if dirty or has unpushed commits unless `force` is set.
 *
 * All paths are resolved from devspace config.
 *
 * @param devspace - Devspace model
 * @param options - Unload options (pattern, all, force)
 * @returns Result with unloaded and refused repos
 *
 * @example
 * ```ts
 * const result = await unload(devspace, { pattern: "viola" });
 * console.log(`Unloaded ${result.unloaded.length} repos`);
 * ```
 */
export async function unload(
  devspace: Devspace,
  options: {
    pattern?: string;
    all?: boolean;
    force?: boolean;
  } = {},
): Promise<UnloadResult> {
  const unloaded: string[] = [];
  const refused: Array<{ name: string; reason: string }> = [];

  const labState = await readLabState(devspace);
  const labBase = resolve(
    devspace.rootPath,
    devspace.config.devspace.lab_path ?? ".lab",
  );

  const remaining = [...labState.repos];
  const toRemove: string[] = [];

  for (const entry of remaining) {
    // Apply filters
    if (options.pattern && !entry.name.includes(options.pattern)) continue;
    if (!options.all && !options.pattern) continue;

    const labPath = join(labBase, entry.name);

    // If lab path doesn't exist, clean up stale state entry
    if (!await exists(labPath)) {
      toRemove.push(entry.name);
      unloaded.push(entry.name);
      continue;
    }

    // Check if it's a symlink
    try {
      const stat = await Deno.lstat(labPath);

      if (stat.isSymlink) {
        // Symlink: just remove it, repo stays in staging
        await Deno.remove(labPath);
        toRemove.push(entry.name);
        unloaded.push(entry.name);
      } else {
        // Real directory: check git status before moving back
        if (!options.force) {
          const dirty = await hasUncommittedChanges(labPath);
          if (dirty) {
            refused.push({
              name: entry.name,
              reason: "has uncommitted changes",
            });
            continue;
          }

          const aheadBehind = await getAheadBehind(labPath);
          if (aheadBehind && aheadBehind.ahead > 0) {
            refused.push({
              name: entry.name,
              reason: "has unpushed commits",
            });
            continue;
          }
        }

        // Move back to staging
        const stagingPath = join(
          resolve(devspace.rootPath),
          entry.staging_path,
        );
        await ensureDir(resolve(stagingPath, ".."));
        await Deno.rename(labPath, stagingPath);
        toRemove.push(entry.name);
        unloaded.push(entry.name);
      }
    } catch (err) {
      refused.push({
        name: entry.name,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Update state: remove unloaded entries
  if (toRemove.length > 0) {
    const removeSet = new Set(toRemove);
    labState.repos = labState.repos.filter((r) => !removeSet.has(r.name));
    await writeLabState(devspace, labState);
  }

  return { unloaded, refused };
}
