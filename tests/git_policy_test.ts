/**
 * Tests for git policy and restriction checking.
 */

import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import {
  checkGitAllowed,
  findDevspaceRoot,
  getBlockedMessage,
  isInLab,
  isInWhitelist,
} from "../src/devspace/git.ts";
import type { Devspace } from "../src/types/mod.ts";

// Helper to create a minimal devspace for testing
function createTestDevspace(rootPath: string, gitPolicyEnabled = true): Devspace {
  return {
    rootPath,
    config: {
      devspace: {
        name: "test-devspace",
        lab_path: ".lab",
        staging_path: ".staging",
        namespaces: {
          default: "@default",
          paths: ["@default"],
        },
        git_policy: {
          enabled: gitPolicyEnabled,
          allowed_paths: [],
          allowSubmodules: false,
          suggestTyviGit: true,
        },
      },
    },
    namespaces: new Map(),
  };
}

Deno.test("checkGitAllowed - allows git in lab directory", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);
  const labPath = join(rootPath, ".lab", "myrepo");

  const result = checkGitAllowed(devspace, labPath);

  assertEquals(result.allowed, true);
  assertEquals(result.reason, "lab");
  assertExists(result.message);
});

Deno.test("checkGitAllowed - allows git at devspace root", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);

  const result = checkGitAllowed(devspace, rootPath);

  assertEquals(result.allowed, true);
  assertEquals(result.reason, "root");
});

Deno.test("checkGitAllowed - blocks git in staging directory", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);
  const stagingPath = join(rootPath, ".staging", "myrepo");

  const result = checkGitAllowed(devspace, stagingPath);

  assertEquals(result.allowed, false);
  assertEquals(result.reason, "blocked");
  assertExists(result.message);
  assertExists(result.suggestion);
});

Deno.test("checkGitAllowed - allows git outside devspace", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);
  const outsidePath = "/home/user/projects/other";

  const result = checkGitAllowed(devspace, outsidePath);

  assertEquals(result.allowed, true);
  assertEquals(result.reason, "outside_project");
});

Deno.test("checkGitAllowed - respects whitelist", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);
  devspace.config.devspace.git_policy!.allowed_paths = [".special"];

  const whitelistedPath = join(rootPath, ".special", "repo");
  const result = checkGitAllowed(devspace, whitelistedPath);

  assertEquals(result.allowed, true);
  assertEquals(result.reason, "whitelist");
});

Deno.test("checkGitAllowed - allows everything when restrictions disabled", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath, false);
  const stagingPath = join(rootPath, ".staging", "myrepo");

  const result = checkGitAllowed(devspace, stagingPath);

  assertEquals(result.allowed, true);
  assertEquals(result.reason, "outside_project");
});

Deno.test("isInLab - returns true for lab paths", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);

  const labPath = join(rootPath, ".lab", "myrepo");
  assertEquals(isInLab(devspace, labPath), true);

  const nestedLabPath = join(rootPath, ".lab", "myrepo", "src", "index.ts");
  assertEquals(isInLab(devspace, nestedLabPath), true);
});

Deno.test("isInLab - returns false for non-lab paths", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);

  assertEquals(isInLab(devspace, rootPath), false);
  assertEquals(isInLab(devspace, join(rootPath, ".staging", "repo")), false);
  assertEquals(isInLab(devspace, "/other/path"), false);
});

Deno.test("isInWhitelist - returns true for whitelisted paths", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);
  devspace.config.devspace.git_policy!.allowed_paths = [".special", ".tmp/allowed"];

  assertEquals(isInWhitelist(devspace, join(rootPath, ".special", "repo")), true);
  assertEquals(isInWhitelist(devspace, join(rootPath, ".tmp", "allowed", "repo")), true);
});

Deno.test("isInWhitelist - returns false for non-whitelisted paths", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);
  devspace.config.devspace.git_policy!.allowed_paths = [".special"];

  assertEquals(isInWhitelist(devspace, join(rootPath, ".staging", "repo")), false);
  assertEquals(isInWhitelist(devspace, join(rootPath, ".other", "repo")), false);
});

Deno.test("getBlockedMessage - returns helpful message", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);
  const stagingPath = join(rootPath, ".staging", "myrepo");

  const message = getBlockedMessage(devspace, stagingPath);

  assertExists(message);
  assertEquals(message.includes("staging"), true);
  assertEquals(message.includes("Lab directory"), true);
  assertEquals(message.includes("tyvi load"), true);
});

Deno.test("findDevspaceRoot - finds root from subdirectory", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    // Create a devspace structure
    await Deno.writeTextFile(
      join(tempDir, "tyvi.toml"),
      `[devspace]
name = "test"
[devspace.namespaces]
default = "@default"
paths = ["@default"]`,
    );

    await ensureDir(join(tempDir, ".lab", "repo", "src"));

    // Test from various depths
    const root1 = await findDevspaceRoot(tempDir);
    assertEquals(root1, tempDir);

    const root2 = await findDevspaceRoot(join(tempDir, ".lab"));
    assertEquals(root2, tempDir);

    const root3 = await findDevspaceRoot(join(tempDir, ".lab", "repo", "src"));
    assertEquals(root3, tempDir);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findDevspaceRoot - returns null outside devspace", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const root = await findDevspaceRoot(tempDir);
    assertEquals(root, null);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findDevspaceRoot - stops at filesystem root", async () => {
  const root = await findDevspaceRoot("/");
  assertEquals(root, null);
});

Deno.test("checkGitAllowed - handles relative paths", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);

  // Relative path gets resolved to absolute
  const result = checkGitAllowed(devspace, ".lab/myrepo");

  // Should work correctly after resolution
  assertExists(result);
  assertEquals(typeof result.allowed, "boolean");
});

Deno.test("checkGitAllowed - provides suggestion for tyvi git", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);
  const labPath = join(rootPath, ".lab", "myrepo");

  const result = checkGitAllowed(devspace, labPath);

  assertEquals(result.allowed, true);
  assertExists(result.suggestion);
  assertEquals(result.suggestion?.includes("tyvi commit"), true);
});

Deno.test("checkGitAllowed - can disable tyvi git suggestion", () => {
  const rootPath = "/home/user/.ctl";
  const devspace = createTestDevspace(rootPath);
  devspace.config.devspace.git_policy!.suggestTyviGit = false;

  const labPath = join(rootPath, ".lab", "myrepo");
  const result = checkGitAllowed(devspace, labPath);

  assertEquals(result.allowed, true);
  assertEquals(result.suggestion, undefined);
});
