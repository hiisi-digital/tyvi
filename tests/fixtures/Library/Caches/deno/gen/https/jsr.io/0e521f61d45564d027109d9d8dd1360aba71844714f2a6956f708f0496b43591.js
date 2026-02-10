// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
import { parserFactory, toml } from "./_parser.ts";
/**
 * Parses a {@link https://toml.io | TOML} string into an object.
 *
 * @example Usage
 * ```ts
 * import { parse } from "@std/toml/parse";
 * import { assertEquals } from "@std/assert";
 *
 * const tomlString = `title = "TOML Example"
 * [owner]
 * name = "Alice"
 * bio = "Alice is a programmer."`;
 *
 * const obj = parse(tomlString);
 * assertEquals(obj, { title: "TOML Example", owner: { name: "Alice", bio: "Alice is a programmer." } });
 * ```
 * @param tomlString TOML string to be parsed.
 * @returns The parsed JS object.
 */ export function parse(tomlString) {
  return parserFactory(toml)(tomlString);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvdG9tbC8xLjAuMTEvcGFyc2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNSB0aGUgRGVubyBhdXRob3JzLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuaW1wb3J0IHsgcGFyc2VyRmFjdG9yeSwgdG9tbCB9IGZyb20gXCIuL19wYXJzZXIudHNcIjtcblxuLyoqXG4gKiBQYXJzZXMgYSB7QGxpbmsgaHR0cHM6Ly90b21sLmlvIHwgVE9NTH0gc3RyaW5nIGludG8gYW4gb2JqZWN0LlxuICpcbiAqIEBleGFtcGxlIFVzYWdlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgcGFyc2UgfSBmcm9tIFwiQHN0ZC90b21sL3BhcnNlXCI7XG4gKiBpbXBvcnQgeyBhc3NlcnRFcXVhbHMgfSBmcm9tIFwiQHN0ZC9hc3NlcnRcIjtcbiAqXG4gKiBjb25zdCB0b21sU3RyaW5nID0gYHRpdGxlID0gXCJUT01MIEV4YW1wbGVcIlxuICogW293bmVyXVxuICogbmFtZSA9IFwiQWxpY2VcIlxuICogYmlvID0gXCJBbGljZSBpcyBhIHByb2dyYW1tZXIuXCJgO1xuICpcbiAqIGNvbnN0IG9iaiA9IHBhcnNlKHRvbWxTdHJpbmcpO1xuICogYXNzZXJ0RXF1YWxzKG9iaiwgeyB0aXRsZTogXCJUT01MIEV4YW1wbGVcIiwgb3duZXI6IHsgbmFtZTogXCJBbGljZVwiLCBiaW86IFwiQWxpY2UgaXMgYSBwcm9ncmFtbWVyLlwiIH0gfSk7XG4gKiBgYGBcbiAqIEBwYXJhbSB0b21sU3RyaW5nIFRPTUwgc3RyaW5nIHRvIGJlIHBhcnNlZC5cbiAqIEByZXR1cm5zIFRoZSBwYXJzZWQgSlMgb2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2UodG9tbFN0cmluZzogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICByZXR1cm4gcGFyc2VyRmFjdG9yeSh0b21sKSh0b21sU3RyaW5nKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxREFBcUQ7QUFDckQscUNBQXFDO0FBRXJDLFNBQVMsYUFBYSxFQUFFLElBQUksUUFBUSxlQUFlO0FBRW5EOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FrQkMsR0FDRCxPQUFPLFNBQVMsTUFBTSxVQUFrQjtFQUN0QyxPQUFPLGNBQWMsTUFBTTtBQUM3QiJ9
// denoCacheMetadata=15333221051552206086,16546768786498045295
