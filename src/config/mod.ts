/**
 * Configuration loading and parsing.
 * @module
 */

export { loadInventoryConfig, parseInventoryConfig } from "./inventory.ts";
export { loadWorkspaceConfig, parseWorkspaceConfig } from "./workspace.ts";

export type { InventoryConfig, WorkspaceConfig } from "../types.ts";

import { dirname, join } from "@std/path";
import { exists } from "@std/fs";
import type { InventoryConfig, Workspace } from "../types.ts";
import { loadWorkspaceConfig } from "./workspace.ts";
import { loadInventoryConfig } from "./inventory.ts";

/**
 * Find tyvi.toml by walking up from the given directory.
 *
 * @param startDir - Directory to start searching from
 * @returns Path to tyvi.toml or null if not found
 */
export async function findWorkspaceRoot(startDir: string): Promise<string | null> {
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

/**
 * Load complete workspace with all inventories.
 *
 * @param startDir - Directory to start searching from (default: cwd)
 * @returns Complete workspace model
 * @throws Error if workspace not found or config is invalid
 *
 * @example
 * ```ts
 * const workspace = await loadWorkspace(".");
 * console.log(workspace.config.workspace.name);
 * for (const [namespace, inventory] of workspace.namespaces) {
 *   console.log(`${namespace}: ${inventory.repos.length} repos`);
 * }
 * ```
 */
export async function loadWorkspace(startDir: string = Deno.cwd()): Promise<Workspace> {
  const rootPath = await findWorkspaceRoot(startDir);

  if (!rootPath) {
    throw new Error(
      `No tyvi.toml found in ${startDir} or parent directories.\n` +
        "Run 'tyvi init' to create a workspace.",
    );
  }

  const configPath = join(rootPath, "tyvi.toml");
  const config = await loadWorkspaceConfig(configPath);

  const namespaces = new Map<string, InventoryConfig>();

  for (const namespacePath of config.workspace.namespaces.paths) {
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

/**
 * Load a single inventory from a namespace.
 *
 * @param workspaceRoot - Path to workspace root
 * @param namespace - Namespace path (e.g., "@hiisi")
 * @returns Parsed inventory configuration
 */
export async function loadInventory(
  workspaceRoot: string,
  namespace: string,
): Promise<InventoryConfig> {
  const inventoryPath = join(workspaceRoot, namespace, "inventory.toml");
  return await loadInventoryConfig(inventoryPath);
}
