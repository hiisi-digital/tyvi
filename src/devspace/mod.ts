/**
 * Devspace management operations.
 * @module
 */

export {
  addRepo,
  clone,
  getStatus,
  listRepos,
  load,
  removeRepo,
  sync,
  unload,
} from "./operations.ts";
export { readExtState, readLabState, writeExtState, writeLabState } from "./state.ts";
export { checkGitAllowed, getBlockedMessage } from "./restrictions.ts";
export { deleteEntry, migrateRepo, scanDirectory, suggestNamespace } from "./migration.ts";

// Shell integration
export { appendToRcFile, detectShell, generateShellInit, writeShellInit } from "./shell.ts";

// direnv integration
export { allowDirenv, generateEnvrc, hasDirenv, writeEnvrc } from "./direnv.ts";

// Git hooks
export { generateHook, hasHooks, installHooks, removeHooks } from "./hooks.ts";

// Validation
export { validateGuards } from "./validation.ts";
