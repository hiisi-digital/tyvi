// Copyright 2018-2026 the Deno authors. MIT license.
/** Options for {@linkcode exists} and {@linkcode existsSync.} */
/**
 * Asynchronously test whether or not the given path exists by checking with
 * the file system.
 *
 * Note: Do not use this function if performing a check before another operation
 * on that file. Doing so creates a race condition. Instead, perform the actual
 * file operation directly. This function is not recommended for this use case.
 * See the recommended method below.
 *
 * @see {@link https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use} for
 * more information on the time-of-check to time-of-use bug.
 *
 * Requires `--allow-read` permissions, and in some cases, `--allow-sys`
 * permissions if `options.isReadable` is `true`.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param path The path to the file or directory, as a string or URL.
 * @param options Additional options for the check.
 *
 * @returns A promise that resolves with `true` if the path exists, `false`
 * otherwise.
 *
 * @example Recommended method
 * ```ts ignore
 * // Notice no use of exists
 * try {
 *   await Deno.remove("./foo", { recursive: true });
 * } catch (error) {
 *   if (!(error instanceof Deno.errors.NotFound)) {
 *     throw error;
 *   }
 *   // Do nothing...
 * }
 * ```
 *
 * Notice that `exists()` is not used in the above example. Doing so avoids a
 * possible race condition. See the above note for details.
 *
 * @example Basic usage
 * ```ts ignore
 * import { exists } from "@std/fs/exists";
 *
 * await exists("./exists"); // true
 * await exists("./does_not_exist"); // false
 * ```
 *
 * @example Check if a path is readable
 *
 * Requires `--allow-sys` permissions in some cases.
 *
 * ```ts ignore
 * import { exists } from "@std/fs/exists";
 *
 * await exists("./readable", { isReadable: true }); // true
 * await exists("./not_readable", { isReadable: true }); // false
 * ```
 *
 * @example Check if a path is a directory
 * ```ts ignore
 * import { exists } from "@std/fs/exists";
 *
 * await exists("./directory", { isDirectory: true }); // true
 * await exists("./file", { isDirectory: true }); // false
 * ```
 *
 * @example Check if a path is a file
 * ```ts ignore
 * import { exists } from "@std/fs/exists";
 *
 * await exists("./file", { isFile: true }); // true
 * await exists("./directory", { isFile: true }); // false
 * ```
 *
 * @example Check if a path is a readable directory
 *
 * Requires `--allow-sys` permissions in some cases.
 *
 * ```ts ignore
 * import { exists } from "@std/fs/exists";
 *
 * await exists("./readable_directory", { isReadable: true, isDirectory: true }); // true
 * await exists("./not_readable_directory", { isReadable: true, isDirectory: true }); // false
 * ```
 *
 * @example Check if a path is a readable file
 *
 * Requires `--allow-sys` permissions in some cases.
 *
 * ```ts ignore
 * import { exists } from "@std/fs/exists";
 *
 * await exists("./readable_file", { isReadable: true, isFile: true }); // true
 * await exists("./not_readable_file", { isReadable: true, isFile: true }); // false
 * ```
 */ export async function exists(path, options) {
  try {
    const stat = await Deno.stat(path);
    if (options && (options.isReadable || options.isDirectory || options.isFile)) {
      if (options.isDirectory && options.isFile) {
        throw new TypeError(
          "ExistsOptions.options.isDirectory and ExistsOptions.options.isFile must not be true together",
        );
      }
      if (options.isDirectory && !stat.isDirectory || options.isFile && !stat.isFile) {
        return false;
      }
      if (options.isReadable) {
        return fileIsReadable(stat);
      }
    }
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    if (error instanceof Deno.errors.PermissionDenied) {
      if (
        (await Deno.permissions.query({
          name: "read",
          path,
        })).state === "granted"
      ) {
        // --allow-read not missing
        return !options?.isReadable; // PermissionDenied was raised by file system, so the item exists, but can't be read
      }
    }
    throw error;
  }
}
/**
 * Synchronously test whether or not the given path exists by checking with
 * the file system.
 *
 * Note: Do not use this function if performing a check before another operation
 * on that file. Doing so creates a race condition. Instead, perform the actual
 * file operation directly. This function is not recommended for this use case.
 * See the recommended method below.
 *
 * @see {@link https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use} for
 * more information on the time-of-check to time-of-use bug.
 *
 * Requires `--allow-read` permissions, and in some cases, `--allow-sys`
 * permissions if `options.isReadable` is `true`.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param path The path to the file or directory, as a string or URL.
 * @param options Additional options for the check.
 *
 * @returns `true` if the path exists, `false` otherwise.
 *
 * @example Recommended method
 * ```ts ignore
 * // Notice no use of exists
 * try {
 *   Deno.removeSync("./foo", { recursive: true });
 * } catch (error) {
 *   if (!(error instanceof Deno.errors.NotFound)) {
 *     throw error;
 *   }
 *   // Do nothing...
 * }
 * ```
 *
 * Notice that `existsSync()` is not used in the above example. Doing so avoids
 * a possible race condition. See the above note for details.
 *
 * @example Basic usage
 * ```ts ignore
 * import { existsSync } from "@std/fs/exists";
 *
 * existsSync("./exists"); // true
 * existsSync("./does_not_exist"); // false
 * ```
 *
 * @example Check if a path is readable
 *
 * Requires `--allow-sys` permissions in some cases.
 *
 * ```ts ignore
 * import { existsSync } from "@std/fs/exists";
 *
 * existsSync("./readable", { isReadable: true }); // true
 * existsSync("./not_readable", { isReadable: true }); // false
 * ```
 *
 * @example Check if a path is a directory
 * ```ts ignore
 * import { existsSync } from "@std/fs/exists";
 *
 * existsSync("./directory", { isDirectory: true }); // true
 * existsSync("./file", { isDirectory: true }); // false
 * ```
 *
 * @example Check if a path is a file
 * ```ts ignore
 * import { existsSync } from "@std/fs/exists";
 *
 * existsSync("./file", { isFile: true }); // true
 * existsSync("./directory", { isFile: true }); // false
 * ```
 *
 * @example Check if a path is a readable directory
 *
 * Requires `--allow-sys` permissions in some cases.
 *
 * ```ts ignore
 * import { existsSync } from "@std/fs/exists";
 *
 * existsSync("./readable_directory", { isReadable: true, isDirectory: true }); // true
 * existsSync("./not_readable_directory", { isReadable: true, isDirectory: true }); // false
 * ```
 *
 * @example Check if a path is a readable file
 *
 * Requires `--allow-sys` permissions in some cases.
 *
 * ```ts ignore
 * import { existsSync } from "@std/fs/exists";
 *
 * existsSync("./readable_file", { isReadable: true, isFile: true }); // true
 * existsSync("./not_readable_file", { isReadable: true, isFile: true }); // false
 * ```
 */ export function existsSync(path, options) {
  try {
    const stat = Deno.statSync(path);
    if (options && (options.isReadable || options.isDirectory || options.isFile)) {
      if (options.isDirectory && options.isFile) {
        throw new TypeError(
          "ExistsOptions.options.isDirectory and ExistsOptions.options.isFile must not be true together",
        );
      }
      if (options.isDirectory && !stat.isDirectory || options.isFile && !stat.isFile) {
        return false;
      }
      if (options.isReadable) {
        return fileIsReadable(stat);
      }
    }
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    if (error instanceof Deno.errors.PermissionDenied) {
      if (
        Deno.permissions.querySync({
          name: "read",
          path,
        }).state === "granted"
      ) {
        // --allow-read not missing
        return !options?.isReadable; // PermissionDenied was raised by file system, so the item exists, but can't be read
      }
    }
    throw error;
  }
}
function fileIsReadable(stat) {
  if (stat.mode === null) {
    return true; // Exclusive on Non-POSIX systems
  } else if (Deno.uid() === stat.uid) {
    return (stat.mode & 0o400) === 0o400; // User is owner and can read?
  } else if (Deno.gid() === stat.gid) {
    return (stat.mode & 0o040) === 0o040; // User group is owner and can read?
  }
  return (stat.mode & 0o004) === 0o004; // Others can read?
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL2V4aXN0cy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI2IHRoZSBEZW5vIGF1dGhvcnMuIE1JVCBsaWNlbnNlLlxuXG4vKiogT3B0aW9ucyBmb3Ige0BsaW5rY29kZSBleGlzdHN9IGFuZCB7QGxpbmtjb2RlIGV4aXN0c1N5bmMufSAqL1xuZXhwb3J0IGludGVyZmFjZSBFeGlzdHNPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgLCB3aWxsIGNoZWNrIGlmIHRoZSBwYXRoIGlzIHJlYWRhYmxlIGJ5IHRoZSB1c2VyIGFzIHdlbGwuXG4gICAqXG4gICAqIEBkZWZhdWx0IHtmYWxzZX1cbiAgICovXG4gIGlzUmVhZGFibGU/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiBgdHJ1ZWAsIHdpbGwgY2hlY2sgaWYgdGhlIHBhdGggaXMgYSBkaXJlY3RvcnkgYXMgd2VsbC4gRGlyZWN0b3J5XG4gICAqIHN5bWxpbmtzIGFyZSBpbmNsdWRlZC5cbiAgICpcbiAgICogQGRlZmF1bHQge2ZhbHNlfVxuICAgKi9cbiAgaXNEaXJlY3Rvcnk/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiBgdHJ1ZWAsIHdpbGwgY2hlY2sgaWYgdGhlIHBhdGggaXMgYSBmaWxlIGFzIHdlbGwuIEZpbGUgc3ltbGlua3MgYXJlXG4gICAqIGluY2x1ZGVkLlxuICAgKlxuICAgKiBAZGVmYXVsdCB7ZmFsc2V9XG4gICAqL1xuICBpc0ZpbGU/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEFzeW5jaHJvbm91c2x5IHRlc3Qgd2hldGhlciBvciBub3QgdGhlIGdpdmVuIHBhdGggZXhpc3RzIGJ5IGNoZWNraW5nIHdpdGhcbiAqIHRoZSBmaWxlIHN5c3RlbS5cbiAqXG4gKiBOb3RlOiBEbyBub3QgdXNlIHRoaXMgZnVuY3Rpb24gaWYgcGVyZm9ybWluZyBhIGNoZWNrIGJlZm9yZSBhbm90aGVyIG9wZXJhdGlvblxuICogb24gdGhhdCBmaWxlLiBEb2luZyBzbyBjcmVhdGVzIGEgcmFjZSBjb25kaXRpb24uIEluc3RlYWQsIHBlcmZvcm0gdGhlIGFjdHVhbFxuICogZmlsZSBvcGVyYXRpb24gZGlyZWN0bHkuIFRoaXMgZnVuY3Rpb24gaXMgbm90IHJlY29tbWVuZGVkIGZvciB0aGlzIHVzZSBjYXNlLlxuICogU2VlIHRoZSByZWNvbW1lbmRlZCBtZXRob2QgYmVsb3cuXG4gKlxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvVGltZS1vZi1jaGVja190b190aW1lLW9mLXVzZX0gZm9yXG4gKiBtb3JlIGluZm9ybWF0aW9uIG9uIHRoZSB0aW1lLW9mLWNoZWNrIHRvIHRpbWUtb2YtdXNlIGJ1Zy5cbiAqXG4gKiBSZXF1aXJlcyBgLS1hbGxvdy1yZWFkYCBwZXJtaXNzaW9ucywgYW5kIGluIHNvbWUgY2FzZXMsIGAtLWFsbG93LXN5c2BcbiAqIHBlcm1pc3Npb25zIGlmIGBvcHRpb25zLmlzUmVhZGFibGVgIGlzIGB0cnVlYC5cbiAqXG4gKiBAc2VlIHtAbGluayBodHRwczovL2RvY3MuZGVuby5jb20vcnVudGltZS9tYW51YWwvYmFzaWNzL3Blcm1pc3Npb25zI2ZpbGUtc3lzdGVtLWFjY2Vzc31cbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIERlbm8ncyBwZXJtaXNzaW9ucyBzeXN0ZW0uXG4gKlxuICogQHBhcmFtIHBhdGggVGhlIHBhdGggdG8gdGhlIGZpbGUgb3IgZGlyZWN0b3J5LCBhcyBhIHN0cmluZyBvciBVUkwuXG4gKiBAcGFyYW0gb3B0aW9ucyBBZGRpdGlvbmFsIG9wdGlvbnMgZm9yIHRoZSBjaGVjay5cbiAqXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aXRoIGB0cnVlYCBpZiB0aGUgcGF0aCBleGlzdHMsIGBmYWxzZWBcbiAqIG90aGVyd2lzZS5cbiAqXG4gKiBAZXhhbXBsZSBSZWNvbW1lbmRlZCBtZXRob2RcbiAqIGBgYHRzIGlnbm9yZVxuICogLy8gTm90aWNlIG5vIHVzZSBvZiBleGlzdHNcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IERlbm8ucmVtb3ZlKFwiLi9mb29cIiwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gKiB9IGNhdGNoIChlcnJvcikge1xuICogICBpZiAoIShlcnJvciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSkge1xuICogICAgIHRocm93IGVycm9yO1xuICogICB9XG4gKiAgIC8vIERvIG5vdGhpbmcuLi5cbiAqIH1cbiAqIGBgYFxuICpcbiAqIE5vdGljZSB0aGF0IGBleGlzdHMoKWAgaXMgbm90IHVzZWQgaW4gdGhlIGFib3ZlIGV4YW1wbGUuIERvaW5nIHNvIGF2b2lkcyBhXG4gKiBwb3NzaWJsZSByYWNlIGNvbmRpdGlvbi4gU2VlIHRoZSBhYm92ZSBub3RlIGZvciBkZXRhaWxzLlxuICpcbiAqIEBleGFtcGxlIEJhc2ljIHVzYWdlXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGV4aXN0cyB9IGZyb20gXCJAc3RkL2ZzL2V4aXN0c1wiO1xuICpcbiAqIGF3YWl0IGV4aXN0cyhcIi4vZXhpc3RzXCIpOyAvLyB0cnVlXG4gKiBhd2FpdCBleGlzdHMoXCIuL2RvZXNfbm90X2V4aXN0XCIpOyAvLyBmYWxzZVxuICogYGBgXG4gKlxuICogQGV4YW1wbGUgQ2hlY2sgaWYgYSBwYXRoIGlzIHJlYWRhYmxlXG4gKlxuICogUmVxdWlyZXMgYC0tYWxsb3ctc3lzYCBwZXJtaXNzaW9ucyBpbiBzb21lIGNhc2VzLlxuICpcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgZXhpc3RzIH0gZnJvbSBcIkBzdGQvZnMvZXhpc3RzXCI7XG4gKlxuICogYXdhaXQgZXhpc3RzKFwiLi9yZWFkYWJsZVwiLCB7IGlzUmVhZGFibGU6IHRydWUgfSk7IC8vIHRydWVcbiAqIGF3YWl0IGV4aXN0cyhcIi4vbm90X3JlYWRhYmxlXCIsIHsgaXNSZWFkYWJsZTogdHJ1ZSB9KTsgLy8gZmFsc2VcbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlIENoZWNrIGlmIGEgcGF0aCBpcyBhIGRpcmVjdG9yeVxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyBleGlzdHMgfSBmcm9tIFwiQHN0ZC9mcy9leGlzdHNcIjtcbiAqXG4gKiBhd2FpdCBleGlzdHMoXCIuL2RpcmVjdG9yeVwiLCB7IGlzRGlyZWN0b3J5OiB0cnVlIH0pOyAvLyB0cnVlXG4gKiBhd2FpdCBleGlzdHMoXCIuL2ZpbGVcIiwgeyBpc0RpcmVjdG9yeTogdHJ1ZSB9KTsgLy8gZmFsc2VcbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlIENoZWNrIGlmIGEgcGF0aCBpcyBhIGZpbGVcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgZXhpc3RzIH0gZnJvbSBcIkBzdGQvZnMvZXhpc3RzXCI7XG4gKlxuICogYXdhaXQgZXhpc3RzKFwiLi9maWxlXCIsIHsgaXNGaWxlOiB0cnVlIH0pOyAvLyB0cnVlXG4gKiBhd2FpdCBleGlzdHMoXCIuL2RpcmVjdG9yeVwiLCB7IGlzRmlsZTogdHJ1ZSB9KTsgLy8gZmFsc2VcbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlIENoZWNrIGlmIGEgcGF0aCBpcyBhIHJlYWRhYmxlIGRpcmVjdG9yeVxuICpcbiAqIFJlcXVpcmVzIGAtLWFsbG93LXN5c2AgcGVybWlzc2lvbnMgaW4gc29tZSBjYXNlcy5cbiAqXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGV4aXN0cyB9IGZyb20gXCJAc3RkL2ZzL2V4aXN0c1wiO1xuICpcbiAqIGF3YWl0IGV4aXN0cyhcIi4vcmVhZGFibGVfZGlyZWN0b3J5XCIsIHsgaXNSZWFkYWJsZTogdHJ1ZSwgaXNEaXJlY3Rvcnk6IHRydWUgfSk7IC8vIHRydWVcbiAqIGF3YWl0IGV4aXN0cyhcIi4vbm90X3JlYWRhYmxlX2RpcmVjdG9yeVwiLCB7IGlzUmVhZGFibGU6IHRydWUsIGlzRGlyZWN0b3J5OiB0cnVlIH0pOyAvLyBmYWxzZVxuICogYGBgXG4gKlxuICogQGV4YW1wbGUgQ2hlY2sgaWYgYSBwYXRoIGlzIGEgcmVhZGFibGUgZmlsZVxuICpcbiAqIFJlcXVpcmVzIGAtLWFsbG93LXN5c2AgcGVybWlzc2lvbnMgaW4gc29tZSBjYXNlcy5cbiAqXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGV4aXN0cyB9IGZyb20gXCJAc3RkL2ZzL2V4aXN0c1wiO1xuICpcbiAqIGF3YWl0IGV4aXN0cyhcIi4vcmVhZGFibGVfZmlsZVwiLCB7IGlzUmVhZGFibGU6IHRydWUsIGlzRmlsZTogdHJ1ZSB9KTsgLy8gdHJ1ZVxuICogYXdhaXQgZXhpc3RzKFwiLi9ub3RfcmVhZGFibGVfZmlsZVwiLCB7IGlzUmVhZGFibGU6IHRydWUsIGlzRmlsZTogdHJ1ZSB9KTsgLy8gZmFsc2VcbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhpc3RzKFxuICBwYXRoOiBzdHJpbmcgfCBVUkwsXG4gIG9wdGlvbnM/OiBFeGlzdHNPcHRpb25zLFxuKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdCA9IGF3YWl0IERlbm8uc3RhdChwYXRoKTtcbiAgICBpZiAoXG4gICAgICBvcHRpb25zICYmXG4gICAgICAob3B0aW9ucy5pc1JlYWRhYmxlIHx8IG9wdGlvbnMuaXNEaXJlY3RvcnkgfHwgb3B0aW9ucy5pc0ZpbGUpXG4gICAgKSB7XG4gICAgICBpZiAob3B0aW9ucy5pc0RpcmVjdG9yeSAmJiBvcHRpb25zLmlzRmlsZSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIFwiRXhpc3RzT3B0aW9ucy5vcHRpb25zLmlzRGlyZWN0b3J5IGFuZCBFeGlzdHNPcHRpb25zLm9wdGlvbnMuaXNGaWxlIG11c3Qgbm90IGJlIHRydWUgdG9nZXRoZXJcIixcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGlmIChcbiAgICAgICAgKG9wdGlvbnMuaXNEaXJlY3RvcnkgJiYgIXN0YXQuaXNEaXJlY3RvcnkpIHx8XG4gICAgICAgIChvcHRpb25zLmlzRmlsZSAmJiAhc3RhdC5pc0ZpbGUpXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMuaXNSZWFkYWJsZSkge1xuICAgICAgICByZXR1cm4gZmlsZUlzUmVhZGFibGUoc3RhdCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLlBlcm1pc3Npb25EZW5pZWQpIHtcbiAgICAgIGlmIChcbiAgICAgICAgKGF3YWl0IERlbm8ucGVybWlzc2lvbnMucXVlcnkoeyBuYW1lOiBcInJlYWRcIiwgcGF0aCB9KSkuc3RhdGUgPT09XG4gICAgICAgICAgXCJncmFudGVkXCJcbiAgICAgICkge1xuICAgICAgICAvLyAtLWFsbG93LXJlYWQgbm90IG1pc3NpbmdcbiAgICAgICAgcmV0dXJuICFvcHRpb25zPy5pc1JlYWRhYmxlOyAvLyBQZXJtaXNzaW9uRGVuaWVkIHdhcyByYWlzZWQgYnkgZmlsZSBzeXN0ZW0sIHNvIHRoZSBpdGVtIGV4aXN0cywgYnV0IGNhbid0IGJlIHJlYWRcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLyoqXG4gKiBTeW5jaHJvbm91c2x5IHRlc3Qgd2hldGhlciBvciBub3QgdGhlIGdpdmVuIHBhdGggZXhpc3RzIGJ5IGNoZWNraW5nIHdpdGhcbiAqIHRoZSBmaWxlIHN5c3RlbS5cbiAqXG4gKiBOb3RlOiBEbyBub3QgdXNlIHRoaXMgZnVuY3Rpb24gaWYgcGVyZm9ybWluZyBhIGNoZWNrIGJlZm9yZSBhbm90aGVyIG9wZXJhdGlvblxuICogb24gdGhhdCBmaWxlLiBEb2luZyBzbyBjcmVhdGVzIGEgcmFjZSBjb25kaXRpb24uIEluc3RlYWQsIHBlcmZvcm0gdGhlIGFjdHVhbFxuICogZmlsZSBvcGVyYXRpb24gZGlyZWN0bHkuIFRoaXMgZnVuY3Rpb24gaXMgbm90IHJlY29tbWVuZGVkIGZvciB0aGlzIHVzZSBjYXNlLlxuICogU2VlIHRoZSByZWNvbW1lbmRlZCBtZXRob2QgYmVsb3cuXG4gKlxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvVGltZS1vZi1jaGVja190b190aW1lLW9mLXVzZX0gZm9yXG4gKiBtb3JlIGluZm9ybWF0aW9uIG9uIHRoZSB0aW1lLW9mLWNoZWNrIHRvIHRpbWUtb2YtdXNlIGJ1Zy5cbiAqXG4gKiBSZXF1aXJlcyBgLS1hbGxvdy1yZWFkYCBwZXJtaXNzaW9ucywgYW5kIGluIHNvbWUgY2FzZXMsIGAtLWFsbG93LXN5c2BcbiAqIHBlcm1pc3Npb25zIGlmIGBvcHRpb25zLmlzUmVhZGFibGVgIGlzIGB0cnVlYC5cbiAqXG4gKiBAc2VlIHtAbGluayBodHRwczovL2RvY3MuZGVuby5jb20vcnVudGltZS9tYW51YWwvYmFzaWNzL3Blcm1pc3Npb25zI2ZpbGUtc3lzdGVtLWFjY2Vzc31cbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIERlbm8ncyBwZXJtaXNzaW9ucyBzeXN0ZW0uXG4gKlxuICogQHBhcmFtIHBhdGggVGhlIHBhdGggdG8gdGhlIGZpbGUgb3IgZGlyZWN0b3J5LCBhcyBhIHN0cmluZyBvciBVUkwuXG4gKiBAcGFyYW0gb3B0aW9ucyBBZGRpdGlvbmFsIG9wdGlvbnMgZm9yIHRoZSBjaGVjay5cbiAqXG4gKiBAcmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHBhdGggZXhpc3RzLCBgZmFsc2VgIG90aGVyd2lzZS5cbiAqXG4gKiBAZXhhbXBsZSBSZWNvbW1lbmRlZCBtZXRob2RcbiAqIGBgYHRzIGlnbm9yZVxuICogLy8gTm90aWNlIG5vIHVzZSBvZiBleGlzdHNcbiAqIHRyeSB7XG4gKiAgIERlbm8ucmVtb3ZlU3luYyhcIi4vZm9vXCIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICogfSBjYXRjaCAoZXJyb3IpIHtcbiAqICAgaWYgKCEoZXJyb3IgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkpIHtcbiAqICAgICB0aHJvdyBlcnJvcjtcbiAqICAgfVxuICogICAvLyBEbyBub3RoaW5nLi4uXG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBOb3RpY2UgdGhhdCBgZXhpc3RzU3luYygpYCBpcyBub3QgdXNlZCBpbiB0aGUgYWJvdmUgZXhhbXBsZS4gRG9pbmcgc28gYXZvaWRzXG4gKiBhIHBvc3NpYmxlIHJhY2UgY29uZGl0aW9uLiBTZWUgdGhlIGFib3ZlIG5vdGUgZm9yIGRldGFpbHMuXG4gKlxuICogQGV4YW1wbGUgQmFzaWMgdXNhZ2VcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJAc3RkL2ZzL2V4aXN0c1wiO1xuICpcbiAqIGV4aXN0c1N5bmMoXCIuL2V4aXN0c1wiKTsgLy8gdHJ1ZVxuICogZXhpc3RzU3luYyhcIi4vZG9lc19ub3RfZXhpc3RcIik7IC8vIGZhbHNlXG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZSBDaGVjayBpZiBhIHBhdGggaXMgcmVhZGFibGVcbiAqXG4gKiBSZXF1aXJlcyBgLS1hbGxvdy1zeXNgIHBlcm1pc3Npb25zIGluIHNvbWUgY2FzZXMuXG4gKlxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSBcIkBzdGQvZnMvZXhpc3RzXCI7XG4gKlxuICogZXhpc3RzU3luYyhcIi4vcmVhZGFibGVcIiwgeyBpc1JlYWRhYmxlOiB0cnVlIH0pOyAvLyB0cnVlXG4gKiBleGlzdHNTeW5jKFwiLi9ub3RfcmVhZGFibGVcIiwgeyBpc1JlYWRhYmxlOiB0cnVlIH0pOyAvLyBmYWxzZVxuICogYGBgXG4gKlxuICogQGV4YW1wbGUgQ2hlY2sgaWYgYSBwYXRoIGlzIGEgZGlyZWN0b3J5XG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tIFwiQHN0ZC9mcy9leGlzdHNcIjtcbiAqXG4gKiBleGlzdHNTeW5jKFwiLi9kaXJlY3RvcnlcIiwgeyBpc0RpcmVjdG9yeTogdHJ1ZSB9KTsgLy8gdHJ1ZVxuICogZXhpc3RzU3luYyhcIi4vZmlsZVwiLCB7IGlzRGlyZWN0b3J5OiB0cnVlIH0pOyAvLyBmYWxzZVxuICogYGBgXG4gKlxuICogQGV4YW1wbGUgQ2hlY2sgaWYgYSBwYXRoIGlzIGEgZmlsZVxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSBcIkBzdGQvZnMvZXhpc3RzXCI7XG4gKlxuICogZXhpc3RzU3luYyhcIi4vZmlsZVwiLCB7IGlzRmlsZTogdHJ1ZSB9KTsgLy8gdHJ1ZVxuICogZXhpc3RzU3luYyhcIi4vZGlyZWN0b3J5XCIsIHsgaXNGaWxlOiB0cnVlIH0pOyAvLyBmYWxzZVxuICogYGBgXG4gKlxuICogQGV4YW1wbGUgQ2hlY2sgaWYgYSBwYXRoIGlzIGEgcmVhZGFibGUgZGlyZWN0b3J5XG4gKlxuICogUmVxdWlyZXMgYC0tYWxsb3ctc3lzYCBwZXJtaXNzaW9ucyBpbiBzb21lIGNhc2VzLlxuICpcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJAc3RkL2ZzL2V4aXN0c1wiO1xuICpcbiAqIGV4aXN0c1N5bmMoXCIuL3JlYWRhYmxlX2RpcmVjdG9yeVwiLCB7IGlzUmVhZGFibGU6IHRydWUsIGlzRGlyZWN0b3J5OiB0cnVlIH0pOyAvLyB0cnVlXG4gKiBleGlzdHNTeW5jKFwiLi9ub3RfcmVhZGFibGVfZGlyZWN0b3J5XCIsIHsgaXNSZWFkYWJsZTogdHJ1ZSwgaXNEaXJlY3Rvcnk6IHRydWUgfSk7IC8vIGZhbHNlXG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZSBDaGVjayBpZiBhIHBhdGggaXMgYSByZWFkYWJsZSBmaWxlXG4gKlxuICogUmVxdWlyZXMgYC0tYWxsb3ctc3lzYCBwZXJtaXNzaW9ucyBpbiBzb21lIGNhc2VzLlxuICpcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJAc3RkL2ZzL2V4aXN0c1wiO1xuICpcbiAqIGV4aXN0c1N5bmMoXCIuL3JlYWRhYmxlX2ZpbGVcIiwgeyBpc1JlYWRhYmxlOiB0cnVlLCBpc0ZpbGU6IHRydWUgfSk7IC8vIHRydWVcbiAqIGV4aXN0c1N5bmMoXCIuL25vdF9yZWFkYWJsZV9maWxlXCIsIHsgaXNSZWFkYWJsZTogdHJ1ZSwgaXNGaWxlOiB0cnVlIH0pOyAvLyBmYWxzZVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGlzdHNTeW5jKFxuICBwYXRoOiBzdHJpbmcgfCBVUkwsXG4gIG9wdGlvbnM/OiBFeGlzdHNPcHRpb25zLFxuKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdCA9IERlbm8uc3RhdFN5bmMocGF0aCk7XG4gICAgaWYgKFxuICAgICAgb3B0aW9ucyAmJlxuICAgICAgKG9wdGlvbnMuaXNSZWFkYWJsZSB8fCBvcHRpb25zLmlzRGlyZWN0b3J5IHx8IG9wdGlvbnMuaXNGaWxlKVxuICAgICkge1xuICAgICAgaWYgKG9wdGlvbnMuaXNEaXJlY3RvcnkgJiYgb3B0aW9ucy5pc0ZpbGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICBcIkV4aXN0c09wdGlvbnMub3B0aW9ucy5pc0RpcmVjdG9yeSBhbmQgRXhpc3RzT3B0aW9ucy5vcHRpb25zLmlzRmlsZSBtdXN0IG5vdCBiZSB0cnVlIHRvZ2V0aGVyXCIsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBpZiAoXG4gICAgICAgIChvcHRpb25zLmlzRGlyZWN0b3J5ICYmICFzdGF0LmlzRGlyZWN0b3J5KSB8fFxuICAgICAgICAob3B0aW9ucy5pc0ZpbGUgJiYgIXN0YXQuaXNGaWxlKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmlzUmVhZGFibGUpIHtcbiAgICAgICAgcmV0dXJuIGZpbGVJc1JlYWRhYmxlKHN0YXQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5QZXJtaXNzaW9uRGVuaWVkKSB7XG4gICAgICBpZiAoXG4gICAgICAgIERlbm8ucGVybWlzc2lvbnMucXVlcnlTeW5jKHsgbmFtZTogXCJyZWFkXCIsIHBhdGggfSkuc3RhdGUgPT09IFwiZ3JhbnRlZFwiXG4gICAgICApIHtcbiAgICAgICAgLy8gLS1hbGxvdy1yZWFkIG5vdCBtaXNzaW5nXG4gICAgICAgIHJldHVybiAhb3B0aW9ucz8uaXNSZWFkYWJsZTsgLy8gUGVybWlzc2lvbkRlbmllZCB3YXMgcmFpc2VkIGJ5IGZpbGUgc3lzdGVtLCBzbyB0aGUgaXRlbSBleGlzdHMsIGJ1dCBjYW4ndCBiZSByZWFkXG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbGVJc1JlYWRhYmxlKHN0YXQ6IERlbm8uRmlsZUluZm8pIHtcbiAgaWYgKHN0YXQubW9kZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiB0cnVlOyAvLyBFeGNsdXNpdmUgb24gTm9uLVBPU0lYIHN5c3RlbXNcbiAgfSBlbHNlIGlmIChEZW5vLnVpZCgpID09PSBzdGF0LnVpZCkge1xuICAgIHJldHVybiAoc3RhdC5tb2RlICYgMG80MDApID09PSAwbzQwMDsgLy8gVXNlciBpcyBvd25lciBhbmQgY2FuIHJlYWQ/XG4gIH0gZWxzZSBpZiAoRGVuby5naWQoKSA9PT0gc3RhdC5naWQpIHtcbiAgICByZXR1cm4gKHN0YXQubW9kZSAmIDBvMDQwKSA9PT0gMG8wNDA7IC8vIFVzZXIgZ3JvdXAgaXMgb3duZXIgYW5kIGNhbiByZWFkP1xuICB9XG4gIHJldHVybiAoc3RhdC5tb2RlICYgMG8wMDQpID09PSAwbzAwNDsgLy8gT3RoZXJzIGNhbiByZWFkP1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUVyRCwrREFBK0QsR0F3Qi9EOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FnR0MsR0FDRCxPQUFPLGVBQWUsT0FDcEIsSUFBa0IsRUFDbEIsT0FBdUI7RUFFdkIsSUFBSTtJQUNGLE1BQU0sT0FBTyxNQUFNLEtBQUssSUFBSSxDQUFDO0lBQzdCLElBQ0UsV0FDQSxDQUFDLFFBQVEsVUFBVSxJQUFJLFFBQVEsV0FBVyxJQUFJLFFBQVEsTUFBTSxHQUM1RDtNQUNBLElBQUksUUFBUSxXQUFXLElBQUksUUFBUSxNQUFNLEVBQUU7UUFDekMsTUFBTSxJQUFJLFVBQ1I7TUFFSjtNQUNBLElBQ0UsQUFBQyxRQUFRLFdBQVcsSUFBSSxDQUFDLEtBQUssV0FBVyxJQUN4QyxRQUFRLE1BQU0sSUFBSSxDQUFDLEtBQUssTUFBTSxFQUMvQjtRQUNBLE9BQU87TUFDVDtNQUNBLElBQUksUUFBUSxVQUFVLEVBQUU7UUFDdEIsT0FBTyxlQUFlO01BQ3hCO0lBQ0Y7SUFDQSxPQUFPO0VBQ1QsRUFBRSxPQUFPLE9BQU87SUFDZCxJQUFJLGlCQUFpQixLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUU7TUFDekMsT0FBTztJQUNUO0lBQ0EsSUFBSSxpQkFBaUIsS0FBSyxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7TUFDakQsSUFDRSxDQUFDLE1BQU0sS0FBSyxXQUFXLENBQUMsS0FBSyxDQUFDO1FBQUUsTUFBTTtRQUFRO01BQUssRUFBRSxFQUFFLEtBQUssS0FDMUQsV0FDRjtRQUNBLDJCQUEyQjtRQUMzQixPQUFPLENBQUMsU0FBUyxZQUFZLG9GQUFvRjtNQUNuSDtJQUNGO0lBQ0EsTUFBTTtFQUNSO0FBQ0Y7QUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0ErRkMsR0FDRCxPQUFPLFNBQVMsV0FDZCxJQUFrQixFQUNsQixPQUF1QjtFQUV2QixJQUFJO0lBQ0YsTUFBTSxPQUFPLEtBQUssUUFBUSxDQUFDO0lBQzNCLElBQ0UsV0FDQSxDQUFDLFFBQVEsVUFBVSxJQUFJLFFBQVEsV0FBVyxJQUFJLFFBQVEsTUFBTSxHQUM1RDtNQUNBLElBQUksUUFBUSxXQUFXLElBQUksUUFBUSxNQUFNLEVBQUU7UUFDekMsTUFBTSxJQUFJLFVBQ1I7TUFFSjtNQUNBLElBQ0UsQUFBQyxRQUFRLFdBQVcsSUFBSSxDQUFDLEtBQUssV0FBVyxJQUN4QyxRQUFRLE1BQU0sSUFBSSxDQUFDLEtBQUssTUFBTSxFQUMvQjtRQUNBLE9BQU87TUFDVDtNQUNBLElBQUksUUFBUSxVQUFVLEVBQUU7UUFDdEIsT0FBTyxlQUFlO01BQ3hCO0lBQ0Y7SUFDQSxPQUFPO0VBQ1QsRUFBRSxPQUFPLE9BQU87SUFDZCxJQUFJLGlCQUFpQixLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUU7TUFDekMsT0FBTztJQUNUO0lBQ0EsSUFBSSxpQkFBaUIsS0FBSyxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7TUFDakQsSUFDRSxLQUFLLFdBQVcsQ0FBQyxTQUFTLENBQUM7UUFBRSxNQUFNO1FBQVE7TUFBSyxHQUFHLEtBQUssS0FBSyxXQUM3RDtRQUNBLDJCQUEyQjtRQUMzQixPQUFPLENBQUMsU0FBUyxZQUFZLG9GQUFvRjtNQUNuSDtJQUNGO0lBQ0EsTUFBTTtFQUNSO0FBQ0Y7QUFFQSxTQUFTLGVBQWUsSUFBbUI7RUFDekMsSUFBSSxLQUFLLElBQUksS0FBSyxNQUFNO0lBQ3RCLE9BQU8sTUFBTSxpQ0FBaUM7RUFDaEQsT0FBTyxJQUFJLEtBQUssR0FBRyxPQUFPLEtBQUssR0FBRyxFQUFFO0lBQ2xDLE9BQU8sQ0FBQyxLQUFLLElBQUksR0FBRyxLQUFLLE1BQU0sT0FBTyw4QkFBOEI7RUFDdEUsT0FBTyxJQUFJLEtBQUssR0FBRyxPQUFPLEtBQUssR0FBRyxFQUFFO0lBQ2xDLE9BQU8sQ0FBQyxLQUFLLElBQUksR0FBRyxLQUFLLE1BQU0sT0FBTyxvQ0FBb0M7RUFDNUU7RUFDQSxPQUFPLENBQUMsS0FBSyxJQUFJLEdBQUcsS0FBSyxNQUFNLE9BQU8sbUJBQW1CO0FBQzNEIn0=
// denoCacheMetadata=7635149155832183374,2463115488489677778
