/**
 * Evaluator for AST expressions.
 *
 * Evaluates expressions with a context containing trait/skill/exp/stack values.
 *
 * @module
 */

import type { Expression } from "./ast.ts";

/**
 * Context for expression evaluation.
 * Maps category.name to numeric values.
 */
export interface EvaluationContext {
  traits: Record<string, number>;
  skills: Record<string, number>;
  experience: Record<string, number>;
  stacks: Record<string, number>;
}

/**
 * Evaluate an expression with the given context.
 *
 * @param expr - AST to evaluate
 * @param context - Context with trait/skill/exp/stack values
 * @returns Evaluated result
 *
 * @example
 * ```ts
 * const context = {
 *   traits: { "caution": 60 },
 *   skills: {},
 *   experience: {},
 *   stacks: {}
 * };
 * const result = evaluate(ast, context); // Returns 30 for "trait.caution * 0.5"
 * ```
 */
export function evaluate(
  expr: Expression,
  context: EvaluationContext
): number {
  switch (expr.type) {
    case "number":
      return expr.value;

    case "reference": {
      const { category, name } = expr;

      // Map category aliases
      let values: Record<string, number>;
      switch (category) {
        case "trait":
          values = context.traits;
          break;
        case "skill":
          values = context.skills;
          break;
        case "exp":
        case "experience":
          values = context.experience;
          break;
        case "stack":
          values = context.stacks;
          break;
        default:
          throw new Error(
            `Unknown category '${category}' in reference ${category}.${name}`
          );
      }

      if (!(name in values)) {
        throw new Error(
          `Reference ${category}.${name} not found in context`
        );
      }

      const value = values[name];
      if (value === undefined) {
        throw new Error(
          `Reference ${category}.${name} has undefined value`
        );
      }

      return value;
    }

    case "binary": {
      const left = evaluate(expr.left, context);
      const right = evaluate(expr.right, context);

      switch (expr.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          if (right === 0) {
            throw new Error("Division by zero");
          }
          return left / right;
        case ">":
          return left > right ? 1 : 0;
        case ">=":
          return left >= right ? 1 : 0;
        case "<":
          return left < right ? 1 : 0;
        case "<=":
          return left <= right ? 1 : 0;
        case "==":
          return left === right ? 1 : 0;
        case "!=":
          return left !== right ? 1 : 0;
      }
      break;
    }

    case "unary": {
      const operand = evaluate(expr.operand, context);
      switch (expr.operator) {
        case "-":
          return -operand;
      }
      break;
    }

    case "function": {
      const args = expr.args.map((arg) => evaluate(arg, context));

      switch (expr.name) {
        case "avg": {
          if (args.length === 0) {
            throw new Error("avg() requires at least one argument");
          }
          return args.reduce((sum, val) => sum + val, 0) / args.length;
        }

        case "max": {
          if (args.length === 0) {
            throw new Error("max() requires at least one argument");
          }
          return Math.max(...args);
        }

        case "min": {
          if (args.length === 0) {
            throw new Error("min() requires at least one argument");
          }
          return Math.min(...args);
        }

        case "clamp": {
          if (args.length !== 3) {
            throw new Error(
              "clamp() requires exactly 3 arguments: value, min, max"
            );
          }
          const value = args[0];
          const min = args[1];
          const max = args[2];
          if (value === undefined || min === undefined || max === undefined) {
            throw new Error("clamp() requires all arguments to be defined");
          }
          return Math.max(min, Math.min(max, value));
        }

        default:
          throw new Error(`Unknown function '${expr.name}'`);
      }
    }
  }

  // Should never reach here with valid AST
  throw new Error(`Unknown expression type`);
}
