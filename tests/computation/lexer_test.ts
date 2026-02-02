/**
 * Tests for lexer.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { tokenize } from "../../src/computation/lexer.ts";

Deno.test("tokenize - simple number", () => {
  const tokens = tokenize("42");
  assertEquals(tokens.length, 2); // number + eof
  assertEquals(tokens[0].type, "number");
  assertEquals(tokens[0].value, 42);
});

Deno.test("tokenize - decimal number", () => {
  const tokens = tokenize("3.14");
  assertEquals(tokens.length, 2);
  assertEquals(tokens[0].type, "number");
  assertEquals(tokens[0].value, 3.14);
});

Deno.test("tokenize - identifier", () => {
  const tokens = tokenize("trait");
  assertEquals(tokens.length, 2);
  assertEquals(tokens[0].type, "identifier");
  assertEquals(tokens[0].value, "trait");
});

Deno.test("tokenize - reference", () => {
  const tokens = tokenize("trait.caution");
  assertEquals(tokens.length, 4); // identifier, dot, identifier, eof
  assertEquals(tokens[0].type, "identifier");
  assertEquals(tokens[0].value, "trait");
  assertEquals(tokens[1].type, "dot");
  assertEquals(tokens[2].type, "identifier");
  assertEquals(tokens[2].value, "caution");
});

Deno.test("tokenize - arithmetic expression", () => {
  const tokens = tokenize("trait.caution * 0.5 + 10");
  assertEquals(tokens[0].type, "identifier");
  assertEquals(tokens[0].value, "trait");
  assertEquals(tokens[1].type, "dot");
  assertEquals(tokens[2].type, "identifier");
  assertEquals(tokens[2].value, "caution");
  assertEquals(tokens[3].type, "star");
  assertEquals(tokens[4].type, "number");
  assertEquals(tokens[4].value, 0.5);
  assertEquals(tokens[5].type, "plus");
  assertEquals(tokens[6].type, "number");
  assertEquals(tokens[6].value, 10);
});

Deno.test("tokenize - function call", () => {
  const tokens = tokenize("avg(trait.a, trait.b)");
  assertEquals(tokens[0].type, "identifier");
  assertEquals(tokens[0].value, "avg");
  assertEquals(tokens[1].type, "lparen");
  assertEquals(tokens[2].type, "identifier");
  assertEquals(tokens[2].value, "trait");
  assertEquals(tokens[3].type, "dot");
  assertEquals(tokens[4].type, "identifier");
  assertEquals(tokens[4].value, "a");
  assertEquals(tokens[5].type, "comma");
  // ... more tokens
});

Deno.test("tokenize - skips whitespace", () => {
  const tokens = tokenize("  42   +   3  ");
  assertEquals(tokens.length, 4); // number, plus, number, eof
  assertEquals(tokens[0].type, "number");
  assertEquals(tokens[1].type, "plus");
  assertEquals(tokens[2].type, "number");
});

Deno.test("tokenize - identifiers with hyphens", () => {
  const tokens = tokenize("detail-focus");
  assertEquals(tokens.length, 2);
  assertEquals(tokens[0].type, "identifier");
  assertEquals(tokens[0].value, "detail-focus");
});

Deno.test("tokenize - invalid character", () => {
  assertThrows(
    () => tokenize("trait.caution @ 10"),
    Error,
    "Unexpected character"
  );
});
