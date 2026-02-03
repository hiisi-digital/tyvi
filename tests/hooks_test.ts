/**
 * Tests for git hooks management.
 */

import { assertEquals, assertExists, assertRejects, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { ensureDir, exists } from "@std/fs";
import {
  generatePreCommitHook,
  hasHooks,
  installHooks,
} from "../src/devspace/hooks.ts";
import type { Devspace } from "../src/types/mod.ts";

// Helper to create a minimal devspace for testing
function createTestDevspace(rootPath: string): Devspace {
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
      },
    },
    namespaces: new Map(),
  };
}

Deno.test("generatePreCommitHook - includes shell shebang", () => {
  const hook = generatePreCommitHook();

  assertStringIncludes(hook, "#!/bin/sh");
});

Deno.test("generatePreCommitHook - checks git toplevel", () => {
  const hook = generatePreCommitHook();

  assertStringIncludes(hook, "git rev-parse --show-toplevel");
  assertStringIncludes(hook, "GIT_TOPLEVEL");
});

Deno.test("generatePreCommitHook - allows commits at toplevel", () => {
  const hook = generatePreCommitHook();

  assertStringIncludes(hook, 'if [ "$CURRENT_DIR" = "$GIT_TOPLEVEL" ];');
  assertStringIncludes(hook, "exit 0");
});

Deno.test("generatePreCommitHook - checks TYVI_ALLOW_COMMIT", () => {
  const hook = generatePreCommitHook();

  assertStringIncludes(hook, "TYVI_ALLOW_COMMIT");
  assertStringIncludes(hook, "exit 0");
});

Deno.test("generatePreCommitHook - checks TYVI_IN_LAB", () => {
  const hook = generatePreCommitHook();

  assertStringIncludes(hook, "TYVI_IN_LAB");
  assertStringIncludes(hook, "exit 0");
});

Deno.test("generatePreCommitHook - blocks by default", () => {
  const hook = generatePreCommitHook();

  assertStringIncludes(hook, "Commit blocked");
  assertStringIncludes(hook, "tyvi load");
  assertStringIncludes(hook, "exit 1");
});

Deno.test("generatePreCommitHook - provides helpful message", () => {
  const hook = generatePreCommitHook();

  assertStringIncludes(hook, "Lab directory");
  assertStringIncludes(hook, "Devspace root");
  assertStringIncludes(hook, "temporarily bypass");
});

Deno.test("installHooks - creates pre-commit hook", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    // Create a git directory
    const gitDir = join(tempDir, ".git");
    await ensureDir(gitDir);

    const devspace = createTestDevspace(tempDir);
    await installHooks(devspace);

    const hookPath = join(gitDir, "hooks", "pre-commit");
    assertEquals(await exists(hookPath), true);

    const content = await Deno.readTextFile(hookPath);
    assertStringIncludes(content, "#!/bin/sh");
    assertStringIncludes(content, "tyvi");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("installHooks - makes hook executable on Unix", async () => {
  // Skip on Windows
  if (Deno.build.os === "windows") {
    return;
  }

  const tempDir = await Deno.makeTempDir();

  try {
    const gitDir = join(tempDir, ".git");
    await ensureDir(gitDir);

    const devspace = createTestDevspace(tempDir);
    await installHooks(devspace);

    const hookPath = join(gitDir, "hooks", "pre-commit");
    const stat = await Deno.stat(hookPath);

    // Check that file is executable (mode includes execute bit)
    // Mode 0o755 = 493 in decimal
    assertEquals((stat.mode ?? 0) & 0o111, 0o111);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("installHooks - throws if no .git directory", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const devspace = createTestDevspace(tempDir);

    await assertRejects(
      async () => {
        await installHooks(devspace);
      },
      Error,
      "No .git directory found",
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("hasHooks - returns true when hook exists", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const gitDir = join(tempDir, ".git");
    await ensureDir(gitDir);

    const devspace = createTestDevspace(tempDir);
    await installHooks(devspace);

    const result = await hasHooks(devspace);
    assertEquals(result, true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("hasHooks - returns false when hook missing", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const devspace = createTestDevspace(tempDir);
    const result = await hasHooks(devspace);

    assertEquals(result, false);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("installHooks - overwrites existing hook", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const gitDir = join(tempDir, ".git");
    const hooksDir = join(gitDir, "hooks");
    await ensureDir(hooksDir);

    // Create an existing hook
    const hookPath = join(hooksDir, "pre-commit");
    await Deno.writeTextFile(hookPath, "#!/bin/sh\necho old hook");

    const devspace = createTestDevspace(tempDir);
    await installHooks(devspace);

    const content = await Deno.readTextFile(hookPath);
    assertStringIncludes(content, "tyvi");
    assertEquals(content.includes("old hook"), false);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
