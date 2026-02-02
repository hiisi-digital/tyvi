/**
 * Rule application for computing derived values.
 *
 * Applies composition rules to compute trait/skill/experience/stack values.
 *
 * @module
 */

import type { CompositionRule } from "../types/mod.ts";
import type { EvaluationContext } from "./evaluator.ts";
import { parse } from "./parser.ts";
import { evaluate } from "./evaluator.ts";

/**
 * Result of applying a single rule.
 */
export interface RuleResult {
  /** Description of what this rule does */
  description: string;
  /** Expression that was evaluated */
  expression: string;
  /** Raw result of evaluation */
  rawResult: number;
  /** Weight applied to this result */
  weight: number;
  /** Weighted contribution (rawResult * weight) */
  contribution: number;
}

/**
 * Apply a single composition rule.
 *
 * @param rule - Rule to apply
 * @param context - Evaluation context
 * @returns Result with contribution
 *
 * @example
 * ```ts
 * const rule = {
 *   description: "Based on caution",
 *   expression: "trait.caution * 0.5",
 *   weight: 1.0
 * };
 * const context = { traits: { caution: 60 }, skills: {}, experience: {}, stacks: {} };
 * const result = applyRule(rule, context);
 * // result.contribution === 30
 * ```
 */
export function applyRule(
  rule: CompositionRule,
  context: EvaluationContext,
): RuleResult {
  const ast = parse(rule.expression);
  const rawResult = evaluate(ast, context);
  const contribution = rawResult * rule.weight;

  return {
    description: rule.description,
    expression: rule.expression,
    rawResult,
    weight: rule.weight,
    contribution,
  };
}

/**
 * Apply multiple rules and combine their contributions.
 *
 * @param rules - Rules to apply
 * @param context - Evaluation context
 * @returns Combined value and individual rule results
 *
 * @example
 * ```ts
 * const rules = [
 *   { description: "Base", expression: "50", weight: 0.5 },
 *   { description: "From caution", expression: "trait.caution", weight: 0.5 }
 * ];
 * const context = { traits: { caution: 60 }, skills: {}, experience: {}, stacks: {} };
 * const result = applyRules(rules, context);
 * // result.finalValue === 55 (50*0.5 + 60*0.5)
 * ```
 */
export function applyRules(
  rules: CompositionRule[],
  context: EvaluationContext,
): {
  finalValue: number;
  ruleResults: RuleResult[];
  totalWeight: number;
} {
  if (rules.length === 0) {
    throw new Error("Cannot apply empty rule set");
  }

  const ruleResults: RuleResult[] = [];
  let totalContribution = 0;
  let totalWeight = 0;

  for (const rule of rules) {
    const result = applyRule(rule, context);
    ruleResults.push(result);
    totalContribution += result.contribution;
    totalWeight += rule.weight;
  }

  // Normalize by total weight
  const finalValue = totalWeight > 0 ? totalContribution / totalWeight : 0;

  return {
    finalValue,
    ruleResults,
    totalWeight,
  };
}

/**
 * Compute a value using composition rules or return anchor if present.
 *
 * @param target - Value name (e.g., "trait.caution")
 * @param anchor - Anchor value if explicitly defined
 * @param rules - Composition rules to apply if no anchor
 * @param context - Evaluation context
 * @returns Computed value
 */
export function computeValue(
  target: string,
  anchor: number | undefined,
  rules: CompositionRule[] | undefined,
  context: EvaluationContext,
): number {
  // If anchor is defined, use it
  if (anchor !== undefined) {
    return anchor;
  }

  // Otherwise, apply composition rules
  if (!rules || rules.length === 0) {
    throw new Error(
      `No anchor or composition rules found for ${target}`,
    );
  }

  const result = applyRules(rules, context);
  return result.finalValue;
}
