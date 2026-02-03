/**
 * Workspace/Devspace configuration parsing.
 *
 * Note: "workspace" is being renamed to "devspace" for clarity.
 * This file handles both formats for backwards compatibility.
 *
 * @module
 */

import { parse } from "@std/toml";
import type { DevspaceConfig, DevspaceSection, GitPolicy } from "../types/mod.ts";

/**
 * Parse tyvi.toml content into DevspaceConfig.
 *
 * Supports both old [workspace] and new [devspace] section names.
 *
 * @param content - TOML file content
 * @returns Parsed devspace configuration
 * @throws Error if config is malformed or missing required fields
 *
 * @example
 * ```ts
 * const content = await Deno.readTextFile("tyvi.toml");
 * const config = parseWorkspaceConfig(content);
 * console.log(config.devspace.name);
 * ```
 */
export function parseWorkspaceConfig(content: string): DevspaceConfig {
  const parsed = parse(content) as Record<string, unknown>;

  // Support both [devspace] and legacy [workspace] section names
  const devspaceRaw = parsed.devspace ?? parsed.workspace;

  if (!devspaceRaw || typeof devspaceRaw !== "object") {
    throw new Error(
      "Invalid tyvi.toml: missing [devspace] section.\n" +
        "Expected format:\n" +
        "[devspace]\n" +
        'name = "my-devspace"\n' +
        "[devspace.namespaces]\n" +
        'default = "@default"\n' +
        'paths = ["@default"]',
    );
  }

  const devspace = devspaceRaw as Record<string, unknown>;

  if (!devspace.name || typeof devspace.name !== "string") {
    throw new Error(
      "Invalid tyvi.toml: [devspace] section missing required 'name' field.\n" +
        'Add: name = "my-devspace"',
    );
  }

  // Parse namespaces (required)
  const namespacesRaw = devspace.namespaces as Record<string, unknown> | undefined;
  let namespaces: DevspaceSection["namespaces"];

  if (namespacesRaw && typeof namespacesRaw === "object") {
    if (!namespacesRaw.default || typeof namespacesRaw.default !== "string") {
      throw new Error(
        "Invalid tyvi.toml: [devspace.namespaces] missing 'default' field.\n" +
          'Add: default = "@default"',
      );
    }

    if (!Array.isArray(namespacesRaw.paths)) {
      throw new Error(
        "Invalid tyvi.toml: [devspace.namespaces] missing 'paths' array.\n" +
          'Add: paths = ["@default"]',
      );
    }

    namespaces = {
      default: namespacesRaw.default,
      paths: namespacesRaw.paths as string[],
    };
  } else {
    throw new Error(
      "Invalid tyvi.toml: [devspace] section missing [devspace.namespaces] subsection.\n" +
        "Add:\n" +
        "[devspace.namespaces]\n" +
        'default = "@default"\n' +
        'paths = ["@default"]',
    );
  }

  // Parse git_policy (optional)
  let gitPolicy: GitPolicy | undefined;
  const gitPolicyRaw = devspace.git_policy as Record<string, unknown> | undefined;
  if (gitPolicyRaw && typeof gitPolicyRaw === "object") {
    gitPolicy = {
      enabled: typeof gitPolicyRaw.enabled === "boolean" ? gitPolicyRaw.enabled : true,
      allowed_paths: Array.isArray(gitPolicyRaw.allowed_paths)
        ? gitPolicyRaw.allowed_paths as string[]
        : [],
      allowSubmodules: typeof gitPolicyRaw.allowSubmodules === "boolean"
        ? gitPolicyRaw.allowSubmodules
        : false,
      suggestTyviGit: typeof gitPolicyRaw.suggestTyviGit === "boolean"
        ? gitPolicyRaw.suggestTyviGit
        : true,
    };
  }

  // Parse defaults (optional)
  const defaults = parsed.defaults as Record<string, unknown> | undefined;

  // Build the devspace section
  const devspaceSection: DevspaceSection = {
    name: devspace.name,
    staging_path: typeof devspace.staging_path === "string"
      ? devspace.staging_path
      : ".staging",
    lab_path: typeof devspace.lab_path === "string"
      ? devspace.lab_path
      : ".lab",
    state_path: typeof devspace.state_path === "string"
      ? devspace.state_path
      : ".state",
    tmp_path: typeof devspace.tmp_path === "string"
      ? devspace.tmp_path
      : ".tmp",
    ext_path: typeof devspace.ext_path === "string"
      ? devspace.ext_path
      : ".tmp/ext",
    trusted_orgs: Array.isArray(devspace.trusted_orgs)
      ? devspace.trusted_orgs as string[]
      : undefined,
    namespaces,
    git_policy: gitPolicy,
  };

  return {
    devspace: devspaceSection,
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
 * @returns Parsed devspace configuration
 * @throws Error if file cannot be read or config is invalid
 */
export async function loadWorkspaceConfig(path: string): Promise<DevspaceConfig> {
  try {
    const content = await Deno.readTextFile(path);
    return parseWorkspaceConfig(content);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        `tyvi.toml not found at: ${path}\n` +
          "Run 'tyvi init' to create a devspace.",
      );
    }
    throw error;
  }
}

// Aliases for backwards compatibility
export { loadWorkspaceConfig as loadDevspaceConfig, parseWorkspaceConfig as parseDevspaceConfig };

