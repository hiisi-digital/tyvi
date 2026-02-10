// Copyright 2018-2026 the Deno authors. MIT license.
import { globToRegExp } from "jsr:@std/path@^1.1.4/glob-to-regexp";
import { joinGlobs } from "jsr:@std/path@^1.1.4/join-globs";
import { isGlob } from "jsr:@std/path@^1.1.4/is-glob";
import { isAbsolute } from "jsr:@std/path@^1.1.4/is-absolute";
import { resolve } from "jsr:@std/path@^1.1.4/resolve";
import { SEPARATOR_PATTERN } from "jsr:@std/path@^1.1.4/constants";
import { walk, walkSync } from "./walk.ts";
import { toPathString } from "./_to_path_string.ts";
import { createWalkEntry, createWalkEntrySync } from "./_create_walk_entry.ts";
import { isWindows } from "jsr:@std/internal@^1.0.12/os";
function split(path) {
  const s = SEPARATOR_PATTERN.source;
  const segments = path.replace(new RegExp(`^${s}|${s}$`, "g"), "").split(SEPARATOR_PATTERN);
  const isAbsolute_ = isAbsolute(path);
  const split = {
    segments,
    isAbsolute: isAbsolute_,
    hasTrailingSep: path.match(new RegExp(`${s}$`)) !== null,
  };
  if (isWindows && isAbsolute_) {
    split.winRoot = segments.shift();
  }
  return split;
}
function throwUnlessNotFound(error) {
  if (!(error instanceof Deno.errors.NotFound)) {
    throw error;
  }
}
function comparePath(a, b) {
  if (a.path < b.path) return -1;
  if (a.path > b.path) return 1;
  return 0;
}
/**
 * Returns an async iterator that yields each file path matching the given glob
 * pattern.
 *
 * The file paths are absolute paths. If `root` is not provided, the current
 * working directory is used. The `root` directory is not included in the
 * yielded file paths.
 *
 * Requires `--allow-read` permission.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param glob The glob pattern to expand.
 * @param options Additional options for the expansion.
 *
 * @returns An async iterator that yields each walk entry matching the glob
 * pattern.
 *
 * @example Basic usage
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── foo.ts
 * ```
 *
 * ```ts ignore
 * // script.ts
 * import { expandGlob } from "@std/fs/expand-glob";
 *
 * await Array.fromAsync(expandGlob("*.ts"));
 * // [
 * //   {
 * //     path: "/Users/user/folder/script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false,
 * //   },
 * //   {
 * //     path: "/Users/user/folder/foo.ts",
 * //     name: "foo.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false,
 * //   },
 * // ]
 * ```
 *
 * @example Define root directory
 *
 * Setting the `root` option to `/folder` will expand the glob pattern from the
 * `/folder` directory.
 *
 * File structure:
 * ```
 * folder
 * ├── subdir
 * │   └── bar.ts
 * ├── script.ts
 * └── foo.ts
 * ```
 *
 * ```ts ignore
 * // script.ts
 * import { expandGlob } from "@std/fs/expand-glob";
 *
 * await Array.fromAsync(expandGlob("*.ts", { root: "./subdir" }));
 * // [
 * //   {
 * //     path: "/Users/user/folder/subdir/bar.ts",
 * //     name: "bar.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false,
 * //   },
 * // ]
 * ```
 *
 * @example Exclude files
 *
 * Setting the `exclude` option to `["foo.ts"]` will exclude the `foo.ts` file
 * from the expansion.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── foo.ts
 * ```
 *
 * ```ts ignore
 * // script.ts
 * import { expandGlob } from "@std/fs/expand-glob";
 *
 * await Array.fromAsync(expandGlob("*.ts", { exclude: ["foo.ts"] }));
 * // [
 * //   {
 * //     path: "/Users/user/folder/script.ts",
 * //     name: "true.ts",
 * //     isFile: false,
 * //     isDirectory: false,
 * //     isSymlink: false,
 * //   },
 * // ]
 * ```
 *
 * @example Exclude directories
 *
 * Setting the `includeDirs` option to `false` will exclude directories from the
 * expansion.
 *
 * File structure:
 * ```
 * folder
 * ├── subdir
 * │   └── bar.ts
 * ├── script.ts
 * └── foo.ts
 * ```
 *
 * ```ts ignore
 * // script.ts
 * import { expandGlob } from "@std/fs/expand-glob";
 *
 * await Array.fromAsync(expandGlob("*", { includeDirs: false }));
 * // [
 * //   {
 * //     path: "/Users/user/folder/script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false,
 * //   },
 * //   {
 * //     path: "/Users/user/folder/foo.ts",
 * //     name: "foo.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false,
 * //   },
 * // ]
 * ```
 *
 * @example Follow symbolic links
 *
 * Setting the `followSymlinks` option to `true` will follow symbolic links.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── link.ts -> script.ts (symbolic link)
 * ```
 *
 * ```ts ignore
 * // script.ts
 * import { expandGlob } from "@std/fs/expand-glob";
 *
 * await Array.fromAsync(expandGlob("*.ts", { followSymlinks: true }));
 * // [
 * //   {
 * //     path: "/Users/user/folder/script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false,
 * //   },
 * //   {
 * //     path: "/Users/user/folder/symlink",
 * //     name: "symlink",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: true,
 * //   },
 * // ]
 * ```
 */ export async function* expandGlob(glob, options) {
  let {
    root,
    exclude = [],
    includeDirs = true,
    extended = true,
    globstar = true,
    caseInsensitive = false,
    followSymlinks = false,
    canonicalize = true,
  } = options ?? {};
  const { segments, isAbsolute: isGlobAbsolute, hasTrailingSep, winRoot } = split(
    toPathString(glob),
  );
  root ??= isGlobAbsolute ? winRoot ?? "/" : Deno.cwd();
  const globOptions = {
    extended,
    globstar,
    caseInsensitive,
  };
  const absRoot = isGlobAbsolute ? root : resolve(root); // root is always string here
  const resolveFromRoot = (path) => resolve(absRoot, path);
  const excludePatterns = exclude.map(resolveFromRoot).map((s) => globToRegExp(s, globOptions));
  const shouldInclude = (path) => !excludePatterns.some((p) => p.test(path));
  let fixedRoot = isGlobAbsolute ? winRoot ?? "/" : absRoot;
  while (segments.length > 0 && !isGlob(segments[0])) {
    const seg = segments.shift();
    fixedRoot = joinGlobs([
      fixedRoot,
      unescapeGlobSegment(seg),
    ], globOptions);
  }
  let fixedRootInfo;
  try {
    fixedRootInfo = await createWalkEntry(fixedRoot);
  } catch (error) {
    return throwUnlessNotFound(error);
  }
  async function* advanceMatch(walkInfo, globSegment) {
    if (!walkInfo.isDirectory) {
      return;
    } else if (globSegment === "..") {
      const parentPath = joinGlobs([
        walkInfo.path,
        "..",
      ], globOptions);
      if (shouldInclude(parentPath)) {
        return yield await createWalkEntry(parentPath);
      }
      return;
    } else if (globSegment === "**") {
      return yield* walk(walkInfo.path, {
        skip: excludePatterns,
        maxDepth: globstar ? Infinity : 1,
        followSymlinks,
        canonicalize,
      });
    }
    const globPattern = globToRegExp(globSegment, globOptions);
    for await (
      const walkEntry of walk(walkInfo.path, {
        maxDepth: 1,
        skip: excludePatterns,
        followSymlinks,
      })
    ) {
      if (walkEntry.path !== walkInfo.path && walkEntry.name.match(globPattern)) {
        yield walkEntry;
      }
    }
  }
  let currentMatches = [
    fixedRootInfo,
  ];
  for (const segment of segments) {
    // Advancing the list of current matches may introduce duplicates, so we
    // pass everything through this Map.
    const nextMatchMap = new Map();
    await Promise.all(currentMatches.map(async (currentMatch) => {
      for await (const nextMatch of advanceMatch(currentMatch, segment)) {
        nextMatchMap.set(nextMatch.path, nextMatch);
      }
    }));
    currentMatches = [
      ...nextMatchMap.values(),
    ].sort(comparePath);
  }
  if (hasTrailingSep) {
    currentMatches = currentMatches.filter((entry) => entry.isDirectory);
  }
  if (!includeDirs) {
    currentMatches = currentMatches.filter((entry) => !entry.isDirectory);
  }
  yield* currentMatches;
}
/**
 * Returns an iterator that yields each file path matching the given glob
 * pattern. The file paths are relative to the provided `root` directory.
 * If `root` is not provided, the current working directory is used.
 * The `root` directory is not included in the yielded file paths.
 *
 * Requires the `--allow-read` flag.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param glob The glob pattern to expand.
 * @param options Additional options for the expansion.
 *
 * @returns An iterator that yields each walk entry matching the glob pattern.
 *
 * @example Usage
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── foo.ts
 * ```
 *
 * ```ts ignore
 * // script.ts
 * import { expandGlobSync } from "@std/fs/expand-glob";
 *
 * const entries = [];
 * for (const entry of expandGlobSync("*.ts")) {
 *   entries.push(entry);
 * }
 *
 * entries[0]!.path; // "/Users/user/folder/script.ts"
 * entries[0]!.name; // "script.ts"
 * entries[0]!.isFile; // false
 * entries[0]!.isDirectory; // true
 * entries[0]!.isSymlink; // false
 *
 * entries[1]!.path; // "/Users/user/folder/foo.ts"
 * entries[1]!.name; // "foo.ts"
 * entries[1]!.isFile; // true
 * entries[1]!.isDirectory; // false
 * entries[1]!.isSymlink; // false
 * ```
 */ export function* expandGlobSync(glob, options) {
  let {
    root,
    exclude = [],
    includeDirs = true,
    extended = true,
    globstar = true,
    caseInsensitive = false,
    followSymlinks = false,
    canonicalize = true,
  } = options ?? {};
  const { segments, isAbsolute: isGlobAbsolute, hasTrailingSep, winRoot } = split(
    toPathString(glob),
  );
  root ??= isGlobAbsolute ? winRoot ?? "/" : Deno.cwd();
  const globOptions = {
    extended,
    globstar,
    caseInsensitive,
  };
  const absRoot = isGlobAbsolute ? root : resolve(root); // root is always string here
  const resolveFromRoot = (path) => resolve(absRoot, path);
  const excludePatterns = exclude.map(resolveFromRoot).map((s) => globToRegExp(s, globOptions));
  const shouldInclude = (path) => !excludePatterns.some((p) => p.test(path));
  let fixedRoot = isGlobAbsolute ? winRoot ?? "/" : absRoot;
  while (segments.length > 0 && !isGlob(segments[0])) {
    const seg = segments.shift();
    fixedRoot = joinGlobs([
      fixedRoot,
      unescapeGlobSegment(seg),
    ], globOptions);
  }
  let fixedRootInfo;
  try {
    fixedRootInfo = createWalkEntrySync(fixedRoot);
  } catch (error) {
    return throwUnlessNotFound(error);
  }
  function* advanceMatch(walkInfo, globSegment) {
    if (!walkInfo.isDirectory) {
      return;
    } else if (globSegment === "..") {
      const parentPath = joinGlobs([
        walkInfo.path,
        "..",
      ], globOptions);
      if (shouldInclude(parentPath)) {
        return yield createWalkEntrySync(parentPath);
      }
      return;
    } else if (globSegment === "**") {
      return yield* walkSync(walkInfo.path, {
        skip: excludePatterns,
        maxDepth: globstar ? Infinity : 1,
        followSymlinks,
        canonicalize,
      });
    }
    const globPattern = globToRegExp(globSegment, globOptions);
    for (
      const walkEntry of walkSync(walkInfo.path, {
        maxDepth: 1,
        skip: excludePatterns,
        followSymlinks,
      })
    ) {
      if (walkEntry.path !== walkInfo.path && walkEntry.name.match(globPattern)) {
        yield walkEntry;
      }
    }
  }
  let currentMatches = [
    fixedRootInfo,
  ];
  for (const segment of segments) {
    // Advancing the list of current matches may introduce duplicates, so we
    // pass everything through this Map.
    const nextMatchMap = new Map();
    for (const currentMatch of currentMatches) {
      for (const nextMatch of advanceMatch(currentMatch, segment)) {
        nextMatchMap.set(nextMatch.path, nextMatch);
      }
    }
    currentMatches = [
      ...nextMatchMap.values(),
    ].sort(comparePath);
  }
  if (hasTrailingSep) {
    currentMatches = currentMatches.filter((entry) => entry.isDirectory);
  }
  if (!includeDirs) {
    currentMatches = currentMatches.filter((entry) => !entry.isDirectory);
  }
  yield* currentMatches;
}
const globEscapeChar = // deno-lint-ignore no-explicit-any
  globalThis.Deno?.build.os === "windows" ? "`" : `\\`;
