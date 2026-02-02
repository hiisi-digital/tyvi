/**
 * Remove command - Remove a repository from inventory.
 * @module
 */

import { loadWorkspace } from "../../config/mod.ts";
import { removeRepo } from "../../workspace/mod.ts";

/**
 * Remove a repository from inventory.
 *
 * @param repoName - Repository name to remove
 * @param options - Remove options
 */
export async function removeCommand(
  repoName: string,
  options: {
    delete?: boolean;
    force?: boolean;
  } = {},
): Promise<void> {
  try {
    if (!repoName) {
      console.error("Error: Repository name is required.");
      console.error("");
      console.error("Usage:");
      console.error("  tyvi remove <repo-name>");
      console.error("  tyvi remove <repo-name> --delete  # Also delete local files");
      Deno.exit(1);
    }

    const workspace = await loadWorkspace();

    // Confirm deletion if deleting files
    if (options.delete && !options.force) {
      console.log(`Warning: This will delete the local repository files for '${repoName}'.`);
      console.log("This action cannot be undone.");
      console.log("");

      const confirmation = prompt("Type the repository name to confirm: ");
      if (confirmation !== repoName) {
        console.log("Deletion cancelled.");
        Deno.exit(0);
      }
    }

    const success = await removeRepo(workspace, repoName, {
      deleteFiles: options.delete,
    });

    if (success) {
      console.log(`✓ Removed '${repoName}' from inventory`);
      if (options.delete) {
        console.log(`✓ Deleted local files`);
      }
    } else {
      console.error(`Error: Repository '${repoName}' not found in inventory.`);
      Deno.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  }
}
