/**
 * Tests for the recursive descent parser
 *
 * @module
 */

import { assertEquals, assertThrows } from "@std/assert";
import { tokenize } from "../../src/computation/lexer.ts";
import { parse, ParseError, Parser } from "../../src/computation/parser.ts";

Deno.test("Parser - parses number literal", () => {
  const tokens = tokenize("42");
  const ast = parse(tokens);

  assertEquals(ast.kind, "NumberLiteral");
  if (ast.kind === "NumberLiteral") {
    assertEquals(ast.value, 42);
  }
});

Deno.test("Parser - parses decimal number", () => {
  const tokens = tokenize("3.14159");
  const ast = parse(tokens);

  assertEquals(ast.kind, "NumberLiteral");
  if (ast.kind === "NumberLiteral") {
    assertEquals(ast.value, 3.14159);
  }
});

Deno.test("Parser - parses namespaced identifier", () => {
  const tokens = tokenize("trait.caution");
  const ast = parse(tokens);

  assertEquals(ast.kind, "Identifier");
  if (ast.kind === "Identifier") {
    assertEquals(ast.namespace, "trait");
    assertEquals(ast.name, "caution");
  }
});

Deno.test("Parser - parses various namespaces", () => {
  const namespaces = ["trait", "skill", "exp", "stack", "quirk"];

  for (const ns of namespaces) {
    const tokens = tokenize(`${ns}.test_value`);
    const ast = parse(tokens);

    assertEquals(ast.kind, "Identifier", `Expected Identifier for ${ns}`);
    if (ast.kind === "Identifier") {
      assertEquals(ast.namespace, ns);
      assertEquals(ast.name, "test_value");
    }
  }
});

Deno.test("Parser - parses special value $current", () => {
  const tokens = tokenize("$current");
  const ast = parse(tokens);

  assertEquals(ast.kind, "SpecialValue");
  if (ast.kind === "SpecialValue") {
    assertEquals(ast.value, "$current");
  }
});

Deno.test("Parser - parses special value $base", () => {
  const tokens = tokenize("$base");
  const ast = parse(tokens);

  assertEquals(ast.kind, "SpecialValue");
  if (ast.kind === "SpecialValue") {
    assertEquals(ast.value, "$base");
  }
});

Deno.test("Parser - parses wildcard", () => {
  const tokens = tokenize("trait.*");
  const ast = parse(tokens);

  assertEquals(ast.kind, "Wildcard");
  if (ast.kind === "Wildcard") {
    assertEquals(ast.namespace, "trait");
  }
});

Deno.test("Parser - parses binary addition", () => {
  const tokens = tokenize("1 + 2");
  const ast = parse(tokens);

  assertEquals(ast.kind, "BinaryOp");
  if (ast.kind === "BinaryOp") {
    assertEquals(ast.operator, "+");
    assertEquals(ast.left.kind, "NumberLiteral");
    assertEquals(ast.right.kind, "NumberLiteral");
  }
});

Deno.test("Parser - parses binary subtraction", () => {
  const tokens = tokenize("5 - 3");
  const ast = parse(tokens);

  assertEquals(ast.kind, "BinaryOp");
  if (ast.kind === "BinaryOp") {
    assertEquals(ast.operator, "-");
  }
});

Deno.test("Parser - parses binary multiplication", () => {
  const tokens = tokenize("2 * 3");
  const ast = parse(tokens);

  assertEquals(ast.kind, "BinaryOp");
  if (ast.kind === "BinaryOp") {
    assertEquals(ast.operator, "*");
  }
});

Deno.test("Parser - parses binary division", () => {
  const tokens = tokenize("10 / 2");
  const ast = parse(tokens);

  assertEquals(ast.kind, "BinaryOp");
  if (ast.kind === "BinaryOp") {
    assertEquals(ast.operator, "/");
  }
});

Deno.test("Parser - respects operator precedence (mul before add)", () => {
  // 1 + 2 * 3 should be 1 + (2 * 3), not (1 + 2) * 3
  const tokens = tokenize("1 + 2 * 3");
  const ast = parse(tokens);

  assertEquals(ast.kind, "BinaryOp");
  if (ast.kind === "BinaryOp") {
    assertEquals(ast.operator, "+");
    assertEquals(ast.left.kind, "NumberLiteral");
    assertEquals(ast.right.kind, "BinaryOp");
    if (ast.right.kind === "BinaryOp") {
      assertEquals(ast.right.operator, "*");
    }
  }
});

