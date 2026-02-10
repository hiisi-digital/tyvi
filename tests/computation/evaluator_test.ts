/**
 * Tests for the expression evaluator
 *
 * @module
 */

import { assertAlmostEquals, assertEquals, assertThrows } from "@std/assert";
import type { EvaluationContext } from "../../src/computation/evaluator.ts";
import {
  createContext,
  evaluate,
  EvaluationError,
  Evaluator,
} from "../../src/computation/evaluator.ts";
import { tokenize } from "../../src/computation/lexer.ts";
import { parse } from "../../src/computation/parser.ts";

/**
 * Helper to parse and evaluate an expression
 */
function eval_(expr: string, context: EvaluationContext): number {
  const tokens = tokenize(expr);
  const ast = parse(tokens);
  return evaluate(ast, context);
}

// =============================================================================
// Basic Literals
// =============================================================================

Deno.test("Evaluator - evaluates number literal", () => {
  const ctx = createContext();
  assertEquals(eval_("42", ctx), 42);
});

Deno.test("Evaluator - evaluates decimal number", () => {
  const ctx = createContext();
  assertAlmostEquals(eval_("3.14159", ctx), 3.14159, 0.00001);
});

Deno.test("Evaluator - evaluates zero", () => {
  const ctx = createContext();
  assertEquals(eval_("0", ctx), 0);
});

// =============================================================================
// Arithmetic Operations
// =============================================================================

Deno.test("Evaluator - evaluates addition", () => {
  const ctx = createContext();
  assertEquals(eval_("1 + 2", ctx), 3);
});

Deno.test("Evaluator - evaluates subtraction", () => {
  const ctx = createContext();
  assertEquals(eval_("5 - 3", ctx), 2);
});

Deno.test("Evaluator - evaluates multiplication", () => {
  const ctx = createContext();
  assertEquals(eval_("4 * 3", ctx), 12);
});

Deno.test("Evaluator - evaluates division", () => {
  const ctx = createContext();
  assertEquals(eval_("10 / 2", ctx), 5);
});

Deno.test("Evaluator - respects operator precedence", () => {
  const ctx = createContext();
  // 2 + 3 * 4 = 2 + 12 = 14 (not 20)
  assertEquals(eval_("2 + 3 * 4", ctx), 14);
});

Deno.test("Evaluator - respects parentheses", () => {
  const ctx = createContext();
  // (2 + 3) * 4 = 5 * 4 = 20
  assertEquals(eval_("(2 + 3) * 4", ctx), 20);
});

Deno.test("Evaluator - handles negation", () => {
  const ctx = createContext();
  assertEquals(eval_("-5", ctx), -5);
});

Deno.test("Evaluator - handles double negation", () => {
  const ctx = createContext();
  assertEquals(eval_("--5", ctx), 5);
});

Deno.test("Evaluator - handles complex expression", () => {
  const ctx = createContext();
  // (10 + 5) / 3 - 2 * 2 = 15 / 3 - 4 = 5 - 4 = 1
  assertEquals(eval_("(10 + 5) / 3 - 2 * 2", ctx), 1);
});

Deno.test("Evaluator - throws on division by zero", () => {
  const ctx = createContext();
  assertThrows(
    () => eval_("1 / 0", ctx),
    EvaluationError,
    "Division by zero",
  );
});

// =============================================================================
// Comparison Operations
// =============================================================================

Deno.test("Evaluator - greater than (true)", () => {
  const ctx = createContext();
  assertEquals(eval_("5 > 3", ctx), 1);
});

Deno.test("Evaluator - greater than (false)", () => {
  const ctx = createContext();
  assertEquals(eval_("3 > 5", ctx), 0);
});

Deno.test("Evaluator - less than (true)", () => {
  const ctx = createContext();
  assertEquals(eval_("3 < 5", ctx), 1);
});

Deno.test("Evaluator - less than (false)", () => {
  const ctx = createContext();
  assertEquals(eval_("5 < 3", ctx), 0);
});

