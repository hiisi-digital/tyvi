/**
 * Phrase matching based on conditions.
 *
 * Determines which phrases apply based on computed values.
 *
 * @module
 */

import type { Phrase } from "../types/mod.ts";
import type { EvaluationContext } from "./evaluator.ts";
import { parse } from "./parser.ts";
import { evaluate } from "./evaluator.ts";

/**
 * Check if a phrase's conditions are met.
 *
 * @param phrase - Phrase definition with conditions
 * @param context - Evaluation context with computed values
 * @returns true if conditions are met
 *
 * @example
 * ```ts
 * const phrase: Phrase = {
 *   id: "phrase.formal",
 *   description: { name: "Formal", summary: "..." },
 *   examples: { variations: [] },
 *   conditions: {
 *     any_of: ["trait.formality > 60"]
 *   }
 * };
 * const context = {
 *   traits: { formality: 70 },
 *   skills: {},
 *   experience: {},
 *   stacks: {}
 * };
 * const matches = matchesPhrase(phrase, context);
 * // Returns true
 * ```
 */
export function matchesPhrase(
  phrase: Phrase,
  context: EvaluationContext
): boolean {
  if (!phrase.conditions) {
    // No conditions means always matches
    return true;
  }

  const { any_of, all_of } = phrase.conditions;

  // Check any_of conditions (at least one must be true)
  if (any_of && any_of.length > 0) {
    for (const expression of any_of) {
      try {
        const ast = parse(expression);
        const result = evaluate(ast, context);
        if (result > 0) {
          return true;
        }
      } catch (_error) {
        // If evaluation fails, condition is not met
        continue;
      }
    }
  }

  // Check all_of conditions (all must be true)
  if (all_of && all_of.length > 0) {
    for (const expression of all_of) {
      try {
        const ast = parse(expression);
        const result = evaluate(ast, context);
        if (result <= 0) {
          return false;
        }
      } catch (_error) {
        // If evaluation fails, condition is not met
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Find all phrases that match the given context.
 *
 * @param phrases - Available phrase definitions
 * @param context - Evaluation context with computed values
 * @returns Array of matching phrase IDs
 *
 * @example
 * ```ts
 * const phrases = [
 *   { id: "phrase.formal", description: { ... }, examples: { ... }, conditions: { any_of: [...] } },
 *   { id: "phrase.casual", description: { ... }, examples: { ... }, conditions: { any_of: [...] } }
 * ];
 * const context = { traits: { formality: 70 }, skills: {}, experience: {}, stacks: {} };
 * const matching = matchPhrases(phrases, context);
 * // Returns: ["phrase.formal"]
 * ```
 */
export function matchPhrases(
  phrases: Phrase[],
  context: EvaluationContext
): string[] {
  const matching: string[] = [];

  for (const phrase of phrases) {
    if (matchesPhrase(phrase, context)) {
      matching.push(phrase.id);
    }
  }

  return matching;
}
