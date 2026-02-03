/**
 * Git restriction and shell integration type definitions.
 *
 * Types for managing git restrictions in devspaces, shell integration,
 * and validation of guards.
 *
 * @module
 */

// Re-export GitPolicy from devspace types
export type { GitPolicy } from "./devspace.ts";

// ============================================================================
// Git Check Result Types
// ============================================================================

/**
 * Result of checking if git is allowed at a path.
 */
export interface GitCheckResult {
  /** Whether git operations are allowed */
  allowed: boolean;
  /** Why git is allowed/blocked */
  reason: "lab" | "root" | "whitelist" | "outside_project" | "blocked";
  /** Human-readable message */
  message?: string;
  /** Suggested action if blocked */
  suggestion?: string;
}

// ============================================================================
// Shell Integration Types
// ============================================================================

/**
 * Shell detection result.
 */
export interface ShellIntegration {
  /** Detected shell type */
  shell: "zsh" | "bash" | "fish" | "unknown";
  /** Path to RC file (null if not found) */
  rcFile: string | null;
  /** Whether user has existing git alias */
  hasExistingAlias: boolean;
  /** Existing alias value if any */
  existingAlias?: string;
}

// ============================================================================
// Initialization Types
// ============================================================================

/**
 * Options for devspace initialization.
 */
export interface InitOptions {
  /** Install shell integration (append to RC file) */
  installShellIntegration: boolean;
  /** Create .envrc files (requires direnv) */
  installDirenv: boolean;
  /** Create .envrc in parent directory too */
  installParentDirenv: boolean;
  /** Install git hooks in .git/hooks/ */
  installHooks: boolean;
}

/**
 * Result of devspace initialization.
 */
export interface InitResult {
  /** Whether init succeeded */
  success: boolean;
  /** What was created/installed */
  created: string[];
  /** Warnings (non-fatal issues) */
  warnings: string[];
  /** Path to shell init script */
  shellInitPath?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result for guard checks.
 */
export interface ValidationResult {
  /** Whether all guards are valid */
  valid: boolean;
  /** List of issues found */
  issues: ValidationIssue[];
}

/**
 * Single validation issue.
 */
export interface ValidationIssue {
  /** Category of issue */
  type: "shell" | "direnv" | "hooks" | "config" | "paths";
  /** How serious */
  severity: "error" | "warning";
  /** What's wrong */
  message: string;
  /** How to fix (optional) */
  fix?: string;
}
