/**
 * Context search functionality.
 *
 * Search across all scopes for matching content.
 *
 * @module
 */

import { exists, walk } from "@std/fs";
import { join, relative } from "@std/path";
import { parse as parseToml } from "@std/toml";
import type {
  ContextContentType,
  ContextSearchQuery,
  ContextSearchResult,
  ContextSearchResults,
  Scope,
} from "../types/mod.ts";
import { buildUri } from "./uri.ts";
import { getVisibleScopes } from "./scope.ts";

// Search scoring constants
const SCORE_PER_OCCURRENCE = 0.5; // Weight for each query match
const SCORE_EARLY_POSITION = 0.3; // Bonus for matches in first 100 chars
const SCORE_VERY_EARLY = 0.2; // Additional bonus for matches in first 50 chars
const EARLY_POSITION_THRESHOLD = 100; // Character position for early match
const VERY_EARLY_POSITION_THRESHOLD = 50; // Character position for very early match
const SNIPPET_LENGTH = 150; // Length of extracted snippet in characters

/**
 * Search context by query.
 *
 * Searches all visible scopes for matching content. Returns results
 * sorted by relevance score.
 *
 * @param dataPath - Root path to context data directory
 * @param query - Search query parameters
 * @returns Search results
 *
 * @example
 * ```ts
 * const results = await searchContext("/data", {
 *   query: "commit",
 *   scope: { level: "org", org: "hiisi" },
 *   types: ["rules"],
 *   limit: 10,
 * });
 * ```
 */
export async function searchContext(
  dataPath: string,
  query: ContextSearchQuery,
): Promise<ContextSearchResults> {
  // Determine which scopes to search
  const scopes = query.scope ? getVisibleScopes(query.scope) : [{ level: "global" as const }];

  const results: ContextSearchResult[] = [];

  // Search each scope
  for (const scope of scopes) {
    const scopeResults = await searchInScope(dataPath, scope, query);
    results.push(...scopeResults);
  }

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score);

  // Apply limit
  const limited = query.limit ? results.slice(0, query.limit) : results;

  return {
    query: query.query,
    totalCount: limited.length,
    results: limited,
  };
}

/**
 * Search within a specific scope.
 *
 * @param dataPath - Root data directory
 * @param scope - Scope to search in
 * @param query - Search query
 * @returns Results from this scope
 */
async function searchInScope(
  dataPath: string,
  scope: Scope,
  query: ContextSearchQuery,
): Promise<ContextSearchResult[]> {
  const scopePath = buildScopePath(dataPath, scope);

  if (!(await exists(scopePath))) {
    return [];
  }

  const results: ContextSearchResult[] = [];
  const queryLower = query.query.toLowerCase();

  // Walk the scope directory
  for await (const entry of walk(scopePath, { includeDirs: false, exts: [".toml"] })) {
    // Parse the path to determine type and resource path
    const relPath = relative(scopePath, entry.path);
    const parts = relPath.split("/");

    if (parts.length < 2) continue;

    const type = parts[0] as string;
    const resourcePath = parts.slice(1).join("/").replace(/\.toml$/, "");

    // Filter by type if specified
    if (query.types && query.types.length > 0) {
      const contentType = mapTypeToContentType(type);
      if (!query.types.includes(contentType)) {
        continue;
      }
    }

    // Check if file matches query
    const match = await checkMatch(entry.path, queryLower, query.includeSnippets);

    if (match.matches) {
      // Build URI for this result
      const uri = buildUri({
        org: scope.org,
        team: scope.team,
        type,
        path: resourcePath,
      });

      results.push({
        uri,
        type: mapTypeToContentType(type),
        scope,
        score: match.score,
        title: match.title || resourcePath,
        snippet: match.snippet,
      });
    }
  }

  return results;
}

/**
 * Check if a file matches the search query.
 *
 * @param filePath - Path to the file
 * @param queryLower - Lowercase query string
 * @param includeSnippets - Whether to extract snippets
 * @returns Match result with score and optional snippet
 */
async function checkMatch(
  filePath: string,
  queryLower: string,
  includeSnippets?: boolean,
): Promise<{
  matches: boolean;
  score: number;
  title?: string;
  snippet?: string;
}> {
  try {
    const content = await Deno.readTextFile(filePath);
    const contentLower = content.toLowerCase();

    // Check if query appears in content
    if (!contentLower.includes(queryLower)) {
      return { matches: false, score: 0 };
    }

    // Calculate score based on frequency and position
    const occurrences = countOccurrences(contentLower, queryLower);
    const firstIndex = contentLower.indexOf(queryLower);

    // Higher score for more occurrences and earlier position
    let score = occurrences * SCORE_PER_OCCURRENCE;
    if (firstIndex < EARLY_POSITION_THRESHOLD) score += SCORE_EARLY_POSITION;
    if (firstIndex < VERY_EARLY_POSITION_THRESHOLD) score += SCORE_VERY_EARLY;

    // Try to parse as TOML to get title
    let title: string | undefined;
    try {
      const parsed = parseToml(content) as Record<string, unknown>;
      title = extractTitle(parsed);
    } catch {
      // Not valid TOML or no title field
    }

    // Extract snippet if requested
    let snippet: string | undefined;
    if (includeSnippets) {
      snippet = extractSnippet(content, queryLower, firstIndex);
    }

    return {
      matches: true,
      score,
      title,
      snippet,
    };
  } catch {
    return { matches: false, score: 0 };
  }
}

/**
 * Count occurrences of a substring.
 */
function countOccurrences(str: string, substr: string): number {
  let count = 0;
  let pos = 0;

  while ((pos = str.indexOf(substr, pos)) !== -1) {
    count++;
    pos += substr.length;
  }

  return count;
}

/**
 * Extract a title from parsed TOML data.
 */
function extractTitle(data: Record<string, unknown>): string | undefined {
  // Check common title fields
  if (typeof data.name === "string") return data.name;
  if (typeof data.title === "string") return data.title;
  if (typeof data.id === "string") return data.id;

  // Check in nested identity object
  const identity = data.identity as Record<string, unknown> | undefined;
  if (identity) {
    if (typeof identity.name === "string") return identity.name;
    if (typeof identity.id === "string") return identity.id;
  }

  return undefined;
}

/**
 * Extract a snippet around the match location.
 */
function extractSnippet(content: string, query: string, position: number): string {
  const start = Math.max(0, position - 50);
  const end = Math.min(content.length, position + query.length + SNIPPET_LENGTH);

  let snippet = content.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";

  return snippet.trim();
}

/**
 * Build file path for a scope.
 */
function buildScopePath(dataPath: string, scope: Scope): string {
  const parts: string[] = [dataPath];

  if (scope.level === "org" || scope.level === "team") {
    parts.push(`~${scope.org}`);
  }

  if (scope.level === "team") {
    parts.push(`~${scope.team}`);
  }

  return parts.join("/");
}

/**
 * Map resource type to content type enum.
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
