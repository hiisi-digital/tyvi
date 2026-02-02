/**
 * Quirk auto-assignment based on computed values.
 *
 * Evaluates quirk conditions to determine if they should be auto-assigned.
 *
 * @module
 */

import type { Quirk } from "../types/mod.ts";
import type { EvaluationContext } from "./evaluator.ts";
import { parse } from "./parser.ts";
import { evaluate } from "./evaluator.ts";

/**
 * Check if a quirk's auto-assign conditions are met.
 *
 * @param quirk - Quirk definition with auto-assign rules
 * @param context - Evaluation context with computed values
 * @returns true if conditions are met
 *
 * @example
 * ```ts
 * const quirk: Quirk = {
 *   id: "quirk.edge-case-hunter",
 *   description: { name: "Edge Case Hunter", summary: "..." },
 *   manifestations: { behaviors: [] },
 *   auto_assign: {
 *     any_of: ["trait.detail-focus > 70"]
 *   }
 * };
 * const context = {
 *   traits: { "detail-focus": 80 },
 *   skills: {},
 *   experience: {},
 *   stacks: {}
 * };
 * const shouldAssign = shouldAutoAssignQuirk(quirk, context);
 * // Returns true
 * ```
 */
export function shouldAutoAssignQuirk(
  quirk: Quirk,
  context: EvaluationContext,
): boolean {
  if (!quirk.auto_assign) {
    return false;
  }

  const { any_of, all_of } = quirk.auto_assign;

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
 * Auto-assign quirks based on computed values.
 *
 * @param quirks - Available quirk definitions
 * @param explicitQuirks - Quirks explicitly assigned by user
 * @param context - Evaluation context with computed values
 * @returns Array of quirk IDs (explicit + auto-assigned)
 *
 * @example
 * ```ts
 * const quirks = [
 *   { id: "quirk.a", description: { ... }, manifestations: { ... }, auto_assign: { any_of: [...] } }
 * ];
 * const explicitQuirks = ["quirk.c"];
 * const context = { traits: { ... }, skills: {}, experience: {}, stacks: {} };
 * const allQuirks = autoAssignQuirks(quirks, explicitQuirks, context);
 * // Returns: ["quirk.c", "quirk.a"] (if quirk.a meets conditions)
 * ```
 */
export function autoAssignQuirks(
  quirks: Quirk[],
  explicitQuirks: string[],
  context: EvaluationContext,
): string[] {
  const result = new Set<string>(explicitQuirks);

  for (const quirk of quirks) {
    if (shouldAutoAssignQuirk(quirk, context)) {
      result.add(quirk.id);
    }
  }

  return Array.from(result);
}
