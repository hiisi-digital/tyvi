/**
 * Context resolution with fallback.
 *
 * Resolves ctx:// URIs to actual content, with scope-based fallback.
 *
 * @module
 */

import { exists } from "@std/fs";
import { parse as parseToml } from "@std/toml";
import type { ContextContent, ContextContentType, ResolvedContext, Scope } from "../types/mod.ts";
import { parseUri } from "./uri.ts";
import { buildScopeChain, formatScope } from "./scope.ts";

/**
 * Resolve a ctx:// URI to actual content.
 *
 * Searches for content in the scope hierarchy with fallback:
 * - For team scope: checks team, then org, then global
 * - For org scope: checks org, then global
 * - For global scope: checks global only
 *
 * @param dataPath - Root path to context data directory
 * @param uri - The ctx:// URI to resolve
 * @returns Resolved context with content and provenance
 * @throws Error if URI cannot be resolved
 *
 * @example
 * ```ts
 * const resolved = await resolveContext("/data", "ctx://~hiisi/rules/commit-style");
 * console.log(resolved.content.data);
 * console.log(resolved.resolvedAt); // { level: "org", org: "hiisi" }
 * ```
 */
export async function resolveContext(
  dataPath: string,
  uri: string,
): Promise<ResolvedContext> {
  const parsed = parseUri(uri);

  // Build scope from parsed URI
  const requestedScope: Scope = {
    level: parsed.scopeLevel,
    org: parsed.org,
    team: parsed.team,
  };

  // Build fallback chain
  const scopeChain = buildScopeChain(requestedScope);

  // Try each scope in the chain
  for (let i = 0; i < scopeChain.fallbackChain.length; i++) {
    const scope = scopeChain.fallbackChain[i];
    if (!scope) continue;

    const filePath = buildFilePath(dataPath, scope, parsed.type, parsed.path);

    if (await exists(filePath)) {
      const content = await loadContent(filePath, parsed.type);

      return {
        uri,
        parsed,
        resolvedAt: scope,
        usedFallback: i > 0,
        content,
        provenance: [{
          scope,
          key: parsed.path,
          overridden: false,
        }],
      };
    }
  }

  // Not found in any scope
  throw new Error(
    `Failed to resolve ${uri}\n` +
      `Searched scopes: ${scopeChain.fallbackChain.map(formatScope).join(" → ")}\n` +
      `Data path: ${dataPath}`,
  );
}

/**
 * Build file path for a given scope and resource.
 *
 * Directory structure:
 * - Global: {dataPath}/{type}/{path}.toml
 * - Org: {dataPath}/~{org}/{type}/{path}.toml
 * - Team: {dataPath}/~{org}/~{team}/{type}/{path}.toml
 *
 * @param dataPath - Root data directory
 * @param scope - The scope to search in
 * @param type - Resource type
 * @param path - Resource path
 * @returns Full file path
 */
function buildFilePath(
  dataPath: string,
  scope: Scope,
  type: string,
  path: string,
): string {
  const parts: string[] = [dataPath];

  if (scope.level === "org" || scope.level === "team") {
    parts.push(`~${scope.org}`);
  }

  if (scope.level === "team") {
    parts.push(`~${scope.team}`);
  }

  parts.push(type);

  // Add .toml extension if not present
  const fileName = path.endsWith(".toml") ? path : `${path}.toml`;
  parts.push(fileName);

  return parts.join("/");
}

/**
 * Load and parse content from a file.
 *
 * @param filePath - Path to the file
 * @param type - Expected content type
 * @returns Parsed content
 */
async function loadContent(
  filePath: string,
  type: string,
): Promise<ContextContent> {
  const fileContent = await Deno.readTextFile(filePath);
  const data = parseToml(fileContent);

  // Get file stats for last modified
  const stat = await Deno.stat(filePath);
  const lastModified = stat.mtime?.toISOString();

  return {
    type: mapTypeToContentType(type),
    data,
    sourcePath: filePath,
    lastModified,
  };
}

/**
 * Map resource type to content type enum.
 *
 * @param type - Resource type from URI
 * @returns Content type
 */
function mapTypeToContentType(type: string): ContextContentType {
  switch (type) {
    case "person":
      return "person";
    case "memory":
      return "memory";
    case "rules":
      return "rules";
    case "research":
      return "research";
    case "config":
      return "config";
    case "reference":
      return "reference";
    default:
      return "unknown";
  }
}

/**
 * Check if a URI can be resolved without actually loading content.
 *
 * @param dataPath - Root data directory
 * @param uri - URI to check
 * @returns true if the URI can be resolved
 */
export async function canResolve(dataPath: string, uri: string): Promise<boolean> {
  try {
    await resolveContext(dataPath, uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve multiple URIs in batch.
 *
 * More efficient than resolving one at a time when multiple URIs
 * need to be resolved from the same context.
 *
 * @param dataPath - Root data directory
 * @param uris - Array of URIs to resolve
 * @returns Map of URI to resolved context (excludes failed resolutions)
 */
export async function resolveContextBatch(
  dataPath: string,
  uris: string[],
): Promise<Map<string, ResolvedContext>> {
  const results = new Map<string, ResolvedContext>();

  for (const uri of uris) {
    try {
      const resolved = await resolveContext(dataPath, uri);
      results.set(uri, resolved);
    } catch {
      // Skip failed resolutions
    }
  }

  return results;
}
