/**
 * Tests for the Moo-based lexer
 *
 * @module
 */

import { assertEquals, assertThrows } from "@std/assert";
import { Lexer, LexerError, tokenize, TokenType } from "../../src/computation/lexer.ts";

Deno.test("Lexer - tokenizes number literals", () => {
  const tokens = tokenize("42");
  assertEquals(tokens.length, 2); // NUMBER + EOF
  assertEquals(tokens[0]!.type, TokenType.NUMBER);
  assertEquals(tokens[0]!.value, "42");
  assertEquals(tokens[1]!.type, TokenType.EOF);
});

Deno.test("Lexer - tokenizes decimal numbers", () => {
  const tokens = tokenize("3.14");
  assertEquals(tokens[0]!.type, TokenType.NUMBER);
  assertEquals(tokens[0]!.value, "3.14");
});

Deno.test("Lexer - tokenizes identifiers", () => {
  const tokens = tokenize("caution");
  assertEquals(tokens[0]!.type, TokenType.IDENTIFIER);
  assertEquals(tokens[0]!.value, "caution");
});

Deno.test("Lexer - tokenizes identifiers with hyphens and underscores", () => {
  const tokens = tokenize("edge-case_hunter");
  assertEquals(tokens[0]!.type, TokenType.IDENTIFIER);
  assertEquals(tokens[0]!.value, "edge-case_hunter");
});

Deno.test("Lexer - tokenizes function names", () => {
  const functions = ["avg", "max", "min", "sum", "count", "clamp"];

  for (const fn of functions) {
    const tokens = tokenize(fn);
    assertEquals(tokens[0]!.type, TokenType.FUNCTION, `Expected ${fn} to be a FUNCTION`);
    assertEquals(tokens[0]!.value, fn);
  }
});

Deno.test("Lexer - tokenizes special values", () => {
  const tokens1 = tokenize("$current");
  assertEquals(tokens1[0]!.type, TokenType.SPECIAL);
  assertEquals(tokens1[0]!.value, "$current");

  const tokens2 = tokenize("$base");
  assertEquals(tokens2[0]!.type, TokenType.SPECIAL);
  assertEquals(tokens2[0]!.value, "$base");
});

Deno.test("Lexer - rejects invalid special values", () => {
  assertThrows(
    () => tokenize("$invalid"),
    LexerError,
    "Invalid special value",
  );
});

Deno.test("Lexer - tokenizes arithmetic operators", () => {
  const tokens = tokenize("+ - * /");
  assertEquals(tokens[0]!.type, TokenType.PLUS);
  assertEquals(tokens[1]!.type, TokenType.MINUS);
  assertEquals(tokens[2]!.type, TokenType.STAR);
  assertEquals(tokens[3]!.type, TokenType.SLASH);
});

Deno.test("Lexer - tokenizes comparison operators", () => {
  const tokens = tokenize("> < >= <= == !=");
  assertEquals(tokens[0]!.type, TokenType.GT);
  assertEquals(tokens[1]!.type, TokenType.LT);
  assertEquals(tokens[2]!.type, TokenType.GTE);
  assertEquals(tokens[3]!.type, TokenType.LTE);
  assertEquals(tokens[4]!.type, TokenType.EQ);
  assertEquals(tokens[5]!.type, TokenType.NEQ);
});

Deno.test("Lexer - tokenizes punctuation", () => {
  const tokens = tokenize("( ) , .");
  assertEquals(tokens[0]!.type, TokenType.LPAREN);
  assertEquals(tokens[1]!.type, TokenType.RPAREN);
  assertEquals(tokens[2]!.type, TokenType.COMMA);
  assertEquals(tokens[3]!.type, TokenType.DOT);
});

Deno.test("Lexer - tokenizes wildcards", () => {
  const tokens = tokenize("trait.*");
  assertEquals(tokens[0]!.type, TokenType.IDENTIFIER);
  assertEquals(tokens[0]!.value, "trait");
  assertEquals(tokens[1]!.type, TokenType.WILDCARD);
  assertEquals(tokens[1]!.value, ".*");
});

