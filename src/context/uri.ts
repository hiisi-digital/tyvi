/**
 * URI parsing for context resolution.
 *
 * Parses ctx:// URIs into their component parts:
 * - ctx://person/alex — Global person
 * - ctx://~hiisi/rules/commit-style — Org-scoped
 * - ctx://~hiisi/~correctness/research/types — Team-scoped
 *
 * @module
 */

import type { ParsedUri, ScopeLevel, UriScheme } from "../types/mod.ts";

/**
 * Parse a ctx:// URI into its component parts.
 *
 * @param uri - The URI to parse (e.g., "ctx://~hiisi/rules/commit-style")
 * @returns Parsed URI components
 * @throws Error if URI is malformed
 *
 * @example
 * ```ts
 * const parsed = parseUri("ctx://person/alex");
 * console.log(parsed.scopeLevel); // "global"
 * console.log(parsed.type); // "person"
 * console.log(parsed.path); // "alex"
 * ```
 */
export function parseUri(uri: string): ParsedUri {
  if (!uri || typeof uri !== "string") {
    throw new Error("Invalid URI: must be a non-empty string");
  }

  // Extract scheme
  const schemeMatch = uri.match(/^([a-z]+):\/\//);
  if (!schemeMatch) {
    throw new Error(
      `Invalid URI: missing scheme.\n` +
        `Expected format: ctx://[~org/][~team/]{type}/{path}\n` +
        `Got: ${uri}`,
    );
  }

  const scheme = schemeMatch[1] as UriScheme;
  const rest = uri.slice(schemeMatch[0].length);

  // Parse scope prefixes and path
  const parts = rest.split("/").filter((p) => p.length > 0);

  if (parts.length < 2) {
    throw new Error(
      `Invalid URI: must have at least type and path.\n` +
        `Expected format: ctx://[~org/][~team/]{type}/{path}\n` +
        `Got: ${uri}`,
    );
  }

  let org: string | undefined;
  let team: string | undefined;
  let scopeLevel: ScopeLevel = "global";
  let idx = 0;

  // Check for org scope (starts with ~)
  if (parts[idx]?.startsWith("~")) {
    org = parts[idx]!.slice(1);
    scopeLevel = "org";
    idx++;

    // Check for team scope (also starts with ~)
    if (parts[idx]?.startsWith("~")) {
      team = parts[idx]!.slice(1);
      scopeLevel = "team";
      idx++;
    }
  }

  // Remaining parts are type and path
  if (idx >= parts.length) {
    throw new Error(
      `Invalid URI: missing type and path after scope.\n` +
        `Expected format: ctx://[~org/][~team/]{type}/{path}\n` +
        `Got: ${uri}`,
    );
  }

  const type = parts[idx];
  const pathParts = parts.slice(idx + 1);

  if (!type || pathParts.length === 0) {
    throw new Error(
      `Invalid URI: must have both type and path.\n` +
        `Expected format: ctx://[~org/][~team/]{type}/{path}\n` +
        `Got: ${uri}`,
    );
  }

  const path = pathParts.join("/");

  return {
    raw: uri,
    scheme,
    org,
    team,
    type,
    path,
    scopeLevel,
  };
}

/**
 * Validate that a URI is well-formed.
 *
 * @param uri - URI to validate
 * @returns true if valid
 * @throws Error if invalid
 */
export function validateUri(uri: string): boolean {
  parseUri(uri); // Will throw if invalid
  return true;
}

/**
 * Build a URI from components.
 *
 * @param options - URI components
 * @returns Constructed URI string
 *
 * @example
 * ```ts
 * const uri = buildUri({ type: "person", path: "alex" });
 * console.log(uri); // "ctx://person/alex"
 *
 * const uri2 = buildUri({ org: "hiisi", type: "rules", path: "commit-style" });
 * console.log(uri2); // "ctx://~hiisi/rules/commit-style"
 * ```
 */
export function buildUri(options: {
  scheme?: UriScheme;
  org?: string;
  team?: string;
  type: string;
  path: string;
}): string {
  const scheme = options.scheme ?? "ctx";
  let uri = `${scheme}://`;

  if (options.org) {
    uri += `~${options.org}/`;
  }

  if (options.team) {
    if (!options.org) {
      throw new Error("Cannot specify team without org");
    }
    uri += `~${options.team}/`;
  }

  uri += `${options.type}/${options.path}`;

  return uri;
}
