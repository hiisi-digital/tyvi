/**
 * Abstract Syntax Tree (AST) types for the expression language.
 *
 * Supports:
 * - Number literals (42, 3.14)
 * - Identifiers (trait.caution, skill.debugging)
 * - Special values ($current, $base)
 * - Wildcards (trait.*, skill.*)
 * - Binary operations (+, -, *, /)
 * - Comparison operations (>, <, >=, <=, ==, !=)
 * - Function calls (avg, max, min, sum, count, clamp)
 *
 * @module
 */

/**
 * Base interface for all expression nodes
 */
export interface ExpressionNode {
  kind: string;
}

/**
 * Number literal node (e.g., 42, 3.14, -5)
 */
export interface NumberLiteral extends ExpressionNode {
  kind: "NumberLiteral";
  value: number;
}

/**
 * Identifier node for namespace.name references (e.g., trait.caution, skill.debugging)
 */
export interface Identifier extends ExpressionNode {
  kind: "Identifier";
  /** Namespace: trait, skill, exp, stack, quirk */
  namespace: string;
  /** Name within the namespace */
  name: string;
}

/**
 * Special value node for $current and $base references
 *
 * - $current: The current computed value (for recursive/iterative rules)
 * - $base: The base/default value for the type being computed
 */
export interface SpecialValue extends ExpressionNode {
  kind: "SpecialValue";
  value: "$current" | "$base";
}

/**
 * Wildcard node for namespace.* references (e.g., trait.*, skill.*)
 * Used in aggregate functions to expand to all values in a namespace
 */
export interface Wildcard extends ExpressionNode {
  kind: "Wildcard";
  /** Namespace: trait, skill, exp, stack, quirk */
  namespace: string;
}

/**
 * Binary operation node (+, -, *, /)
 */
export interface BinaryOp extends ExpressionNode {
  kind: "BinaryOp";
  operator: "+" | "-" | "*" | "/";
  left: Expression;
  right: Expression;
}

/**
 * Comparison operation node (>, <, >=, <=, ==, !=)
 * Returns 1 for true, 0 for false
 */
export interface ComparisonOp extends ExpressionNode {
  kind: "ComparisonOp";
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
  left: Expression;
  right: Expression;
}

/**
 * Function call node (avg, max, min, sum, count, clamp)
 */
export interface FunctionCall extends ExpressionNode {
  kind: "FunctionCall";
  /** Function name: avg, max, min, sum, count, clamp */
  name: string;
  /** Function arguments (can include wildcards for aggregate functions) */
  args: Expression[];
}

/**
 * Union type for all expression nodes
 */
export type Expression =
  | NumberLiteral
  | Identifier
  | SpecialValue
  | Wildcard
  | BinaryOp
  | ComparisonOp
  | FunctionCall;

// ============================================================================
// Helper factory functions for creating AST nodes
// ============================================================================

/**
 * Create a number literal node
 */
export function numberLiteral(value: number): NumberLiteral {
  return { kind: "NumberLiteral", value };
}

/**
 * Create an identifier node
 */
export function identifier(namespace: string, name: string): Identifier {
  return { kind: "Identifier", namespace, name };
}

/**
 * Create a special value node
 */
export function specialValue(value: "$current" | "$base"): SpecialValue {
  return { kind: "SpecialValue", value };
}

/**
 * Create a wildcard node
 */
export function wildcard(namespace: string): Wildcard {
  return { kind: "Wildcard", namespace };
}

/**
 * Create a binary operation node
 */
export function binaryOp(
  operator: "+" | "-" | "*" | "/",
  left: Expression,
  right: Expression,
): BinaryOp {
  return { kind: "BinaryOp", operator, left, right };
}

/**
 * Create a comparison operation node
 */
export function comparisonOp(
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=",
  left: Expression,
  right: Expression,
): ComparisonOp {
  return { kind: "ComparisonOp", operator, left, right };
}

/**
 * Create a function call node
 */
export function functionCall(name: string, args: Expression[]): FunctionCall {
  return { kind: "FunctionCall", name, args };
}
