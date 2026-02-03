/**
 * Tests for shell integration.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import {
  detectShell,
  generateEnvrc,
  generateShellInit,
  hasDirenv,
} from "../src/devspace/shell.ts";
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

Deno.test("generateShellInit - bash - includes git function", () => {
  const devspace = createTestDevspace("/home/user/.ctl");
  const script = generateShellInit(devspace, "bash");

  assertStringIncludes(script, "git()");
  assertStringIncludes(script, "command git");
  assertStringIncludes(script, "# tyvi git guard for bash");
});

Deno.test("generateShellInit - bash - includes fast path check", () => {
  const devspace = createTestDevspace("/home/user/.ctl");
  const script = generateShellInit(devspace, "bash");

  assertStringIncludes(script, "# Fast path");
  assertStringIncludes(script, "if [[ ! \"$pwd_path\" =~ ^/home/user/.ctl ]];");
});

Deno.test("generateShellInit - bash - includes lab check", () => {
  const devspace = createTestDevspace("/home/user/.ctl");
  const script = generateShellInit(devspace, "bash");

  assertStringIncludes(script, "# Check if in lab");
  assertStringIncludes(script, ".lab");
});

Deno.test("generateShellInit - bash - blocks staging destructive ops", () => {
  const devspace = createTestDevspace("/home/user/.ctl");
  const script = generateShellInit(devspace, "bash");

  assertStringIncludes(script, "# Check if in staging");
  assertStringIncludes(script, ".staging");
  assertStringIncludes(script, "commit|push|pull|rebase|merge");
  assertStringIncludes(script, "tyvi load");
});

Deno.test("generateShellInit - zsh - generates similar to bash", () => {
  const devspace = createTestDevspace("/home/user/.ctl");
  const bashScript = generateShellInit(devspace, "bash");
  const zshScript = generateShellInit(devspace, "zsh");

  // Both should have similar structure
  assertStringIncludes(zshScript, "git()");
  assertStringIncludes(zshScript, "command git");
  assertStringIncludes(zshScript, "# tyvi git guard for zsh");

  // Should include same logic checks
  assertStringIncludes(zshScript, ".lab");
  assertStringIncludes(zshScript, ".staging");
});

Deno.test("generateShellInit - fish - uses fish syntax", () => {
  const devspace = createTestDevspace("/home/user/.ctl");
  const script = generateShellInit(devspace, "fish");

  assertStringIncludes(script, "function git");
  assertStringIncludes(script, "command git $argv");
  assertStringIncludes(script, "# tyvi git guard for fish");
  assertStringIncludes(script, "end");
});

Deno.test("generateShellInit - fish - includes path checks", () => {
  const devspace = createTestDevspace("/home/user/.ctl");
  const script = generateShellInit(devspace, "fish");

  assertStringIncludes(script, "string match");
  assertStringIncludes(script, ".lab");
  assertStringIncludes(script, ".staging");
  assertStringIncludes(script, "contains");
});

Deno.test("generateEnvrc - root - sets devspace variables", () => {
  const devspace = createTestDevspace("/home/user/.ctl");
  const envrc = generateEnvrc(devspace, "root");

  assertStringIncludes(envrc, "TYVI_ROOT");
  assertStringIncludes(envrc, "/home/user/.ctl");
  assertStringIncludes(envrc, "TYVI_DEVSPACE");
  assertStringIncludes(envrc, "test-devspace");
});

Deno.test("generateEnvrc - lab - sets lab variables", () => {
  const devspace = createTestDevspace("/home/user/.ctl");
  const envrc = generateEnvrc(devspace, "lab");

  assertStringIncludes(envrc, "TYVI_IN_LAB=1");
  assertStringIncludes(envrc, "TYVI_ALLOW_COMMIT=1");
  assertStringIncludes(envrc, "source_up");
});

Deno.test("generateEnvrc - parent - blocks git operations", () => {
  const devspace = createTestDevspace("/home/user/.ctl");
  const envrc = generateEnvrc(devspace, "parent");

  assertStringIncludes(envrc, "TYVI_ROOT");
  assertStringIncludes(envrc, "GIT_WORK_TREE=/dev/null");
  assertStringIncludes(envrc, "GIT_DIR=/dev/null");
});

Deno.test("detectShell - detects from SHELL env var", async () => {
  // Save original SHELL
  const originalShell = Deno.env.get("SHELL");

  try {
    // Test bash detection
    Deno.env.set("SHELL", "/bin/bash");
    let result = await detectShell();
    assertEquals(result.shell, "bash");

    // Test zsh detection
    Deno.env.set("SHELL", "/usr/bin/zsh");
    result = await detectShell();
    assertEquals(result.shell, "zsh");

    // Test fish detection
    Deno.env.set("SHELL", "/usr/bin/fish");
    result = await detectShell();
    assertEquals(result.shell, "fish");

    // Test unknown shell
    Deno.env.set("SHELL", "/bin/ksh");
    result = await detectShell();
    assertEquals(result.shell, "unknown");
  } finally {
    // Restore original SHELL
    if (originalShell) {
      Deno.env.set("SHELL", originalShell);
    } else {
      Deno.env.delete("SHELL");
    }
  }
});

Deno.test("detectShell - finds RC files", async () => {
  const tempDir = await Deno.makeTempDir();
  const originalHome = Deno.env.get("HOME");
  const originalShell = Deno.env.get("SHELL");

  try {
    Deno.env.set("HOME", tempDir);

    // Create a .bashrc
    await Deno.writeTextFile(join(tempDir, ".bashrc"), "# test bashrc");
    Deno.env.set("SHELL", "/bin/bash");

    const result = await detectShell();

    assertEquals(result.shell, "bash");
    assertEquals(result.rcFile, join(tempDir, ".bashrc"));
  } finally {
    if (originalHome) {
      Deno.env.set("HOME", originalHome);
    }
    if (originalShell) {
      Deno.env.set("SHELL", originalShell);
    }
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("detectShell - detects existing git alias", async () => {
  const tempDir = await Deno.makeTempDir();
  const originalHome = Deno.env.get("HOME");
  const originalShell = Deno.env.get("SHELL");

  try {
    Deno.env.set("HOME", tempDir);
    Deno.env.set("SHELL", "/bin/bash");

    // Create a .bashrc with a git alias
    await Deno.writeTextFile(
      join(tempDir, ".bashrc"),
      'alias git="hub"\nfunction other() { echo "test"; }',
    );

    const result = await detectShell();

    assertEquals(result.hasExistingAlias, true);
    assertEquals(result.existingAlias, "hub");
  } finally {
    if (originalHome) {
      Deno.env.set("HOME", originalHome);
    }
    if (originalShell) {
      Deno.env.set("SHELL", originalShell);
    }
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("detectShell - detects existing git function", async () => {
  const tempDir = await Deno.makeTempDir();
  const originalHome = Deno.env.get("HOME");
  const originalShell = Deno.env.get("SHELL");

  try {
    Deno.env.set("HOME", tempDir);
    Deno.env.set("SHELL", "/bin/bash");

    // Create a .bashrc with a git function
    await Deno.writeTextFile(
      join(tempDir, ".bashrc"),
      'function git() { command git "$@"; }',
    );

    const result = await detectShell();

    assertEquals(result.hasExistingAlias, true);
  } finally {
    if (originalHome) {
      Deno.env.set("HOME", originalHome);
    }
    if (originalShell) {
      Deno.env.set("SHELL", originalShell);
    }
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("hasDirenv - checks for direnv command", async () => {
  const result = await hasDirenv();

  // Result should be boolean
  assertEquals(typeof result, "boolean");

  // Can't assert specific value since it depends on system,
  // but test should not throw
});

Deno.test("generateShellInit - includes devspace path in output", () => {
  const devspace = createTestDevspace("/custom/path/.ctl");
  const script = generateShellInit(devspace, "bash");

  assertStringIncludes(script, "/custom/path/.ctl");
});

Deno.test("generateShellInit - includes custom lab path", () => {
  const devspace = createTestDevspace("/home/user/.ctl");
  devspace.config.devspace.lab_path = ".custom-lab";

  const script = generateShellInit(devspace, "bash");

  assertStringIncludes(script, ".custom-lab");
});

Deno.test("generateShellInit - includes custom staging path", () => {
  const devspace = createTestDevspace("/home/user/.ctl");
  devspace.config.devspace.staging_path = ".custom-staging";

  const script = generateShellInit(devspace, "bash");

  assertStringIncludes(script, ".custom-staging");
});
