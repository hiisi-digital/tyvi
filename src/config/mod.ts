/**
 * Configuration loading and parsing.
 * @module
 */

export { loadInventoryConfig, parseInventoryConfig } from "./inventory.ts";
export {
  loadDevspaceConfig,
  loadWorkspaceConfig,
  parseDevspaceConfig,
  parseWorkspaceConfig,
} from "./devspace.ts";

import { ensureDir, exists } from "@std/fs";
import { dirname, join, resolve } from "@std/path";
import type {
  Devspace,
  ExtState,
  InitOptions,
  InitResult,
  InventoryConfig,
  LabState,
} from "../types/mod.ts";
import { loadInventoryConfig } from "./inventory.ts";
import { loadDevspaceConfig } from "./devspace.ts";
import { readExtState, readLabState } from "../devspace/state.ts";

// Re-export types
export type { Devspace, DevspaceConfig, InventoryConfig } from "../types/mod.ts";

/**
 * Find tyvi.toml by walking up from the given directory.
 *
 * @param startDir - Directory to start searching from
 * @returns Path to tyvi.toml or null if not found
 */
export async function findDevspaceRoot(startDir: string): Promise<string | null> {
  let currentDir = startDir;
  const root = "/";

  while (true) {
    const configPath = join(currentDir, "tyvi.toml");
    if (await exists(configPath)) {
      return currentDir;
    }

    if (currentDir === root) {
      break;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return null;
}

/** @deprecated Use findDevspaceRoot instead */
export const findWorkspaceRoot = findDevspaceRoot;

/**
 * Load complete devspace with all inventories.
 *
 * @param startDir - Directory to start searching from (default: cwd)
 * @returns Complete devspace model
 * @throws Error if devspace not found or config is invalid
 *
 * @example
 * ```ts
 * const devspace = await loadDevspace(".");
 * console.log(devspace.config.devspace.name);
 * for (const [namespace, inventory] of devspace.namespaces) {
 *   console.log(`${namespace}: ${inventory.repos.length} repos`);
 * }
 * ```
 */
export async function loadDevspace(startDir: string = Deno.cwd()): Promise<Devspace> {
  const rootPath = await findDevspaceRoot(startDir);

  if (!rootPath) {
    throw new Error(
      `No tyvi.toml found in ${startDir} or parent directories.\n` +
        "Run 'tyvi init' to create a devspace.",
    );
  }

  const configPath = join(rootPath, "tyvi.toml");
  const config = await loadDevspaceConfig(configPath);

  const namespaces = new Map<string, InventoryConfig>();

  for (const namespacePath of config.devspace.namespaces?.paths ?? []) {
    const inventoryPath = join(rootPath, namespacePath, "inventory.toml");

    if (await exists(inventoryPath)) {
      try {
        const inventory = await loadInventoryConfig(inventoryPath);
        namespaces.set(namespacePath, inventory);
      } catch (error) {
        console.warn(`Warning: Failed to load inventory for ${namespacePath}: ${error}`);
      }
    }
  }

  // Load state files (non-fatal if missing or corrupt)
  const devspacePartial = { config, rootPath, namespaces } as Devspace;

  let labState: LabState | undefined;
  try {
    labState = await readLabState(devspacePartial);
  } catch {
    labState = { repos: [] };
  }

  let extState: ExtState | undefined;
  try {
    extState = await readExtState(devspacePartial);
  } catch {
    extState = { repos: [] };
  }

  return {
    config,
    rootPath,
    namespaces,
    labState,
    extState,
  };
}

/** @deprecated Use loadDevspace instead */
export const loadWorkspace = loadDevspace;

/**
 * Load a single inventory from a namespace.
 *
 * @param devspaceRoot - Path to devspace root
 * @param namespace - Namespace path (e.g., "@hiisi")
 * @returns Parsed inventory configuration
 */
export async function loadInventory(
  devspaceRoot: string,
  namespace: string,
): Promise<InventoryConfig> {
  const inventoryPath = join(devspaceRoot, namespace, "inventory.toml");
  return await loadInventoryConfig(inventoryPath);
}

/**
 * Initialize a new devspace at the given root path.
 *
 * Creates a `tyvi.toml` config file, namespace directories with empty
 * `inventory.toml` files, and the configured directory structure
 * (staging, lab, state, tmp).
 *
 * All paths are config-driven via InitOptions, with sensible defaults.
 *
 * @param rootPath - Directory to initialize the devspace in
 * @param options - Initialization options
 * @returns Result with created directories and config path
 * @throws Error if tyvi.toml already exists at rootPath
 *
 * @example
 * ```ts
 * const result = await initDevspace("/home/user/dev", {
 *   name: "my-devspace",
 *   namespaces: ["@myorg", "@contrib"],
 *   labPath: "../.lab",
 * });
 * console.log(`Created devspace at ${result.rootPath}`);
 * ```
 */
export async function initDevspace(
  rootPath: string,
  options: InitOptions,
): Promise<InitResult> {
  const absRoot = resolve(rootPath);
  const configPath = join(absRoot, "tyvi.toml");

  // Don't overwrite existing config
  if (await exists(configPath)) {
    throw new Error(
      `tyvi.toml already exists at ${configPath}.\n` +
        "Remove it first or use a different directory.",
    );
  }

  const created: string[] = [];

  // Resolve options with defaults
  const namespaces = options.namespaces ?? ["@default"];
  const defaultNamespace = options.defaultNamespace ?? namespaces[0]!;
  const labPath = options.labPath ?? ".lab";
  const stagingPath = options.stagingPath ?? ".staging";
  const statePath = options.statePath ?? ".state";
  const tmpPath = options.tmpPath ?? ".tmp";

  // Ensure root directory exists
  await ensureDir(absRoot);

  // Create namespace directories with empty inventory.toml
  for (const ns of namespaces) {
    const nsDir = join(absRoot, ns);
    await ensureDir(nsDir);
    created.push(ns);

    const inventoryPath = join(nsDir, "inventory.toml");
    if (!await exists(inventoryPath)) {
      await Deno.writeTextFile(inventoryPath, "# Repository inventory\n");
    }
  }

  // Create subdirectories (resolved relative to root)
  for (const subPath of [stagingPath, labPath, statePath, tmpPath]) {
    const absDir = resolve(absRoot, subPath);
    await ensureDir(absDir);
    created.push(subPath);
  }

  // Build tyvi.toml content
  const namespacePaths = namespaces.map((ns) => `"${ns}"`).join(", ");

  let tomlContent = `[devspace]
name = "${options.name}"
staging_path = "${stagingPath}"
lab_path = "${labPath}"
state_path = "${statePath}"
tmp_path = "${tmpPath}"

[devspace.namespaces]
default = "${defaultNamespace}"
paths = [${namespacePaths}]
`;

  if (options.gitPolicy) {
    const allowedPaths = (options.gitAllowedPaths ?? [])
      .map((p) => `"${p}"`)
      .join(", ");
    tomlContent += `
[devspace.git_policy]
enabled = true
allowed_paths = [${allowedPaths}]
`;
  }

  await Deno.writeTextFile(configPath, tomlContent);

  return {
    rootPath: absRoot,
    created,
    configPath,
  };
}
