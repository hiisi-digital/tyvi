// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
/**
 * {@linkcode parse} and {@linkcode stringify} for handling
 * {@link https://toml.io | TOML} encoded data.
 *
 * Be sure to read the supported types as not every spec is supported at the
 * moment and the handling in TypeScript side is a bit different.
 *
 * ## Supported types and handling
 *
 * - [x] [Keys](https://toml.io/en/latest#keys)
 * - [ ] [String](https://toml.io/en/latest#string)
 * - [x] [Multiline String](https://toml.io/en/latest#string)
 * - [x] [Literal String](https://toml.io/en/latest#string)
 * - [ ] [Integer](https://toml.io/en/latest#integer)
 * - [x] [Float](https://toml.io/en/latest#float)
 * - [x] [Boolean](https://toml.io/en/latest#boolean)
 * - [x] [Offset Date-time](https://toml.io/en/latest#offset-date-time)
 * - [x] [Local Date-time](https://toml.io/en/latest#local-date-time)
 * - [x] [Local Date](https://toml.io/en/latest#local-date)
 * - [ ] [Local Time](https://toml.io/en/latest#local-time)
 * - [x] [Table](https://toml.io/en/latest#table)
 * - [x] [Inline Table](https://toml.io/en/latest#inline-table)
 * - [ ] [Array of Tables](https://toml.io/en/latest#array-of-tables)
 *
 * _Supported with warnings see [Warning](#Warning)._
 *
 * ### Warning
 *
 * #### String
 *
 * Due to the spec, there is no flag to detect regex properly in a TOML
 * declaration. So the regex is stored as string.
 *
 * #### Integer
 *
 * For **Binary** / **Octal** / **Hexadecimal** numbers, they are stored as string
 * to be not interpreted as Decimal.
 *
 * #### Local Time
 *
 * Because local time does not exist in JavaScript, the local time is stored as a
 * string.
 *
 * #### Array of Tables
 *
 * At the moment only simple declarations like below are supported:
 *
 * ```toml
 * [[bin]]
 * name = "deno"
 * path = "cli/main.rs"
 *
 * [[bin]]
 * name = "deno_core"
 * path = "src/foo.rs"
 *
 * [[nib]]
 * name = "node"
 * path = "not_found"
 * ```
 *
 * will output:
 *
 * ```json
 * {
 *   "bin": [
 *     { "name": "deno", "path": "cli/main.rs" },
 *     { "name": "deno_core", "path": "src/foo.rs" }
 *   ],
 *   "nib": [{ "name": "node", "path": "not_found" }]
 * }
 * ```
 *
 * ```ts
 * import { parse, stringify } from "@std/toml";
 * import { assertEquals } from "@std/assert";
 *
 * const obj = {
 *   bin: [
 *     { name: "deno", path: "cli/main.rs" },
 *     { name: "deno_core", path: "src/foo.rs" },
 *   ],
 *   nib: [{ name: "node", path: "not_found" }],
 * };
 *
 * const tomlString = stringify(obj);
 * assertEquals(tomlString, `
 * [[bin]]
 * name = "deno"
 * path = "cli/main.rs"
 *
 * [[bin]]
 * name = "deno_core"
 * path = "src/foo.rs"
 *
 * [[nib]]
 * name = "node"
 * path = "not_found"
 * `);
 *
 * const tomlObject = parse(tomlString);
 * assertEquals(tomlObject, obj);
 * ```
 *
 * @module
 */
