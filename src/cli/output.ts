/**
 * CLI output formatting utilities.
 * @module
 */

import { bold, cyan, dim, green, red, yellow } from "@std/fmt/colors";
import type { RepoWithStatus } from "../types.ts";

/**
 * Format repository status for display.
 *
 * @param repos - Array of repositories with status
 * @param options - Display options
 */
export function formatStatus(
  repos: RepoWithStatus[],
  options: { quiet?: boolean; json?: boolean } = {},
): string {
  if (options.json) {
    return JSON.stringify(repos, null, 2);
  }

  if (repos.length === 0) {
    return dim("No repositories found.");
  }

  // Group by namespace and category
  const grouped = new Map<string, Map<string, RepoWithStatus[]>>();

  for (const repo of repos) {
    if (!grouped.has(repo.namespace)) {
      grouped.set(repo.namespace, new Map());
    }

    const category = repo.category || repo.local_path?.split("/")[0] || "";
    const namespaceMap = grouped.get(repo.namespace)!;

    if (!namespaceMap.has(category)) {
      namespaceMap.set(category, []);
    }

    namespaceMap.get(category)!.push(repo);
  }

  const lines: string[] = [];
  let totalCloned = 0;
  let totalDirty = 0;
  let totalMissing = 0;

  for (const [namespace, categories] of grouped) {
    lines.push(bold(cyan(namespace)));

    for (const [category, categoryRepos] of categories) {
      if (category) {
        lines.push(`  ${dim(category + "/")}`);
      }

      for (const repo of categoryRepos) {
        const indent = category ? "    " : "  ";
        const name = repo.name.padEnd(20, " ");

        let status = "";
        let info = "";

        if (repo.cloneStatus === "missing") {
          status = dim("- not cloned");
          totalMissing++;
        } else if (repo.cloneStatus === "partial") {
          status = yellow("? partial");
          totalMissing++;
        } else {
          totalCloned++;

          if (repo.gitStatus === "dirty") {
            status = red("! dirty");
            totalDirty++;
          } else if (repo.gitStatus === "ahead") {
            status = yellow("↑ ahead");
          } else if (repo.gitStatus === "behind") {
            status = yellow("↓ behind");
          } else if (repo.gitStatus === "diverged") {
            status = yellow("⇅ diverged");
          } else {
            status = green("✓ clean");
          }

          const parts = [];
          if (repo.currentBranch) {
            parts.push(repo.currentBranch);
          }
          if (repo.ahead) {
            parts.push(`↑${repo.ahead}`);
          }
          if (repo.behind) {
            parts.push(`↓${repo.behind}`);
          }
          if (repo.lastActivity) {
            parts.push(formatTimeAgo(repo.lastActivity));
          }

          if (parts.length > 0) {
            info = dim(` (${parts.join(" ")})`);
          }
        }

        lines.push(`${indent}${name} ${status}${info}`);
      }
    }

    lines.push("");
  }

  // Summary
  const summary = [];
  if (totalCloned > 0) summary.push(`${totalCloned} cloned`);
  if (totalDirty > 0) summary.push(`${totalDirty} dirty`);
  if (totalMissing > 0) summary.push(`${totalMissing} not cloned`);

  if (summary.length > 0) {
    lines.push(dim(`Summary: ${summary.join(", ")}`));
  }

  return lines.join("\n");
}

/**
 * Format a date as relative time.
 *
 * @param date - The date to format
 * @returns Human-readable relative time string
 *
 * @remarks
 * Month calculations use a 30-day approximation for simplicity.
 * This may be slightly inaccurate for specific month boundaries
 * but is sufficient for displaying approximate activity times.
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // Use 30-day approximation for months
  if (diffDay > 30) {
    const months = Math.floor(diffDay / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  } else if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} min ago`;
  } else {
    return "just now";
  }
}

/**
 * Format clone results.
 */
export function formatCloneResult(result: {
  cloned: string[];
  skipped: string[];
  failed: string[];
}): string {
  const lines: string[] = [];

  if (result.cloned.length > 0) {
    const repoWord = result.cloned.length === 1 ? "repository" : "repositories";
    lines.push(green(`✓ Cloned ${result.cloned.length} ${repoWord}:`));
    for (const name of result.cloned) {
      lines.push(`  ${name}`);
    }
  }

  if (result.skipped.length > 0 && result.skipped.length <= 5) {
    lines.push(dim(`- Skipped ${result.skipped.length} (already cloned)`));
  }

  if (result.failed.length > 0) {
    lines.push(red(`✗ Failed to clone ${result.failed.length}:`));
    for (const name of result.failed) {
      lines.push(`  ${name}`);
    }
  }

  if (result.cloned.length === 0 && result.failed.length === 0) {
    lines.push(dim("No repositories to clone."));
  }

  return lines.join("\n");
}

/**
 * Format sync results.
 */
export function formatSyncResult(result: {
  created: string[];
  orphaned: string[];
  fetched: string[];
}): string {
  const lines: string[] = [];

  if (result.created.length > 0) {
    const dirWord = result.created.length === 1 ? "directory" : "directories";
    lines.push(green(`✓ Created ${result.created.length} ${dirWord}:`));
    for (const name of result.created) {
      lines.push(`  ${name}`);
    }
  }

  if (result.fetched.length > 0) {
    const repoWord = result.fetched.length === 1 ? "repository" : "repositories";
    lines.push(green(`✓ Fetched ${result.fetched.length} ${repoWord}`));
  }

  if (result.orphaned.length > 0) {
    const repoWord = result.orphaned.length === 1 ? "repository" : "repositories";
    lines.push(yellow(`! Found ${result.orphaned.length} orphaned ${repoWord}:`));
    for (const name of result.orphaned) {
      lines.push(`  ${name}`);
    }
  }

  if (
    result.created.length === 0 && result.fetched.length === 0 && result.orphaned.length === 0
  ) {
    lines.push(green("✓ Workspace is in sync."));
  }

  return lines.join("\n");
}
