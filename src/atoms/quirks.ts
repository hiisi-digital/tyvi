/**
 * Load quirk definitions from TOML files.
 *
 * @module
 */

import { parse } from "@std/toml";
import { join } from "@std/path";
import type { Quirk } from "../types/mod.ts";

/**
 * TOML structure for quirk files.
 */
interface QuirkAtom {
  quirk: {
    id: string;
    description: {
      name: string;
      summary: string;
    };
    manifestations: {
      behaviors: string[];
    };
    auto_assign?: {
      any_of?: string[];
      all_of?: string[];
    };
    overdone?: {
      note: string;
    };
  };
}

/**
 * Load all quirk definitions from a data directory.
 *
 * Reads TOML files from `{dataPath}/atoms/quirks/` directory.
 *
 * @param dataPath - Path to the data directory
 * @returns Map of quirk ID to Quirk definition
 *
 * @example
 * ```ts
 * const quirks = await loadQuirks("./data");
 * const quirk = quirks.get("quirk.edge-case-hunter");
 * console.log(quirk?.description.name);
 * ```
 */
export async function loadQuirks(dataPath: string): Promise<Map<string, Quirk>> {
  const quirks = new Map<string, Quirk>();
  const quirksDir = join(dataPath, "atoms", "quirks");

  try {
    const dirInfo = await Deno.stat(quirksDir);
    if (!dirInfo.isDirectory) {
      return quirks;
    }

    for await (const entry of Deno.readDir(quirksDir)) {
      if (entry.isFile && entry.name.endsWith(".toml")) {
        const filePath = join(quirksDir, entry.name);
        try {
          const content = await Deno.readTextFile(filePath);
          const parsed = parse(content) as unknown as QuirkAtom;

          if (!parsed.quirk) {
            console.warn(`Skipping ${entry.name}: missing [quirk] section`);
            continue;
          }

          quirks.set(parsed.quirk.id, parsed.quirk);
        } catch (error) {
          console.warn(`Failed to load quirk from ${entry.name}:`, error);
        }
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return quirks;
    }
    throw error;
  }

  return quirks;
}
