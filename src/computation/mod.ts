/**
 * Computation engine module for tyvi.
 *
 * Expression evaluation and dependency resolution for person computation.
 * This is a stub implementation that will be replaced by issue #3.
 *
 * @module
 */

import type { ComputationTrace, ValueTrace } from "../types/mod.ts";

/**
 * Evaluate an expression in the context of a person's values.
 *
 * This is a stub implementation that returns 0.
 * Will be replaced when issue #3 is completed.
 *
 * @param _expression - Expression to evaluate (e.g., "trait.detail-focus * 0.5")
 * @param _context - Context values available for evaluation
 * @returns Evaluated result (always 0 in stub)
 */
export function evaluateExpression(
  _expression: string,
  _context: Record<string, number>,
): number {
  // Stub implementation - will be replaced by issue #3
  return 0;
}

/**
 * Create an empty computation trace for debugging.
 *
 * This is a stub implementation.
 * Will be replaced when issue #3 is completed.
 *
 * @returns Empty computation trace
 */
export function createEmptyTrace(): ComputationTrace {
  return {
    values: new Map<string, ValueTrace>(),
    circularDependencies: [],
    computationOrder: [],
  };
}
