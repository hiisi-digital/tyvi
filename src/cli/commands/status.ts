/**
 * Status command - Show status of all repositories.
 * @module
 */

import { loadWorkspace } from "../../config/mod.ts";
import { getStatus } from "../../workspace/mod.ts";
import { formatStatus } from "../output.ts";

/**
 * Show status of repositories in workspace.
 *
 * @param options - Status options
 */
export async function statusCommand(
  options: {
    pattern?: string;
    namespace?: string;
    dirty?: boolean;
    behind?: boolean;
    missing?: boolean;
    quiet?: boolean;
    json?: boolean;
  } = {},
): Promise<void> {
  try {
    const workspace = await loadWorkspace();
    let repos = await getStatus(workspace);

    // Apply filters
    if (options.pattern) {
      repos = repos.filter((r) =>
        r.name.includes(options.pattern!) ||
        r.namespace.includes(options.pattern!)
      );
    }

    if (options.namespace) {
      repos = repos.filter((r) => r.namespace === options.namespace);
    }

    if (options.dirty) {
      repos = repos.filter((r) => r.gitStatus === "dirty");
    }

    if (options.behind) {
      repos = repos.filter((r) => r.gitStatus === "behind" || r.gitStatus === "diverged");
    }

    if (options.missing) {
      repos = repos.filter((r) => r.cloneStatus === "missing" || r.cloneStatus === "partial");
    }

    console.log(formatStatus(repos, { quiet: options.quiet, json: options.json }));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  }
}
