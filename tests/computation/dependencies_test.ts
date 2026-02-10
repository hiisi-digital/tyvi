/**
 * Tests for dependency analysis
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  analyzeDependencies,
  buildDependencyGraph,
  extractDependencies,
  formatCycle,
  isCircular,
} from "../../src/computation/dependencies.ts";
import { tokenize } from "../../src/computation/lexer.ts";
import { parse } from "../../src/computation/parser.ts";

/**
 * Helper to extract dependencies from an expression string
 */
function deps(expr: string): string[] {
  const tokens = tokenize(expr);
  const ast = parse(tokens);
  return extractDependencies(ast);
}

// =============================================================================
// extractDependencies
// =============================================================================

Deno.test("extractDependencies - number literal has no deps", () => {
  assertEquals(deps("42"), []);
});

Deno.test("extractDependencies - special values have no deps", () => {
  assertEquals(deps("$base"), []);
  assertEquals(deps("$current"), []);
});

Deno.test("extractDependencies - single identifier", () => {
  assertEquals(deps("trait.caution"), ["trait.caution"]);
});

Deno.test("extractDependencies - multiple identifiers", () => {
  const result = deps("trait.caution + skill.debugging");
  assertEquals(result.includes("trait.caution"), true);
  assertEquals(result.includes("skill.debugging"), true);
  assertEquals(result.length, 2);
});

Deno.test("extractDependencies - wildcard", () => {
  assertEquals(deps("avg(trait.*)"), ["trait.*"]);
});

Deno.test("extractDependencies - mixed identifiers and wildcards", () => {
  const result = deps("trait.caution + avg(skill.*)");
  assertEquals(result.includes("trait.caution"), true);
  assertEquals(result.includes("skill.*"), true);
  assertEquals(result.length, 2);
});

Deno.test("extractDependencies - nested expressions", () => {
  const result = deps("max(trait.a, min(skill.b, exp.c))");
  assertEquals(result.includes("trait.a"), true);
  assertEquals(result.includes("skill.b"), true);
  assertEquals(result.includes("exp.c"), true);
  assertEquals(result.length, 3);
});

Deno.test("extractDependencies - deduplicates repeated identifiers", () => {
  const result = deps("trait.caution + trait.caution * 2");
  assertEquals(result, ["trait.caution"]);
});

Deno.test("extractDependencies - complex expression", () => {
  const result = deps("$base + trait.caution * 0.3 + avg(skill.*) - exp.rust");
  assertEquals(result.includes("trait.caution"), true);
  assertEquals(result.includes("skill.*"), true);
  assertEquals(result.includes("exp.rust"), true);
  assertEquals(result.length, 3);
});

// =============================================================================
// buildDependencyGraph
// =============================================================================

Deno.test("buildDependencyGraph - creates map from dependencies", () => {
  const dependencies = [
    { target: "trait.derived", dependencies: ["trait.base"] },
    { target: "skill.computed", dependencies: ["trait.derived", "exp.rust"] },
  ];

  const graph = buildDependencyGraph(dependencies);

  assertEquals(graph.get("trait.derived"), ["trait.base"]);
  assertEquals(graph.get("skill.computed"), ["trait.derived", "exp.rust"]);
  assertEquals(graph.size, 2);
});

Deno.test("buildDependencyGraph - handles empty dependencies", () => {
  const dependencies = [
    { target: "trait.standalone", dependencies: [] },
  ];

  const graph = buildDependencyGraph(dependencies);

  assertEquals(graph.get("trait.standalone"), []);
});

// =============================================================================
// analyzeDependencies - topological sort
// =============================================================================

Deno.test("analyzeDependencies - simple chain", () => {
  // C depends on B, B depends on A
  // Order should be: A, B, C
  const dependencies = [
    { target: "C", dependencies: ["B"] },
    { target: "B", dependencies: ["A"] },
    { target: "A", dependencies: [] },
  ];

  const { order, cycles } = analyzeDependencies(dependencies);

  assertEquals(cycles.length, 0);
  // A must come before B, B must come before C
  const aIndex = order.indexOf("A");
  const bIndex = order.indexOf("B");
  const cIndex = order.indexOf("C");
  assertEquals(aIndex < bIndex, true, "A should come before B");
  assertEquals(bIndex < cIndex, true, "B should come before C");
});

Deno.test("analyzeDependencies - independent nodes", () => {
  const dependencies = [
    { target: "A", dependencies: [] },
    { target: "B", dependencies: [] },
    { target: "C", dependencies: [] },
  ];

  const { order, cycles } = analyzeDependencies(dependencies);

  assertEquals(cycles.length, 0);
  assertEquals(order.length, 3);
  // All should be present, order doesn't matter
  assertEquals(order.includes("A"), true);
  assertEquals(order.includes("B"), true);
  assertEquals(order.includes("C"), true);
});

Deno.test("analyzeDependencies - diamond dependency", () => {
  //     A
  //    / \
  //   B   C
  //    \ /
  //     D
  const dependencies = [
    { target: "D", dependencies: ["B", "C"] },
    { target: "B", dependencies: ["A"] },
    { target: "C", dependencies: ["A"] },
    { target: "A", dependencies: [] },
  ];

  const { order, cycles } = analyzeDependencies(dependencies);

  assertEquals(cycles.length, 0);
  const aIndex = order.indexOf("A");
  const bIndex = order.indexOf("B");
  const cIndex = order.indexOf("C");
  const dIndex = order.indexOf("D");
  assertEquals(aIndex < bIndex, true, "A should come before B");
  assertEquals(aIndex < cIndex, true, "A should come before C");
  assertEquals(bIndex < dIndex, true, "B should come before D");
  assertEquals(cIndex < dIndex, true, "C should come before D");
});

