/**
 * Tests for the cache system (hashing, storage, validation).
 *
 * @module
 */

import { assertEquals, assertNotEquals } from "@std/assert";
import { join } from "@std/path";
import {
  buildSourceHash,
  createEmptyStorage,
  getCacheEntry,
  hashDirectory,
  hashFile,
  pruneOldEntries,
  readCache,
  removeCacheEntry,
  setCacheEntry,
  shouldRunValidation,
  validateEntry,
  validateStorage,
  verifySourceHash,
  writeCache,
} from "../mod.ts";
import type { CacheEntry, ValidationSchedule } from "../mod.ts";

// ============================================================================
// Hashing Tests
// ============================================================================

Deno.test("hashFile - deterministic hash for same content", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const filePath = join(tmpDir, "test.txt");
    await Deno.writeTextFile(filePath, "hello world");

    const hash1 = await hashFile(filePath);
    const hash2 = await hashFile(filePath);

    assertEquals(hash1, hash2);
    assertEquals(hash1.length, 64); // SHA-256 hex = 64 chars
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("hashFile - different content produces different hash", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const file1 = join(tmpDir, "a.txt");
    const file2 = join(tmpDir, "b.txt");
    await Deno.writeTextFile(file1, "hello");
    await Deno.writeTextFile(file2, "world");

    const hash1 = await hashFile(file1);
    const hash2 = await hashFile(file2);

    assertNotEquals(hash1, hash2);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("hashDirectory - deterministic hash", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "a.txt"), "alpha");
    await Deno.writeTextFile(join(tmpDir, "b.txt"), "beta");

    const hash1 = await hashDirectory(tmpDir);
    const hash2 = await hashDirectory(tmpDir);

    assertEquals(hash1, hash2);
    assertEquals(hash1.length, 64);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("hashDirectory - changes when file content changes", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "a.txt"), "alpha");
    const hash1 = await hashDirectory(tmpDir);

    await Deno.writeTextFile(join(tmpDir, "a.txt"), "modified");
    const hash2 = await hashDirectory(tmpDir);

    assertNotEquals(hash1, hash2);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("buildSourceHash - constructs correct SourceHash", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "data.toml"), "key = 'value'");

    const withoutSection = await buildSourceHash("data.toml", tmpDir);
    assertEquals(withoutSection.file, "data.toml");
    assertEquals(withoutSection.section, undefined);
    assertEquals(withoutSection.hash.length, 64);

    const withSection = await buildSourceHash("data.toml", tmpDir, "traits");
    assertEquals(withSection.section, "traits");
    // Same file, same content — hash should match regardless of section
    assertEquals(withSection.hash, withoutSection.hash);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("verifySourceHash - valid hash returns true", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "data.toml"), "key = 'value'");
    const sourceHash = await buildSourceHash("data.toml", tmpDir);

    const valid = await verifySourceHash(sourceHash, tmpDir);

    assertEquals(valid, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("verifySourceHash - modified file returns false", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "data.toml"), "key = 'value'");
    const sourceHash = await buildSourceHash("data.toml", tmpDir);

    // Modify file
    await Deno.writeTextFile(join(tmpDir, "data.toml"), "key = 'changed'");

    const valid = await verifySourceHash(sourceHash, tmpDir);

    assertEquals(valid, false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("verifySourceHash - missing file returns false", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "data.toml"), "key = 'value'");
    const sourceHash = await buildSourceHash("data.toml", tmpDir);

    // Remove file
    await Deno.remove(join(tmpDir, "data.toml"));

    const valid = await verifySourceHash(sourceHash, tmpDir);

    assertEquals(valid, false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// ============================================================================
// Storage Tests
// ============================================================================

Deno.test("setCacheEntry - adds entry without mutating original", () => {
  const storage = createEmptyStorage();
  const updated = setCacheEntry(storage, "test-key", { data: 42 }, []);

  // New storage has the entry
  assertEquals(updated.count, 1);
  assertEquals(updated.entries.size, 1);
  assertEquals(updated.entries.has("test-key"), true);

  // Original is unmodified
  assertEquals(storage.count, 0);
  assertEquals(storage.entries.size, 0);
});

Deno.test("getCacheEntry - retrieves entry", () => {
  const storage = createEmptyStorage();
  const updated = setCacheEntry(storage, "test-key", { data: 42 }, []);

  const entry = getCacheEntry<{ data: number }>(updated, "test-key");

  assertEquals(entry !== null, true);
  assertEquals(entry!.value.data, 42);
  assertEquals(entry!.meta.version, 1);
});

Deno.test("getCacheEntry - returns null for missing key", () => {
  const storage = createEmptyStorage();

  const entry = getCacheEntry(storage, "nonexistent");

  assertEquals(entry, null);
});

Deno.test("removeCacheEntry - removes entry", () => {
  const storage = createEmptyStorage();
  const withEntry = setCacheEntry(storage, "test-key", "value", []);

  assertEquals(withEntry.count, 1);

  const removed = removeCacheEntry(withEntry, "test-key");

  assertEquals(removed.count, 0);
  assertEquals(removed.entries.has("test-key"), false);
});

Deno.test("readCache/writeCache - round trip", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const storage = createEmptyStorage();
    const withEntries = setCacheEntry(
      setCacheEntry(storage, "key1", "value1", []),
      "key2",
      { nested: true },
      [],
    );

    await writeCache(tmpDir, withEntries);
    const loaded = await readCache(tmpDir);

    assertEquals(loaded.count, 2);
    assertEquals(loaded.entries.size, 2);

    const entry1 = getCacheEntry<string>(loaded, "key1");
    assertEquals(entry1!.value, "value1");

    const entry2 = getCacheEntry<{ nested: boolean }>(loaded, "key2");
    assertEquals(entry2!.value.nested, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("readCache - returns empty for missing file", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const storage = await readCache(tmpDir);

    assertEquals(storage.count, 0);
    assertEquals(storage.entries.size, 0);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// ============================================================================
// Validation Tests
// ============================================================================

Deno.test("validateEntry - valid entry passes", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "data.toml"), "key = 'value'");
    const sourceHash = await buildSourceHash("data.toml", tmpDir);

    const entry: CacheEntry<string> = {
      value: "cached",
      meta: {
        created_at: new Date().toISOString(),
        computed_at: new Date().toISOString(),
        source_hashes: [sourceHash],
        last_validated: new Date().toISOString(),
        version: 1,
      },
    };

    const valid = await validateEntry(entry, tmpDir);

    assertEquals(valid, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("validateEntry - modified source fails", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "data.toml"), "key = 'value'");
    const sourceHash = await buildSourceHash("data.toml", tmpDir);

    const entry: CacheEntry<string> = {
      value: "cached",
      meta: {
        created_at: new Date().toISOString(),
        computed_at: new Date().toISOString(),
        source_hashes: [sourceHash],
        last_validated: new Date().toISOString(),
        version: 1,
      },
    };

    // Modify source
    await Deno.writeTextFile(join(tmpDir, "data.toml"), "key = 'changed'");

    const valid = await validateEntry(entry, tmpDir);

    assertEquals(valid, false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("validateStorage - removes invalid entries and updates last_validated", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(tmpDir, "good.toml"), "good = true");
    await Deno.writeTextFile(join(tmpDir, "bad.toml"), "bad = true");

    const goodHash = await buildSourceHash("good.toml", tmpDir);
    const badHash = await buildSourceHash("bad.toml", tmpDir);

    let storage = createEmptyStorage();
    storage = setCacheEntry(storage, "good", "good-value", [goodHash]);
    storage = setCacheEntry(storage, "bad", "bad-value", [badHash]);

    const originalValidated = getCacheEntry(storage, "good")!.meta.last_validated;

    assertEquals(storage.count, 2);

    // Small delay so last_validated timestamp differs
    await new Promise((r) => setTimeout(r, 10));

    // Modify the "bad" source file
    await Deno.writeTextFile(join(tmpDir, "bad.toml"), "bad = changed");

    const validated = await validateStorage(storage, tmpDir);

    // Invalid entry removed
    assertEquals(validated.count, 1);
    assertEquals(validated.entries.has("good"), true);
    assertEquals(validated.entries.has("bad"), false);

    // Valid entry's last_validated should be updated
    const updatedValidated = getCacheEntry(validated, "good")!.meta.last_validated;
    assertNotEquals(updatedValidated, originalValidated);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("shouldRunValidation - enabled with no lastRun returns true", () => {
  const schedule: ValidationSchedule = {
    daily: { enabled: true },
    weekly: { enabled: true },
    monthly: { enabled: true },
  };

  assertEquals(shouldRunValidation(schedule, "daily"), true);
  assertEquals(shouldRunValidation(schedule, "weekly"), true);
  assertEquals(shouldRunValidation(schedule, "monthly"), true);
});

Deno.test("shouldRunValidation - disabled returns false", () => {
  const schedule: ValidationSchedule = {
    daily: { enabled: false },
    weekly: { enabled: false },
    monthly: { enabled: false },
  };

  assertEquals(shouldRunValidation(schedule, "daily"), false);
  assertEquals(shouldRunValidation(schedule, "weekly"), false);
});

Deno.test("shouldRunValidation - recent run returns false", () => {
  const schedule: ValidationSchedule = {
    daily: { enabled: true, lastRun: new Date().toISOString() },
    weekly: { enabled: true, lastRun: new Date().toISOString() },
    monthly: { enabled: true, lastRun: new Date().toISOString() },
  };

  assertEquals(shouldRunValidation(schedule, "daily"), false);
  assertEquals(shouldRunValidation(schedule, "weekly"), false);
  assertEquals(shouldRunValidation(schedule, "monthly"), false);
});

Deno.test("shouldRunValidation - old run returns true", () => {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const schedule: ValidationSchedule = {
    daily: { enabled: true, lastRun: twoDaysAgo.toISOString() },
    weekly: { enabled: true, lastRun: twoDaysAgo.toISOString() },
    monthly: { enabled: true, lastRun: twoDaysAgo.toISOString() },
  };

  // 2 days old: daily should run, weekly/monthly should not
  assertEquals(shouldRunValidation(schedule, "daily"), true);
  assertEquals(shouldRunValidation(schedule, "weekly"), false);
  assertEquals(shouldRunValidation(schedule, "monthly"), false);
});

Deno.test("pruneOldEntries - removes old entries", () => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  let storage = createEmptyStorage();
  storage = setCacheEntry(storage, "recent", "new", []);

  // Manually create an old entry
  const oldEntry: CacheEntry<string> = {
    value: "old",
    meta: {
      created_at: new Date(now - 10 * oneDay).toISOString(),
      computed_at: new Date(now - 10 * oneDay).toISOString(),
      source_hashes: [],
      last_validated: new Date(now - 10 * oneDay).toISOString(),
      version: 1,
    },
  };
  storage.entries.set("old", oldEntry);
  storage = { ...storage, count: storage.entries.size };

  assertEquals(storage.count, 2);

  // Prune entries older than 5 days
  const pruned = pruneOldEntries(storage, 5 * oneDay);

  assertEquals(pruned.count, 1);
  assertEquals(pruned.entries.has("recent"), true);
  assertEquals(pruned.entries.has("old"), false);
  assertEquals(typeof pruned.last_pruned, "string");
});
