/**
 * Tests for workspace operations.
 */

import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { loadWorkspace } from "../src/config/mod.ts";
import { getStatus } from "../src/devspace/mod.ts";

Deno.test("getStatus - lists all repos from inventory", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "valid-workspace");
  const workspace = await loadWorkspace(fixturePath);

  const repos = await getStatus(workspace);

  assertEquals(repos.length, 2);

  const repo1 = repos.find((r) => r.name === "test-repo-1");
  assertExists(repo1);
  assertEquals(repo1.namespace, "@default");
  assertEquals(repo1.cloneStatus, "missing");
  assertEquals(repo1.status, "active");

  const repo2 = repos.find((r) => r.name === "test-repo-2");
  assertExists(repo2);
  assertEquals(repo2.status, "stable");
});

Deno.test("getStatus - skips repos with local_path = false", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "valid-workspace");

  // Create a temporary inventory with local_path = false
  const tempDir = await Deno.makeTempDir();

  try {
    await Deno.writeTextFile(
      join(tempDir, "tyvi.toml"),
      `[workspace]
name = "test"
[workspace.namespaces]
default = "@test"
paths = ["@test"]`,
    );

    await Deno.mkdir(join(tempDir, "@test"));
    await Deno.writeTextFile(
      join(tempDir, "@test", "inventory.toml"),
      `[[repos]]
name = "skip-me"
remotes = [{ name = "origin", url = "git@github.com:test/repo.git" }]
local_path = false

[[repos]]
name = "include-me"
remotes = [{ name = "origin", url = "git@github.com:test/repo.git" }]`,
    );

    const workspace = await loadWorkspace(tempDir);
    const repos = await getStatus(workspace);

    assertEquals(repos.length, 1);
    assertEquals(repos[0]?.name, "include-me");
  } finally {
    // Cleanup - always runs even if test fails
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});
