/**
 * Load stack definitions from TOML files.
 *
 * @module
 */

import { parse } from "@std/toml";
import { join } from "@std/path";
import type { Stack } from "../types/mod.ts";

/**
 * TOML structure for stack files.
 */
interface StackAtom {
  stack: {
    id: string;
    category: string;
    description: {
      name: string;
      summary: string;
    };
    levels: {
      0: string;
      20: string;
      40: string;
      60: string;
      80: string;
      100: string;
    };
    composition?: {
      rule: Array<{
        description: string;
        expression: string;
        weight: number;
      }>;
    };
  };
}

/**
 * Load all stack definitions from a data directory.
 *
 * Reads TOML files from `{dataPath}/atoms/stacks/` directory.
 *
 * @param dataPath - Path to the data directory
 * @returns Map of stack ID to Stack definition
 *
 * @example
 * ```ts
 * const stacks = await loadStacks("./data");
 * const stack = stacks.get("stack.rust");
 * console.log(stack?.description.name);
 * ```
 */
export async function loadStacks(dataPath: string): Promise<Map<string, Stack>> {
  const stacks = new Map<string, Stack>();
  const stacksDir = join(dataPath, "atoms", "stacks");

  try {
    const dirInfo = await Deno.stat(stacksDir);
    if (!dirInfo.isDirectory) {
      return stacks;
    }

    for await (const entry of Deno.readDir(stacksDir)) {
      if (entry.isFile && entry.name.endsWith(".toml")) {
        const filePath = join(stacksDir, entry.name);
        try {
          const content = await Deno.readTextFile(filePath);
          const parsed = parse(content) as unknown as StackAtom;

          if (!parsed.stack) {
            console.warn(`Skipping ${entry.name}: missing [stack] section`);
            continue;
          }

          stacks.set(parsed.stack.id, parsed.stack);
        } catch (error) {
          console.warn(`Failed to load stack from ${entry.name}:`, error);
        }
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return stacks;
    }
    throw error;
  }

  return stacks;
}
