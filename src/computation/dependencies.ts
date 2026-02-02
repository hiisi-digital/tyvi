/**
 * Dependency analysis for expressions.
 *
 * Analyzes expression ASTs to extract dependencies and detect cycles.
 *
 * @module
 */

import type { Expression } from "./ast.ts";
import { parse } from "./parser.ts";

/**
 * Extract all references from an expression.
 *
 * @param expr - AST to analyze
 * @returns Array of references in "category.name" format
 *
 * @example
 * ```ts
 * const deps = extractDependencies(parse("trait.caution * 0.5 + skill.api-design"));
 * // Returns: ["trait.caution", "skill.api-design"]
 * ```
 */
export function extractDependencies(expr: Expression): string[] {
  const deps: string[] = [];

  function visit(node: Expression) {
    switch (node.type) {
      case "reference":
        deps.push(`${node.category}.${node.name}`);
        break;
      case "binary":
        visit(node.left);
        visit(node.right);
        break;
      case "unary":
        visit(node.operand);
        break;
      case "function":
        for (const arg of node.args) {
          visit(arg);
        }
        break;
      case "number":
        // No dependencies
        break;
    }
  }

  visit(expr);
  return deps;
}

/**
 * Topologically sort values based on their dependencies.
 *
 * @param rules - Map of value names to their expression strings
 * @returns Sorted array of value names (dependencies before dependents)
 * @throws Error if circular dependencies are detected
 *
 * @example
 * ```ts
 * const rules = {
 *   "trait.detail-focus": "trait.caution * 0.8",
 *   "trait.caution": "50" // no deps
 * };
 * const order = topologicalSort(rules);
 * // Returns: ["trait.caution", "trait.detail-focus"]
 * ```
 */
export function topologicalSort(
  rules: Record<string, string>,
): string[] {
  // Build dependency graph
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const target of Object.keys(rules)) {
    if (!graph.has(target)) {
      graph.set(target, new Set());
      inDegree.set(target, 0);
    }
  }

  // Build edges
  for (const [target, expression] of Object.entries(rules)) {
    const ast = parse(expression);
    const deps = extractDependencies(ast);

    for (const dep of deps) {
      if (!graph.has(dep)) {
        graph.set(dep, new Set());
        inDegree.set(dep, 0);
      }

      // Add edge: dep -> target
      graph.get(dep)!.add(target);
      inDegree.set(target, (inDegree.get(target) || 0) + 1);
    }
  }

  // Kahn's algorithm for topological sort
  const queue: string[] = [];
  const result: string[] = [];

  // Start with nodes that have no dependencies
  for (const [node, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(node);
    }
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    // Remove this node from graph
    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);

      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check for cycles
  if (result.length !== graph.size) {
    const remaining = Array.from(graph.keys()).filter(
      (node) => !result.includes(node),
    );
    throw new Error(
      `Circular dependency detected involving: ${remaining.join(", ")}`,
    );
  }

  return result;
}

/**
 * Detect circular dependencies in a set of rules.
 *
 * @param rules - Map of value names to their expression strings
 * @returns Array of cycles, each cycle is an array of value names
 *
 * @example
 * ```ts
 * const rules = {
 *   "trait.a": "trait.b",
 *   "trait.b": "trait.a"
 * };
 * const cycles = detectCycles(rules);
 * // Returns: [["trait.a", "trait.b"]]
 * ```
 */
export function detectCycles(
  rules: Record<string, string>,
): string[][] {
  const graph = new Map<string, string[]>();

  // Build dependency graph
  for (const [target, expression] of Object.entries(rules)) {
    const ast = parse(expression);
    const deps = extractDependencies(ast);
    graph.set(target, deps);
  }

  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string, path: string[]) {
    if (visiting.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart));
      }
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visiting.add(node);
    path.push(node);

    const deps = graph.get(node) || [];
    for (const dep of deps) {
      dfs(dep, [...path]);
    }

    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}
