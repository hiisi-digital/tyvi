/**
 * Devspace migration operations.
 *
 * Scans ad-hoc directories for git repos and other entries, then migrates
 * them into the tyvi devspace structure (staging + inventory).
 *
 * The library provides building blocks; interactive prompting is the CLI's job.
 *
 * @module
 */

import { ensureDir, exists } from "@std/fs";
import { basename, join, resolve } from "@std/path";
import {
  getCurrentBranch,
  getGitStatus,
  getLastCommitDate,
  getRemotes,
  getRemoteUrl,
  isGitRepo,
} from "../git/mod.ts";
import type {
  Devspace,
  DiscoveredEntry,
  MigrateEntryResult,
  MigrateRepoOptions,
  RemoteDefinition,
  ScanResult,
} from "../types/mod.ts";

/**
 * Suggest a namespace from a git remote URL.
 *
 * Extracts the org/user segment from SSH or HTTPS URLs and prefixes with `@`.
 *
 * @param remoteUrl - Git remote URL
 * @returns Suggested namespace (e.g., "@orgrinrt"), or "@default" as fallback
 *
 * @example
 * ```ts
 * suggestNamespace("git@github.com:hiisi-platform/tyvi.git"); // "@hiisi-platform"
 * suggestNamespace("https://github.com/orgrinrt/nutshell.git"); // "@orgrinrt"
 * ```
 */
