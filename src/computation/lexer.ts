/**
 * Lexer for the expression language using Moo.
 *
 * Moo provides fast, regex-based tokenization with excellent error messages.
 * This lexer handles:
 * - Number literals (integers and decimals)
 * - Identifiers (trait, skill, exp, stack, quirk namespaces)
 * - Special values ($current, $base)
 * - Wildcards (.*)
 * - Arithmetic operators (+, -, *, /)
 * - Comparison operators (>, <, >=, <=, ==, !=)
 * - Punctuation (, . ( ))
 * - Function names (avg, max, min, sum, count, clamp)
 *
 * @module
 */

import moo from "moo";

/**
 * Token types for the expression language
 */
export enum TokenType {
  // Literals
  NUMBER = "NUMBER",

  // Identifiers and keywords
  IDENTIFIER = "IDENTIFIER",
  FUNCTION = "FUNCTION",

  // Special values
  SPECIAL = "SPECIAL",

  // Operators
  PLUS = "PLUS",
  MINUS = "MINUS",
  STAR = "STAR",
  SLASH = "SLASH",

  // Comparison operators
  GTE = "GTE",
  LTE = "LTE",
  GT = "GT",
  LT = "LT",
  EQ = "EQ",
  NEQ = "NEQ",

  // Punctuation
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  COMMA = "COMMA",
  DOT = "DOT",
  WILDCARD = "WILDCARD",

  // Control
  WS = "WS",
  EOF = "EOF",
}

/**
 * A token in the expression language
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Error thrown during lexical analysis
 */
export class LexerError extends Error {
  constructor(
    message: string,
    public position: number,
  ) {
    super(`Lexer error at position ${position}: ${message}`);
    this.name = "LexerError";
  }
}

/**
 * Set of function names recognized by the lexer
 */
const FUNCTION_NAMES = new Set(["avg", "max", "min", "sum", "count", "clamp"]);

/**
 * Set of valid special value names
 */
const SPECIAL_VALUES = new Set(["$current", "$base"]);

/**
 * Moo lexer rules
 *
 * Order matters! More specific patterns must come before more general ones.
 */
const lexerRules: moo.Rules = {
  // Whitespace (will be filtered out)
  // lineBreaks: true tells Moo this rule can match newlines
  WS: { match: /[ \t\r\n]+/, lineBreaks: true },

  // Numbers: integers and decimals
  NUMBER: /(?:0|[1-9][0-9]*)(?:\.[0-9]+)?/,

  // Special values: $current, $base
  SPECIAL: /\$[a-zA-Z]+/,

  // Comparison operators (multi-char first!)
  GTE: ">=",
  LTE: "<=",
  EQ: "==",
  NEQ: "!=",
  GT: ">",
  LT: "<",

  // Arithmetic operators
  PLUS: "+",
  MINUS: "-",
  STAR: "*",
  SLASH: "/",

  // Punctuation
  LPAREN: "(",
  RPAREN: ")",
  COMMA: ",",

  // Wildcard (must come before DOT to match .* as a unit when following identifier)
  WILDCARD: /\.\*/,

  // Dot for namespace.name
  DOT: ".",

  // Identifiers: alphanumeric with hyphens and underscores
  // This will match both function names and regular identifiers
  IDENTIFIER: /[a-zA-Z_][a-zA-Z0-9_\-]*/,
};

/**
 * Create the Moo lexer instance
 */
const mooLexer = moo.compile(lexerRules);

/**
 * Convert a Moo token to our Token format
 */
function convertToken(mooToken: moo.Token): Token {
  let type: TokenType;

  switch (mooToken.type) {
    case "NUMBER":
      type = TokenType.NUMBER;
      break;
    case "SPECIAL":
      // Validate special value
      if (!SPECIAL_VALUES.has(mooToken.value)) {
        throw new LexerError(
          `Invalid special value: ${mooToken.value}. Expected $current or $base`,
          mooToken.offset,
        );
      }
      type = TokenType.SPECIAL;
      break;
    case "IDENTIFIER":
      // Check if it's a function name
      if (FUNCTION_NAMES.has(mooToken.value)) {
        type = TokenType.FUNCTION;
      } else {
        type = TokenType.IDENTIFIER;
      }
      break;
    case "GTE":
      type = TokenType.GTE;
      break;
    case "LTE":
      type = TokenType.LTE;
      break;
    case "EQ":
      type = TokenType.EQ;
      break;
    case "NEQ":
      type = TokenType.NEQ;
      break;
    case "GT":
      type = TokenType.GT;
      break;
    case "LT":
      type = TokenType.LT;
      break;
    case "PLUS":
      type = TokenType.PLUS;
      break;
    case "MINUS":
      type = TokenType.MINUS;
      break;
    case "STAR":
      type = TokenType.STAR;
      break;
    case "SLASH":
      type = TokenType.SLASH;
      break;
    case "LPAREN":
      type = TokenType.LPAREN;
      break;
    case "RPAREN":
      type = TokenType.RPAREN;
      break;
    case "COMMA":
      type = TokenType.COMMA;
      break;
    case "DOT":
      type = TokenType.DOT;
      break;
    case "WILDCARD":
      type = TokenType.WILDCARD;
      break;
    case "WS":
      type = TokenType.WS;
      break;
    default:
      throw new LexerError(
        `Unknown token type: ${mooToken.type}`,
        mooToken.offset,
      );
  }

  return {
    type,
    value: mooToken.value,
    position: mooToken.offset,
  };
}

/**
 * Lexer class wrapper for Moo
 *
 * Provides a familiar interface while using Moo's fast tokenization internally.
 */
export class Lexer {
  private input: string;

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize the input string
   *
   * @returns Array of tokens (whitespace filtered out)
   * @throws LexerError if tokenization fails
   */
  public tokenize(): Token[] {
    const tokens: Token[] = [];

    // Reset and feed the lexer
    mooLexer.reset(this.input);

    // Iterate through all tokens
    for (const mooToken of mooLexer) {
      // Handle errors (Moo uses type 'error' for invalid input)
      if (mooToken.type === "error") {
        throw new LexerError(
          `Unexpected character: ${mooToken.value}`,
          mooToken.offset,
        );
      }

      const token = convertToken(mooToken);

      // Filter out whitespace
      if (token.type !== TokenType.WS) {
        tokens.push(token);
      }
    }

    // Add EOF token
    tokens.push({
      type: TokenType.EOF,
      value: "",
      position: this.input.length,
    });

    return tokens;
  }
}

/**
 * Convenience function to tokenize an expression string
 *
 * @param input - The expression string to tokenize
 * @returns Array of tokens
 * @throws LexerError if tokenization fails
 *
 * @example
 * ```ts
 * const tokens = tokenize("trait.caution * 0.5 + avg(skill.*)");
 * ```
 */
export function tokenize(input: string): Token[] {
  const lexer = new Lexer(input);
  return lexer.tokenize();
}
