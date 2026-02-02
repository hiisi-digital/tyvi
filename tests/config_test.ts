/**
 * Tests for config parsing.
 */

import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { loadWorkspace, parseInventoryConfig, parseWorkspaceConfig } from "../src/config/mod.ts";

Deno.test("parseWorkspaceConfig - valid config", () => {
  const content = `
[workspace]
name = "test-workspace"

[workspace.namespaces]
default = "@default"
paths = ["@default", "@other"]

[defaults]
clone_method = "ssh"
`;

  const config = parseWorkspaceConfig(content);

  assertEquals(config.workspace.name, "test-workspace");
  assertEquals(config.workspace.namespaces.default, "@default");
  assertEquals(config.workspace.namespaces.paths, ["@default", "@other"]);
  assertEquals(config.defaults?.clone_method, "ssh");
});

Deno.test("parseWorkspaceConfig - missing workspace section", () => {
  const content = `
[defaults]
clone_method = "ssh"
`;

  assertRejects(
    () => Promise.resolve(parseWorkspaceConfig(content)),
    Error,
    "missing [workspace] section",
  );
});

Deno.test("parseWorkspaceConfig - missing name", () => {
  const content = `
[workspace]
[workspace.namespaces]
default = "@default"
paths = ["@default"]
`;

  assertRejects(
    () => Promise.resolve(parseWorkspaceConfig(content)),
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

  assertRejects(
    () => Promise.resolve(parseInventoryConfig(content)),
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

Deno.test("loadWorkspace - valid workspace", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "valid-workspace");
  const workspace = await loadWorkspace(fixturePath);

  assertExists(workspace);
  assertEquals(workspace.config.workspace.name, "test-workspace");
  assertEquals(workspace.namespaces.size, 1);

  const inventory = workspace.namespaces.get("@default");
  assertExists(inventory);
  assertEquals(inventory.repos.length, 2);
});

Deno.test("loadWorkspace - minimal workspace", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "minimal-workspace");
  const workspace = await loadWorkspace(fixturePath);

  assertExists(workspace);
  assertEquals(workspace.config.workspace.name, "minimal");

  const inventory = workspace.namespaces.get("@default");
  assertExists(inventory);
  assertEquals(inventory.repos.length, 1);
  assertEquals(inventory.repos[0]?.name, "minimal-repo");
});

Deno.test("loadWorkspace - not found", async () => {
  await assertRejects(
    async () => await loadWorkspace("/nonexistent/path"),
    Error,
    "No tyvi.toml found",
  );
});
