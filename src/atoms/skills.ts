/**
 * Load skill definitions from TOML files.
 *
 * @module
 */

import { parse } from "@std/toml";
import { join } from "@std/path";
import type { Skill } from "../types/mod.ts";

/**
 * TOML structure for skill files.
 */
interface SkillAtom {
  skill: {
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
 * Load all skill definitions from a data directory.
 *
 * Reads TOML files from `{dataPath}/atoms/skills/` directory.
 *
 * @param dataPath - Path to the data directory
 * @returns Map of skill ID to Skill definition
 *
 * @example
 * ```ts
 * const skills = await loadSkills("./data");
 * const skill = skills.get("skill.type-system-design");
 * console.log(skill?.description.name);
 * ```
 */
export async function loadSkills(dataPath: string): Promise<Map<string, Skill>> {
  const skills = new Map<string, Skill>();
  const skillsDir = join(dataPath, "atoms", "skills");

  try {
    const dirInfo = await Deno.stat(skillsDir);
    if (!dirInfo.isDirectory) {
      return skills;
    }

    for await (const entry of Deno.readDir(skillsDir)) {
      if (entry.isFile && entry.name.endsWith(".toml")) {
        const filePath = join(skillsDir, entry.name);
        try {
          const content = await Deno.readTextFile(filePath);
          const parsed = parse(content) as unknown as SkillAtom;

          if (!parsed.skill) {
            console.warn(`Skipping ${entry.name}: missing [skill] section`);
            continue;
          }

          skills.set(parsed.skill.id, parsed.skill);
        } catch (error) {
          console.warn(`Failed to load skill from ${entry.name}:`, error);
        }
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return skills;
    }
    throw error;
  }

  return skills;
}
