/**
 * Load trait axis definitions from TOML files.
 *
 * @module
 */

import { parse } from "@std/toml";
import { join } from "@std/path";
import type { Trait, TraitAxis } from "../types/mod.ts";

/**
 * TOML structure for trait files.
 */
interface TraitAtom {
  trait: {
    axis: TraitAxis;
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
 * Load all trait definitions from a data directory.
 *
 * Reads TOML files from `{dataPath}/atoms/traits/` directory.
 * Each file should contain a single trait definition with the structure:
 *
 * ```toml
 * [trait.axis]
 * id = "trait.caution"
 *
 * [trait.axis.negative]
 * term = "bold"
 * extreme = "reckless"
 * description = "Acts quickly with minimal hesitation"
 *
 * [trait.axis.neutral]
 * term = "balanced"
 * description = "Weighs risks and opportunities appropriately"
 *
 * [trait.axis.positive]
 * term = "prudent"
 * extreme = "paralyzed"
 * description = "Carefully evaluates risks before acting"
 * ```
 *
 * @param dataPath - Path to the data directory
 * @returns Map of trait ID to Trait definition
 *
 * @example
 * ```ts
 * const traits = await loadTraits("./data");
 * const caution = traits.get("trait.caution");
 * console.log(caution?.axis.positive.term); // "prudent"
 * ```
 */
export async function loadTraits(dataPath: string): Promise<Map<string, Trait>> {
  const traits = new Map<string, Trait>();
  const traitsDir = join(dataPath, "atoms", "traits");

  try {
    // Check if directory exists
    const dirInfo = await Deno.stat(traitsDir);
    if (!dirInfo.isDirectory) {
      return traits; // Return empty map if not a directory
    }

    // Read all files in the traits directory
    for await (const entry of Deno.readDir(traitsDir)) {
      if (entry.isFile && entry.name.endsWith(".toml")) {
        const filePath = join(traitsDir, entry.name);
        try {
          const content = await Deno.readTextFile(filePath);
          const parsed = parse(content) as TraitAtom;

          if (!parsed.trait || !parsed.trait.axis) {
            console.warn(`Skipping ${entry.name}: missing [trait.axis] section`);
            continue;
          }

          const trait: Trait = {
            axis: parsed.trait.axis,
            composition: parsed.trait.composition,
          };

          traits.set(trait.axis.id, trait);
        } catch (error) {
          console.warn(`Failed to load trait from ${entry.name}:`, error);
        }
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // Directory doesn't exist - return empty map
      return traits;
    }
    throw error;
  }

  return traits;
}
