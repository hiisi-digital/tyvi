/**
 * Git remote operations.
 * @module
 */

/**
 * Fetch all remotes for a repository.
 *
 * @param repoPath - Path to git repository
 * @returns true if successful, false otherwise
 */
export async function fetchAllRemotes(repoPath: string): Promise<boolean> {
  try {
    const command = new Deno.Command("git", {
      args: ["fetch", "--all"],
      cwd: repoPath,
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
 * Get list of remotes for a repository.
 *
 * @param repoPath - Path to git repository
 * @returns Array of remote names
 */
export async function getRemotes(repoPath: string): Promise<string[]> {
  try {
    const command = new Deno.Command("git", {
      args: ["remote"],
      cwd: repoPath,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();

    if (code !== 0) {
      return [];
    }

    const output = new TextDecoder().decode(stdout).trim();
    return output ? output.split("\n") : [];
  } catch {
    return [];
  }
}

/**
 * Get URL for a specific remote.
 *
 * @param repoPath - Path to git repository
 * @param remoteName - Name of the remote (default: "origin")
 * @returns Remote URL or null if not found
 */
export async function getRemoteUrl(
  repoPath: string,
  remoteName: string = "origin",
): Promise<string | null> {
  try {
    const command = new Deno.Command("git", {
      args: ["remote", "get-url", remoteName],
      cwd: repoPath,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();

    if (code !== 0) {
      return null;
    }

    return new TextDecoder().decode(stdout).trim();
  } catch {
    return null;
  }
}
