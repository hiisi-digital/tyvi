/**
 * Evaluator for the expression language.
 *
 * Evaluates AST expressions to numeric values using a context that provides:
 * - Trait values (-100 to +100)
 * - Skill values (0 to 100)
 * - Experience values (0 to 100)
 * - Stack values (0 to 100)
 * - Quirk presence (boolean, exposed as 0/1)
 * - $current: Current computed value (for recursive rules)
 * - $base: Base/default value for the type being computed
 *
 * @module
 */

import type { Expression } from "./ast.ts";

/**
 * Context for expression evaluation
 *
 * Uses Maps for efficient lookup and Set for quirks.
 */
export interface EvaluationContext {
  /** Trait values (-100 to +100) */
  traits: Map<string, number>;

  /** Skill values (0 to 100) */
  skills: Map<string, number>;

  /** Experience values (0 to 100) */
  experience: Map<string, number>;

  /** Stack values (0 to 100) */
  stacks: Map<string, number>;

  /** Quirk presence (set of quirk names that are active) */
  quirks: Set<string>;

  /**
   * Current computed value for recursive/iterative rules.
   * Undefined when not in a recursive evaluation context.
   */
  current?: number;

  /**
   * Base/default value for the type being computed.
   * Used in rules that modify a starting value.
   */
  base: number;
}

/**
 * Error thrown during evaluation
 */
export class EvaluationError extends Error {
  constructor(message: string) {
    super(`Evaluation error: ${message}`);
    this.name = "EvaluationError";
  }
}

/**
 * Create an empty evaluation context with default values
 */
export function createContext(overrides?: Partial<EvaluationContext>): EvaluationContext {
  return {
    traits: overrides?.traits ?? new Map(),
    skills: overrides?.skills ?? new Map(),
    experience: overrides?.experience ?? new Map(),
    stacks: overrides?.stacks ?? new Map(),
    quirks: overrides?.quirks ?? new Set(),
    current: overrides?.current,
    base: overrides?.base ?? 0,
  };
}

/**
 * Evaluator class for expression ASTs
 */
export class Evaluator {
  private context: EvaluationContext;

  constructor(context: EvaluationContext) {
    this.context = context;
  }

  /**
   * Evaluate an expression to a numeric value
   *
   * @param expr - The AST expression to evaluate
   * @returns The numeric result
   * @throws EvaluationError if evaluation fails
   */
  public evaluate(expr: Expression): number {
    switch (expr.kind) {
      case "NumberLiteral":
        return expr.value;

      case "Identifier":
        return this.evaluateIdentifier(expr.namespace, expr.name);

      case "SpecialValue":
        return this.evaluateSpecialValue(expr.value);

      case "BinaryOp":
        return this.evaluateBinaryOp(expr.operator, expr.left, expr.right);

      case "ComparisonOp":
        return this.evaluateComparisonOp(expr.operator, expr.left, expr.right);

      case "FunctionCall":
        return this.evaluateFunctionCall(expr.name, expr.args);

      case "Wildcard":
        throw new EvaluationError(
          `Wildcard '${expr.namespace}.*' can only be used inside aggregate functions (avg, sum, min, max, count)`,
        );

      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = expr;
        throw new EvaluationError(`Unknown expression kind: ${(_exhaustive as Expression).kind}`);
    }
  }

  /**
   * Evaluate an identifier reference (namespace.name)
   */
  private evaluateIdentifier(namespace: string, name: string): number {
    switch (namespace) {
      case "trait": {
        const value = this.context.traits.get(name);
        if (value === undefined) {
          throw new EvaluationError(`Undefined trait: '${name}'`);
        }
        return value;
      }

      case "skill": {
        const value = this.context.skills.get(name);
        if (value === undefined) {
          throw new EvaluationError(`Undefined skill: '${name}'`);
        }
        return value;
      }

      case "exp":
      case "experience": {
        const value = this.context.experience.get(name);
        if (value === undefined) {
          throw new EvaluationError(`Undefined experience: '${name}'`);
        }
        return value;
      }

      case "stack": {
        const value = this.context.stacks.get(name);
        if (value === undefined) {
          throw new EvaluationError(`Undefined stack: '${name}'`);
        }
        return value;
      }

      case "quirk": {
        // Quirks are boolean - return 1 if present, 0 if not
        return this.context.quirks.has(name) ? 1 : 0;
      }

      default:
        throw new EvaluationError(
          `Unknown namespace: '${namespace}'. Expected: trait, skill, exp, stack, or quirk`,
        );
    }
  }

  /**
   * Evaluate a special value ($current, $base)
   */
  private evaluateSpecialValue(value: "$current" | "$base"): number {
    switch (value) {
      case "$current":
        if (this.context.current === undefined) {
          throw new EvaluationError(
            "$current is not available in this context. It can only be used in recursive rules.",
          );
        }
        return this.context.current;

      case "$base":
        return this.context.base;

      default:
        throw new EvaluationError(`Unknown special value: '${value}'`);
    }
  }

  /**
   * Evaluate a binary operation (+, -, *, /)
   */
  private evaluateBinaryOp(
    operator: "+" | "-" | "*" | "/",
    left: Expression,
    right: Expression,
  ): number {
    const leftValue = this.evaluate(left);
    const rightValue = this.evaluate(right);

    switch (operator) {
      case "+":
        return leftValue + rightValue;

      case "-":
        return leftValue - rightValue;

      case "*":
        return leftValue * rightValue;

      case "/":
        if (rightValue === 0) {
          throw new EvaluationError("Division by zero");
        }
        return leftValue / rightValue;

      default:
        throw new EvaluationError(`Unknown binary operator: '${operator}'`);
    }
  }

