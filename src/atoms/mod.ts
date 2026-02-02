/**
 * Atoms loading module for tyvi.
 *
 * Loads atomic building blocks (traits, skills, quirks, etc.) from TOML files.
 * This is a stub implementation that will be replaced by issue #5.
 *
 * @module
 */

import type { Atoms } from "../types/mod.ts";

/**
 * Load all atoms from the specified data path.
 *
 * This is a stub implementation that returns empty maps.
 * Will be replaced when issue #5 is completed.
 *
 * @param dataPath - Path to the data directory containing atoms/
 * @returns Promise resolving to an Atoms object with empty maps
 */
export async function loadAtoms(_dataPath: string): Promise<Atoms> {
  // Stub implementation - will be replaced by issue #5
  return {
    traits: new Map(),
    skills: new Map(),
    experience: new Map(),
    stacks: new Map(),
    quirks: new Map(),
    phrases: new Map(),
  };
}
