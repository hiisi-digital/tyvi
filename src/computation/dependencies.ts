/**
 * Dependency analysis for composition rules.
 *
 * Provides:
 * - Dependency extraction from expressions
 * - Dependency graph construction
 * - Cycle detection using DFS
 * - Topological sort for evaluation order (Kahn's algorithm)
 *
 * @module
 */

import type { Expression } from "./ast.ts";

/**
 * A dependency relationship between values
 */
export interface Dependency {
  /** The value being computed (e.g., "trait.caution") */
  target: string;
  /** Values this target depends on */
  dependencies: string[];
}

/**
 * Result of dependency analysis
 */
export interface DependencyAnalysis {
  /** Topologically sorted order for evaluation (dependencies first) */
  order: string[];
  /** Circular dependencies detected (each array is a cycle) */
  cycles: string[][];
}

/**
 * Extract all dependencies from an expression AST
 *
 * Returns fully-qualified names like "trait.caution", "skill.debugging", etc.
 * Wildcards are returned as "trait.*", "skill.*", etc.
 *
 * @param expr - The expression AST to analyze
 * @returns Array of dependency names
 *
 * @example
 * ```ts
 * const deps = extractDependencies(ast);
 * // ["trait.caution", "skill.debugging", "exp.*"]
 * ```
 */
export function extractDependencies(expr: Expression): string[] {
  const deps: string[] = [];

  function visit(node: Expression): void {
    switch (node.kind) {
      case "Identifier":
        deps.push(`${node.namespace}.${node.name}`);
        break;

      case "Wildcard":
        // Wildcard dependencies are tracked separately
        deps.push(`${node.namespace}.*`);
        break;

      case "BinaryOp":
        visit(node.left);
        visit(node.right);
        break;

      case "ComparisonOp":
        visit(node.left);
        visit(node.right);
        break;

      case "FunctionCall":
        for (const arg of node.args) {
          visit(arg);
        }
        break;

      case "NumberLiteral":
      case "SpecialValue":
        // No dependencies
        break;
    }
  }

  visit(expr);

  // Return unique dependencies
  return [...new Set(deps)];
}

/**
 * Build a dependency graph from a list of dependencies
 *
 * @param dependencies - Array of dependency relationships
 * @returns Map from target to its dependencies
 */
export function buildDependencyGraph(
  dependencies: Dependency[],
): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const dep of dependencies) {
    graph.set(dep.target, dep.dependencies);
  }

  return graph;
}

/**
 * Detect circular dependencies using depth-first search
 *
 * @param graph - Dependency graph
 * @returns Array of cycles (each cycle is an array of nodes forming the cycle)
 */
function detectCycles(graph: Map<string, string[]>): string[][] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];

    for (const neighbor of neighbors) {
      // Skip wildcard dependencies for cycle detection
      // (wildcards expand to all values, not specific computed values)
      if (neighbor.includes("*")) {
        continue;
      }

      if (!visited.has(neighbor)) {
        // Continue DFS
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle!
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor); // Complete the cycle
          cycles.push(cycle);
        }
      }
    }

    recursionStack.delete(node);
  }

  // Run DFS from each unvisited node
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

/**
 * Topological sort using Kahn's algorithm
 *
 * Returns nodes in evaluation order (dependencies before dependents).
 *
 * @param graph - Dependency graph
 * @returns Array of nodes in topological order
 */
function topologicalSort(graph: Map<string, string[]>): string[] {
  // Calculate in-degrees (number of dependencies that are also computed values)
  const inDegree = new Map<string, number>();

  // Map: dependency -> nodes that depend on it
  const dependents = new Map<string, string[]>();

  // Initialize in-degrees for all targets
  for (const node of graph.keys()) {
    inDegree.set(node, 0);
  }

  // Build reverse graph and calculate in-degrees
  for (const [node, deps] of graph.entries()) {
    for (const dep of deps) {
      // Skip wildcard dependencies
      if (dep.includes("*")) {
        continue;
      }

      // Only count dependencies that are also computed values (in graph)
      if (graph.has(dep)) {
        inDegree.set(node, (inDegree.get(node) || 0) + 1);

        // Track reverse relationship
        if (!dependents.has(dep)) {
          dependents.set(dep, []);
        }
        dependents.get(dep)!.push(node);
      }
    }
  }

  // Queue starts with nodes that have no internal dependencies
  const queue: string[] = [];
  for (const [node, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(node);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    // Decrease in-degree for all dependents
    const nodesDependingOnThis = dependents.get(node) || [];
    for (const dependent of nodesDependingOnThis) {
      const degree = (inDegree.get(dependent) || 0) - 1;
      inDegree.set(dependent, degree);

      if (degree === 0) {
        queue.push(dependent);
      }
    }
  }

  return sorted;
}

/**
 * Analyze dependencies and provide evaluation order
 *
 * @param dependencies - Array of dependency relationships
 * @returns Analysis result with evaluation order and detected cycles
 *
 * @example
 * ```ts
 * const deps = [
 *   { target: "trait.caution", dependencies: ["skill.debugging"] },
 *   { target: "skill.debugging", dependencies: ["exp.rust"] },
 * ];
 *
 * const analysis = analyzeDependencies(deps);
 * // analysis.order: ["skill.debugging", "trait.caution"]
 * // analysis.cycles: []
 * ```
 */
export function analyzeDependencies(dependencies: Dependency[]): DependencyAnalysis {
  const graph = buildDependencyGraph(dependencies);
  const cycles = detectCycles(graph);
  const order = topologicalSort(graph);

  return { order, cycles };
}

/**
 * Check if a specific value is involved in any circular dependency
 *
 * @param target - The value to check (e.g., "trait.caution")
 * @param cycles - Detected cycles from analysis
 * @returns True if the target is part of a cycle
 */
export function isCircular(target: string, cycles: string[][]): boolean {
  return cycles.some((cycle) => cycle.includes(target));
}

/**
 * Get a human-readable description of a cycle
 *
 * @param cycle - Array of nodes forming the cycle
 * @returns String representation like "a -> b -> c -> a"
 */
export function formatCycle(cycle: string[]): string {
  return cycle.join(" -> ");
}
