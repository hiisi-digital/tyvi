/**
 * Tests for evaluator.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "../../src/computation/parser.ts";
import { evaluate } from "../../src/computation/evaluator.ts";
import type { EvaluationContext } from "../../src/computation/evaluator.ts";

const testContext: EvaluationContext = {
  traits: {
    caution: 60,
    boldness: -40,
    "detail-focus": 75,
  },
  skills: {
    "api-design": 80,
    "type-system-design": 85,
  },
  experience: {
    rust: 70,
  },
  stacks: {
    typescript: 90,
  },
};

Deno.test("evaluate - number literal", () => {
  const ast = parse("42");
  const result = evaluate(ast, testContext);
  assertEquals(result, 42);
});

Deno.test("evaluate - trait reference", () => {
  const ast = parse("trait.caution");
  const result = evaluate(ast, testContext);
  assertEquals(result, 60);
});

Deno.test("evaluate - skill reference", () => {
  const ast = parse("skill.api-design");
  const result = evaluate(ast, testContext);
  assertEquals(result, 80);
});

Deno.test("evaluate - experience reference with alias", () => {
  const ast = parse("exp.rust");
  const result = evaluate(ast, testContext);
  assertEquals(result, 70);
});

Deno.test("evaluate - stack reference", () => {
  const ast = parse("stack.typescript");
  const result = evaluate(ast, testContext);
  assertEquals(result, 90);
});

Deno.test("evaluate - addition", () => {
  const ast = parse("10 + 5");
  const result = evaluate(ast, testContext);
  assertEquals(result, 15);
});

Deno.test("evaluate - subtraction", () => {
  const ast = parse("100 - 30");
  const result = evaluate(ast, testContext);
  assertEquals(result, 70);
});

Deno.test("evaluate - multiplication", () => {
  const ast = parse("trait.caution * 0.5");
  const result = evaluate(ast, testContext);
  assertEquals(result, 30);
});

Deno.test("evaluate - division", () => {
  const ast = parse("100 / 4");
  const result = evaluate(ast, testContext);
  assertEquals(result, 25);
});

Deno.test("evaluate - division by zero", () => {
  const ast = parse("100 / 0");
  assertThrows(
    () => evaluate(ast, testContext),
    Error,
    "Division by zero"
  );
});

Deno.test("evaluate - unary minus", () => {
  const ast = parse("-trait.caution");
  const result = evaluate(ast, testContext);
  assertEquals(result, -60);
});

Deno.test("evaluate - complex expression", () => {
  const ast = parse("trait.caution * 0.5 + skill.api-design * 0.3");
  const result = evaluate(ast, testContext);
  assertEquals(result, 54); // 60*0.5 + 80*0.3 = 30 + 24 = 54
});

Deno.test("evaluate - avg function", () => {
  const ast = parse("avg(trait.caution, skill.api-design)");
  const result = evaluate(ast, testContext);
  assertEquals(result, 70); // (60 + 80) / 2 = 70
});

Deno.test("evaluate - max function", () => {
  const ast = parse("max(trait.caution, skill.api-design, 100)");
  const result = evaluate(ast, testContext);
  assertEquals(result, 100);
});

Deno.test("evaluate - min function", () => {
  const ast = parse("min(trait.caution, skill.api-design, 100)");
  const result = evaluate(ast, testContext);
  assertEquals(result, 60);
});

Deno.test("evaluate - clamp function", () => {
  const ast = parse("clamp(trait.detail-focus + 30, 0, 100)");
  const result = evaluate(ast, testContext);
  assertEquals(result, 100); // 75 + 30 = 105, clamped to 100
});

Deno.test("evaluate - clamp function lower bound", () => {
  const ast = parse("clamp(trait.boldness, 0, 100)");
  const result = evaluate(ast, testContext);
  assertEquals(result, 0); // -40 clamped to 0
});

Deno.test("evaluate - undefined reference", () => {
  const ast = parse("trait.nonexistent");
  assertThrows(
    () => evaluate(ast, testContext),
    Error,
    "not found in context"
  );
});

Deno.test("evaluate - unknown category", () => {
  const ast = parse("unknown.value");
  assertThrows(
    () => evaluate(ast, testContext),
    Error,
    "Unknown category"
  );
});

Deno.test("evaluate - unknown function", () => {
  const ast = parse("unknown(10)");
  assertThrows(
    () => evaluate(ast, testContext),
    Error,
    "Unknown function"
  );
});
