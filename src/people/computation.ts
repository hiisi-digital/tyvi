/**
 * Person computation module for tyvi.
 *
 * Computes all derived values for a person from anchors and composition rules.
 *
 * @module
 */

import type { ComputedPerson, Person } from "../types/mod.ts";
import { loadPerson } from "./loading.ts";
import { loadAtoms } from "../atoms/mod.ts";
import { createEmptyTrace } from "../computation/mod.ts";

/**
 * Compute all derived values for a person.
 *
 * Takes anchor values from the person file and applies composition rules
 * from atoms to compute all traits, skills, experience, stacks, quirks, and phrases.
 *
 * This is a basic implementation. Full computation with rule application
 * will be implemented when issues #3 and #5 are completed.
 *
 * @param dataPath - Path to the data directory
 * @param id - Person ID
 * @returns Promise resolving to computed person with all values
 * @throws Error if person cannot be loaded or computed
 */
export async function computePerson(
  dataPath: string,
  id: string,
): Promise<ComputedPerson> {
  // Load the person definition
  const person = await loadPerson(dataPath, id);

  // Load atoms (stub for now)
  const _atoms = await loadAtoms(dataPath);

  // Start with anchor values
  const traits = new Map<string, number>();
  const skills = new Map<string, number>();
  const experience = new Map<string, number>();
  const stacks = new Map<string, number>();
  const quirks = new Set<string>();
  const phrases: string[] = [];

  // Copy anchor traits
  if (person.traits) {
    for (const [key, value] of Object.entries(person.traits)) {
      traits.set(key, value);
    }
  }

  // Copy anchor skills
  if (person.skills) {
    for (const [key, value] of Object.entries(person.skills)) {
      skills.set(key, value);
    }
  }

  // Copy anchor experience
  if (person.experience) {
    for (const [key, value] of Object.entries(person.experience)) {
      experience.set(key, value);
    }
  }

  // Copy anchor stacks
  if (person.stacks) {
    for (const [key, value] of Object.entries(person.stacks)) {
      stacks.set(key, value);
    }
  }

  // Copy explicit quirks
  if (person.quirks?.explicit) {
    for (const quirk of person.quirks.explicit) {
      quirks.add(quirk);
    }
  }

  // TODO: Apply composition rules from atoms (issue #3)
  // TODO: Auto-assign quirks based on conditions (issue #3)
  // TODO: Match phrases based on conditions (issue #3)

  return {
    identity: person.identity,
    orgs: person.orgs,
    traits,
    skills,
    experience,
    stacks,
    quirks,
    phrases,
    tools: person.tools?.allowed,
    custom: person.custom,
    trace: createEmptyTrace(),
  };
}
