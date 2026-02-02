/**
 * Rule engine for composition rules.
 *
 * Provides:
 * - Rule creation from expression strings
 * - Rule collection management
 * - Dependency-ordered evaluation
 * - Weighted result combination
 * - Value normalization for different types
 *
 * @module
 */

import type { Expression } from "./ast.ts";
import type { Dependency } from "./dependencies.ts";
import { analyzeDependencies, extractDependencies } from "./dependencies.ts";
import { tokenize } from "./lexer.ts";
import { parse } from "./parser.ts";

/**
 * A composition rule that defines how a value is computed
 */
export interface CompositionRule {
  /** What value this rule computes (e.g., "trait.caution") */
  target: string;

  /** Human-readable description of what this rule does */
  description: string;

  /** Original expression string (for debugging/display) */
  expressionString: string;

  /** Parsed expression AST */
  expression: Expression;

  /**
   * Weight for combining multiple rules targeting the same value.
   * Higher weights have more influence on the final result.
   */
  weight: number;
}

/**
 * Result from evaluating a single rule
 */
export interface RuleResult {
  /** The rule that was evaluated */
  rule: CompositionRule;

  /** The computed result */
  result: number;
}

/**
 * Collection of rules organized for efficient lookup
 */
export interface RuleCollection {
  /** Rules indexed by target (e.g., "trait.caution" -> rules[]) */
  byTarget: Map<string, CompositionRule[]>;

  /** All rules in the collection */
  all: CompositionRule[];
}

/**
 * Error thrown by the rule engine
 */
export class RuleEngineError extends Error {
  constructor(message: string) {
    super(`Rule engine error: ${message}`);
    this.name = "RuleEngineError";
  }
}

/**
 * Create a composition rule from raw data
 *
 * Parses the expression string and validates it.
 *
 * @param target - What value this rule computes
 * @param description - Human-readable description
 * @param expressionString - The expression to evaluate
 * @param weight - Weight for combining with other rules (default: 1)
 * @returns The created rule
 * @throws LexerError or ParseError if expression is invalid
 *
 * @example
 * ```ts
 * const rule = createRule(
 *   "trait.caution",
 *   "Debugging skill increases caution",
 *   "$base + skill.debugging * 0.3",
 *   1.0
 * );
 * ```
 */
export function createRule(
  target: string,
  description: string,
  expressionString: string,
  weight: number = 1,
): CompositionRule {
  const tokens = tokenize(expressionString);
  const expression = parse(tokens);

  return {
    target,
    description,
    expressionString,
    expression,
    weight,
  };
}

/**
 * Build a rule collection from an array of rules
 *
 * Organizes rules by target for efficient lookup during evaluation.
 *
 * @param rules - Array of composition rules
 * @returns Organized rule collection
 */
export function buildRuleCollection(rules: CompositionRule[]): RuleCollection {
  const byTarget = new Map<string, CompositionRule[]>();

  for (const rule of rules) {
    const existing = byTarget.get(rule.target) || [];
    existing.push(rule);
    byTarget.set(rule.target, existing);
  }

  return { byTarget, all: rules };
}

/**
 * Extract dependencies from all rules
 *
 * @param rules - Array of composition rules
 * @returns Array of dependency relationships
 */
export function getRuleDependencies(rules: CompositionRule[]): Dependency[] {
  const dependencies: Dependency[] = [];

  for (const rule of rules) {
    const deps = extractDependencies(rule.expression);
    dependencies.push({
      target: rule.target,
      dependencies: deps,
    });
  }

  return dependencies;
}

/**
 * Get the evaluation order for rules
 *
 * Returns targets in dependency order (dependencies evaluated first).
 * Also detects and reports circular dependencies.
 *
 * @param rules - Array of composition rules
 * @returns Object with evaluation order and detected cycles
 *
 * @example
 * ```ts
 * const { order, cycles } = getRuleEvaluationOrder(rules);
 *
 * if (cycles.length > 0) {
 *   console.warn("Circular dependencies detected:", cycles);
 * }
 *
 * for (const target of order) {
 *   // Evaluate rules for this target
 * }
 * ```
 */
export function getRuleEvaluationOrder(
  rules: CompositionRule[],
): { order: string[]; cycles: string[][] } {
  const dependencies = getRuleDependencies(rules);
  return analyzeDependencies(dependencies);
}

/**
 * Combine multiple rule results using weighted average
 *
 * @param results - Array of rule results to combine
 * @returns The weighted average result
 * @throws RuleEngineError if results is empty
 *
 * @example
 * ```ts
 * const results = [
 *   { rule: rule1, result: 60 },  // weight: 1
 *   { rule: rule2, result: 80 },  // weight: 2
 * ];
 *
 * const combined = combineResults(results);
 * // (60 * 1 + 80 * 2) / (1 + 2) = 73.33
 * ```
 */
export function combineResults(results: RuleResult[]): number {
  if (results.length === 0) {
    throw new RuleEngineError("Cannot combine empty results");
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const { rule, result } of results) {
    weightedSum += result * rule.weight;
    totalWeight += rule.weight;
  }

  // If all weights are zero, fall back to simple average
  if (totalWeight === 0) {
    return results.reduce((sum, r) => sum + r.result, 0) / results.length;
  }

  return weightedSum / totalWeight;
}

/**
 * Value type for normalization
 */
export type ValueType = "trait" | "skill" | "exp" | "stack";

/**
 * Normalize a value to its valid range based on type
 *
 * - trait: -100 to +100
 * - skill: 0 to 100
 * - exp: 0 to 100
 * - stack: 0 to 100
 *
 * @param value - The value to normalize
 * @param type - The type of value
 * @returns The clamped value
 */
export function normalizeValue(value: number, type: ValueType): number {
  switch (type) {
    case "trait":
      return Math.max(-100, Math.min(100, value));

    case "skill":
    case "exp":
    case "stack":
      return Math.max(0, Math.min(100, value));

    default: {
      const _exhaustive: never = type;
      throw new RuleEngineError(`Unknown value type: ${_exhaustive}`);
    }
  }
}

/**
 * Get the default base value for a type
 *
 * - trait: 0 (neutral)
 * - skill: 20 (basic familiarity)
 * - exp: 20 (basic familiarity)
 * - stack: 20 (basic familiarity)
 *
 * @param type - The type of value
 * @returns The default base value
 */
export function getBaseValue(type: ValueType): number {
  switch (type) {
    case "trait":
      return 0; // Neutral

    case "skill":
    case "exp":
    case "stack":
      return 20; // Basic familiarity

    default: {
      const _exhaustive: never = type;
      throw new RuleEngineError(`Unknown value type: ${_exhaustive}`);
    }
  }
}

/**
 * Extract the type from a target string
 *
 * @param target - Target like "trait.caution" or "skill.debugging"
 * @returns The value type
 */
export function getTargetType(target: string): ValueType {
  const [namespace] = target.split(".");

  switch (namespace) {
    case "trait":
      return "trait";
    case "skill":
      return "skill";
    case "exp":
    case "experience":
      return "exp";
    case "stack":
      return "stack";
    default:
      throw new RuleEngineError(`Unknown target namespace: ${namespace}`);
  }
}

/**
 * Log a warning about a circular dependency
 *
 * @param cycle - The cycle as an array of node names
 */
export function logCircularDependency(cycle: string[]): void {
  console.warn(`Circular dependency detected: ${cycle.join(" -> ")}`);
  console.warn("Using $base value for circular reference");
}
