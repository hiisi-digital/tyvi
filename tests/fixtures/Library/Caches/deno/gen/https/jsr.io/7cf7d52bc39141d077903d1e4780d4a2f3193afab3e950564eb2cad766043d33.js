// Copyright 2018-2026 the Deno authors. MIT license.
// Copyright the Browserify authors. MIT License.
import { resolve } from "jsr:@std/path@^1.1.4/resolve";
import { SEPARATOR } from "jsr:@std/path@^1.1.4/constants";
import { toPathString } from "./_to_path_string.ts";
/**
 * Checks whether `src` is a sub-directory of `dest`.
 *
 * @param src Source file path as a string or URL.
 * @param dest Destination file path as a string or URL.
 * @param sep Path separator. Defaults to `\\` for Windows and `/` for other
 * platforms.
 *
 * @returns `true` if `src` is a sub-directory of `dest`, `false` otherwise.
 */ export function isSubdir(src, dest, sep = SEPARATOR) {
  src = toPathString(src);
  dest = toPathString(dest);
  if (resolve(src) === resolve(dest)) {
    return false;
  }
  const srcArray = src.split(sep);
  const destArray = dest.split(sep);
  return srcArray.every((current, i) => destArray[i] === current);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL19pc19zdWJkaXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNiB0aGUgRGVubyBhdXRob3JzLiBNSVQgbGljZW5zZS5cbi8vIENvcHlyaWdodCB0aGUgQnJvd3NlcmlmeSBhdXRob3JzLiBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gXCJqc3I6QHN0ZC9wYXRoQF4xLjEuNC9yZXNvbHZlXCI7XG5pbXBvcnQgeyBTRVBBUkFUT1IgfSBmcm9tIFwianNyOkBzdGQvcGF0aEBeMS4xLjQvY29uc3RhbnRzXCI7XG5pbXBvcnQgeyB0b1BhdGhTdHJpbmcgfSBmcm9tIFwiLi9fdG9fcGF0aF9zdHJpbmcudHNcIjtcblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBgc3JjYCBpcyBhIHN1Yi1kaXJlY3Rvcnkgb2YgYGRlc3RgLlxuICpcbiAqIEBwYXJhbSBzcmMgU291cmNlIGZpbGUgcGF0aCBhcyBhIHN0cmluZyBvciBVUkwuXG4gKiBAcGFyYW0gZGVzdCBEZXN0aW5hdGlvbiBmaWxlIHBhdGggYXMgYSBzdHJpbmcgb3IgVVJMLlxuICogQHBhcmFtIHNlcCBQYXRoIHNlcGFyYXRvci4gRGVmYXVsdHMgdG8gYFxcXFxgIGZvciBXaW5kb3dzIGFuZCBgL2AgZm9yIG90aGVyXG4gKiBwbGF0Zm9ybXMuXG4gKlxuICogQHJldHVybnMgYHRydWVgIGlmIGBzcmNgIGlzIGEgc3ViLWRpcmVjdG9yeSBvZiBgZGVzdGAsIGBmYWxzZWAgb3RoZXJ3aXNlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdWJkaXIoXG4gIHNyYzogc3RyaW5nIHwgVVJMLFxuICBkZXN0OiBzdHJpbmcgfCBVUkwsXG4gIHNlcCA9IFNFUEFSQVRPUixcbik6IGJvb2xlYW4ge1xuICBzcmMgPSB0b1BhdGhTdHJpbmcoc3JjKTtcbiAgZGVzdCA9IHRvUGF0aFN0cmluZyhkZXN0KTtcblxuICBpZiAocmVzb2x2ZShzcmMpID09PSByZXNvbHZlKGRlc3QpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3Qgc3JjQXJyYXkgPSBzcmMuc3BsaXQoc2VwKTtcbiAgY29uc3QgZGVzdEFycmF5ID0gZGVzdC5zcGxpdChzZXApO1xuXG4gIHJldHVybiBzcmNBcnJheS5ldmVyeSgoY3VycmVudCwgaSkgPT4gZGVzdEFycmF5W2ldID09PSBjdXJyZW50KTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxREFBcUQ7QUFDckQsaURBQWlEO0FBRWpELFNBQVMsT0FBTyxRQUFRLCtCQUErQjtBQUN2RCxTQUFTLFNBQVMsUUFBUSxpQ0FBaUM7QUFDM0QsU0FBUyxZQUFZLFFBQVEsdUJBQXVCO0FBRXBEOzs7Ozs7Ozs7Q0FTQyxHQUNELE9BQU8sU0FBUyxTQUNkLEdBQWlCLEVBQ2pCLElBQWtCLEVBQ2xCLE1BQU0sU0FBUztFQUVmLE1BQU0sYUFBYTtFQUNuQixPQUFPLGFBQWE7RUFFcEIsSUFBSSxRQUFRLFNBQVMsUUFBUSxPQUFPO0lBQ2xDLE9BQU87RUFDVDtFQUVBLE1BQU0sV0FBVyxJQUFJLEtBQUssQ0FBQztFQUMzQixNQUFNLFlBQVksS0FBSyxLQUFLLENBQUM7RUFFN0IsT0FBTyxTQUFTLEtBQUssQ0FBQyxDQUFDLFNBQVMsSUFBTSxTQUFTLENBQUMsRUFBRSxLQUFLO0FBQ3pEIn0=
// denoCacheMetadata=2199718704868454396,13009645708156255795
