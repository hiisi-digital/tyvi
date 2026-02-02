/**
 * Computation engine for expression evaluation.
 *
 * This module provides:
 * - Expression tokenization (lexer)
 * - Expression parsing (parser)
 * - AST evaluation (evaluator)
 * - Dependency analysis and topological sorting
 * - Rule application for computing derived values
 * - Quirk auto-assignment based on conditions
 * - Phrase matching based on conditions
 *
 * @module
 */

// Export AST types
export type {
  BinaryOp,
  Expression,
  FunctionCall,
  NumberLiteral,
  Reference,
  UnaryOp,
} from "./ast.ts";

// Export lexer
export type { Token, TokenType } from "./lexer.ts";
export { tokenize } from "./lexer.ts";

// Export parser
export { parse } from "./parser.ts";

// Export evaluator
export type { EvaluationContext } from "./evaluator.ts";
export { evaluate } from "./evaluator.ts";

// Export dependencies
export {
  detectCycles,
  extractDependencies,
  topologicalSort,
} from "./dependencies.ts";

// Export rules
export type { RuleResult } from "./rules.ts";
export { applyRule, applyRules, computeValue } from "./rules.ts";

// Export quirks
export { autoAssignQuirks, shouldAutoAssignQuirk } from "./quirks.ts";

// Export phrases
export { matchesPhrase, matchPhrases } from "./phrases.ts";
