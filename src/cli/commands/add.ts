/**
 * Add command - Add a repository to inventory.
 * @module
 */

import { loadWorkspace } from "../../config/mod.ts";
import { addRepo } from "../../devspace/mod.ts";

/**
 * Add a repository to inventory.
 *
 * @param url - Git repository URL or org/repo format
 * @param options - Add options
 */
export async function addCommand(
  url: string,
  options: {
    namespace?: string;
    name?: string;
    category?: string;
    localPath?: string;
    clone?: boolean;
  } = {},
): Promise<void> {
  try {
    if (!url) {
      console.error("Error: Repository URL is required.");
      console.error("");
      console.error("Usage:");
      console.error("  tyvi add git@github.com:org/repo.git");
      console.error("  tyvi add org/repo --namespace @hiisi");
      Deno.exit(1);
    }

    // Convert org/repo format to full URL if needed
    let fullUrl = url;
    if (!url.includes("://") && !url.startsWith("git@")) {
      fullUrl = `git@github.com:${url}.git`;
    }

    const workspace = await loadWorkspace();

    await addRepo(workspace, fullUrl, {
      namespace: options.namespace,
      name: options.name,
      category: options.category,
      localPath: options.localPath,
    });

    const repoName = options.name || url.split("/").pop()?.replace(/\.git$/, "") || "repo";
    console.log(`✓ Added '${repoName}' to inventory`);

    if (options.clone) {
      console.log("");
      console.log("Cloning repository...");
      const { clone } = await import("../../workspace/mod.ts");
      const result = await clone(workspace, { pattern: repoName, showProgress: true });

      if (result.cloned.length > 0) {
        console.log(`✓ Cloned ${repoName}`);
      } else if (result.failed.length > 0) {
        console.error(`✗ Failed to clone ${repoName}`);
        Deno.exit(1);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  }
}
