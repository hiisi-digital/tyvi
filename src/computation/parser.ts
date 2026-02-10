/**
 * Recursive descent parser for the expression language.
 *
 * @module
 *
 * Grammar (in order of increasing precedence):
 * ```
 * expression  = comparison
 * comparison  = term (('>=' | '<=' | '>' | '<' | '==' | '!=') term)?
 * term        = factor (('+' | '-') factor)*
 * factor      = unary (('*' | '/') unary)*
 * unary       = '-' unary | primary
 * primary     = number | special | function | namespaced | '(' expression ')'
 * namespaced  = IDENTIFIER '.' (IDENTIFIER | '*')
 * function    = FUNCTION '(' (expression (',' expression)*)? ')'
 * ```
 */

import type { Expression } from "./ast.ts";
import {
  binaryOp,
  comparisonOp,
  functionCall,
  identifier,
  numberLiteral,
  specialValue,
  wildcard,
} from "./ast.ts";
import type { Token } from "./lexer.ts";
import { TokenType } from "./lexer.ts";

/**
 * Error thrown during parsing
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public token?: Token,
  ) {
    const posInfo = token ? ` at position ${token.position}` : "";
    super(`Parse error${posInfo}: ${message}`);
    this.name = "ParseError";
  }
}

/**
 * Recursive descent parser for the expression language
 */
export class Parser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Get the current token
   */
  private current(): Token {
    return this.tokens[this.position]!;
  }

  /**
   * Get the previous token
   */
  private previous(): Token {
    return this.tokens[this.position - 1]!;
  }

  /**
   * Check if we're at the end of the token stream
   */
  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }

  /**
   * Advance to the next token and return the previous one
   */
  private advance(): Token {
    if (!this.isAtEnd()) {
      this.position++;
    }
    return this.previous();
  }

  /**
   * Check if the current token is of a specific type
   */
  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.current().type === type;
  }

  /**
   * Check if the current token matches any of the given types.
   * If so, consume it and return true.
   */
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  /**
   * Expect a specific token type and consume it, or throw an error
   */
  private expect(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw new ParseError(message, this.current());
  }

  /**
   * Parse the entire expression
   *
   * @returns The parsed AST
   * @throws ParseError if parsing fails
   */
  public parse(): Expression {
    const expr = this.expression();

    if (!this.isAtEnd()) {
      throw new ParseError(
        `Unexpected token after expression: '${this.current().value}'`,
        this.current(),
      );
    }

    return expr;
  }

  /**
   * Parse an expression (top level - lowest precedence)
   */
  private expression(): Expression {
    return this.comparison();
  }

  /**
   * Parse comparison operations (>, <, >=, <=, ==, !=)
   *
   * Non-associative: only one comparison allowed per expression.
   * `a > b > c` is a syntax error (or would require different semantics).
   */
  private comparison(): Expression {
    let expr = this.term();

    if (
      this.match(
        TokenType.GT,
        TokenType.LT,
        TokenType.GTE,
        TokenType.LTE,
        TokenType.EQ,
        TokenType.NEQ,
      )
    ) {
      const operator = this.previous().value as
        | ">"
        | "<"
        | ">="
        | "<="
        | "=="
        | "!=";
      const right = this.term();
      expr = comparisonOp(operator, expr, right);
    }

    return expr;
  }

  /**
   * Parse addition and subtraction (left-associative)
   */
  private term(): Expression {
    let expr = this.factor();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value as "+" | "-";
      const right = this.factor();
      expr = binaryOp(operator, expr, right);
    }

    return expr;
  }

  /**
   * Parse multiplication and division (left-associative)
   */
  private factor(): Expression {
    let expr = this.unary();

    while (this.match(TokenType.STAR, TokenType.SLASH)) {
      const operator = this.previous().value as "*" | "/";
      const right = this.unary();
      expr = binaryOp(operator, expr, right);
    }

    return expr;
  }

  /**
   * Parse unary operations (negation)
   *
   * We transform -x into (-1) * x for simplicity in the evaluator.
   */
  private unary(): Expression {
    if (this.match(TokenType.MINUS)) {
      const operand = this.unary();
      // Transform -x into (-1) * x
      return binaryOp("*", numberLiteral(-1), operand);
    }

    return this.primary();
  }

  /**
   * Parse primary expressions (highest precedence)
   *
   * - Number literals
   * - Special values ($current, $base)
   * - Function calls
   * - Namespaced identifiers and wildcards
   * - Parenthesized expressions
   */
  private primary(): Expression {
    // Number literal
    if (this.match(TokenType.NUMBER)) {
      const value = parseFloat(this.previous().value);
      return numberLiteral(value);
    }

    // Special value ($current, $base)
    if (this.match(TokenType.SPECIAL)) {
      const value = this.previous().value as "$current" | "$base";
      return specialValue(value);
    }

    // Function call
    if (this.check(TokenType.FUNCTION)) {
      return this.functionCall();
    }

    // Namespaced identifier or wildcard (trait.caution, skill.*)
    if (this.check(TokenType.IDENTIFIER)) {
      return this.namespaced();
    }

    // Parenthesized expression
    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.expect(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }

    throw new ParseError(
      `Expected expression, got '${this.current().value}'`,
      this.current(),
    );
  }

  /**
   * Parse a function call
   *
   * function = FUNCTION '(' (expression (',' expression)*)? ')'
   */
  private functionCall(): Expression {
    const name = this.expect(TokenType.FUNCTION, "Expected function name").value;
    this.expect(TokenType.LPAREN, "Expected '(' after function name");

    const args: Expression[] = [];

    // Parse arguments if not immediately closed
    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    this.expect(TokenType.RPAREN, "Expected ')' after function arguments");

    return functionCall(name, args);
  }

  /**
   * Parse a namespaced identifier or wildcard
   *
   * namespaced = IDENTIFIER '.' (IDENTIFIER | '*')
   *
   * Examples:
   * - trait.caution  -> Identifier { namespace: "trait", name: "caution" }
   * - skill.*        -> Wildcard { namespace: "skill" }
   */
  private namespaced(): Expression {
    const namespace = this.expect(
      TokenType.IDENTIFIER,
      "Expected namespace identifier",
    ).value;

    // Check for wildcard (which is tokenized as a single .* token)
    if (this.match(TokenType.WILDCARD)) {
      return wildcard(namespace);
    }

    // Regular namespaced identifier
    this.expect(TokenType.DOT, "Expected '.' after namespace");
    const name = this.expect(
      TokenType.IDENTIFIER,
      "Expected identifier after '.'",
    ).value;

    return identifier(namespace, name);
  }
}

/**
 * Parse an array of tokens into an AST
 *
 * @param tokens - Array of tokens from the lexer
 * @returns The parsed expression AST
 * @throws ParseError if parsing fails
 *
 * @example
 * ```ts
 * import { tokenize } from "./lexer.ts";
 * import { parse } from "./parser.ts";
 *
 * const tokens = tokenize("trait.caution * 0.5");
 * const ast = parse(tokens);
 * ```
 */
export function parse(tokens: Token[]): Expression {
  const parser = new Parser(tokens);
  return parser.parse();
}
