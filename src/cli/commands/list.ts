/**
 * List command - List repositories from inventory.
 * @module
 */

import { loadWorkspace } from "../../config/mod.ts";
import { getStatus } from "../../devspace/mod.ts";

/**
 * List repositories from inventory.
 *
 * @param options - List options
 */
export async function listCommand(
  options: {
    cloned?: boolean;
    missing?: boolean;
    json?: boolean;
    namespace?: string;
  } = {},
): Promise<void> {
  try {
    const workspace = await loadWorkspace();
    let repos = await getStatus(workspace);

    // Apply filters
    if (options.namespace) {
      repos = repos.filter((r) => r.namespace === options.namespace);
    }

    if (options.cloned) {
      repos = repos.filter((r) => r.cloneStatus === "cloned");
    }

    if (options.missing) {
      repos = repos.filter((r) => r.cloneStatus === "missing" || r.cloneStatus === "partial");
    }

    if (options.json) {
      const output = repos.map((r) => ({
        name: r.name,
        namespace: r.namespace,
        category: r.category,
        status: r.status,
        cloneStatus: r.cloneStatus,
        remotes: r.remotes,
        local_path: r.local_path,
      }));
      console.log(JSON.stringify(output, null, 2));
    } else {
      for (const repo of repos) {
        const status = repo.cloneStatus === "cloned" ? "✓" : "-";
        const path = repo.local_path || repo.name;
        console.log(`${status} ${repo.namespace}/${path} (${repo.name})`);
      }

      if (repos.length === 0) {
        console.log("No repositories found.");
      } else {
        console.log("");
        console.log(`Total: ${repos.length} repositories`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  }
}
