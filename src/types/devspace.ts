/**
 * Devspace type definitions for tyvi.
 *
 * Devspace = the multi-repo development environment managed by tyvi.
 * Previously called "workspace" - renamed for clarity.
 *
 * @module
 */

// ============================================================================
// Repository Types
// ============================================================================

/**
 * Repository status indicating development state.
 */
export type RepoStatus =
  | "active"
  | "stable"
  | "wip"
  | "archived"
  | "needs-review";

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
 * Lightweight repo listing (no git status checks).
 */
export interface RepoListing {
  /** Repository name */
  name: string;
  /** Namespace it belongs to */
  namespace: string;
  /** Repository description */
  description?: string;
  /** Category */
  category?: string;
  /** Development status */
  status?: RepoStatus;
  /** Whether it exists on disk */
  cloneStatus: CloneStatus;
  /** Whether it's currently loaded to lab */
  loaded: boolean;
}

/**
 * Repository with full status information.
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

// ============================================================================
// Inventory Types
// ============================================================================

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
 * Complete inventory configuration (inventory.toml).
 */
export interface InventoryConfig {
  meta?: InventoryMeta;
  repos: RepoDefinition[];
}

// ============================================================================
// Devspace Configuration Types
// ============================================================================

/**
 * Namespace configuration for devspace.
 */
export interface DevspaceNamespaces {
  /** Default namespace (e.g., "@hiisi") */
  default: string;
  /** All namespace paths */
  paths: string[];
}

/**
 * Git policy configuration.
 */
export interface GitPolicy {
  /** Whether git restrictions are enabled */
  enabled: boolean;
  /** Paths where git operations are allowed */
  allowed_paths: string[];
}

/**
 * Devspace defaults.
 */
export interface DevspaceDefaults {
  host?: string;
  clone_method?: "ssh" | "https";
  fetch_on_status?: boolean;
}

/**
 * Devspace section of tyvi.toml.
 */
export interface DevspaceSection {
  /** Devspace name */
  name: string;
  /** Path to staging directory (cold repos) */
  staging_path?: string;
  /** Path to lab directory (active repos) */
  lab_path?: string;
  /** Path to state directory */
  state_path?: string;
  /** Path to tmp directory */
  tmp_path?: string;
  /** Path for external repo clones */
  ext_path?: string;
  /** Trusted GitHub organizations */
  trusted_orgs?: string[];
  /** Namespace configuration */
  namespaces?: DevspaceNamespaces;
  /** Git policy */
  git_policy?: GitPolicy;
}

/**
 * Complete devspace configuration (tyvi.toml).
 */
export interface DevspaceConfig {
  devspace: DevspaceSection;
  defaults?: DevspaceDefaults;
}

// ============================================================================
// State Types
// ============================================================================

/**
 * Entry in lab state tracking loaded repos.
 */
export interface LabStateEntry {
  /** Repository name */
  name: string;
  /** Namespace it came from */
  namespace: string;
  /** When it was loaded */
  loaded_at: string;
  /** Original staging path */
  staging_path: string;
}

/**
 * Lab state file (.state/lab.toml).
 */
export interface LabState {
  /** Currently loaded repos */
  repos: LabStateEntry[];
}

/**
 * Entry for external (non-inventory) repos.
 */
export interface ExtStateEntry {
  /** Repository name */
  name: string;
  /** Remote URL */
  url: string;
  /** When it was cloned */
  cloned_at: string;
  /** Whether it was offered for inventory addition */
  offered_inventory: boolean;
}

/**
 * External repos state file (.state/ext.toml).
 */
export interface ExtState {
  /** External repos */
  repos: ExtStateEntry[];
}

// ============================================================================
// Devspace Model
// ============================================================================

/**
 * Complete devspace model combining config and inventories.
 */
export interface Devspace {
  /** Devspace configuration */
  config: DevspaceConfig;
  /** Root path of the devspace */
  rootPath: string;
  /** Inventories by namespace */
  namespaces: Map<string, InventoryConfig>;
  /** Lab state */
  labState?: LabState;
  /** External repos state */
  extState?: ExtState;
}

// ============================================================================
// Operation Result Types
// ============================================================================

/**
 * Result of a load operation.
 */
export interface LoadResult {
  /** Repos that were loaded */
  loaded: string[];
  /** Repos that were already loaded */
  alreadyLoaded: string[];
  /** Repos that failed to load */
  failed: Array<{ name: string; error: string }>;
  /** Path to lab */
  labPath: string;
}

/**
 * Result of an unload operation.
 */
export interface UnloadResult {
  /** Repos that were unloaded */
  unloaded: string[];
  /** Repos that couldn't be unloaded (dirty/ahead) */
  refused: Array<{ name: string; reason: string }>;
}

/**
 * Result of a clone operation.
 */
export interface CloneResult {
  /** Repos that were cloned */
  cloned: string[];
  /** Repos that already existed */
  existed: string[];
  /** Repos that failed to clone */
  failed: Array<{ name: string; error: string }>;
}

/**
 * Result of a sync operation.
 */
export interface SyncResult {
  /** Repos that were fetched */
  fetched: string[];
  /** Repos that were pruned */
  pruned: string[];
  /** Repos that had errors */
  errors: Array<{ name: string; error: string }>;
}

/**
 * Options for sync operation.
 */
export interface SyncOptions {
  /** Whether to fetch from remotes */
  fetch?: boolean;
  /** Whether to prune deleted branches */
  prune?: boolean;
}

// ============================================================================
// Git Restriction Types
// ============================================================================

/**
 * Result of checking whether git operations are allowed at a path.
 */
export interface GitCheckResult {
  /** Whether git is allowed */
  allowed: boolean;
  /** Reason for the result */
  reason: "lab" | "root" | "whitelist" | "outside_project" | "blocked";
  /** Human-readable message (populated when blocked) */
  message?: string;
  /** Suggested action (populated when blocked) */
  suggestion?: string;
}

// ============================================================================
// Init Types
// ============================================================================

/**
 * Options for initializing a new devspace.
 */
export interface InitOptions {
  /** Devspace name */
  name: string;
  /** Namespace paths (defaults to ["@default"]) */
  namespaces?: string[];
  /** Default namespace (defaults to first namespace) */
  defaultNamespace?: string;
  /** Lab path relative to root (defaults to ".lab") */
  labPath?: string;
  /** Staging path relative to root (defaults to ".staging") */
  stagingPath?: string;
  /** State path relative to root (defaults to ".state") */
  statePath?: string;
  /** Tmp path relative to root (defaults to ".tmp") */
  tmpPath?: string;
  /** Enable git policy */
  gitPolicy?: boolean;
  /** Git policy allowed paths */
  gitAllowedPaths?: string[];
}

/**
 * Result of devspace initialization.
 */
export interface InitResult {
  /** Root path of the created devspace */
  rootPath: string;
  /** Directories that were created */
  created: string[];
  /** Path to the generated tyvi.toml */
  configPath: string;
}