export * from "./stringify.ts";
export * from "./parse.ts";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvdG9tbC8xLjAuMTEvbW9kLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbi8qKlxuICoge0BsaW5rY29kZSBwYXJzZX0gYW5kIHtAbGlua2NvZGUgc3RyaW5naWZ5fSBmb3IgaGFuZGxpbmdcbiAqIHtAbGluayBodHRwczovL3RvbWwuaW8gfCBUT01MfSBlbmNvZGVkIGRhdGEuXG4gKlxuICogQmUgc3VyZSB0byByZWFkIHRoZSBzdXBwb3J0ZWQgdHlwZXMgYXMgbm90IGV2ZXJ5IHNwZWMgaXMgc3VwcG9ydGVkIGF0IHRoZVxuICogbW9tZW50IGFuZCB0aGUgaGFuZGxpbmcgaW4gVHlwZVNjcmlwdCBzaWRlIGlzIGEgYml0IGRpZmZlcmVudC5cbiAqXG4gKiAjIyBTdXBwb3J0ZWQgdHlwZXMgYW5kIGhhbmRsaW5nXG4gKlxuICogLSBbeF0gW0tleXNdKGh0dHBzOi8vdG9tbC5pby9lbi9sYXRlc3Qja2V5cylcbiAqIC0gWyBdIFtTdHJpbmddKGh0dHBzOi8vdG9tbC5pby9lbi9sYXRlc3Qjc3RyaW5nKVxuICogLSBbeF0gW011bHRpbGluZSBTdHJpbmddKGh0dHBzOi8vdG9tbC5pby9lbi9sYXRlc3Qjc3RyaW5nKVxuICogLSBbeF0gW0xpdGVyYWwgU3RyaW5nXShodHRwczovL3RvbWwuaW8vZW4vbGF0ZXN0I3N0cmluZylcbiAqIC0gWyBdIFtJbnRlZ2VyXShodHRwczovL3RvbWwuaW8vZW4vbGF0ZXN0I2ludGVnZXIpXG4gKiAtIFt4XSBbRmxvYXRdKGh0dHBzOi8vdG9tbC5pby9lbi9sYXRlc3QjZmxvYXQpXG4gKiAtIFt4XSBbQm9vbGVhbl0oaHR0cHM6Ly90b21sLmlvL2VuL2xhdGVzdCNib29sZWFuKVxuICogLSBbeF0gW09mZnNldCBEYXRlLXRpbWVdKGh0dHBzOi8vdG9tbC5pby9lbi9sYXRlc3Qjb2Zmc2V0LWRhdGUtdGltZSlcbiAqIC0gW3hdIFtMb2NhbCBEYXRlLXRpbWVdKGh0dHBzOi8vdG9tbC5pby9lbi9sYXRlc3QjbG9jYWwtZGF0ZS10aW1lKVxuICogLSBbeF0gW0xvY2FsIERhdGVdKGh0dHBzOi8vdG9tbC5pby9lbi9sYXRlc3QjbG9jYWwtZGF0ZSlcbiAqIC0gWyBdIFtMb2NhbCBUaW1lXShodHRwczovL3RvbWwuaW8vZW4vbGF0ZXN0I2xvY2FsLXRpbWUpXG4gKiAtIFt4XSBbVGFibGVdKGh0dHBzOi8vdG9tbC5pby9lbi9sYXRlc3QjdGFibGUpXG4gKiAtIFt4XSBbSW5saW5lIFRhYmxlXShodHRwczovL3RvbWwuaW8vZW4vbGF0ZXN0I2lubGluZS10YWJsZSlcbiAqIC0gWyBdIFtBcnJheSBvZiBUYWJsZXNdKGh0dHBzOi8vdG9tbC5pby9lbi9sYXRlc3QjYXJyYXktb2YtdGFibGVzKVxuICpcbiAqIF9TdXBwb3J0ZWQgd2l0aCB3YXJuaW5ncyBzZWUgW1dhcm5pbmddKCNXYXJuaW5nKS5fXG4gKlxuICogIyMjIFdhcm5pbmdcbiAqXG4gKiAjIyMjIFN0cmluZ1xuICpcbiAqIER1ZSB0byB0aGUgc3BlYywgdGhlcmUgaXMgbm8gZmxhZyB0byBkZXRlY3QgcmVnZXggcHJvcGVybHkgaW4gYSBUT01MXG4gKiBkZWNsYXJhdGlvbi4gU28gdGhlIHJlZ2V4IGlzIHN0b3JlZCBhcyBzdHJpbmcuXG4gKlxuICogIyMjIyBJbnRlZ2VyXG4gKlxuICogRm9yICoqQmluYXJ5KiogLyAqKk9jdGFsKiogLyAqKkhleGFkZWNpbWFsKiogbnVtYmVycywgdGhleSBhcmUgc3RvcmVkIGFzIHN0cmluZ1xuICogdG8gYmUgbm90IGludGVycHJldGVkIGFzIERlY2ltYWwuXG4gKlxuICogIyMjIyBMb2NhbCBUaW1lXG4gKlxuICogQmVjYXVzZSBsb2NhbCB0aW1lIGRvZXMgbm90IGV4aXN0IGluIEphdmFTY3JpcHQsIHRoZSBsb2NhbCB0aW1lIGlzIHN0b3JlZCBhcyBhXG4gKiBzdHJpbmcuXG4gKlxuICogIyMjIyBBcnJheSBvZiBUYWJsZXNcbiAqXG4gKiBBdCB0aGUgbW9tZW50IG9ubHkgc2ltcGxlIGRlY2xhcmF0aW9ucyBsaWtlIGJlbG93IGFyZSBzdXBwb3J0ZWQ6XG4gKlxuICogYGBgdG9tbFxuICogW1tiaW5dXVxuICogbmFtZSA9IFwiZGVub1wiXG4gKiBwYXRoID0gXCJjbGkvbWFpbi5yc1wiXG4gKlxuICogW1tiaW5dXVxuICogbmFtZSA9IFwiZGVub19jb3JlXCJcbiAqIHBhdGggPSBcInNyYy9mb28ucnNcIlxuICpcbiAqIFtbbmliXV1cbiAqIG5hbWUgPSBcIm5vZGVcIlxuICogcGF0aCA9IFwibm90X2ZvdW5kXCJcbiAqIGBgYFxuICpcbiAqIHdpbGwgb3V0cHV0OlxuICpcbiAqIGBgYGpzb25cbiAqIHtcbiAqICAgXCJiaW5cIjogW1xuICogICAgIHsgXCJuYW1lXCI6IFwiZGVub1wiLCBcInBhdGhcIjogXCJjbGkvbWFpbi5yc1wiIH0sXG4gKiAgICAgeyBcIm5hbWVcIjogXCJkZW5vX2NvcmVcIiwgXCJwYXRoXCI6IFwic3JjL2Zvby5yc1wiIH1cbiAqICAgXSxcbiAqICAgXCJuaWJcIjogW3sgXCJuYW1lXCI6IFwibm9kZVwiLCBcInBhdGhcIjogXCJub3RfZm91bmRcIiB9XVxuICogfVxuICogYGBgXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IHBhcnNlLCBzdHJpbmdpZnkgfSBmcm9tIFwiQHN0ZC90b21sXCI7XG4gKiBpbXBvcnQgeyBhc3NlcnRFcXVhbHMgfSBmcm9tIFwiQHN0ZC9hc3NlcnRcIjtcbiAqXG4gKiBjb25zdCBvYmogPSB7XG4gKiAgIGJpbjogW1xuICogICAgIHsgbmFtZTogXCJkZW5vXCIsIHBhdGg6IFwiY2xpL21haW4ucnNcIiB9LFxuICogICAgIHsgbmFtZTogXCJkZW5vX2NvcmVcIiwgcGF0aDogXCJzcmMvZm9vLnJzXCIgfSxcbiAqICAgXSxcbiAqICAgbmliOiBbeyBuYW1lOiBcIm5vZGVcIiwgcGF0aDogXCJub3RfZm91bmRcIiB9XSxcbiAqIH07XG4gKlxuICogY29uc3QgdG9tbFN0cmluZyA9IHN0cmluZ2lmeShvYmopO1xuICogYXNzZXJ0RXF1YWxzKHRvbWxTdHJpbmcsIGBcbiAqIFtbYmluXV1cbiAqIG5hbWUgPSBcImRlbm9cIlxuICogcGF0aCA9IFwiY2xpL21haW4ucnNcIlxuICpcbiAqIFtbYmluXV1cbiAqIG5hbWUgPSBcImRlbm9fY29yZVwiXG4gKiBwYXRoID0gXCJzcmMvZm9vLnJzXCJcbiAqXG4gKiBbW25pYl1dXG4gKiBuYW1lID0gXCJub2RlXCJcbiAqIHBhdGggPSBcIm5vdF9mb3VuZFwiXG4gKiBgKTtcbiAqXG4gKiBjb25zdCB0b21sT2JqZWN0ID0gcGFyc2UodG9tbFN0cmluZyk7XG4gKiBhc3NlcnRFcXVhbHModG9tbE9iamVjdCwgb2JqKTtcbiAqIGBgYFxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5leHBvcnQgKiBmcm9tIFwiLi9zdHJpbmdpZnkudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL3BhcnNlLnRzXCI7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEscURBQXFEO0FBQ3JELHFDQUFxQztBQUVyQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBeUdDLEdBRUQsY0FBYyxpQkFBaUI7QUFDL0IsY0FBYyxhQUFhIn0=
// denoCacheMetadata=16636398977768984470,10888535089645183108
