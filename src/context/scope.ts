/**
 * Scope hierarchy and chain building.
 *
 * Manages scope resolution order with fallback:
 * Team → Org → Global
 *
 * @module
 */

import type { Scope, ScopeChain, ScopeLevel } from "../types/mod.ts";

/**
 * Build a scope chain for fallback resolution.
 *
 * Given a scope, returns the chain of scopes to check in order:
 * - Team scope: [team, org, global]
 * - Org scope: [org, global]
 * - Global scope: [global]
 *
 * @param scope - The scope to build a chain for
 * @returns Scope chain with fallback order
 *
 * @example
 * ```ts
 * const chain = buildScopeChain({ level: "team", org: "hiisi", team: "correctness" });
 * // Returns: [
 * //   { level: "team", org: "hiisi", team: "correctness" },
 * //   { level: "org", org: "hiisi" },
 * //   { level: "global" }
 * // ]
 * ```
 */
export function buildScopeChain(scope: Scope): ScopeChain {
  const chain: Scope[] = [];

  // Start with the requested scope
  chain.push(scope);

  // Add fallback scopes based on level
  if (scope.level === "team") {
    // Team falls back to org, then global
    if (scope.org) {
      chain.push({ level: "org", org: scope.org });
    }
    chain.push({ level: "global" });
  } else if (scope.level === "org") {
    // Org falls back to global
    chain.push({ level: "global" });
  }
  // Global has no fallback

  return {
    scope,
    fallbackChain: chain,
  };
}

/**
 * Check if two scopes match exactly.
 *
 * @param a - First scope
 * @param b - Second scope
 * @returns true if scopes match
 */
export function scopeMatches(a: Scope, b: Scope): boolean {
  if (a.level !== b.level) {
    return false;
  }

  if (a.level === "global") {
    return true;
  }

  if (a.level === "org" || a.level === "team") {
    if (a.org !== b.org) {
      return false;
    }
  }

  if (a.level === "team") {
    if (a.team !== b.team) {
      return false;
    }
  }

  return true;
}

/**
 * Get all scopes that are visible from a given scope.
 *
 * Based on visibility rules:
 * - Global: only global
 * - Org: own org + global
 * - Team: own team + own org + global
 *
 * @param scope - The scope to get visible scopes for
 * @returns Array of visible scopes (including the original)
 */
export function getVisibleScopes(scope: Scope): Scope[] {
  const chain = buildScopeChain(scope);
  return chain.fallbackChain;
}

/**
 * Create a scope from components.
 *
 * @param level - Scope level
 * @param org - Organization (required for org and team levels)
 * @param team - Team (required for team level)
 * @returns Constructed scope
 * @throws Error if required fields are missing
 */
export function createScope(
  level: ScopeLevel,
  org?: string,
  team?: string,
): Scope {
  if (level === "org" && !org) {
    throw new Error("Org scope requires org field");
  }

  if (level === "team") {
    if (!org) {
      throw new Error("Team scope requires org field");
    }
    if (!team) {
      throw new Error("Team scope requires team field");
    }
  }

  return {
    level,
    org,
    team,
  };
}

/**
 * Format a scope as a human-readable string.
 *
 * @param scope - Scope to format
 * @returns Formatted string
 *
 * @example
 * ```ts
 * formatScope({ level: "global" }); // "global"
 * formatScope({ level: "org", org: "hiisi" }); // "~hiisi"
 * formatScope({ level: "team", org: "hiisi", team: "correctness" }); // "~hiisi/~correctness"
 * ```
 */
export function formatScope(scope: Scope): string {
  if (scope.level === "global") {
    return "global";
  }

  if (scope.level === "org") {
    return `~${scope.org}`;
  }

  if (scope.level === "team") {
    return `~${scope.org}/~${scope.team}`;
  }

  return "unknown";
}
