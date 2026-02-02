/**
 * Shared type definitions for tyvi workspace orchestration.
 * @module
 */

/**
 * Repository status indicating development state.
 */
export type RepoStatus = "active" | "stable" | "wip" | "archived" | "needs-review";

/**
 * Clone status of a repository.
 */
export type CloneStatus = "cloned" | "missing" | "partial";

/**
 * Git working tree status.
 */
export type GitStatus = "clean" | "dirty" | "ahead" | "behind" | "diverged";

/**
 * Git remote definition.
 */
export interface RemoteDefinition {
  name: string;
  url: string;
  host?: string;
}

/**
 * Repository definition from inventory.
 */
export interface RepoDefinition {
  name: string;
  description?: string;
  remotes: RemoteDefinition[];
  local_path?: string | false;
  category?: string;
  status?: RepoStatus;
  language?: string;
  publish_targets?: string[];
  dependencies?: string[];
  keep_in_sync?: boolean;
  allow_agents?: boolean;
  notes?: string;
}

/**
 * Inventory metadata and defaults.
 */
export interface InventoryMeta {
  description?: string;
  last_updated?: string;
  defaults?: {
    language?: string;
    runtime?: string;
    keep_in_sync?: boolean;
    status?: RepoStatus;
  };
}

/**
 * Complete inventory configuration.
 */
export interface InventoryConfig {
  meta?: InventoryMeta;
  repos: RepoDefinition[];
}

/**
 * Workspace namespace configuration.
 */
export interface WorkspaceNamespaces {
  default: string;
  paths: string[];
}

/**
 * Workspace defaults.
 */
export interface WorkspaceDefaults {
  host?: string;
  clone_method?: "ssh" | "https";
  fetch_on_status?: boolean;
}

/**
 * Complete workspace configuration.
 */
export interface WorkspaceConfig {
  workspace: {
    name: string;
    root?: string;
    namespaces: WorkspaceNamespaces;
  };
  defaults?: WorkspaceDefaults;
}

/**
 * Repository with status information.
 */
export interface RepoWithStatus extends RepoDefinition {
  namespace: string;
  cloneStatus: CloneStatus;
  gitStatus?: GitStatus;
  currentBranch?: string;
  lastActivity?: Date;
  ahead?: number;
  behind?: number;
  absolutePath?: string;
}

/**
 * Workspace model combining config and inventories.
 */
export interface Workspace {
  config: WorkspaceConfig;
  rootPath: string;
  namespaces: Map<string, InventoryConfig>;
}
