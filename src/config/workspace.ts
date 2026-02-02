/**
 * Workspace configuration parsing.
 * @module
 */

import { parse } from "@std/toml";
import type { WorkspaceConfig } from "../types.ts";

/**
 * Parse tyvi.toml content into WorkspaceConfig.
 *
 * @param content - TOML file content
 * @returns Parsed workspace configuration
 * @throws Error if config is malformed or missing required fields
 *
 * @example
 * ```ts
 * const content = await Deno.readTextFile("tyvi.toml");
 * const config = parseWorkspaceConfig(content);
 * console.log(config.workspace.name);
 * ```
 */
export function parseWorkspaceConfig(content: string): WorkspaceConfig {
  const parsed = parse(content) as Record<string, unknown>;

  if (!parsed.workspace || typeof parsed.workspace !== "object") {
    throw new Error(
      "Invalid tyvi.toml: missing [workspace] section.\n" +
        "Expected format:\n" +
        "[workspace]\n" +
        'name = "my-workspace"\n' +
        "[workspace.namespaces]\n" +
        'default = "@default"\n' +
        'paths = ["@default"]',
    );
  }

  const workspace = parsed.workspace as Record<string, unknown>;

  if (!workspace.name || typeof workspace.name !== "string") {
    throw new Error(
      "Invalid tyvi.toml: [workspace] section missing required 'name' field.\n" +
        "Add: name = \"my-workspace\"",
    );
  }

  if (!workspace.namespaces || typeof workspace.namespaces !== "object") {
    throw new Error(
      "Invalid tyvi.toml: [workspace] section missing [workspace.namespaces] subsection.\n" +
        "Add:\n" +
        "[workspace.namespaces]\n" +
        'default = "@default"\n' +
        'paths = ["@default"]',
    );
  }

  const namespaces = workspace.namespaces as Record<string, unknown>;

  if (!namespaces.default || typeof namespaces.default !== "string") {
    throw new Error(
      "Invalid tyvi.toml: [workspace.namespaces] missing 'default' field.\n" +
        'Add: default = "@default"',
    );
  }

  if (!Array.isArray(namespaces.paths)) {
    throw new Error(
      "Invalid tyvi.toml: [workspace.namespaces] missing 'paths' array.\n" +
        'Add: paths = ["@default"]',
    );
  }

  const defaults = parsed.defaults as Record<string, unknown> | undefined;

  return {
    workspace: {
      name: workspace.name,
      root: typeof workspace.root === "string" ? workspace.root : ".",
      namespaces: {
        default: namespaces.default,
        paths: namespaces.paths as string[],
      },
    },
    defaults: defaults
      ? {
        host: typeof defaults.host === "string" ? defaults.host : undefined,
        clone_method: defaults.clone_method === "https" ? "https" : "ssh",
        fetch_on_status: typeof defaults.fetch_on_status === "boolean"
          ? defaults.fetch_on_status
          : false,
      }
      : undefined,
  };
}

/**
 * Load and parse tyvi.toml from a file.
 *
 * @param path - Path to tyvi.toml
 * @returns Parsed workspace configuration
 * @throws Error if file cannot be read or config is invalid
 */
export async function loadWorkspaceConfig(path: string): Promise<WorkspaceConfig> {
  try {
    const content = await Deno.readTextFile(path);
    return parseWorkspaceConfig(content);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        `tyvi.toml not found at: ${path}\n` +
          "Run 'tyvi init' to create a workspace.",
      );
    }
    throw error;
  }
}