Deno.test("Evaluator - greater than or equal (equal)", () => {
  const ctx = createContext();
  assertEquals(eval_("5 >= 5", ctx), 1);
});

Deno.test("Evaluator - greater than or equal (greater)", () => {
  const ctx = createContext();
  assertEquals(eval_("6 >= 5", ctx), 1);
});

Deno.test("Evaluator - less than or equal (equal)", () => {
  const ctx = createContext();
  assertEquals(eval_("5 <= 5", ctx), 1);
});

Deno.test("Evaluator - less than or equal (less)", () => {
  const ctx = createContext();
  assertEquals(eval_("4 <= 5", ctx), 1);
});

Deno.test("Evaluator - equality (true)", () => {
  const ctx = createContext();
  assertEquals(eval_("5 == 5", ctx), 1);
});

Deno.test("Evaluator - equality (false)", () => {
  const ctx = createContext();
  assertEquals(eval_("5 == 6", ctx), 0);
});

Deno.test("Evaluator - inequality (true)", () => {
  const ctx = createContext();
  assertEquals(eval_("5 != 6", ctx), 1);
});

Deno.test("Evaluator - inequality (false)", () => {
  const ctx = createContext();
  assertEquals(eval_("5 != 5", ctx), 0);
});

Deno.test("Evaluator - equality with float tolerance", () => {
  const ctx = createContext();
  // 0.1 + 0.2 should equal 0.3 (within epsilon)
  assertEquals(eval_("0.1 + 0.2 == 0.3", ctx), 1);
});

// =============================================================================
// Identifiers (Traits, Skills, etc.)
// =============================================================================

Deno.test("Evaluator - evaluates trait reference", () => {
  const ctx = createContext({
    traits: new Map([["caution", 60]]),
  });
  assertEquals(eval_("trait.caution", ctx), 60);
});

Deno.test("Evaluator - evaluates skill reference", () => {
  const ctx = createContext({
    skills: new Map([["debugging", 80]]),
  });
  assertEquals(eval_("skill.debugging", ctx), 80);
});

Deno.test("Evaluator - evaluates experience reference", () => {
  const ctx = createContext({
    experience: new Map([["rust", 75]]),
  });
  assertEquals(eval_("exp.rust", ctx), 75);
});

Deno.test("Evaluator - evaluates stack reference", () => {
  const ctx = createContext({
    stacks: new Map([["typescript", 90]]),
  });
  assertEquals(eval_("stack.typescript", ctx), 90);
});

Deno.test("Evaluator - evaluates quirk reference (present)", () => {
  const ctx = createContext({
    quirks: new Set(["edge-case-hunter"]),
  });
  assertEquals(eval_("quirk.edge-case-hunter", ctx), 1);
});

Deno.test("Evaluator - evaluates quirk reference (absent)", () => {
  const ctx = createContext({
    quirks: new Set(),
  });
  assertEquals(eval_("quirk.edge-case-hunter", ctx), 0);
});

Deno.test("Evaluator - throws on undefined trait", () => {
  const ctx = createContext();
  assertThrows(
    () => eval_("trait.unknown", ctx),
    EvaluationError,
    "Undefined trait: 'unknown'",
  );
});

Deno.test("Evaluator - throws on undefined skill", () => {
  const ctx = createContext();
  assertThrows(
    () => eval_("skill.unknown", ctx),
    EvaluationError,
    "Undefined skill: 'unknown'",
  );
});

Deno.test("Evaluator - throws on unknown namespace", () => {
  const ctx = createContext();
  const tokens = tokenize("foo.bar");
  const ast = parse(tokens);
  assertThrows(
    () => evaluate(ast, ctx),
    EvaluationError,
    "Unknown namespace",
  );
});

Deno.test("Evaluator - expression with multiple identifiers", () => {
  const ctx = createContext({
    traits: new Map([["caution", 60]]),
    skills: new Map([["debugging", 80]]),
  });
  // trait.caution * 0.5 + skill.debugging * 0.5 = 30 + 40 = 70
  assertEquals(eval_("trait.caution * 0.5 + skill.debugging * 0.5", ctx), 70);
});

