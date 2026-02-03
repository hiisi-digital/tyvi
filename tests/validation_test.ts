/**
 * Tests for devspace validation.
 */

import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { validateGuards } from "../src/devspace/validation.ts";
import { installHooks } from "../src/devspace/hooks.ts";
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
        git_policy: {
          enabled: true,
          allowed_paths: [],
          allowSubmodules: false,
          suggestTyviGit: true,
        },
      },
    },
    namespaces: new Map(),
  };
}

Deno.test("validateGuards - passes with complete setup", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    // Create complete devspace structure
    await ensureDir(join(tempDir, ".git"));
    await ensureDir(join(tempDir, ".lab"));
    await ensureDir(join(tempDir, ".staging"));

    const devspace = createTestDevspace(tempDir);
    await installHooks(devspace);

    const result = await validateGuards(devspace);

    assertEquals(result.valid, true);
    // May have warnings but no errors
    const errors = result.issues.filter((i) => i.severity === "error");
    assertEquals(errors.length, 0);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("validateGuards - fails without lab directory", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    await ensureDir(join(tempDir, ".git"));
    await ensureDir(join(tempDir, ".staging"));

    const devspace = createTestDevspace(tempDir);
    await installHooks(devspace);

    const result = await validateGuards(devspace);

    assertEquals(result.valid, false);
    const labError = result.issues.find(
      (i) => i.type === "paths" && i.message.includes("Lab directory"),
    );
    assertEquals(labError !== undefined, true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("validateGuards - fails without staging directory", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    await ensureDir(join(tempDir, ".git"));
    await ensureDir(join(tempDir, ".lab"));

    const devspace = createTestDevspace(tempDir);
    await installHooks(devspace);

    const result = await validateGuards(devspace);

    assertEquals(result.valid, false);
    const stagingError = result.issues.find(
      (i) => i.type === "paths" && i.message.includes("Staging directory"),
    );
    assertEquals(stagingError !== undefined, true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("validateGuards - fails without git hooks", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    await ensureDir(join(tempDir, ".git"));
    await ensureDir(join(tempDir, ".lab"));
    await ensureDir(join(tempDir, ".staging"));

    const devspace = createTestDevspace(tempDir);
    // Don't install hooks

    const result = await validateGuards(devspace);

    assertEquals(result.valid, false);
    const hooksError = result.issues.find((i) => i.type === "hooks");
    assertEquals(hooksError !== undefined, true);
    assertEquals(hooksError?.severity, "error");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("validateGuards - fails without .git directory", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    await ensureDir(join(tempDir, ".lab"));
    await ensureDir(join(tempDir, ".staging"));

    const devspace = createTestDevspace(tempDir);

    const result = await validateGuards(devspace);

    assertEquals(result.valid, false);
    const gitError = result.issues.find(
      (i) => i.type === "config" && i.message.includes("not a git repository"),
    );
    assertEquals(gitError !== undefined, true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("validateGuards - warns about missing shell integration", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    await ensureDir(join(tempDir, ".git"));
    await ensureDir(join(tempDir, ".lab"));
    await ensureDir(join(tempDir, ".staging"));

    const devspace = createTestDevspace(tempDir);
    await installHooks(devspace);

    const result = await validateGuards(devspace);

    const shellWarning = result.issues.find((i) => i.type === "shell");
    assertEquals(shellWarning !== undefined, true);
    assertEquals(shellWarning?.severity, "warning");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("validateGuards - warns about missing git policy config", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    await ensureDir(join(tempDir, ".git"));
    await ensureDir(join(tempDir, ".lab"));
    await ensureDir(join(tempDir, ".staging"));

    const devspace = createTestDevspace(tempDir);
    // Remove git policy
    devspace.config.devspace.git_policy = undefined;
    await installHooks(devspace);

    const result = await validateGuards(devspace);

    const configWarning = result.issues.find(
      (i) => i.type === "config" && i.message.includes("git_policy"),
    );
    assertEquals(configWarning !== undefined, true);
    assertEquals(configWarning?.severity, "warning");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("validateGuards - warns when git restrictions disabled", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    await ensureDir(join(tempDir, ".git"));
    await ensureDir(join(tempDir, ".lab"));
    await ensureDir(join(tempDir, ".staging"));

    const devspace = createTestDevspace(tempDir);
    devspace.config.devspace.git_policy!.enabled = false;
    await installHooks(devspace);

    const result = await validateGuards(devspace);

    const configWarning = result.issues.find(
      (i) => i.type === "config" && i.message.includes("disabled"),
    );
    assertEquals(configWarning !== undefined, true);
    assertEquals(configWarning?.severity, "warning");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("validateGuards - provides fix suggestions", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const devspace = createTestDevspace(tempDir);

    const result = await validateGuards(devspace);

    // All issues should have fix suggestions
    for (const issue of result.issues) {
      if (issue.severity === "error") {
        assertEquals(issue.fix !== undefined, true);
      }
    }
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("validateGuards - counts errors correctly", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    // Create minimal setup with some errors
    const devspace = createTestDevspace(tempDir);

    const result = await validateGuards(devspace);

    const errorCount = result.issues.filter((i) => i.severity === "error").length;
    // Should have errors for: lab dir, staging dir, git dir, hooks
    assertEquals(errorCount >= 4, true);
    assertEquals(result.valid, false);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("validateGuards - separates warnings from errors", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    await ensureDir(join(tempDir, ".git"));
    await ensureDir(join(tempDir, ".lab"));
    await ensureDir(join(tempDir, ".staging"));

    const devspace = createTestDevspace(tempDir);
    await installHooks(devspace);

    const result = await validateGuards(devspace);

    const errors = result.issues.filter((i) => i.severity === "error");
    const warnings = result.issues.filter((i) => i.severity === "warning");

    // Should have no errors but may have warnings
    assertEquals(errors.length, 0);
    assertEquals(warnings.length >= 0, true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
