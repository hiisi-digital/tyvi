/**
 * Person loading module for tyvi.
 *
 * Loads person definitions from TOML files.
 *
 * @module
 */

import { parse as parseToml } from "@std/toml";
import { join } from "@std/path";
import { exists } from "@std/fs";
import type { Person, PersonSummary } from "../types/mod.ts";

/**
 * Load a person definition from a TOML file.
 *
 * Person files are named `{id}.person.toml` and contain anchor values.
 *
 * @param dataPath - Path to the data directory
 * @param id - Person ID
 * @returns Promise resolving to the person definition
 * @throws Error if person file doesn't exist or is invalid
 */
export async function loadPerson(dataPath: string, id: string): Promise<Person> {
  const personPath = join(dataPath, "people", `${id}.person.toml`);

  if (!(await exists(personPath))) {
    throw new Error(
      `Person file not found: ${personPath}\n` +
      `Expected file: ${id}.person.toml in ${join(dataPath, "people")}/`
    );
  }

  const content = await Deno.readTextFile(personPath);
  const data = parseToml(content) as Record<string, unknown>;

  // Validate required identity fields
  if (!data.identity || typeof data.identity !== "object") {
    throw new Error(`Person file ${personPath} missing required [identity] section`);
  }

  const identity = data.identity as Record<string, unknown>;
  if (!identity.id || typeof identity.id !== "string") {
    throw new Error(`Person file ${personPath} missing required identity.id field`);
  }
  if (!identity.name || typeof identity.name !== "string") {
    throw new Error(`Person file ${personPath} missing required identity.name field`);
  }

  // Cast to Person - we've validated the required fields
  return data as unknown as Person;
}

/**
 * List all people in the data directory.
 *
 * Scans for *.person.toml files and returns summaries.
 *
 * @param dataPath - Path to the data directory
 * @returns Promise resolving to array of person summaries
 */
export async function listPeople(dataPath: string): Promise<PersonSummary[]> {
  const peoplePath = join(dataPath, "people");

  if (!(await exists(peoplePath))) {
    return [];
  }

  const summaries: PersonSummary[] = [];

  for await (const entry of Deno.readDir(peoplePath)) {
    if (entry.isFile && entry.name.endsWith(".person.toml")) {
      const id = entry.name.replace(".person.toml", "");
      try {
        const person = await loadPerson(dataPath, id);
        summaries.push({
          id: person.identity.id,
          name: person.identity.name,
          org: person.orgs?.primary,
          traitCount: Object.keys(person.traits || {}).length,
          skillCount: Object.keys(person.skills || {}).length,
          quirkCount: person.quirks?.explicit?.length || 0,
        });
      } catch (error) {
        // Skip invalid person files, but log the error for debugging
        console.error(`Skipping invalid person file ${entry.name}:`, error);
        continue;
      }
    }
  }

  return summaries;
}
