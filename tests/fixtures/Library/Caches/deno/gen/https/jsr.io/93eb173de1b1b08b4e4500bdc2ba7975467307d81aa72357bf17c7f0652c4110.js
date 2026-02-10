// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
import { deepMerge } from "jsr:@std/collections@^1.1.3/deep-merge";
/**
 * Copy of `import { isLeap } from "@std/datetime";` because it cannot be impoted as long as it is unstable.
 */ function isLeap(yearNumber) {
  return yearNumber % 4 === 0 && yearNumber % 100 !== 0 || yearNumber % 400 === 0;
}
export class Scanner {
  #whitespace = /[ \t]/;
  #position = 0;
  #source;
  constructor(source) {
    this.#source = source;
  }
  get position() {
    return this.#position;
  }
  get source() {
    return this.#source;
  }
  /**
   * Get current character
   * @param index - relative index from current position
   */ char(index = 0) {
    return this.#source[this.#position + index] ?? "";
  }
  /**
   * Get sliced string
   * @param start - start position relative from current position
   * @param end - end position relative from current position
   */ slice(start, end) {
    return this.#source.slice(this.#position + start, this.#position + end);
  }
  /**
   * Move position to next
   */ next(count = 1) {
    this.#position += count;
  }
  skipWhitespaces() {
    while (this.#whitespace.test(this.char()) && !this.eof()) {
      this.next();
    }
    // Invalid if current char is other kinds of whitespace
    if (!this.isCurrentCharEOL() && /\s/.test(this.char())) {
      const escaped = "\\u" + this.char().charCodeAt(0).toString(16);
      const position = this.#position;
      throw new SyntaxError(
        `Cannot parse the TOML: It contains invalid whitespace at position '${position}': \`${escaped}\``,
      );
    }
  }
  nextUntilChar(options = {
    skipComments: true,
  }) {
    while (!this.eof()) {
      const char = this.char();
      if (this.#whitespace.test(char) || this.isCurrentCharEOL()) {
        this.next();
      } else if (options.skipComments && this.char() === "#") {
        // entering comment
        while (!this.isCurrentCharEOL() && !this.eof()) {
          this.next();
        }
      } else {
        break;
      }
    }
  }
  /**
   * Position reached EOF or not
   */ eof() {
    return this.#position >= this.#source.length;
  }
  isCurrentCharEOL() {
    return this.char() === "\n" || this.startsWith("\r\n");
  }
  startsWith(searchString) {
    return this.#source.startsWith(searchString, this.#position);
  }
  match(regExp) {
    if (!regExp.sticky) {
      throw new Error(`RegExp ${regExp} does not have a sticky 'y' flag`);
    }
    regExp.lastIndex = this.#position;
    return this.#source.match(regExp);
  }
}
// -----------------------
// Utilities
// -----------------------
function success(body) {
  return {
    ok: true,
    body,
  };
}
function failure() {
  return {
    ok: false,
  };
}
/**
 * Creates a nested object from the keys and values.
 *
 * e.g. `unflat(["a", "b", "c"], 1)` returns `{ a: { b: { c: 1 } } }`
 */ export function unflat(keys, values = {
  __proto__: null,
}) {
  return keys.reduceRight((acc, key) => ({
    [key]: acc,
  }), values);
}
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function getTargetValue(target, keys) {
  const key = keys[0];
  if (!key) {
    throw new Error("Cannot parse the TOML: key length is not a positive number");
  }
  return target[key];
}
function deepAssignTable(target, table) {
  const { keys, type, value } = table;
  const currentValue = getTargetValue(target, keys);
  if (currentValue === undefined) {
    return Object.assign(target, unflat(keys, value));
  }
  if (Array.isArray(currentValue)) {
    const last = currentValue.at(-1);
    deepAssign(last, {
      type,
      keys: keys.slice(1),
      value,
    });
    return target;
  }
  if (isObject(currentValue)) {
    deepAssign(currentValue, {
      type,
      keys: keys.slice(1),
      value,
    });
    return target;
  }
  throw new Error("Unexpected assign");
}
function deepAssignTableArray(target, table) {
  const { type, keys, value } = table;
  const currentValue = getTargetValue(target, keys);
  if (currentValue === undefined) {
    return Object.assign(
      target,
      unflat(keys, [
        value,
      ]),
    );
  }
  if (Array.isArray(currentValue)) {
    if (table.keys.length === 1) {
      currentValue.push(value);
    } else {
      const last = currentValue.at(-1);
      deepAssign(last, {
        type: table.type,
        keys: table.keys.slice(1),
        value: table.value,
      });
    }
    return target;
  }
  if (isObject(currentValue)) {
    deepAssign(currentValue, {
      type,
      keys: keys.slice(1),
      value,
    });
    return target;
  }
  throw new Error("Unexpected assign");
}
export function deepAssign(target, body) {
  switch (body.type) {
    case "Block":
      return deepMerge(target, body.value);
    case "Table":
      return deepAssignTable(target, body);
    case "TableArray":
      return deepAssignTableArray(target, body);
  }
}
// ---------------------------------
// Parser combinators and generators
// ---------------------------------
// deno-lint-ignore no-explicit-any
function or(parsers) {
  return (scanner) => {
    for (const parse of parsers) {
      const result = parse(scanner);
      if (result.ok) return result;
    }
    return failure();
  };
}
/** Join the parse results of the given parser into an array.
 *
 * If the parser fails at the first attempt, it will return an empty array.
 */ function join(parser, separator) {
  const Separator = character(separator);
  return (scanner) => {
    const out = [];
    const first = parser(scanner);
    if (!first.ok) return success(out);
    out.push(first.body);
    while (!scanner.eof()) {
      if (!Separator(scanner).ok) break;
      const result = parser(scanner);
      if (!result.ok) {
        throw new SyntaxError(`Invalid token after "${separator}"`);
      }
      out.push(result.body);
    }
    return success(out);
  };
}
/** Join the parse results of the given parser into an array.
 *
 * This requires the parser to succeed at least once.
 */ function join1(parser, separator) {
  const Separator = character(separator);
  return (scanner) => {
    const first = parser(scanner);
    if (!first.ok) return failure();
    const out = [
      first.body,
    ];
    while (!scanner.eof()) {
      if (!Separator(scanner).ok) break;
      const result = parser(scanner);
      if (!result.ok) {
        throw new SyntaxError(`Invalid token after "${separator}"`);
      }
      out.push(result.body);
    }
    return success(out);
  };
}
function kv(keyParser, separator, valueParser) {
  const Separator = character(separator);
  return (scanner) => {
    const position = scanner.position;
    const key = keyParser(scanner);
    if (!key.ok) return failure();
    const sep = Separator(scanner);
    if (!sep.ok) {
      throw new SyntaxError(`key/value pair doesn't have "${separator}"`);
    }
    const value = valueParser(scanner);
    if (!value.ok) {
      const lineEndIndex = scanner.source.indexOf("\n", scanner.position);
      const endPosition = lineEndIndex > 0 ? lineEndIndex : scanner.source.length;
      const line = scanner.source.slice(position, endPosition);
      throw new SyntaxError(`Cannot parse value on line '${line}'`);
    }
    return success(unflat(key.body, value.body));
  };
}
function merge(parser) {
  return (scanner) => {
    const result = parser(scanner);
    if (!result.ok) return failure();
    let body = {
      __proto__: null,
    };
    for (const record of result.body) {
      if (typeof record === "object" && record !== null) {
        body = deepMerge(body, record);
      }
    }
    return success(body);
  };
}
function repeat(parser) {
  return (scanner) => {
    const body = [];
    while (!scanner.eof()) {
      const result = parser(scanner);
      if (!result.ok) break;
      body.push(result.body);
      scanner.nextUntilChar();
    }
    if (body.length === 0) return failure();
    return success(body);
  };
}
function surround(left, parser, right) {
  const Left = character(left);
  const Right = character(right);
  return (scanner) => {
    if (!Left(scanner).ok) {
      return failure();
    }
    const result = parser(scanner);
    if (!result.ok) {
      throw new SyntaxError(`Invalid token after "${left}"`);
    }
    if (!Right(scanner).ok) {
      throw new SyntaxError(`Not closed by "${right}" after started with "${left}"`);
    }
    return success(result.body);
  };
}
function character(str) {
  return (scanner) => {
    scanner.skipWhitespaces();
    if (!scanner.startsWith(str)) return failure();
    scanner.next(str.length);
    scanner.skipWhitespaces();
    return success(undefined);
  };
}
// -----------------------
// Parser components
// -----------------------
const BARE_KEY_REGEXP = /[A-Za-z0-9_-]+/y;
export function bareKey(scanner) {
  scanner.skipWhitespaces();
  const key = scanner.match(BARE_KEY_REGEXP)?.[0];
  if (!key) return failure();
  scanner.next(key.length);
  return success(key);
}
function escapeSequence(scanner) {
  if (scanner.char() !== "\\") return failure();
  scanner.next();
  // See https://toml.io/en/v1.0.0-rc.3#string
  switch (scanner.char()) {
    case "b":
      scanner.next();
      return success("\b");
    case "t":
      scanner.next();
      return success("\t");
    case "n":
      scanner.next();
      return success("\n");
    case "f":
      scanner.next();
      return success("\f");
    case "r":
      scanner.next();
      return success("\r");
    case "u":
    case "U": {
      // Unicode character
      const codePointLen = scanner.char() === "u" ? 4 : 6;
      const codePoint = parseInt("0x" + scanner.slice(1, 1 + codePointLen), 16);
      const str = String.fromCodePoint(codePoint);
      scanner.next(codePointLen + 1);
      return success(str);
    }
    case '"':
      scanner.next();
      return success('"');
    case "\\":
      scanner.next();
      return success("\\");
    default:
      throw new SyntaxError(`Invalid escape sequence: \\${scanner.char()}`);
  }
}
export function basicString(scanner) {
  scanner.skipWhitespaces();
  if (scanner.char() !== '"') return failure();
  scanner.next();
  const acc = [];
  while (scanner.char() !== '"' && !scanner.eof()) {
    if (scanner.char() === "\n") {
      throw new SyntaxError("Single-line string cannot contain EOL");
    }
    const escapedChar = escapeSequence(scanner);
    if (escapedChar.ok) {
      acc.push(escapedChar.body);
    } else {
      acc.push(scanner.char());
      scanner.next();
    }
  }
  if (scanner.eof()) {
    throw new SyntaxError(`Single-line string is not closed:\n${acc.join("")}`);
  }
  scanner.next(); // skip last '""
  return success(acc.join(""));
}
export function literalString(scanner) {
  scanner.skipWhitespaces();
  if (scanner.char() !== "'") return failure();
  scanner.next();
  const acc = [];
  while (scanner.char() !== "'" && !scanner.eof()) {
    if (scanner.char() === "\n") {
      throw new SyntaxError("Single-line string cannot contain EOL");
    }
    acc.push(scanner.char());
    scanner.next();
  }
  if (scanner.eof()) {
    throw new SyntaxError(`Single-line string is not closed:\n${acc.join("")}`);
  }
  scanner.next(); // skip last "'"
  return success(acc.join(""));
}
export function multilineBasicString(scanner) {
  scanner.skipWhitespaces();
  if (!scanner.startsWith('"""')) return failure();
  scanner.next(3);
  if (scanner.char() === "\n") {
    // The first newline (LF) is trimmed
    scanner.next();
  } else if (scanner.startsWith("\r\n")) {
    // The first newline (CRLF) is trimmed
    scanner.next(2);
  }
  const acc = [];
  while (!scanner.startsWith('"""') && !scanner.eof()) {
    // line ending backslash
    if (scanner.startsWith("\\\n")) {
      scanner.next();
      scanner.nextUntilChar({
        skipComments: false,
      });
      continue;
    } else if (scanner.startsWith("\\\r\n")) {
      scanner.next();
      scanner.nextUntilChar({
        skipComments: false,
      });
      continue;
    }
    const escapedChar = escapeSequence(scanner);
    if (escapedChar.ok) {
      acc.push(escapedChar.body);
    } else {
      acc.push(scanner.char());
      scanner.next();
    }
  }
  if (scanner.eof()) {
    throw new SyntaxError(`Multi-line string is not closed:\n${acc.join("")}`);
  }
  // if ends with 4 `"`, push the fist `"` to string
  if (scanner.char(3) === '"') {
    acc.push('"');
    scanner.next();
  }
  scanner.next(3); // skip last '""""
  return success(acc.join(""));
}
export function multilineLiteralString(scanner) {
  scanner.skipWhitespaces();
  if (!scanner.startsWith("'''")) return failure();
  scanner.next(3);
  if (scanner.char() === "\n") {
    // The first newline (LF) is trimmed
    scanner.next();
  } else if (scanner.startsWith("\r\n")) {
    // The first newline (CRLF) is trimmed
    scanner.next(2);
  }
  const acc = [];
  while (!scanner.startsWith("'''") && !scanner.eof()) {
    acc.push(scanner.char());
    scanner.next();
  }
  if (scanner.eof()) {
    throw new SyntaxError(`Multi-line string is not closed:\n${acc.join("")}`);
  }
  // if ends with 4 `'`, push the fist `'` to string
  if (scanner.char(3) === "'") {
    acc.push("'");
    scanner.next();
  }
  scanner.next(3); // skip last "'''"
  return success(acc.join(""));
}
const BOOLEAN_REGEXP = /(?:true|false)\b/y;
export function boolean(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(BOOLEAN_REGEXP);
  if (!match) return failure();
  const string = match[0];
  scanner.next(string.length);
  const value = string === "true";
  return success(value);
}
const INFINITY_MAP = new Map([
  [
    "inf",
    Infinity,
  ],
  [
    "+inf",
    Infinity,
  ],
  [
    "-inf",
    -Infinity,
  ],
]);
const INFINITY_REGEXP = /[+-]?inf\b/y;
export function infinity(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(INFINITY_REGEXP);
  if (!match) return failure();
  const string = match[0];
  scanner.next(string.length);
  const value = INFINITY_MAP.get(string);
  return success(value);
}
const NAN_REGEXP = /[+-]?nan\b/y;
export function nan(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(NAN_REGEXP);
  if (!match) return failure();
  const string = match[0];
  scanner.next(string.length);
  const value = NaN;
  return success(value);
}
export const dottedKey = join1(
  or([
    bareKey,
    basicString,
    literalString,
  ]),
  ".",
);
const BINARY_REGEXP = /0b[01]+(?:_[01]+)*\b/y;
export function binary(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(BINARY_REGEXP)?.[0];
  if (!match) return failure();
  scanner.next(match.length);
  const value = match.slice(2).replaceAll("_", "");
  const number = parseInt(value, 2);
  return isNaN(number) ? failure() : success(number);
}
const OCTAL_REGEXP = /0o[0-7]+(?:_[0-7]+)*\b/y;
export function octal(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(OCTAL_REGEXP)?.[0];
  if (!match) return failure();
  scanner.next(match.length);
  const value = match.slice(2).replaceAll("_", "");
  const number = parseInt(value, 8);
  return isNaN(number) ? failure() : success(number);
}
const HEX_REGEXP = /0x[0-9a-f]+(?:_[0-9a-f]+)*\b/yi;
export function hex(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(HEX_REGEXP)?.[0];
  if (!match) return failure();
  scanner.next(match.length);
  const value = match.slice(2).replaceAll("_", "");
  const number = parseInt(value, 16);
  return isNaN(number) ? failure() : success(number);
}
const INTEGER_REGEXP = /[+-]?(?:0|[1-9][0-9]*(?:_[0-9]+)*)\b/y;
export function integer(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(INTEGER_REGEXP)?.[0];
  if (!match) return failure();
  scanner.next(match.length);
  const value = match.replaceAll("_", "");
  const int = parseInt(value, 10);
  return success(int);
}
const FLOAT_REGEXP =
  /[+-]?(?:0|[1-9][0-9]*(?:_[0-9]+)*)(?:\.[0-9]+(?:_[0-9]+)*)?(?:e[+-]?[0-9]+(?:_[0-9]+)*)?\b/yi;
