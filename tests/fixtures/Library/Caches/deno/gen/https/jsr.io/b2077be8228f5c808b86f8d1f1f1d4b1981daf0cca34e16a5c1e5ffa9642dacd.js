// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.
/** End-of-line character for POSIX platforms such as macOS and Linux. */ export const LF = "\n";
/** End-of-line character for Windows platforms. */ export const CRLF = "\r\n";
/**
 * End-of-line character evaluated for the current platform.
 *
 * @example Usage
 * ```ts ignore
 * import { EOL } from "@std/fs/eol";
 *
 * EOL; // "\n" on POSIX platforms and "\r\n" on Windows
 * ```
 */ export const EOL = // deno-lint-ignore no-explicit-any
  globalThis.Deno?.build.os === "windows" ? CRLF : LF;
const regDetect = /(?:\r?\n)/g;
/**
 * Returns the detected EOL character(s) detected in the input string. If no EOL
 * character is detected, `null` is returned.
 *
 * @param content The input string to detect EOL characters.
 *
 * @returns The detected EOL character(s) or `null` if no EOL character is detected.
 *
 * @example Usage
 * ```ts ignore
 * import { detect } from "@std/fs/eol";
 *
 * detect("deno\r\nis not\r\nnode"); // "\r\n"
 * detect("deno\nis not\r\nnode"); // "\r\n"
 * detect("deno\nis not\nnode"); // "\n"
 * detect("deno is not node"); // null
 * ```
 */ export function detect(content) {
  const d = content.match(regDetect);
  if (!d || d.length === 0) {
    return null;
  }
  const hasCRLF = d.some((x) => x === CRLF);
  return hasCRLF ? CRLF : LF;
}
/**
 * Normalize the input string to the targeted EOL.
 *
 * @param content The input string to normalize.
 * @param eol The EOL character(s) to normalize the input string to.
 *
 * @returns The input string normalized to the targeted EOL.
 *
 * @example Usage
 * ```ts ignore
 * import { LF, format } from "@std/fs/eol";
 *
 * const CRLFinput = "deno\r\nis not\r\nnode";
 *
 * format(CRLFinput, LF); // "deno\nis not\nnode"
 * ```
 */ export function format(content, eol) {
  return content.replace(regDetect, eol);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL2VvbC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI2IHRoZSBEZW5vIGF1dGhvcnMuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG4vKiogRW5kLW9mLWxpbmUgY2hhcmFjdGVyIGZvciBQT1NJWCBwbGF0Zm9ybXMgc3VjaCBhcyBtYWNPUyBhbmQgTGludXguICovXG5leHBvcnQgY29uc3QgTEYgPSBcIlxcblwiIGFzIGNvbnN0O1xuXG4vKiogRW5kLW9mLWxpbmUgY2hhcmFjdGVyIGZvciBXaW5kb3dzIHBsYXRmb3Jtcy4gKi9cbmV4cG9ydCBjb25zdCBDUkxGID0gXCJcXHJcXG5cIiBhcyBjb25zdDtcblxuLyoqXG4gKiBFbmQtb2YtbGluZSBjaGFyYWN0ZXIgZXZhbHVhdGVkIGZvciB0aGUgY3VycmVudCBwbGF0Zm9ybS5cbiAqXG4gKiBAZXhhbXBsZSBVc2FnZVxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyBFT0wgfSBmcm9tIFwiQHN0ZC9mcy9lb2xcIjtcbiAqXG4gKiBFT0w7IC8vIFwiXFxuXCIgb24gUE9TSVggcGxhdGZvcm1zIGFuZCBcIlxcclxcblwiIG9uIFdpbmRvd3NcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgRU9MOiBcIlxcblwiIHwgXCJcXHJcXG5cIiA9XG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIChnbG9iYWxUaGlzIGFzIGFueSkuRGVubz8uYnVpbGQub3MgPT09IFwid2luZG93c1wiID8gQ1JMRiA6IExGO1xuXG5jb25zdCByZWdEZXRlY3QgPSAvKD86XFxyP1xcbikvZztcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBkZXRlY3RlZCBFT0wgY2hhcmFjdGVyKHMpIGRldGVjdGVkIGluIHRoZSBpbnB1dCBzdHJpbmcuIElmIG5vIEVPTFxuICogY2hhcmFjdGVyIGlzIGRldGVjdGVkLCBgbnVsbGAgaXMgcmV0dXJuZWQuXG4gKlxuICogQHBhcmFtIGNvbnRlbnQgVGhlIGlucHV0IHN0cmluZyB0byBkZXRlY3QgRU9MIGNoYXJhY3RlcnMuXG4gKlxuICogQHJldHVybnMgVGhlIGRldGVjdGVkIEVPTCBjaGFyYWN0ZXIocykgb3IgYG51bGxgIGlmIG5vIEVPTCBjaGFyYWN0ZXIgaXMgZGV0ZWN0ZWQuXG4gKlxuICogQGV4YW1wbGUgVXNhZ2VcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgZGV0ZWN0IH0gZnJvbSBcIkBzdGQvZnMvZW9sXCI7XG4gKlxuICogZGV0ZWN0KFwiZGVub1xcclxcbmlzIG5vdFxcclxcbm5vZGVcIik7IC8vIFwiXFxyXFxuXCJcbiAqIGRldGVjdChcImRlbm9cXG5pcyBub3RcXHJcXG5ub2RlXCIpOyAvLyBcIlxcclxcblwiXG4gKiBkZXRlY3QoXCJkZW5vXFxuaXMgbm90XFxubm9kZVwiKTsgLy8gXCJcXG5cIlxuICogZGV0ZWN0KFwiZGVubyBpcyBub3Qgbm9kZVwiKTsgLy8gbnVsbFxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZXRlY3QoY29udGVudDogc3RyaW5nKTogdHlwZW9mIEVPTCB8IG51bGwge1xuICBjb25zdCBkID0gY29udGVudC5tYXRjaChyZWdEZXRlY3QpO1xuICBpZiAoIWQgfHwgZC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBoYXNDUkxGID0gZC5zb21lKCh4OiBzdHJpbmcpOiBib29sZWFuID0+IHggPT09IENSTEYpO1xuXG4gIHJldHVybiBoYXNDUkxGID8gQ1JMRiA6IExGO1xufVxuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgaW5wdXQgc3RyaW5nIHRvIHRoZSB0YXJnZXRlZCBFT0wuXG4gKlxuICogQHBhcmFtIGNvbnRlbnQgVGhlIGlucHV0IHN0cmluZyB0byBub3JtYWxpemUuXG4gKiBAcGFyYW0gZW9sIFRoZSBFT0wgY2hhcmFjdGVyKHMpIHRvIG5vcm1hbGl6ZSB0aGUgaW5wdXQgc3RyaW5nIHRvLlxuICpcbiAqIEByZXR1cm5zIFRoZSBpbnB1dCBzdHJpbmcgbm9ybWFsaXplZCB0byB0aGUgdGFyZ2V0ZWQgRU9MLlxuICpcbiAqIEBleGFtcGxlIFVzYWdlXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IExGLCBmb3JtYXQgfSBmcm9tIFwiQHN0ZC9mcy9lb2xcIjtcbiAqXG4gKiBjb25zdCBDUkxGaW5wdXQgPSBcImRlbm9cXHJcXG5pcyBub3RcXHJcXG5ub2RlXCI7XG4gKlxuICogZm9ybWF0KENSTEZpbnB1dCwgTEYpOyAvLyBcImRlbm9cXG5pcyBub3RcXG5ub2RlXCJcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0KGNvbnRlbnQ6IHN0cmluZywgZW9sOiB0eXBlb2YgRU9MKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNvbnRlbnQucmVwbGFjZShyZWdEZXRlY3QsIGVvbCk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEscURBQXFEO0FBQ3JELHFDQUFxQztBQUVyQyx1RUFBdUUsR0FDdkUsT0FBTyxNQUFNLEtBQUssS0FBYztBQUVoQyxpREFBaUQsR0FDakQsT0FBTyxNQUFNLE9BQU8sT0FBZ0I7QUFFcEM7Ozs7Ozs7OztDQVNDLEdBQ0QsT0FBTyxNQUFNLE1BRVgsQUFEQSxtQ0FBbUM7QUFDbEMsV0FBbUIsSUFBSSxFQUFFLE1BQU0sT0FBTyxZQUFZLE9BQU8sR0FBRztBQUUvRCxNQUFNLFlBQVk7QUFFbEI7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBaUJDLEdBQ0QsT0FBTyxTQUFTLE9BQU8sT0FBZTtFQUNwQyxNQUFNLElBQUksUUFBUSxLQUFLLENBQUM7RUFDeEIsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLEtBQUssR0FBRztJQUN4QixPQUFPO0VBQ1Q7RUFDQSxNQUFNLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUF1QixNQUFNO0VBRXJELE9BQU8sVUFBVSxPQUFPO0FBQzFCO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FnQkMsR0FDRCxPQUFPLFNBQVMsT0FBTyxPQUFlLEVBQUUsR0FBZTtFQUNyRCxPQUFPLFFBQVEsT0FBTyxDQUFDLFdBQVc7QUFDcEMifQ==
// denoCacheMetadata=15517005309470146580,3632808680982630159
