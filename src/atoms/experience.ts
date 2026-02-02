/**
 * Load experience definitions from TOML files.
 *
 * @module
 */

import { parse } from "@std/toml";
import { join } from "@std/path";
import type { Experience } from "../types/mod.ts";

/**
 * TOML structure for experience files.
 */
interface ExperienceAtom {
  experience: {
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
 * Load all experience definitions from a data directory.
 *
 * Reads TOML files from `{dataPath}/atoms/experience/` directory.
 *
 * @param dataPath - Path to the data directory
 * @returns Map of experience ID to Experience definition
 *
 * @example
 * ```ts
 * const experience = await loadExperience("./data");
 * const exp = experience.get("exp.rust-ecosystem");
 * console.log(exp?.description.name);
 * ```
 */
export async function loadExperience(dataPath: string): Promise<Map<string, Experience>> {
  const experience = new Map<string, Experience>();
  const experienceDir = join(dataPath, "atoms", "experience");

  try {
    const dirInfo = await Deno.stat(experienceDir);
    if (!dirInfo.isDirectory) {
      return experience;
    }

    for await (const entry of Deno.readDir(experienceDir)) {
      if (entry.isFile && entry.name.endsWith(".toml")) {
        const filePath = join(experienceDir, entry.name);
        try {
          const content = await Deno.readTextFile(filePath);
          const parsed = parse(content) as unknown as ExperienceAtom;

          if (!parsed.experience) {
            console.warn(`Skipping ${entry.name}: missing [experience] section`);
            continue;
          }

          experience.set(parsed.experience.id, parsed.experience);
        } catch (error) {
          console.warn(`Failed to load experience from ${entry.name}:`, error);
        }
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return experience;
    }
    throw error;
  }

  return experience;
}
