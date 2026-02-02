/**
 * Atoms loading system - loads all personality atom definitions from TOML files.
 *
 * This module provides functionality to load trait, skill, quirk, phrase,
 * experience, and stack definitions from a data directory structure.
 *
 * @module
 */

import type { Atoms } from "../types/mod.ts";
import { loadTraits } from "./traits.ts";
import { loadSkills } from "./skills.ts";
import { loadQuirks } from "./quirks.ts";
import { loadPhrases } from "./phrases.ts";
import { loadExperience } from "./experience.ts";
import { loadStacks } from "./stacks.ts";

/**
 * Load all atoms from a data directory.
 *
 * This function loads all personality atom definitions from the following
 * subdirectories under `{dataPath}/atoms/`:
 * - traits/
 * - skills/
 * - quirks/
 * - phrases/
 * - experience/
 * - stacks/
 *
 * If any directory is missing, it returns an empty map for that category.
 *
 * @param dataPath - Path to the data directory containing atoms/ subdirectory
 * @returns All loaded atoms organized by category
 *
 * @example
 * ```ts
 * const atoms = await loadAtoms("./data");
 * console.log(`Loaded ${atoms.traits.size} traits`);
 * console.log(`Loaded ${atoms.skills.size} skills`);
 * console.log(`Loaded ${atoms.quirks.size} quirks`);
 * console.log(`Loaded ${atoms.phrases.size} phrases`);
 * console.log(`Loaded ${atoms.experience.size} experiences`);
 * console.log(`Loaded ${atoms.stacks.size} stacks`);
 * ```
 */
export async function loadAtoms(dataPath: string): Promise<Atoms> {
  // Load all atom types in parallel for efficiency
  const [traits, skills, quirks, phrases, experience, stacks] = await Promise.all([
    loadTraits(dataPath),
    loadSkills(dataPath),
    loadQuirks(dataPath),
    loadPhrases(dataPath),
    loadExperience(dataPath),
    loadStacks(dataPath),
  ]);

  return {
    traits,
    skills,
    quirks,
    phrases,
    experience,
    stacks,
  };
}

// Re-export individual loaders for direct use if needed
export { loadExperience } from "./experience.ts";
export { loadPhrases } from "./phrases.ts";
export { loadQuirks } from "./quirks.ts";
export { loadSkills } from "./skills.ts";
export { loadStacks } from "./stacks.ts";
export { loadTraits } from "./traits.ts";
