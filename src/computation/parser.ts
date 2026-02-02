/**
 * Parser for expressions.
 *
 * Converts tokens into an AST (Abstract Syntax Tree).
 *
 * @module
 */

import type { Token } from "./lexer.ts";
import type { Expression } from "./ast.ts";
import { tokenize } from "./lexer.ts";

/**
 * Parse an expression string into an AST.
 *
 * Grammar:
 * ```
 * expression  := comparison
 * comparison  := term (('>' | '>=' | '<' | '<=' | '==' | '!=') term)?
 * term        := factor (('+' | '-') factor)*
 * factor      := unary (('*' | '/') unary)*
 * unary       := '-' unary | primary
 * primary     := number | reference | function | '(' expression ')'
 * reference   := identifier '.' identifier
 * function    := identifier '(' args? ')'
 * args        := expression (',' expression)*
 * ```
 *
 * @param input - Expression string to parse
 * @returns AST root node
 *
 * @example
 * ```ts
 * const ast = parse("trait.caution * 0.5 + 10");
 * const comparisonAst = parse("trait.caution > 50");
 * ```
 */
export function parse(input: string): Expression {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  return parser.parse();
}

class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Expression {
    const expr = this.expression();
    if (this.peek().type !== "eof") {
      throw new Error(
        `Unexpected token '${this.peek().value}' at position ${this.peek().position}`
      );
    }
    return expr;
  }

  private expression(): Expression {
    return this.comparison();
  }

  private comparison(): Expression {
    let left = this.additive();

    if (
      this.match("gt", "gte", "lt", "lte", "eq", "neq")
    ) {
      const tokenType = this.previous().type;
      let operator: ">" | ">=" | "<" | "<=" | "==" | "!=";
      switch (tokenType) {
        case "gt":
          operator = ">";
          break;
        case "gte":
          operator = ">=";
          break;
        case "lt":
          operator = "<";
          break;
        case "lte":
          operator = "<=";
          break;
        case "eq":
          operator = "==";
          break;
        case "neq":
          operator = "!=";
          break;
        default:
          throw new Error(`Unknown comparison operator: ${tokenType}`);
      }

      const right = this.additive();
      left = {
        type: "binary",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  private additive(): Expression {
    let left = this.term();

    while (this.match("plus", "minus")) {
      const operator = this.previous().type === "plus" ? "+" : "-";
      const right = this.term();
      left = {
        type: "binary",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  private term(): Expression {
    let left = this.factor();

    while (this.match("star", "slash")) {
      const operator = this.previous().type === "star" ? "*" : "/";
      const right = this.factor();
      left = {
        type: "binary",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  private factor(): Expression {
    // Unary minus
    if (this.match("minus")) {
      const operand = this.factor();
      return {
        type: "unary",
        operator: "-",
        operand,
      };
    }

    return this.primary();
  }

  private primary(): Expression {
    // Number literal
    if (this.match("number")) {
      return {
        type: "number",
        value: this.previous().value as number,
      };
    }

    // Reference or function
    if (this.match("identifier")) {
      const first = this.previous().value as string;

      // Function call: identifier(args)
      if (this.match("lparen")) {
        const args: Expression[] = [];

        // Parse arguments
        if (!this.check("rparen")) {
          do {
            args.push(this.expression());
          } while (this.match("comma"));
        }

        if (!this.match("rparen")) {
          throw new Error(
            `Expected ')' after function arguments at position ${this.peek().position}`
          );
        }

        return {
          type: "function",
          name: first,
          args,
        };
      }

      // Reference: category.name
      if (this.match("dot")) {
        if (!this.match("identifier")) {
          throw new Error(
            `Expected identifier after '.' at position ${this.peek().position}`
          );
        }
        const second = this.previous().value as string;

        return {
          type: "reference",
          category: first,
          name: second,
        };
      }

      // Just an identifier - treat as a reference with no category (shouldn't happen in valid expressions)
      throw new Error(
        `Invalid reference '${first}' at position ${this.previous().position}. Expected format: category.name`
      );
    }

    // Parenthesized expression
    if (this.match("lparen")) {
      const expr = this.expression();
      if (!this.match("rparen")) {
        throw new Error(
          `Expected ')' at position ${this.peek().position}`
        );
      }
      return expr;
    }

    throw new Error(
      `Unexpected token '${this.peek().value}' at position ${this.peek().position}`
    );
  }

  private match(...types: Token["type"][]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: Token["type"]): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "eof";
  }

  private peek(): Token {
    const token = this.tokens[this.current];
    if (!token) {
      throw new Error("Unexpected end of tokens");
    }
    return token;
  }

  private previous(): Token {
    const token = this.tokens[this.current - 1];
    if (!token) {
      throw new Error("No previous token");
    }
    return token;
  }
}
