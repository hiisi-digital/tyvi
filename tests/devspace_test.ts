/**
 * Tests for devspace operations.
 */

import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import { join, resolve } from "@std/path";
import { exists } from "@std/fs";
import { initDevspace, loadDevspace } from "../src/config/mod.ts";
import {
  addRepo,
  checkGitAllowed,
  getBlockedMessage,
  getStatus,
  load,
  readLabState,
  removeRepo,
  unload,
  writeLabState,
} from "../src/devspace/mod.ts";
import type { Devspace, LabState } from "../src/types/mod.ts";

// ============================================================================
// Helper: create a minimal temp devspace
// ============================================================================

async function createTempDevspace(options?: {
  labPath?: string;
  stagingPath?: string;
  statePath?: string;
  gitPolicy?: { enabled: boolean; allowed_paths: string[] };
}): Promise<{ dir: string; devspace: Devspace }> {
  const dir = await Deno.makeTempDir();
  const labPath = options?.labPath ?? ".lab";
  const stagingPath = options?.stagingPath ?? ".staging";
  const statePath = options?.statePath ?? ".state";

  let gitPolicySection = "";
  if (options?.gitPolicy) {
    const paths = options.gitPolicy.allowed_paths
      .map((p) => `"${p}"`)
      .join(", ");
    gitPolicySection = `
[devspace.git_policy]
enabled = ${options.gitPolicy.enabled}
allowed_paths = [${paths}]`;
  }

  await Deno.writeTextFile(
    join(dir, "tyvi.toml"),
    `[devspace]
name = "test"
lab_path = "${labPath}"
staging_path = "${stagingPath}"
state_path = "${statePath}"
[devspace.namespaces]
default = "@test"
paths = ["@test"]
${gitPolicySection}`,
  );

  await Deno.mkdir(join(dir, "@test"));
  await Deno.writeTextFile(
    join(dir, "@test", "inventory.toml"),
    `[[repos]]
name = "repo-a"
remotes = [{ name = "origin", url = "git@github.com:test/repo-a.git" }]

[[repos]]
name = "repo-b"
remotes = [{ name = "origin", url = "git@github.com:test/repo-b.git" }]`,
  );

  const devspace = await loadDevspace(dir);
  return { dir, devspace };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================================
// Status Tests (existing)
// ============================================================================

Deno.test("getStatus - lists all repos from inventory", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "valid-devspace");
  const devspace = await loadDevspace(fixturePath);

  const repos = await getStatus(devspace);

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
  const tempDir = await Deno.makeTempDir();

  try {
    await Deno.writeTextFile(
      join(tempDir, "tyvi.toml"),
      `[devspace]
name = "test"
[devspace.namespaces]
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

    const devspace = await loadDevspace(tempDir);
    const repos = await getStatus(devspace);

    assertEquals(repos.length, 1);
    assertEquals(repos[0]?.name, "include-me");
  } finally {
    await cleanup(tempDir);
  }
});

// ============================================================================
// State Tests
// ============================================================================

Deno.test("state - readLabState returns empty when file missing", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const state = await readLabState(devspace);
    assertEquals(state.repos.length, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("state - writeLabState and readLabState round-trip", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const state: LabState = {
      repos: [{
        name: "test-repo",
        namespace: "@test",
        loaded_at: "2025-02-01T00:00:00Z",
        staging_path: "@test/test-repo",
      }],
    };
    await writeLabState(devspace, state);
    const loaded = await readLabState(devspace);

    assertEquals(loaded.repos.length, 1);
    assertEquals(loaded.repos[0]!.name, "test-repo");
    assertEquals(loaded.repos[0]!.namespace, "@test");
    assertEquals(loaded.repos[0]!.staging_path, "@test/test-repo");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("state - loadDevspace populates labState", async () => {
  const { dir } = await createTempDevspace();
  try {
    // Write a state file before loading
    const stateDir = join(dir, ".state");
    await Deno.mkdir(stateDir, { recursive: true });
    await Deno.writeTextFile(
      join(stateDir, "lab.toml"),
      `[[repos]]
name = "loaded-repo"
namespace = "@test"
loaded_at = "2025-02-01T00:00:00Z"
staging_path = "@test/loaded-repo"`,
    );

    const devspace = await loadDevspace(dir);
    assertExists(devspace.labState);
    assertEquals(devspace.labState.repos.length, 1);
    assertEquals(devspace.labState.repos[0]!.name, "loaded-repo");
  } finally {
    await cleanup(dir);
  }
});

// ============================================================================
// Load Tests
// ============================================================================

Deno.test("load - creates symlink from staging to lab", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    // Create staging directory with a repo
    const stagingPath = join(dir, ".staging", "@test", "repo-a");
    await Deno.mkdir(stagingPath, { recursive: true });
    await Deno.writeTextFile(join(stagingPath, "README.md"), "test");

    const result = await load(devspace, { pattern: "repo-a" });

    assertEquals(result.loaded, ["repo-a"]);
    assertEquals(result.failed.length, 0);

    // Verify symlink exists
    const labPath = join(dir, ".lab", "repo-a");
    const stat = await Deno.lstat(labPath);
    assert(stat.isSymlink);

    // Verify state was updated
    const state = await readLabState(devspace);
    assertEquals(state.repos.length, 1);
    assertEquals(state.repos[0]!.name, "repo-a");
    assertEquals(state.repos[0]!.namespace, "@test");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("load - reports already loaded repos", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    // Create staging and load first time
    const stagingPath = join(dir, ".staging", "@test", "repo-a");
    await Deno.mkdir(stagingPath, { recursive: true });
    await Deno.writeTextFile(join(stagingPath, "README.md"), "test");

    await load(devspace, { pattern: "repo-a" });

    // Try loading again
    const result = await load(devspace, { pattern: "repo-a" });
    assertEquals(result.loaded.length, 0);
    assertEquals(result.alreadyLoaded, ["repo-a"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("load - fails when repo not in staging", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const result = await load(devspace, { pattern: "repo-a" });

    assertEquals(result.loaded.length, 0);
    assertEquals(result.failed.length, 1);
    assertEquals(result.failed[0]!.name, "repo-a");
    assert(result.failed[0]!.error.includes("not cloned"));
  } finally {
    await cleanup(dir);
  }
});

Deno.test("load - loads all repos with all flag", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    // Create both repos in staging
    for (const name of ["repo-a", "repo-b"]) {
      const stagingPath = join(dir, ".staging", "@test", name);
      await Deno.mkdir(stagingPath, { recursive: true });
      await Deno.writeTextFile(join(stagingPath, "README.md"), "test");
    }

    const result = await load(devspace, { all: true });

    assertEquals(result.loaded.length, 2);
    assert(result.loaded.includes("repo-a"));
    assert(result.loaded.includes("repo-b"));
  } finally {
    await cleanup(dir);
  }
});

Deno.test("load - uses config-driven lab path", async () => {
  const { dir, devspace } = await createTempDevspace({ labPath: "../.mylab" });
  try {
    const stagingPath = join(dir, ".staging", "@test", "repo-a");
    await Deno.mkdir(stagingPath, { recursive: true });
    await Deno.writeTextFile(join(stagingPath, "README.md"), "test");

    const result = await load(devspace, { pattern: "repo-a" });

    assertEquals(result.loaded, ["repo-a"]);
    // Lab path should be the sibling directory
    assertEquals(result.labPath, resolve(dir, "../.mylab"));

    // Verify symlink at the custom lab path
    const labPath = join(resolve(dir, "../.mylab"), "repo-a");
    const stat = await Deno.lstat(labPath);
    assert(stat.isSymlink);
  } finally {
    // Clean up both the devspace and the sibling lab
    await cleanup(resolve(dir, "../.mylab"));
    await cleanup(dir);
  }
});

// ============================================================================
// Unload Tests
// ============================================================================

Deno.test("unload - removes symlink and updates state", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    // Set up: create staging dir and load a repo
    const stagingPath = join(dir, ".staging", "@test", "repo-a");
    await Deno.mkdir(stagingPath, { recursive: true });
    await Deno.writeTextFile(join(stagingPath, "README.md"), "test");
    await load(devspace, { pattern: "repo-a" });

    // Verify it's loaded
    const stateBefore = await readLabState(devspace);
    assertEquals(stateBefore.repos.length, 1);

    // Unload
    const result = await unload(devspace, { pattern: "repo-a" });

    assertEquals(result.unloaded, ["repo-a"]);
    assertEquals(result.refused.length, 0);

    // Verify symlink is gone
    const labPath = join(dir, ".lab", "repo-a");
    try {
      await Deno.lstat(labPath);
      assert(false, "symlink should have been removed");
    } catch (err) {
      assert(err instanceof Deno.errors.NotFound);
    }

    // Verify state is empty
    const stateAfter = await readLabState(devspace);
    assertEquals(stateAfter.repos.length, 0);

    // Verify staging dir still exists
    const stagingStat = await Deno.stat(stagingPath);
    assert(stagingStat.isDirectory);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("unload - cleans stale state entries", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    // Write state pointing to non-existent lab path
    const state: LabState = {
      repos: [{
        name: "ghost-repo",
        namespace: "@test",
        loaded_at: "2025-01-01T00:00:00Z",
        staging_path: "@test/ghost-repo",
      }],
    };
    await writeLabState(devspace, state);

    const result = await unload(devspace, { pattern: "ghost" });

    assertEquals(result.unloaded, ["ghost-repo"]);
    assertEquals(result.refused.length, 0);

    // State should be cleaned up
    const stateAfter = await readLabState(devspace);
    assertEquals(stateAfter.repos.length, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("unload - no-op without pattern or all flag", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    // Load a repo
    const stagingPath = join(dir, ".staging", "@test", "repo-a");
    await Deno.mkdir(stagingPath, { recursive: true });
    await Deno.writeTextFile(join(stagingPath, "README.md"), "test");
    await load(devspace, { pattern: "repo-a" });

    // Try unload without pattern or all
    const result = await unload(devspace);

    assertEquals(result.unloaded.length, 0);
    assertEquals(result.refused.length, 0);

    // Still loaded
    const state = await readLabState(devspace);
    assertEquals(state.repos.length, 1);
  } finally {
    await cleanup(dir);
  }
});

// ============================================================================
// Git Restrictions Tests
// ============================================================================

Deno.test("restrictions - allows in lab path", async () => {
  const { dir, devspace } = await createTempDevspace({
    gitPolicy: { enabled: true, allowed_paths: [] },
  });
  try {
    const labPath = resolve(dir, ".lab", "some-repo");
    const result = checkGitAllowed(devspace, labPath);

    assert(result.allowed);
    assertEquals(result.reason, "lab");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("restrictions - allows at devspace root", async () => {
  const { dir, devspace } = await createTempDevspace({
    gitPolicy: { enabled: true, allowed_paths: [] },
  });
  try {
    const result = checkGitAllowed(devspace, dir);

    assert(result.allowed);
    assertEquals(result.reason, "root");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("restrictions - blocks in staging", async () => {
  const { dir, devspace } = await createTempDevspace({
    gitPolicy: { enabled: true, allowed_paths: [] },
  });
  try {
    const stagingPath = resolve(dir, ".staging", "@test", "some-repo");
    const result = checkGitAllowed(devspace, stagingPath);

    assert(!result.allowed);
    assertEquals(result.reason, "blocked");
    assertExists(result.message);
    assertExists(result.suggestion);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("restrictions - allows outside project", async () => {
  const { dir, devspace } = await createTempDevspace({
    gitPolicy: { enabled: true, allowed_paths: [] },
  });
  try {
    const result = checkGitAllowed(devspace, "/tmp/somewhere/else");

    assert(result.allowed);
    assertEquals(result.reason, "outside_project");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("restrictions - respects whitelist", async () => {
  const { dir, devspace } = await createTempDevspace({
    gitPolicy: { enabled: true, allowed_paths: [".staging/@test/special"] },
  });
  try {
    const specialPath = resolve(dir, ".staging", "@test", "special");
    const result = checkGitAllowed(devspace, specialPath);

    assert(result.allowed);
    assertEquals(result.reason, "whitelist");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("restrictions - disabled policy allows everything", async () => {
  const { dir, devspace } = await createTempDevspace({
    gitPolicy: { enabled: false, allowed_paths: [] },
  });
  try {
    const stagingPath = resolve(dir, ".staging", "anything");
    const result = checkGitAllowed(devspace, stagingPath);

    assert(result.allowed);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("restrictions - sibling lab path works", async () => {
  const { dir, devspace } = await createTempDevspace({
    labPath: "../.lab",
    gitPolicy: { enabled: true, allowed_paths: [] },
  });
  try {
    const labPath = resolve(dir, "../.lab", "some-repo");
    const result = checkGitAllowed(devspace, labPath);

    assert(result.allowed);
    assertEquals(result.reason, "lab");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("restrictions - getBlockedMessage includes alternatives", async () => {
  const { dir, devspace } = await createTempDevspace({
    gitPolicy: { enabled: true, allowed_paths: [] },
  });
  try {
    const message = getBlockedMessage(
      devspace,
      resolve(dir, ".staging", "repo"),
    );

    assert(message.includes("blocked"));
    assert(message.includes("tyvi load"));
    assert(message.includes("Allowed locations"));
  } finally {
    await cleanup(dir);
  }
});

// ============================================================================
// Init Tests
// ============================================================================

Deno.test("initDevspace - creates tyvi.toml and directories", async () => {
  const dir = await Deno.makeTempDir();
  const rootPath = join(dir, "new-devspace");
  try {
    const result = await initDevspace(rootPath, {
      name: "test-devspace",
    });

    assertEquals(result.rootPath, resolve(rootPath));
    assert(await exists(result.configPath));

    // Verify tyvi.toml can be loaded
    const devspace = await loadDevspace(rootPath);
    assertEquals(devspace.config.devspace.name, "test-devspace");

    // Verify default namespace directory
    assert(await exists(join(rootPath, "@default")));
    assert(await exists(join(rootPath, "@default", "inventory.toml")));

    // Verify standard directories
    assert(await exists(resolve(rootPath, ".lab")));
    assert(await exists(resolve(rootPath, ".staging")));
    assert(await exists(resolve(rootPath, ".state")));
    assert(await exists(resolve(rootPath, ".tmp")));
  } finally {
    await cleanup(dir);
  }
});

Deno.test("initDevspace - custom namespaces and paths", async () => {
  const dir = await Deno.makeTempDir();
  const rootPath = join(dir, "custom");
  try {
    const result = await initDevspace(rootPath, {
      name: "custom-devspace",
      namespaces: ["@org", "@personal"],
      defaultNamespace: "@org",
      labPath: "../.mylab",
      stagingPath: "repos",
      statePath: ".data/state",
      tmpPath: ".data/tmp",
    });

    // Verify namespace dirs
    assert(await exists(join(rootPath, "@org", "inventory.toml")));
    assert(await exists(join(rootPath, "@personal", "inventory.toml")));

    // Verify custom paths
    assert(await exists(resolve(rootPath, "../.mylab")));
    assert(await exists(join(rootPath, "repos")));
    assert(await exists(join(rootPath, ".data", "state")));
    assert(await exists(join(rootPath, ".data", "tmp")));

    // Verify config loads with correct values
    const devspace = await loadDevspace(rootPath);
    assertEquals(devspace.config.devspace.lab_path, "../.mylab");
    assertEquals(devspace.config.devspace.staging_path, "repos");
    assertEquals(devspace.config.devspace.namespaces?.default, "@org");
    assertEquals(devspace.config.devspace.namespaces?.paths, ["@org", "@personal"]);

    // created list includes all dirs
    assert(result.created.includes("@org"));
    assert(result.created.includes("@personal"));
    assert(result.created.includes("../.mylab"));
    assert(result.created.includes("repos"));
  } finally {
    await cleanup(resolve(rootPath, "../.mylab"));
    await cleanup(dir);
  }
});

Deno.test("initDevspace - refuses if tyvi.toml already exists", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(dir, "tyvi.toml"), "# existing");

    await assertRejects(
      () => initDevspace(dir, { name: "test" }),
      Error,
      "already exists",
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("initDevspace - creates loadable devspace (init → load round-trip)", async () => {
  const dir = await Deno.makeTempDir();
  const rootPath = join(dir, "roundtrip");
  try {
    await initDevspace(rootPath, { name: "roundtrip-test" });

    // The critical test: can we loadDevspace immediately after init?
    // initDevspace creates empty inventory files ("# Repository inventory\n")
    // which have no [[repos]] entries. loadDevspace must handle this gracefully.
    const devspace = await loadDevspace(rootPath);

    assertEquals(devspace.config.devspace.name, "roundtrip-test");
    // Should have loaded the namespace but with 0 repos (empty inventory)
    // If this crashes, it means empty inventories aren't handled.
    const inventory = devspace.namespaces.get("@default");
    // inventory may be undefined if empty inventory isn't loadable, OR
    // it may exist with 0 repos. Either is acceptable, but a crash is not.
    if (inventory) {
      assertEquals(inventory.repos.length, 0);
    }
  } finally {
    await cleanup(dir);
  }
});

Deno.test("initDevspace - with git policy enabled", async () => {
  const dir = await Deno.makeTempDir();
  const rootPath = join(dir, "with-git");
  try {
    await initDevspace(rootPath, {
      name: "git-devspace",
      gitPolicy: true,
      gitAllowedPaths: ["scripts", ".ci"],
    });

    const devspace = await loadDevspace(rootPath);
    assertExists(devspace.config.devspace.git_policy);
    assertEquals(devspace.config.devspace.git_policy!.enabled, true);
    assertEquals(devspace.config.devspace.git_policy!.allowed_paths, ["scripts", ".ci"]);
  } finally {
    await cleanup(dir);
  }
});

// ============================================================================
// Symlink Target Verification Tests
// ============================================================================

Deno.test("load - symlink points to correct staging directory", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const stagingPath = join(dir, ".staging", "@test", "repo-a");
    await Deno.mkdir(stagingPath, { recursive: true });
    await Deno.writeTextFile(join(stagingPath, "README.md"), "test content");

    await load(devspace, { pattern: "repo-a" });

    const labPath = join(dir, ".lab", "repo-a");
    // Verify symlink TARGET is the staging directory
    const target = await Deno.readLink(labPath);
    assertEquals(target, stagingPath, "symlink should point to staging dir");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("load - content accessible through symlink", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const stagingPath = join(dir, ".staging", "@test", "repo-a");
    await Deno.mkdir(stagingPath, { recursive: true });
    await Deno.writeTextFile(join(stagingPath, "README.md"), "hello from staging");

    await load(devspace, { pattern: "repo-a" });

    // Read through the symlink — if symlink points wrong, this fails
    const labReadme = join(dir, ".lab", "repo-a", "README.md");
    const content = await Deno.readTextFile(labReadme);
    assertEquals(content, "hello from staging");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("load - namespace filter works", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const stagingPath = join(dir, ".staging", "@test", "repo-a");
    await Deno.mkdir(stagingPath, { recursive: true });
    await Deno.writeTextFile(join(stagingPath, "README.md"), "test");

    // Filter by wrong namespace — should load nothing
    const result = await load(devspace, { namespace: "@other" });
    assertEquals(result.loaded.length, 0);

    // Filter by correct namespace — should try to load both repos
    // but only repo-a has staging dir, repo-b fails
    const result2 = await load(devspace, { namespace: "@test" });
    assertEquals(result2.loaded.length, 1);
    assertEquals(result2.loaded[0], "repo-a");
    assertEquals(result2.failed.length, 1);
    assertEquals(result2.failed[0]?.name, "repo-b");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("load + unload - round-trip preserves staging integrity", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const stagingPath = join(dir, ".staging", "@test", "repo-a");
    await Deno.mkdir(stagingPath, { recursive: true });
    await Deno.writeTextFile(join(stagingPath, "README.md"), "original content");
    await Deno.writeTextFile(join(stagingPath, "src.ts"), "export const x = 1;");

    // Load
    await load(devspace, { pattern: "repo-a" });

    // Verify lab has content
    const labPath = join(dir, ".lab", "repo-a");
    assert(await exists(labPath), "lab symlink should exist");

    // Unload
    await unload(devspace, { pattern: "repo-a" });

    // Lab should be gone
    assertEquals(await exists(labPath), false, "lab symlink should be removed");

    // Staging should still have all files
    const readme = await Deno.readTextFile(join(stagingPath, "README.md"));
    assertEquals(readme, "original content");
    const src = await Deno.readTextFile(join(stagingPath, "src.ts"));
    assertEquals(src, "export const x = 1;");

    // State should be clean
    const state = await readLabState(devspace);
    assertEquals(state.repos.length, 0);
  } finally {
    await cleanup(dir);
  }
});

// ============================================================================
// addRepo Tests
// ============================================================================

Deno.test("addRepo - appends repo to inventory", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    await addRepo(devspace, "git@github.com:org/new-repo.git", {
      name: "new-repo",
    });

    // Re-read inventory and verify
    const reloaded = await loadDevspace(dir);
    const inventory = reloaded.namespaces.get("@test");
    assertExists(inventory);
    const newRepo = inventory.repos.find((r) => r.name === "new-repo");
    assertExists(newRepo, "new repo should be in inventory");
    assertEquals(newRepo.remotes[0]?.url, "git@github.com:org/new-repo.git");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("addRepo - extracts name from URL", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    await addRepo(devspace, "git@github.com:org/extracted-name.git");

    const reloaded = await loadDevspace(dir);
    const inventory = reloaded.namespaces.get("@test");
    assertExists(inventory);
    const repo = inventory.repos.find((r) => r.name === "extracted-name");
    assertExists(repo, "should extract 'extracted-name' from URL");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("addRepo - with category sets local_path", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    await addRepo(devspace, "git@github.com:org/lib.git", {
      name: "lib",
      category: "libraries",
    });

    const reloaded = await loadDevspace(dir);
    const inventory = reloaded.namespaces.get("@test");
    assertExists(inventory);
    const repo = inventory.repos.find((r) => r.name === "lib");
    assertExists(repo);
    assertEquals(repo.local_path, "libraries/lib");
    assertEquals(repo.category, "libraries");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("addRepo - rejects invalid repo names", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    await assertRejects(
      () => addRepo(devspace, "git@github.com:org/repo.git", { name: "bad name with spaces" }),
      Error,
      "Invalid repository name",
    );

    await assertRejects(
      () => addRepo(devspace, "git@github.com:org/repo.git", { name: "bad/name" }),
      Error,
      "Invalid repository name",
    );
  } finally {
    await cleanup(dir);
  }
});

// ============================================================================
// removeRepo Tests
// ============================================================================

Deno.test("removeRepo - removes repo from inventory", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const result = await removeRepo(devspace, "repo-a");
    assertEquals(result, true);

    // Verify repo-a is gone but repo-b remains
    const reloaded = await loadDevspace(dir);
    const inventory = reloaded.namespaces.get("@test");
    assertExists(inventory);
    assertEquals(inventory.repos.length, 1);
    assertEquals(inventory.repos[0]?.name, "repo-b");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("removeRepo - returns false for nonexistent repo", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const result = await removeRepo(devspace, "nonexistent");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("removeRepo - handles repo at end of file", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    // Remove repo-b (last entry in the file)
    const result = await removeRepo(devspace, "repo-b");
    assertEquals(result, true);

    const reloaded = await loadDevspace(dir);
    const inventory = reloaded.namespaces.get("@test");
    assertExists(inventory);
    assertEquals(inventory.repos.length, 1);
    assertEquals(inventory.repos[0]?.name, "repo-a");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("removeRepo - doesn't remove partial name match", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(dir, "tyvi.toml"),
      `[devspace]
name = "test"
[devspace.namespaces]
default = "@ns"
paths = ["@ns"]`,
    );
    await Deno.mkdir(join(dir, "@ns"));
    await Deno.writeTextFile(
      join(dir, "@ns", "inventory.toml"),
      `[[repos]]
name = "foo"
remotes = [{ name = "origin", url = "git@github.com:test/foo.git" }]

[[repos]]
name = "foobar"
remotes = [{ name = "origin", url = "git@github.com:test/foobar.git" }]`,
    );

    const devspace = await loadDevspace(dir);
    await removeRepo(devspace, "foo");

    const reloaded = await loadDevspace(dir);
    const inventory = reloaded.namespaces.get("@ns");
    assertExists(inventory);
    assertEquals(inventory.repos.length, 1);
    assertEquals(inventory.repos[0]?.name, "foobar", "foobar should not be removed");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("removeRepo - with deleteFiles removes directory", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    // Create the repo directory
    const repoDir = join(dir, "@test", "repo-a");
    await Deno.mkdir(repoDir, { recursive: true });
    await Deno.writeTextFile(join(repoDir, "file.txt"), "content");

    const result = await removeRepo(devspace, "repo-a", { deleteFiles: true });
    assertEquals(result, true);

    // Directory should be gone
    assertEquals(await exists(repoDir), false, "repo directory should be deleted");
  } finally {
    await cleanup(dir);
  }
});
