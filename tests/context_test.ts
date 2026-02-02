/**
 * Tests for context resolution system.
 */

import { assertEquals, assertExists, assertRejects, assertThrows } from "@std/assert";
import { join } from "@std/path";
import {
  buildScopeChain,
  buildUri,
  canResolve,
  createScope,
  formatScope,
  parseUri,
  resolveContext,
  scopeMatches,
  searchContext,
  validateUri,
} from "../src/context/mod.ts";

// ============================================================================
// URI Parsing Tests
// ============================================================================

Deno.test("parseUri - global scope", () => {
  const parsed = parseUri("ctx://person/alex");

  assertEquals(parsed.scheme, "ctx");
  assertEquals(parsed.scopeLevel, "global");
  assertEquals(parsed.org, undefined);
  assertEquals(parsed.team, undefined);
  assertEquals(parsed.type, "person");
  assertEquals(parsed.path, "alex");
  assertEquals(parsed.raw, "ctx://person/alex");
});

Deno.test("parseUri - org scope", () => {
  const parsed = parseUri("ctx://~hiisi/rules/commit-style");

  assertEquals(parsed.scheme, "ctx");
  assertEquals(parsed.scopeLevel, "org");
  assertEquals(parsed.org, "hiisi");
  assertEquals(parsed.team, undefined);
  assertEquals(parsed.type, "rules");
  assertEquals(parsed.path, "commit-style");
});

Deno.test("parseUri - team scope", () => {
  const parsed = parseUri("ctx://~hiisi/~correctness/research/types");

  assertEquals(parsed.scheme, "ctx");
  assertEquals(parsed.scopeLevel, "team");
  assertEquals(parsed.org, "hiisi");
  assertEquals(parsed.team, "correctness");
  assertEquals(parsed.type, "research");
  assertEquals(parsed.path, "types");
});

Deno.test("parseUri - nested path", () => {
  const parsed = parseUri("ctx://research/category/subcategory/item");

  assertEquals(parsed.type, "research");
  assertEquals(parsed.path, "category/subcategory/item");
});

Deno.test("parseUri - invalid empty string", () => {
  assertThrows(
    () => parseUri(""),
    Error,
    "must be a non-empty string",
  );
});

Deno.test("parseUri - missing scheme", () => {
  assertThrows(
    () => parseUri("person/alex"),
    Error,
    "missing scheme",
  );
});

Deno.test("parseUri - missing path", () => {
  assertThrows(
    () => parseUri("ctx://person"),
    Error,
    "must have at least type and path",
  );
});

Deno.test("validateUri - valid URI", () => {
  assertEquals(validateUri("ctx://person/alex"), true);
});

Deno.test("validateUri - invalid URI throws", () => {
  assertThrows(
    () => validateUri("invalid"),
    Error,
  );
});

// ============================================================================
// URI Building Tests
// ============================================================================

Deno.test("buildUri - global scope", () => {
  const uri = buildUri({ type: "person", path: "alex" });
  assertEquals(uri, "ctx://person/alex");
});

Deno.test("buildUri - org scope", () => {
  const uri = buildUri({ org: "hiisi", type: "rules", path: "commit-style" });
  assertEquals(uri, "ctx://~hiisi/rules/commit-style");
});

Deno.test("buildUri - team scope", () => {
  const uri = buildUri({
    org: "hiisi",
    team: "correctness",
    type: "research",
    path: "types",
  });
  assertEquals(uri, "ctx://~hiisi/~correctness/research/types");
});

Deno.test("buildUri - team without org throws", () => {
  assertThrows(
    () => buildUri({ team: "correctness", type: "research", path: "types" }),
    Error,
    "Cannot specify team without org",
  );
});

// ============================================================================
// Scope Tests
// ============================================================================

Deno.test("createScope - global", () => {
  const scope = createScope("global");
  assertEquals(scope.level, "global");
  assertEquals(scope.org, undefined);
  assertEquals(scope.team, undefined);
});

Deno.test("createScope - org", () => {
  const scope = createScope("org", "hiisi");
  assertEquals(scope.level, "org");
  assertEquals(scope.org, "hiisi");
  assertEquals(scope.team, undefined);
});

Deno.test("createScope - team", () => {
  const scope = createScope("team", "hiisi", "correctness");
  assertEquals(scope.level, "team");
  assertEquals(scope.org, "hiisi");
  assertEquals(scope.team, "correctness");
});

Deno.test("createScope - org without org name throws", () => {
  assertThrows(
    () => createScope("org"),
    Error,
    "Org scope requires org field",
  );
});

Deno.test("createScope - team without org throws", () => {
  assertThrows(
    () => createScope("team", undefined, "correctness"),
    Error,
    "Team scope requires org field",
  );
});

Deno.test("createScope - team without team name throws", () => {
  assertThrows(
    () => createScope("team", "hiisi"),
    Error,
    "Team scope requires team field",
  );
});

Deno.test("formatScope - global", () => {
  const scope = createScope("global");
  assertEquals(formatScope(scope), "global");
});

Deno.test("formatScope - org", () => {
  const scope = createScope("org", "hiisi");
  assertEquals(formatScope(scope), "~hiisi");
});

Deno.test("formatScope - team", () => {
  const scope = createScope("team", "hiisi", "correctness");
  assertEquals(formatScope(scope), "~hiisi/~correctness");
});