Deno.test("Lexer - tokenizes complex expression", () => {
  const tokens = tokenize("trait.caution * 0.5 + avg(skill.*)");

  assertEquals(tokens[0]!.type, TokenType.IDENTIFIER);
  assertEquals(tokens[0]!.value, "trait");
  assertEquals(tokens[1]!.type, TokenType.DOT);
  assertEquals(tokens[2]!.type, TokenType.IDENTIFIER);
  assertEquals(tokens[2]!.value, "caution");
  assertEquals(tokens[3]!.type, TokenType.STAR);
  assertEquals(tokens[4]!.type, TokenType.NUMBER);
  assertEquals(tokens[4]!.value, "0.5");
  assertEquals(tokens[5]!.type, TokenType.PLUS);
  assertEquals(tokens[6]!.type, TokenType.FUNCTION);
  assertEquals(tokens[6]!.value, "avg");
  assertEquals(tokens[7]!.type, TokenType.LPAREN);
  assertEquals(tokens[8]!.type, TokenType.IDENTIFIER);
  assertEquals(tokens[8]!.value, "skill");
  assertEquals(tokens[9]!.type, TokenType.WILDCARD);
  assertEquals(tokens[10]!.type, TokenType.RPAREN);
  assertEquals(tokens[11]!.type, TokenType.EOF);
});

Deno.test("Lexer - handles whitespace correctly", () => {
  const tokens1 = tokenize("1+2");
  const tokens2 = tokenize("1 + 2");
  const tokens3 = tokenize("  1  +  2  ");

  // All should produce same tokens (excluding positions)
  assertEquals(tokens1.length, tokens2.length);
  assertEquals(tokens2.length, tokens3.length);

  for (let i = 0; i < tokens1.length; i++) {
    assertEquals(tokens1[i]!.type, tokens2[i]!.type);
    assertEquals(tokens2[i]!.type, tokens3[i]!.type);
    assertEquals(tokens1[i]!.value, tokens2[i]!.value);
    assertEquals(tokens2[i]!.value, tokens3[i]!.value);
  }
});

Deno.test("Lexer - tracks token positions", () => {
  const tokens = tokenize("1 + 2");
  assertEquals(tokens[0]!.position, 0); // "1"
  assertEquals(tokens[1]!.position, 2); // "+"
  assertEquals(tokens[2]!.position, 4); // "2"
});

Deno.test("Lexer - class-based usage", () => {
  const lexer = new Lexer("$base + 10");
  const tokens = lexer.tokenize();

  assertEquals(tokens[0]!.type, TokenType.SPECIAL);
  assertEquals(tokens[1]!.type, TokenType.PLUS);
  assertEquals(tokens[2]!.type, TokenType.NUMBER);
  assertEquals(tokens[3]!.type, TokenType.EOF);
});

Deno.test("Lexer - empty input", () => {
  const tokens = tokenize("");
  assertEquals(tokens.length, 1);
  assertEquals(tokens[0]!.type, TokenType.EOF);
});

Deno.test("Lexer - whitespace only input", () => {
  const tokens = tokenize("   \t\n  ");
  assertEquals(tokens.length, 1);
  assertEquals(tokens[0]!.type, TokenType.EOF);
});

Deno.test("Lexer - multiple function calls", () => {
  const tokens = tokenize("max(1, min(2, 3))");

  assertEquals(tokens[0]!.type, TokenType.FUNCTION);
  assertEquals(tokens[0]!.value, "max");
  assertEquals(tokens[1]!.type, TokenType.LPAREN);
  assertEquals(tokens[2]!.type, TokenType.NUMBER);
  assertEquals(tokens[3]!.type, TokenType.COMMA);
  assertEquals(tokens[4]!.type, TokenType.FUNCTION);
  assertEquals(tokens[4]!.value, "min");
});

Deno.test("Lexer - clamp function with three args", () => {
  const tokens = tokenize("clamp(value, 0, 100)");

  assertEquals(tokens[0]!.type, TokenType.FUNCTION);
  assertEquals(tokens[0]!.value, "clamp");
  assertEquals(tokens[1]!.type, TokenType.LPAREN);
  assertEquals(tokens[2]!.type, TokenType.IDENTIFIER);
  assertEquals(tokens[3]!.type, TokenType.COMMA);
  assertEquals(tokens[4]!.type, TokenType.NUMBER);
  assertEquals(tokens[5]!.type, TokenType.COMMA);
  assertEquals(tokens[6]!.type, TokenType.NUMBER);
  assertEquals(tokens[7]!.type, TokenType.RPAREN);
});
