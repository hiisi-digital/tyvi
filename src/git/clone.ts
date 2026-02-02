/**
 * Git clone operations.
 * @module
 */

import { dirname } from "@std/path";
import { ensureDir } from "@std/fs";

/**
 * Clone a git repository.
 *
 * @param url - Git remote URL
 * @param targetPath - Local path to clone into
 * @returns true if successful, false otherwise
 *
 * @example
 * ```ts
 * const success = await cloneRepo(
 *   "git@github.com:org/repo.git",
 *   "/workspace/@org/repos/my-repo"
 * );
 * ```
 */
export async function cloneRepo(url: string, targetPath: string): Promise<boolean> {
  try {
    // Ensure parent directory exists
    const parentDir = dirname(targetPath);
    await ensureDir(parentDir);

    const command = new Deno.Command("git", {
      args: ["clone", url, targetPath],
      stdout: "piped",
      stderr: "piped",
    });

    const { code } = await command.output();
    return code === 0;
  } catch {
    return false;
  }
}

/**
 * Clone a repository with progress output.
 *
 * @param url - Git remote URL
 * @param targetPath - Local path to clone into
 * @returns true if successful, false otherwise
 */
export async function cloneRepoWithProgress(url: string, targetPath: string): Promise<boolean> {
  try {
    const parentDir = dirname(targetPath);
    await ensureDir(parentDir);

    const command = new Deno.Command("git", {
      args: ["clone", "--progress", url, targetPath],
      stdout: "inherit",
      stderr: "inherit",
    });

    const { code } = await command.output();
    return code === 0;
  } catch {
    return false;
  }
}