export function float(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(FLOAT_REGEXP)?.[0];
  if (!match) return failure();
  scanner.next(match.length);
  const value = match.replaceAll("_", "");
  const float = parseFloat(value);
  if (isNaN(float)) return failure();
  return success(float);
}
const DATE_TIME_REGEXP = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?:[ 0-9TZ.:+-]+)?\b/y;
export function dateTime(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(DATE_TIME_REGEXP);
  if (!match) return failure();
  const string = match[0];
  scanner.next(string.length);
  const groups = match.groups;
  // special case if month is February
  if (groups.month == "02") {
    const days = parseInt(groups.day);
    if (days > 29) {
      throw new SyntaxError(`Invalid date string "${match}"`);
    }
    const year = parseInt(groups.year);
    if (days > 28 && !isLeap(year)) {
      throw new SyntaxError(`Invalid date string "${match}"`);
    }
  }
  const date = new Date(string.trim());
  // invalid date
  if (isNaN(date.getTime())) {
    throw new SyntaxError(`Invalid date string "${match}"`);
  }
  return success(date);
}
const LOCAL_TIME_REGEXP = /(\d{2}):(\d{2}):(\d{2})(?:\.[0-9]+)?\b/y;
export function localTime(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(LOCAL_TIME_REGEXP)?.[0];
  if (!match) return failure();
  scanner.next(match.length);
  return success(match);
}
export function arrayValue(scanner) {
  scanner.skipWhitespaces();
  if (scanner.char() !== "[") return failure();
  scanner.next();
  const array = [];
  while (!scanner.eof()) {
    scanner.nextUntilChar();
    const result = value(scanner);
    if (!result.ok) break;
    array.push(result.body);
    scanner.skipWhitespaces();
    // may have a next item, but trailing comma is allowed at array
    if (scanner.char() !== ",") break;
    scanner.next();
  }
  scanner.nextUntilChar();
  if (scanner.char() !== "]") throw new SyntaxError("Array is not closed");
  scanner.next();
  return success(array);
}
export function inlineTable(scanner) {
  scanner.nextUntilChar();
  if (scanner.char(1) === "}") {
    scanner.next(2);
    return success({
      __proto__: null,
    });
  }
  const pairs = surround("{", join(pair, ","), "}")(scanner);
  if (!pairs.ok) return failure();
  let table = {
    __proto__: null,
  };
  for (const pair of pairs.body) {
    table = deepMerge(table, pair);
  }
  return success(table);
}
export const value = or([
  multilineBasicString,
  multilineLiteralString,
  basicString,
  literalString,
  boolean,
  infinity,
  nan,
  dateTime,
  localTime,
  binary,
  octal,
  hex,
  float,
  integer,
  arrayValue,
  inlineTable,
]);
export const pair = kv(dottedKey, "=", value);
export function block(scanner) {
  scanner.nextUntilChar();
  const result = merge(repeat(pair))(scanner);
  if (result.ok) {
    return success({
      type: "Block",
      value: result.body,
    });
  }
  return failure();
}
export const tableHeader = surround("[", dottedKey, "]");
export function table(scanner) {
  scanner.nextUntilChar();
  const header = tableHeader(scanner);
  if (!header.ok) return failure();
  scanner.nextUntilChar();
  const b = block(scanner);
  return success({
    type: "Table",
    keys: header.body,
    value: b.ok ? b.body.value : {
      __proto__: null,
    },
  });
}
export const tableArrayHeader = surround("[[", dottedKey, "]]");
export function tableArray(scanner) {
  scanner.nextUntilChar();
  const header = tableArrayHeader(scanner);
  if (!header.ok) return failure();
  scanner.nextUntilChar();
  const b = block(scanner);
  return success({
    type: "TableArray",
    keys: header.body,
    value: b.ok ? b.body.value : {
      __proto__: null,
    },
  });
}
export function toml(scanner) {
  const blocks = repeat(or([
    block,
    tableArray,
    table,
  ]))(scanner);
  if (!blocks.ok) {
    return success({
      __proto__: null,
    });
  }
  const body = blocks.body.reduce(deepAssign, {
    __proto__: null,
  });
  return success(body);
}
function createParseErrorMessage(scanner, message) {
  const string = scanner.source.slice(0, scanner.position);
  const lines = string.split("\n");
  const row = lines.length;
  const column = lines.at(-1)?.length ?? 0;
  return `Parse error on line ${row}, column ${column}: ${message}`;
}
export function parserFactory(parser) {
  return (tomlString) => {
    const scanner = new Scanner(tomlString);
    try {
      const result = parser(scanner);
      if (result.ok && scanner.eof()) return result.body;
      const message = `Unexpected character: "${scanner.char()}"`;
      throw new SyntaxError(createParseErrorMessage(scanner, message));
    } catch (error) {
      if (error instanceof Error) {
        throw new SyntaxError(createParseErrorMessage(scanner, error.message));
      }
      const message = "Invalid error type caught";
      throw new SyntaxError(createParseErrorMessage(scanner, message));
    }
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvdG9tbC8xLjAuMTEvX3BhcnNlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI1IHRoZSBEZW5vIGF1dGhvcnMuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBkZWVwTWVyZ2UgfSBmcm9tIFwianNyOkBzdGQvY29sbGVjdGlvbnNAXjEuMS4zL2RlZXAtbWVyZ2VcIjtcblxuLyoqXG4gKiBDb3B5IG9mIGBpbXBvcnQgeyBpc0xlYXAgfSBmcm9tIFwiQHN0ZC9kYXRldGltZVwiO2AgYmVjYXVzZSBpdCBjYW5ub3QgYmUgaW1wb3RlZCBhcyBsb25nIGFzIGl0IGlzIHVuc3RhYmxlLlxuICovXG5mdW5jdGlvbiBpc0xlYXAoeWVhck51bWJlcjogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgKHllYXJOdW1iZXIgJSA0ID09PSAwICYmIHllYXJOdW1iZXIgJSAxMDAgIT09IDApIHx8IHllYXJOdW1iZXIgJSA0MDAgPT09IDBcbiAgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBJbnRlcmZhY2VzIGFuZCBiYXNlIGNsYXNzZXNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5pbnRlcmZhY2UgU3VjY2VzczxUPiB7XG4gIG9rOiB0cnVlO1xuICBib2R5OiBUO1xufVxuaW50ZXJmYWNlIEZhaWx1cmUge1xuICBvazogZmFsc2U7XG59XG50eXBlIFBhcnNlUmVzdWx0PFQ+ID0gU3VjY2VzczxUPiB8IEZhaWx1cmU7XG5cbnR5cGUgUGFyc2VyQ29tcG9uZW50PFQgPSB1bmtub3duPiA9IChzY2FubmVyOiBTY2FubmVyKSA9PiBQYXJzZVJlc3VsdDxUPjtcblxudHlwZSBCbG9jayA9IHtcbiAgdHlwZTogXCJCbG9ja1wiO1xuICB2YWx1ZTogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59O1xudHlwZSBUYWJsZSA9IHtcbiAgdHlwZTogXCJUYWJsZVwiO1xuICBrZXlzOiBzdHJpbmdbXTtcbiAgdmFsdWU6IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xufTtcbnR5cGUgVGFibGVBcnJheSA9IHtcbiAgdHlwZTogXCJUYWJsZUFycmF5XCI7XG4gIGtleXM6IHN0cmluZ1tdO1xuICB2YWx1ZTogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59O1xuXG5leHBvcnQgY2xhc3MgU2Nhbm5lciB7XG4gICN3aGl0ZXNwYWNlID0gL1sgXFx0XS87XG4gICNwb3NpdGlvbiA9IDA7XG4gICNzb3VyY2U6IHN0cmluZztcblxuICBjb25zdHJ1Y3Rvcihzb3VyY2U6IHN0cmluZykge1xuICAgIHRoaXMuI3NvdXJjZSA9IHNvdXJjZTtcbiAgfVxuXG4gIGdldCBwb3NpdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy4jcG9zaXRpb247XG4gIH1cbiAgZ2V0IHNvdXJjZSgpIHtcbiAgICByZXR1cm4gdGhpcy4jc291cmNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjdXJyZW50IGNoYXJhY3RlclxuICAgKiBAcGFyYW0gaW5kZXggLSByZWxhdGl2ZSBpbmRleCBmcm9tIGN1cnJlbnQgcG9zaXRpb25cbiAgICovXG4gIGNoYXIoaW5kZXggPSAwKSB7XG4gICAgcmV0dXJuIHRoaXMuI3NvdXJjZVt0aGlzLiNwb3NpdGlvbiArIGluZGV4XSA/PyBcIlwiO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBzbGljZWQgc3RyaW5nXG4gICAqIEBwYXJhbSBzdGFydCAtIHN0YXJ0IHBvc2l0aW9uIHJlbGF0aXZlIGZyb20gY3VycmVudCBwb3NpdGlvblxuICAgKiBAcGFyYW0gZW5kIC0gZW5kIHBvc2l0aW9uIHJlbGF0aXZlIGZyb20gY3VycmVudCBwb3NpdGlvblxuICAgKi9cbiAgc2xpY2Uoc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLiNzb3VyY2Uuc2xpY2UodGhpcy4jcG9zaXRpb24gKyBzdGFydCwgdGhpcy4jcG9zaXRpb24gKyBlbmQpO1xuICB9XG5cbiAgLyoqXG4gICAqIE1vdmUgcG9zaXRpb24gdG8gbmV4dFxuICAgKi9cbiAgbmV4dChjb3VudDogbnVtYmVyID0gMSkge1xuICAgIHRoaXMuI3Bvc2l0aW9uICs9IGNvdW50O1xuICB9XG5cbiAgc2tpcFdoaXRlc3BhY2VzKCkge1xuICAgIHdoaWxlICh0aGlzLiN3aGl0ZXNwYWNlLnRlc3QodGhpcy5jaGFyKCkpICYmICF0aGlzLmVvZigpKSB7XG4gICAgICB0aGlzLm5leHQoKTtcbiAgICB9XG4gICAgLy8gSW52YWxpZCBpZiBjdXJyZW50IGNoYXIgaXMgb3RoZXIga2luZHMgb2Ygd2hpdGVzcGFjZVxuICAgIGlmICghdGhpcy5pc0N1cnJlbnRDaGFyRU9MKCkgJiYgL1xccy8udGVzdCh0aGlzLmNoYXIoKSkpIHtcbiAgICAgIGNvbnN0IGVzY2FwZWQgPSBcIlxcXFx1XCIgKyB0aGlzLmNoYXIoKS5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KTtcbiAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy4jcG9zaXRpb247XG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgIGBDYW5ub3QgcGFyc2UgdGhlIFRPTUw6IEl0IGNvbnRhaW5zIGludmFsaWQgd2hpdGVzcGFjZSBhdCBwb3NpdGlvbiAnJHtwb3NpdGlvbn0nOiBcXGAke2VzY2FwZWR9XFxgYCxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgbmV4dFVudGlsQ2hhcihvcHRpb25zOiB7IHNraXBDb21tZW50cz86IGJvb2xlYW4gfSA9IHsgc2tpcENvbW1lbnRzOiB0cnVlIH0pIHtcbiAgICB3aGlsZSAoIXRoaXMuZW9mKCkpIHtcbiAgICAgIGNvbnN0IGNoYXIgPSB0aGlzLmNoYXIoKTtcbiAgICAgIGlmICh0aGlzLiN3aGl0ZXNwYWNlLnRlc3QoY2hhcikgfHwgdGhpcy5pc0N1cnJlbnRDaGFyRU9MKCkpIHtcbiAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuc2tpcENvbW1lbnRzICYmIHRoaXMuY2hhcigpID09PSBcIiNcIikge1xuICAgICAgICAvLyBlbnRlcmluZyBjb21tZW50XG4gICAgICAgIHdoaWxlICghdGhpcy5pc0N1cnJlbnRDaGFyRU9MKCkgJiYgIXRoaXMuZW9mKCkpIHtcbiAgICAgICAgICB0aGlzLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBvc2l0aW9uIHJlYWNoZWQgRU9GIG9yIG5vdFxuICAgKi9cbiAgZW9mKCkge1xuICAgIHJldHVybiB0aGlzLiNwb3NpdGlvbiA+PSB0aGlzLiNzb3VyY2UubGVuZ3RoO1xuICB9XG5cbiAgaXNDdXJyZW50Q2hhckVPTCgpIHtcbiAgICByZXR1cm4gdGhpcy5jaGFyKCkgPT09IFwiXFxuXCIgfHwgdGhpcy5zdGFydHNXaXRoKFwiXFxyXFxuXCIpO1xuICB9XG5cbiAgc3RhcnRzV2l0aChzZWFyY2hTdHJpbmc6IHN0cmluZykge1xuICAgIHJldHVybiB0aGlzLiNzb3VyY2Uuc3RhcnRzV2l0aChzZWFyY2hTdHJpbmcsIHRoaXMuI3Bvc2l0aW9uKTtcbiAgfVxuXG4gIG1hdGNoKHJlZ0V4cDogUmVnRXhwKSB7XG4gICAgaWYgKCFyZWdFeHAuc3RpY2t5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlZ0V4cCAke3JlZ0V4cH0gZG9lcyBub3QgaGF2ZSBhIHN0aWNreSAneScgZmxhZ2ApO1xuICAgIH1cbiAgICByZWdFeHAubGFzdEluZGV4ID0gdGhpcy4jcG9zaXRpb247XG4gICAgcmV0dXJuIHRoaXMuI3NvdXJjZS5tYXRjaChyZWdFeHApO1xuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBVdGlsaXRpZXNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIHN1Y2Nlc3M8VD4oYm9keTogVCk6IFN1Y2Nlc3M8VD4ge1xuICByZXR1cm4geyBvazogdHJ1ZSwgYm9keSB9O1xufVxuZnVuY3Rpb24gZmFpbHVyZSgpOiBGYWlsdXJlIHtcbiAgcmV0dXJuIHsgb2s6IGZhbHNlIH07XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5lc3RlZCBvYmplY3QgZnJvbSB0aGUga2V5cyBhbmQgdmFsdWVzLlxuICpcbiAqIGUuZy4gYHVuZmxhdChbXCJhXCIsIFwiYlwiLCBcImNcIl0sIDEpYCByZXR1cm5zIGB7IGE6IHsgYjogeyBjOiAxIH0gfSB9YFxuICovXG5leHBvcnQgZnVuY3Rpb24gdW5mbGF0KFxuICBrZXlzOiBzdHJpbmdbXSxcbiAgdmFsdWVzOiB1bmtub3duID0geyBfX3Byb3RvX186IG51bGwgfSxcbik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgcmV0dXJuIGtleXMucmVkdWNlUmlnaHQoXG4gICAgKGFjYywga2V5KSA9PiAoeyBba2V5XTogYWNjIH0pLFxuICAgIHZhbHVlcyxcbiAgKSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgdmFsdWUgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldFRhcmdldFZhbHVlKHRhcmdldDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIGtleXM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGtleSA9IGtleXNbMF07XG4gIGlmICgha2V5KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJDYW5ub3QgcGFyc2UgdGhlIFRPTUw6IGtleSBsZW5ndGggaXMgbm90IGEgcG9zaXRpdmUgbnVtYmVyXCIsXG4gICAgKTtcbiAgfVxuICByZXR1cm4gdGFyZ2V0W2tleV07XG59XG5cbmZ1bmN0aW9uIGRlZXBBc3NpZ25UYWJsZShcbiAgdGFyZ2V0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgdGFibGU6IFRhYmxlLFxuKSB7XG4gIGNvbnN0IHsga2V5cywgdHlwZSwgdmFsdWUgfSA9IHRhYmxlO1xuICBjb25zdCBjdXJyZW50VmFsdWUgPSBnZXRUYXJnZXRWYWx1ZSh0YXJnZXQsIGtleXMpO1xuXG4gIGlmIChjdXJyZW50VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHRhcmdldCwgdW5mbGF0KGtleXMsIHZhbHVlKSk7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkoY3VycmVudFZhbHVlKSkge1xuICAgIGNvbnN0IGxhc3QgPSBjdXJyZW50VmFsdWUuYXQoLTEpO1xuICAgIGRlZXBBc3NpZ24obGFzdCwgeyB0eXBlLCBrZXlzOiBrZXlzLnNsaWNlKDEpLCB2YWx1ZSB9KTtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG4gIGlmIChpc09iamVjdChjdXJyZW50VmFsdWUpKSB7XG4gICAgZGVlcEFzc2lnbihjdXJyZW50VmFsdWUsIHsgdHlwZSwga2V5czoga2V5cy5zbGljZSgxKSwgdmFsdWUgfSk7XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJVbmV4cGVjdGVkIGFzc2lnblwiKTtcbn1cblxuZnVuY3Rpb24gZGVlcEFzc2lnblRhYmxlQXJyYXkoXG4gIHRhcmdldDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIHRhYmxlOiBUYWJsZUFycmF5LFxuKSB7XG4gIGNvbnN0IHsgdHlwZSwga2V5cywgdmFsdWUgfSA9IHRhYmxlO1xuICBjb25zdCBjdXJyZW50VmFsdWUgPSBnZXRUYXJnZXRWYWx1ZSh0YXJnZXQsIGtleXMpO1xuXG4gIGlmIChjdXJyZW50VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHRhcmdldCwgdW5mbGF0KGtleXMsIFt2YWx1ZV0pKTtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheShjdXJyZW50VmFsdWUpKSB7XG4gICAgaWYgKHRhYmxlLmtleXMubGVuZ3RoID09PSAxKSB7XG4gICAgICBjdXJyZW50VmFsdWUucHVzaCh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGxhc3QgPSBjdXJyZW50VmFsdWUuYXQoLTEpO1xuICAgICAgZGVlcEFzc2lnbihsYXN0LCB7XG4gICAgICAgIHR5cGU6IHRhYmxlLnR5cGUsXG4gICAgICAgIGtleXM6IHRhYmxlLmtleXMuc2xpY2UoMSksXG4gICAgICAgIHZhbHVlOiB0YWJsZS52YWx1ZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG4gIGlmIChpc09iamVjdChjdXJyZW50VmFsdWUpKSB7XG4gICAgZGVlcEFzc2lnbihjdXJyZW50VmFsdWUsIHsgdHlwZSwga2V5czoga2V5cy5zbGljZSgxKSwgdmFsdWUgfSk7XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJVbmV4cGVjdGVkIGFzc2lnblwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZXBBc3NpZ24oXG4gIHRhcmdldDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGJvZHk6IEJsb2NrIHwgVGFibGUgfCBUYWJsZUFycmF5LFxuKSB7XG4gIHN3aXRjaCAoYm9keS50eXBlKSB7XG4gICAgY2FzZSBcIkJsb2NrXCI6XG4gICAgICByZXR1cm4gZGVlcE1lcmdlKHRhcmdldCwgYm9keS52YWx1ZSk7XG4gICAgY2FzZSBcIlRhYmxlXCI6XG4gICAgICByZXR1cm4gZGVlcEFzc2lnblRhYmxlKHRhcmdldCwgYm9keSk7XG4gICAgY2FzZSBcIlRhYmxlQXJyYXlcIjpcbiAgICAgIHJldHVybiBkZWVwQXNzaWduVGFibGVBcnJheSh0YXJnZXQsIGJvZHkpO1xuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUGFyc2VyIGNvbWJpbmF0b3JzIGFuZCBnZW5lcmF0b3JzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbmZ1bmN0aW9uIG9yPFQgZXh0ZW5kcyByZWFkb25seSBQYXJzZXJDb21wb25lbnQ8YW55PltdPihcbiAgcGFyc2VyczogVCxcbik6IFBhcnNlckNvbXBvbmVudDxcbiAgUmV0dXJuVHlwZTxUW251bWJlcl0+IGV4dGVuZHMgUGFyc2VSZXN1bHQ8aW5mZXIgUj4gPyBSIDogRmFpbHVyZVxuPiB7XG4gIHJldHVybiAoc2Nhbm5lcjogU2Nhbm5lcikgPT4ge1xuICAgIGZvciAoY29uc3QgcGFyc2Ugb2YgcGFyc2Vycykge1xuICAgICAgY29uc3QgcmVzdWx0ID0gcGFyc2Uoc2Nhbm5lcik7XG4gICAgICBpZiAocmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICByZXR1cm4gZmFpbHVyZSgpO1xuICB9O1xufVxuXG4vKiogSm9pbiB0aGUgcGFyc2UgcmVzdWx0cyBvZiB0aGUgZ2l2ZW4gcGFyc2VyIGludG8gYW4gYXJyYXkuXG4gKlxuICogSWYgdGhlIHBhcnNlciBmYWlscyBhdCB0aGUgZmlyc3QgYXR0ZW1wdCwgaXQgd2lsbCByZXR1cm4gYW4gZW1wdHkgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIGpvaW48VD4oXG4gIHBhcnNlcjogUGFyc2VyQ29tcG9uZW50PFQ+LFxuICBzZXBhcmF0b3I6IHN0cmluZyxcbik6IFBhcnNlckNvbXBvbmVudDxUW10+IHtcbiAgY29uc3QgU2VwYXJhdG9yID0gY2hhcmFjdGVyKHNlcGFyYXRvcik7XG4gIHJldHVybiAoc2Nhbm5lcjogU2Nhbm5lcik6IFBhcnNlUmVzdWx0PFRbXT4gPT4ge1xuICAgIGNvbnN0IG91dDogVFtdID0gW107XG4gICAgY29uc3QgZmlyc3QgPSBwYXJzZXIoc2Nhbm5lcik7XG4gICAgaWYgKCFmaXJzdC5vaykgcmV0dXJuIHN1Y2Nlc3Mob3V0KTtcbiAgICBvdXQucHVzaChmaXJzdC5ib2R5KTtcbiAgICB3aGlsZSAoIXNjYW5uZXIuZW9mKCkpIHtcbiAgICAgIGlmICghU2VwYXJhdG9yKHNjYW5uZXIpLm9rKSBicmVhaztcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHBhcnNlcihzY2FubmVyKTtcbiAgICAgIGlmICghcmVzdWx0Lm9rKSB7XG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihgSW52YWxpZCB0b2tlbiBhZnRlciBcIiR7c2VwYXJhdG9yfVwiYCk7XG4gICAgICB9XG4gICAgICBvdXQucHVzaChyZXN1bHQuYm9keSk7XG4gICAgfVxuICAgIHJldHVybiBzdWNjZXNzKG91dCk7XG4gIH07XG59XG5cbi8qKiBKb2luIHRoZSBwYXJzZSByZXN1bHRzIG9mIHRoZSBnaXZlbiBwYXJzZXIgaW50byBhbiBhcnJheS5cbiAqXG4gKiBUaGlzIHJlcXVpcmVzIHRoZSBwYXJzZXIgdG8gc3VjY2VlZCBhdCBsZWFzdCBvbmNlLlxuICovXG5mdW5jdGlvbiBqb2luMTxUPihcbiAgcGFyc2VyOiBQYXJzZXJDb21wb25lbnQ8VD4sXG4gIHNlcGFyYXRvcjogc3RyaW5nLFxuKTogUGFyc2VyQ29tcG9uZW50PFRbXT4ge1xuICBjb25zdCBTZXBhcmF0b3IgPSBjaGFyYWN0ZXIoc2VwYXJhdG9yKTtcbiAgcmV0dXJuIChzY2FubmVyOiBTY2FubmVyKTogUGFyc2VSZXN1bHQ8VFtdPiA9PiB7XG4gICAgY29uc3QgZmlyc3QgPSBwYXJzZXIoc2Nhbm5lcik7XG4gICAgaWYgKCFmaXJzdC5vaykgcmV0dXJuIGZhaWx1cmUoKTtcbiAgICBjb25zdCBvdXQ6IFRbXSA9IFtmaXJzdC5ib2R5XTtcbiAgICB3aGlsZSAoIXNjYW5uZXIuZW9mKCkpIHtcbiAgICAgIGlmICghU2VwYXJhdG9yKHNjYW5uZXIpLm9rKSBicmVhaztcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHBhcnNlcihzY2FubmVyKTtcbiAgICAgIGlmICghcmVzdWx0Lm9rKSB7XG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihgSW52YWxpZCB0b2tlbiBhZnRlciBcIiR7c2VwYXJhdG9yfVwiYCk7XG4gICAgICB9XG4gICAgICBvdXQucHVzaChyZXN1bHQuYm9keSk7XG4gICAgfVxuICAgIHJldHVybiBzdWNjZXNzKG91dCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGt2PFQ+KFxuICBrZXlQYXJzZXI6IFBhcnNlckNvbXBvbmVudDxzdHJpbmdbXT4sXG4gIHNlcGFyYXRvcjogc3RyaW5nLFxuICB2YWx1ZVBhcnNlcjogUGFyc2VyQ29tcG9uZW50PFQ+LFxuKTogUGFyc2VyQ29tcG9uZW50PHsgW2tleTogc3RyaW5nXTogdW5rbm93biB9PiB7XG4gIGNvbnN0IFNlcGFyYXRvciA9IGNoYXJhY3RlcihzZXBhcmF0b3IpO1xuICByZXR1cm4gKHNjYW5uZXI6IFNjYW5uZXIpOiBQYXJzZVJlc3VsdDx7IFtrZXk6IHN0cmluZ106IHVua25vd24gfT4gPT4ge1xuICAgIGNvbnN0IHBvc2l0aW9uID0gc2Nhbm5lci5wb3NpdGlvbjtcbiAgICBjb25zdCBrZXkgPSBrZXlQYXJzZXIoc2Nhbm5lcik7XG4gICAgaWYgKCFrZXkub2spIHJldHVybiBmYWlsdXJlKCk7XG4gICAgY29uc3Qgc2VwID0gU2VwYXJhdG9yKHNjYW5uZXIpO1xuICAgIGlmICghc2VwLm9rKSB7XG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYGtleS92YWx1ZSBwYWlyIGRvZXNuJ3QgaGF2ZSBcIiR7c2VwYXJhdG9yfVwiYCk7XG4gICAgfVxuICAgIGNvbnN0IHZhbHVlID0gdmFsdWVQYXJzZXIoc2Nhbm5lcik7XG4gICAgaWYgKCF2YWx1ZS5vaykge1xuICAgICAgY29uc3QgbGluZUVuZEluZGV4ID0gc2Nhbm5lci5zb3VyY2UuaW5kZXhPZihcIlxcblwiLCBzY2FubmVyLnBvc2l0aW9uKTtcbiAgICAgIGNvbnN0IGVuZFBvc2l0aW9uID0gbGluZUVuZEluZGV4ID4gMFxuICAgICAgICA/IGxpbmVFbmRJbmRleFxuICAgICAgICA6IHNjYW5uZXIuc291cmNlLmxlbmd0aDtcbiAgICAgIGNvbnN0IGxpbmUgPSBzY2FubmVyLnNvdXJjZS5zbGljZShwb3NpdGlvbiwgZW5kUG9zaXRpb24pO1xuICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW5ub3QgcGFyc2UgdmFsdWUgb24gbGluZSAnJHtsaW5lfSdgKTtcbiAgICB9XG4gICAgcmV0dXJuIHN1Y2Nlc3ModW5mbGF0KGtleS5ib2R5LCB2YWx1ZS5ib2R5KSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG1lcmdlKFxuICBwYXJzZXI6IFBhcnNlckNvbXBvbmVudDx1bmtub3duW10+LFxuKTogUGFyc2VyQ29tcG9uZW50PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiB7XG4gIHJldHVybiAoc2Nhbm5lcjogU2Nhbm5lcik6IFBhcnNlUmVzdWx0PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gcGFyc2VyKHNjYW5uZXIpO1xuICAgIGlmICghcmVzdWx0Lm9rKSByZXR1cm4gZmFpbHVyZSgpO1xuICAgIGxldCBib2R5ID0geyBfX3Byb3RvX186IG51bGwgfTtcbiAgICBmb3IgKGNvbnN0IHJlY29yZCBvZiByZXN1bHQuYm9keSkge1xuICAgICAgaWYgKHR5cGVvZiByZWNvcmQgPT09IFwib2JqZWN0XCIgJiYgcmVjb3JkICE9PSBudWxsKSB7XG4gICAgICAgIGJvZHkgPSBkZWVwTWVyZ2UoYm9keSwgcmVjb3JkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN1Y2Nlc3MoYm9keSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlcGVhdDxUPihcbiAgcGFyc2VyOiBQYXJzZXJDb21wb25lbnQ8VD4sXG4pOiBQYXJzZXJDb21wb25lbnQ8VFtdPiB7XG4gIHJldHVybiAoc2Nhbm5lcjogU2Nhbm5lcikgPT4ge1xuICAgIGNvbnN0IGJvZHk6IFRbXSA9IFtdO1xuICAgIHdoaWxlICghc2Nhbm5lci5lb2YoKSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gcGFyc2VyKHNjYW5uZXIpO1xuICAgICAgaWYgKCFyZXN1bHQub2spIGJyZWFrO1xuICAgICAgYm9keS5wdXNoKHJlc3VsdC5ib2R5KTtcbiAgICAgIHNjYW5uZXIubmV4dFVudGlsQ2hhcigpO1xuICAgIH1cbiAgICBpZiAoYm9keS5sZW5ndGggPT09IDApIHJldHVybiBmYWlsdXJlKCk7XG4gICAgcmV0dXJuIHN1Y2Nlc3MoYm9keSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHN1cnJvdW5kPFQ+KFxuICBsZWZ0OiBzdHJpbmcsXG4gIHBhcnNlcjogUGFyc2VyQ29tcG9uZW50PFQ+LFxuICByaWdodDogc3RyaW5nLFxuKTogUGFyc2VyQ29tcG9uZW50PFQ+IHtcbiAgY29uc3QgTGVmdCA9IGNoYXJhY3RlcihsZWZ0KTtcbiAgY29uc3QgUmlnaHQgPSBjaGFyYWN0ZXIocmlnaHQpO1xuICByZXR1cm4gKHNjYW5uZXI6IFNjYW5uZXIpID0+IHtcbiAgICBpZiAoIUxlZnQoc2Nhbm5lcikub2spIHtcbiAgICAgIHJldHVybiBmYWlsdXJlKCk7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IHBhcnNlcihzY2FubmVyKTtcbiAgICBpZiAoIXJlc3VsdC5vaykge1xuICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBJbnZhbGlkIHRva2VuIGFmdGVyIFwiJHtsZWZ0fVwiYCk7XG4gICAgfVxuICAgIGlmICghUmlnaHQoc2Nhbm5lcikub2spIHtcbiAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgYE5vdCBjbG9zZWQgYnkgXCIke3JpZ2h0fVwiIGFmdGVyIHN0YXJ0ZWQgd2l0aCBcIiR7bGVmdH1cImAsXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gc3VjY2VzcyhyZXN1bHQuYm9keSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNoYXJhY3RlcihzdHI6IHN0cmluZykge1xuICByZXR1cm4gKHNjYW5uZXI6IFNjYW5uZXIpOiBQYXJzZVJlc3VsdDx2b2lkPiA9PiB7XG4gICAgc2Nhbm5lci5za2lwV2hpdGVzcGFjZXMoKTtcbiAgICBpZiAoIXNjYW5uZXIuc3RhcnRzV2l0aChzdHIpKSByZXR1cm4gZmFpbHVyZSgpO1xuICAgIHNjYW5uZXIubmV4dChzdHIubGVuZ3RoKTtcbiAgICBzY2FubmVyLnNraXBXaGl0ZXNwYWNlcygpO1xuICAgIHJldHVybiBzdWNjZXNzKHVuZGVmaW5lZCk7XG4gIH07XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQYXJzZXIgY29tcG9uZW50c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuY29uc3QgQkFSRV9LRVlfUkVHRVhQID0gL1tBLVphLXowLTlfLV0rL3k7XG5leHBvcnQgZnVuY3Rpb24gYmFyZUtleShzY2FubmVyOiBTY2FubmVyKTogUGFyc2VSZXN1bHQ8c3RyaW5nPiB7XG4gIHNjYW5uZXIuc2tpcFdoaXRlc3BhY2VzKCk7XG4gIGNvbnN0IGtleSA9IHNjYW5uZXIubWF0Y2goQkFSRV9LRVlfUkVHRVhQKT8uWzBdO1xuICBpZiAoIWtleSkgcmV0dXJuIGZhaWx1cmUoKTtcbiAgc2Nhbm5lci5uZXh0KGtleS5sZW5ndGgpO1xuICByZXR1cm4gc3VjY2VzcyhrZXkpO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVTZXF1ZW5jZShzY2FubmVyOiBTY2FubmVyKTogUGFyc2VSZXN1bHQ8c3RyaW5nPiB7XG4gIGlmIChzY2FubmVyLmNoYXIoKSAhPT0gXCJcXFxcXCIpIHJldHVybiBmYWlsdXJlKCk7XG4gIHNjYW5uZXIubmV4dCgpO1xuICAvLyBTZWUgaHR0cHM6Ly90b21sLmlvL2VuL3YxLjAuMC1yYy4zI3N0cmluZ1xuICBzd2l0Y2ggKHNjYW5uZXIuY2hhcigpKSB7XG4gICAgY2FzZSBcImJcIjpcbiAgICAgIHNjYW5uZXIubmV4dCgpO1xuICAgICAgcmV0dXJuIHN1Y2Nlc3MoXCJcXGJcIik7XG4gICAgY2FzZSBcInRcIjpcbiAgICAgIHNjYW5uZXIubmV4dCgpO1xuICAgICAgcmV0dXJuIHN1Y2Nlc3MoXCJcXHRcIik7XG4gICAgY2FzZSBcIm5cIjpcbiAgICAgIHNjYW5uZXIubmV4dCgpO1xuICAgICAgcmV0dXJuIHN1Y2Nlc3MoXCJcXG5cIik7XG4gICAgY2FzZSBcImZcIjpcbiAgICAgIHNjYW5uZXIubmV4dCgpO1xuICAgICAgcmV0dXJuIHN1Y2Nlc3MoXCJcXGZcIik7XG4gICAgY2FzZSBcInJcIjpcbiAgICAgIHNjYW5uZXIubmV4dCgpO1xuICAgICAgcmV0dXJuIHN1Y2Nlc3MoXCJcXHJcIik7XG4gICAgY2FzZSBcInVcIjpcbiAgICBjYXNlIFwiVVwiOiB7XG4gICAgICAvLyBVbmljb2RlIGNoYXJhY3RlclxuICAgICAgY29uc3QgY29kZVBvaW50TGVuID0gc2Nhbm5lci5jaGFyKCkgPT09IFwidVwiID8gNCA6IDY7XG4gICAgICBjb25zdCBjb2RlUG9pbnQgPSBwYXJzZUludChcIjB4XCIgKyBzY2FubmVyLnNsaWNlKDEsIDEgKyBjb2RlUG9pbnRMZW4pLCAxNik7XG4gICAgICBjb25zdCBzdHIgPSBTdHJpbmcuZnJvbUNvZGVQb2ludChjb2RlUG9pbnQpO1xuICAgICAgc2Nhbm5lci5uZXh0KGNvZGVQb2ludExlbiArIDEpO1xuICAgICAgcmV0dXJuIHN1Y2Nlc3Moc3RyKTtcbiAgICB9XG4gICAgY2FzZSAnXCInOlxuICAgICAgc2Nhbm5lci5uZXh0KCk7XG4gICAgICByZXR1cm4gc3VjY2VzcygnXCInKTtcbiAgICBjYXNlIFwiXFxcXFwiOlxuICAgICAgc2Nhbm5lci5uZXh0KCk7XG4gICAgICByZXR1cm4gc3VjY2VzcyhcIlxcXFxcIik7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgYEludmFsaWQgZXNjYXBlIHNlcXVlbmNlOiBcXFxcJHtzY2FubmVyLmNoYXIoKX1gLFxuICAgICAgKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYmFzaWNTdHJpbmcoc2Nhbm5lcjogU2Nhbm5lcik6IFBhcnNlUmVzdWx0PHN0cmluZz4ge1xuICBzY2FubmVyLnNraXBXaGl0ZXNwYWNlcygpO1xuICBpZiAoc2Nhbm5lci5jaGFyKCkgIT09ICdcIicpIHJldHVybiBmYWlsdXJlKCk7XG4gIHNjYW5uZXIubmV4dCgpO1xuICBjb25zdCBhY2MgPSBbXTtcbiAgd2hpbGUgKHNjYW5uZXIuY2hhcigpICE9PSAnXCInICYmICFzY2FubmVyLmVvZigpKSB7XG4gICAgaWYgKHNjYW5uZXIuY2hhcigpID09PSBcIlxcblwiKSB7XG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJTaW5nbGUtbGluZSBzdHJpbmcgY2Fubm90IGNvbnRhaW4gRU9MXCIpO1xuICAgIH1cbiAgICBjb25zdCBlc2NhcGVkQ2hhciA9IGVzY2FwZVNlcXVlbmNlKHNjYW5uZXIpO1xuICAgIGlmIChlc2NhcGVkQ2hhci5vaykge1xuICAgICAgYWNjLnB1c2goZXNjYXBlZENoYXIuYm9keSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFjYy5wdXNoKHNjYW5uZXIuY2hhcigpKTtcbiAgICAgIHNjYW5uZXIubmV4dCgpO1xuICAgIH1cbiAgfVxuICBpZiAoc2Nhbm5lci5lb2YoKSkge1xuICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgIGBTaW5nbGUtbGluZSBzdHJpbmcgaXMgbm90IGNsb3NlZDpcXG4ke2FjYy5qb2luKFwiXCIpfWAsXG4gICAgKTtcbiAgfVxuICBzY2FubmVyLm5leHQoKTsgLy8gc2tpcCBsYXN0ICdcIlwiXG4gIHJldHVybiBzdWNjZXNzKGFjYy5qb2luKFwiXCIpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpdGVyYWxTdHJpbmcoc2Nhbm5lcjogU2Nhbm5lcik6IFBhcnNlUmVzdWx0PHN0cmluZz4ge1xuICBzY2FubmVyLnNraXBXaGl0ZXNwYWNlcygpO1xuICBpZiAoc2Nhbm5lci5jaGFyKCkgIT09IFwiJ1wiKSByZXR1cm4gZmFpbHVyZSgpO1xuICBzY2FubmVyLm5leHQoKTtcbiAgY29uc3QgYWNjOiBzdHJpbmdbXSA9IFtdO1xuICB3aGlsZSAoc2Nhbm5lci5jaGFyKCkgIT09IFwiJ1wiICYmICFzY2FubmVyLmVvZigpKSB7XG4gICAgaWYgKHNjYW5uZXIuY2hhcigpID09PSBcIlxcblwiKSB7XG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJTaW5nbGUtbGluZSBzdHJpbmcgY2Fubm90IGNvbnRhaW4gRU9MXCIpO1xuICAgIH1cbiAgICBhY2MucHVzaChzY2FubmVyLmNoYXIoKSk7XG4gICAgc2Nhbm5lci5uZXh0KCk7XG4gIH1cbiAgaWYgKHNjYW5uZXIuZW9mKCkpIHtcbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICBgU2luZ2xlLWxpbmUgc3RyaW5nIGlzIG5vdCBjbG9zZWQ6XFxuJHthY2Muam9pbihcIlwiKX1gLFxuICAgICk7XG4gIH1cbiAgc2Nhbm5lci5uZXh0KCk7IC8vIHNraXAgbGFzdCBcIidcIlxuICByZXR1cm4gc3VjY2VzcyhhY2Muam9pbihcIlwiKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtdWx0aWxpbmVCYXNpY1N0cmluZyhcbiAgc2Nhbm5lcjogU2Nhbm5lcixcbik6IFBhcnNlUmVzdWx0PHN0cmluZz4ge1xuICBzY2FubmVyLnNraXBXaGl0ZXNwYWNlcygpO1xuICBpZiAoIXNjYW5uZXIuc3RhcnRzV2l0aCgnXCJcIlwiJykpIHJldHVybiBmYWlsdXJlKCk7XG4gIHNjYW5uZXIubmV4dCgzKTtcbiAgaWYgKHNjYW5uZXIuY2hhcigpID09PSBcIlxcblwiKSB7XG4gICAgLy8gVGhlIGZpcnN0IG5ld2xpbmUgKExGKSBpcyB0cmltbWVkXG4gICAgc2Nhbm5lci5uZXh0KCk7XG4gIH0gZWxzZSBpZiAoc2Nhbm5lci5zdGFydHNXaXRoKFwiXFxyXFxuXCIpKSB7XG4gICAgLy8gVGhlIGZpcnN0IG5ld2xpbmUgKENSTEYpIGlzIHRyaW1tZWRcbiAgICBzY2FubmVyLm5leHQoMik7XG4gIH1cbiAgY29uc3QgYWNjOiBzdHJpbmdbXSA9IFtdO1xuICB3aGlsZSAoIXNjYW5uZXIuc3RhcnRzV2l0aCgnXCJcIlwiJykgJiYgIXNjYW5uZXIuZW9mKCkpIHtcbiAgICAvLyBsaW5lIGVuZGluZyBiYWNrc2xhc2hcbiAgICBpZiAoc2Nhbm5lci5zdGFydHNXaXRoKFwiXFxcXFxcblwiKSkge1xuICAgICAgc2Nhbm5lci5uZXh0KCk7XG4gICAgICBzY2FubmVyLm5leHRVbnRpbENoYXIoeyBza2lwQ29tbWVudHM6IGZhbHNlIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfSBlbHNlIGlmIChzY2FubmVyLnN0YXJ0c1dpdGgoXCJcXFxcXFxyXFxuXCIpKSB7XG4gICAgICBzY2FubmVyLm5leHQoKTtcbiAgICAgIHNjYW5uZXIubmV4dFVudGlsQ2hhcih7IHNraXBDb21tZW50czogZmFsc2UgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgZXNjYXBlZENoYXIgPSBlc2NhcGVTZXF1ZW5jZShzY2FubmVyKTtcbiAgICBpZiAoZXNjYXBlZENoYXIub2spIHtcbiAgICAgIGFjYy5wdXNoKGVzY2FwZWRDaGFyLmJvZHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhY2MucHVzaChzY2FubmVyLmNoYXIoKSk7XG4gICAgICBzY2FubmVyLm5leHQoKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc2Nhbm5lci5lb2YoKSkge1xuICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgIGBNdWx0aS1saW5lIHN0cmluZyBpcyBub3QgY2xvc2VkOlxcbiR7YWNjLmpvaW4oXCJcIil9YCxcbiAgICApO1xuICB9XG4gIC8vIGlmIGVuZHMgd2l0aCA0IGBcImAsIHB1c2ggdGhlIGZpc3QgYFwiYCB0byBzdHJpbmdcbiAgaWYgKHNjYW5uZXIuY2hhcigzKSA9PT0gJ1wiJykge1xuICAgIGFjYy5wdXNoKCdcIicpO1xuICAgIHNjYW5uZXIubmV4dCgpO1xuICB9XG4gIHNjYW5uZXIubmV4dCgzKTsgLy8gc2tpcCBsYXN0ICdcIlwiXCJcIlxuICByZXR1cm4gc3VjY2VzcyhhY2Muam9pbihcIlwiKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtdWx0aWxpbmVMaXRlcmFsU3RyaW5nKFxuICBzY2FubmVyOiBTY2FubmVyLFxuKTogUGFyc2VSZXN1bHQ8c3RyaW5nPiB7XG4gIHNjYW5uZXIuc2tpcFdoaXRlc3BhY2VzKCk7XG4gIGlmICghc2Nhbm5lci5zdGFydHNXaXRoKFwiJycnXCIpKSByZXR1cm4gZmFpbHVyZSgpO1xuICBzY2FubmVyLm5leHQoMyk7XG4gIGlmIChzY2FubmVyLmNoYXIoKSA9PT0gXCJcXG5cIikge1xuICAgIC8vIFRoZSBmaXJzdCBuZXdsaW5lIChMRikgaXMgdHJpbW1lZFxuICAgIHNjYW5uZXIubmV4dCgpO1xuICB9IGVsc2UgaWYgKHNjYW5uZXIuc3RhcnRzV2l0aChcIlxcclxcblwiKSkge1xuICAgIC8vIFRoZSBmaXJzdCBuZXdsaW5lIChDUkxGKSBpcyB0cmltbWVkXG4gICAgc2Nhbm5lci5uZXh0KDIpO1xuICB9XG4gIGNvbnN0IGFjYzogc3RyaW5nW10gPSBbXTtcbiAgd2hpbGUgKCFzY2FubmVyLnN0YXJ0c1dpdGgoXCInJydcIikgJiYgIXNjYW5uZXIuZW9mKCkpIHtcbiAgICBhY2MucHVzaChzY2FubmVyLmNoYXIoKSk7XG4gICAgc2Nhbm5lci5uZXh0KCk7XG4gIH1cbiAgaWYgKHNjYW5uZXIuZW9mKCkpIHtcbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICBgTXVsdGktbGluZSBzdHJpbmcgaXMgbm90IGNsb3NlZDpcXG4ke2FjYy5qb2luKFwiXCIpfWAsXG4gICAgKTtcbiAgfVxuICAvLyBpZiBlbmRzIHdpdGggNCBgJ2AsIHB1c2ggdGhlIGZpc3QgYCdgIHRvIHN0cmluZ1xuICBpZiAoc2Nhbm5lci5jaGFyKDMpID09PSBcIidcIikge1xuICAgIGFjYy5wdXNoKFwiJ1wiKTtcbiAgICBzY2FubmVyLm5leHQoKTtcbiAgfVxuICBzY2FubmVyLm5leHQoMyk7IC8vIHNraXAgbGFzdCBcIicnJ1wiXG4gIHJldHVybiBzdWNjZXNzKGFjYy5qb2luKFwiXCIpKTtcbn1cblxuY29uc3QgQk9PTEVBTl9SRUdFWFAgPSAvKD86dHJ1ZXxmYWxzZSlcXGIveTtcbmV4cG9ydCBmdW5jdGlvbiBib29sZWFuKHNjYW5uZXI6IFNjYW5uZXIpOiBQYXJzZVJlc3VsdDxib29sZWFuPiB7XG4gIHNjYW5uZXIuc2tpcFdoaXRlc3BhY2VzKCk7XG4gIGNvbnN0IG1hdGNoID0gc2Nhbm5lci5tYXRjaChCT09MRUFOX1JFR0VYUCk7XG4gIGlmICghbWF0Y2gpIHJldHVybiBmYWlsdXJlKCk7XG4gIGNvbnN0IHN0cmluZyA9IG1hdGNoWzBdO1xuICBzY2FubmVyLm5leHQoc3RyaW5nLmxlbmd0aCk7XG4gIGNvbnN0IHZhbHVlID0gc3RyaW5nID09PSBcInRydWVcIjtcbiAgcmV0dXJuIHN1Y2Nlc3ModmFsdWUpO1xufVxuXG5jb25zdCBJTkZJTklUWV9NQVAgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPihbXG4gIFtcImluZlwiLCBJbmZpbml0eV0sXG4gIFtcIitpbmZcIiwgSW5maW5pdHldLFxuICBbXCItaW5mXCIsIC1JbmZpbml0eV0sXG5dKTtcbmNvbnN0IElORklOSVRZX1JFR0VYUCA9IC9bKy1dP2luZlxcYi95O1xuZXhwb3J0IGZ1bmN0aW9uIGluZmluaXR5KHNjYW5uZXI6IFNjYW5uZXIpOiBQYXJzZVJlc3VsdDxudW1iZXI+IHtcbiAgc2Nhbm5lci5za2lwV2hpdGVzcGFjZXMoKTtcbiAgY29uc3QgbWF0Y2ggPSBzY2FubmVyLm1hdGNoKElORklOSVRZX1JFR0VYUCk7XG4gIGlmICghbWF0Y2gpIHJldHVybiBmYWlsdXJlKCk7XG4gIGNvbnN0IHN0cmluZyA9IG1hdGNoWzBdO1xuICBzY2FubmVyLm5leHQoc3RyaW5nLmxlbmd0aCk7XG4gIGNvbnN0IHZhbHVlID0gSU5GSU5JVFlfTUFQLmdldChzdHJpbmcpITtcbiAgcmV0dXJuIHN1Y2Nlc3ModmFsdWUpO1xufVxuXG5jb25zdCBOQU5fUkVHRVhQID0gL1srLV0/bmFuXFxiL3k7XG5leHBvcnQgZnVuY3Rpb24gbmFuKHNjYW5uZXI6IFNjYW5uZXIpOiBQYXJzZVJlc3VsdDxudW1iZXI+IHtcbiAgc2Nhbm5lci5za2lwV2hpdGVzcGFjZXMoKTtcbiAgY29uc3QgbWF0Y2ggPSBzY2FubmVyLm1hdGNoKE5BTl9SRUdFWFApO1xuICBpZiAoIW1hdGNoKSByZXR1cm4gZmFpbHVyZSgpO1xuICBjb25zdCBzdHJpbmcgPSBtYXRjaFswXTtcbiAgc2Nhbm5lci5uZXh0KHN0cmluZy5sZW5ndGgpO1xuICBjb25zdCB2YWx1ZSA9IE5hTjtcbiAgcmV0dXJuIHN1Y2Nlc3ModmFsdWUpO1xufVxuXG5leHBvcnQgY29uc3QgZG90dGVkS2V5ID0gam9pbjEob3IoW2JhcmVLZXksIGJhc2ljU3RyaW5nLCBsaXRlcmFsU3RyaW5nXSksIFwiLlwiKTtcblxuY29uc3QgQklOQVJZX1JFR0VYUCA9IC8wYlswMV0rKD86X1swMV0rKSpcXGIveTtcbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnkoc2Nhbm5lcjogU2Nhbm5lcik6IFBhcnNlUmVzdWx0PG51bWJlciB8IHN0cmluZz4ge1xuICBzY2FubmVyLnNraXBXaGl0ZXNwYWNlcygpO1xuICBjb25zdCBtYXRjaCA9IHNjYW5uZXIubWF0Y2goQklOQVJZX1JFR0VYUCk/LlswXTtcbiAgaWYgKCFtYXRjaCkgcmV0dXJuIGZhaWx1cmUoKTtcbiAgc2Nhbm5lci5uZXh0KG1hdGNoLmxlbmd0aCk7XG4gIGNvbnN0IHZhbHVlID0gbWF0Y2guc2xpY2UoMikucmVwbGFjZUFsbChcIl9cIiwgXCJcIik7XG4gIGNvbnN0IG51bWJlciA9IHBhcnNlSW50KHZhbHVlLCAyKTtcbiAgcmV0dXJuIGlzTmFOKG51bWJlcikgPyBmYWlsdXJlKCkgOiBzdWNjZXNzKG51bWJlcik7XG59XG5cbmNvbnN0IE9DVEFMX1JFR0VYUCA9IC8wb1swLTddKyg/Ol9bMC03XSspKlxcYi95O1xuZXhwb3J0IGZ1bmN0aW9uIG9jdGFsKHNjYW5uZXI6IFNjYW5uZXIpOiBQYXJzZVJlc3VsdDxudW1iZXIgfCBzdHJpbmc+IHtcbiAgc2Nhbm5lci5za2lwV2hpdGVzcGFjZXMoKTtcbiAgY29uc3QgbWF0Y2ggPSBzY2FubmVyLm1hdGNoKE9DVEFMX1JFR0VYUCk/LlswXTtcbiAgaWYgKCFtYXRjaCkgcmV0dXJuIGZhaWx1cmUoKTtcbiAgc2Nhbm5lci5uZXh0KG1hdGNoLmxlbmd0aCk7XG4gIGNvbnN0IHZhbHVlID0gbWF0Y2guc2xpY2UoMikucmVwbGFjZUFsbChcIl9cIiwgXCJcIik7XG4gIGNvbnN0IG51bWJlciA9IHBhcnNlSW50KHZhbHVlLCA4KTtcbiAgcmV0dXJuIGlzTmFOKG51bWJlcikgPyBmYWlsdXJlKCkgOiBzdWNjZXNzKG51bWJlcik7XG59XG5cbmNvbnN0IEhFWF9SRUdFWFAgPSAvMHhbMC05YS1mXSsoPzpfWzAtOWEtZl0rKSpcXGIveWk7XG5leHBvcnQgZnVuY3Rpb24gaGV4KHNjYW5uZXI6IFNjYW5uZXIpOiBQYXJzZVJlc3VsdDxudW1iZXIgfCBzdHJpbmc+IHtcbiAgc2Nhbm5lci5za2lwV2hpdGVzcGFjZXMoKTtcbiAgY29uc3QgbWF0Y2ggPSBzY2FubmVyLm1hdGNoKEhFWF9SRUdFWFApPy5bMF07XG4gIGlmICghbWF0Y2gpIHJldHVybiBmYWlsdXJlKCk7XG4gIHNjYW5uZXIubmV4dChtYXRjaC5sZW5ndGgpO1xuICBjb25zdCB2YWx1ZSA9IG1hdGNoLnNsaWNlKDIpLnJlcGxhY2VBbGwoXCJfXCIsIFwiXCIpO1xuICBjb25zdCBudW1iZXIgPSBwYXJzZUludCh2YWx1ZSwgMTYpO1xuICByZXR1cm4gaXNOYU4obnVtYmVyKSA/IGZhaWx1cmUoKSA6IHN1Y2Nlc3MobnVtYmVyKTtcbn1cblxuY29uc3QgSU5URUdFUl9SRUdFWFAgPSAvWystXT8oPzowfFsxLTldWzAtOV0qKD86X1swLTldKykqKVxcYi95O1xuZXhwb3J0IGZ1bmN0aW9uIGludGVnZXIoc2Nhbm5lcjogU2Nhbm5lcik6IFBhcnNlUmVzdWx0PG51bWJlciB8IHN0cmluZz4ge1xuICBzY2FubmVyLnNraXBXaGl0ZXNwYWNlcygpO1xuICBjb25zdCBtYXRjaCA9IHNjYW5uZXIubWF0Y2goSU5URUdFUl9SRUdFWFApPy5bMF07XG4gIGlmICghbWF0Y2gpIHJldHVybiBmYWlsdXJlKCk7XG4gIHNjYW5uZXIubmV4dChtYXRjaC5sZW5ndGgpO1xuICBjb25zdCB2YWx1ZSA9IG1hdGNoLnJlcGxhY2VBbGwoXCJfXCIsIFwiXCIpO1xuICBjb25zdCBpbnQgPSBwYXJzZUludCh2YWx1ZSwgMTApO1xuICByZXR1cm4gc3VjY2VzcyhpbnQpO1xufVxuXG5jb25zdCBGTE9BVF9SRUdFWFAgPVxuICAvWystXT8oPzowfFsxLTldWzAtOV0qKD86X1swLTldKykqKSg/OlxcLlswLTldKyg/Ol9bMC05XSspKik/KD86ZVsrLV0/WzAtOV0rKD86X1swLTldKykqKT9cXGIveWk7XG5leHBvcnQgZnVuY3Rpb24gZmxvYXQoc2Nhbm5lcjogU2Nhbm5lcik6IFBhcnNlUmVzdWx0PG51bWJlcj4ge1xuICBzY2FubmVyLnNraXBXaGl0ZXNwYWNlcygpO1xuICBjb25zdCBtYXRjaCA9IHNjYW5uZXIubWF0Y2goRkxPQVRfUkVHRVhQKT8uWzBdO1xuICBpZiAoIW1hdGNoKSByZXR1cm4gZmFpbHVyZSgpO1xuICBzY2FubmVyLm5leHQobWF0Y2gubGVuZ3RoKTtcbiAgY29uc3QgdmFsdWUgPSBtYXRjaC5yZXBsYWNlQWxsKFwiX1wiLCBcIlwiKTtcbiAgY29uc3QgZmxvYXQgPSBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgaWYgKGlzTmFOKGZsb2F0KSkgcmV0dXJuIGZhaWx1cmUoKTtcbiAgcmV0dXJuIHN1Y2Nlc3MoZmxvYXQpO1xufVxuXG5jb25zdCBEQVRFX1RJTUVfUkVHRVhQID1cbiAgLyg/PHllYXI+XFxkezR9KS0oPzxtb250aD5cXGR7Mn0pLSg/PGRheT5cXGR7Mn0pKD86WyAwLTlUWi46Ky1dKyk/XFxiL3k7XG5leHBvcnQgZnVuY3Rpb24gZGF0ZVRpbWUoc2Nhbm5lcjogU2Nhbm5lcik6IFBhcnNlUmVzdWx0PERhdGU+IHtcbiAgc2Nhbm5lci5za2lwV2hpdGVzcGFjZXMoKTtcbiAgY29uc3QgbWF0Y2ggPSBzY2FubmVyLm1hdGNoKERBVEVfVElNRV9SRUdFWFApO1xuICBpZiAoIW1hdGNoKSByZXR1cm4gZmFpbHVyZSgpO1xuICBjb25zdCBzdHJpbmcgPSBtYXRjaFswXTtcbiAgc2Nhbm5lci5uZXh0KHN0cmluZy5sZW5ndGgpO1xuICBjb25zdCBncm91cHMgPSBtYXRjaC5ncm91cHMgYXMgeyB5ZWFyOiBzdHJpbmc7IG1vbnRoOiBzdHJpbmc7IGRheTogc3RyaW5nIH07XG4gIC8vIHNwZWNpYWwgY2FzZSBpZiBtb250aCBpcyBGZWJydWFyeVxuICBpZiAoZ3JvdXBzLm1vbnRoID09IFwiMDJcIikge1xuICAgIGNvbnN0IGRheXMgPSBwYXJzZUludChncm91cHMuZGF5KTtcbiAgICBpZiAoZGF5cyA+IDI5KSB7XG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEludmFsaWQgZGF0ZSBzdHJpbmcgXCIke21hdGNofVwiYCk7XG4gICAgfVxuICAgIGNvbnN0IHllYXIgPSBwYXJzZUludChncm91cHMueWVhcik7XG4gICAgaWYgKGRheXMgPiAyOCAmJiAhaXNMZWFwKHllYXIpKSB7XG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEludmFsaWQgZGF0ZSBzdHJpbmcgXCIke21hdGNofVwiYCk7XG4gICAgfVxuICB9XG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShzdHJpbmcudHJpbSgpKTtcbiAgLy8gaW52YWxpZCBkYXRlXG4gIGlmIChpc05hTihkYXRlLmdldFRpbWUoKSkpIHtcbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEludmFsaWQgZGF0ZSBzdHJpbmcgXCIke21hdGNofVwiYCk7XG4gIH1cbiAgcmV0dXJuIHN1Y2Nlc3MoZGF0ZSk7XG59XG5cbmNvbnN0IExPQ0FMX1RJTUVfUkVHRVhQID0gLyhcXGR7Mn0pOihcXGR7Mn0pOihcXGR7Mn0pKD86XFwuWzAtOV0rKT9cXGIveTtcbmV4cG9ydCBmdW5jdGlvbiBsb2NhbFRpbWUoc2Nhbm5lcjogU2Nhbm5lcik6IFBhcnNlUmVzdWx0PHN0cmluZz4ge1xuICBzY2FubmVyLnNraXBXaGl0ZXNwYWNlcygpO1xuXG4gIGNvbnN0IG1hdGNoID0gc2Nhbm5lci5tYXRjaChMT0NBTF9USU1FX1JFR0VYUCk/LlswXTtcbiAgaWYgKCFtYXRjaCkgcmV0dXJuIGZhaWx1cmUoKTtcbiAgc2Nhbm5lci5uZXh0KG1hdGNoLmxlbmd0aCk7XG4gIHJldHVybiBzdWNjZXNzKG1hdGNoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFycmF5VmFsdWUoc2Nhbm5lcjogU2Nhbm5lcik6IFBhcnNlUmVzdWx0PHVua25vd25bXT4ge1xuICBzY2FubmVyLnNraXBXaGl0ZXNwYWNlcygpO1xuXG4gIGlmIChzY2FubmVyLmNoYXIoKSAhPT0gXCJbXCIpIHJldHVybiBmYWlsdXJlKCk7XG4gIHNjYW5uZXIubmV4dCgpO1xuXG4gIGNvbnN0IGFycmF5OiB1bmtub3duW10gPSBbXTtcbiAgd2hpbGUgKCFzY2FubmVyLmVvZigpKSB7XG4gICAgc2Nhbm5lci5uZXh0VW50aWxDaGFyKCk7XG4gICAgY29uc3QgcmVzdWx0ID0gdmFsdWUoc2Nhbm5lcik7XG4gICAgaWYgKCFyZXN1bHQub2spIGJyZWFrO1xuICAgIGFycmF5LnB1c2gocmVzdWx0LmJvZHkpO1xuICAgIHNjYW5uZXIuc2tpcFdoaXRlc3BhY2VzKCk7XG4gICAgLy8gbWF5IGhhdmUgYSBuZXh0IGl0ZW0sIGJ1dCB0cmFpbGluZyBjb21tYSBpcyBhbGxvd2VkIGF0IGFycmF5XG4gICAgaWYgKHNjYW5uZXIuY2hhcigpICE9PSBcIixcIikgYnJlYWs7XG4gICAgc2Nhbm5lci5uZXh0KCk7XG4gIH1cbiAgc2Nhbm5lci5uZXh0VW50aWxDaGFyKCk7XG5cbiAgaWYgKHNjYW5uZXIuY2hhcigpICE9PSBcIl1cIikgdGhyb3cgbmV3IFN5bnRheEVycm9yKFwiQXJyYXkgaXMgbm90IGNsb3NlZFwiKTtcbiAgc2Nhbm5lci5uZXh0KCk7XG5cbiAgcmV0dXJuIHN1Y2Nlc3MoYXJyYXkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5saW5lVGFibGUoXG4gIHNjYW5uZXI6IFNjYW5uZXIsXG4pOiBQYXJzZVJlc3VsdDxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4ge1xuICBzY2FubmVyLm5leHRVbnRpbENoYXIoKTtcbiAgaWYgKHNjYW5uZXIuY2hhcigxKSA9PT0gXCJ9XCIpIHtcbiAgICBzY2FubmVyLm5leHQoMik7XG4gICAgcmV0dXJuIHN1Y2Nlc3MoeyBfX3Byb3RvX186IG51bGwgfSk7XG4gIH1cbiAgY29uc3QgcGFpcnMgPSBzdXJyb3VuZChcIntcIiwgam9pbihwYWlyLCBcIixcIiksIFwifVwiKShzY2FubmVyKTtcbiAgaWYgKCFwYWlycy5vaykgcmV0dXJuIGZhaWx1cmUoKTtcbiAgbGV0IHRhYmxlID0geyBfX3Byb3RvX186IG51bGwgfSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgZm9yIChjb25zdCBwYWlyIG9mIHBhaXJzLmJvZHkpIHtcbiAgICB0YWJsZSA9IGRlZXBNZXJnZSh0YWJsZSwgcGFpcik7XG4gIH1cbiAgcmV0dXJuIHN1Y2Nlc3ModGFibGUpO1xufVxuXG5leHBvcnQgY29uc3QgdmFsdWUgPSBvcihbXG4gIG11bHRpbGluZUJhc2ljU3RyaW5nLFxuICBtdWx0aWxpbmVMaXRlcmFsU3RyaW5nLFxuICBiYXNpY1N0cmluZyxcbiAgbGl0ZXJhbFN0cmluZyxcbiAgYm9vbGVhbixcbiAgaW5maW5pdHksXG4gIG5hbixcbiAgZGF0ZVRpbWUsXG4gIGxvY2FsVGltZSxcbiAgYmluYXJ5LFxuICBvY3RhbCxcbiAgaGV4LFxuICBmbG9hdCxcbiAgaW50ZWdlcixcbiAgYXJyYXlWYWx1ZSxcbiAgaW5saW5lVGFibGUsXG5dKTtcblxuZXhwb3J0IGNvbnN0IHBhaXIgPSBrdihkb3R0ZWRLZXksIFwiPVwiLCB2YWx1ZSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBibG9jayhcbiAgc2Nhbm5lcjogU2Nhbm5lcixcbik6IFBhcnNlUmVzdWx0PEJsb2NrPiB7XG4gIHNjYW5uZXIubmV4dFVudGlsQ2hhcigpO1xuICBjb25zdCByZXN1bHQgPSBtZXJnZShyZXBlYXQocGFpcikpKHNjYW5uZXIpO1xuICBpZiAocmVzdWx0Lm9rKSByZXR1cm4gc3VjY2Vzcyh7IHR5cGU6IFwiQmxvY2tcIiwgdmFsdWU6IHJlc3VsdC5ib2R5IH0pO1xuICByZXR1cm4gZmFpbHVyZSgpO1xufVxuXG5leHBvcnQgY29uc3QgdGFibGVIZWFkZXIgPSBzdXJyb3VuZChcIltcIiwgZG90dGVkS2V5LCBcIl1cIik7XG5cbmV4cG9ydCBmdW5jdGlvbiB0YWJsZShzY2FubmVyOiBTY2FubmVyKTogUGFyc2VSZXN1bHQ8VGFibGU+IHtcbiAgc2Nhbm5lci5uZXh0VW50aWxDaGFyKCk7XG4gIGNvbnN0IGhlYWRlciA9IHRhYmxlSGVhZGVyKHNjYW5uZXIpO1xuICBpZiAoIWhlYWRlci5vaykgcmV0dXJuIGZhaWx1cmUoKTtcbiAgc2Nhbm5lci5uZXh0VW50aWxDaGFyKCk7XG4gIGNvbnN0IGIgPSBibG9jayhzY2FubmVyKTtcbiAgcmV0dXJuIHN1Y2Nlc3Moe1xuICAgIHR5cGU6IFwiVGFibGVcIixcbiAgICBrZXlzOiBoZWFkZXIuYm9keSxcbiAgICB2YWx1ZTogYi5vayA/IGIuYm9keS52YWx1ZSA6IHsgX19wcm90b19fOiBudWxsIH0sXG4gIH0pO1xufVxuXG5leHBvcnQgY29uc3QgdGFibGVBcnJheUhlYWRlciA9IHN1cnJvdW5kKFwiW1tcIiwgZG90dGVkS2V5LCBcIl1dXCIpO1xuXG5leHBvcnQgZnVuY3Rpb24gdGFibGVBcnJheShcbiAgc2Nhbm5lcjogU2Nhbm5lcixcbik6IFBhcnNlUmVzdWx0PFRhYmxlQXJyYXk+IHtcbiAgc2Nhbm5lci5uZXh0VW50aWxDaGFyKCk7XG4gIGNvbnN0IGhlYWRlciA9IHRhYmxlQXJyYXlIZWFkZXIoc2Nhbm5lcik7XG4gIGlmICghaGVhZGVyLm9rKSByZXR1cm4gZmFpbHVyZSgpO1xuICBzY2FubmVyLm5leHRVbnRpbENoYXIoKTtcbiAgY29uc3QgYiA9IGJsb2NrKHNjYW5uZXIpO1xuICByZXR1cm4gc3VjY2Vzcyh7XG4gICAgdHlwZTogXCJUYWJsZUFycmF5XCIsXG4gICAga2V5czogaGVhZGVyLmJvZHksXG4gICAgdmFsdWU6IGIub2sgPyBiLmJvZHkudmFsdWUgOiB7IF9fcHJvdG9fXzogbnVsbCB9LFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvbWwoXG4gIHNjYW5uZXI6IFNjYW5uZXIsXG4pOiBQYXJzZVJlc3VsdDxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4ge1xuICBjb25zdCBibG9ja3MgPSByZXBlYXQob3IoW2Jsb2NrLCB0YWJsZUFycmF5LCB0YWJsZV0pKShzY2FubmVyKTtcbiAgaWYgKCFibG9ja3Mub2spIHJldHVybiBzdWNjZXNzKHsgX19wcm90b19fOiBudWxsIH0pO1xuICBjb25zdCBib2R5ID0gYmxvY2tzLmJvZHkucmVkdWNlKGRlZXBBc3NpZ24sIHsgX19wcm90b19fOiBudWxsIH0pO1xuICByZXR1cm4gc3VjY2Vzcyhib2R5KTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUGFyc2VFcnJvck1lc3NhZ2Uoc2Nhbm5lcjogU2Nhbm5lciwgbWVzc2FnZTogc3RyaW5nKSB7XG4gIGNvbnN0IHN0cmluZyA9IHNjYW5uZXIuc291cmNlLnNsaWNlKDAsIHNjYW5uZXIucG9zaXRpb24pO1xuICBjb25zdCBsaW5lcyA9IHN0cmluZy5zcGxpdChcIlxcblwiKTtcbiAgY29uc3Qgcm93ID0gbGluZXMubGVuZ3RoO1xuICBjb25zdCBjb2x1bW4gPSBsaW5lcy5hdCgtMSk/Lmxlbmd0aCA/PyAwO1xuICByZXR1cm4gYFBhcnNlIGVycm9yIG9uIGxpbmUgJHtyb3d9LCBjb2x1bW4gJHtjb2x1bW59OiAke21lc3NhZ2V9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlckZhY3Rvcnk8VD4ocGFyc2VyOiBQYXJzZXJDb21wb25lbnQ8VD4pIHtcbiAgcmV0dXJuICh0b21sU3RyaW5nOiBzdHJpbmcpOiBUID0+IHtcbiAgICBjb25zdCBzY2FubmVyID0gbmV3IFNjYW5uZXIodG9tbFN0cmluZyk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHBhcnNlcihzY2FubmVyKTtcbiAgICAgIGlmIChyZXN1bHQub2sgJiYgc2Nhbm5lci5lb2YoKSkgcmV0dXJuIHJlc3VsdC5ib2R5O1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGBVbmV4cGVjdGVkIGNoYXJhY3RlcjogXCIke3NjYW5uZXIuY2hhcigpfVwiYDtcbiAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihjcmVhdGVQYXJzZUVycm9yTWVzc2FnZShzY2FubmVyLCBtZXNzYWdlKSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihjcmVhdGVQYXJzZUVycm9yTWVzc2FnZShzY2FubmVyLCBlcnJvci5tZXNzYWdlKSk7XG4gICAgICB9XG4gICAgICBjb25zdCBtZXNzYWdlID0gXCJJbnZhbGlkIGVycm9yIHR5cGUgY2F1Z2h0XCI7XG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoY3JlYXRlUGFyc2VFcnJvck1lc3NhZ2Uoc2Nhbm5lciwgbWVzc2FnZSkpO1xuICAgIH1cbiAgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxREFBcUQ7QUFDckQscUNBQXFDO0FBRXJDLFNBQVMsU0FBUyxRQUFRLHlDQUF5QztBQUVuRTs7Q0FFQyxHQUNELFNBQVMsT0FBTyxVQUFrQjtFQUNoQyxPQUNFLEFBQUMsYUFBYSxNQUFNLEtBQUssYUFBYSxRQUFRLEtBQU0sYUFBYSxRQUFRO0FBRTdFO0FBZ0NBLE9BQU8sTUFBTTtFQUNYLENBQUEsVUFBVyxHQUFHLFFBQVE7RUFDdEIsQ0FBQSxRQUFTLEdBQUcsRUFBRTtFQUNkLENBQUEsTUFBTyxDQUFTO0VBRWhCLFlBQVksTUFBYyxDQUFFO0lBQzFCLElBQUksQ0FBQyxDQUFBLE1BQU8sR0FBRztFQUNqQjtFQUVBLElBQUks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
// denoCacheMetadata=13110947700586107655,10211122910824463813
