/**
 * Git repository status operations.
 * @module
 */

import type { GitStatus } from "../types.ts";

/**
 * Check if a directory is a git repository.
 *
 * @param path - Path to check
 * @returns true if directory contains .git
 */
export async function isGitRepo(path: string): Promise<boolean> {
  try {
    const gitPath = `${path}/.git`;
    const stat = await Deno.stat(gitPath);
    return stat.isDirectory || stat.isFile;
  } catch {
    return false;
  }
}

/**
 * Get the current branch name.
 *
 * @param repoPath - Path to git repository
 * @returns Current branch name or null if detached HEAD
 */
export async function getCurrentBranch(repoPath: string): Promise<string | null> {
  try {
    const command = new Deno.Command("git", {
      args: ["rev-parse", "--abbrev-ref", "HEAD"],
      cwd: repoPath,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();

    if (code !== 0) {
      return null;
    }

    const branch = new TextDecoder().decode(stdout).trim();
    return branch === "HEAD" ? null : branch;
  } catch {
    return null;
  }
}

/**
 * Get the date of the last commit.
 *
 * @param repoPath - Path to git repository
 * @returns Date of last commit or null if no commits
 */
export async function getLastCommitDate(repoPath: string): Promise<Date | null> {
  try {
    const command = new Deno.Command("git", {
      args: ["log", "-1", "--format=%ct"],
      cwd: repoPath,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();

    if (code !== 0) {
      return null;
    }

    const timestamp = new TextDecoder().decode(stdout).trim();
    return new Date(parseInt(timestamp) * 1000);
  } catch {
    return null;
  }
}

/**
 * Check if working tree has uncommitted changes.
 *
 * @param repoPath - Path to git repository
 * @returns true if there are uncommitted changes
 */
export async function hasUncommittedChanges(repoPath: string): Promise<boolean> {
  try {
    const command = new Deno.Command("git", {
      args: ["status", "--porcelain"],
      cwd: repoPath,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();

    if (code !== 0) {
      return false;
    }

    const output = new TextDecoder().decode(stdout).trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get ahead/behind commit counts relative to upstream.
 *
 * @param repoPath - Path to git repository
 * @returns Object with ahead and behind counts, or null if no upstream
 */
export async function getAheadBehind(
  repoPath: string,
): Promise<{ ahead: number; behind: number } | null> {
  try {
    const command = new Deno.Command("git", {
      args: ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"],
      cwd: repoPath,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();

    if (code !== 0) {
      return null;
    }

    const output = new TextDecoder().decode(stdout).trim();
    const [ahead, behind] = output.split(/\s+/).map(Number);

    return { ahead: ahead || 0, behind: behind || 0 };
  } catch {
    return null;
  }
}

/**
 * Get git status for a repository.
 *
 * @param repoPath - Path to git repository
 * @returns Git status (clean, dirty, ahead, behind, diverged)
 *
 * @example
 * ```ts
 * const status = await getGitStatus("/path/to/repo");
 * console.log(status); // "clean" | "dirty" | "ahead" | "behind" | "diverged"
 * ```
 */
export async function getGitStatus(repoPath: string): Promise<GitStatus> {
  const dirty = await hasUncommittedChanges(repoPath);
  if (dirty) {
    return "dirty";
  }

  const aheadBehind = await getAheadBehind(repoPath);
  if (!aheadBehind) {
    return "clean";
  }

  const { ahead, behind } = aheadBehind;

  if (ahead > 0 && behind > 0) {
    return "diverged";
  } else if (ahead > 0) {
    return "ahead";
  } else if (behind > 0) {
    return "behind";
  }

  return "clean";
}