export function suggestNamespace(remoteUrl: string): string {
  // SSH: git@github.com:org/repo.git
  const sshMatch = remoteUrl.match(/:([^/]+)\//);
  if (sshMatch?.[1]) {
    return `@${sshMatch[1]}`;
  }

  // HTTPS: https://github.com/org/repo.git
  const httpsMatch = remoteUrl.match(/(?:https?:\/\/[^/]+)\/([^/]+)\//);
  if (httpsMatch?.[1]) {
    return `@${httpsMatch[1]}`;
  }

  return "@default";
}

/**
 * Get the set of path names that are tyvi-internal for a devspace.
 *
 * These are auto-skipped during migration scanning.
 */
function getTyviInternalNames(devspace?: Devspace): Set<string> {
  const names = new Set<string>();

  // Always skip tyvi.toml
  names.add("tyvi.toml");

  if (!devspace) return names;

  const config = devspace.config.devspace;

  // Config-driven paths (basename only for top-level matching)
  for (
    const p of [
      config.staging_path ?? ".staging",
      config.lab_path ?? ".lab",
      config.state_path ?? ".state",
      config.tmp_path ?? ".tmp",
      config.ext_path ?? ".tmp/ext",
    ]
  ) {
    // Take the first path segment (for paths like "../.lab" we skip)
    const first = p.split("/").filter((s) => s && s !== "..")[0];
    if (first) names.add(first);
  }

  // Namespace directories
  for (const ns of config.namespaces?.paths ?? []) {
    names.add(ns);
  }

  return names;
}

/**
 * Check if a directory contains a tyvi.toml (i.e., is itself a tyvi project).
 */
async function isTyviProject(dirPath: string): Promise<boolean> {
  return await exists(join(dirPath, "tyvi.toml"));
}

/**
 * Collect git metadata for a repository path.
 */
async function collectGitMetadata(repoPath: string): Promise<
  DiscoveredEntry["git"]
> {
  const remoteNames = await getRemotes(repoPath);
  const remotes: RemoteDefinition[] = [];

  for (const name of remoteNames) {
    const url = await getRemoteUrl(repoPath, name);
    if (url) {
      remotes.push({ name, url });
    }
  }

  const originUrl = remotes.find((r) => r.name === "origin")?.url;

  return {
    remotes,
    currentBranch: await getCurrentBranch(repoPath) ?? undefined,
    gitStatus: await getGitStatus(repoPath),
    lastActivity: await getLastCommitDate(repoPath) ?? undefined,
    suggestedNamespace: originUrl ? suggestNamespace(originUrl) : undefined,
  };
}

/**
 * Scan a directory for entries that can be migrated.
 *
 * Enumerates all top-level entries in `sourcePath`, classifying each as a
 * git repo, plain directory, file, or tyvi project. Tyvi-internal paths
 * and retained paths are separated into `autoSkipped`; everything else
 * goes into `actionable`.
 *
 * Directories containing `tyvi.toml` are classified as `"tyvi-project"` —
 * the CLI should prompt to skip or merge these.
 *
 * @param sourcePath - Directory to scan
 * @param devspace - Optional devspace for detecting internal paths and retained_paths
 * @returns Scan result with entries classified
 *
 * @example
 * ```ts
 * const result = await scanDirectory("/home/user/.ctl", devspace);
 * for (const entry of result.actionable) {
 *   console.log(`${entry.name}: ${entry.type}`);
 * }
 * ```
 */
export async function scanDirectory(
  sourcePath: string,
  devspace?: Devspace,
): Promise<ScanResult> {
  const absSource = resolve(sourcePath);
  const entries: DiscoveredEntry[] = [];
  const autoSkipped: DiscoveredEntry[] = [];
  const actionable: DiscoveredEntry[] = [];

  const internalNames = getTyviInternalNames(devspace);
  const retainedPaths = new Set(
    devspace?.config.devspace.retained_paths ?? [],
  );

  for await (const dirEntry of Deno.readDir(absSource)) {
    const entryPath = join(absSource, dirEntry.name);
    const isTyviInternal = internalNames.has(dirEntry.name);
    const isRetained = retainedPaths.has(dirEntry.name);

    let entry: DiscoveredEntry;

    if (dirEntry.isDirectory) {
      const gitRepo = await isGitRepo(entryPath);
      const tyviProj = gitRepo ? false : await isTyviProject(entryPath);

      if (tyviProj) {
        entry = {
          path: entryPath,
          name: dirEntry.name,
          type: "tyvi-project",
          isTyviInternal,
          isRetained,
        };
      } else if (gitRepo) {
        const git = await collectGitMetadata(entryPath);
        entry = {
          path: entryPath,
          name: dirEntry.name,
          type: "git-repo",
          isTyviInternal,
          isRetained,
          git,
        };
      } else {
        entry = {
          path: entryPath,
          name: dirEntry.name,
          type: "directory",
          isTyviInternal,
          isRetained,
        };
      }
    } else {
      entry = {
        path: entryPath,
        name: dirEntry.name,
        type: "file",
        isTyviInternal,
        isRetained,
      };
    }

    entries.push(entry);

    if (isTyviInternal || isRetained) {
      autoSkipped.push(entry);
    } else {
      actionable.push(entry);
    }
  }

  return { entries, autoSkipped, actionable };
}

/**
 * Recursively copy a directory.
 */
async function copyDirectoryRecursive(
  src: string,
  dst: string,
): Promise<void> {
  await ensureDir(dst);

  for await (const entry of Deno.readDir(src)) {
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);

    if (entry.isDirectory) {
      await copyDirectoryRecursive(srcPath, dstPath);
    } else if (entry.isFile) {
      await Deno.copyFile(srcPath, dstPath);
    } else if (entry.isSymlink) {
      const target = await Deno.readLink(srcPath);
      await Deno.symlink(target, dstPath);
    }
  }
}

/**
 * Migrate a git repository into a devspace's staging and inventory.
 *
 * Copies or moves the repo to `staging/@namespace/name`, then appends
 * a `[[repos]]` entry to the namespace's `inventory.toml`.
 *
 * @param devspace - Target devspace
 * @param options - Migration options (source, namespace, strategy, etc.)
 * @returns Result of the migration
 *
 * @example
 * ```ts
 * const result = await migrateRepo(devspace, {
 *   sourcePath: "/home/user/.ctl/viola",
 *   namespace: "@hiisi",
 *   strategy: "move",
 * });
 * ```
 */
export async function migrateRepo(
  devspace: Devspace,
  options: MigrateRepoOptions,
): Promise<MigrateEntryResult> {
  const repoName = options.name ?? basename(options.sourcePath);
  const localPath = options.localPath ?? repoName;

  const stagingBase = resolve(
    devspace.rootPath,
    devspace.config.devspace.staging_path ?? ".staging",
  );
  const stagingPath = join(stagingBase, options.namespace, localPath);

  try {
    // Check if target already exists
    if (await exists(stagingPath)) {
      return {
        name: repoName,
        action: "failed",
        error: `target already exists at ${stagingPath}`,
      };
    }

    // Ensure namespace directory and inventory exist
    const nsDir = join(devspace.rootPath, options.namespace);
    await ensureDir(nsDir);
    const inventoryPath = join(nsDir, "inventory.toml");
    if (!await exists(inventoryPath)) {
      await Deno.writeTextFile(inventoryPath, "# Repository inventory\n");
    }

    // Ensure staging namespace directory
    await ensureDir(join(stagingBase, options.namespace));

    // Copy or move
    if (options.strategy === "copy") {
      await copyDirectoryRecursive(options.sourcePath, stagingPath);
    } else {
      // Try rename first (fast, same filesystem)
      try {
        await Deno.rename(options.sourcePath, stagingPath);
      } catch {
        // Cross-filesystem: copy then delete
        await copyDirectoryRecursive(options.sourcePath, stagingPath);
        await Deno.remove(options.sourcePath, { recursive: true });
      }
    }

    // Get remote URL for inventory entry
    const remotes = await getRemotes(stagingPath);
    let remoteEntries = "";
    if (remotes.length > 0) {
      const remoteParts: string[] = [];
      for (const name of remotes) {
        const url = await getRemoteUrl(stagingPath, name);
        if (url) {
          remoteParts.push(`{ name = "${name}", url = "${url}" }`);
        }
      }
      remoteEntries = remoteParts.join(", ");
    } else {
      remoteEntries = '{ name = "origin", url = "" }';
    }

    // Append to inventory.toml
    const content = await Deno.readTextFile(inventoryPath);
    let newEntry = `\n[[repos]]\nname = "${repoName}"\nremotes = [${remoteEntries}]\n`;
    if (options.category) {
      newEntry += `category = "${options.category}"\n`;
    }
    if (options.localPath) {
      newEntry += `local_path = "${options.localPath}"\n`;
    }
    const sep = content.endsWith("\n") ? "" : "\n";
    await Deno.writeTextFile(inventoryPath, content + sep + newEntry);

    return {
      name: repoName,
      action: "imported",
      namespace: options.namespace,
    };
  } catch (err) {
    return {
      name: repoName,
      action: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Delete a directory or file entry.
 *
 * @param path - Absolute path to delete
 * @returns Result of the deletion
 */
export async function deleteEntry(path: string): Promise<MigrateEntryResult> {
  const name = basename(path);
  try {
    await Deno.remove(path, { recursive: true });
    return { name, action: "deleted" };
  } catch (err) {
    return {
      name,
      action: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