const globMetachars = "*?{}[]()|+@!";
function unescapeGlobSegment(segment) {
  let result = "";
  let lastIndex = 0;
  for (let i = 0; i < segment.length; i++) {
    const char = segment[i];
    if (char === globEscapeChar) {
      const nextChar = segment[i + 1];
      if (nextChar && globMetachars.includes(nextChar)) {
        // append the slice before the escape char, then the metachar
        result += segment.slice(lastIndex, i) + nextChar;
        i++; // skip next char since we already processed it
        lastIndex = i + 1;
      }
    }
  }
  // no escaped, return the original segment
  if (lastIndex === 0) {
    return segment;
  }
  // append any remaining characters
  result += segment.slice(lastIndex);
  return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL2V4cGFuZF9nbG9iLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjYgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG5pbXBvcnQgeyB0eXBlIEdsb2JPcHRpb25zLCBnbG9iVG9SZWdFeHAgfSBmcm9tIFwianNyOkBzdGQvcGF0aEBeMS4xLjQvZ2xvYi10by1yZWdleHBcIjtcbmltcG9ydCB7IGpvaW5HbG9icyB9IGZyb20gXCJqc3I6QHN0ZC9wYXRoQF4xLjEuNC9qb2luLWdsb2JzXCI7XG5pbXBvcnQgeyBpc0dsb2IgfSBmcm9tIFwianNyOkBzdGQvcGF0aEBeMS4xLjQvaXMtZ2xvYlwiO1xuaW1wb3J0IHsgaXNBYnNvbHV0ZSB9IGZyb20gXCJqc3I6QHN0ZC9wYXRoQF4xLjEuNC9pcy1hYnNvbHV0ZVwiO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gXCJqc3I6QHN0ZC9wYXRoQF4xLjEuNC9yZXNvbHZlXCI7XG5pbXBvcnQgeyBTRVBBUkFUT1JfUEFUVEVSTiB9IGZyb20gXCJqc3I6QHN0ZC9wYXRoQF4xLjEuNC9jb25zdGFudHNcIjtcbmltcG9ydCB7IHdhbGssIHdhbGtTeW5jIH0gZnJvbSBcIi4vd2Fsay50c1wiO1xuaW1wb3J0IHsgdG9QYXRoU3RyaW5nIH0gZnJvbSBcIi4vX3RvX3BhdGhfc3RyaW5nLnRzXCI7XG5pbXBvcnQge1xuICBjcmVhdGVXYWxrRW50cnksXG4gIGNyZWF0ZVdhbGtFbnRyeVN5bmMsXG4gIHR5cGUgV2Fsa0VudHJ5LFxufSBmcm9tIFwiLi9fY3JlYXRlX3dhbGtfZW50cnkudHNcIjtcbmltcG9ydCB7IGlzV2luZG93cyB9IGZyb20gXCJqc3I6QHN0ZC9pbnRlcm5hbEBeMS4wLjEyL29zXCI7XG5cbmV4cG9ydCB0eXBlIHsgR2xvYk9wdGlvbnMsIFdhbGtFbnRyeSB9O1xuXG4vKiogT3B0aW9ucyBmb3Ige0BsaW5rY29kZSBleHBhbmRHbG9ifSBhbmQge0BsaW5rY29kZSBleHBhbmRHbG9iU3luY30uICovXG5leHBvcnQgaW50ZXJmYWNlIEV4cGFuZEdsb2JPcHRpb25zIGV4dGVuZHMgT21pdDxHbG9iT3B0aW9ucywgXCJvc1wiPiB7XG4gIC8qKlxuICAgKiBGaWxlIHBhdGggd2hlcmUgdG8gZXhwYW5kIGZyb20uXG4gICAqXG4gICAqIEBkZWZhdWx0IHtEZW5vLmN3ZCgpfVxuICAgKi9cbiAgcm9vdD86IHN0cmluZztcbiAgLyoqXG4gICAqIExpc3Qgb2YgZ2xvYiBwYXR0ZXJucyB0byBiZSBleGNsdWRlZCBmcm9tIHRoZSBleHBhbnNpb24uXG4gICAqXG4gICAqIEBkZWZhdWx0IHtbXX1cbiAgICovXG4gIGV4Y2x1ZGU/OiBzdHJpbmdbXTtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gaW5jbHVkZSBkaXJlY3RvcmllcyBpbiBlbnRyaWVzLlxuICAgKlxuICAgKiBAZGVmYXVsdCB7dHJ1ZX1cbiAgICovXG4gIGluY2x1ZGVEaXJzPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZm9sbG93IHN5bWJvbGljIGxpbmtzLlxuICAgKlxuICAgKiBAZGVmYXVsdCB7ZmFsc2V9XG4gICAqL1xuICBmb2xsb3dTeW1saW5rcz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgd2hldGhlciB0aGUgZm9sbG93ZWQgc3ltbGluaydzIHBhdGggc2hvdWxkIGJlIGNhbm9uaWNhbGl6ZWQuXG4gICAqIFRoaXMgb3B0aW9uIHdvcmtzIG9ubHkgaWYgYGZvbGxvd1N5bWxpbmtzYCBpcyBub3QgYGZhbHNlYC5cbiAgICpcbiAgICogQGRlZmF1bHQge3RydWV9XG4gICAqL1xuICBjYW5vbmljYWxpemU/OiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgU3BsaXRQYXRoIHtcbiAgc2VnbWVudHM6IHN0cmluZ1tdO1xuICBpc0Fic29sdXRlOiBib29sZWFuO1xuICBoYXNUcmFpbGluZ1NlcDogYm9vbGVhbjtcbiAgLy8gRGVmaW5lZCBmb3IgYW55IGFic29sdXRlIFdpbmRvd3MgcGF0aC5cbiAgd2luUm9vdD86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gc3BsaXQocGF0aDogc3RyaW5nKTogU3BsaXRQYXRoIHtcbiAgY29uc3QgcyA9IFNFUEFSQVRPUl9QQVRURVJOLnNvdXJjZTtcbiAgY29uc3Qgc2VnbWVudHMgPSBwYXRoXG4gICAgLnJlcGxhY2UobmV3IFJlZ0V4cChgXiR7c318JHtzfSRgLCBcImdcIiksIFwiXCIpXG4gICAgLnNwbGl0KFNFUEFSQVRPUl9QQVRURVJOKTtcbiAgY29uc3QgaXNBYnNvbHV0ZV8gPSBpc0Fic29sdXRlKHBhdGgpO1xuICBjb25zdCBzcGxpdDogU3BsaXRQYXRoID0ge1xuICAgIHNlZ21lbnRzLFxuICAgIGlzQWJzb2x1dGU6IGlzQWJzb2x1dGVfLFxuICAgIGhhc1RyYWlsaW5nU2VwOiBwYXRoLm1hdGNoKG5ldyBSZWdFeHAoYCR7c30kYCkpICE9PSBudWxsLFxuICB9O1xuICBpZiAoaXNXaW5kb3dzICYmIGlzQWJzb2x1dGVfKSB7XG4gICAgc3BsaXQud2luUm9vdCA9IHNlZ21lbnRzLnNoaWZ0KCkhO1xuICB9XG4gIHJldHVybiBzcGxpdDtcbn1cblxuZnVuY3Rpb24gdGhyb3dVbmxlc3NOb3RGb3VuZChlcnJvcjogdW5rbm93bikge1xuICBpZiAoIShlcnJvciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSkge1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVQYXRoKGE6IFdhbGtFbnRyeSwgYjogV2Fsa0VudHJ5KTogbnVtYmVyIHtcbiAgaWYgKGEucGF0aCA8IGIucGF0aCkgcmV0dXJuIC0xO1xuICBpZiAoYS5wYXRoID4gYi5wYXRoKSByZXR1cm4gMTtcbiAgcmV0dXJuIDA7XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBhc3luYyBpdGVyYXRvciB0aGF0IHlpZWxkcyBlYWNoIGZpbGUgcGF0aCBtYXRjaGluZyB0aGUgZ2l2ZW4gZ2xvYlxuICogcGF0dGVybi5cbiAqXG4gKiBUaGUgZmlsZSBwYXRocyBhcmUgYWJzb2x1dGUgcGF0aHMuIElmIGByb290YCBpcyBub3QgcHJvdmlkZWQsIHRoZSBjdXJyZW50XG4gKiB3b3JraW5nIGRpcmVjdG9yeSBpcyB1c2VkLiBUaGUgYHJvb3RgIGRpcmVjdG9yeSBpcyBub3QgaW5jbHVkZWQgaW4gdGhlXG4gKiB5aWVsZGVkIGZpbGUgcGF0aHMuXG4gKlxuICogUmVxdWlyZXMgYC0tYWxsb3ctcmVhZGAgcGVybWlzc2lvbi5cbiAqXG4gKiBAc2VlIHtAbGluayBodHRwczovL2RvY3MuZGVuby5jb20vcnVudGltZS9tYW51YWwvYmFzaWNzL3Blcm1pc3Npb25zI2ZpbGUtc3lzdGVtLWFjY2Vzc31cbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIERlbm8ncyBwZXJtaXNzaW9ucyBzeXN0ZW0uXG4gKlxuICogQHBhcmFtIGdsb2IgVGhlIGdsb2IgcGF0dGVybiB0byBleHBhbmQuXG4gKiBAcGFyYW0gb3B0aW9ucyBBZGRpdGlvbmFsIG9wdGlvbnMgZm9yIHRoZSBleHBhbnNpb24uXG4gKlxuICogQHJldHVybnMgQW4gYXN5bmMgaXRlcmF0b3IgdGhhdCB5aWVsZHMgZWFjaCB3YWxrIGVudHJ5IG1hdGNoaW5nIHRoZSBnbG9iXG4gKiBwYXR0ZXJuLlxuICpcbiAqIEBleGFtcGxlIEJhc2ljIHVzYWdlXG4gKlxuICogRmlsZSBzdHJ1Y3R1cmU6XG4gKiBgYGBcbiAqIGZvbGRlclxuICog4pSc4pSA4pSAIHNjcmlwdC50c1xuICog4pSU4pSA4pSAIGZvby50c1xuICogYGBgXG4gKlxuICogYGBgdHMgaWdub3JlXG4gKiAvLyBzY3JpcHQudHNcbiAqIGltcG9ydCB7IGV4cGFuZEdsb2IgfSBmcm9tIFwiQHN0ZC9mcy9leHBhbmQtZ2xvYlwiO1xuICpcbiAqIGF3YWl0IEFycmF5LmZyb21Bc3luYyhleHBhbmRHbG9iKFwiKi50c1wiKSk7XG4gKiAvLyBbXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcIi9Vc2Vycy91c2VyL2ZvbGRlci9zY3JpcHQudHNcIixcbiAqIC8vICAgICBuYW1lOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIGlzRmlsZTogdHJ1ZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZSxcbiAqIC8vICAgfSxcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwiL1VzZXJzL3VzZXIvZm9sZGVyL2Zvby50c1wiLFxuICogLy8gICAgIG5hbWU6IFwiZm9vLnRzXCIsXG4gKiAvLyAgICAgaXNGaWxlOiB0cnVlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiBmYWxzZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlLFxuICogLy8gICB9LFxuICogLy8gXVxuICogYGBgXG4gKlxuICogQGV4YW1wbGUgRGVmaW5lIHJvb3QgZGlyZWN0b3J5XG4gKlxuICogU2V0dGluZyB0aGUgYHJvb3RgIG9wdGlvbiB0byBgL2ZvbGRlcmAgd2lsbCBleHBhbmQgdGhlIGdsb2IgcGF0dGVybiBmcm9tIHRoZVxuICogYC9mb2xkZXJgIGRpcmVjdG9yeS5cbiAqXG4gKiBGaWxlIHN0cnVjdHVyZTpcbiAqIGBgYFxuICogZm9sZGVyXG4gKiDilJzilIDilIAgc3ViZGlyXG4gKiDilIIgICDilJTilIDilIAgYmFyLnRzXG4gKiDilJzilIDilIAgc2NyaXB0LnRzXG4gKiDilJTilIDilIAgZm9vLnRzXG4gKiBgYGBcbiAqXG4gKiBgYGB0cyBpZ25vcmVcbiAqIC8vIHNjcmlwdC50c1xuICogaW1wb3J0IHsgZXhwYW5kR2xvYiB9IGZyb20gXCJAc3RkL2ZzL2V4cGFuZC1nbG9iXCI7XG4gKlxuICogYXdhaXQgQXJyYXkuZnJvbUFzeW5jKGV4cGFuZEdsb2IoXCIqLnRzXCIsIHsgcm9vdDogXCIuL3N1YmRpclwiIH0pKTtcbiAqIC8vIFtcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwiL1VzZXJzL3VzZXIvZm9sZGVyL3N1YmRpci9iYXIudHNcIixcbiAqIC8vICAgICBuYW1lOiBcImJhci50c1wiLFxuICogLy8gICAgIGlzRmlsZTogdHJ1ZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZSxcbiAqIC8vICAgfSxcbiAqIC8vIF1cbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlIEV4Y2x1ZGUgZmlsZXNcbiAqXG4gKiBTZXR0aW5nIHRoZSBgZXhjbHVkZWAgb3B0aW9uIHRvIGBbXCJmb28udHNcIl1gIHdpbGwgZXhjbHVkZSB0aGUgYGZvby50c2AgZmlsZVxuICogZnJvbSB0aGUgZXhwYW5zaW9uLlxuICpcbiAqIEZpbGUgc3RydWN0dXJlOlxuICogYGBgXG4gKiBmb2xkZXJcbiAqIOKUnOKUgOKUgCBzY3JpcHQudHNcbiAqIOKUlOKUgOKUgCBmb28udHNcbiAqIGBgYFxuICpcbiAqIGBgYHRzIGlnbm9yZVxuICogLy8gc2NyaXB0LnRzXG4gKiBpbXBvcnQgeyBleHBhbmRHbG9iIH0gZnJvbSBcIkBzdGQvZnMvZXhwYW5kLWdsb2JcIjtcbiAqXG4gKiBhd2FpdCBBcnJheS5mcm9tQXN5bmMoZXhwYW5kR2xvYihcIioudHNcIiwgeyBleGNsdWRlOiBbXCJmb28udHNcIl0gfSkpO1xuICogLy8gW1xuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCIvVXNlcnMvdXNlci9mb2xkZXIvc2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgbmFtZTogXCJ0cnVlLnRzXCIsXG4gKiAvLyAgICAgaXNGaWxlOiBmYWxzZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZSxcbiAqIC8vICAgfSxcbiAqIC8vIF1cbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlIEV4Y2x1ZGUgZGlyZWN0b3JpZXNcbiAqXG4gKiBTZXR0aW5nIHRoZSBgaW5jbHVkZURpcnNgIG9wdGlvbiB0byBgZmFsc2VgIHdpbGwgZXhjbHVkZSBkaXJlY3RvcmllcyBmcm9tIHRoZVxuICogZXhwYW5zaW9uLlxuICpcbiAqIEZpbGUgc3RydWN0dXJlOlxuICogYGBgXG4gKiBmb2xkZXJcbiAqIOKUnOKUgOKUgCBzdWJkaXJcbiAqIOKUgiAgIOKUlOKUgOKUgCBiYXIudHNcbiAqIOKUnOKUgOKUgCBzY3JpcHQudHNcbiAqIOKUlOKUgOKUgCBmb28udHNcbiAqIGBgYFxuICpcbiAqIGBgYHRzIGlnbm9yZVxuICogLy8gc2NyaXB0LnRzXG4gKiBpbXBvcnQgeyBleHBhbmRHbG9iIH0gZnJvbSBcIkBzdGQvZnMvZXhwYW5kLWdsb2JcIjtcbiAqXG4gKiBhd2FpdCBBcnJheS5mcm9tQXN5bmMoZXhwYW5kR2xvYihcIipcIiwgeyBpbmNsdWRlRGlyczogZmFsc2UgfSkpO1xuICogLy8gW1xuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCIvVXNlcnMvdXNlci9mb2xkZXIvc2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgbmFtZTogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBpc0ZpbGU6IHRydWUsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IGZhbHNlLFxuICogLy8gICAgIGlzU3ltbGluazogZmFsc2UsXG4gKiAvLyAgIH0sXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcIi9Vc2Vycy91c2VyL2ZvbGRlci9mb28udHNcIixcbiAqIC8vICAgICBuYW1lOiBcImZvby50c1wiLFxuICogLy8gICAgIGlzRmlsZTogdHJ1ZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZSxcbiAqIC8vICAgfSxcbiAqIC8vIF1cbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlIEZvbGxvdyBzeW1ib2xpYyBsaW5rc1xuICpcbiAqIFNldHRpbmcgdGhlIGBmb2xsb3dTeW1saW5rc2Agb3B0aW9uIHRvIGB0cnVlYCB3aWxsIGZvbGxvdyBzeW1ib2xpYyBsaW5rcy5cbiAqXG4gKiBGaWxlIHN0cnVjdHVyZTpcbiAqIGBgYFxuICogZm9sZGVyXG4gKiDilJzilIDilIAgc2NyaXB0LnRzXG4gKiDilJTilIDilIAgbGluay50cyAtPiBzY3JpcHQudHMgKHN5bWJvbGljIGxpbmspXG4gKiBgYGBcbiAqXG4gKiBgYGB0cyBpZ25vcmVcbiAqIC8vIHNjcmlwdC50c1xuICogaW1wb3J0IHsgZXhwYW5kR2xvYiB9IGZyb20gXCJAc3RkL2ZzL2V4cGFuZC1nbG9iXCI7XG4gKlxuICogYXdhaXQgQXJyYXkuZnJvbUFzeW5jKGV4cGFuZEdsb2IoXCIqLnRzXCIsIHsgZm9sbG93U3ltbGlua3M6IHRydWUgfSkpO1xuICogLy8gW1xuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCIvVXNlcnMvdXNlci9mb2xkZXIvc2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgbmFtZTogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBpc0ZpbGU6IHRydWUsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IGZhbHNlLFxuICogLy8gICAgIGlzU3ltbGluazogZmFsc2UsXG4gKiAvLyAgIH0sXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcIi9Vc2Vycy91c2VyL2ZvbGRlci9zeW1saW5rXCIsXG4gKiAvLyAgICAgbmFtZTogXCJzeW1saW5rXCIsXG4gKiAvLyAgICAgaXNGaWxlOiB0cnVlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiBmYWxzZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IHRydWUsXG4gKiAvLyAgIH0sXG4gKiAvLyBdXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiBleHBhbmRHbG9iKFxuICBnbG9iOiBzdHJpbmcgfCBVUkwsXG4gIG9wdGlvbnM/OiBFeHBhbmRHbG9iT3B0aW9ucyxcbik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxXYWxrRW50cnk+IHtcbiAgbGV0IHtcbiAgICByb290LFxuICAgIGV4Y2x1ZGUgPSBbXSxcbiAgICBpbmNsdWRlRGlycyA9IHRydWUsXG4gICAgZXh0ZW5kZWQgPSB0cnVlLFxuICAgIGdsb2JzdGFyID0gdHJ1ZSxcbiAgICBjYXNlSW5zZW5zaXRpdmUgPSBmYWxzZSxcbiAgICBmb2xsb3dTeW1saW5rcyA9IGZhbHNlLFxuICAgIGNhbm9uaWNhbGl6ZSA9IHRydWUsXG4gIH0gPSBvcHRpb25zID8/IHt9O1xuXG4gIGNvbnN0IHtcbiAgICBzZWdtZW50cyxcbiAgICBpc0Fic29sdXRlOiBpc0dsb2JBYnNvbHV0ZSxcbiAgICBoYXNUcmFpbGluZ1NlcCxcbiAgICB3aW5Sb290LFxuICB9ID0gc3BsaXQodG9QYXRoU3RyaW5nKGdsb2IpKTtcbiAgcm9vdCA/Pz0gaXNHbG9iQWJzb2x1dGUgPyB3aW5Sb290ID8/IFwiL1wiIDogRGVuby5jd2QoKTtcblxuICBjb25zdCBnbG9iT3B0aW9uczogR2xvYk9wdGlvbnMgPSB7IGV4dGVuZGVkLCBnbG9ic3RhciwgY2FzZUluc2Vuc2l0aXZlIH07XG4gIGNvbnN0IGFic1Jvb3QgPSBpc0dsb2JBYnNvbHV0ZSA/IHJvb3QgOiByZXNvbHZlKHJvb3QhKTsgLy8gcm9vdCBpcyBhbHdheXMgc3RyaW5nIGhlcmVcbiAgY29uc3QgcmVzb2x2ZUZyb21Sb290ID0gKHBhdGg6IHN0cmluZyk6IHN0cmluZyA9PiByZXNvbHZlKGFic1Jvb3QsIHBhdGgpO1xuICBjb25zdCBleGNsdWRlUGF0dGVybnMgPSBleGNsdWRlXG4gICAgLm1hcChyZXNvbHZlRnJvbVJvb3QpXG4gICAgLm1hcCgoczogc3RyaW5nKTogUmVnRXhwID0+IGdsb2JUb1JlZ0V4cChzLCBnbG9iT3B0aW9ucykpO1xuICBjb25zdCBzaG91bGRJbmNsdWRlID0gKHBhdGg6IHN0cmluZykgPT5cbiAgICAhZXhjbHVkZVBhdHRlcm5zLnNvbWUoKHApID0+IHAudGVzdChwYXRoKSk7XG5cbiAgbGV0IGZpeGVkUm9vdCA9IGlzR2xvYkFic29sdXRlID8gd2luUm9vdCA/PyBcIi9cIiA6IGFic1Jvb3Q7XG4gIHdoaWxlIChzZWdtZW50cy5sZW5ndGggPiAwICYmICFpc0dsb2Ioc2VnbWVudHNbMF0hKSkge1xuICAgIGNvbnN0IHNlZyA9IHNlZ21lbnRzLnNoaWZ0KCkhO1xuICAgIGZpeGVkUm9vdCA9IGpvaW5HbG9icyhbZml4ZWRSb290LCB1bmVzY2FwZUdsb2JTZWdtZW50KHNlZyldLCBnbG9iT3B0aW9ucyk7XG4gIH1cblxuICBsZXQgZml4ZWRSb290SW5mbzogV2Fsa0VudHJ5O1xuICB0cnkge1xuICAgIGZpeGVkUm9vdEluZm8gPSBhd2FpdCBjcmVhdGVXYWxrRW50cnkoZml4ZWRSb290KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4gdGhyb3dVbmxlc3NOb3RGb3VuZChlcnJvcik7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiogYWR2YW5jZU1hdGNoKFxuICAgIHdhbGtJbmZvOiBXYWxrRW50cnksXG4gICAgZ2xvYlNlZ21lbnQ6IHN0cmluZyxcbiAgKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFdhbGtFbnRyeT4ge1xuICAgIGlmICghd2Fsa0luZm8uaXNEaXJlY3RvcnkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKGdsb2JTZWdtZW50ID09PSBcIi4uXCIpIHtcbiAgICAgIGNvbnN0IHBhcmVudFBhdGggPSBqb2luR2xvYnMoW3dhbGtJbmZvLnBhdGgsIFwiLi5cIl0sIGdsb2JPcHRpb25zKTtcbiAgICAgIGlmIChzaG91bGRJbmNsdWRlKHBhcmVudFBhdGgpKSB7XG4gICAgICAgIHJldHVybiB5aWVsZCBhd2FpdCBjcmVhdGVXYWxrRW50cnkocGFyZW50UGF0aCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChnbG9iU2VnbWVudCA9PT0gXCIqKlwiKSB7XG4gICAgICByZXR1cm4geWllbGQqIHdhbGsod2Fsa0luZm8ucGF0aCwge1xuICAgICAgICBza2lwOiBleGNsdWRlUGF0dGVybnMsXG4gICAgICAgIG1heERlcHRoOiBnbG9ic3RhciA/IEluZmluaXR5IDogMSxcbiAgICAgICAgZm9sbG93U3ltbGlua3MsXG4gICAgICAgIGNhbm9uaWNhbGl6ZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCBnbG9iUGF0dGVybiA9IGdsb2JUb1JlZ0V4cChnbG9iU2VnbWVudCwgZ2xvYk9wdGlvbnMpO1xuICAgIGZvciBhd2FpdCAoXG4gICAgICBjb25zdCB3YWxrRW50cnkgb2Ygd2Fsayh3YWxrSW5mby5wYXRoLCB7XG4gICAgICAgIG1heERlcHRoOiAxLFxuICAgICAgICBza2lwOiBleGNsdWRlUGF0dGVybnMsXG4gICAgICAgIGZvbGxvd1N5bWxpbmtzLFxuICAgICAgfSlcbiAgICApIHtcbiAgICAgIGlmIChcbiAgICAgICAgd2Fsa0VudHJ5LnBhdGggIT09IHdhbGtJbmZvLnBhdGggJiZcbiAgICAgICAgd2Fsa0VudHJ5Lm5hbWUubWF0Y2goZ2xvYlBhdHRlcm4pXG4gICAgICApIHtcbiAgICAgICAgeWllbGQgd2Fsa0VudHJ5O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGxldCBjdXJyZW50TWF0Y2hlczogV2Fsa0VudHJ5W10gPSBbZml4ZWRSb290SW5mb107XG4gIGZvciAoY29uc3Qgc2VnbWVudCBvZiBzZWdtZW50cykge1xuICAgIC8vIEFkdmFuY2luZyB0aGUgbGlzdCBvZiBjdXJyZW50IG1hdGNoZXMgbWF5IGludHJvZHVjZSBkdXBsaWNhdGVzLCBzbyB3ZVxuICAgIC8vIHBhc3MgZXZlcnl0aGluZyB0aHJvdWdoIHRoaXMgTWFwLlxuICAgIGNvbnN0IG5leHRNYXRjaE1hcDogTWFwPHN0cmluZywgV2Fsa0VudHJ5PiA9IG5ldyBNYXAoKTtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgIGN1cnJlbnRNYXRjaGVzLm1hcChhc3luYyAoY3VycmVudE1hdGNoKSA9PiB7XG4gICAgICAgIGZvciBhd2FpdCAoY29uc3QgbmV4dE1hdGNoIG9mIGFkdmFuY2VNYXRjaChjdXJyZW50TWF0Y2gsIHNlZ21lbnQpKSB7XG4gICAgICAgICAgbmV4dE1hdGNoTWFwLnNldChuZXh0TWF0Y2gucGF0aCwgbmV4dE1hdGNoKTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgKTtcbiAgICBjdXJyZW50TWF0Y2hlcyA9IFsuLi5uZXh0TWF0Y2hNYXAudmFsdWVzKCldLnNvcnQoY29tcGFyZVBhdGgpO1xuICB9XG5cbiAgaWYgKGhhc1RyYWlsaW5nU2VwKSB7XG4gICAgY3VycmVudE1hdGNoZXMgPSBjdXJyZW50TWF0Y2hlcy5maWx0ZXIoXG4gICAgICAoZW50cnk6IFdhbGtFbnRyeSk6IGJvb2xlYW4gPT4gZW50cnkuaXNEaXJlY3RvcnksXG4gICAgKTtcbiAgfVxuICBpZiAoIWluY2x1ZGVEaXJzKSB7XG4gICAgY3VycmVudE1hdGNoZXMgPSBjdXJyZW50TWF0Y2hlcy5maWx0ZXIoXG4gICAgICAoZW50cnk6IFdhbGtFbnRyeSk6IGJvb2xlYW4gPT4gIWVudHJ5LmlzRGlyZWN0b3J5LFxuICAgICk7XG4gIH1cbiAgeWllbGQqIGN1cnJlbnRNYXRjaGVzO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gaXRlcmF0b3IgdGhhdCB5aWVsZHMgZWFjaCBmaWxlIHBhdGggbWF0Y2hpbmcgdGhlIGdpdmVuIGdsb2JcbiAqIHBhdHRlcm4uIFRoZSBmaWxlIHBhdGhzIGFyZSByZWxhdGl2ZSB0byB0aGUgcHJvdmlkZWQgYHJvb3RgIGRpcmVjdG9yeS5cbiAqIElmIGByb290YCBpcyBub3QgcHJvdmlkZWQsIHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5IGlzIHVzZWQuXG4gKiBUaGUgYHJvb3RgIGRpcmVjdG9yeSBpcyBub3QgaW5jbHVkZWQgaW4gdGhlIHlpZWxkZWQgZmlsZSBwYXRocy5cbiAqXG4gKiBSZXF1aXJlcyB0aGUgYC0tYWxsb3ctcmVhZGAgZmxhZy5cbiAqXG4gKiBAc2VlIHtAbGluayBodHRwczovL2RvY3MuZGVuby5jb20vcnVudGltZS9tYW51YWwvYmFzaWNzL3Blcm1pc3Npb25zI2ZpbGUtc3lzdGVtLWFjY2Vzc31cbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIERlbm8ncyBwZXJtaXNzaW9ucyBzeXN0ZW0uXG4gKlxuICogQHBhcmFtIGdsb2IgVGhlIGdsb2IgcGF0dGVybiB0byBleHBhbmQuXG4gKiBAcGFyYW0gb3B0aW9ucyBBZGRpdGlvbmFsIG9wdGlvbnMgZm9yIHRoZSBleHBhbnNpb24uXG4gKlxuICogQHJldHVybnMgQW4gaXRlcmF0b3IgdGhhdCB5aWVsZHMgZWFjaCB3YWxrIGVudHJ5IG1hdGNoaW5nIHRoZSBnbG9iIHBhdHRlcm4uXG4gKlxuICogQGV4YW1wbGUgVXNhZ2VcbiAqXG4gKiBGaWxlIHN0cnVjdHVyZTpcbiAqIGBgYFxuICogZm9sZGVyXG4gKiDilJzilIDilIAgc2NyaXB0LnRzXG4gKiDilJTilIDilIAgZm9vLnRzXG4gKiBgYGBcbiAqXG4gKiBgYGB0cyBpZ25vcmVcbiAqIC8vIHNjcmlwdC50c1xuICogaW1wb3J0IHsgZXhwYW5kR2xvYlN5bmMgfSBmcm9tIFwiQHN0ZC9mcy9leHBhbmQtZ2xvYlwiO1xuICpcbiAqIGNvbnN0IGVudHJpZXMgPSBbXTtcbiAqIGZvciAoY29uc3QgZW50cnkgb2YgZXhwYW5kR2xvYlN5bmMoXCIqLnRzXCIpKSB7XG4gKiAgIGVudHJpZXMucHVzaChlbnRyeSk7XG4gKiB9XG4gKlxuICogZW50cmllc1swXSEucGF0aDsgLy8gXCIvVXNlcnMvdXNlci9mb2xkZXIvc2NyaXB0LnRzXCJcbiAqIGVudHJpZXNbMF0hLm5hbWU7IC8vIFwic2NyaXB0LnRzXCJcbiAqIGVudHJpZXNbMF0hLmlzRmlsZTsgLy8gZmFsc2VcbiAqIGVudHJpZXNbMF0hLmlzRGlyZWN0b3J5OyAvLyB0cnVlXG4gKiBlbnRyaWVzWzBdIS5pc1N5bWxpbms7IC8vIGZhbHNlXG4gKlxuICogZW50cmllc1sxXSEucGF0aDsgLy8gXCIvVXNlcnMvdXNlci9mb2xkZXIvZm9vLnRzXCJcbiAqIGVudHJpZXNbMV0hLm5hbWU7IC8vIFwiZm9vLnRzXCJcbiAqIGVudHJpZXNbMV0hLmlzRmlsZTsgLy8gdHJ1ZVxuICogZW50cmllc1sxXSEuaXNEaXJlY3Rvcnk7IC8vIGZhbHNlXG4gKiBlbnRyaWVzWzFdIS5pc1N5bWxpbms7IC8vIGZhbHNlXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uKiBleHBhbmRHbG9iU3luYyhcbiAgZ2xvYjogc3RyaW5nIHwgVVJMLFxuICBvcHRpb25zPzogRXhwYW5kR2xvYk9wdGlvbnMsXG4pOiBJdGVyYWJsZUl0ZXJhdG9yPFdhbGtFbnRyeT4ge1xuICBsZXQge1xuICAgIHJvb3QsXG4gICAgZXhjbHVkZSA9IFtdLFxuICAgIGluY2x1ZGVEaXJzID0gdHJ1ZSxcbiAgICBleHRlbmRlZCA9IHRydWUsXG4gICAgZ2xvYnN0YXIgPSB0cnVlLFxuICAgIGNhc2VJbnNlbnNpdGl2ZSA9IGZhbHNlLFxuICAgIGZvbGxvd1N5bWxpbmtzID0gZmFsc2UsXG4gICAgY2Fub25pY2FsaXplID0gdHJ1ZSxcbiAgfSA9IG9wdGlvbnMgPz8ge307XG5cbiAgY29uc3Qge1xuICAgIHNlZ21lbnRzLFxuICAgIGlzQWJzb2x1dGU6IGlzR2xvYkFic29sdXRlLFxuICAgIGhhc1RyYWlsaW5nU2VwLFxuICAgIHdpblJvb3QsXG4gIH0gPSBzcGxpdCh0b1BhdGhTdHJpbmcoZ2xvYikpO1xuICByb290ID8/PSBpc0dsb2JBYnNvbHV0ZSA/IHdpblJvb3QgPz8gXCIvXCIgOiBEZW5vLmN3ZCgpO1xuXG4gIGNvbnN0IGdsb2JPcHRpb25zOiBHbG9iT3B0aW9ucyA9IHsgZXh0ZW5kZWQsIGdsb2JzdGFyLCBjYXNlSW5zZW5zaXRpdmUgfTtcbiAgY29uc3QgYWJzUm9vdCA9IGlzR2xvYkFic29sdXRlID8gcm9vdCA6IHJlc29sdmUocm9vdCEpOyAvLyByb290IGlzIGFsd2F5cyBzdHJpbmcgaGVyZVxuICBjb25zdCByZXNvbHZlRnJvbVJvb3QgPSAocGF0aDogc3RyaW5nKTogc3RyaW5nID0+IHJlc29sdmUoYWJzUm9vdCwgcGF0aCk7XG4gIGNvbnN0IGV4Y2x1ZGVQYXR0ZXJucyA9IGV4Y2x1ZGVcbiAgICAubWFwKHJlc29sdmVGcm9tUm9vdClcbiAgICAubWFwKChzOiBzdHJpbmcpOiBSZWdFeHAgPT4gZ2xvYlRvUmVnRXhwKHMsIGdsb2JPcHRpb25zKSk7XG4gIGNvbnN0IHNob3VsZEluY2x1ZGUgPSAocGF0aDogc3RyaW5nKSA9PlxuICAgICFleGNsdWRlUGF0dGVybnMuc29tZSgocCkgPT4gcC50ZXN0KHBhdGgpKTtcblxuICBsZXQgZml4ZWRSb290ID0gaXNHbG9iQWJzb2x1dGUgPyB3aW5Sb290ID8/IFwiL1wiIDogYWJzUm9vdDtcbiAgd2hpbGUgKHNlZ21lbnRzLmxlbmd0aCA+IDAgJiYgIWlzR2xvYihzZWdtZW50c1swXSEpKSB7XG4gICAgY29uc3Qgc2VnID0gc2VnbWVudHMuc2hpZnQoKSE7XG4gICAgZml4ZWRSb290ID0gam9pbkdsb2JzKFtmaXhlZFJvb3QsIHVuZXNjYXBlR2xvYlNlZ21lbnQoc2VnKV0sIGdsb2JPcHRpb25zKTtcbiAgfVxuXG4gIGxldCBmaXhlZFJvb3RJbmZvOiBXYWxrRW50cnk7XG4gIHRyeSB7XG4gICAgZml4ZWRSb290SW5mbyA9IGNyZWF0ZVdhbGtFbnRyeVN5bmMoZml4ZWRSb290KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4gdGhyb3dVbmxlc3NOb3RGb3VuZChlcnJvcik7XG4gIH1cblxuICBmdW5jdGlvbiogYWR2YW5jZU1hdGNoKFxuICAgIHdhbGtJbmZvOiBXYWxrRW50cnksXG4gICAgZ2xvYlNlZ21lbnQ6IHN0cmluZyxcbiAgKTogSXRlcmFibGVJdGVyYXRvcjxXYWxrRW50cnk+IHtcbiAgICBpZiAoIXdhbGtJbmZvLmlzRGlyZWN0b3J5KSB7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChnbG9iU2VnbWVudCA9PT0gXCIuLlwiKSB7XG4gICAgICBjb25zdCBwYXJlbnRQYXRoID0gam9pbkdsb2JzKFt3YWxrSW5mby5wYXRoLCBcIi4uXCJdLCBnbG9iT3B0aW9ucyk7XG4gICAgICBpZiAoc2hvdWxkSW5jbHVkZShwYXJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4geWllbGQgY3JlYXRlV2Fsa0VudHJ5U3luYyhwYXJlbnRQYXRoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKGdsb2JTZWdtZW50ID09PSBcIioqXCIpIHtcbiAgICAgIHJldHVybiB5aWVsZCogd2Fsa1N5bmMod2Fsa0luZm8ucGF0aCwge1xuICAgICAgICBza2lwOiBleGNsdWRlUGF0dGVybnMsXG4gICAgICAgIG1heERlcHRoOiBnbG9ic3RhciA/IEluZmluaXR5IDogMSxcbiAgICAgICAgZm9sbG93U3ltbGlua3MsXG4gICAgICAgIGNhbm9uaWNhbGl6ZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCBnbG9iUGF0dGVybiA9IGdsb2JUb1JlZ0V4cChnbG9iU2VnbWVudCwgZ2xvYk9wdGlvbnMpO1xuICAgIGZvciAoXG4gICAgICBjb25zdCB3YWxrRW50cnkgb2Ygd2Fsa1N5bmMod2Fsa0luZm8ucGF0aCwge1xuICAgICAgICBtYXhEZXB0aDogMSxcbiAgICAgICAgc2tpcDogZXhjbHVkZVBhdHRlcm5zLFxuICAgICAgICBmb2xsb3dTeW1saW5rcyxcbiAgICAgIH0pXG4gICAgKSB7XG4gICAgICBpZiAoXG4gICAgICAgIHdhbGtFbnRyeS5wYXRoICE9PSB3YWxrSW5mby5wYXRoICYmXG4gICAgICAgIHdhbGtFbnRyeS5uYW1lLm1hdGNoKGdsb2JQYXR0ZXJuKVxuICAgICAgKSB7XG4gICAgICAgIHlpZWxkIHdhbGtFbnRyeTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBsZXQgY3VycmVudE1hdGNoZXM6IFdhbGtFbnRyeVtdID0gW2ZpeGVkUm9vdEluZm9dO1xuICBmb3IgKGNvbnN0IHNlZ21lbnQgb2Ygc2VnbWVudHMpIHtcbiAgICAvLyBBZHZhbmNpbmcgdGhlIGxpc3Qgb2YgY3VycmVudCBtYXRjaGVzIG1heSBpbnRyb2R1Y2UgZHVwbGljYXRlcywgc28gd2VcbiAgICAvLyBwYXNzIGV2ZXJ5dGhpbmcgdGhyb3VnaCB0aGlzIE1hcC5cbiAgICBjb25zdCBuZXh0TWF0Y2hNYXA6IE1hcDxzdHJpbmcsIFdhbGtFbnRyeT4gPSBuZXcgTWFwKCk7XG4gICAgZm9yIChjb25zdCBjdXJyZW50TWF0Y2ggb2YgY3VycmVudE1hdGNoZXMpIHtcbiAgICAgIGZvciAoY29uc3QgbmV4dE1hdGNoIG9mIGFkdmFuY2VNYXRjaChjdXJyZW50TWF0Y2gsIHNlZ21lbnQpKSB7XG4gICAgICAgIG5leHRNYXRjaE1hcC5zZXQobmV4dE1hdGNoLnBhdGgsIG5leHRNYXRjaCk7XG4gICAgICB9XG4gICAgfVxuICAgIGN1cnJlbnRNYXRjaGVzID0gWy4uLm5leHRNYXRjaE1hcC52YWx1ZXMoKV0uc29ydChjb21wYXJlUGF0aCk7XG4gIH1cblxuICBpZiAoaGFzVHJhaWxpbmdTZXApIHtcbiAgICBjdXJyZW50TWF0Y2hlcyA9IGN1cnJlbnRNYXRjaGVzLmZpbHRlcihcbiAgICAgIChlbnRyeTogV2Fsa0VudHJ5KTogYm9vbGVhbiA9PiBlbnRyeS5pc0RpcmVjdG9yeSxcbiAgICApO1xuICB9XG4gIGlmICghaW5jbHVkZURpcnMpIHtcbiAgICBjdXJyZW50TWF0Y2hlcyA9IGN1cnJlbnRNYXRjaGVzLmZpbHRlcihcbiAgICAgIChlbnRyeTogV2Fsa0VudHJ5KTogYm9vbGVhbiA9PiAhZW50cnkuaXNEaXJlY3RvcnksXG4gICAgKTtcbiAgfVxuICB5aWVsZCogY3VycmVudE1hdGNoZXM7XG59XG5cbmNvbnN0IGdsb2JFc2NhcGVDaGFyID1cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgKGdsb2JhbFRoaXMgYXMgYW55KS5EZW5vPy5idWlsZC5vcyA9PT0gXCJ3aW5kb3dzXCIgPyBcImBcIiA6IGBcXFxcYDtcbmNvbnN0IGdsb2JNZXRhY2hhcnMgPSBcIio/e31bXSgpfCtAIVwiO1xuZnVuY3Rpb24gdW5lc2NhcGVHbG9iU2VnbWVudChzZWdtZW50OiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgbGV0IGxhc3RJbmRleCA9IDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2VnbWVudC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNoYXIgPSBzZWdtZW50W2ldO1xuICAgIGlmIChjaGFyID09PSBnbG9iRXNjYXBlQ2hhcikge1xuICAgICAgY29uc3QgbmV4dENoYXIgPSBzZWdtZW50W2kgKyAxXTtcbiAgICAgIGlmIChuZXh0Q2hhciAmJiBnbG9iTWV0YWNoYXJzLmluY2x1ZGVzKG5leHRDaGFyKSkge1xuICAgICAgICAvLyBhcHBlbmQgdGhlIHNsaWNlIGJlZm9yZSB0aGUgZXNjYXBlIGNoYXIsIHRoZW4gdGhlIG1ldGFjaGFyXG4gICAgICAgIHJlc3VsdCArPSBzZWdtZW50LnNsaWNlKGxhc3RJbmRleCwgaSkgKyBuZXh0Q2hhcjtcbiAgICAgICAgaSsrOyAvLyBza2lwIG5leHQgY2hhciBzaW5jZSB3ZSBhbHJlYWR5IHByb2Nlc3NlZCBpdFxuICAgICAgICBsYXN0SW5kZXggPSBpICsgMTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gbm8gZXNjYXBlZCwgcmV0dXJuIHRoZSBvcmlnaW5hbCBzZWdtZW50XG4gIGlmIChsYXN0SW5kZXggPT09IDApIHtcbiAgICByZXR1cm4gc2VnbWVudDtcbiAgfVxuICAvLyBhcHBlbmQgYW55IHJlbWFpbmluZyBjaGFyYWN0ZXJzXG4gIHJlc3VsdCArPSBzZWdtZW50LnNsaWNlKGxhc3RJbmRleCk7XG4gIHJldHVybiByZXN1bHQ7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEscURBQXFEO0FBQ3JELFNBQTJCLFlBQVksUUFBUSxzQ0FBc0M7QUFDckYsU0FBUyxTQUFTLFFBQVEsa0NBQWtDO0FBQzVELFNBQVMsTUFBTSxRQUFRLCtCQUErQjtBQUN0RCxTQUFTLFVBQVUsUUFBUSxtQ0FBbUM7QUFDOUQsU0FBUyxPQUFPLFFBQVEsK0JBQStCO0FBQ3ZELFNBQVMsaUJBQWlCLFFBQVEsaUNBQWlDO0FBQ25FLFNBQVMsSUFBSSxFQUFFLFFBQVEsUUFBUSxZQUFZO0FBQzNDLFNBQVMsWUFBWSxRQUFRLHVCQUF1QjtBQUNwRCxTQUNFLGVBQWUsRUFDZixtQkFBbUIsUUFFZCwwQkFBMEI7QUFDakMsU0FBUyxTQUFTLFFBQVEsK0JBQStCO0FBK0N6RCxTQUFTLE1BQU0sSUFBWTtFQUN6QixNQUFNLElBQUksa0JBQWtCLE1BQU07RUFDbEMsTUFBTSxXQUFXLEtBQ2QsT0FBTyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sSUFDeEMsS0FBSyxDQUFDO0VBQ1QsTUFBTSxjQUFjLFdBQVc7RUFDL0IsTUFBTSxRQUFtQjtJQUN2QjtJQUNBLFlBQVk7SUFDWixnQkFBZ0IsS0FBSyxLQUFLLENBQUMsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsT0FBTztFQUN0RDtFQUNBLElBQUksYUFBYSxhQUFhO0lBQzVCLE1BQU0sT0FBTyxHQUFHLFNBQVMsS0FBSztFQUNoQztFQUNBLE9BQU87QUFDVDtBQUVBLFNBQVMsb0JBQW9CLEtBQWM7RUFDekMsSUFBSSxDQUFDLENBQUMsaUJBQWlCLEtBQUssTUFBTSxDQUFDLFFBQVEsR0FBRztJQUM1QyxNQUFNO0VBQ1I7QUFDRjtBQUVBLFNBQVMsWUFBWSxDQUFZLEVBQUUsQ0FBWTtFQUM3QyxJQUFJLEVBQUUsSUFBSSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQztFQUM3QixJQUFJLEVBQUUsSUFBSSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU87RUFDNUIsT0FBTztBQUNUO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBbUxDLEdBQ0QsT0FBTyxnQkFBZ0IsV0FDckIsSUFBa0IsRUFDbEIsT0FBMkI7RUFFM0IsSUFBSSxFQUNGLElBQUksRUFDSixVQUFVLEVBQUUsRUFDWixjQUFjLElBQUksRUFDbEIsV0FBVyxJQUFJLEVBQ2YsV0FBVyxJQUFJLEVBQ2Ysa0JBQWtCLEtBQUssRUFDdkIsaUJBQWlCLEtBQUssRUFDdEIsZUFBZSxJQUFJLEVBQ3BCLEdBQUcsV0FBVyxDQUFDO0VBRWhCLE1BQU0sRUFDSixRQUFRLEVBQ1IsWUFBWSxjQUFjLEVBQzFCLGNBQWMsRUFDZCxPQUFPLEVBQ1IsR0FBRyxNQUFNLGFBQWE7RUFDdkIsU0FBUyxpQkFBaUIsV0FBVyxNQUFNLEtBQUssR0FBRztFQUVuRCxNQUFNLGNBQTJCO0lBQUU7SUFBVTtJQUFVO0VBQWdCO0VBQ3ZFLE1BQU0sVUFBVSxpQkFBaUIsT0FBTyxRQUFRLE9BQVEsNkJBQTZCO0VBQ3JGLE1BQU0sa0JBQWtCLENBQUMsT0FBeUIsUUFBUSxTQUFTO0VBQ25FLE1BQU0sa0JBQWtCLFFBQ3JCLEdBQUcsQ0FBQyxpQkFDSixHQUFHLENBQUMsQ0FBQyxJQUFzQixhQUFhLEdBQUc7RUFDOUMsTUFBTSxnQkFBZ0IsQ0FBQyxPQUNyQixDQUFDLGdCQUFnQixJQUFJLENBQUMsQ0FBQyxJQUFNLEVBQUUsSUFBSSxDQUFDO0VBRXRDLElBQUksWUFBWSxpQkFBaUIsV0FBVyxNQUFNO0VBQ2xELE1BQU8sU0FBUyxNQUFNLEdBQUcsS0FBSyxDQUFDLE9BQU8sUUFBUSxDQUFDLEVBQUUsRUFBSTtJQUNuRCxNQUFNLE1BQU0sU0FBUyxLQUFLO0lBQzFCLFlBQVksVUFBVTtNQUFDO01BQVcsb0JBQW9CO0tBQUssRUFBRTtFQUMvRDtFQUVBLElBQUk7RUFDSixJQUFJO0lBQ0YsZ0JBQWdCLE1BQU0sZ0JBQWdCO0VBQ3hDLEVBQUUsT0FBTyxPQUFPO0lBQ2QsT0FBTyxvQkFBb0I7RUFDN0I7RUFFQSxnQkFBZ0IsYUFDZCxRQUFtQixFQUNuQixXQUFtQjtJQUVuQixJQUFJLENBQUMsU0FBUyxXQUFXLEVBQUU7TUFDekI7SUFDRixPQUFPLElBQUksZ0JBQWdCLE1BQU07TUFDL0IsTUFBTSxhQUFhLFVBQVU7UUFBQyxTQUFTLElBQUk7UUFBRTtPQUFLLEVBQUU7TUFDcEQsSUFBSSxjQUFjLGFBQWE7UUFDN0IsT0FBTyxNQUFNLE1BQU0sZ0JBQWdCO01BQ3JDO01BQ0E7SUFDRixPQUFPLElBQUksZ0JBQWdCLE1BQU07TUFDL0IsT0FBTyxPQUFPLEtBQUssU0FBUyxJQUFJLEVBQUU7UUFDaEMsTUFBTTtRQUNOLFVBQVUsV0FBVyxXQUFXO1FBQ2hDO1FBQ0E7TUFDRjtJQUNGO0lBQ0EsTUFBTSxjQUFjLGFBQWEsYUFBYTtJQUM5QyxXQUNFLE1BQU0sYUFBYSxLQUFLLFNBQVMsSUFBSSxFQUFFO01BQ3JDLFVBQVU7TUFDVixNQUFNO01BQ047SUFDRixHQUNBO01BQ0EsSUFDRSxVQUFVLElBQUksS0FBSyxTQUFTLElBQUksSUFDaEMsVUFBVSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQ3JCO1FBQ0EsTUFBTTtNQUNSO0lBQ0Y7RUFDRjtFQUVBLElBQUksaUJBQThCO0lBQUM7R0FBYztFQUNqRCxLQUFLLE1BQU0sV0FBVyxTQUFVO0lBQzlCLHdFQUF3RTtJQUN4RSxvQ0FBb0M7SUFDcEMsTUFBTSxlQUF1QyxJQUFJO0lBQ2pELE1BQU0sUUFBUSxHQUFHLENBQ2YsZUFBZSxHQUFHLENBQUMsT0FBTztNQUN4QixXQUFXLE1BQU0sYUFBYSxhQUFhLGNBQWMsU0FBVTtRQUNqRSxhQUFhLEdBQUcsQ0FBQyxVQUFVLElBQUksRUFBRTtNQUNuQztJQUNGO0lBRUYsaUJBQWlCO1NBQUksYUFBYSxNQUFNO0tBQUcsQ0FBQyxJQUFJLENBQUM7RUFDbkQ7RUFFQSxJQUFJLGdCQUFnQjtJQUNsQixpQkFBaUIsZUFBZSxNQUFNLENBQ3BDLENBQUMsUUFBOEIsTUFBTSxXQUFXO0VBRXBEO0VBQ0EsSUFBSSxDQUFDLGFBQWE7SUFDaEIsaUJBQWlCLGVBQWUsTUFBTSxDQUNwQyxDQUFDLFFBQThCLENBQUMsTUFBTSxXQUFXO0VBRXJEO0VBQ0EsT0FBTztBQUNUO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0E4Q0MsR0FDRCxPQUFPLFVBQVUsZUFDZixJQUFrQixFQUNsQixPQUEyQjtFQUUzQixJQUFJLEVBQ0YsSUFBSSxFQUNKLFVBQVUsRUFBRSxFQUNaLGNBQWMsSUFBSSxFQUNsQixXQUFXLElBQUksRUFDZixXQUFXLElBQUksRUFDZixrQkFBa0IsS0FBSyxFQUN2QixpQkFBaUIsS0FBSyxFQUN0QixlQUFlLElBQUksRUFDcEIsR0FBRyxXQUFXLENBQUM7RUFFaEIsTUFBTSxFQUNKLFFBQVEsRUFDUixZQUFZLGNBQWMsRUFDMUIsY0FBYyxFQUNkLE9BQU8sRUFDUixHQUFHLE1BQU0sYUFBYTtFQUN2QixTQUFTLGlCQUFpQixXQUFXLE1BQU0sS0FBSyxHQUFHO0VBRW5ELE1BQU0sY0FBMkI7SUFBRTtJQUFVO0lBQVU7RUFBZ0I7RUFDdkUsTUFBTSxVQUFVLGlCQUFpQixPQUFPLFFBQVEsT0FBUSw2QkFBNkI7RUFDckYsTUFBTSxrQkFBa0IsQ0FBQyxPQUF5QixRQUFRLFNBQVM7RUFDbkUsTUFBTSxrQkFBa0IsUUFDckIsR0FBRyxDQUFDLGlCQUNKLEdBQUcsQ0FBQyxDQUFDLElBQXNCLGFBQWEsR0FBRztFQUM5QyxNQUFNLGdCQUFnQixDQUFDLE9BQ3JCLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLElBQU0sRUFBRSxJQUFJLENBQUM7RUFFdEMsSUFBSSxZQUFZLGlCQUFpQixXQUFXLE1BQU07RUFDbEQsTUFBTyxTQUFTLE1BQU0sR0FBRyxLQUFLLENBQUMsT0FBTyxRQUFRLENBQUMsRUFBRSxFQUFJO0lBQ25ELE1BQU0sTUFBTSxTQUFTLEtBQUs7SUFDMUIsWUFBWSxVQUFVO01BQUM7TUFBVyxvQkFBb0I7S0FBSyxFQUFFO0VBQy9EO0VBRUEsSUFBSTtFQUNKLElBQUk7SUFDRixnQkFBZ0Isb0JBQW9CO0VBQ3RDLEVBQUUsT0FBTyxPQUFPO0lBQ2QsT0FBTyxvQkFBb0I7RUFDN0I7RUFFQSxVQUFVLGFBQ1IsUUFBbUIsRUFDbkIsV0FBbUI7SUFFbkIsSUFBSSxDQUFDLFNBQVMsV0FBVyxFQUFFO01BQ3pCO0lBQ0YsT0FBTyxJQUFJLGdCQUFnQixNQUFNO01BQy9CLE1BQU0sYUFBYSxVQUFVO1FBQUMsU0FBUyxJQUFJO1FBQUU7T0FBSyxFQUFFO01BQ3BELElBQUksY0FBYyxhQUFhO1FBQzdCLE9BQU8sTUFBTSxvQkFBb0I7TUFDbkM7TUFDQTtJQUNGLE9BQU8sSUFBSSxnQkFBZ0IsTUFBTTtNQUMvQixPQUFPLE9BQU8sU0FBUyxTQUFTLElBQUksRUFBRTtRQUNwQyxNQUFNO1FBQ04sVUFBVSxXQUFXLFdBQVc7UUFDaEM7UUFDQTtNQUNGO0lBQ0Y7SUFDQSxNQUFNLGNBQWMsYUFBYSxhQUFhO0lBQzlDLEtBQ0UsTUFBTSxhQUFhLFNBQVMsU0FBUyxJQUFJLEVBQUU7TUFDekMsVUFBVTtNQUNWLE1BQU07TUFDTjtJQUNGLEdBQ0E7TUFDQSxJQUNFLFVBQVUsSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUNoQyxVQUFVLElBQUksQ0FBQyxLQUFLLENBQUMsY0FDckI7UUFDQSxNQUFNO01BQ1I7SUFDRjtFQUNGO0VBRUEsSUFBSSxpQkFBOEI7SUFBQztHQUFjO0VBQ2pELEtBQUssTUFBTSxXQUFXLFNBQVU7SUFDOUIsd0VBQXdFO0lBQ3hFLG9DQUFvQztJQUNwQyxNQUFNLGVBQXVDLElBQUk7SUFDakQsS0FBSyxNQUFNLGdCQUFnQixlQUFnQjtNQUN6QyxLQUFLLE1BQU0sYUFBYSxhQUFhLGNBQWMsU0FBVTtRQUMzRCxhQUFhLEdBQUcsQ0FBQyxVQUFVLElBQUksRUFBRTtNQUNuQztJQUNGO0lBQ0EsaUJBQWlCO1NBQUksYUFBYSxNQUFNO0tBQUcsQ0FBQyxJQUFJLENBQUM7RUFDbkQ7RUFFQSxJQUFJLGdCQUFnQjtJQUNsQixpQkFBaUIsZUFBZSxNQUFNLENBQ3BDLENBQUMsUUFBOEIsTUFBTSxXQUFXO0VBRXBEO0VBQ0EsSUFBSSxDQUFDLGFBQWE7SUFDaEIsaUJBQWlCLGVBQWUsTUFBTSxDQUNwQyxDQUFDLFFBQThCLENBQUMsTUFBTSxXQUFXO0VBRXJEO0VBQ0EsT0FBTztBQUNUO0FBRUEsTUFBTSxpQkFFSixBQURBLG1DQUFtQztBQUNsQyxXQUFtQixJQUFJLEVBQUUsTUFBTSxPQUFPLFlBQVksTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUMvRCxNQUFNLGdCQUFnQjtBQUN0QixTQUFTLG9CQUFvQixPQUFlO0VBQzFDLElBQUksU0FBUztFQUNiLElBQUksWUFBWTtFQUNoQixJQUFLLElBQUksSUFBSSxHQUFHLElBQUksUUFBUSxNQUFNLEVBQUUsSUFBSztJQUN2QyxNQUFNLE9BQU8sT0FBTyxDQUFDLEVBQUU7SUFDdkIsSUFBSSxTQUFTLGdCQUFnQjtNQUMzQixNQUFNLFdBQVcsT0FBTyxDQUFDLElBQUksRUFBRTtNQUMvQixJQUFJLFlBQVksY0FBYyxRQUFRLENBQUMsV0FBVztRQUNoRCw2REFBNkQ7UUFDN0QsVUFBVSxRQUFRLEtBQUssQ0FBQyxXQUFXLEtBQUs7UUFDeEMsS0FBSywrQ0FBK0M7UUFDcEQsWUFBWSxJQUFJO01BQ2xCO0lBQ0Y7RUFDRjtFQUNBLDBDQUEwQztFQUMxQyxJQUFJLGNBQWMsR0FBRztJQUNuQixPQUFPO0VBQ1Q7RUFDQSxrQ0FBa0M7RUFDbEMsVUFBVSxRQUFRLEtBQUssQ0FBQztFQUN4QixPQUFPO0FBQ1QifQ==
// denoCacheMetadata=17232742696036035098,5564790359353364021
