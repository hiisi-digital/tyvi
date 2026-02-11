/**
 * Tests for relationship operations.
 */

import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { join } from "@std/path";
import {
  addRelationshipLogEntry,
  listRelationships,
  loadRelationships,
} from "../src/relationships/mod.ts";
import type { RelationshipLogEntry } from "../src/types/mod.ts";

const FIXTURES_PATH = join(Deno.cwd(), "tests", "fixtures", "relationships-data");

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Copy a directory recursively to a temp location for mutation tests.
 */
async function copyFixtureToTemp(): Promise<string> {
  const dir = await Deno.makeTempDir();
  const peopleSrc = join(FIXTURES_PATH, "people");
  const peopleDst = join(dir, "people");
  await Deno.mkdir(peopleDst);

  for await (const entry of Deno.readDir(peopleSrc)) {
    if (entry.isFile) {
      await Deno.copyFile(
        join(peopleSrc, entry.name),
        join(peopleDst, entry.name),
      );
    }
  }

  return dir;
}

// ============================================================================
// loadRelationships Tests
// ============================================================================

Deno.test("loadRelationships - returns empty collection when no file exists", async () => {
  const collection = await loadRelationships(FIXTURES_PATH, "nobody");

  assertEquals(collection.person, "ctx://person/nobody");
  assertEquals(collection.relationships.length, 0);
});

Deno.test("loadRelationships - parses relationship file correctly", async () => {
  const collection = await loadRelationships(FIXTURES_PATH, "alex");

  assertEquals(collection.person, "ctx://person/alex");
  assertEquals(collection.relationships.length, 2);

  const viktor = collection.relationships.find((r) => r.with === "ctx://person/viktor");
  assertExists(viktor);
  assertEquals(viktor.type, "frequent-collaborator");
  assertEquals(viktor.status, "active");
  assertEquals(viktor.since, "2024-06-01");

  const sam = collection.relationships.find((r) => r.with === "ctx://person/sam");
  assertExists(sam);
  assertEquals(sam.type, "mentor");
  assertEquals(sam.status, "dormant");
});

Deno.test("loadRelationships - parses dynamic fields", async () => {
  const collection = await loadRelationships(FIXTURES_PATH, "alex");

  const viktor = collection.relationships.find((r) => r.with === "ctx://person/viktor");
  assertExists(viktor);
  assertExists(viktor.dynamic);
  assertEquals(viktor.dynamic.summary, "Strong technical collaborators on type system design");
  assertEquals(viktor.dynamic.strengths, ["code review", "architecture"]);
  assertEquals(viktor.dynamic.friction, ["deployment timing"]);
});

// ============================================================================
// listRelationships Tests
// ============================================================================

Deno.test("listRelationships - returns only active relationships by default", async () => {
  const summaries = await listRelationships(FIXTURES_PATH);

  // Only the active relationship (with viktor) should appear
  assertEquals(summaries.length, 1);
  assertEquals(summaries[0]!.withId, "viktor");
  assertEquals(summaries[0]!.type, "frequent-collaborator");
  assertEquals(summaries[0]!.status, "active");
});

Deno.test("listRelationships - filters by type with includeInactive", async () => {
  const summaries = await listRelationships(FIXTURES_PATH, {
    type: "mentor",
    includeInactive: true,
  });

  assertEquals(summaries.length, 1);
  assertEquals(summaries[0]!.type, "mentor");
  assertEquals(summaries[0]!.withId, "sam");
});

Deno.test("listRelationships - filters by status with includeInactive", async () => {
  const summaries = await listRelationships(FIXTURES_PATH, {
    status: "dormant",
    includeInactive: true,
  });

  assertEquals(summaries.length, 1);
  assertEquals(summaries[0]!.status, "dormant");
  assertEquals(summaries[0]!.withId, "sam");
});

// ============================================================================
// addRelationshipLogEntry Tests
// ============================================================================

Deno.test("addRelationshipLogEntry - appends log entry", async () => {
  const tempDir = await copyFixtureToTemp();
  try {
    const entry: RelationshipLogEntry = {
      timestamp: "2025-03-01T10:00:00Z",
      event: "collaboration",
      note: "Paired on API design review",
    };

    await addRelationshipLogEntry(tempDir, "alex", "viktor", entry);

    // Re-read and verify
    const collection = await loadRelationships(tempDir, "alex");
    const viktor = collection.relationships.find((r) => r.with === "ctx://person/viktor");
    assertExists(viktor);

    const lastLog = viktor.log[viktor.log.length - 1];
    assertExists(lastLog);
    assertEquals(lastLog.event, "collaboration");
    assertEquals(lastLog.note, "Paired on API design review");
  } finally {
    await cleanup(tempDir);
  }
});

Deno.test("addRelationshipLogEntry - throws when no relationships file", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    await Deno.mkdir(join(tempDir, "people"));

    await assertRejects(
      () =>
        addRelationshipLogEntry(tempDir, "nobody", "viktor", {
          timestamp: "2025-01-01T00:00:00Z",
          event: "collaboration",
          note: "test",
        }),
      Error,
      "No relationships file",
    );
  } finally {
    await cleanup(tempDir);
  }
});

Deno.test("addRelationshipLogEntry - throws when relationship not found", async () => {
  const tempDir = await copyFixtureToTemp();
  try {
    await assertRejects(
      () =>
        addRelationshipLogEntry(tempDir, "alex", "unknown-person", {
          timestamp: "2025-01-01T00:00:00Z",
          event: "collaboration",
          note: "test",
        }),
      Error,
      "No relationship with unknown-person",
    );
  } finally {
    await cleanup(tempDir);
  }
});
