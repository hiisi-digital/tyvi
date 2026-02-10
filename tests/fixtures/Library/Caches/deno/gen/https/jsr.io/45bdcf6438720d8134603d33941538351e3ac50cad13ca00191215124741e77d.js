// Copyright 2018-2026 the Deno authors. MIT license.
import { basename } from "jsr:@std/path@^1.1.4/basename";
import { join } from "jsr:@std/path@^1.1.4/join";
import { resolve } from "jsr:@std/path@^1.1.4/resolve";
import { ensureDir, ensureDirSync } from "./ensure_dir.ts";
import { getFileInfoType } from "./_get_file_info_type.ts";
import { toPathString } from "./_to_path_string.ts";
import { isSubdir } from "./_is_subdir.ts";
import { isWindows } from "jsr:@std/internal@^1.0.12/os";
function assertIsDate(date, name) {
  if (date === null) {
    throw new Error(`${name} is unavailable`);
  }
}
async function ensureValidCopy(src, dest, options) {
  let destStat;
  try {
    destStat = await Deno.lstat(dest);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return;
    }
    throw err;
  }
  if (options.isFolder && !destStat.isDirectory) {
    throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'`);
  }
  if (!options.overwrite) {
    throw new Deno.errors.AlreadyExists(`'${dest}' already exists.`);
  }
  return destStat;
}
function ensureValidCopySync(src, dest, options) {
  let destStat;
  try {
    destStat = Deno.lstatSync(dest);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return;
    }
    throw err;
  }
  if (options.isFolder && !destStat.isDirectory) {
    throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'`);
  }
  if (!options.overwrite) {
    throw new Deno.errors.AlreadyExists(`'${dest}' already exists`);
  }
  return destStat;
}
/* copy file to dest */ async function copyFile(src, dest, options) {
  await ensureValidCopy(src, dest, options);
  await Deno.copyFile(src, dest);
  if (options.preserveTimestamps) {
    const statInfo = await Deno.stat(src);
    assertIsDate(statInfo.atime, "statInfo.atime");
    assertIsDate(statInfo.mtime, "statInfo.mtime");
    await Deno.utime(dest, statInfo.atime, statInfo.mtime);
  }
}
/* copy file to dest synchronously */ function copyFileSync(src, dest, options) {
  ensureValidCopySync(src, dest, options);
  Deno.copyFileSync(src, dest);
  if (options.preserveTimestamps) {
    const statInfo = Deno.statSync(src);
    assertIsDate(statInfo.atime, "statInfo.atime");
    assertIsDate(statInfo.mtime, "statInfo.mtime");
    Deno.utimeSync(dest, statInfo.atime, statInfo.mtime);
  }
}
/* copy symlink to dest */ async function copySymLink(src, dest, options) {
  await ensureValidCopy(src, dest, options);
  const originSrcFilePath = await Deno.readLink(src);
  const type = getFileInfoType(await Deno.lstat(src));
  if (isWindows) {
    await Deno.symlink(originSrcFilePath, dest, {
      type: type === "dir" ? "dir" : "file",
    });
  } else {
    await Deno.symlink(originSrcFilePath, dest);
  }
  if (options.preserveTimestamps) {
    const statInfo = await Deno.lstat(src);
    assertIsDate(statInfo.atime, "statInfo.atime");
    assertIsDate(statInfo.mtime, "statInfo.mtime");
    await Deno.utime(dest, statInfo.atime, statInfo.mtime);
  }
}
/* copy symlink to dest synchronously */ function copySymlinkSync(src, dest, options) {
  ensureValidCopySync(src, dest, options);
  const originSrcFilePath = Deno.readLinkSync(src);
  const type = getFileInfoType(Deno.lstatSync(src));
  if (isWindows) {
    Deno.symlinkSync(originSrcFilePath, dest, {
      type: type === "dir" ? "dir" : "file",
    });
  } else {
    Deno.symlinkSync(originSrcFilePath, dest);
  }
  if (options.preserveTimestamps) {
    const statInfo = Deno.lstatSync(src);
    assertIsDate(statInfo.atime, "statInfo.atime");
    assertIsDate(statInfo.mtime, "statInfo.mtime");
    Deno.utimeSync(dest, statInfo.atime, statInfo.mtime);
  }
}
/* copy folder from src to dest. */ async function copyDir(src, dest, options) {
  const destStat = await ensureValidCopy(src, dest, {
    ...options,
    isFolder: true,
  });
  if (!destStat) {
    await ensureDir(dest);
  }
  if (options.preserveTimestamps) {
    const srcStatInfo = await Deno.stat(src);
    assertIsDate(srcStatInfo.atime, "statInfo.atime");
    assertIsDate(srcStatInfo.mtime, "statInfo.mtime");
    await Deno.utime(dest, srcStatInfo.atime, srcStatInfo.mtime);
  }
  src = toPathString(src);
  dest = toPathString(dest);
  const promises = [];
  for await (const entry of Deno.readDir(src)) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, basename(srcPath));
    if (entry.isSymlink) {
      promises.push(copySymLink(srcPath, destPath, options));
    } else if (entry.isDirectory) {
      promises.push(copyDir(srcPath, destPath, options));
    } else if (entry.isFile) {
      promises.push(copyFile(srcPath, destPath, options));
    }
  }
  await Promise.all(promises);
}
/* copy folder from src to dest synchronously */ function copyDirSync(src, dest, options) {
  const destStat = ensureValidCopySync(src, dest, {
    ...options,
    isFolder: true,
  });
  if (!destStat) {
    ensureDirSync(dest);
  }
  if (options.preserveTimestamps) {
    const srcStatInfo = Deno.statSync(src);
    assertIsDate(srcStatInfo.atime, "statInfo.atime");
    assertIsDate(srcStatInfo.mtime, "statInfo.mtime");
    Deno.utimeSync(dest, srcStatInfo.atime, srcStatInfo.mtime);
  }
  src = toPathString(src);
  dest = toPathString(dest);
  for (const entry of Deno.readDirSync(src)) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, basename(srcPath));
    if (entry.isSymlink) {
      copySymlinkSync(srcPath, destPath, options);
    } else if (entry.isDirectory) {
      copyDirSync(srcPath, destPath, options);
    } else if (entry.isFile) {
      copyFileSync(srcPath, destPath, options);
    }
  }
}
/**
 * Asynchronously copy a file or directory (along with its contents), like
 * {@linkcode https://www.ibm.com/docs/en/aix/7.3?topic=c-cp-command#cp__cp_flagr | cp -r}.
 *
 * Both `src` and `dest` must both be a file or directory.
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param src The source file/directory path as a string or URL.
 * @param dest The destination file/directory path as a string or URL.
 * @param options Options for copying.
 *
 * @returns A promise that resolves once the copy operation completes.
 *
 * @example Basic usage
 * ```ts ignore
 * import { copy } from "@std/fs/copy";
 *
 * await copy("./foo", "./bar");
 * ```
 *
 * This will copy the file or directory at `./foo` to `./bar` without
 * overwriting.
 *
 * @example Overwriting files/directories
 * ```ts ignore
 * import { copy } from "@std/fs/copy";
 *
 * await copy("./foo", "./bar", { overwrite: true });
 * ```
 *
 * This will copy the file or directory at `./foo` to `./bar` and overwrite
 * any existing files or directories.
 *
 * @example Preserving timestamps
 * ```ts ignore
 * import { copy } from "@std/fs/copy";
 *
 * await copy("./foo", "./bar", { preserveTimestamps: true });
 * ```
 *
 * This will copy the file or directory at `./foo` to `./bar` and set the
 * last modification and access times to the ones of the original source files.
 */ export async function copy(src, dest, options = {}) {
  src = resolve(toPathString(src));
  dest = resolve(toPathString(dest));
  if (src === dest) {
    throw new Error("Source and destination cannot be the same");
  }
  const srcStat = await Deno.lstat(src);
  if (srcStat.isDirectory && isSubdir(src, dest)) {
    throw new Error(`Cannot copy '${src}' to a subdirectory of itself: '${dest}'`);
  }
  if (srcStat.isSymlink) {
    await copySymLink(src, dest, options);
  } else if (srcStat.isDirectory) {
    await copyDir(src, dest, options);
  } else if (srcStat.isFile) {
    await copyFile(src, dest, options);
  }
}
/**
 * Synchronously copy a file or directory (along with its contents), like
 * {@linkcode https://www.ibm.com/docs/en/aix/7.3?topic=c-cp-command#cp__cp_flagr | cp -r}.
 *
 * Both `src` and `dest` must both be a file or directory.
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param src The source file/directory path as a string or URL.
 * @param dest The destination file/directory path as a string or URL.
 * @param options Options for copying.
 *
 * @returns A void value that returns once the copy operation completes.
 *
 * @example Basic usage
 * ```ts ignore
 * import { copySync } from "@std/fs/copy";
 *
 * copySync("./foo", "./bar");
 * ```
 *
 * This will copy the file or directory at `./foo` to `./bar` without
 * overwriting.
 *
 * @example Overwriting files/directories
 * ```ts ignore
 * import { copySync } from "@std/fs/copy";
 *
 * copySync("./foo", "./bar", { overwrite: true });
 * ```
 *
 * This will copy the file or directory at `./foo` to `./bar` and overwrite
 * any existing files or directories.
 *
 * @example Preserving timestamps
 * ```ts ignore
 * import { copySync } from "@std/fs/copy";
 *
 * copySync("./foo", "./bar", { preserveTimestamps: true });
 * ```
 *
 * This will copy the file or directory at `./foo` to `./bar` and set the
 * last modification and access times to the ones of the original source files.
 */ export function copySync(src, dest, options = {}) {
  src = resolve(toPathString(src));
  dest = resolve(toPathString(dest));
  if (src === dest) {
    throw new Error("Source and destination cannot be the same");
  }
  const srcStat = Deno.lstatSync(src);
  if (srcStat.isDirectory && isSubdir(src, dest)) {
    throw new Error(`Cannot copy '${src}' to a subdirectory of itself: '${dest}'`);
  }
  if (srcStat.isSymlink) {
    copySymlinkSync(src, dest, options);
  } else if (srcStat.isDirectory) {
    copyDirSync(src, dest, options);
  } else if (srcStat.isFile) {
    copyFileSync(src, dest, options);
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL2NvcHkudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNiB0aGUgRGVubyBhdXRob3JzLiBNSVQgbGljZW5zZS5cblxuaW1wb3J0IHsgYmFzZW5hbWUgfSBmcm9tIFwianNyOkBzdGQvcGF0aEBeMS4xLjQvYmFzZW5hbWVcIjtcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwianNyOkBzdGQvcGF0aEBeMS4xLjQvam9pblwiO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gXCJqc3I6QHN0ZC9wYXRoQF4xLjEuNC9yZXNvbHZlXCI7XG5pbXBvcnQgeyBlbnN1cmVEaXIsIGVuc3VyZURpclN5bmMgfSBmcm9tIFwiLi9lbnN1cmVfZGlyLnRzXCI7XG5pbXBvcnQgeyBnZXRGaWxlSW5mb1R5cGUgfSBmcm9tIFwiLi9fZ2V0X2ZpbGVfaW5mb190eXBlLnRzXCI7XG5pbXBvcnQgeyB0b1BhdGhTdHJpbmcgfSBmcm9tIFwiLi9fdG9fcGF0aF9zdHJpbmcudHNcIjtcbmltcG9ydCB7IGlzU3ViZGlyIH0gZnJvbSBcIi4vX2lzX3N1YmRpci50c1wiO1xuaW1wb3J0IHsgaXNXaW5kb3dzIH0gZnJvbSBcImpzcjpAc3RkL2ludGVybmFsQF4xLjAuMTIvb3NcIjtcblxuLyoqIE9wdGlvbnMgZm9yIHtAbGlua2NvZGUgY29weX0gYW5kIHtAbGlua2NvZGUgY29weVN5bmN9LiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb3B5T3B0aW9ucyB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIG92ZXJ3cml0ZSBleGlzdGluZyBmaWxlIG9yIGRpcmVjdG9yeS5cbiAgICpcbiAgICogQGRlZmF1bHQge2ZhbHNlfVxuICAgKi9cbiAgb3ZlcndyaXRlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgLCB3aWxsIHNldCBsYXN0IG1vZGlmaWNhdGlvbiBhbmQgYWNjZXNzIHRpbWVzIHRvIHRoZSBvbmVzIG9mXG4gICAqIHRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZXMuIFdoZW4gYGZhbHNlYCwgdGltZXN0YW1wIGJlaGF2aW9yIGlzXG4gICAqIE9TLWRlcGVuZGVudC5cbiAgICpcbiAgICogPiBbIU5PVEVdXG4gICAqID4gVGhpcyBvcHRpb24gaXMgY3VycmVudGx5IHVuc3VwcG9ydGVkIGZvciBzeW1ib2xpYyBsaW5rcy5cbiAgICpcbiAgICogQGRlZmF1bHQge2ZhbHNlfVxuICAgKi9cbiAgcHJlc2VydmVUaW1lc3RhbXBzPzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIEludGVybmFsQ29weU9wdGlvbnMgZXh0ZW5kcyBDb3B5T3B0aW9ucyB7XG4gIC8qKiBAZGVmYXVsdCB7ZmFsc2V9ICovXG4gIGlzRm9sZGVyPzogYm9vbGVhbjtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0SXNEYXRlKGRhdGU6IERhdGUgfCBudWxsLCBuYW1lOiBzdHJpbmcpOiBhc3NlcnRzIGRhdGUgaXMgRGF0ZSB7XG4gIGlmIChkYXRlID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke25hbWV9IGlzIHVuYXZhaWxhYmxlYCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZW5zdXJlVmFsaWRDb3B5KFxuICBzcmM6IHN0cmluZyB8IFVSTCxcbiAgZGVzdDogc3RyaW5nIHwgVVJMLFxuICBvcHRpb25zOiBJbnRlcm5hbENvcHlPcHRpb25zLFxuKTogUHJvbWlzZTxEZW5vLkZpbGVJbmZvIHwgdW5kZWZpbmVkPiB7XG4gIGxldCBkZXN0U3RhdDogRGVuby5GaWxlSW5mbztcblxuICB0cnkge1xuICAgIGRlc3RTdGF0ID0gYXdhaXQgRGVuby5sc3RhdChkZXN0KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IGVycjtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmlzRm9sZGVyICYmICFkZXN0U3RhdC5pc0RpcmVjdG9yeSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBDYW5ub3Qgb3ZlcndyaXRlIG5vbi1kaXJlY3RvcnkgJyR7ZGVzdH0nIHdpdGggZGlyZWN0b3J5ICcke3NyY30nYCxcbiAgICApO1xuICB9XG4gIGlmICghb3B0aW9ucy5vdmVyd3JpdGUpIHtcbiAgICB0aHJvdyBuZXcgRGVuby5lcnJvcnMuQWxyZWFkeUV4aXN0cyhgJyR7ZGVzdH0nIGFscmVhZHkgZXhpc3RzLmApO1xuICB9XG5cbiAgcmV0dXJuIGRlc3RTdGF0O1xufVxuXG5mdW5jdGlvbiBlbnN1cmVWYWxpZENvcHlTeW5jKFxuICBzcmM6IHN0cmluZyB8IFVSTCxcbiAgZGVzdDogc3RyaW5nIHwgVVJMLFxuICBvcHRpb25zOiBJbnRlcm5hbENvcHlPcHRpb25zLFxuKTogRGVuby5GaWxlSW5mbyB8IHVuZGVmaW5lZCB7XG4gIGxldCBkZXN0U3RhdDogRGVuby5GaWxlSW5mbztcbiAgdHJ5IHtcbiAgICBkZXN0U3RhdCA9IERlbm8ubHN0YXRTeW5jKGRlc3QpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgRGVuby5lcnJvcnMuTm90Rm91bmQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgZXJyO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuaXNGb2xkZXIgJiYgIWRlc3RTdGF0LmlzRGlyZWN0b3J5KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYENhbm5vdCBvdmVyd3JpdGUgbm9uLWRpcmVjdG9yeSAnJHtkZXN0fScgd2l0aCBkaXJlY3RvcnkgJyR7c3JjfSdgLFxuICAgICk7XG4gIH1cbiAgaWYgKCFvcHRpb25zLm92ZXJ3cml0ZSkge1xuICAgIHRocm93IG5ldyBEZW5vLmVycm9ycy5BbHJlYWR5RXhpc3RzKGAnJHtkZXN0fScgYWxyZWFkeSBleGlzdHNgKTtcbiAgfVxuXG4gIHJldHVybiBkZXN0U3RhdDtcbn1cblxuLyogY29weSBmaWxlIHRvIGRlc3QgKi9cbmFzeW5jIGZ1bmN0aW9uIGNvcHlGaWxlKFxuICBzcmM6IHN0cmluZyB8IFVSTCxcbiAgZGVzdDogc3RyaW5nIHwgVVJMLFxuICBvcHRpb25zOiBJbnRlcm5hbENvcHlPcHRpb25zLFxuKSB7XG4gIGF3YWl0IGVuc3VyZVZhbGlkQ29weShzcmMsIGRlc3QsIG9wdGlvbnMpO1xuICBhd2FpdCBEZW5vLmNvcHlGaWxlKHNyYywgZGVzdCk7XG4gIGlmIChvcHRpb25zLnByZXNlcnZlVGltZXN0YW1wcykge1xuICAgIGNvbnN0IHN0YXRJbmZvID0gYXdhaXQgRGVuby5zdGF0KHNyYyk7XG4gICAgYXNzZXJ0SXNEYXRlKHN0YXRJbmZvLmF0aW1lLCBcInN0YXRJbmZvLmF0aW1lXCIpO1xuICAgIGFzc2VydElzRGF0ZShzdGF0SW5mby5tdGltZSwgXCJzdGF0SW5mby5tdGltZVwiKTtcbiAgICBhd2FpdCBEZW5vLnV0aW1lKGRlc3QsIHN0YXRJbmZvLmF0aW1lLCBzdGF0SW5mby5tdGltZSk7XG4gIH1cbn1cbi8qIGNvcHkgZmlsZSB0byBkZXN0IHN5bmNocm9ub3VzbHkgKi9cbmZ1bmN0aW9uIGNvcHlGaWxlU3luYyhcbiAgc3JjOiBzdHJpbmcgfCBVUkwsXG4gIGRlc3Q6IHN0cmluZyB8IFVSTCxcbiAgb3B0aW9uczogSW50ZXJuYWxDb3B5T3B0aW9ucyxcbikge1xuICBlbnN1cmVWYWxpZENvcHlTeW5jKHNyYywgZGVzdCwgb3B0aW9ucyk7XG4gIERlbm8uY29weUZpbGVTeW5jKHNyYywgZGVzdCk7XG4gIGlmIChvcHRpb25zLnByZXNlcnZlVGltZXN0YW1wcykge1xuICAgIGNvbnN0IHN0YXRJbmZvID0gRGVuby5zdGF0U3luYyhzcmMpO1xuICAgIGFzc2VydElzRGF0ZShzdGF0SW5mby5hdGltZSwgXCJzdGF0SW5mby5hdGltZVwiKTtcbiAgICBhc3NlcnRJc0RhdGUoc3RhdEluZm8ubXRpbWUsIFwic3RhdEluZm8ubXRpbWVcIik7XG4gICAgRGVuby51dGltZVN5bmMoZGVzdCwgc3RhdEluZm8uYXRpbWUsIHN0YXRJbmZvLm10aW1lKTtcbiAgfVxufVxuXG4vKiBjb3B5IHN5bWxpbmsgdG8gZGVzdCAqL1xuYXN5bmMgZnVuY3Rpb24gY29weVN5bUxpbmsoXG4gIHNyYzogc3RyaW5nIHwgVVJMLFxuICBkZXN0OiBzdHJpbmcgfCBVUkwsXG4gIG9wdGlvbnM6IEludGVybmFsQ29weU9wdGlvbnMsXG4pIHtcbiAgYXdhaXQgZW5zdXJlVmFsaWRDb3B5KHNyYywgZGVzdCwgb3B0aW9ucyk7XG4gIGNvbnN0IG9yaWdpblNyY0ZpbGVQYXRoID0gYXdhaXQgRGVuby5yZWFkTGluayhzcmMpO1xuICBjb25zdCB0eXBlID0gZ2V0RmlsZUluZm9UeXBlKGF3YWl0IERlbm8ubHN0YXQoc3JjKSk7XG4gIGlmIChpc1dpbmRvd3MpIHtcbiAgICBhd2FpdCBEZW5vLnN5bWxpbmsob3JpZ2luU3JjRmlsZVBhdGgsIGRlc3QsIHtcbiAgICAgIHR5cGU6IHR5cGUgPT09IFwiZGlyXCIgPyBcImRpclwiIDogXCJmaWxlXCIsXG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgRGVuby5zeW1saW5rKG9yaWdpblNyY0ZpbGVQYXRoLCBkZXN0KTtcbiAgfVxuICBpZiAob3B0aW9ucy5wcmVzZXJ2ZVRpbWVzdGFtcHMpIHtcbiAgICBjb25zdCBzdGF0SW5mbyA9IGF3YWl0IERlbm8ubHN0YXQoc3JjKTtcbiAgICBhc3NlcnRJc0RhdGUoc3RhdEluZm8uYXRpbWUsIFwic3RhdEluZm8uYXRpbWVcIik7XG4gICAgYXNzZXJ0SXNEYXRlKHN0YXRJbmZvLm10aW1lLCBcInN0YXRJbmZvLm10aW1lXCIpO1xuICAgIGF3YWl0IERlbm8udXRpbWUoZGVzdCwgc3RhdEluZm8uYXRpbWUsIHN0YXRJbmZvLm10aW1lKTtcbiAgfVxufVxuXG4vKiBjb3B5IHN5bWxpbmsgdG8gZGVzdCBzeW5jaHJvbm91c2x5ICovXG5mdW5jdGlvbiBjb3B5U3ltbGlua1N5bmMoXG4gIHNyYzogc3RyaW5nIHwgVVJMLFxuICBkZXN0OiBzdHJpbmcgfCBVUkwsXG4gIG9wdGlvbnM6IEludGVybmFsQ29weU9wdGlvbnMsXG4pIHtcbiAgZW5zdXJlVmFsaWRDb3B5U3luYyhzcmMsIGRlc3QsIG9wdGlvbnMpO1xuICBjb25zdCBvcmlnaW5TcmNGaWxlUGF0aCA9IERlbm8ucmVhZExpbmtTeW5jKHNyYyk7XG4gIGNvbnN0IHR5cGUgPSBnZXRGaWxlSW5mb1R5cGUoRGVuby5sc3RhdFN5bmMoc3JjKSk7XG4gIGlmIChpc1dpbmRvd3MpIHtcbiAgICBEZW5vLnN5bWxpbmtTeW5jKG9yaWdpblNyY0ZpbGVQYXRoLCBkZXN0LCB7XG4gICAgICB0eXBlOiB0eXBlID09PSBcImRpclwiID8gXCJkaXJcIiA6IFwiZmlsZVwiLFxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIERlbm8uc3ltbGlua1N5bmMob3JpZ2luU3JjRmlsZVBhdGgsIGRlc3QpO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMucHJlc2VydmVUaW1lc3RhbXBzKSB7XG4gICAgY29uc3Qgc3RhdEluZm8gPSBEZW5vLmxzdGF0U3luYyhzcmMpO1xuICAgIGFzc2VydElzRGF0ZShzdGF0SW5mby5hdGltZSwgXCJzdGF0SW5mby5hdGltZVwiKTtcbiAgICBhc3NlcnRJc0RhdGUoc3RhdEluZm8ubXRpbWUsIFwic3RhdEluZm8ubXRpbWVcIik7XG4gICAgRGVuby51dGltZVN5bmMoZGVzdCwgc3RhdEluZm8uYXRpbWUsIHN0YXRJbmZvLm10aW1lKTtcbiAgfVxufVxuXG4vKiBjb3B5IGZvbGRlciBmcm9tIHNyYyB0byBkZXN0LiAqL1xuYXN5bmMgZnVuY3Rpb24gY29weURpcihcbiAgc3JjOiBzdHJpbmcgfCBVUkwsXG4gIGRlc3Q6IHN0cmluZyB8IFVSTCxcbiAgb3B0aW9uczogQ29weU9wdGlvbnMsXG4pIHtcbiAgY29uc3QgZGVzdFN0YXQgPSBhd2FpdCBlbnN1cmVWYWxpZENvcHkoc3JjLCBkZXN0LCB7XG4gICAgLi4ub3B0aW9ucyxcbiAgICBpc0ZvbGRlcjogdHJ1ZSxcbiAgfSk7XG5cbiAgaWYgKCFkZXN0U3RhdCkge1xuICAgIGF3YWl0IGVuc3VyZURpcihkZXN0KTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLnByZXNlcnZlVGltZXN0YW1wcykge1xuICAgIGNvbnN0IHNyY1N0YXRJbmZvID0gYXdhaXQgRGVuby5zdGF0KHNyYyk7XG4gICAgYXNzZXJ0SXNEYXRlKHNyY1N0YXRJbmZvLmF0aW1lLCBcInN0YXRJbmZvLmF0aW1lXCIpO1xuICAgIGFzc2VydElzRGF0ZShzcmNTdGF0SW5mby5tdGltZSwgXCJzdGF0SW5mby5tdGltZVwiKTtcbiAgICBhd2FpdCBEZW5vLnV0aW1lKGRlc3QsIHNyY1N0YXRJbmZvLmF0aW1lLCBzcmNTdGF0SW5mby5tdGltZSk7XG4gIH1cblxuICBzcmMgPSB0b1BhdGhTdHJpbmcoc3JjKTtcbiAgZGVzdCA9IHRvUGF0aFN0cmluZyhkZXN0KTtcblxuICBjb25zdCBwcm9taXNlcyA9IFtdO1xuXG4gIGZvciBhd2FpdCAoY29uc3QgZW50cnkgb2YgRGVuby5yZWFkRGlyKHNyYykpIHtcbiAgICBjb25zdCBzcmNQYXRoID0gam9pbihzcmMsIGVudHJ5Lm5hbWUpO1xuICAgIGNvbnN0IGRlc3RQYXRoID0gam9pbihkZXN0LCBiYXNlbmFtZShzcmNQYXRoIGFzIHN0cmluZykpO1xuICAgIGlmIChlbnRyeS5pc1N5bWxpbmspIHtcbiAgICAgIHByb21pc2VzLnB1c2goY29weVN5bUxpbmsoc3JjUGF0aCwgZGVzdFBhdGgsIG9wdGlvbnMpKTtcbiAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KSB7XG4gICAgICBwcm9taXNlcy5wdXNoKGNvcHlEaXIoc3JjUGF0aCwgZGVzdFBhdGgsIG9wdGlvbnMpKTtcbiAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRmlsZSkge1xuICAgICAgcHJvbWlzZXMucHVzaChjb3B5RmlsZShzcmNQYXRoLCBkZXN0UGF0aCwgb3B0aW9ucykpO1xuICAgIH1cbiAgfVxuXG4gIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcbn1cblxuLyogY29weSBmb2xkZXIgZnJvbSBzcmMgdG8gZGVzdCBzeW5jaHJvbm91c2x5ICovXG5mdW5jdGlvbiBjb3B5RGlyU3luYyhcbiAgc3JjOiBzdHJpbmcgfCBVUkwsXG4gIGRlc3Q6IHN0cmluZyB8IFVSTCxcbiAgb3B0aW9uczogQ29weU9wdGlvbnMsXG4pIHtcbiAgY29uc3QgZGVzdFN0YXQgPSBlbnN1cmVWYWxpZENvcHlTeW5jKHNyYywgZGVzdCwge1xuICAgIC4uLm9wdGlvbnMsXG4gICAgaXNGb2xkZXI6IHRydWUsXG4gIH0pO1xuXG4gIGlmICghZGVzdFN0YXQpIHtcbiAgICBlbnN1cmVEaXJTeW5jKGRlc3QpO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMucHJlc2VydmVUaW1lc3RhbXBzKSB7XG4gICAgY29uc3Qgc3JjU3RhdEluZm8gPSBEZW5vLnN0YXRTeW5jKHNyYyk7XG4gICAgYXNzZXJ0SXNEYXRlKHNyY1N0YXRJbmZvLmF0aW1lLCBcInN0YXRJbmZvLmF0aW1lXCIpO1xuICAgIGFzc2VydElzRGF0ZShzcmNTdGF0SW5mby5tdGltZSwgXCJzdGF0SW5mby5tdGltZVwiKTtcbiAgICBEZW5vLnV0aW1lU3luYyhkZXN0LCBzcmNTdGF0SW5mby5hdGltZSwgc3JjU3RhdEluZm8ubXRpbWUpO1xuICB9XG5cbiAgc3JjID0gdG9QYXRoU3RyaW5nKHNyYyk7XG4gIGRlc3QgPSB0b1BhdGhTdHJpbmcoZGVzdCk7XG5cbiAgZm9yIChjb25zdCBlbnRyeSBvZiBEZW5vLnJlYWREaXJTeW5jKHNyYykpIHtcbiAgICBjb25zdCBzcmNQYXRoID0gam9pbihzcmMsIGVudHJ5Lm5hbWUpO1xuICAgIGNvbnN0IGRlc3RQYXRoID0gam9pbihkZXN0LCBiYXNlbmFtZShzcmNQYXRoIGFzIHN0cmluZykpO1xuICAgIGlmIChlbnRyeS5pc1N5bWxpbmspIHtcbiAgICAgIGNvcHlTeW1saW5rU3luYyhzcmNQYXRoLCBkZXN0UGF0aCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmIChlbnRyeS5pc0RpcmVjdG9yeSkge1xuICAgICAgY29weURpclN5bmMoc3JjUGF0aCwgZGVzdFBhdGgsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAoZW50cnkuaXNGaWxlKSB7XG4gICAgICBjb3B5RmlsZVN5bmMoc3JjUGF0aCwgZGVzdFBhdGgsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEFzeW5jaHJvbm91c2x5IGNvcHkgYSBmaWxlIG9yIGRpcmVjdG9yeSAoYWxvbmcgd2l0aCBpdHMgY29udGVudHMpLCBsaWtlXG4gKiB7QGxpbmtjb2RlIGh0dHBzOi8vd3d3LmlibS5jb20vZG9jcy9lbi9haXgvNy4zP3RvcGljPWMtY3AtY29tbWFuZCNjcF9fY3BfZmxhZ3IgfCBjcCAtcn0uXG4gKlxuICogQm90aCBgc3JjYCBhbmQgYGRlc3RgIG11c3QgYm90aCBiZSBhIGZpbGUgb3IgZGlyZWN0b3J5LlxuICpcbiAqIFJlcXVpcmVzIGAtLWFsbG93LXJlYWRgIGFuZCBgLS1hbGxvdy13cml0ZWAgcGVybWlzc2lvbnMuXG4gKlxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9kb2NzLmRlbm8uY29tL3J1bnRpbWUvbWFudWFsL2Jhc2ljcy9wZXJtaXNzaW9ucyNmaWxlLXN5c3RlbS1hY2Nlc3N9XG4gKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBEZW5vJ3MgcGVybWlzc2lvbnMgc3lzdGVtLlxuICpcbiAqIEBwYXJhbSBzcmMgVGhlIHNvdXJjZSBmaWxlL2RpcmVjdG9yeSBwYXRoIGFzIGEgc3RyaW5nIG9yIFVSTC5cbiAqIEBwYXJhbSBkZXN0IFRoZSBkZXN0aW5hdGlvbiBmaWxlL2RpcmVjdG9yeSBwYXRoIGFzIGEgc3RyaW5nIG9yIFVSTC5cbiAqIEBwYXJhbSBvcHRpb25zIE9wdGlvbnMgZm9yIGNvcHlpbmcuXG4gKlxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgb25jZSB0aGUgY29weSBvcGVyYXRpb24gY29tcGxldGVzLlxuICpcbiAqIEBleGFtcGxlIEJhc2ljIHVzYWdlXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGNvcHkgfSBmcm9tIFwiQHN0ZC9mcy9jb3B5XCI7XG4gKlxuICogYXdhaXQgY29weShcIi4vZm9vXCIsIFwiLi9iYXJcIik7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIHdpbGwgY29weSB0aGUgZmlsZSBvciBkaXJlY3RvcnkgYXQgYC4vZm9vYCB0byBgLi9iYXJgIHdpdGhvdXRcbiAqIG92ZXJ3cml0aW5nLlxuICpcbiAqIEBleGFtcGxlIE92ZXJ3cml0aW5nIGZpbGVzL2RpcmVjdG9yaWVzXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGNvcHkgfSBmcm9tIFwiQHN0ZC9mcy9jb3B5XCI7XG4gKlxuICogYXdhaXQgY29weShcIi4vZm9vXCIsIFwiLi9iYXJcIiwgeyBvdmVyd3JpdGU6IHRydWUgfSk7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIHdpbGwgY29weSB0aGUgZmlsZSBvciBkaXJlY3RvcnkgYXQgYC4vZm9vYCB0byBgLi9iYXJgIGFuZCBvdmVyd3JpdGVcbiAqIGFueSBleGlzdGluZyBmaWxlcyBvciBkaXJlY3Rvcmllcy5cbiAqXG4gKiBAZXhhbXBsZSBQcmVzZXJ2aW5nIHRpbWVzdGFtcHNcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgY29weSB9IGZyb20gXCJAc3RkL2ZzL2NvcHlcIjtcbiAqXG4gKiBhd2FpdCBjb3B5KFwiLi9mb29cIiwgXCIuL2JhclwiLCB7IHByZXNlcnZlVGltZXN0YW1wczogdHJ1ZSB9KTtcbiAqIGBgYFxuICpcbiAqIFRoaXMgd2lsbCBjb3B5IHRoZSBmaWxlIG9yIGRpcmVjdG9yeSBhdCBgLi9mb29gIHRvIGAuL2JhcmAgYW5kIHNldCB0aGVcbiAqIGxhc3QgbW9kaWZpY2F0aW9uIGFuZCBhY2Nlc3MgdGltZXMgdG8gdGhlIG9uZXMgb2YgdGhlIG9yaWdpbmFsIHNvdXJjZSBmaWxlcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvcHkoXG4gIHNyYzogc3RyaW5nIHwgVVJMLFxuICBkZXN0OiBzdHJpbmcgfCBVUkwsXG4gIG9wdGlvbnM6IENvcHlPcHRpb25zID0ge30sXG4pIHtcbiAgc3JjID0gcmVzb2x2ZSh0b1BhdGhTdHJpbmcoc3JjKSk7XG4gIGRlc3QgPSByZXNvbHZlKHRvUGF0aFN0cmluZyhkZXN0KSk7XG5cbiAgaWYgKHNyYyA9PT0gZGVzdCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlNvdXJjZSBhbmQgZGVzdGluYXRpb24gY2Fubm90IGJlIHRoZSBzYW1lXCIpO1xuICB9XG5cbiAgY29uc3Qgc3JjU3RhdCA9IGF3YWl0IERlbm8ubHN0YXQoc3JjKTtcblxuICBpZiAoc3JjU3RhdC5pc0RpcmVjdG9yeSAmJiBpc1N1YmRpcihzcmMsIGRlc3QpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYENhbm5vdCBjb3B5ICcke3NyY30nIHRvIGEgc3ViZGlyZWN0b3J5IG9mIGl0c2VsZjogJyR7ZGVzdH0nYCxcbiAgICApO1xuICB9XG5cbiAgaWYgKHNyY1N0YXQuaXNTeW1saW5rKSB7XG4gICAgYXdhaXQgY29weVN5bUxpbmsoc3JjLCBkZXN0LCBvcHRpb25zKTtcbiAgfSBlbHNlIGlmIChzcmNTdGF0LmlzRGlyZWN0b3J5KSB7XG4gICAgYXdhaXQgY29weURpcihzcmMsIGRlc3QsIG9wdGlvbnMpO1xuICB9IGVsc2UgaWYgKHNyY1N0YXQuaXNGaWxlKSB7XG4gICAgYXdhaXQgY29weUZpbGUoc3JjLCBkZXN0LCBvcHRpb25zKTtcbiAgfVxufVxuXG4vKipcbiAqIFN5bmNocm9ub3VzbHkgY29weSBhIGZpbGUgb3IgZGlyZWN0b3J5IChhbG9uZyB3aXRoIGl0cyBjb250ZW50cyksIGxpa2VcbiAqIHtAbGlua2NvZGUgaHR0cHM6Ly93d3cuaWJtLmNvbS9kb2NzL2VuL2FpeC83LjM/dG9waWM9Yy1jcC1jb21tYW5kI2NwX19jcF9mbGFnciB8IGNwIC1yfS5cbiAqXG4gKiBCb3RoIGBzcmNgIGFuZCBgZGVzdGAgbXVzdCBib3RoIGJlIGEgZmlsZSBvciBkaXJlY3RvcnkuXG4gKlxuICogUmVxdWlyZXMgYC0tYWxsb3ctcmVhZGAgYW5kIGAtLWFsbG93LXdyaXRlYCBwZXJtaXNzaW9ucy5cbiAqXG4gKiBAc2VlIHtAbGluayBodHRwczovL2RvY3MuZGVuby5jb20vcnVudGltZS9tYW51YWwvYmFzaWNzL3Blcm1pc3Npb25zI2ZpbGUtc3lzdGVtLWFjY2Vzc31cbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIERlbm8ncyBwZXJtaXNzaW9ucyBzeXN0ZW0uXG4gKlxuICogQHBhcmFtIHNyYyBUaGUgc291cmNlIGZpbGUvZGlyZWN0b3J5IHBhdGggYXMgYSBzdHJpbmcgb3IgVVJMLlxuICogQHBhcmFtIGRlc3QgVGhlIGRlc3RpbmF0aW9uIGZpbGUvZGlyZWN0b3J5IHBhdGggYXMgYSBzdHJpbmcgb3IgVVJMLlxuICogQHBhcmFtIG9wdGlvbnMgT3B0aW9ucyBmb3IgY29weWluZy5cbiAqXG4gKiBAcmV0dXJucyBBIHZvaWQgdmFsdWUgdGhhdCByZXR1cm5zIG9uY2UgdGhlIGNvcHkgb3BlcmF0aW9uIGNvbXBsZXRlcy5cbiAqXG4gKiBAZXhhbXBsZSBCYXNpYyB1c2FnZVxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyBjb3B5U3luYyB9IGZyb20gXCJAc3RkL2ZzL2NvcHlcIjtcbiAqXG4gKiBjb3B5U3luYyhcIi4vZm9vXCIsIFwiLi9iYXJcIik7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIHdpbGwgY29weSB0aGUgZmlsZSBvciBkaXJlY3RvcnkgYXQgYC4vZm9vYCB0byBgLi9iYXJgIHdpdGhvdXRcbiAqIG92ZXJ3cml0aW5nLlxuICpcbiAqIEBleGFtcGxlIE92ZXJ3cml0aW5nIGZpbGVzL2RpcmVjdG9yaWVzXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGNvcHlTeW5jIH0gZnJvbSBcIkBzdGQvZnMvY29weVwiO1xuICpcbiAqIGNvcHlTeW5jKFwiLi9mb29cIiwgXCIuL2JhclwiLCB7IG92ZXJ3cml0ZTogdHJ1ZSB9KTtcbiAqIGBgYFxuICpcbiAqIFRoaXMgd2lsbCBjb3B5IHRoZSBmaWxlIG9yIGRpcmVjdG9yeSBhdCBgLi9mb29gIHRvIGAuL2JhcmAgYW5kIG92ZXJ3cml0ZVxuICogYW55IGV4aXN0aW5nIGZpbGVzIG9yIGRpcmVjdG9yaWVzLlxuICpcbiAqIEBleGFtcGxlIFByZXNlcnZpbmcgdGltZXN0YW1wc1xuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyBjb3B5U3luYyB9IGZyb20gXCJAc3RkL2ZzL2NvcHlcIjtcbiAqXG4gKiBjb3B5U3luYyhcIi4vZm9vXCIsIFwiLi9iYXJcIiwgeyBwcmVzZXJ2ZVRpbWVzdGFtcHM6IHRydWUgfSk7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIHdpbGwgY29weSB0aGUgZmlsZSBvciBkaXJlY3RvcnkgYXQgYC4vZm9vYCB0byBgLi9iYXJgIGFuZCBzZXQgdGhlXG4gKiBsYXN0IG1vZGlmaWNhdGlvbiBhbmQgYWNjZXNzIHRpbWVzIHRvIHRoZSBvbmVzIG9mIHRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb3B5U3luYyhcbiAgc3JjOiBzdHJpbmcgfCBVUkwsXG4gIGRlc3Q6IHN0cmluZyB8IFVSTCxcbiAgb3B0aW9uczogQ29weU9wdGlvbnMgPSB7fSxcbikge1xuICBzcmMgPSByZXNvbHZlKHRvUGF0aFN0cmluZyhzcmMpKTtcbiAgZGVzdCA9IHJlc29sdmUodG9QYXRoU3RyaW5nKGRlc3QpKTtcblxuICBpZiAoc3JjID09PSBkZXN0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiU291cmNlIGFuZCBkZXN0aW5hdGlvbiBjYW5ub3QgYmUgdGhlIHNhbWVcIik7XG4gIH1cblxuICBjb25zdCBzcmNTdGF0ID0gRGVuby5sc3RhdFN5bmMoc3JjKTtcblxuICBpZiAoc3JjU3RhdC5pc0RpcmVjdG9yeSAmJiBpc1N1YmRpcihzcmMsIGRlc3QpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYENhbm5vdCBjb3B5ICcke3NyY30nIHRvIGEgc3ViZGlyZWN0b3J5IG9mIGl0c2VsZjogJyR7ZGVzdH0nYCxcbiAgICApO1xuICB9XG5cbiAgaWYgKHNyY1N0YXQuaXNTeW1saW5rKSB7XG4gICAgY29weVN5bWxpbmtTeW5jKHNyYywgZGVzdCwgb3B0aW9ucyk7XG4gIH0gZWxzZSBpZiAoc3JjU3RhdC5pc0RpcmVjdG9yeSkge1xuICAgIGNvcHlEaXJTeW5jKHNyYywgZGVzdCwgb3B0aW9ucyk7XG4gIH0gZWxzZSBpZiAoc3JjU3RhdC5pc0ZpbGUpIHtcbiAgICBjb3B5RmlsZVN5bmMoc3JjLCBkZXN0LCBvcHRpb25zKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUVyRCxTQUFTLFFBQVEsUUFBUSxnQ0FBZ0M7QUFDekQsU0FBUyxJQUFJLFFBQVEsNEJBQTRCO0FBQ2pELFNBQVMsT0FBTyxRQUFRLCtCQUErQjtBQUN2RCxTQUFTLFNBQVMsRUFBRSxhQUFhLFFBQVEsa0JBQWtCO0FBQzNELFNBQVMsZUFBZSxRQUFRLDJCQUEyQjtBQUMzRCxTQUFTLFlBQVksUUFBUSx1QkFBdUI7QUFDcEQsU0FBUyxRQUFRLFFBQVEsa0JBQWtCO0FBQzNDLFNBQVMsU0FBUyxRQUFRLCtCQUErQjtBQTRCekQsU0FBUyxhQUFhLElBQWlCLEVBQUUsSUFBWTtFQUNuRCxJQUFJLFNBQVMsTUFBTTtJQUNqQixNQUFNLElBQUksTUFBTSxHQUFHLEtBQUssZUFBZSxDQUFDO0VBQzFDO0FBQ0Y7QUFFQSxlQUFlLGdCQUNiLEdBQWlCLEVBQ2pCLElBQWtCLEVBQ2xCLE9BQTRCO0VBRTVCLElBQUk7RUFFSixJQUFJO0lBQ0YsV0FBVyxNQUFNLEtBQUssS0FBSyxDQUFDO0VBQzlCLEVBQUUsT0FBTyxLQUFLO0lBQ1osSUFBSSxlQUFlLEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRTtNQUN2QztJQUNGO0lBQ0EsTUFBTTtFQUNSO0VBRUEsSUFBSSxRQUFRLFFBQVEsSUFBSSxDQUFDLFNBQVMsV0FBVyxFQUFFO0lBQzdDLE1BQU0sSUFBSSxNQUNSLENBQUMs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
// denoCacheMetadata=3886342166833288963,781886511372293513