  /**
   * Evaluate a comparison operation (>, <, >=, <=, ==, !=)
   *
   * Returns 1 for true, 0 for false (for use in arithmetic expressions).
   */
  private evaluateComparisonOp(
    operator: ">" | "<" | ">=" | "<=" | "==" | "!=",
    left: Expression,
    right: Expression,
  ): number {
    const leftValue = this.evaluate(left);
    const rightValue = this.evaluate(right);

    let result: boolean;

    switch (operator) {
      case ">":
        result = leftValue > rightValue;
        break;

      case "<":
        result = leftValue < rightValue;
        break;

      case ">=":
        result = leftValue >= rightValue;
        break;

      case "<=":
        result = leftValue <= rightValue;
        break;

      case "==":
        // Use epsilon comparison for floating point
        result = Math.abs(leftValue - rightValue) < 0.0001;
        break;

      case "!=":
        result = Math.abs(leftValue - rightValue) >= 0.0001;
        break;

      default:
        throw new EvaluationError(`Unknown comparison operator: '${operator}'`);
    }

    return result ? 1 : 0;
  }

  /**
   * Evaluate a function call
   */
  private evaluateFunctionCall(name: string, args: Expression[]): number {
    switch (name) {
      case "avg":
        return this.functionAvg(args);

      case "max":
        return this.functionMax(args);

      case "min":
        return this.functionMin(args);

      case "sum":
        return this.functionSum(args);

      case "count":
        return this.functionCount(args);

      case "clamp":
        return this.functionClamp(args);

      default:
        throw new EvaluationError(
          `Unknown function: '${name}'. Available: avg, max, min, sum, count, clamp`,
        );
    }
  }

  /**
   * Expand a wildcard to all values in the namespace
   */
  private expandWildcard(namespace: string): number[] {
    switch (namespace) {
      case "trait":
        return Array.from(this.context.traits.values());

      case "skill":
        return Array.from(this.context.skills.values());

      case "exp":
      case "experience":
        return Array.from(this.context.experience.values());

      case "stack":
        return Array.from(this.context.stacks.values());

      case "quirk":
        // Each quirk in the set counts as 1
        return Array.from(this.context.quirks).map(() => 1);

      default:
        throw new EvaluationError(
          `Unknown namespace for wildcard: '${namespace}.*'`,
        );
    }
  }

  /**
   * Collect all values from arguments, expanding wildcards
   */
  private collectValues(args: Expression[]): number[] {
    const values: number[] = [];

    for (const arg of args) {
      if (arg.kind === "Wildcard") {
        values.push(...this.expandWildcard(arg.namespace));
      } else {
        values.push(this.evaluate(arg));
      }
    }

    return values;
  }

  /**
   * avg(...) - Average of all values
   *
   * Returns 0 for empty input (rather than NaN).
   */
  private functionAvg(args: Expression[]): number {
    const values = this.collectValues(args);

    if (values.length === 0) {
      return 0;
    }

    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * max(...) - Maximum value
   */
  private functionMax(args: Expression[]): number {
    const values = this.collectValues(args);

    if (values.length === 0) {
      throw new EvaluationError("max() requires at least one argument");
    }

    return Math.max(...values);
  }

  /**
   * min(...) - Minimum value
   */
  private functionMin(args: Expression[]): number {
    const values = this.collectValues(args);

    if (values.length === 0) {
      throw new EvaluationError("min() requires at least one argument");
    }

    return Math.min(...values);
  }

  /**
   * sum(...) - Sum of all values
   */
  private functionSum(args: Expression[]): number {
    const values = this.collectValues(args);
    return values.reduce((a, b) => a + b, 0);
  }

  /**
   * count(...) - Count of values
   *
   * Useful with wildcards: count(skill.*) returns number of skills.
   */
  private functionCount(args: Expression[]): number {
    const values = this.collectValues(args);
    return values.length;
  }

  /**
   * clamp(value, min, max) - Constrain value to range
   */
  private functionClamp(args: Expression[]): number {
    if (args.length !== 3) {
      throw new EvaluationError(
        `clamp() requires exactly 3 arguments (value, min, max), got ${args.length}`,
      );
    }

    const value = this.evaluate(args[0]!);
    const min = this.evaluate(args[1]!);
    const max = this.evaluate(args[2]!);

    return Math.max(min, Math.min(max, value));
  }
}

/**
 * Evaluate an expression with the given context
 *
 * @param expr - The AST expression to evaluate
 * @param context - The evaluation context with trait/skill/etc values
 * @returns The numeric result
 * @throws EvaluationError if evaluation fails
 *
 * @example
 * ```ts
 * const context = createContext({
 *   traits: new Map([["caution", 60]]),
 *   skills: new Map([["debugging", 80]]),
 *   base: 50,
 * });
 *
 * const result = evaluate(ast, context);
 * ```
 */
export function evaluate(expr: Expression, context: EvaluationContext): number {
  const evaluator = new Evaluator(context);
  return evaluator.evaluate(expr);
}