Deno.test("Parser - respects operator precedence (div before sub)", () => {
  // 10 - 6 / 2 should be 10 - (6 / 2)
  const tokens = tokenize("10 - 6 / 2");
  const ast = parse(tokens);

  assertEquals(ast.kind, "BinaryOp");
  if (ast.kind === "BinaryOp") {
    assertEquals(ast.operator, "-");
    assertEquals(ast.right.kind, "BinaryOp");
    if (ast.right.kind === "BinaryOp") {
      assertEquals(ast.right.operator, "/");
    }
  }
});

Deno.test("Parser - respects left associativity", () => {
  // 1 - 2 - 3 should be (1 - 2) - 3
  const tokens = tokenize("1 - 2 - 3");
  const ast = parse(tokens);

  assertEquals(ast.kind, "BinaryOp");
  if (ast.kind === "BinaryOp") {
    assertEquals(ast.operator, "-");
    assertEquals(ast.left.kind, "BinaryOp");
    if (ast.left.kind === "BinaryOp") {
      assertEquals(ast.left.operator, "-");
    }
    assertEquals(ast.right.kind, "NumberLiteral");
  }
});

Deno.test("Parser - handles parentheses for grouping", () => {
  // (1 + 2) * 3 should override precedence
  const tokens = tokenize("(1 + 2) * 3");
  const ast = parse(tokens);

  assertEquals(ast.kind, "BinaryOp");
  if (ast.kind === "BinaryOp") {
    assertEquals(ast.operator, "*");
    assertEquals(ast.left.kind, "BinaryOp");
    if (ast.left.kind === "BinaryOp") {
      assertEquals(ast.left.operator, "+");
    }
  }
});

Deno.test("Parser - parses unary negation", () => {
  const tokens = tokenize("-5");
  const ast = parse(tokens);

  // Unary minus is transformed to (-1) * 5
  assertEquals(ast.kind, "BinaryOp");
  if (ast.kind === "BinaryOp") {
    assertEquals(ast.operator, "*");
    assertEquals(ast.left.kind, "NumberLiteral");
    if (ast.left.kind === "NumberLiteral") {
      assertEquals(ast.left.value, -1);
    }
  }
});

Deno.test("Parser - parses double negation", () => {
  const tokens = tokenize("--5");
  const ast = parse(tokens);

  // --5 becomes (-1) * ((-1) * 5)
  assertEquals(ast.kind, "BinaryOp");
  if (ast.kind === "BinaryOp") {
    assertEquals(ast.operator, "*");
    assertEquals(ast.right.kind, "BinaryOp");
  }
});

Deno.test("Parser - parses comparison operators", () => {
  const operators = [">", "<", ">=", "<=", "==", "!="];

  for (const op of operators) {
    const tokens = tokenize(`1 ${op} 2`);
    const ast = parse(tokens);

    assertEquals(ast.kind, "ComparisonOp", `Expected ComparisonOp for ${op}`);
    if (ast.kind === "ComparisonOp") {
      assertEquals(ast.operator, op);
    }
  }
});

Deno.test("Parser - comparison has lowest precedence", () => {
  // 1 + 2 > 3 - 1 should be (1 + 2) > (3 - 1)
  const tokens = tokenize("1 + 2 > 3 - 1");
  const ast = parse(tokens);

  assertEquals(ast.kind, "ComparisonOp");
  if (ast.kind === "ComparisonOp") {
    assertEquals(ast.operator, ">");
    assertEquals(ast.left.kind, "BinaryOp");
    assertEquals(ast.right.kind, "BinaryOp");
  }
});

Deno.test("Parser - parses function call with no arguments", () => {
  const tokens = tokenize("avg()");
  const ast = parse(tokens);

  assertEquals(ast.kind, "FunctionCall");
  if (ast.kind === "FunctionCall") {
    assertEquals(ast.name, "avg");
    assertEquals(ast.args.length, 0);
  }
});

Deno.test("Parser - parses function call with one argument", () => {
  const tokens = tokenize("avg(trait.caution)");
  const ast = parse(tokens);

  assertEquals(ast.kind, "FunctionCall");
  if (ast.kind === "FunctionCall") {
    assertEquals(ast.name, "avg");
    assertEquals(ast.args.length, 1);
    assertEquals(ast.args[0]!.kind, "Identifier");
  }
});

Deno.test("Parser - parses function call with multiple arguments", () => {
  const tokens = tokenize("max(1, 2, 3)");
  const ast = parse(tokens);

  assertEquals(ast.kind, "FunctionCall");
  if (ast.kind === "FunctionCall") {
    assertEquals(ast.name, "max");
    assertEquals(ast.args.length, 3);
  }
});

