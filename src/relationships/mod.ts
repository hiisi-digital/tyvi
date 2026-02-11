/**
 * Relationship operations.
 *
 * Loads, queries, and manages relationships between people.
 * Relationship data is stored in TOML files alongside person definitions.
 *
 * @module
 */

import { exists } from "@std/fs";
import { join } from "@std/path";
import { parse, stringify } from "@std/toml";
import type {
  RelationshipCollection,
  RelationshipFile,
  RelationshipLogEntry,
  RelationshipQuery,
  RelationshipSummary,
} from "../types/mod.ts";

/**
 * Load relationships for a person.
 *
 * Relationship files are stored alongside person files:
 * `people/<id>.relationships.toml`
 *
 * @param dataPath - Root data path
 * @param personId - Person ID
 * @returns Relationship collection (empty if no file exists)
 */
export async function loadRelationships(
  dataPath: string,
  personId: string,
): Promise<RelationshipCollection> {
  const filePath = join(dataPath, "people", `${personId}.relationships.toml`);

  if (!await exists(filePath)) {
    return { person: `ctx://person/${personId}`, relationships: [] };
  }

  const content = await Deno.readTextFile(filePath);
  const parsed = parse(content) as unknown as RelationshipFile;

  return {
    person: `ctx://person/${personId}`,
    relationships: parsed.relationship ?? [],
  };
}

/**
 * List relationship summaries, optionally filtered.
 *
 * @param dataPath - Root data path
 * @param query - Optional query filters
 * @returns Array of relationship summaries
 */
export async function listRelationships(
  dataPath: string,
  query?: RelationshipQuery,
): Promise<RelationshipSummary[]> {
  const peoplePath = join(dataPath, "people");
  const summaries: RelationshipSummary[] = [];

  if (!await exists(peoplePath)) {
    return summaries;
  }

  for await (const entry of Deno.readDir(peoplePath)) {
    if (!entry.name.endsWith(".relationships.toml")) continue;

    const personId = entry.name.replace(".relationships.toml", "");

    // Filter by person if specified
    if (
      query?.person && personId !== query.person &&
      `ctx://person/${personId}` !== query.person
    ) {
      continue;
    }

    const collection = await loadRelationships(dataPath, personId);

    for (const rel of collection.relationships) {
      // Filter by type
      if (query?.type) {
        const types = Array.isArray(query.type) ? query.type : [query.type];
        if (!types.includes(rel.type)) continue;
      }

      // Filter by status
      if (query?.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status];
        if (!statuses.includes(rel.status)) continue;
      }

      // Filter inactive
      if (!query?.includeInactive && rel.status !== "active") {
        continue;
      }

      // Extract withId from ctx:// reference
      const withId = rel.with.replace("ctx://person/", "");

      summaries.push({
        withId,
        withName: withId,
        type: rel.type,
        status: rel.status,
        since: rel.since,
        summary: rel.dynamic.summary,
      });
    }
  }

  return summaries;
}

/**
 * Add a log entry to a relationship.
 *
 * @param dataPath - Root data path
 * @param personId - Person ID who owns the relationship
 * @param withId - The other person's ID
 * @param logEntry - Log entry to add
 */
export async function addRelationshipLogEntry(
  dataPath: string,
  personId: string,
  withId: string,
  logEntry: RelationshipLogEntry,
): Promise<void> {
  const filePath = join(dataPath, "people", `${personId}.relationships.toml`);

  if (!await exists(filePath)) {
    throw new Error(
      `No relationships file for ${personId}. Create one first.`,
    );
  }

  const content = await Deno.readTextFile(filePath);
  const parsed = parse(content) as unknown as RelationshipFile;

  const withRef = withId.startsWith("ctx://") ? withId : `ctx://person/${withId}`;

  const rel = parsed.relationship?.find((r) => r.with === withRef);
  if (!rel) {
    throw new Error(
      `No relationship with ${withId} found for ${personId}.`,
    );
  }

  if (!rel.log) {
    rel.log = [];
  }
  rel.log.push(logEntry);

  await Deno.writeTextFile(
    filePath,
    stringify(parsed as unknown as Record<string, unknown>),
  );
}
