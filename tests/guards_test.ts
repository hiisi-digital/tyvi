/**
 * Tests for git guard modules: shell, direnv, hooks, and validation.
 */

import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import { join, resolve } from "@std/path";
import { exists } from "@std/fs";
import { loadDevspace } from "../src/config/mod.ts";
import { appendToRcFile, generateShellInit, writeShellInit } from "../src/devspace/shell.ts";
import { generateEnvrc, writeEnvrc } from "../src/devspace/direnv.ts";
import { generateHook, hasHooks, installHooks, removeHooks } from "../src/devspace/hooks.ts";
import { validateGuards } from "../src/devspace/validation.ts";
import type { Devspace } from "../src/types/mod.ts";

// ============================================================================
// Helpers
// ============================================================================

async function createTempDevspace(options?: {
  labPath?: string;
  gitPolicy?: { enabled: boolean; allowed_paths: string[] };
  initGit?: boolean;
}): Promise<{ dir: string; devspace: Devspace }> {
  const dir = await Deno.makeTempDir();
  const labPath = options?.labPath ?? ".lab";

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
staging_path = ".staging"
state_path = ".state"
[devspace.namespaces]
default = "@test"
paths = ["@test"]
${gitPolicySection}`,
  );

  await Deno.mkdir(join(dir, "@test"));
  await Deno.writeTextFile(
    join(dir, "@test", "inventory.toml"),
    "# Repository inventory\n",
  );

  // Create standard directories
  for (const d of [".staging", labPath, ".state"]) {
    await Deno.mkdir(resolve(dir, d), { recursive: true });
  }

  if (options?.initGit) {
    const cmd = new Deno.Command("git", {
      args: ["init"],
      cwd: dir,
      stdout: "null",
      stderr: "null",
    });
    await cmd.output();
  }

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
// Shell Integration Tests
// ============================================================================

Deno.test("generateShellInit - bash script contains root and lab paths", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const script = generateShellInit(devspace, "bash");

    const rootPath = resolve(dir);
    const labPath = resolve(dir, ".lab");

    assert(script.includes(rootPath), "should contain root path");
    assert(script.includes(labPath), "should contain lab path");
    assert(script.includes("case"), "should use case statement");
    assert(script.includes("git()"), "should define git function");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("generateShellInit - fish script uses switch syntax", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const script = generateShellInit(devspace, "fish");

    assert(script.includes("function git"), "should define fish function");
    assert(script.includes("switch"), "should use fish switch");
    assert(script.includes("command git $argv"), "should use fish argv");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("generateShellInit - includes whitelist paths", async () => {
  const { dir, devspace } = await createTempDevspace({
    gitPolicy: { enabled: true, allowed_paths: [".staging/@test/special"] },
  });
  try {
    const script = generateShellInit(devspace, "bash");

    const specialPath = resolve(dir, ".staging/@test/special");
    assert(script.includes(specialPath), "should contain whitelist path");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("writeShellInit - creates shell/init.sh", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const scriptPath = await writeShellInit(devspace);

    assert(await exists(scriptPath), "script file should exist");
    assert(scriptPath.endsWith(".sh") || scriptPath.endsWith(".fish"));

    const content = await Deno.readTextFile(scriptPath);
    assert(content.includes("tyvi git guard"), "should contain marker");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("appendToRcFile - adds source line to existing file", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const rcFile = join(dir, ".zshrc");
    await Deno.writeTextFile(rcFile, "# existing config\n");

    await appendToRcFile(rcFile, "/path/to/init.sh");

    const content = await Deno.readTextFile(rcFile);
    assert(content.includes("# existing config"), "should preserve existing");
    assert(content.includes("/path/to/init.sh"), "should add source line");
    assert(content.includes("tyvi git guard"), "should include marker");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("appendToRcFile - is idempotent", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const rcFile = join(dir, ".zshrc");
    await Deno.writeTextFile(rcFile, "# config\n");

    await appendToRcFile(rcFile, "/path/to/init.sh");
    await appendToRcFile(rcFile, "/path/to/init.sh");

    const content = await Deno.readTextFile(rcFile);
    const matches = content.match(/\/path\/to\/init\.sh/g);
    assertEquals(matches?.length, 1, "should appear only once");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("appendToRcFile - creates file if missing", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const rcFile = join(dir, ".newrc");

    await appendToRcFile(rcFile, "/path/to/init.sh");

    assert(await exists(rcFile), "should create file");
    const content = await Deno.readTextFile(rcFile);
    assert(content.includes("/path/to/init.sh"), "should contain source");
  } finally {
    await cleanup(dir);
  }
});

// ============================================================================
// direnv Integration Tests
// ============================================================================

Deno.test("generateEnvrc - root location sets TYVI_ROOT", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const content = generateEnvrc(devspace, "root");

    assert(content.includes("TYVI_ROOT"), "should set TYVI_ROOT");
    assert(content.includes("TYVI_IN_PROJECT"), "should set TYVI_IN_PROJECT");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("generateEnvrc - lab location sets TYVI_IN_LAB", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const content = generateEnvrc(devspace, "lab");

    assert(content.includes("TYVI_IN_LAB"), "should set TYVI_IN_LAB");
    assert(content.includes("TYVI_ROOT"), "should also set TYVI_ROOT");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("generateEnvrc - parent location sources init script", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const content = generateEnvrc(devspace, "parent");

    assert(content.includes("source"), "should source init script");
    assert(content.includes("init.sh"), "should reference init.sh");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("writeEnvrc - creates .envrc at root", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const envrcPath = await writeEnvrc(devspace, "root");

    assert(await exists(envrcPath), ".envrc should exist");
    assertEquals(envrcPath, join(resolve(dir), ".envrc"));
  } finally {
    await cleanup(dir);
  }
});

Deno.test("writeEnvrc - creates .envrc in lab directory", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const envrcPath = await writeEnvrc(devspace, "lab");

    assert(await exists(envrcPath), ".envrc should exist in lab");
    assertEquals(envrcPath, join(resolve(dir, ".lab"), ".envrc"));
  } finally {
    await cleanup(dir);
  }
});

// ============================================================================
// Hooks Tests
// ============================================================================

Deno.test("generateHook - pre-commit contains tyvi marker", () => {
  const content = generateHook("pre-commit");

  assert(content.includes("tyvi git guard"), "should contain marker");
});

Deno.test("generateHook - pre-commit is valid shell script", () => {
  const content = generateHook("pre-commit");

  assert(content.startsWith("#!/bin/sh"), "should start with shebang");
});

Deno.test("generateHook - pre-commit checks TYVI_ALLOW_COMMIT", () => {
  const content = generateHook("pre-commit");

  assert(content.includes("TYVI_ALLOW_COMMIT"), "should check env var");
});

Deno.test("hasHooks - returns false when no .git directory", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const result = await hasHooks(devspace);
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("hasHooks - returns false when no pre-commit hook", async () => {
  const { dir, devspace } = await createTempDevspace({ initGit: true });
  try {
    const result = await hasHooks(devspace);
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("hasHooks - returns true when pre-commit exists", async () => {
  const { dir, devspace } = await createTempDevspace({ initGit: true });
  try {
    const hooksDir = join(dir, ".git", "hooks");
    await Deno.mkdir(hooksDir, { recursive: true });
    await Deno.writeTextFile(join(hooksDir, "pre-commit"), "#!/bin/sh\n");

    const result = await hasHooks(devspace);
    assertEquals(result, true);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("installHooks - creates pre-commit hook", async () => {
  const { dir, devspace } = await createTempDevspace({ initGit: true });
  try {
    await installHooks(devspace);

    const hookPath = join(dir, ".git", "hooks", "pre-commit");
    assert(await exists(hookPath), "hook should exist");

    const content = await Deno.readTextFile(hookPath);
    assert(content.includes("tyvi git guard"), "should contain marker");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("installHooks - hook is executable", async () => {
  const { dir, devspace } = await createTempDevspace({ initGit: true });
  try {
    await installHooks(devspace);

    const hookPath = join(dir, ".git", "hooks", "pre-commit");
    const stat = await Deno.stat(hookPath);
    // Check execute bit (owner execute = 0o100)
    assert((stat.mode! & 0o111) !== 0, "hook should be executable");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("installHooks - backs up existing non-tyvi hook", async () => {
  const { dir, devspace } = await createTempDevspace({ initGit: true });
  try {
    const hooksDir = join(dir, ".git", "hooks");
    await Deno.mkdir(hooksDir, { recursive: true });
    await Deno.writeTextFile(
      join(hooksDir, "pre-commit"),
      "#!/bin/sh\n# user hook\necho 'my hook'\n",
    );

    await installHooks(devspace);

    // Backup should exist
    const backupPath = join(hooksDir, "pre-commit.bak");
    assert(await exists(backupPath), "backup should exist");
    const backup = await Deno.readTextFile(backupPath);
    assert(backup.includes("my hook"), "backup should have original content");

    // New hook should be tyvi's
    const hook = await Deno.readTextFile(join(hooksDir, "pre-commit"));
    assert(hook.includes("tyvi git guard"), "new hook should be tyvi's");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("installHooks - does not backup existing tyvi hook", async () => {
  const { dir, devspace } = await createTempDevspace({ initGit: true });
  try {
    const hooksDir = join(dir, ".git", "hooks");
    await Deno.mkdir(hooksDir, { recursive: true });
    await Deno.writeTextFile(
      join(hooksDir, "pre-commit"),
      "#!/bin/sh\n# tyvi git guard\nexit 0\n",
    );

    await installHooks(devspace);

    const backupPath = join(hooksDir, "pre-commit.bak");
    assertEquals(await exists(backupPath), false, "should not create backup");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("installHooks - throws when no .git directory", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    await assertRejects(
      () => installHooks(devspace),
      Error,
      "No .git directory",
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("removeHooks - removes tyvi hook", async () => {
  const { dir, devspace } = await createTempDevspace({ initGit: true });
  try {
    await installHooks(devspace);
    await removeHooks(devspace);

    const hookPath = join(dir, ".git", "hooks", "pre-commit");
    assertEquals(await exists(hookPath), false, "hook should be removed");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("removeHooks - restores backup when removing", async () => {
  const { dir, devspace } = await createTempDevspace({ initGit: true });
  try {
    const hooksDir = join(dir, ".git", "hooks");
    await Deno.mkdir(hooksDir, { recursive: true });
    await Deno.writeTextFile(
      join(hooksDir, "pre-commit"),
      "#!/bin/sh\n# user hook\n",
    );

    await installHooks(devspace);
    await removeHooks(devspace);

    const hookPath = join(hooksDir, "pre-commit");
    assert(await exists(hookPath), "hook should exist after restore");
    const content = await Deno.readTextFile(hookPath);
    assert(content.includes("user hook"), "should have original content");

    const backupPath = join(hooksDir, "pre-commit.bak");
    assertEquals(await exists(backupPath), false, "backup should be removed");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("removeHooks - no-op when no hook exists", async () => {
  const { dir, devspace } = await createTempDevspace({ initGit: true });
  try {
    // Should not throw
    await removeHooks(devspace);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("removeHooks - no-op for non-tyvi hooks", async () => {
  const { dir, devspace } = await createTempDevspace({ initGit: true });
  try {
    const hooksDir = join(dir, ".git", "hooks");
    await Deno.mkdir(hooksDir, { recursive: true });
    await Deno.writeTextFile(
      join(hooksDir, "pre-commit"),
      "#!/bin/sh\n# user hook only\n",
    );

    await removeHooks(devspace);

    const content = await Deno.readTextFile(join(hooksDir, "pre-commit"));
    assert(content.includes("user hook only"), "should not modify non-tyvi hook");
  } finally {
    await cleanup(dir);
  }
});

// ============================================================================
// Validation Tests
// ============================================================================

Deno.test("validateGuards - reports missing git_policy as warning", async () => {
  const { dir, devspace } = await createTempDevspace();
  try {
    const result = await validateGuards(devspace);

    const configIssue = result.issues.find(
      (i) => i.type === "config" && i.message.includes("git_policy"),
    );
    assertExists(configIssue, "should report git_policy issue");
    assertEquals(configIssue.severity, "warning");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("validateGuards - reports disabled git_policy as warning", async () => {
  const { dir, devspace } = await createTempDevspace({
    gitPolicy: { enabled: false, allowed_paths: [] },
  });
  try {
    const result = await validateGuards(devspace);

    const configIssue = result.issues.find(
      (i) => i.type === "config" && i.message.includes("disabled"),
    );
    assertExists(configIssue, "should report disabled policy");
    assertEquals(configIssue.severity, "warning");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("validateGuards - reports missing shell init as error", async () => {
  const { dir, devspace } = await createTempDevspace({
    gitPolicy: { enabled: true, allowed_paths: [] },
  });
  try {
    const result = await validateGuards(devspace);

    const shellIssue = result.issues.find(
      (i) => i.type === "shell" && i.severity === "error",
    );
    assertExists(shellIssue, "should report missing shell init");
    assert(shellIssue.message.includes("init script"), "should mention init script");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("validateGuards - reports missing lab directory as error", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(dir, "tyvi.toml"),
      `[devspace]
name = "test"
lab_path = ".lab"
staging_path = ".staging"
state_path = ".state"
[devspace.namespaces]
default = "@test"
paths = ["@test"]
[devspace.git_policy]
enabled = true
allowed_paths = []`,
    );
    await Deno.mkdir(join(dir, "@test"));
    await Deno.writeTextFile(join(dir, "@test", "inventory.toml"), "# empty\n");
    // Do NOT create .lab or .staging

    const devspace = await loadDevspace(dir);
    const result = await validateGuards(devspace);

    const labIssue = result.issues.find(
      (i) => i.type === "config" && i.message.includes("Lab directory"),
    );
    assertExists(labIssue, "should report missing lab");
    assertEquals(labIssue.severity, "error");

    const stagingIssue = result.issues.find(
      (i) => i.type === "config" && i.message.includes("Staging directory"),
    );
    assertExists(stagingIssue, "should report missing staging");
    assertEquals(stagingIssue.severity, "error");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("validateGuards - reports missing hooks as warning", async () => {
  const { dir, devspace } = await createTempDevspace({
    gitPolicy: { enabled: true, allowed_paths: [] },
    initGit: true,
  });
  try {
    const result = await validateGuards(devspace);

    const hookIssue = result.issues.find((i) => i.type === "hooks");
    assertExists(hookIssue, "should report missing hooks");
    assertEquals(hookIssue.severity, "warning");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("validateGuards - valid is true when only warnings", async () => {
  const { dir, devspace } = await createTempDevspace({
    gitPolicy: { enabled: false, allowed_paths: [] },
  });
  try {
    // Write shell init so there's no shell error
    const shellDir = join(dir, "shell");
    await Deno.mkdir(shellDir, { recursive: true });
    await Deno.writeTextFile(join(shellDir, "init.sh"), "# placeholder\n");

    const result = await validateGuards(devspace);

    // All issues should be warnings (disabled policy, possibly missing hooks)
    const errors = result.issues.filter((i) => i.severity === "error");
    assertEquals(errors.length, 0, "should have no errors");
    assert(result.valid, "should be valid when only warnings");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("validateGuards - valid is false when errors exist", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(dir, "tyvi.toml"),
      `[devspace]
name = "test"
lab_path = ".lab"
staging_path = ".staging"
state_path = ".state"
[devspace.namespaces]
default = "@test"
paths = ["@test"]
[devspace.git_policy]
enabled = true
allowed_paths = []`,
    );
    await Deno.mkdir(join(dir, "@test"));
    await Deno.writeTextFile(join(dir, "@test", "inventory.toml"), "# empty\n");
    // Missing lab and staging → errors

    const devspace = await loadDevspace(dir);
    const result = await validateGuards(devspace);

    assert(!result.valid, "should be invalid when errors exist");
  } finally {
    await cleanup(dir);
  }
});