Deno.test("analyzeDependencies - skips external dependencies", () => {
  // B depends on A, but A is external (not in graph)
  const dependencies = [
    { target: "B", dependencies: ["A"] },
  ];

  const { order, cycles } = analyzeDependencies(dependencies);

  assertEquals(cycles.length, 0);
  assertEquals(order, ["B"]);
});

Deno.test("analyzeDependencies - skips wildcard dependencies", () => {
  // Wildcards should not affect ordering
  const dependencies = [
    { target: "A", dependencies: ["trait.*"] },
    { target: "B", dependencies: ["A", "skill.*"] },
  ];

  const { order, cycles } = analyzeDependencies(dependencies);

  assertEquals(cycles.length, 0);
  const aIndex = order.indexOf("A");
  const bIndex = order.indexOf("B");
  assertEquals(aIndex < bIndex, true, "A should come before B");
});

// =============================================================================
// analyzeDependencies - cycle detection
// =============================================================================

Deno.test("analyzeDependencies - detects simple cycle", () => {
  // A -> B -> A
  const dependencies = [
    { target: "A", dependencies: ["B"] },
    { target: "B", dependencies: ["A"] },
  ];

  const { cycles } = analyzeDependencies(dependencies);

  assertEquals(cycles.length > 0, true, "Should detect cycle");
});

Deno.test("analyzeDependencies - detects self-reference cycle", () => {
  // A -> A
  const dependencies = [
    { target: "A", dependencies: ["A"] },
  ];

  const { cycles } = analyzeDependencies(dependencies);

  assertEquals(cycles.length > 0, true, "Should detect self-reference");
});

Deno.test("analyzeDependencies - detects longer cycle", () => {
  // A -> B -> C -> A
  const dependencies = [
    { target: "A", dependencies: ["B"] },
    { target: "B", dependencies: ["C"] },
    { target: "C", dependencies: ["A"] },
  ];

  const { cycles } = analyzeDependencies(dependencies);

  assertEquals(cycles.length > 0, true, "Should detect cycle");
});

Deno.test("analyzeDependencies - no false positives for non-cycles", () => {
  // A -> B, A -> C, B -> D, C -> D (diamond, no cycle)
  const dependencies = [
    { target: "A", dependencies: ["B", "C"] },
    { target: "B", dependencies: ["D"] },
    { target: "C", dependencies: ["D"] },
    { target: "D", dependencies: [] },
  ];

  const { cycles } = analyzeDependencies(dependencies);

  assertEquals(cycles.length, 0, "Should not detect false cycle");
});

// =============================================================================
// isCircular
// =============================================================================

Deno.test("isCircular - returns true for node in cycle", () => {
  const cycles = [["A", "B", "A"]];
  assertEquals(isCircular("A", cycles), true);
  assertEquals(isCircular("B", cycles), true);
});

Deno.test("isCircular - returns false for node not in cycle", () => {
  const cycles = [["A", "B", "A"]];
  assertEquals(isCircular("C", cycles), false);
});

Deno.test("isCircular - handles empty cycles", () => {
  assertEquals(isCircular("A", []), false);
});

Deno.test("isCircular - handles multiple cycles", () => {
  const cycles = [
    ["A", "B", "A"],
    ["C", "D", "E", "C"],
  ];
  assertEquals(isCircular("A", cycles), true);
  assertEquals(isCircular("D", cycles), true);
  assertEquals(isCircular("F", cycles), false);
});

// =============================================================================
// formatCycle
// =============================================================================

Deno.test("formatCycle - formats cycle as string", () => {
  const cycle = ["A", "B", "C", "A"];
  assertEquals(formatCycle(cycle), "A -> B -> C -> A");
});

Deno.test("formatCycle - handles single node", () => {
  const cycle = ["A"];
  assertEquals(formatCycle(cycle), "A");
});

// =============================================================================
// Integration tests
// =============================================================================

Deno.test("dependencies - realistic rule set", () => {
  // Simulating a realistic set of composition rules
  const dependencies = [
    // trait.effective-caution depends on base trait and skills
    { target: "trait.effective-caution", dependencies: ["trait.caution", "skill.debugging"] },
    // skill.effective-debugging depends on experience
    { target: "skill.effective-debugging", dependencies: ["exp.rust", "exp.typescript"] },
    // final-score depends on effective values
    {
      target: "final-score",
      dependencies: ["trait.effective-caution", "skill.effective-debugging"],
    },
  ];

  const { order, cycles } = analyzeDependencies(dependencies);

  assertEquals(cycles.length, 0);

  // Effective values should come before final score
  const effectiveCautionIndex = order.indexOf("trait.effective-caution");
  const effectiveDebuggingIndex = order.indexOf("skill.effective-debugging");
  const finalScoreIndex = order.indexOf("final-score");

  assertEquals(effectiveCautionIndex < finalScoreIndex, true);
  assertEquals(effectiveDebuggingIndex < finalScoreIndex, true);
});