// =============================================================================
// Special Values ($current, $base)
// =============================================================================

Deno.test("Evaluator - evaluates $base", () => {
  const ctx = createContext({ base: 50 });
  assertEquals(eval_("$base", ctx), 50);
});

Deno.test("Evaluator - evaluates $current when set", () => {
  const ctx = createContext({ current: 75 });
  assertEquals(eval_("$current", ctx), 75);
});

Deno.test("Evaluator - throws on $current when not set", () => {
  const ctx = createContext();
  assertThrows(
    () => eval_("$current", ctx),
    EvaluationError,
    "$current is not available",
  );
});

Deno.test("Evaluator - uses $base in expression", () => {
  const ctx = createContext({
    base: 50,
    traits: new Map([["caution", 20]]),
  });
  // $base + trait.caution * 0.5 = 50 + 10 = 60
  assertEquals(eval_("$base + trait.caution * 0.5", ctx), 60);
});

Deno.test("Evaluator - uses $current in recursive expression", () => {
  const ctx = createContext({
    current: 100,
    base: 50,
  });
  // $current * 0.9 + $base * 0.1 = 90 + 5 = 95
  assertEquals(eval_("$current * 0.9 + $base * 0.1", ctx), 95);
});

// =============================================================================
// Functions - avg()
// =============================================================================

Deno.test("Evaluator - avg() with single value", () => {
  const ctx = createContext();
  assertEquals(eval_("avg(10)", ctx), 10);
});

Deno.test("Evaluator - avg() with multiple values", () => {
  const ctx = createContext();
  assertEquals(eval_("avg(10, 20, 30)", ctx), 20);
});

Deno.test("Evaluator - avg() with empty input returns 0", () => {
  const ctx = createContext();
  assertEquals(eval_("avg()", ctx), 0);
});

Deno.test("Evaluator - avg() with expressions", () => {
  const ctx = createContext({
    traits: new Map([["a", 10], ["b", 20]]),
  });
  assertEquals(eval_("avg(trait.a, trait.b)", ctx), 15);
});

// =============================================================================
// Functions - max()
// =============================================================================

Deno.test("Evaluator - max() with multiple values", () => {
  const ctx = createContext();
  assertEquals(eval_("max(1, 5, 3)", ctx), 5);
});

Deno.test("Evaluator - max() with negative values", () => {
  const ctx = createContext();
  assertEquals(eval_("max(-5, -1, -10)", ctx), -1);
});

Deno.test("Evaluator - max() throws on empty input", () => {
  const ctx = createContext();
  assertThrows(
    () => eval_("max()", ctx),
    EvaluationError,
    "max() requires at least one argument",
  );
});

// =============================================================================
// Functions - min()
// =============================================================================

Deno.test("Evaluator - min() with multiple values", () => {
  const ctx = createContext();
  assertEquals(eval_("min(1, 5, 3)", ctx), 1);
});

Deno.test("Evaluator - min() with negative values", () => {
  const ctx = createContext();
  assertEquals(eval_("min(-5, -1, -10)", ctx), -10);
});

Deno.test("Evaluator - min() throws on empty input", () => {
  const ctx = createContext();
  assertThrows(
    () => eval_("min()", ctx),
    EvaluationError,
    "min() requires at least one argument",
  );
});

// =============================================================================
// Functions - sum()
// =============================================================================

Deno.test("Evaluator - sum() with values", () => {
  const ctx = createContext();
  assertEquals(eval_("sum(1, 2, 3, 4)", ctx), 10);
});

Deno.test("Evaluator - sum() with empty input returns 0", () => {
  const ctx = createContext();
  assertEquals(eval_("sum()", ctx), 0);
});

// =============================================================================
// Functions - count()
// =============================================================================

Deno.test("Evaluator - count() with values", () => {
  const ctx = createContext();
  assertEquals(eval_("count(1, 2, 3, 4, 5)", ctx), 5);
});

