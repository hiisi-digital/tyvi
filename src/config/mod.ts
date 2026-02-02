/**
 * Configuration loading and parsing.
 * @module
 */

export { loadInventoryConfig, parseInventoryConfig } from "./inventory.ts";
export {
    loadDevspaceConfig,
    loadWorkspaceConfig,
    parseDevspaceConfig,
    parseWorkspaceConfig
} from "./workspace.ts";

import { exists } from "@std/fs";
import { dirname, join } from "@std/path";
import type { Devspace, InventoryConfig } from "../types/mod.ts";
import { loadInventoryConfig } from "./inventory.ts";
import { loadWorkspaceConfig } from "./workspace.ts";

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
  const config = await loadWorkspaceConfig(configPath);

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

  return {
    config,
    rootPath,
    namespaces,
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
