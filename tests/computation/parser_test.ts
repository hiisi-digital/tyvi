/**
 * Tests for parser.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "../../src/computation/parser.ts";
import type { Expression } from "../../src/computation/ast.ts";

Deno.test("parse - number literal", () => {
  const ast = parse("42");
  assertEquals(ast.type, "number");
  assertEquals((ast as { value: number }).value, 42);
});

Deno.test("parse - reference", () => {
  const ast = parse("trait.caution");
  assertEquals(ast.type, "reference");
  const ref = ast as { category: string; name: string };
  assertEquals(ref.category, "trait");
  assertEquals(ref.name, "caution");
});

Deno.test("parse - simple addition", () => {
  const ast = parse("10 + 5");
  assertEquals(ast.type, "binary");
  const binOp = ast as { operator: string; left: Expression; right: Expression };
  assertEquals(binOp.operator, "+");
  assertEquals(binOp.left.type, "number");
  assertEquals(binOp.right.type, "number");
});

Deno.test("parse - simple multiplication", () => {
  const ast = parse("trait.caution * 0.5");
  assertEquals(ast.type, "binary");
  const binOp = ast as { operator: string; left: Expression; right: Expression };
  assertEquals(binOp.operator, "*");
  assertEquals(binOp.left.type, "reference");
  assertEquals(binOp.right.type, "number");
});

Deno.test("parse - operator precedence", () => {
  const ast = parse("10 + 5 * 2");
  assertEquals(ast.type, "binary");
  const binOp = ast as { operator: string; left: Expression; right: Expression };
  assertEquals(binOp.operator, "+");
  assertEquals(binOp.left.type, "number");
  assertEquals(binOp.right.type, "binary"); // 5 * 2
});

Deno.test("parse - parentheses", () => {
  const ast = parse("(10 + 5) * 2");
  assertEquals(ast.type, "binary");
  const binOp = ast as { operator: string; left: Expression; right: Expression };
  assertEquals(binOp.operator, "*");
  assertEquals(binOp.left.type, "binary"); // (10 + 5)
  assertEquals(binOp.right.type, "number");
});

Deno.test("parse - unary minus", () => {
  const ast = parse("-trait.caution");
  assertEquals(ast.type, "unary");
  const unaryOp = ast as { operator: string; operand: Expression };
  assertEquals(unaryOp.operator, "-");
  assertEquals(unaryOp.operand.type, "reference");
});

Deno.test("parse - function call with one arg", () => {
  const ast = parse("max(trait.a)");
  assertEquals(ast.type, "function");
  const func = ast as { name: string; args: Expression[] };
  assertEquals(func.name, "max");
  assertEquals(func.args.length, 1);
  assertEquals(func.args[0].type, "reference");
});

Deno.test("parse - function call with multiple args", () => {
  const ast = parse("avg(trait.a, trait.b, 50)");
  assertEquals(ast.type, "function");
  const func = ast as { name: string; args: Expression[] };
  assertEquals(func.name, "avg");
  assertEquals(func.args.length, 3);
  assertEquals(func.args[0].type, "reference");
  assertEquals(func.args[1].type, "reference");
  assertEquals(func.args[2].type, "number");
});

Deno.test("parse - clamp function", () => {
  const ast = parse("clamp(trait.a + 10, 0, 100)");
  assertEquals(ast.type, "function");
  const func = ast as { name: string; args: Expression[] };
  assertEquals(func.name, "clamp");
  assertEquals(func.args.length, 3);
  assertEquals(func.args[0].type, "binary"); // trait.a + 10
});

Deno.test("parse - complex expression", () => {
  const ast = parse("trait.caution * 0.5 + skill.api-design * 0.3");
  assertEquals(ast.type, "binary");
  const binOp = ast as { operator: string; left: Expression; right: Expression };
  assertEquals(binOp.operator, "+");
  assertEquals(binOp.left.type, "binary"); // trait.caution * 0.5
  assertEquals(binOp.right.type, "binary"); // skill.api-design * 0.3
});

Deno.test("parse - invalid reference format", () => {
  assertThrows(
    () => parse("trait"),
    Error,
    "Invalid reference"
  );
});

Deno.test("parse - unexpected token", () => {
  assertThrows(
    () => parse("trait.caution *"),
    Error,
    "Unexpected token"
  );
});