Deno.test("scopeMatches - global matches global", () => {
  const a = createScope("global");
  const b = createScope("global");
  assertEquals(scopeMatches(a, b), true);
});

Deno.test("scopeMatches - org matches org", () => {
  const a = createScope("org", "hiisi");
  const b = createScope("org", "hiisi");
  assertEquals(scopeMatches(a, b), true);
});

Deno.test("scopeMatches - team matches team", () => {
  const a = createScope("team", "hiisi", "correctness");
  const b = createScope("team", "hiisi", "correctness");
  assertEquals(scopeMatches(a, b), true);
});

Deno.test("scopeMatches - different levels don't match", () => {
  const a = createScope("global");
  const b = createScope("org", "hiisi");
  assertEquals(scopeMatches(a, b), false);
});

Deno.test("scopeMatches - different orgs don't match", () => {
  const a = createScope("org", "hiisi");
  const b = createScope("org", "other");
  assertEquals(scopeMatches(a, b), false);
});

Deno.test("scopeMatches - different teams don't match", () => {
  const a = createScope("team", "hiisi", "correctness");
  const b = createScope("team", "hiisi", "core");
  assertEquals(scopeMatches(a, b), false);
});

// ============================================================================
// Scope Chain Tests
// ============================================================================

Deno.test("buildScopeChain - global", () => {
  const scope = createScope("global");
  const chain = buildScopeChain(scope);

  assertEquals(chain.fallbackChain.length, 1);
  assertEquals(chain.fallbackChain[0]?.level, "global");
});

Deno.test("buildScopeChain - org", () => {
  const scope = createScope("org", "hiisi");
  const chain = buildScopeChain(scope);

  assertEquals(chain.fallbackChain.length, 2);
  assertEquals(chain.fallbackChain[0]?.level, "org");
  assertEquals(chain.fallbackChain[0]?.org, "hiisi");
  assertEquals(chain.fallbackChain[1]?.level, "global");
});

Deno.test("buildScopeChain - team", () => {
  const scope = createScope("team", "hiisi", "correctness");
  const chain = buildScopeChain(scope);

  assertEquals(chain.fallbackChain.length, 3);
  assertEquals(chain.fallbackChain[0]?.level, "team");
  assertEquals(chain.fallbackChain[0]?.org, "hiisi");
  assertEquals(chain.fallbackChain[0]?.team, "correctness");
  assertEquals(chain.fallbackChain[1]?.level, "org");
  assertEquals(chain.fallbackChain[1]?.org, "hiisi");
  assertEquals(chain.fallbackChain[2]?.level, "global");
});

// ============================================================================
// Resolution Tests (with fixtures)
// ============================================================================

Deno.test("resolveContext - global person", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "context");
  const uri = "ctx://person/alex";

  const resolved = await resolveContext(fixturePath, uri);

  assertExists(resolved);
  assertEquals(resolved.uri, uri);
  assertEquals(resolved.parsed.scopeLevel, "global");
  assertEquals(resolved.resolvedAt.level, "global");
  assertEquals(resolved.usedFallback, false);
  assertExists(resolved.content.data);
});

Deno.test("resolveContext - org with fallback to global", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "context");
  const uri = "ctx://~hiisi/person/alex";

  const resolved = await resolveContext(fixturePath, uri);

  assertExists(resolved);
  // Should fall back to global if not found in org
  assertEquals(resolved.resolvedAt.level, "global");
  assertEquals(resolved.usedFallback, true);
});

Deno.test("resolveContext - not found throws", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "context");
  const uri = "ctx://person/nonexistent";

  await assertRejects(
    async () => await resolveContext(fixturePath, uri),
    Error,
    "Failed to resolve",
  );
});

Deno.test("canResolve - returns true for existing", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "context");
  const uri = "ctx://person/alex";

  const result = await canResolve(fixturePath, uri);
  assertEquals(result, true);
});

Deno.test("canResolve - returns false for nonexistent", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "context");
  const uri = "ctx://person/nonexistent";

  const result = await canResolve(fixturePath, uri);
  assertEquals(result, false);
});

// ============================================================================
// Search Tests (with fixtures)
// ============================================================================

Deno.test("searchContext - find matching content", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "context");

  const results = await searchContext(fixturePath, {
    query: "alex",
  });

  assertExists(results);
  assertEquals(results.query, "alex");
  // Should find at least one result
  assertEquals(results.totalCount >= 1, true);
});

Deno.test("searchContext - with type filter", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "context");

  const results = await searchContext(fixturePath, {
    query: "alex",
    types: ["person"],
  });

  assertExists(results);
  // All results should be person type
  for (const result of results.results) {
    assertEquals(result.type, "person");
  }
});

Deno.test("searchContext - with limit", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "context");

  const results = await searchContext(fixturePath, {
    query: "test",
    limit: 2,
  });

  assertExists(results);
  // totalCount should be at most the limit
  assertEquals(results.totalCount <= 2, true);
  // results array length should match totalCount
  assertEquals(results.results.length, results.totalCount);
});

Deno.test("searchContext - no results for nonexistent query", async () => {
  const fixturePath = join(Deno.cwd(), "tests", "fixtures", "context");

  const results = await searchContext(fixturePath, {
    query: "nonexistentquerystringthatwontmatch",
  });

  assertExists(results);
  assertEquals(results.totalCount, 0);
  assertEquals(results.results.length, 0);
});