Deno.test("Evaluator - count() with empty input returns 0", () => {
  const ctx = createContext();
  assertEquals(eval_("count()", ctx), 0);
});

// =============================================================================
// Functions - clamp()
// =============================================================================

Deno.test("Evaluator - clamp() within range", () => {
  const ctx = createContext();
  assertEquals(eval_("clamp(50, 0, 100)", ctx), 50);
});

Deno.test("Evaluator - clamp() below min", () => {
  const ctx = createContext();
  assertEquals(eval_("clamp(-10, 0, 100)", ctx), 0);
});

Deno.test("Evaluator - clamp() above max", () => {
  const ctx = createContext();
  assertEquals(eval_("clamp(150, 0, 100)", ctx), 100);
});

Deno.test("Evaluator - clamp() with expressions", () => {
  const ctx = createContext({
    traits: new Map([["caution", 150]]),
  });
  assertEquals(eval_("clamp(trait.caution, 0, 100)", ctx), 100);
});

Deno.test("Evaluator - clamp() throws on wrong argument count", () => {
  const ctx = createContext();
  assertThrows(
    () => eval_("clamp(50, 0)", ctx),
    EvaluationError,
    "clamp() requires exactly 3 arguments",
  );
});

// =============================================================================
// Functions - nested
// =============================================================================

Deno.test("Evaluator - nested function calls", () => {
  const ctx = createContext();
  // max(1, min(5, 3)) = max(1, 3) = 3
  assertEquals(eval_("max(1, min(5, 3))", ctx), 3);
});

Deno.test("Evaluator - function with arithmetic expression args", () => {
  const ctx = createContext();
  // avg(1 + 1, 2 + 2, 3 + 3) = avg(2, 4, 6) = 4
  assertEquals(eval_("avg(1 + 1, 2 + 2, 3 + 3)", ctx), 4);
});

// =============================================================================
// Wildcards
// =============================================================================

Deno.test("Evaluator - avg() with trait wildcard", () => {
  const ctx = createContext({
    traits: new Map([
      ["caution", 60],
      ["curiosity", 80],
      ["patience", 40],
    ]),
  });
  // avg(60, 80, 40) = 60
  assertEquals(eval_("avg(trait.*)", ctx), 60);
});

Deno.test("Evaluator - sum() with skill wildcard", () => {
  const ctx = createContext({
    skills: new Map([
      ["debugging", 80],
      ["testing", 70],
    ]),
  });
  // sum(80, 70) = 150
  assertEquals(eval_("sum(skill.*)", ctx), 150);
});

Deno.test("Evaluator - count() with wildcard", () => {
  const ctx = createContext({
    traits: new Map([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]),
  });
  assertEquals(eval_("count(trait.*)", ctx), 3);
});

Deno.test("Evaluator - max() with wildcard", () => {
  const ctx = createContext({
    skills: new Map([
      ["a", 50],
      ["b", 90],
      ["c", 70],
    ]),
  });
  assertEquals(eval_("max(skill.*)", ctx), 90);
});

Deno.test("Evaluator - min() with wildcard", () => {
  const ctx = createContext({
    skills: new Map([
      ["a", 50],
      ["b", 90],
      ["c", 70],
    ]),
  });
  assertEquals(eval_("min(skill.*)", ctx), 50);
});

Deno.test("Evaluator - wildcard with empty map returns 0 for avg", () => {
  const ctx = createContext({
    traits: new Map(),
  });
  assertEquals(eval_("avg(trait.*)", ctx), 0);
});

Deno.test("Evaluator - count() with quirk wildcard", () => {
  const ctx = createContext({
    quirks: new Set(["quirk1", "quirk2", "quirk3"]),
  });
  assertEquals(eval_("count(quirk.*)", ctx), 3);
});

Deno.test("Evaluator - wildcard outside function throws", () => {
  const ctx = createContext({
    traits: new Map([["a", 1]]),
  });
  assertThrows(
    () => eval_("trait.*", ctx),
    EvaluationError,
    "can only be used inside aggregate functions",
  );
});

