/**
 * AST node types for expression evaluation.
 *
 * Supports references to traits, skills, experience, stacks,
 * and functions like avg(), max(), min(), clamp().
 *
 * @module
 */

/**
 * Any AST node type.
 */
export type Expression =
  | NumberLiteral
  | Reference
  | BinaryOp
  | UnaryOp
  | FunctionCall;

/**
 * A number literal.
 */
export interface NumberLiteral {
  type: "number";
  value: number;
}

/**
 * A reference to a value (trait.name, skill.name, etc.).
 */
export interface Reference {
  type: "reference";
  /** Category: trait, skill, exp, stack */
  category: string;
  /** Name of the value */
  name: string;
}

/**
 * Binary operation (+, -, *, /, >, >=, <, <=, ==, !=).
 */
export interface BinaryOp {
  type: "binary";
  operator: "+" | "-" | "*" | "/" | ">" | ">=" | "<" | "<=" | "==" | "!=";
  left: Expression;
  right: Expression;
}

/**
 * Unary operation (-).
 */
export interface UnaryOp {
  type: "unary";
  operator: "-";
  operand: Expression;
}

/**
 * Function call (avg, max, min, clamp).
 */
export interface FunctionCall {
  type: "function";
  name: string;
  args: Expression[];
}
