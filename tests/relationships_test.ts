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

Deno.test("addRelationshipLogEntry - stringify round-trip preserves other relationships", async () => {
  const tempDir = await copyFixtureToTemp();
  try {
    const entry: RelationshipLogEntry = {
      timestamp: "2025-04-01T10:00:00Z",
      event: "collaboration",
      note: "Quick sync call",
    };

    await addRelationshipLogEntry(tempDir, "alex", "viktor", entry);

    // Verify the OTHER relationship (sam) is still intact
    const collection = await loadRelationships(tempDir, "alex");
    const sam = collection.relationships.find((r) => r.with === "ctx://person/sam");
    assertExists(sam, "sam relationship should survive stringify round-trip");
    assertEquals(sam.type, "mentor");
    assertEquals(sam.status, "dormant");
    assertEquals(sam.since, "2023-01-15");
  } finally {
    await cleanup(tempDir);
  }
});

Deno.test("listRelationships - handles missing dynamic section without crash", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const peoplePath = join(tempDir, "people");
    await Deno.mkdir(peoplePath);

    // Create a relationship file WITHOUT a [relationship.dynamic] section
    await Deno.writeTextFile(
      join(peoplePath, "bob.relationships.toml"),
      `[[relationship]]
with = "ctx://person/alice"
type = "collaborator"
status = "active"
since = "2025-01-01"
`,
    );

    // This should NOT crash — but it will if `rel.dynamic.summary` is accessed
    // on an entry where dynamic is undefined. This test exposes a real bug.
    try {
      const summaries = await listRelationships(tempDir);
      // If we get here without crashing, the bug is fixed.
      // With the fix, we should get 1 result with summary being undefined or empty.
      assertEquals(summaries.length, 1);
      assertEquals(summaries[0]!.type, "collaborator");
    } catch (err) {
      if (err instanceof TypeError && String(err).includes("Cannot read properties of undefined")) {
        throw new Error(
          "BUG: listRelationships crashes when dynamic section is missing. " +
            "Line 110 of relationships/mod.ts accesses rel.dynamic.summary unconditionally.",
        );
      }
      throw err;
    }
  } finally {
    await cleanup(tempDir);
  }
});

Deno.test("listRelationships - multiple person files aggregated correctly", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const peoplePath = join(tempDir, "people");
    await Deno.mkdir(peoplePath);

    await Deno.writeTextFile(
      join(peoplePath, "alice.relationships.toml"),
      `[[relationship]]
with = "ctx://person/bob"
type = "collaborator"
status = "active"
since = "2025-01-01"

[relationship.dynamic]
summary = "Working on frontend"
`,
    );

    await Deno.writeTextFile(
      join(peoplePath, "charlie.relationships.toml"),
      `[[relationship]]
with = "ctx://person/diana"
type = "mentor"
status = "active"
since = "2024-06-01"

[relationship.dynamic]
summary = "Mentoring on architecture"
`,
    );

    const summaries = await listRelationships(tempDir);

    assertEquals(summaries.length, 2, "should aggregate across multiple person files");
    const bob = summaries.find((s) => s.withId === "bob");
    const diana = summaries.find((s) => s.withId === "diana");
    assertExists(bob);
    assertExists(diana);
  } finally {
    await cleanup(tempDir);
  }
});

Deno.test("loadRelationships - typo in TOML key silently returns empty", async () => {
  const tempDir = await Deno.makeTempDir();
  try {
    const peoplePath = join(tempDir, "people");
    await Deno.mkdir(peoplePath);

    // Intentional typo: "relatioship" instead of "relationship"
    await Deno.writeTextFile(
      join(peoplePath, "typo.relationships.toml"),
      `[[relatioship]]
with = "ctx://person/someone"
type = "collaborator"
status = "active"
since = "2025-01-01"
`,
    );

    // This should NOT crash, but relationships will be empty
    // because parsed.relationship is undefined (the key is misspelled)
    const collection = await loadRelationships(tempDir, "typo");
    assertEquals(
      collection.relationships.length,
      0,
      "misspelled key should result in empty relationships (data silently lost)",
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