Deno.test("Evaluator - wildcard with mixed args", () => {
  const ctx = createContext({
    traits: new Map([["a", 10], ["b", 20]]),
  });
  // avg(trait.*, 100) = avg(10, 20, 100) = 130/3 ≈ 43.33
  assertAlmostEquals(eval_("avg(trait.*, 100)", ctx), 43.333, 0.01);
});

// =============================================================================
// Class-based Evaluator
// =============================================================================

Deno.test("Evaluator - class-based usage", () => {
  const ctx = createContext({
    traits: new Map([["caution", 50]]),
    base: 25,
  });

  const tokens = tokenize("$base + trait.caution");
  const ast = parse(tokens);
  const evaluator = new Evaluator(ctx);

  assertEquals(evaluator.evaluate(ast), 75);
});

// =============================================================================
// createContext helper
// =============================================================================

Deno.test("createContext - creates empty context", () => {
  const ctx = createContext();

  assertEquals(ctx.traits.size, 0);
  assertEquals(ctx.skills.size, 0);
  assertEquals(ctx.experience.size, 0);
  assertEquals(ctx.stacks.size, 0);
  assertEquals(ctx.quirks.size, 0);
  assertEquals(ctx.current, undefined);
  assertEquals(ctx.base, 0);
});

Deno.test("createContext - accepts partial overrides", () => {
  const ctx = createContext({
    traits: new Map([["a", 1]]),
    base: 50,
  });

  assertEquals(ctx.traits.get("a"), 1);
  assertEquals(ctx.base, 50);
  assertEquals(ctx.skills.size, 0); // Default
});

// =============================================================================
// Complex Integration Tests
// =============================================================================

Deno.test("Evaluator - realistic composition rule", () => {
  const ctx = createContext({
    traits: new Map([
      ["caution", 60],
      ["patience", 40],
    ]),
    skills: new Map([
      ["debugging", 85],
      ["testing", 75],
    ]),
    experience: new Map([
      ["rust", 70],
    ]),
    base: 50,
  });

  // A realistic rule: base value modified by traits and skills
  // $base + avg(trait.*) * 0.3 + max(skill.*) * 0.2
  // = 50 + 50 * 0.3 + 85 * 0.2
  // = 50 + 15 + 17 = 82
  assertEquals(eval_("$base + avg(trait.*) * 0.3 + max(skill.*) * 0.2", ctx), 82);
});

Deno.test("Evaluator - conditional-like expression using comparison", () => {
  const ctx = createContext({
    skills: new Map([["expertise", 90]]),
  });

  // If skill > 80, add 10 bonus (comparison returns 1 or 0)
  // (skill.expertise > 80) * 10 = 1 * 10 = 10
  assertEquals(eval_("(skill.expertise > 80) * 10", ctx), 10);

  // With lower skill
  const ctx2 = createContext({
    skills: new Map([["expertise", 70]]),
  });
  assertEquals(eval_("(skill.expertise > 80) * 10", ctx2), 0);
});

Deno.test("Evaluator - quirk-based bonus", () => {
  const ctx = createContext({
    quirks: new Set(["perfectionist"]),
    base: 50,
  });

  // Add 10 if perfectionist quirk is present
  // $base + quirk.perfectionist * 10 = 50 + 1 * 10 = 60
  assertEquals(eval_("$base + quirk.perfectionist * 10", ctx), 60);

  // Without the quirk
  const ctx2 = createContext({
    quirks: new Set(),
    base: 50,
  });
  assertEquals(eval_("$base + quirk.perfectionist * 10", ctx2), 50);
});

Deno.test("Evaluator - clamped result", () => {
  const ctx = createContext({
    traits: new Map([["enthusiasm", 150]]), // Over max
    base: 0,
  });

  // Clamp the result to valid trait range
  assertEquals(eval_("clamp(trait.enthusiasm, -100, 100)", ctx), 100);
});
