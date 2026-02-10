// Copyright 2018-2026 the Deno authors. MIT license.
// Documentation and interface for walk were adapted from Go
// https://golang.org/pkg/path/filepath/#Walk
// Copyright 2009 The Go Authors. All rights reserved. BSD license.
import { join } from "jsr:@std/path@^1.1.4/join";
import { toPathString } from "./_to_path_string.ts";
import { createWalkEntry, createWalkEntrySync } from "./_create_walk_entry.ts";
function include(path, exts, match, skip) {
  if (exts && !exts.some((ext) => path.endsWith(ext))) {
    return false;
  }
  if (match && !match.some((pattern) => !!path.match(pattern))) {
    return false;
  }
  if (skip && skip.some((pattern) => !!path.match(pattern))) {
    return false;
  }
  return true;
}
/**
 * Recursively walks through a directory and yields information about each file
 * and directory encountered.
 *
 * The root path determines whether the file paths are relative or absolute.
 * The root directory is included in the yielded entries.
 *
 * Requires `--allow-read` permission.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param root The root directory to start the walk from, as a string or URL.
 * @param options The options for the walk.
 * @throws {Deno.errors.NotFound} If the root directory does not exist.
 *
 * @returns An async iterable iterator that yields the walk entry objects.
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
 * import { walk } from "@std/fs/walk";
 *
 * await Array.fromAsync(walk("."));
 * // [
 * //   {
 * //     path: ".",
 * //     name: ".",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "foo.ts",
 * //     name: "foo.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 *
 * @example Maximum file depth
 *
 * Setting the `maxDepth` option to `1` will only include the root directory and
 * its immediate children.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── foo
 *     └── bar.ts
 * ```
 *
 * ```ts ignore
 * import { walk } from "@std/fs/walk";
 *
 * await Array.fromAsync(walk(".", { maxDepth: 1 }));
 * // [
 * //   {
 * //     path: ".",
 * //     name: ".",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "foo",
 * //     name: "foo",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 *
 * @example Exclude files
 *
 * Setting the `includeFiles` option to `false` will exclude files.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── foo
 * ```
 *
 * ```ts ignore
 * import { walk } from "@std/fs/walk";
 *
 * await Array.fromAsync(walk(".", { includeFiles: false }));
 * // [
 * //   {
 * //     path: ".",
 * //     name: ".",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "foo",
 * //     name: "foo",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false,
 * //   },
 * // ]
 * ```
 *
 * @example Exclude directories
 *
 * Setting the `includeDirs` option to `false` will exclude directories.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── foo
 * ```
 *
 * ```ts ignore
 * import { walk } from "@std/fs/walk";
 *
 * await Array.fromAsync(walk(".", { includeDirs: false }));
 * // [
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 *
 * @example Exclude symbolic links
 *
 * Setting the `includeSymlinks` option to `false` will exclude symbolic links.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * ├── foo
 * └── link -> script.ts (symbolic link)
 * ```
 *
 * ```ts ignore
 * import { walk } from "@std/fs/walk";
 *
 * await Array.fromAsync(walk(".", { includeSymlinks: false }));
 * // [
 * //   {
 * //     path: ".",
 * //     name: ".",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 *
 * @example Follow symbolic links
 *
 * Setting the `followSymlinks` option to `true` will follow symbolic links,
 * affecting the `path` property of the walk entry.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── link -> script.ts (symbolic link)
 * ```
 *
 * ```ts ignore
 * import { walk } from "@std/fs/walk";
 *
 * await Array.fromAsync(walk(".", { followSymlinks: true }));
 * // [
 * //   {
 * //     path: ".",
 * //     name: ".",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "script.ts",
 * //     name: "link",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: true
 * //   },
 * // ]
 * ```
 *
 * @example Canonicalize symbolic links
 *
 * Setting the `canonicalize` option to `false` will canonicalize the path of
 * the followed symbolic link. Meaning, the `path` property of the walk entry
 * will be the path of the symbolic link itself.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── link -> script.ts (symbolic link)
 * ```
 *
 * ```ts ignore
 * import { walk } from "@std/fs/walk";
 *
 * await Array.fromAsync(walk(".", { followSymlinks: true, canonicalize: true }));
 * // [
 * //   {
 * //     path: ".",
 * //     name: ".",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "link",
 * //     name: "link",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: true
 * //   },
 * // ]
 * ```
 *
 * @example Filter by file extensions
 *
 * Setting the `exts` option to `[".ts"]` or `["ts"]` will only include entries
 * with the `.ts` file extension.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── foo.js
 * ```
 *
 * ```ts ignore
 * import { walk } from "@std/fs/walk";
 *
 * await Array.fromAsync(walk(".", { exts: [".ts"] }));
 * // [
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 *
 * @example Filter by regular expressions
 *
 * Setting the `match` option to `[/s/]` will only include entries with the
 * letter `s` in their name.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── README.md
 * ```
 *
 * ```ts ignore
 * import { walk } from "@std/fs/walk";
 *
 * await Array.fromAsync(walk(".", { match: [/s/] }));
 * // [
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 *
 * @example Exclude by regular expressions
 *
 * Setting the `skip` option to `[/s/]` will exclude entries with the letter
 * `s` in their name.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── README.md
 * ```
 *
 * ```ts ignore
 * import { walk } from "@std/fs/walk";
 *
 * await Array.fromAsync(walk(".", { skip: [/s/] }));
 * // [
 * //   {
 * //     path: "README.md",
 * //     name: "README.md",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 */ export async function* walk(root, options) {
  let {
    maxDepth = Infinity,
    includeFiles = true,
    includeDirs = true,
    includeSymlinks = true,
    followSymlinks = false,
    canonicalize = true,
    exts = undefined,
    match = undefined,
    skip = undefined,
  } = options ?? {};
  if (maxDepth < 0) {
    return;
  }
  root = toPathString(root);
  if (exts) {
    exts = exts.map((ext) => ext.startsWith(".") ? ext : `.${ext}`);
  }
  if (includeDirs && include(root, exts, match, skip)) {
    yield await createWalkEntry(root);
  }
  if (maxDepth < 1 || !include(root, undefined, undefined, skip)) {
    return;
  }
  for await (const entry of Deno.readDir(root)) {
    let path = join(root, entry.name);
    let { isSymlink, isDirectory } = entry;
    if (isSymlink) {
      if (!followSymlinks) {
        if (includeSymlinks && include(path, exts, match, skip)) {
          yield {
            path,
            ...entry,
          };
        }
        continue;
      }
      const realPath = await Deno.realPath(path);
      if (canonicalize) {
        path = realPath;
      }
      // Caveat emptor: don't assume |path| is not a symlink. realpath()
      // resolves symlinks but another process can replace the file system
      // entity with a different type of entity before we call lstat().
      ({ isSymlink, isDirectory } = await Deno.lstat(realPath));
    }
    if (isSymlink || isDirectory) {
      const opts = {
        maxDepth: maxDepth - 1,
        includeFiles,
        includeDirs,
        includeSymlinks,
        followSymlinks,
      };
      if (exts !== undefined) {
        opts.exts = exts;
      }
      if (match !== undefined) {
        opts.match = match;
      }
      if (skip !== undefined) {
        opts.skip = skip;
      }
      yield* walk(path, opts);
    } else if (includeFiles && include(path, exts, match, skip)) {
      yield {
        path,
        ...entry,
      };
    }
  }
}
/**
 * Recursively walks through a directory and yields information about each file
 * and directory encountered.
 *
 * The root path determines whether the file paths is relative or absolute.
 * The root directory is included in the yielded entries.
 *
 * Requires `--allow-read` permission.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param root The root directory to start the walk from, as a string or URL.
 * @param options The options for the walk.
 *
 * @returns A synchronous iterable iterator that yields the walk entry objects.
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
 * import { walkSync } from "@std/fs/walk";
 *
 * Array.from(walkSync("."));
 * // [
 * //   {
 * //     path: ".",
 * //     name: ".",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "foo.ts",
 * //     name: "foo.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 *
 * @example Maximum file depth
 *
 * Setting the `maxDepth` option to `1` will only include the root directory and
 * its immediate children.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── foo
 *     └── bar.ts
 * ```
 *
 * ```ts ignore
 * import { walkSync } from "@std/fs/walk";
 *
 * Array.from(walkSync(".", { maxDepth: 1 }));
 * // [
 * //   {
 * //     path: ".",
 * //     name: ".",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "foo",
 * //     name: "foo",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 *
 * @example Exclude files
 *
 * Setting the `includeFiles` option to `false` will exclude files.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── foo
 * ```
 *
 * ```ts ignore
 * import { walkSync } from "@std/fs/walk";
 *
 * Array.from(walkSync(".", { includeFiles: false }));
 * // [
 * //   {
 * //     path: ".",
 * //     name: ".",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "foo",
 * //     name: "foo",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false,
 * //   },
 * // ]
 * ```
 *
 * @example Exclude directories
 *
 * Setting the `includeDirs` option to `false` will exclude directories.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── foo
 * ```
 *
 * ```ts ignore
 * import { walkSync } from "@std/fs/walk";
 *
 * Array.from(walkSync(".", { includeDirs: false }));
 * // [
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 *
 * @example Exclude symbolic links
 *
 * Setting the `includeSymlinks` option to `false` will exclude symbolic links.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * ├── foo
 * └── link -> script.ts (symbolic link)
 * ```
 *
 * ```ts ignore
 * import { walkSync } from "@std/fs/walk";
 *
 * Array.from(walkSync(".", { includeSymlinks: false }));
 * // [
 * //   {
 * //     path: ".",
 * //     name: ".",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 *
 * @example Follow symbolic links
 *
 * Setting the `followSymlinks` option to `true` will follow symbolic links,
 * affecting the `path` property of the walk entry.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── link -> script.ts (symbolic link)
 * ```
 *
 * ```ts ignore
 * import { walkSync } from "@std/fs/walk";
 *
 * Array.from(walkSync(".", { followSymlinks: true }));
 * // [
 * //   {
 * //     path: ".",
 * //     name: ".",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "script.ts",
 * //     name: "link",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: true
 * //   },
 * // ]
 * ```
 *
 * @example Canonicalize symbolic links
 *
 * Setting the `canonicalize` option to `false` will canonicalize the path of
 * the followed symbolic link. Meaning, the `path` property of the walk entry
 * will be the path of the symbolic link itself.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── link -> script.ts (symbolic link)
 * ```
 *
 * ```ts ignore
 * import { walkSync } from "@std/fs/walk";
 *
 * Array.from(walkSync(".", { followSymlinks: true, canonicalize: true }));
 * // [
 * //   {
 * //     path: ".",
 * //     name: ".",
 * //     isFile: false,
 * //     isDirectory: true,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * //   {
 * //     path: "link",
 * //     name: "link",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: true
 * //   },
 * // ]
 * ```
 *
 * @example Filter by file extensions
 *
 * Setting the `exts` option to `[".ts"]` or `["ts"]` will only include entries
 * with the `.ts` file extension.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── foo.js
 * ```
 *
 * ```ts ignore
 * import { walkSync } from "@std/fs/walk";
 *
 * Array.from(walkSync(".", { exts: [".ts"] }));
 * // [
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 *
 * @example Filter by regular expressions
 *
 * Setting the `match` option to `[/s/]` will only include entries with the
 * letter `s` in their name.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── README.md
 * ```
 *
 * ```ts ignore
 * import { walkSync } from "@std/fs/walk";
 *
 * Array.from(walkSync(".", { match: [/s/] }));
 * // [
 * //   {
 * //     path: "script.ts",
 * //     name: "script.ts",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 *
 * @example Exclude by regular expressions
 *
 * Setting the `skip` option to `[/s/]` will exclude entries with the letter
 * `s` in their name.
 *
 * File structure:
 * ```
 * folder
 * ├── script.ts
 * └── README.md
 * ```
 *
 * ```ts ignore
 * import { walkSync } from "@std/fs/walk";
 *
 * Array.from(walkSync(".", { skip: [/s/] }));
 * // [
 * //   {
 * //     path: "README.md",
 * //     name: "README.md",
 * //     isFile: true,
 * //     isDirectory: false,
 * //     isSymlink: false
 * //   },
 * // ]
 * ```
 */ export function* walkSync(root, options) {
  let {
    maxDepth = Infinity,
    includeFiles = true,
    includeDirs = true,
    includeSymlinks = true,
    followSymlinks = false,
    canonicalize = true,
    exts = undefined,
    match = undefined,
    skip = undefined,
  } = options ?? {};
  root = toPathString(root);
  if (exts) {
    exts = exts.map((ext) => ext.startsWith(".") ? ext : `.${ext}`);
  }
  if (maxDepth < 0) {
    return;
  }
  if (includeDirs && include(root, exts, match, skip)) {
    yield createWalkEntrySync(root);
  }
  if (maxDepth < 1 || !include(root, undefined, undefined, skip)) {
    return;
  }
  const entries = Deno.readDirSync(root);
  for (const entry of entries) {
    let path = join(root, entry.name);
    let { isSymlink, isDirectory } = entry;
    if (isSymlink) {
      if (!followSymlinks) {
        if (includeSymlinks && include(path, exts, match, skip)) {
          yield {
            path,
            ...entry,
          };
        }
        continue;
      }
      const realPath = Deno.realPathSync(path);
      if (canonicalize) {
        path = realPath;
      }
      // Caveat emptor: don't assume |path| is not a symlink. realpath()
      // resolves symlinks but another process can replace the file system
      // entity with a different type of entity before we call lstat().
      ({ isSymlink, isDirectory } = Deno.lstatSync(realPath));
    }
    if (isSymlink || isDirectory) {
      const opts = {
        maxDepth: maxDepth - 1,
        includeFiles,
        includeDirs,
        includeSymlinks,
        followSymlinks,
      };
      if (exts !== undefined) {
        opts.exts = exts;
      }
      if (match !== undefined) {
        opts.match = match;
      }
      if (skip !== undefined) {
        opts.skip = skip;
      }
      yield* walkSync(path, opts);
    } else if (includeFiles && include(path, exts, match, skip)) {
      yield {
        path,
        ...entry,
      };
    }
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL3dhbGsudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNiB0aGUgRGVubyBhdXRob3JzLiBNSVQgbGljZW5zZS5cbi8vIERvY3VtZW50YXRpb24gYW5kIGludGVyZmFjZSBmb3Igd2FsayB3ZXJlIGFkYXB0ZWQgZnJvbSBHb1xuLy8gaHR0cHM6Ly9nb2xhbmcub3JnL3BrZy9wYXRoL2ZpbGVwYXRoLyNXYWxrXG4vLyBDb3B5cmlnaHQgMjAwOSBUaGUgR28gQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gQlNEIGxpY2Vuc2UuXG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcImpzcjpAc3RkL3BhdGhAXjEuMS40L2pvaW5cIjtcbmltcG9ydCB7IHRvUGF0aFN0cmluZyB9IGZyb20gXCIuL190b19wYXRoX3N0cmluZy50c1wiO1xuaW1wb3J0IHtcbiAgY3JlYXRlV2Fsa0VudHJ5LFxuICBjcmVhdGVXYWxrRW50cnlTeW5jLFxuICB0eXBlIFdhbGtFbnRyeSxcbn0gZnJvbSBcIi4vX2NyZWF0ZV93YWxrX2VudHJ5LnRzXCI7XG5cbmZ1bmN0aW9uIGluY2x1ZGUoXG4gIHBhdGg6IHN0cmluZyxcbiAgZXh0cz86IHN0cmluZ1tdLFxuICBtYXRjaD86IFJlZ0V4cFtdLFxuICBza2lwPzogUmVnRXhwW10sXG4pOiBib29sZWFuIHtcbiAgaWYgKGV4dHMgJiYgIWV4dHMuc29tZSgoZXh0KTogYm9vbGVhbiA9PiBwYXRoLmVuZHNXaXRoKGV4dCkpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChtYXRjaCAmJiAhbWF0Y2guc29tZSgocGF0dGVybik6IGJvb2xlYW4gPT4gISFwYXRoLm1hdGNoKHBhdHRlcm4pKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoc2tpcCAmJiBza2lwLnNvbWUoKHBhdHRlcm4pOiBib29sZWFuID0+ICEhcGF0aC5tYXRjaChwYXR0ZXJuKSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKiBPcHRpb25zIGZvciB7QGxpbmtjb2RlIHdhbGt9IGFuZCB7QGxpbmtjb2RlIHdhbGtTeW5jfS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgV2Fsa09wdGlvbnMge1xuICAvKipcbiAgICogVGhlIG1heGltdW0gZGVwdGggb2YgdGhlIGZpbGUgdHJlZSB0byBiZSB3YWxrZWQgcmVjdXJzaXZlbHkuXG4gICAqXG4gICAqIEBkZWZhdWx0IHtJbmZpbml0eX1cbiAgICovXG4gIG1heERlcHRoPzogbnVtYmVyO1xuICAvKipcbiAgICogSW5kaWNhdGVzIHdoZXRoZXIgZmlsZSBlbnRyaWVzIHNob3VsZCBiZSBpbmNsdWRlZCBvciBub3QuXG4gICAqXG4gICAqIEBkZWZhdWx0IHt0cnVlfVxuICAgKi9cbiAgaW5jbHVkZUZpbGVzPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEluZGljYXRlcyB3aGV0aGVyIGRpcmVjdG9yeSBlbnRyaWVzIHNob3VsZCBiZSBpbmNsdWRlZCBvciBub3QuXG4gICAqXG4gICAqIEBkZWZhdWx0IHt0cnVlfVxuICAgKi9cbiAgaW5jbHVkZURpcnM/OiBib29sZWFuO1xuICAvKipcbiAgICogSW5kaWNhdGVzIHdoZXRoZXIgc3ltbGluayBlbnRyaWVzIHNob3VsZCBiZSBpbmNsdWRlZCBvciBub3QuXG4gICAqIFRoaXMgb3B0aW9uIGlzIG1lYW5pbmdmdWwgb25seSBpZiBgZm9sbG93U3ltbGlua3NgIGlzIHNldCB0byBgZmFsc2VgLlxuICAgKlxuICAgKiBAZGVmYXVsdCB7dHJ1ZX1cbiAgICovXG4gIGluY2x1ZGVTeW1saW5rcz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgd2hldGhlciBzeW1saW5rcyBzaG91bGQgYmUgcmVzb2x2ZWQgb3Igbm90LlxuICAgKlxuICAgKiBAZGVmYXVsdCB7ZmFsc2V9XG4gICAqL1xuICBmb2xsb3dTeW1saW5rcz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgd2hldGhlciB0aGUgZm9sbG93ZWQgc3ltbGluaydzIHBhdGggc2hvdWxkIGJlIGNhbm9uaWNhbGl6ZWQuXG4gICAqIFRoaXMgb3B0aW9uIHdvcmtzIG9ubHkgaWYgYGZvbGxvd1N5bWxpbmtzYCBpcyBub3QgYGZhbHNlYC5cbiAgICpcbiAgICogQGRlZmF1bHQge3RydWV9XG4gICAqL1xuICBjYW5vbmljYWxpemU/OiBib29sZWFuO1xuICAvKipcbiAgICogTGlzdCBvZiBmaWxlIGV4dGVuc2lvbnMgdXNlZCB0byBmaWx0ZXIgZW50cmllcy5cbiAgICogSWYgc3BlY2lmaWVkLCBlbnRyaWVzIHdpdGhvdXQgdGhlIGZpbGUgZXh0ZW5zaW9uIHNwZWNpZmllZCBieSB0aGlzIG9wdGlvblxuICAgKiBhcmUgZXhjbHVkZWQuXG4gICAqXG4gICAqIEZpbGUgZXh0ZW5zaW9ucyB3aXRoIG9yIHdpdGhvdXQgYSBsZWFkaW5nIHBlcmlvZCBhcmUgYWNjZXB0ZWQuXG4gICAqXG4gICAqIEBkZWZhdWx0IHtbXX1cbiAgICovXG4gIGV4dHM/OiBzdHJpbmdbXTtcbiAgLyoqXG4gICAqIExpc3Qgb2YgcmVndWxhciBleHByZXNzaW9uIHBhdHRlcm5zIHVzZWQgdG8gZmlsdGVyIGVudHJpZXMuXG4gICAqIElmIHNwZWNpZmllZCwgZW50cmllcyB0aGF0IGRvIG5vdCBtYXRjaCB0aGUgcGF0dGVybnMgc3BlY2lmaWVkIGJ5IHRoaXNcbiAgICogb3B0aW9uIGFyZSBleGNsdWRlZC5cbiAgICovXG4gIG1hdGNoPzogUmVnRXhwW107XG4gIC8qKlxuICAgKiBMaXN0IG9mIHJlZ3VsYXIgZXhwcmVzc2lvbiBwYXR0ZXJucyB1c2VkIHRvIGZpbHRlciBlbnRyaWVzLlxuICAgKiBJZiBzcGVjaWZpZWQsIGVudHJpZXMgbWF0Y2hpbmcgdGhlIHBhdHRlcm5zIHNwZWNpZmllZCBieSB0aGlzIG9wdGlvbiBhcmVcbiAgICogZXhjbHVkZWQuXG4gICAqL1xuICBza2lwPzogUmVnRXhwW107XG59XG5leHBvcnQgdHlwZSB7IFdhbGtFbnRyeSB9O1xuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IHdhbGtzIHRocm91Z2ggYSBkaXJlY3RvcnkgYW5kIHlpZWxkcyBpbmZvcm1hdGlvbiBhYm91dCBlYWNoIGZpbGVcbiAqIGFuZCBkaXJlY3RvcnkgZW5jb3VudGVyZWQuXG4gKlxuICogVGhlIHJvb3QgcGF0aCBkZXRlcm1pbmVzIHdoZXRoZXIgdGhlIGZpbGUgcGF0aHMgYXJlIHJlbGF0aXZlIG9yIGFic29sdXRlLlxuICogVGhlIHJvb3QgZGlyZWN0b3J5IGlzIGluY2x1ZGVkIGluIHRoZSB5aWVsZGVkIGVudHJpZXMuXG4gKlxuICogUmVxdWlyZXMgYC0tYWxsb3ctcmVhZGAgcGVybWlzc2lvbi5cbiAqXG4gKiBAc2VlIHtAbGluayBodHRwczovL2RvY3MuZGVuby5jb20vcnVudGltZS9tYW51YWwvYmFzaWNzL3Blcm1pc3Npb25zI2ZpbGUtc3lzdGVtLWFjY2Vzc31cbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIERlbm8ncyBwZXJtaXNzaW9ucyBzeXN0ZW0uXG4gKlxuICogQHBhcmFtIHJvb3QgVGhlIHJvb3QgZGlyZWN0b3J5IHRvIHN0YXJ0IHRoZSB3YWxrIGZyb20sIGFzIGEgc3RyaW5nIG9yIFVSTC5cbiAqIEBwYXJhbSBvcHRpb25zIFRoZSBvcHRpb25zIGZvciB0aGUgd2Fsay5cbiAqIEB0aHJvd3Mge0Rlbm8uZXJyb3JzLk5vdEZvdW5kfSBJZiB0aGUgcm9vdCBkaXJlY3RvcnkgZG9lcyBub3QgZXhpc3QuXG4gKlxuICogQHJldHVybnMgQW4gYXN5bmMgaXRlcmFibGUgaXRlcmF0b3IgdGhhdCB5aWVsZHMgdGhlIHdhbGsgZW50cnkgb2JqZWN0cy5cbiAqXG4gKiBAZXhhbXBsZSBCYXNpYyB1c2FnZVxuICpcbiAqIEZpbGUgc3RydWN0dXJlOlxuICogYGBgXG4gKiBmb2xkZXJcbiAqIOKUnOKUgOKUgCBzY3JpcHQudHNcbiAqIOKUlOKUgOKUgCBmb28udHNcbiAqIGBgYFxuICpcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgd2FsayB9IGZyb20gXCJAc3RkL2ZzL3dhbGtcIjtcbiAqXG4gKiBhd2FpdCBBcnJheS5mcm9tQXN5bmMod2FsayhcIi5cIikpO1xuICogLy8gW1xuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCIuXCIsXG4gKiAvLyAgICAgbmFtZTogXCIuXCIsXG4gKiAvLyAgICAgaXNGaWxlOiBmYWxzZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogdHJ1ZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIG5hbWU6IFwic2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgaXNGaWxlOiB0cnVlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiBmYWxzZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcImZvby50c1wiLFxuICogLy8gICAgIG5hbWU6IFwiZm9vLnRzXCIsXG4gKiAvLyAgICAgaXNGaWxlOiB0cnVlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiBmYWxzZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyBdXG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZSBNYXhpbXVtIGZpbGUgZGVwdGhcbiAqXG4gKiBTZXR0aW5nIHRoZSBgbWF4RGVwdGhgIG9wdGlvbiB0byBgMWAgd2lsbCBvbmx5IGluY2x1ZGUgdGhlIHJvb3QgZGlyZWN0b3J5IGFuZFxuICogaXRzIGltbWVkaWF0ZSBjaGlsZHJlbi5cbiAqXG4gKiBGaWxlIHN0cnVjdHVyZTpcbiAqIGBgYFxuICogZm9sZGVyXG4gKiDilJzilIDilIAgc2NyaXB0LnRzXG4gKiDilJTilIDilIAgZm9vXG4gKiAgICAg4pSU4pSA4pSAIGJhci50c1xuICogYGBgXG4gKlxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyB3YWxrIH0gZnJvbSBcIkBzdGQvZnMvd2Fsa1wiO1xuICpcbiAqIGF3YWl0IEFycmF5LmZyb21Bc3luYyh3YWxrKFwiLlwiLCB7IG1heERlcHRoOiAxIH0pKTtcbiAqIC8vIFtcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwiLlwiLFxuICogLy8gICAgIG5hbWU6IFwiLlwiLFxuICogLy8gICAgIGlzRmlsZTogZmFsc2UsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IHRydWUsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZVxuICogLy8gICB9LFxuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBuYW1lOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIGlzRmlsZTogdHJ1ZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZVxuICogLy8gICB9LFxuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCJmb29cIixcbiAqIC8vICAgICBuYW1lOiBcImZvb1wiLFxuICogLy8gICAgIGlzRmlsZTogZmFsc2UsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IHRydWUsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZVxuICogLy8gICB9LFxuICogLy8gXVxuICogYGBgXG4gKlxuICogQGV4YW1wbGUgRXhjbHVkZSBmaWxlc1xuICpcbiAqIFNldHRpbmcgdGhlIGBpbmNsdWRlRmlsZXNgIG9wdGlvbiB0byBgZmFsc2VgIHdpbGwgZXhjbHVkZSBmaWxlcy5cbiAqXG4gKiBGaWxlIHN0cnVjdHVyZTpcbiAqIGBgYFxuICogZm9sZGVyXG4gKiDilJzilIDilIAgc2NyaXB0LnRzXG4gKiDilJTilIDilIAgZm9vXG4gKiBgYGBcbiAqXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IHdhbGsgfSBmcm9tIFwiQHN0ZC9mcy93YWxrXCI7XG4gKlxuICogYXdhaXQgQXJyYXkuZnJvbUFzeW5jKHdhbGsoXCIuXCIsIHsgaW5jbHVkZUZpbGVzOiBmYWxzZSB9KSk7XG4gKiAvLyBbXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcIi5cIixcbiAqIC8vICAgICBuYW1lOiBcIi5cIixcbiAqIC8vICAgICBpc0ZpbGU6IGZhbHNlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiB0cnVlLFxuICogLy8gICAgIGlzU3ltbGluazogZmFsc2VcbiAqIC8vICAgfSxcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwiZm9vXCIsXG4gKiAvLyAgICAgbmFtZTogXCJmb29cIixcbiAqIC8vICAgICBpc0ZpbGU6IGZhbHNlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiB0cnVlLFxuICogLy8gICAgIGlzU3ltbGluazogZmFsc2UsXG4gKiAvLyAgIH0sXG4gKiAvLyBdXG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZSBFeGNsdWRlIGRpcmVjdG9yaWVzXG4gKlxuICogU2V0dGluZyB0aGUgYGluY2x1ZGVEaXJzYCBvcHRpb24gdG8gYGZhbHNlYCB3aWxsIGV4Y2x1ZGUgZGlyZWN0b3JpZXMuXG4gKlxuICogRmlsZSBzdHJ1Y3R1cmU6XG4gKiBgYGBcbiAqIGZvbGRlclxuICog4pSc4pSA4pSAIHNjcmlwdC50c1xuICog4pSU4pSA4pSAIGZvb1xuICogYGBgXG4gKlxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyB3YWxrIH0gZnJvbSBcIkBzdGQvZnMvd2Fsa1wiO1xuICpcbiAqIGF3YWl0IEFycmF5LmZyb21Bc3luYyh3YWxrKFwiLlwiLCB7IGluY2x1ZGVEaXJzOiBmYWxzZSB9KSk7XG4gKiAvLyBbXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIG5hbWU6IFwic2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgaXNGaWxlOiB0cnVlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiBmYWxzZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyBdXG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZSBFeGNsdWRlIHN5bWJvbGljIGxpbmtzXG4gKlxuICogU2V0dGluZyB0aGUgYGluY2x1ZGVTeW1saW5rc2Agb3B0aW9uIHRvIGBmYWxzZWAgd2lsbCBleGNsdWRlIHN5bWJvbGljIGxpbmtzLlxuICpcbiAqIEZpbGUgc3RydWN0dXJlOlxuICogYGBgXG4gKiBmb2xkZXJcbiAqIOKUnOKUgOKUgCBzY3JpcHQudHNcbiAqIOKUnOKUgOKUgCBmb29cbiAqIOKUlOKUgOKUgCBsaW5rIC0+IHNjcmlwdC50cyAoc3ltYm9saWMgbGluaylcbiAqIGBgYFxuICpcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgd2FsayB9IGZyb20gXCJAc3RkL2ZzL3dhbGtcIjtcbiAqXG4gKiBhd2FpdCBBcnJheS5mcm9tQXN5bmMod2FsayhcIi5cIiwgeyBpbmNsdWRlU3ltbGlua3M6IGZhbHNlIH0pKTtcbiAqIC8vIFtcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwiLlwiLFxuICogLy8gICAgIG5hbWU6IFwiLlwiLFxuICogLy8gICAgIGlzRmlsZTogZmFsc2UsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IHRydWUsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZVxuICogLy8gICB9LFxuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBuYW1lOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIGlzRmlsZTogdHJ1ZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZVxuICogLy8gICB9LFxuICogLy8gXVxuICogYGBgXG4gKlxuICogQGV4YW1wbGUgRm9sbG93IHN5bWJvbGljIGxpbmtzXG4gKlxuICogU2V0dGluZyB0aGUgYGZvbGxvd1N5bWxpbmtzYCBvcHRpb24gdG8gYHRydWVgIHdpbGwgZm9sbG93IHN5bWJvbGljIGxpbmtzLFxuICogYWZmZWN0aW5nIHRoZSBgcGF0aGAgcHJvcGVydHkgb2YgdGhlIHdhbGsgZW50cnkuXG4gKlxuICogRmlsZSBzdHJ1Y3R1cmU6XG4gKiBgYGBcbiAqIGZvbGRlclxuICog4pSc4pSA4pSAIHNjcmlwdC50c1xuICog4pSU4pSA4pSAIGxpbmsgLT4gc2NyaXB0LnRzIChzeW1ib2xpYyBsaW5rKVxuICogYGBgXG4gKlxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyB3YWxrIH0gZnJvbSBcIkBzdGQvZnMvd2Fsa1wiO1xuICpcbiAqIGF3YWl0IEFycmF5LmZyb21Bc3luYyh3YWxrKFwiLlwiLCB7IGZvbGxvd1N5bWxpbmtzOiB0cnVlIH0pKTtcbiAqIC8vIFtcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwiLlwiLFxuICogLy8gICAgIG5hbWU6IFwiLlwiLFxuICogLy8gICAgIGlzRmlsZTogZmFsc2UsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IHRydWUsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZVxuICogLy8gICB9LFxuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBuYW1lOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIGlzRmlsZTogdHJ1ZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZVxuICogLy8gICB9LFxuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBuYW1lOiBcImxpbmtcIixcbiAqIC8vICAgICBpc0ZpbGU6IHRydWUsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IGZhbHNlLFxuICogLy8gICAgIGlzU3ltbGluazogdHJ1ZVxuICogLy8gICB9LFxuICogLy8gXVxuICogYGBgXG4gKlxuICogQGV4YW1wbGUgQ2Fub25pY2FsaXplIHN5bWJvbGljIGxpbmtzXG4gKlxuICogU2V0dGluZyB0aGUgYGNhbm9uaWNhbGl6ZWAgb3B0aW9uIHRvIGBmYWxzZWAgd2lsbCBjYW5vbmljYWxpemUgdGhlIHBhdGggb2ZcbiAqIHRoZSBmb2xsb3dlZCBzeW1ib2xpYyBsaW5rLiBNZWFuaW5nLCB0aGUgYHBhdGhgIHByb3BlcnR5IG9mIHRoZSB3YWxrIGVudHJ5XG4gKiB3aWxsIGJlIHRoZSBwYXRoIG9mIHRoZSBzeW1ib2xpYyBsaW5rIGl0c2VsZi5cbiAqXG4gKiBGaWxlIHN0cnVjdHVyZTpcbiAqIGBgYFxuICogZm9sZGVyXG4gKiDilJzilIDilIAgc2NyaXB0LnRzXG4gKiDilJTilIDilIAgbGluayAtPiBzY3JpcHQudHMgKHN5bWJvbGljIGxpbmspXG4gKiBgYGBcbiAqXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IHdhbGsgfSBmcm9tIFwiQHN0ZC9mcy93YWxrXCI7XG4gKlxuICogYXdhaXQgQXJyYXkuZnJvbUFzeW5jKHdhbGsoXCIuXCIsIHsgZm9sbG93U3ltbGlua3M6IHRydWUsIGNhbm9uaWNhbGl6ZTogdHJ1ZSB9KSk7XG4gKiAvLyBbXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcIi5cIixcbiAqIC8vICAgICBuYW1lOiBcIi5cIixcbiAqIC8vICAgICBpc0ZpbGU6IGZhbHNlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiB0cnVlLFxuICogLy8gICAgIGlzU3ltbGluazogZmFsc2VcbiAqIC8vICAgfSxcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwic2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgbmFtZTogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBpc0ZpbGU6IHRydWUsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IGZhbHNlLFxuICogLy8gICAgIGlzU3ltbGluazogZmFsc2VcbiAqIC8vICAgfSxcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwibGlua1wiLFxuICogLy8gICAgIG5hbWU6IFwibGlua1wiLFxuICogLy8gICAgIGlzRmlsZTogdHJ1ZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gKiAvLyAgICAgaXNTeW1saW5rOiB0cnVlXG4gKiAvLyAgIH0sXG4gKiAvLyBdXG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZSBGaWx0ZXIgYnkgZmlsZSBleHRlbnNpb25zXG4gKlxuICogU2V0dGluZyB0aGUgYGV4dHNgIG9wdGlvbiB0byBgW1wiLnRzXCJdYCBvciBgW1widHNcIl1gIHdpbGwgb25seSBpbmNsdWRlIGVudHJpZXNcbiAqIHdpdGggdGhlIGAudHNgIGZpbGUgZXh0ZW5zaW9uLlxuICpcbiAqIEZpbGUgc3RydWN0dXJlOlxuICogYGBgXG4gKiBmb2xkZXJcbiAqIOKUnOKUgOKUgCBzY3JpcHQudHNcbiAqIOKUlOKUgOKUgCBmb28uanNcbiAqIGBgYFxuICpcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgd2FsayB9IGZyb20gXCJAc3RkL2ZzL3dhbGtcIjtcbiAqXG4gKiBhd2FpdCBBcnJheS5mcm9tQXN5bmMod2FsayhcIi5cIiwgeyBleHRzOiBbXCIudHNcIl0gfSkpO1xuICogLy8gW1xuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBuYW1lOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIGlzRmlsZTogdHJ1ZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZVxuICogLy8gICB9LFxuICogLy8gXVxuICogYGBgXG4gKlxuICogQGV4YW1wbGUgRmlsdGVyIGJ5IHJlZ3VsYXIgZXhwcmVzc2lvbnNcbiAqXG4gKiBTZXR0aW5nIHRoZSBgbWF0Y2hgIG9wdGlvbiB0byBgWy9zL11gIHdpbGwgb25seSBpbmNsdWRlIGVudHJpZXMgd2l0aCB0aGVcbiAqIGxldHRlciBgc2AgaW4gdGhlaXIgbmFtZS5cbiAqXG4gKiBGaWxlIHN0cnVjdHVyZTpcbiAqIGBgYFxuICogZm9sZGVyXG4gKiDilJzilIDilIAgc2NyaXB0LnRzXG4gKiDilJTilIDilIAgUkVBRE1FLm1kXG4gKiBgYGBcbiAqXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IHdhbGsgfSBmcm9tIFwiQHN0ZC9mcy93YWxrXCI7XG4gKlxuICogYXdhaXQgQXJyYXkuZnJvbUFzeW5jKHdhbGsoXCIuXCIsIHsgbWF0Y2g6IFsvcy9dIH0pKTtcbiAqIC8vIFtcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwic2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgbmFtZTogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBpc0ZpbGU6IHRydWUsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IGZhbHNlLFxuICogLy8gICAgIGlzU3ltbGluazogZmFsc2VcbiAqIC8vICAgfSxcbiAqIC8vIF1cbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlIEV4Y2x1ZGUgYnkgcmVndWxhciBleHByZXNzaW9uc1xuICpcbiAqIFNldHRpbmcgdGhlIGBza2lwYCBvcHRpb24gdG8gYFsvcy9dYCB3aWxsIGV4Y2x1ZGUgZW50cmllcyB3aXRoIHRoZSBsZXR0ZXJcbiAqIGBzYCBpbiB0aGVpciBuYW1lLlxuICpcbiAqIEZpbGUgc3RydWN0dXJlOlxuICogYGBgXG4gKiBmb2xkZXJcbiAqIOKUnOKUgOKUgCBzY3JpcHQudHNcbiAqIOKUlOKUgOKUgCBSRUFETUUubWRcbiAqIGBgYFxuICpcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgd2FsayB9IGZyb20gXCJAc3RkL2ZzL3dhbGtcIjtcbiAqXG4gKiBhd2FpdCBBcnJheS5mcm9tQXN5bmMod2FsayhcIi5cIiwgeyBza2lwOiBbL3MvXSB9KSk7XG4gKiAvLyBbXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcIlJFQURNRS5tZFwiLFxuICogLy8gICAgIG5hbWU6IFwiUkVBRE1FLm1kXCIsXG4gKiAvLyAgICAgaXNGaWxlOiB0cnVlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiBmYWxzZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyBdXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiB3YWxrKFxuICByb290OiBzdHJpbmcgfCBVUkwsXG4gIG9wdGlvbnM/OiBXYWxrT3B0aW9ucyxcbik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxXYWxrRW50cnk+IHtcbiAgbGV0IHtcbiAgICBtYXhEZXB0aCA9IEluZmluaXR5LFxuICAgIGluY2x1ZGVGaWxlcyA9IHRydWUsXG4gICAgaW5jbHVkZURpcnMgPSB0cnVlLFxuICAgIGluY2x1ZGVTeW1saW5rcyA9IHRydWUsXG4gICAgZm9sbG93U3ltbGlua3MgPSBmYWxzZSxcbiAgICBjYW5vbmljYWxpemUgPSB0cnVlLFxuICAgIGV4dHMgPSB1bmRlZmluZWQsXG4gICAgbWF0Y2ggPSB1bmRlZmluZWQsXG4gICAgc2tpcCA9IHVuZGVmaW5lZCxcbiAgfSA9IG9wdGlvbnMgPz8ge307XG5cbiAgaWYgKG1heERlcHRoIDwgMCkge1xuICAgIHJldHVybjtcbiAgfVxuICByb290ID0gdG9QYXRoU3RyaW5nKHJvb3QpO1xuICBpZiAoZXh0cykge1xuICAgIGV4dHMgPSBleHRzLm1hcCgoZXh0KSA9PiBleHQuc3RhcnRzV2l0aChcIi5cIikgPyBleHQgOiBgLiR7ZXh0fWApO1xuICB9XG4gIGlmIChpbmNsdWRlRGlycyAmJiBpbmNsdWRlKHJvb3QsIGV4dHMsIG1hdGNoLCBza2lwKSkge1xuICAgIHlpZWxkIGF3YWl0IGNyZWF0ZVdhbGtFbnRyeShyb290KTtcbiAgfVxuICBpZiAobWF4RGVwdGggPCAxIHx8ICFpbmNsdWRlKHJvb3QsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBza2lwKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBmb3IgYXdhaXQgKGNvbnN0IGVudHJ5IG9mIERlbm8ucmVhZERpcihyb290KSkge1xuICAgIGxldCBwYXRoID0gam9pbihyb290LCBlbnRyeS5uYW1lKTtcblxuICAgIGxldCB7IGlzU3ltbGluaywgaXNEaXJlY3RvcnkgfSA9IGVudHJ5O1xuXG4gICAgaWYgKGlzU3ltbGluaykge1xuICAgICAgaWYgKCFmb2xsb3dTeW1saW5rcykge1xuICAgICAgICBpZiAoaW5jbHVkZVN5bWxpbmtzICYmIGluY2x1ZGUocGF0aCwgZXh0cywgbWF0Y2gsIHNraXApKSB7XG4gICAgICAgICAgeWllbGQgeyBwYXRoLCAuLi5lbnRyeSB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVhbFBhdGggPSBhd2FpdCBEZW5vLnJlYWxQYXRoKHBhdGgpO1xuICAgICAgaWYgKGNhbm9uaWNhbGl6ZSkge1xuICAgICAgICBwYXRoID0gcmVhbFBhdGg7XG4gICAgICB9XG4gICAgICAvLyBDYXZlYXQgZW1wdG9yOiBkb24ndCBhc3N1bWUgfHBhdGh8IGlzIG5vdCBhIHN5bWxpbmsuIHJlYWxwYXRoKClcbiAgICAgIC8vIHJlc29sdmVzIHN5bWxpbmtzIGJ1dCBhbm90aGVyIHByb2Nlc3MgY2FuIHJlcGxhY2UgdGhlIGZpbGUgc3lzdGVtXG4gICAgICAvLyBlbnRpdHkgd2l0aCBhIGRpZmZlcmVudCB0eXBlIG9mIGVudGl0eSBiZWZvcmUgd2UgY2FsbCBsc3RhdCgpLlxuICAgICAgKHsgaXNTeW1saW5rLCBpc0RpcmVjdG9yeSB9ID0gYXdhaXQgRGVuby5sc3RhdChyZWFsUGF0aCkpO1xuICAgIH1cblxuICAgIGlmIChpc1N5bWxpbmsgfHwgaXNEaXJlY3RvcnkpIHtcbiAgICAgIGNvbnN0IG9wdHM6IFdhbGtPcHRpb25zID0ge1xuICAgICAgICBtYXhEZXB0aDogbWF4RGVwdGggLSAxLFxuICAgICAgICBpbmNsdWRlRmlsZXMsXG4gICAgICAgIGluY2x1ZGVEaXJzLFxuICAgICAgICBpbmNsdWRlU3ltbGlua3MsXG4gICAgICAgIGZvbGxvd1N5bWxpbmtzLFxuICAgICAgfTtcbiAgICAgIGlmIChleHRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3B0cy5leHRzID0gZXh0cztcbiAgICAgIH1cbiAgICAgIGlmIChtYXRjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9wdHMubWF0Y2ggPSBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGlmIChza2lwICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3B0cy5za2lwID0gc2tpcDtcbiAgICAgIH1cbiAgICAgIHlpZWxkKiB3YWxrKHBhdGgsIG9wdHMpO1xuICAgIH0gZWxzZSBpZiAoaW5jbHVkZUZpbGVzICYmIGluY2x1ZGUocGF0aCwgZXh0cywgbWF0Y2gsIHNraXApKSB7XG4gICAgICB5aWVsZCB7IHBhdGgsIC4uLmVudHJ5IH07XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgd2Fsa3MgdGhyb3VnaCBhIGRpcmVjdG9yeSBhbmQgeWllbGRzIGluZm9ybWF0aW9uIGFib3V0IGVhY2ggZmlsZVxuICogYW5kIGRpcmVjdG9yeSBlbmNvdW50ZXJlZC5cbiAqXG4gKiBUaGUgcm9vdCBwYXRoIGRldGVybWluZXMgd2hldGhlciB0aGUgZmlsZSBwYXRocyBpcyByZWxhdGl2ZSBvciBhYnNvbHV0ZS5cbiAqIFRoZSByb290IGRpcmVjdG9yeSBpcyBpbmNsdWRlZCBpbiB0aGUgeWllbGRlZCBlbnRyaWVzLlxuICpcbiAqIFJlcXVpcmVzIGAtLWFsbG93LXJlYWRgIHBlcm1pc3Npb24uXG4gKlxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9kb2NzLmRlbm8uY29tL3J1bnRpbWUvbWFudWFsL2Jhc2ljcy9wZXJtaXNzaW9ucyNmaWxlLXN5c3RlbS1hY2Nlc3N9XG4gKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBEZW5vJ3MgcGVybWlzc2lvbnMgc3lzdGVtLlxuICpcbiAqIEBwYXJhbSByb290IFRoZSByb290IGRpcmVjdG9yeSB0byBzdGFydCB0aGUgd2FsayBmcm9tLCBhcyBhIHN0cmluZyBvciBVUkwuXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgb3B0aW9ucyBmb3IgdGhlIHdhbGsuXG4gKlxuICogQHJldHVybnMgQSBzeW5jaHJvbm91cyBpdGVyYWJsZSBpdGVyYXRvciB0aGF0IHlpZWxkcyB0aGUgd2FsayBlbnRyeSBvYmplY3RzLlxuICpcbiAqIEBleGFtcGxlIEJhc2ljIHVzYWdlXG4gKlxuICogRmlsZSBzdHJ1Y3R1cmU6XG4gKiBgYGBcbiAqIGZvbGRlclxuICog4pSc4pSA4pSAIHNjcmlwdC50c1xuICog4pSU4pSA4pSAIGZvby50c1xuICogYGBgXG4gKlxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyB3YWxrU3luYyB9IGZyb20gXCJAc3RkL2ZzL3dhbGtcIjtcbiAqXG4gKiBBcnJheS5mcm9tKHdhbGtTeW5jKFwiLlwiKSk7XG4gKiAvLyBbXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcIi5cIixcbiAqIC8vICAgICBuYW1lOiBcIi5cIixcbiAqIC8vICAgICBpc0ZpbGU6IGZhbHNlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiB0cnVlLFxuICogLy8gICAgIGlzU3ltbGluazogZmFsc2VcbiAqIC8vICAgfSxcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwic2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgbmFtZTogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBpc0ZpbGU6IHRydWUsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IGZhbHNlLFxuICogLy8gICAgIGlzU3ltbGluazogZmFsc2VcbiAqIC8vICAgfSxcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwiZm9vLnRzXCIsXG4gKiAvLyAgICAgbmFtZTogXCJmb28udHNcIixcbiAqIC8vICAgICBpc0ZpbGU6IHRydWUsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IGZhbHNlLFxuICogLy8gICAgIGlzU3ltbGluazogZmFsc2VcbiAqIC8vICAgfSxcbiAqIC8vIF1cbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlIE1heGltdW0gZmlsZSBkZXB0aFxuICpcbiAqIFNldHRpbmcgdGhlIGBtYXhEZXB0aGAgb3B0aW9uIHRvIGAxYCB3aWxsIG9ubHkgaW5jbHVkZSB0aGUgcm9vdCBkaXJlY3RvcnkgYW5kXG4gKiBpdHMgaW1tZWRpYXRlIGNoaWxkcmVuLlxuICpcbiAqIEZpbGUgc3RydWN0dXJlOlxuICogYGBgXG4gKiBmb2xkZXJcbiAqIOKUnOKUgOKUgCBzY3JpcHQudHNcbiAqIOKUlOKUgOKUgCBmb29cbiAqICAgICDilJTilIDilIAgYmFyLnRzXG4gKiBgYGBcbiAqXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IHdhbGtTeW5jIH0gZnJvbSBcIkBzdGQvZnMvd2Fsa1wiO1xuICpcbiAqIEFycmF5LmZyb20od2Fsa1N5bmMoXCIuXCIsIHsgbWF4RGVwdGg6IDEgfSkpO1xuICogLy8gW1xuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCIuXCIsXG4gKiAvLyAgICAgbmFtZTogXCIuXCIsXG4gKiAvLyAgICAgaXNGaWxlOiBmYWxzZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogdHJ1ZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIG5hbWU6IFwic2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgaXNGaWxlOiB0cnVlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiBmYWxzZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcImZvb1wiLFxuICogLy8gICAgIG5hbWU6IFwiZm9vXCIsXG4gKiAvLyAgICAgaXNGaWxlOiBmYWxzZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogdHJ1ZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyBdXG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZSBFeGNsdWRlIGZpbGVzXG4gKlxuICogU2V0dGluZyB0aGUgYGluY2x1ZGVGaWxlc2Agb3B0aW9uIHRvIGBmYWxzZWAgd2lsbCBleGNsdWRlIGZpbGVzLlxuICpcbiAqIEZpbGUgc3RydWN0dXJlOlxuICogYGBgXG4gKiBmb2xkZXJcbiAqIOKUnOKUgOKUgCBzY3JpcHQudHNcbiAqIOKUlOKUgOKUgCBmb29cbiAqIGBgYFxuICpcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgd2Fsa1N5bmMgfSBmcm9tIFwiQHN0ZC9mcy93YWxrXCI7XG4gKlxuICogQXJyYXkuZnJvbSh3YWxrU3luYyhcIi5cIiwgeyBpbmNsdWRlRmlsZXM6IGZhbHNlIH0pKTtcbiAqIC8vIFtcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwiLlwiLFxuICogLy8gICAgIG5hbWU6IFwiLlwiLFxuICogLy8gICAgIGlzRmlsZTogZmFsc2UsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IHRydWUsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZVxuICogLy8gICB9LFxuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCJmb29cIixcbiAqIC8vICAgICBuYW1lOiBcImZvb1wiLFxuICogLy8gICAgIGlzRmlsZTogZmFsc2UsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IHRydWUsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZSxcbiAqIC8vICAgfSxcbiAqIC8vIF1cbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlIEV4Y2x1ZGUgZGlyZWN0b3JpZXNcbiAqXG4gKiBTZXR0aW5nIHRoZSBgaW5jbHVkZURpcnNgIG9wdGlvbiB0byBgZmFsc2VgIHdpbGwgZXhjbHVkZSBkaXJlY3Rvcmllcy5cbiAqXG4gKiBGaWxlIHN0cnVjdHVyZTpcbiAqIGBgYFxuICogZm9sZGVyXG4gKiDilJzilIDilIAgc2NyaXB0LnRzXG4gKiDilJTilIDilIAgZm9vXG4gKiBgYGBcbiAqXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IHdhbGtTeW5jIH0gZnJvbSBcIkBzdGQvZnMvd2Fsa1wiO1xuICpcbiAqIEFycmF5LmZyb20od2Fsa1N5bmMoXCIuXCIsIHsgaW5jbHVkZURpcnM6IGZhbHNlIH0pKTtcbiAqIC8vIFtcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwic2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgbmFtZTogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBpc0ZpbGU6IHRydWUsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IGZhbHNlLFxuICogLy8gICAgIGlzU3ltbGluazogZmFsc2VcbiAqIC8vICAgfSxcbiAqIC8vIF1cbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlIEV4Y2x1ZGUgc3ltYm9saWMgbGlua3NcbiAqXG4gKiBTZXR0aW5nIHRoZSBgaW5jbHVkZVN5bWxpbmtzYCBvcHRpb24gdG8gYGZhbHNlYCB3aWxsIGV4Y2x1ZGUgc3ltYm9saWMgbGlua3MuXG4gKlxuICogRmlsZSBzdHJ1Y3R1cmU6XG4gKiBgYGBcbiAqIGZvbGRlclxuICog4pSc4pSA4pSAIHNjcmlwdC50c1xuICog4pSc4pSA4pSAIGZvb1xuICog4pSU4pSA4pSAIGxpbmsgLT4gc2NyaXB0LnRzIChzeW1ib2xpYyBsaW5rKVxuICogYGBgXG4gKlxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyB3YWxrU3luYyB9IGZyb20gXCJAc3RkL2ZzL3dhbGtcIjtcbiAqXG4gKiBBcnJheS5mcm9tKHdhbGtTeW5jKFwiLlwiLCB7IGluY2x1ZGVTeW1saW5rczogZmFsc2UgfSkpO1xuICogLy8gW1xuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCIuXCIsXG4gKiAvLyAgICAgbmFtZTogXCIuXCIsXG4gKiAvLyAgICAgaXNGaWxlOiBmYWxzZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogdHJ1ZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIG5hbWU6IFwic2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgaXNGaWxlOiB0cnVlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiBmYWxzZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyBdXG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZSBGb2xsb3cgc3ltYm9saWMgbGlua3NcbiAqXG4gKiBTZXR0aW5nIHRoZSBgZm9sbG93U3ltbGlua3NgIG9wdGlvbiB0byBgdHJ1ZWAgd2lsbCBmb2xsb3cgc3ltYm9saWMgbGlua3MsXG4gKiBhZmZlY3RpbmcgdGhlIGBwYXRoYCBwcm9wZXJ0eSBvZiB0aGUgd2FsayBlbnRyeS5cbiAqXG4gKiBGaWxlIHN0cnVjdHVyZTpcbiAqIGBgYFxuICogZm9sZGVyXG4gKiDilJzilIDilIAgc2NyaXB0LnRzXG4gKiDilJTilIDilIAgbGluayAtPiBzY3JpcHQudHMgKHN5bWJvbGljIGxpbmspXG4gKiBgYGBcbiAqXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IHdhbGtTeW5jIH0gZnJvbSBcIkBzdGQvZnMvd2Fsa1wiO1xuICpcbiAqIEFycmF5LmZyb20od2Fsa1N5bmMoXCIuXCIsIHsgZm9sbG93U3ltbGlua3M6IHRydWUgfSkpO1xuICogLy8gW1xuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCIuXCIsXG4gKiAvLyAgICAgbmFtZTogXCIuXCIsXG4gKiAvLyAgICAgaXNGaWxlOiBmYWxzZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogdHJ1ZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIG5hbWU6IFwic2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgaXNGaWxlOiB0cnVlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiBmYWxzZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIG5hbWU6IFwibGlua1wiLFxuICogLy8gICAgIGlzRmlsZTogdHJ1ZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gKiAvLyAgICAgaXNTeW1saW5rOiB0cnVlXG4gKiAvLyAgIH0sXG4gKiAvLyBdXG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZSBDYW5vbmljYWxpemUgc3ltYm9saWMgbGlua3NcbiAqXG4gKiBTZXR0aW5nIHRoZSBgY2Fub25pY2FsaXplYCBvcHRpb24gdG8gYGZhbHNlYCB3aWxsIGNhbm9uaWNhbGl6ZSB0aGUgcGF0aCBvZlxuICogdGhlIGZvbGxvd2VkIHN5bWJvbGljIGxpbmsuIE1lYW5pbmcsIHRoZSBgcGF0aGAgcHJvcGVydHkgb2YgdGhlIHdhbGsgZW50cnlcbiAqIHdpbGwgYmUgdGhlIHBhdGggb2YgdGhlIHN5bWJvbGljIGxpbmsgaXRzZWxmLlxuICpcbiAqIEZpbGUgc3RydWN0dXJlOlxuICogYGBgXG4gKiBmb2xkZXJcbiAqIOKUnOKUgOKUgCBzY3JpcHQudHNcbiAqIOKUlOKUgOKUgCBsaW5rIC0+IHNjcmlwdC50cyAoc3ltYm9saWMgbGluaylcbiAqIGBgYFxuICpcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgd2Fsa1N5bmMgfSBmcm9tIFwiQHN0ZC9mcy93YWxrXCI7XG4gKlxuICogQXJyYXkuZnJvbSh3YWxrU3luYyhcIi5cIiwgeyBmb2xsb3dTeW1saW5rczogdHJ1ZSwgY2Fub25pY2FsaXplOiB0cnVlIH0pKTtcbiAqIC8vIFtcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwiLlwiLFxuICogLy8gICAgIG5hbWU6IFwiLlwiLFxuICogLy8gICAgIGlzRmlsZTogZmFsc2UsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IHRydWUsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZVxuICogLy8gICB9LFxuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBuYW1lOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIGlzRmlsZTogdHJ1ZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZVxuICogLy8gICB9LFxuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCJsaW5rXCIsXG4gKiAvLyAgICAgbmFtZTogXCJsaW5rXCIsXG4gKiAvLyAgICAgaXNGaWxlOiB0cnVlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiBmYWxzZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IHRydWVcbiAqIC8vICAgfSxcbiAqIC8vIF1cbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlIEZpbHRlciBieSBmaWxlIGV4dGVuc2lvbnNcbiAqXG4gKiBTZXR0aW5nIHRoZSBgZXh0c2Agb3B0aW9uIHRvIGBbXCIudHNcIl1gIG9yIGBbXCJ0c1wiXWAgd2lsbCBvbmx5IGluY2x1ZGUgZW50cmllc1xuICogd2l0aCB0aGUgYC50c2AgZmlsZSBleHRlbnNpb24uXG4gKlxuICogRmlsZSBzdHJ1Y3R1cmU6XG4gKiBgYGBcbiAqIGZvbGRlclxuICog4pSc4pSA4pSAIHNjcmlwdC50c1xuICog4pSU4pSA4pSAIGZvby5qc1xuICogYGBgXG4gKlxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyB3YWxrU3luYyB9IGZyb20gXCJAc3RkL2ZzL3dhbGtcIjtcbiAqXG4gKiBBcnJheS5mcm9tKHdhbGtTeW5jKFwiLlwiLCB7IGV4dHM6IFtcIi50c1wiXSB9KSk7XG4gKiAvLyBbXG4gKiAvLyAgIHtcbiAqIC8vICAgICBwYXRoOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIG5hbWU6IFwic2NyaXB0LnRzXCIsXG4gKiAvLyAgICAgaXNGaWxlOiB0cnVlLFxuICogLy8gICAgIGlzRGlyZWN0b3J5OiBmYWxzZSxcbiAqIC8vICAgICBpc1N5bWxpbms6IGZhbHNlXG4gKiAvLyAgIH0sXG4gKiAvLyBdXG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZSBGaWx0ZXIgYnkgcmVndWxhciBleHByZXNzaW9uc1xuICpcbiAqIFNldHRpbmcgdGhlIGBtYXRjaGAgb3B0aW9uIHRvIGBbL3MvXWAgd2lsbCBvbmx5IGluY2x1ZGUgZW50cmllcyB3aXRoIHRoZVxuICogbGV0dGVyIGBzYCBpbiB0aGVpciBuYW1lLlxuICpcbiAqIEZpbGUgc3RydWN0dXJlOlxuICogYGBgXG4gKiBmb2xkZXJcbiAqIOKUnOKUgOKUgCBzY3JpcHQudHNcbiAqIOKUlOKUgOKUgCBSRUFETUUubWRcbiAqIGBgYFxuICpcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgd2Fsa1N5bmMgfSBmcm9tIFwiQHN0ZC9mcy93YWxrXCI7XG4gKlxuICogQXJyYXkuZnJvbSh3YWxrU3luYyhcIi5cIiwgeyBtYXRjaDogWy9zL10gfSkpO1xuICogLy8gW1xuICogLy8gICB7XG4gKiAvLyAgICAgcGF0aDogXCJzY3JpcHQudHNcIixcbiAqIC8vICAgICBuYW1lOiBcInNjcmlwdC50c1wiLFxuICogLy8gICAgIGlzRmlsZTogdHJ1ZSxcbiAqIC8vICAgICBpc0RpcmVjdG9yeTogZmFsc2UsXG4gKiAvLyAgICAgaXNTeW1saW5rOiBmYWxzZVxuICogLy8gICB9LFxuICogLy8gXVxuICogYGBgXG4gKlxuICogQGV4YW1wbGUgRXhjbHVkZSBieSByZWd1bGFyIGV4cHJlc3Npb25zXG4gKlxuICogU2V0dGluZyB0aGUgYHNraXBgIG9wdGlvbiB0byBgWy9zL11gIHdpbGwgZXhjbHVkZSBlbnRyaWVzIHdpdGggdGhlIGxldHRlclxuICogYHNgIGluIHRoZWlyIG5hbWUuXG4gKlxuICogRmlsZSBzdHJ1Y3R1cmU6XG4gKiBgYGBcbiAqIGZvbGRlclxuICog4pSc4pSA4pSAIHNjcmlwdC50c1xuICog4pSU4pSA4pSAIFJFQURNRS5tZFxuICogYGBgXG4gKlxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyB3YWxrU3luYyB9IGZyb20gXCJAc3RkL2ZzL3dhbGtcIjtcbiAqXG4gKiBBcnJheS5mcm9tKHdhbGtTeW5jKFwiLlwiLCB7IHNraXA6IFsvcy9dIH0pKTtcbiAqIC8vIFtcbiAqIC8vICAge1xuICogLy8gICAgIHBhdGg6IFwiUkVBRE1FLm1kXCIsXG4gKiAvLyAgICAgbmFtZTogXCJSRUFETUUubWRcIixcbiAqIC8vICAgICBpc0ZpbGU6IHRydWUsXG4gKiAvLyAgICAgaXNEaXJlY3Rvcnk6IGZhbHNlLFxuICogLy8gICAgIGlzU3ltbGluazogZmFsc2VcbiAqIC8vICAgfSxcbiAqIC8vIF1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24qIHdhbGtTeW5jKFxuICByb290OiBzdHJpbmcgfCBVUkwsXG4gIG9wdGlvbnM/OiBXYWxrT3B0aW9ucyxcbik6IEl0ZXJhYmxlSXRlcmF0b3I8V2Fsa0VudHJ5PiB7XG4gIGxldCB7XG4gICAgbWF4RGVwdGggPSBJbmZpbml0eSxcbiAgICBpbmNsdWRlRmlsZXMgPSB0cnVlLFxuICAgIGluY2x1ZGVEaXJzID0gdHJ1ZSxcbiAgICBpbmNsdWRlU3ltbGlua3MgPSB0cnVlLFxuICAgIGZvbGxvd1N5bWxpbmtzID0gZmFsc2UsXG4gICAgY2Fub25pY2FsaXplID0gdHJ1ZSxcbiAgICBleHRzID0gdW5kZWZpbmVkLFxuICAgIG1hdGNoID0gdW5kZWZpbmVkLFxuICAgIHNraXAgPSB1bmRlZmluZWQsXG4gIH0gPSBvcHRpb25zID8/IHt9O1xuXG4gIHJvb3QgPSB0b1BhdGhTdHJpbmcocm9vdCk7XG4gIGlmIChleHRzKSB7XG4gICAgZXh0cyA9IGV4dHMubWFwKChleHQpID0+IGV4dC5zdGFydHNXaXRoKFwiLlwiKSA/IGV4dCA6IGAuJHtleHR9YCk7XG4gIH1cbiAgaWYgKG1heERlcHRoIDwgMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoaW5jbHVkZURpcnMgJiYgaW5jbHVkZShyb290LCBleHRzLCBtYXRjaCwgc2tpcCkpIHtcbiAgICB5aWVsZCBjcmVhdGVXYWxrRW50cnlTeW5jKHJvb3QpO1xuICB9XG4gIGlmIChtYXhEZXB0aCA8IDEgfHwgIWluY2x1ZGUocm9vdCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHNraXApKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGVudHJpZXMgPSBEZW5vLnJlYWREaXJTeW5jKHJvb3QpO1xuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICBsZXQgcGF0aCA9IGpvaW4ocm9vdCwgZW50cnkubmFtZSk7XG5cbiAgICBsZXQgeyBpc1N5bWxpbmssIGlzRGlyZWN0b3J5IH0gPSBlbnRyeTtcblxuICAgIGlmIChpc1N5bWxpbmspIHtcbiAgICAgIGlmICghZm9sbG93U3ltbGlua3MpIHtcbiAgICAgICAgaWYgKGluY2x1ZGVTeW1saW5rcyAmJiBpbmNsdWRlKHBhdGgsIGV4dHMsIG1hdGNoLCBza2lwKSkge1xuICAgICAgICAgIHlpZWxkIHsgcGF0aCwgLi4uZW50cnkgfTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlYWxQYXRoID0gRGVuby5yZWFsUGF0aFN5bmMocGF0aCk7XG4gICAgICBpZiAoY2Fub25pY2FsaXplKSB7XG4gICAgICAgIHBhdGggPSByZWFsUGF0aDtcbiAgICAgIH1cbiAgICAgIC8vIENhdmVhdCBlbXB0b3I6IGRvbid0IGFzc3VtZSB8cGF0aHwgaXMgbm90IGEgc3ltbGluay4gcmVhbHBhdGgoKVxuICAgICAgLy8gcmVzb2x2ZXMgc3ltbGlua3MgYnV0IGFub3RoZXIgcHJvY2VzcyBjYW4gcmVwbGFjZSB0aGUgZmlsZSBzeXN0ZW1cbiAgICAgIC8vIGVudGl0eSB3aXRoIGEgZGlmZmVyZW50IHR5cGUgb2YgZW50aXR5IGJlZm9yZSB3ZSBjYWxsIGxzdGF0KCkuXG4gICAgICAoeyBpc1N5bWxpbmssIGlzRGlyZWN0b3J5IH0gPSBEZW5vLmxzdGF0U3luYyhyZWFsUGF0aCkpO1xuICAgIH1cblxuICAgIGlmIChpc1N5bWxpbmsgfHwgaXNEaXJlY3RvcnkpIHtcbiAgICAgIGNvbnN0IG9wdHM6IFdhbGtPcHRpb25zID0ge1xuICAgICAgICBtYXhEZXB0aDogbWF4RGVwdGggLSAxLFxuICAgICAgICBpbmNsdWRlRmlsZXMsXG4gICAgICAgIGluY2x1ZGVEaXJzLFxuICAgICAgICBpbmNsdWRlU3ltbGlua3MsXG4gICAgICAgIGZvbGxvd1N5bWxpbmtzLFxuICAgICAgfTtcbiAgICAgIGlmIChleHRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3B0cy5leHRzID0gZXh0cztcbiAgICAgIH1cbiAgICAgIGlmIChtYXRjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9wdHMubWF0Y2ggPSBtYXRjaDtcbiAgICAgIH1cbiAgICAgIGlmIChza2lwICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3B0cy5za2lwID0gc2tpcDtcbiAgICAgIH1cbiAgICAgIHlpZWxkKiB3YWxrU3luYyhwYXRoLCBvcHRzKTtcbiAgICB9IGVsc2UgaWYgKGluY2x1ZGVGaWxlcyAmJiBpbmNsdWRlKHBhdGgsIGV4dHMsIG1hdGNoLCBza2lwKSkge1xuICAgICAgeWllbGQgeyBwYXRoLCAuLi5lbnRyeSB9O1xuICAgIH1cbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUNyRCw0REFBNEQ7QUFDNUQsNkNBQTZDO0FBQzdDLG1FQUFtRTtBQUNuRSxTQUFTLElBQUksUUFBUSw0QkFBNEI7QUFDakQsU0FBUyxZQUFZLFFBQVEsdUJBQXVCO0FBQ3BELFNBQ0UsZUFBZSxFQUNmLG1CQUFtQixRQUVkLDBCQUEwQjtBQUVqQyxTQUFTLFFBQ1AsSUFBWSxFQUNaLElBQWUsRUFDZixLQUFnQixFQUNoQixJQUFlO0VBRWYsSUFBSSxRQUFRLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxNQUFpQixLQUFLLFFBQVEsQ0FBQyxPQUFPO0lBQzVELE9BQU87RUFDVDtFQUNBLElBQUksU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsVUFBcUIsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLFdBQVc7SUFDckUsT0FBTztFQUNUO0VBQ0EsSUFBSSxRQUFRLEtBQUssSUFBSSxDQUFDLENBQUMsVUFBcUIsQ0FBQyxDQUFDLEtBQUss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
// denoCacheMetadata=8436676698493834918,17589648502046237247
