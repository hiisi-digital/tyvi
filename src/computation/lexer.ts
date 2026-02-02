/**
 * Lexer for expression tokenization.
 *
 * Converts expression strings into tokens for parsing.
 *
 * @module
 */

/**
 * Token types.
 */
export type TokenType =
  | "number"
  | "identifier"
  | "dot"
  | "plus"
  | "minus"
  | "star"
  | "slash"
  | "lparen"
  | "rparen"
  | "comma"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "eq"
  | "neq"
  | "eof";

/**
 * A single token.
 */
export interface Token {
  type: TokenType;
  value: string | number;
  position: number;
}

/**
 * Tokenize an expression string.
 *
 * @param input - Expression string to tokenize
 * @returns Array of tokens
 *
 * @example
 * ```ts
 * const tokens = tokenize("trait.caution * 0.5");
 * // [
 * //   { type: "identifier", value: "trait", position: 0 },
 * //   { type: "dot", value: ".", position: 5 },
 * //   { type: "identifier", value: "caution", position: 6 },
 * //   { type: "star", value: "*", position: 14 },
 * //   { type: "number", value: 0.5, position: 16 }
 * // ]
 * ```
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];
    if (char === undefined) break;

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers (integer or decimal)
    if (/\d/.test(char)) {
      let num = "";
      const start = i;
      while (i < input.length) {
        const nextChar = input[i];
        if (nextChar === undefined || !/[\d.]/.test(nextChar)) break;
        num += nextChar;
        i++;
      }
      tokens.push({
        type: "number",
        value: parseFloat(num),
        position: start,
      });
      continue;
    }

    // Identifiers (trait, skill, exp, stack, function names, value names)
    if (/[a-zA-Z_-]/.test(char)) {
      let id = "";
      const start = i;
      while (i < input.length) {
        const nextChar = input[i];
        if (nextChar === undefined || !/[a-zA-Z0-9_-]/.test(nextChar)) break;
        id += nextChar;
        i++;
      }
      tokens.push({
        type: "identifier",
        value: id,
        position: start,
      });
      continue;
    }

    // Single character tokens
    const start = i;
    switch (char) {
      case ".":
        tokens.push({ type: "dot", value: ".", position: start });
        i++;
        break;
      case "+":
        tokens.push({ type: "plus", value: "+", position: start });
        i++;
        break;
      case "-":
        tokens.push({ type: "minus", value: "-", position: start });
        i++;
        break;
      case "*":
        tokens.push({ type: "star", value: "*", position: start });
        i++;
        break;
      case "/":
        tokens.push({ type: "slash", value: "/", position: start });
        i++;
        break;
      case "(":
        tokens.push({ type: "lparen", value: "(", position: start });
        i++;
        break;
      case ")":
        tokens.push({ type: "rparen", value: ")", position: start });
        i++;
        break;
      case ",":
        tokens.push({ type: "comma", value: ",", position: start });
        i++;
        break;
      case ">":
        if (input[i + 1] === "=") {
          tokens.push({ type: "gte", value: ">=", position: start });
          i += 2;
        } else {
          tokens.push({ type: "gt", value: ">", position: start });
          i++;
        }
        break;
      case "<":
        if (input[i + 1] === "=") {
          tokens.push({ type: "lte", value: "<=", position: start });
          i += 2;
        } else {
          tokens.push({ type: "lt", value: "<", position: start });
          i++;
        }
        break;
      case "=":
        if (input[i + 1] === "=") {
          tokens.push({ type: "eq", value: "==", position: start });
          i += 2;
        } else {
          throw new Error(
            `Unexpected character '${char}' at position ${start} in expression: ${input}. Did you mean '=='?`
          );
        }
        break;
      case "!":
        if (input[i + 1] === "=") {
          tokens.push({ type: "neq", value: "!=", position: start });
          i += 2;
        } else {
          throw new Error(
            `Unexpected character '${char}' at position ${start} in expression: ${input}`
          );
        }
        break;
      default:
        throw new Error(
          `Unexpected character '${char}' at position ${start} in expression: ${input}`
        );
    }
  }

  tokens.push({ type: "eof", value: "", position: i });
  return tokens;
}