Deno.test("Parser - parses function call with wildcard argument", () => {
  const tokens = tokenize("avg(trait.*)");
  const ast = parse(tokens);

  assertEquals(ast.kind, "FunctionCall");
  if (ast.kind === "FunctionCall") {
    assertEquals(ast.name, "avg");
    assertEquals(ast.args.length, 1);
    assertEquals(ast.args[0]!.kind, "Wildcard");
  }
});

Deno.test("Parser - parses clamp with three arguments", () => {
  const tokens = tokenize("clamp(trait.caution, -100, 100)");
  const ast = parse(tokens);

  assertEquals(ast.kind, "FunctionCall");
  if (ast.kind === "FunctionCall") {
    assertEquals(ast.name, "clamp");
    assertEquals(ast.args.length, 3);
    assertEquals(ast.args[0]!.kind, "Identifier");
    assertEquals(ast.args[1]!.kind, "BinaryOp"); // -100 is parsed as negation
    assertEquals(ast.args[2]!.kind, "NumberLiteral");
  }
});

Deno.test("Parser - parses nested function calls", () => {
  const tokens = tokenize("max(1, min(2, 3))");
  const ast = parse(tokens);

  assertEquals(ast.kind, "FunctionCall");
  if (ast.kind === "FunctionCall") {
    assertEquals(ast.name, "max");
    assertEquals(ast.args.length, 2);
    assertEquals(ast.args[1]!.kind, "FunctionCall");
    const secondArg = ast.args[1];
    if (secondArg?.kind === "FunctionCall") {
      assertEquals(secondArg.name, "min");
    }
  }
});

Deno.test("Parser - parses complex expression", () => {
  const tokens = tokenize("$base + trait.caution * 0.5 + avg(skill.*)");
  const ast = parse(tokens);

  assertEquals(ast.kind, "BinaryOp");
  // The structure should be: ($base + (trait.caution * 0.5)) + avg(skill.*)
  // Due to left associativity of +
});

Deno.test("Parser - parses expression with special values", () => {
  const tokens = tokenize("$current + $base * 0.5");
  const ast = parse(tokens);

  assertEquals(ast.kind, "BinaryOp");
  if (ast.kind === "BinaryOp") {
    assertEquals(ast.operator, "+");
    assertEquals(ast.left.kind, "SpecialValue");
    assertEquals(ast.right.kind, "BinaryOp");
  }
});

Deno.test("Parser - throws on missing closing paren", () => {
  const tokens = tokenize("(1 + 2");
  assertThrows(
    () => parse(tokens),
    ParseError,
    "Expected ')'",
  );
});

Deno.test("Parser - throws on missing function arguments paren", () => {
  const tokens = tokenize("avg(1, 2");
  assertThrows(
    () => parse(tokens),
    ParseError,
    "Expected ')'",
  );
});

Deno.test("Parser - throws on trailing tokens", () => {
  const tokens = tokenize("1 + 2 3");
  assertThrows(
    () => parse(tokens),
    ParseError,
    "Unexpected token",
  );
});

Deno.test("Parser - throws on missing expression", () => {
  const tokens = tokenize("+");
  assertThrows(
    () => parse(tokens),
    ParseError,
  );
});

Deno.test("Parser - throws on missing identifier after dot", () => {
  const tokens = tokenize("trait.");
  assertThrows(
    () => parse(tokens),
    ParseError,
    "Expected identifier after '.'",
  );
});

Deno.test("Parser - class-based usage", () => {
  const tokens = tokenize("1 + 2");
  const parser = new Parser(tokens);
  const ast = parser.parse();

  assertEquals(ast.kind, "BinaryOp");
});

Deno.test("Parser - handles expressions with all supported functions", () => {
  const functions = ["avg", "max", "min", "sum", "count", "clamp"];

  for (const fn of functions) {
    const expr = fn === "clamp" ? `${fn}(1, 0, 100)` : `${fn}(1, 2, 3)`;
    const tokens = tokenize(expr);
    const ast = parse(tokens);

    assertEquals(ast.kind, "FunctionCall", `Expected FunctionCall for ${fn}`);
    if (ast.kind === "FunctionCall") {
      assertEquals(ast.name, fn);
    }
  }
});

Deno.test("Parser - handles deeply nested parentheses", () => {
  const tokens = tokenize("((((1 + 2))))");
  const ast = parse(tokens);

  assertEquals(ast.kind, "BinaryOp");
  if (ast.kind === "BinaryOp") {
    assertEquals(ast.operator, "+");
  }
});

Deno.test("Parser - handles mixed identifiers and numbers", () => {
  const tokens = tokenize("trait.caution + 10 - skill.debugging * 0.5");
  const ast = parse(tokens);

  assertEquals(ast.kind, "BinaryOp");
});
