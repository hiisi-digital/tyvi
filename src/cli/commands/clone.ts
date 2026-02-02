/**
 * Clone command - Clone repositories from inventory.
 * @module
 */

import { loadWorkspace } from "../../config/mod.ts";
import { clone } from "../../workspace/mod.ts";
import { formatCloneResult } from "../output.ts";

/**
 * Clone repositories matching criteria.
 *
 * @param pattern - Pattern to match repository names
 * @param options - Clone options
 */
export async function cloneCommand(
  pattern?: string,
  options: {
    all?: boolean;
    namespace?: string;
    category?: string;
    status?: string;
    quiet?: boolean;
  } = {},
): Promise<void> {
  try {
    const workspace = await loadWorkspace();

    if (!options.all && !pattern && !options.namespace && !options.category) {
      console.error("Error: No repositories specified.");
      console.error("");
      console.error("Usage:");
      console.error("  tyvi clone --all           # Clone all repositories");
      console.error("  tyvi clone <pattern>       # Clone repos matching pattern");
      console.error("  tyvi clone --namespace @x  # Clone repos in namespace");
      console.error("  tyvi clone --category apps # Clone repos in category");
      Deno.exit(1);
    }

    const result = await clone(workspace, {
      pattern,
      all: options.all,
      namespace: options.namespace,
      category: options.category,
      status: options.status,
      showProgress: !options.quiet,
    });

    if (!options.quiet) {
      console.log(formatCloneResult(result));
    }

    if (result.failed.length > 0) {
      Deno.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  }
}
