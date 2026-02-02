/**
 * Computation module - expression parsing, evaluation, and rule engine.
 *
 * This module provides a complete expression language for computing
 * derived values (traits, skills, etc.) from composition rules.
 *
 * ## Architecture
 *
 * 1. **Lexer** (Moo-based): Fast tokenization of expression strings
 * 2. **Parser**: Recursive descent parser producing AST
 * 3. **Evaluator**: Evaluates AST with context (traits, skills, etc.)
 * 4. **Dependencies**: Cycle detection and topological sort
 * 5. **Rules**: Rule management and weighted combination
 *
 * ## Expression Language
 *
 * ```
 * trait.caution * 0.5 + avg(skill.*) - $base
 * ```
 *
 * - **Identifiers**: `trait.name`, `skill.name`, `exp.name`, `stack.name`, `quirk.name`
 * - **Special values**: `$current`, `$base`
 * - **Wildcards**: `trait.*`, `skill.*` (for aggregate functions)
 * - **Operators**: `+`, `-`, `*`, `/`, `>`, `<`, `>=`, `<=`, `==`, `!=`
 * - **Functions**: `avg()`, `max()`, `min()`, `sum()`, `count()`, `clamp()`
 *
 * @module
 */

// AST types and constructors
export type {
    BinaryOp,
    ComparisonOp,
    Expression,
    ExpressionNode,
    FunctionCall,
    Identifier,
    NumberLiteral,
    SpecialValue,
    Wildcard
} from "./ast.ts";

export {
    binaryOp,
    comparisonOp,
    functionCall,
    identifier,
    numberLiteral,
    specialValue,
    wildcard
} from "./ast.ts";

// Lexer
export { Lexer, LexerError, tokenize, TokenType } from "./lexer.ts";
export type { Token } from "./lexer.ts";

// Parser
export { parse, ParseError, Parser } from "./parser.ts";

// Evaluator
export { createContext, evaluate, EvaluationError, Evaluator } from "./evaluator.ts";
export type { EvaluationContext } from "./evaluator.ts";

// Dependencies
export {
    analyzeDependencies,
    buildDependencyGraph,
    extractDependencies,
    formatCycle,
    isCircular
} from "./dependencies.ts";
export type { Dependency, DependencyAnalysis } from "./dependencies.ts";

// Rules
export {
    buildRuleCollection,
    combineResults,
    createRule,
    getBaseValue,
    getRuleEvaluationOrder,
    getTargetType,
    logCircularDependency,
    normalizeValue,
    RuleEngineError
} from "./rules.ts";
export type { CompositionRule, RuleCollection, RuleResult, ValueType } from "./rules.ts";

/**
 * Create an empty computation trace for debugging.
 *
 * Helper function for initializing a trace when computation details aren't needed.
 *
 * @returns Empty computation trace
 */
export function createEmptyTrace(): import("../types/mod.ts").ComputationTrace {
  return {
    values: new Map(),
    circularDependencies: [],
    computationOrder: [],
  };
}

