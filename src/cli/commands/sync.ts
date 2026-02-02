/**
 * Sync command - Synchronize workspace structure.
 * @module
 */

import { loadWorkspace } from "../../config/mod.ts";
import { sync } from "../../workspace/mod.ts";
import { formatSyncResult } from "../output.ts";

/**
 * Sync workspace structure with inventory definitions.
 *
 * @param options - Sync options
 */
export async function syncCommand(
  options: {
    fetch?: boolean;
    prune?: boolean;
    dryRun?: boolean;
    quiet?: boolean;
  } = {},
): Promise<void> {
  try {
    const workspace = await loadWorkspace();

    const result = await sync(workspace, {
      fetch: options.fetch,
      prune: options.prune,
      dryRun: options.dryRun,
    });

    if (!options.quiet) {
      if (options.dryRun) {
        console.log("[Dry run - no changes made]");
        console.log("");
      }
      console.log(formatSyncResult(result));
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  }
}
