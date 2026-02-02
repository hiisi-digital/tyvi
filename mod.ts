/**
 * @module
 * Config-driven workspace orchestration for multi-repo development environments.
 *
 * tyvi manages multi-repo workspaces through declarative config files.
 * Define your repositories in inventory.toml files, organize them by namespace,
 * and use simple commands to clone, sync, and track status.
 *
 * @example
 * ```ts
 * import { loadWorkspace, getStatus } from "@hiisi/tyvi";
 *
 * const workspace = await loadWorkspace(".");
 * const status = await getStatus(workspace);
 *
 * for (const repo of status.repos) {
 *   console.log(`${repo.name}: ${repo.gitStatus}`);
 * }
 * ```
 */

// Re-export types
export type {
    CloneStatus,
    GitStatus, InventoryConfig, RemoteDefinition, RepoDefinition, RepoStatus, WorkspaceConfig
} from "./src/types.ts";

// Re-export config parsing
export { loadInventory, loadWorkspace } from "./src/config/mod.ts";

// Re-export workspace operations
export { addRepo, clone, getStatus, removeRepo, sync } from "./src/workspace/mod.ts";

// Re-export git utilities
export { getCurrentBranch, getGitStatus, isGitRepo } from "./src/git/mod.ts";

