/**
 * Tests for config parsing.
 */

import { assertEquals, assertExists, assertRejects, assertThrows } from "@std/assert";
import { join } from "@std/path";
import { loadDevspace, parseDevspaceConfig, parseInventoryConfig } from "../src/config/mod.ts";

Deno.test("parseDevspaceConfig - valid config", () => {
  const content = `
[devspace]
name = "test-devspace"

[devspace.namespaces]
default = "@default"
paths = ["@default", "@other"]

[defaults]
clone_method = "ssh"
`;

  const config = parseDevspaceConfig(content);

  assertEquals(config.devspace.name, "test-devspace");
  assertEquals(config.devspace.namespaces?.default, "@default");
  assertEquals(config.devspace.namespaces?.paths, ["@default", "@other"]);
  assertEquals(config.defaults?.clone_method, "ssh");
});

Deno.test("parseDevspaceConfig - missing devspace section", () => {
  const content = `
[defaults]
clone_method = "ssh"
`;

  assertThrows(
    () => parseDevspaceConfig(content),
    Error,
    "missing [devspace] section",
  );
});

Deno.test("parseDevspaceConfig - missing name", () => {
  const content = `
[devspace]
[devspace.namespaces]
default = "@default"
paths = ["@default"]
`;

  assertThrows(
    () => parseDevspaceConfig(content),
    Error,
    "missing required 'name' field",
  );
});

Deno.test("parseInventoryConfig - valid config", () => {
  const content = `
[meta]
description = "Test inventory"

[meta.defaults]
language = "typescript"
keep_in_sync = true

[[repos]]
name = "test-repo"
remotes = [{ name = "origin", url = "git@github.com:test/repo.git" }]
local_path = "apps/test-repo"
status = "active"
`;

  const config = parseInventoryConfig(content);

  assertEquals(config.meta?.description, "Test inventory");
  assertEquals(config.meta?.defaults?.language, "typescript");
  assertEquals(config.repos.length, 1);
  assertEquals(config.repos[0]?.name, "test-repo");
  assertEquals(config.repos[0]?.status, "active");
  assertEquals(config.repos[0]?.keep_in_sync, true);
});

Deno.test("parseInventoryConfig - missing required fields", () => {
  const content = `
[[repos]]
remotes = [{ name = "origin", url = "git@github.com:test/repo.git" }]
`;

  assertThrows(
    () => parseInventoryConfig(content),
    Error,
    "missing required 'name' field",
  );
});

Deno.test("parseInventoryConfig - applies defaults from meta", () => {
  const content = `
[meta.defaults]
status = "stable"
language = "rust"
keep_in_sync = false

[[repos]]
name = "test-repo"
remotes = [{ name = "origin", url = "git@github.com:test/repo.git" }]
`;

  const config = parseInventoryConfig(content);

  assertEquals(config.repos[0]?.status, "stable");
  assertEquals(config.repos[0]?.language, "rust");
  assertEquals(config.repos[0]?.keep_in_sync, false);
});

Deno.test("loadDevspace - valid devspace", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "valid-devspace");
  const devspace = await loadDevspace(fixturePath);

  assertExists(devspace);
  assertEquals(devspace.config.devspace.name, "test-devspace");
  assertEquals(devspace.namespaces.size, 1);

  const inventory = devspace.namespaces.get("@default");
  assertExists(inventory);
  assertEquals(inventory.repos.length, 2);
});

Deno.test("loadDevspace - minimal devspace", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "minimal-devspace");
  const devspace = await loadDevspace(fixturePath);

  assertExists(devspace);
  assertEquals(devspace.config.devspace.name, "minimal");

  const inventory = devspace.namespaces.get("@default");
  assertExists(inventory);
  assertEquals(inventory.repos.length, 1);
  assertEquals(inventory.repos[0]?.name, "minimal-repo");
});

Deno.test("loadDevspace - not found", async () => {
  await assertRejects(
    async () => await loadDevspace("/nonexistent/path"),
    Error,
    "No tyvi.toml found",
  );
});

// ============================================================================
// Backward Compatibility Tests
// ============================================================================

Deno.test("parseDevspaceConfig - [workspace] backward compat parses correctly", () => {
  const content = `
[workspace]
name = "legacy-project"

[workspace.namespaces]
default = "@legacy"
paths = ["@legacy"]
`;

  const config = parseDevspaceConfig(content);

  assertEquals(config.devspace.name, "legacy-project");
  assertEquals(config.devspace.namespaces?.default, "@legacy");
  assertEquals(config.devspace.namespaces?.paths, ["@legacy"]);
});

Deno.test("parseDevspaceConfig - [workspace] with git_policy", () => {
  const content = `
[workspace]
name = "legacy-guarded"

[workspace.namespaces]
default = "@default"
paths = ["@default"]

[workspace.git_policy]
enabled = true
allowed_paths = [".ci"]
`;

  const config = parseDevspaceConfig(content);

  assertExists(config.devspace.git_policy);
  assertEquals(config.devspace.git_policy!.enabled, true);
  assertEquals(config.devspace.git_policy!.allowed_paths, [".ci"]);
});

// ============================================================================
// Empty Inventory Tests
// ============================================================================

Deno.test("parseInventoryConfig - empty inventory (no [[repos]]) throws", () => {
  const content = `# Repository inventory
`;

  assertThrows(
    () => parseInventoryConfig(content),
    Error,
    "missing or invalid [[repos]] entries",
  );
});

Deno.test("parseInventoryConfig - meta defaults don't override explicit repo values", () => {
  const content = `
[meta.defaults]
status = "stable"
language = "rust"
keep_in_sync = false

[[repos]]
name = "explicit-repo"
remotes = [{ name = "origin", url = "git@github.com:test/repo.git" }]
status = "active"
language = "typescript"
keep_in_sync = true
`;

  const config = parseInventoryConfig(content);

  assertEquals(config.repos[0]?.status, "active", "explicit status should win");
  assertEquals(config.repos[0]?.language, "typescript", "explicit language should win");
  assertEquals(config.repos[0]?.keep_in_sync, true, "explicit keep_in_sync should win");
});
