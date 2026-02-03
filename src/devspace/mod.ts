/**
 * Devspace management operations.
 * @module
 */

export { addRepo, clone, getStatus, removeRepo, sync } from "./operations.ts";

// Git restriction and shell integration
export {
  checkGitAllowed,
  findDevspaceRoot,
  getBlockedMessage,
  isInLab,
  isInWhitelist,
} from "./git.ts";

export { detectShell, generateEnvrc, generateShellInit, hasDirenv } from "./shell.ts";

export { generatePreCommitHook, hasHooks, installHooks } from "./hooks.ts";

export { validateGuards } from "./validation.ts";
