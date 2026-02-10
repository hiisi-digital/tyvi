/**
 * Tests for devspace migration operations.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { exists } from "@std/fs";
import { loadDevspace } from "../src/config/mod.ts";
import { deleteEntry, migrateRepo, scanDirectory, suggestNamespace } from "../src/devspace/mod.ts";
import type { Devspace } from "../src/types/mod.ts";

// ============================================================================
// Helpers
// ============================================================================

async function createTempDevspace(options?: {
  retainedPaths?: string[];
}): Promise<{ dir: string; devspace: Devspace }> {
  const dir = await Deno.makeTempDir();

  let retainedSection = "";
  if (options?.retainedPaths?.length) {
    const paths = options.retainedPaths.map((p) => `"${p}"`).join(", ");
    retainedSection = `\nretained_paths = [${paths}]`;
  }

  await Deno.writeTextFile(
    join(dir, "tyvi.toml"),
    `[devspace]
name = "test"
staging_path = ".staging"
lab_path = ".lab"
state_path = ".state"${retainedSection}
[devspace.namespaces]
default = "@test"
paths = ["@test"]`,
  );

  await Deno.mkdir(join(dir, "@test"));
  await Deno.writeTextFile(
    join(dir, "@test", "inventory.toml"),
    "# Repository inventory\n",
  );

  // Create standard directories
  for (const d of [".staging", ".lab", ".state"]) {
    await Deno.mkdir(join(dir, d));
  }

  const devspace = await loadDevspace(dir);
  return { dir, devspace };
}

async function initGitRepo(path: string): Promise<void> {
  await Deno.mkdir(path, { recursive: true });
  const init = new Deno.Command("git", {
    args: ["init"],
    cwd: path,
    stdout: "piped",
    stderr: "piped",
  });
  await init.output();

  // Configure git user for commits
  const configName = new Deno.Command("git", {
    args: ["config", "user.name", "Test"],
    cwd: path,
    stdout: "piped",
    stderr: "piped",
  });
  await configName.output();

  const configEmail = new Deno.Command("git", {
    args: ["config", "user.email", "test@test.com"],
    cwd: path,
    stdout: "piped",
    stderr: "piped",
  });
  await configEmail.output();

  // Make an initial commit so branch exists
  await Deno.writeTextFile(join(path, "README.md"), "test");
  const add = new Deno.Command("git", {
    args: ["add", "."],
    cwd: path,
    stdout: "piped",
    stderr: "piped",
  });
  await add.output();

  const commit = new Deno.Command("git", {
    args: ["commit", "-m", "init"],
    cwd: path,
    stdout: "piped",
    stderr: "piped",
  });
  await commit.output();
}

async function initGitRepoWithRemote(
  path: string,
  remoteUrl: string,
): Promise<void> {
  await initGitRepo(path);
  const addRemote = new Deno.Command("git", {
    args: ["remote", "add", "origin", remoteUrl],
    cwd: path,
    stdout: "piped",
    stderr: "piped",
  });
  await addRemote.output();
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================================
// suggestNamespace Tests
// ============================================================================

Deno.test("suggestNamespace - SSH URL", () => {
  assertEquals(
    suggestNamespace("git@github.com:orgrinrt/nutshell.git"),
    "@orgrinrt",
  );
});

Deno.test("suggestNamespace - HTTPS URL", () => {
  assertEquals(
    suggestNamespace("https://github.com/hiisi-platform/tyvi.git"),
    "@hiisi-platform",
  );
});

Deno.test("suggestNamespace - SSH URL with different host", () => {
  assertEquals(
    suggestNamespace("git@gitlab.com:myorg/repo.git"),
    "@myorg",
  );
});

Deno.test("suggestNamespace - falls back to @default", () => {
  assertEquals(suggestNamespace("local-path"), "@default");
  assertEquals(suggestNamespace(""), "@default");
});

// ============================================================================
// scanDirectory Tests
// ============================================================================

Deno.test("scanDirectory - discovers git repos and plain dirs", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    // Create a git repo
    await initGitRepoWithRemote(
      join(dir, "my-repo"),
      "git@github.com:orgrinrt/my-repo.git",
    );

    // Create a plain directory
    await Deno.mkdir(join(dir, "plain-dir"));

    // Create a file
    await Deno.writeTextFile(join(dir, "notes.txt"), "hello");

    const result = await scanDirectory(dir, devspace);

    // Find the git repo
    const repo = result.actionable.find((e) => e.name === "my-repo");
    assertExists(repo);
    assertEquals(repo.type, "git-repo");
    assertExists(repo.git);
    assertEquals(repo.git.suggestedNamespace, "@orgrinrt");
    assertEquals(repo.git.remotes.length, 1);
    assertEquals(repo.git.remotes[0]!.name, "origin");

    // Find the plain dir
    const plainDir = result.actionable.find((e) => e.name === "plain-dir");
    assertExists(plainDir);
    assertEquals(plainDir.type, "directory");

    // Find the file
    const file = result.actionable.find((e) => e.name === "notes.txt");
    assertExists(file);
    assertEquals(file.type, "file");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("scanDirectory - marks tyvi internals as auto-skipped", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const result = await scanDirectory(dir, devspace);

    // tyvi.toml, @test, .staging, .lab, .state should be auto-skipped
    const skippedNames = result.autoSkipped.map((e) => e.name).sort();
    assert(skippedNames.includes("tyvi.toml"));
    assert(skippedNames.includes("@test"));
    assert(skippedNames.includes(".staging"));
    assert(skippedNames.includes(".lab"));
    assert(skippedNames.includes(".state"));

    // None of these should be in actionable
    for (const name of ["tyvi.toml", "@test", ".staging", ".lab", ".state"]) {
      assertEquals(
        result.actionable.find((e) => e.name === name),
        undefined,
      );
    }
  } finally {
    await cleanup(dir);
  }
});

Deno.test("scanDirectory - marks retained_paths as auto-skipped", async () => {
  const { dir, devspace } = await createTempDevspace({
    retainedPaths: [".lib"],
  });
  try {
    await Deno.mkdir(join(dir, ".lib"));

    const result = await scanDirectory(dir, devspace);

    const lib = result.autoSkipped.find((e) => e.name === ".lib");
    assertExists(lib);
    assert(lib.isRetained);
    assert(!lib.isTyviInternal);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("scanDirectory - detects tyvi projects", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    // Create a subdirectory that is itself a tyvi project
    const nestedDir = join(dir, "other-devspace");
    await Deno.mkdir(nestedDir);
    await Deno.writeTextFile(
      join(nestedDir, "tyvi.toml"),
      `[devspace]\nname = "other"\n[devspace.namespaces]\ndefault = "@x"\npaths = ["@x"]`,
    );

    const result = await scanDirectory(dir, devspace);

    const tyviProj = result.actionable.find(
      (e) => e.name === "other-devspace",
    );
    assertExists(tyviProj);
    assertEquals(tyviProj.type, "tyvi-project");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("scanDirectory - handles empty directory", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const result = await scanDirectory(dir);

    assertEquals(result.entries.length, 0);
    assertEquals(result.autoSkipped.length, 0);
    assertEquals(result.actionable.length, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("scanDirectory - extracts git branch and status", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    await initGitRepo(join(dir, "clean-repo"));

    const result = await scanDirectory(dir, devspace);
    const repo = result.actionable.find((e) => e.name === "clean-repo");

    assertExists(repo);
    assertExists(repo.git);
    // Branch should be main or master depending on git default
    assert(
      repo.git.currentBranch === "main" ||
        repo.git.currentBranch === "master",
    );
    assertEquals(repo.git.gitStatus, "clean");
    assertExists(repo.git.lastActivity);
  } finally {
    await cleanup(dir);
  }
});

// ============================================================================
// migrateRepo Tests
// ============================================================================

Deno.test("migrateRepo - copy strategy copies to staging and adds to inventory", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    await initGitRepoWithRemote(
      join(dir, "my-repo"),
      "git@github.com:test/my-repo.git",
    );

    const result = await migrateRepo(devspace, {
      sourcePath: join(dir, "my-repo"),
      namespace: "@test",
      strategy: "copy",
    });

    assertEquals(result.action, "imported");
    assertEquals(result.namespace, "@test");

    // Verify copied to staging
    const stagingPath = join(dir, ".staging", "@test", "my-repo");
    assert(await exists(stagingPath));
    assert(await exists(join(stagingPath, "README.md")));

    // Source should still exist (copy, not move)
    assert(await exists(join(dir, "my-repo")));

    // Verify inventory was updated
    const inventory = await Deno.readTextFile(
      join(dir, "@test", "inventory.toml"),
    );
    assert(inventory.includes('name = "my-repo"'));
    assert(inventory.includes("git@github.com:test/my-repo.git"));
  } finally {
    await cleanup(dir);
  }
});

Deno.test("migrateRepo - move strategy moves to staging", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    await initGitRepoWithRemote(
      join(dir, "move-me"),
      "git@github.com:test/move-me.git",
    );

    const result = await migrateRepo(devspace, {
      sourcePath: join(dir, "move-me"),
      namespace: "@test",
      strategy: "move",
    });

    assertEquals(result.action, "imported");

    // Verify moved to staging
    assert(await exists(join(dir, ".staging", "@test", "move-me")));

    // Source should be gone
    assert(!await exists(join(dir, "move-me")));
  } finally {
    await cleanup(dir);
  }
});

Deno.test("migrateRepo - creates namespace dir if missing", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    await initGitRepo(join(dir, "new-repo"));

    const result = await migrateRepo(devspace, {
      sourcePath: join(dir, "new-repo"),
      namespace: "@neworg",
      strategy: "copy",
    });

    assertEquals(result.action, "imported");
    assertEquals(result.namespace, "@neworg");

    // Namespace dir and inventory should exist
    assert(await exists(join(dir, "@neworg", "inventory.toml")));

    // Repo should be in staging
    assert(await exists(join(dir, ".staging", "@neworg", "new-repo")));
  } finally {
    await cleanup(dir);
  }
});

Deno.test("migrateRepo - fails if target already exists", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    await initGitRepo(join(dir, "dup-repo"));

    // Pre-create target in staging
    await Deno.mkdir(join(dir, ".staging", "@test", "dup-repo"), {
      recursive: true,
    });

    const result = await migrateRepo(devspace, {
      sourcePath: join(dir, "dup-repo"),
      namespace: "@test",
      strategy: "copy",
    });

    assertEquals(result.action, "failed");
    assert(result.error!.includes("already exists"));
  } finally {
    await cleanup(dir);
  }
});

Deno.test("migrateRepo - with category and localPath", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    await initGitRepo(join(dir, "cat-repo"));

    const result = await migrateRepo(devspace, {
      sourcePath: join(dir, "cat-repo"),
      namespace: "@test",
      strategy: "copy",
      category: "tools",
      localPath: "tools/cat-repo",
    });

    assertEquals(result.action, "imported");

    // Verify staging path uses localPath
    assert(
      await exists(join(dir, ".staging", "@test", "tools", "cat-repo")),
    );

    // Verify inventory includes category and local_path
    const inventory = await Deno.readTextFile(
      join(dir, "@test", "inventory.toml"),
    );
    assert(inventory.includes('category = "tools"'));
    assert(inventory.includes('local_path = "tools/cat-repo"'));
  } finally {
    await cleanup(dir);
  }
});

// ============================================================================
// deleteEntry Tests
// ============================================================================

Deno.test("deleteEntry - removes directory recursively", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const targetDir = join(dir, "to-delete");
    await Deno.mkdir(join(targetDir, "sub"), { recursive: true });
    await Deno.writeTextFile(join(targetDir, "file.txt"), "content");

    const result = await deleteEntry(targetDir);

    assertEquals(result.action, "deleted");
    assertEquals(result.name, "to-delete");
    assert(!await exists(targetDir));
  } finally {
    await cleanup(dir);
  }
});

Deno.test("deleteEntry - removes file", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const filePath = join(dir, "stray-file.txt");
    await Deno.writeTextFile(filePath, "content");

    const result = await deleteEntry(filePath);

    assertEquals(result.action, "deleted");
    assert(!await exists(filePath));
  } finally {
    await cleanup(dir);
  }
});

Deno.test("deleteEntry - fails on non-existent path", async () => {
  const result = await deleteEntry("/tmp/does-not-exist-at-all-xyz");

  assertEquals(result.action, "failed");
  assertExists(result.error);
});
