// Copyright 2018-2026 the Deno authors. MIT license.
import { dirname } from "jsr:@std/path@^1.1.4/dirname";
import { resolve } from "jsr:@std/path@^1.1.4/resolve";
import { ensureDir, ensureDirSync } from "./ensure_dir.ts";
import { getFileInfoType } from "./_get_file_info_type.ts";
import { toPathString } from "./_to_path_string.ts";
import { isWindows } from "jsr:@std/internal@^1.0.12/os";
function resolveSymlinkTarget(target, linkName) {
  if (typeof target !== "string") return target; // URL is always absolute path
  if (typeof linkName === "string") {
    return resolve(dirname(linkName), target);
  } else {
    return new URL(target, linkName);
  }
}
function getSymlinkOption(type) {
  return isWindows
    ? {
      type: type === "dir" ? "dir" : "file",
    }
    : undefined;
}
/**
 * Asynchronously ensures that the link exists, and points to a valid file.
 *
 * If the parent directories for the link do not exist, they are created. If the
 * link already exists, and it is not modified, this function does nothing. If
 * the link already exists, and it does not point to the given target, an error
 * is thrown.
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param target The source file path as a string or URL. If it is a relative path string, it have to be relative to the link path.
 * @param linkName The destination link path as a string or URL.
 *
 * @returns A void promise that resolves once the link exists.
 *
 * @example Basic usage
 * ```ts ignore
 * import { ensureSymlink } from "@std/fs/ensure-symlink";
 *
 * // Ensures the link `./targetFile.link.dat` exists and points to `./targetFile.dat`
 * await ensureSymlink("./targetFile.dat", "./targetFile.link.dat");
 * ```
 *
 * @example Ensuring a link in a folder
 * ```ts ignore
 * import { ensureSymlink } from "@std/fs/ensure-symlink";
 *
 * // Ensures the link `./folder/targetFile.link.dat` exists and points to `./folder/targetFile.dat`
 * await ensureSymlink("./targetFile.dat", "./folder/targetFile.link.dat");
 * ```
 */ export async function ensureSymlink(target, linkName) {
  const targetRealPath = resolveSymlinkTarget(target, linkName);
  let srcStatInfo;
  try {
    srcStatInfo = await Deno.lstat(targetRealPath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Deno.errors.NotFound(
        `Cannot ensure symlink as the target path does not exist: ${targetRealPath}`,
      );
    }
    throw error;
  }
  const srcFilePathType = getFileInfoType(srcStatInfo);
  await ensureDir(dirname(toPathString(linkName)));
  const options = getSymlinkOption(srcFilePathType);
  try {
    await Deno.symlink(target, linkName, options);
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
    const linkStatInfo = await Deno.lstat(linkName);
    if (!linkStatInfo.isSymlink) {
      const type = getFileInfoType(linkStatInfo);
      throw new Deno.errors.AlreadyExists(`A '${type}' already exists at the path: ${linkName}`);
    }
    const linkPath = await Deno.readLink(linkName);
    const linkRealPath = resolve(linkPath);
    if (linkRealPath !== targetRealPath) {
      throw new Deno.errors.AlreadyExists(
        `A symlink targeting to an undesired path already exists: ${linkName} -> ${linkRealPath}`,
      );
    }
  }
}
/**
 * Synchronously ensures that the link exists, and points to a valid file.
 *
 * If the parent directories for the link do not exist, they are created. If the
 * link already exists, and it is not modified, this function does nothing. If
 * the link already exists, and it does not point to the given target, an error
 * is thrown.
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param target The source file path as a string or URL. If it is a relative path string, it have to be relative to the link path.
 * @param linkName The destination link path as a string or URL.
 * @returns A void value that returns once the link exists.
 *
 * @example Basic usage
 * ```ts ignore
 * import { ensureSymlinkSync } from "@std/fs/ensure-symlink";
 *
 * // Ensures the link `./targetFile.link.dat` exists and points to `./targetFile.dat`
 * ensureSymlinkSync("./targetFile.dat", "./targetFile.link.dat");
 * ```
 *
 * @example Ensuring a link in a folder
 * ```ts ignore
 * import { ensureSymlinkSync } from "@std/fs/ensure-symlink";
 *
 * // Ensures the link `./folder/targetFile.link.dat` exists and points to `./folder/targetFile.dat`
 * ensureSymlinkSync("./targetFile.dat", "./folder/targetFile.link.dat");
 * ```
 */ export function ensureSymlinkSync(target, linkName) {
  const targetRealPath = resolveSymlinkTarget(target, linkName);
  let srcStatInfo;
  try {
    srcStatInfo = Deno.lstatSync(targetRealPath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Deno.errors.NotFound(
        `Cannot ensure symlink as the target path does not exist: ${targetRealPath}`,
      );
    }
    throw error;
  }
  const srcFilePathType = getFileInfoType(srcStatInfo);
  ensureDirSync(dirname(toPathString(linkName)));
  const options = getSymlinkOption(srcFilePathType);
  try {
    Deno.symlinkSync(target, linkName, options);
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
    const linkStatInfo = Deno.lstatSync(linkName);
    if (!linkStatInfo.isSymlink) {
      const type = getFileInfoType(linkStatInfo);
      throw new Deno.errors.AlreadyExists(`A '${type}' already exists at the path: ${linkName}`);
    }
    const linkPath = Deno.readLinkSync(linkName);
    const linkRealPath = resolve(linkPath);
    if (linkRealPath !== targetRealPath) {
      throw new Deno.errors.AlreadyExists(
        `A symlink targeting to an undesired path already exists: ${linkName} -> ${linkRealPath}`,
      );
    }
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL2Vuc3VyZV9zeW1saW5rLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjYgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSBcImpzcjpAc3RkL3BhdGhAXjEuMS40L2Rpcm5hbWVcIjtcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwianNyOkBzdGQvcGF0aEBeMS4xLjQvcmVzb2x2ZVwiO1xuaW1wb3J0IHsgZW5zdXJlRGlyLCBlbnN1cmVEaXJTeW5jIH0gZnJvbSBcIi4vZW5zdXJlX2Rpci50c1wiO1xuaW1wb3J0IHsgZ2V0RmlsZUluZm9UeXBlLCB0eXBlIFBhdGhUeXBlIH0gZnJvbSBcIi4vX2dldF9maWxlX2luZm9fdHlwZS50c1wiO1xuaW1wb3J0IHsgdG9QYXRoU3RyaW5nIH0gZnJvbSBcIi4vX3RvX3BhdGhfc3RyaW5nLnRzXCI7XG5pbXBvcnQgeyBpc1dpbmRvd3MgfSBmcm9tIFwianNyOkBzdGQvaW50ZXJuYWxAXjEuMC4xMi9vc1wiO1xuXG5mdW5jdGlvbiByZXNvbHZlU3ltbGlua1RhcmdldCh0YXJnZXQ6IHN0cmluZyB8IFVSTCwgbGlua05hbWU6IHN0cmluZyB8IFVSTCkge1xuICBpZiAodHlwZW9mIHRhcmdldCAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIHRhcmdldDsgLy8gVVJMIGlzIGFsd2F5cyBhYnNvbHV0ZSBwYXRoXG4gIGlmICh0eXBlb2YgbGlua05hbWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4gcmVzb2x2ZShkaXJuYW1lKGxpbmtOYW1lKSwgdGFyZ2V0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IFVSTCh0YXJnZXQsIGxpbmtOYW1lKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTeW1saW5rT3B0aW9uKFxuICB0eXBlOiBQYXRoVHlwZSB8IHVuZGVmaW5lZCxcbik6IERlbm8uU3ltbGlua09wdGlvbnMgfCB1bmRlZmluZWQge1xuICByZXR1cm4gaXNXaW5kb3dzID8geyB0eXBlOiB0eXBlID09PSBcImRpclwiID8gXCJkaXJcIiA6IFwiZmlsZVwiIH0gOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQXN5bmNocm9ub3VzbHkgZW5zdXJlcyB0aGF0IHRoZSBsaW5rIGV4aXN0cywgYW5kIHBvaW50cyB0byBhIHZhbGlkIGZpbGUuXG4gKlxuICogSWYgdGhlIHBhcmVudCBkaXJlY3RvcmllcyBmb3IgdGhlIGxpbmsgZG8gbm90IGV4aXN0LCB0aGV5IGFyZSBjcmVhdGVkLiBJZiB0aGVcbiAqIGxpbmsgYWxyZWFkeSBleGlzdHMsIGFuZCBpdCBpcyBub3QgbW9kaWZpZWQsIHRoaXMgZnVuY3Rpb24gZG9lcyBub3RoaW5nLiBJZlxuICogdGhlIGxpbmsgYWxyZWFkeSBleGlzdHMsIGFuZCBpdCBkb2VzIG5vdCBwb2ludCB0byB0aGUgZ2l2ZW4gdGFyZ2V0LCBhbiBlcnJvclxuICogaXMgdGhyb3duLlxuICpcbiAqIFJlcXVpcmVzIGAtLWFsbG93LXJlYWRgIGFuZCBgLS1hbGxvdy13cml0ZWAgcGVybWlzc2lvbnMuXG4gKlxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9kb2NzLmRlbm8uY29tL3J1bnRpbWUvbWFudWFsL2Jhc2ljcy9wZXJtaXNzaW9ucyNmaWxlLXN5c3RlbS1hY2Nlc3N9XG4gKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBEZW5vJ3MgcGVybWlzc2lvbnMgc3lzdGVtLlxuICpcbiAqIEBwYXJhbSB0YXJnZXQgVGhlIHNvdXJjZSBmaWxlIHBhdGggYXMgYSBzdHJpbmcgb3IgVVJMLiBJZiBpdCBpcyBhIHJlbGF0aXZlIHBhdGggc3RyaW5nLCBpdCBoYXZlIHRvIGJlIHJlbGF0aXZlIHRvIHRoZSBsaW5rIHBhdGguXG4gKiBAcGFyYW0gbGlua05hbWUgVGhlIGRlc3RpbmF0aW9uIGxpbmsgcGF0aCBhcyBhIHN0cmluZyBvciBVUkwuXG4gKlxuICogQHJldHVybnMgQSB2b2lkIHByb21pc2UgdGhhdCByZXNvbHZlcyBvbmNlIHRoZSBsaW5rIGV4aXN0cy5cbiAqXG4gKiBAZXhhbXBsZSBCYXNpYyB1c2FnZVxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyBlbnN1cmVTeW1saW5rIH0gZnJvbSBcIkBzdGQvZnMvZW5zdXJlLXN5bWxpbmtcIjtcbiAqXG4gKiAvLyBFbnN1cmVzIHRoZSBsaW5rIGAuL3RhcmdldEZpbGUubGluay5kYXRgIGV4aXN0cyBhbmQgcG9pbnRzIHRvIGAuL3RhcmdldEZpbGUuZGF0YFxuICogYXdhaXQgZW5zdXJlU3ltbGluayhcIi4vdGFyZ2V0RmlsZS5kYXRcIiwgXCIuL3RhcmdldEZpbGUubGluay5kYXRcIik7XG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZSBFbnN1cmluZyBhIGxpbmsgaW4gYSBmb2xkZXJcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgZW5zdXJlU3ltbGluayB9IGZyb20gXCJAc3RkL2ZzL2Vuc3VyZS1zeW1saW5rXCI7XG4gKlxuICogLy8gRW5zdXJlcyB0aGUgbGluayBgLi9mb2xkZXIvdGFyZ2V0RmlsZS5saW5rLmRhdGAgZXhpc3RzIGFuZCBwb2ludHMgdG8gYC4vZm9sZGVyL3RhcmdldEZpbGUuZGF0YFxuICogYXdhaXQgZW5zdXJlU3ltbGluayhcIi4vdGFyZ2V0RmlsZS5kYXRcIiwgXCIuL2ZvbGRlci90YXJnZXRGaWxlLmxpbmsuZGF0XCIpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVTeW1saW5rKFxuICB0YXJnZXQ6IHN0cmluZyB8IFVSTCxcbiAgbGlua05hbWU6IHN0cmluZyB8IFVSTCxcbikge1xuICBjb25zdCB0YXJnZXRSZWFsUGF0aCA9IHJlc29sdmVTeW1saW5rVGFyZ2V0KHRhcmdldCwgbGlua05hbWUpO1xuICBsZXQgc3JjU3RhdEluZm87XG4gIHRyeSB7XG4gICAgc3JjU3RhdEluZm8gPSBhd2FpdCBEZW5vLmxzdGF0KHRhcmdldFJlYWxQYXRoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkge1xuICAgICAgdGhyb3cgbmV3IERlbm8uZXJyb3JzLk5vdEZvdW5kKFxuICAgICAgICBgQ2Fubm90IGVuc3VyZSBzeW1saW5rIGFzIHRoZSB0YXJnZXQgcGF0aCBkb2VzIG5vdCBleGlzdDogJHt0YXJnZXRSZWFsUGF0aH1gLFxuICAgICAgKTtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbiAgY29uc3Qgc3JjRmlsZVBhdGhUeXBlID0gZ2V0RmlsZUluZm9UeXBlKHNyY1N0YXRJbmZvKTtcblxuICBhd2FpdCBlbnN1cmVEaXIoZGlybmFtZSh0b1BhdGhTdHJpbmcobGlua05hbWUpKSk7XG5cbiAgY29uc3Qgb3B0aW9ucyA9IGdldFN5bWxpbmtPcHRpb24oc3JjRmlsZVBhdGhUeXBlKTtcblxuICB0cnkge1xuICAgIGF3YWl0IERlbm8uc3ltbGluayh0YXJnZXQsIGxpbmtOYW1lLCBvcHRpb25zKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoIShlcnJvciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLkFscmVhZHlFeGlzdHMpKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gICAgY29uc3QgbGlua1N0YXRJbmZvID0gYXdhaXQgRGVuby5sc3RhdChsaW5rTmFtZSk7XG4gICAgaWYgKCFsaW5rU3RhdEluZm8uaXNTeW1saW5rKSB7XG4gICAgICBjb25zdCB0eXBlID0gZ2V0RmlsZUluZm9UeXBlKGxpbmtTdGF0SW5mbyk7XG4gICAgICB0aHJvdyBuZXcgRGVuby5lcnJvcnMuQWxyZWFkeUV4aXN0cyhcbiAgICAgICAgYEEgJyR7dHlwZX0nIGFscmVhZHkgZXhpc3RzIGF0IHRoZSBwYXRoOiAke2xpbmtOYW1lfWAsXG4gICAgICApO1xuICAgIH1cbiAgICBjb25zdCBsaW5rUGF0aCA9IGF3YWl0IERlbm8ucmVhZExpbmsobGlua05hbWUpO1xuICAgIGNvbnN0IGxpbmtSZWFsUGF0aCA9IHJlc29sdmUobGlua1BhdGgpO1xuICAgIGlmIChsaW5rUmVhbFBhdGggIT09IHRhcmdldFJlYWxQYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRGVuby5lcnJvcnMuQWxyZWFkeUV4aXN0cyhcbiAgICAgICAgYEEgc3ltbGluayB0YXJnZXRpbmcgdG8gYW4gdW5kZXNpcmVkIHBhdGggYWxyZWFkeSBleGlzdHM6ICR7bGlua05hbWV9IC0+ICR7bGlua1JlYWxQYXRofWAsXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFN5bmNocm9ub3VzbHkgZW5zdXJlcyB0aGF0IHRoZSBsaW5rIGV4aXN0cywgYW5kIHBvaW50cyB0byBhIHZhbGlkIGZpbGUuXG4gKlxuICogSWYgdGhlIHBhcmVudCBkaXJlY3RvcmllcyBmb3IgdGhlIGxpbmsgZG8gbm90IGV4aXN0LCB0aGV5IGFyZSBjcmVhdGVkLiBJZiB0aGVcbiAqIGxpbmsgYWxyZWFkeSBleGlzdHMsIGFuZCBpdCBpcyBub3QgbW9kaWZpZWQsIHRoaXMgZnVuY3Rpb24gZG9lcyBub3RoaW5nLiBJZlxuICogdGhlIGxpbmsgYWxyZWFkeSBleGlzdHMsIGFuZCBpdCBkb2VzIG5vdCBwb2ludCB0byB0aGUgZ2l2ZW4gdGFyZ2V0LCBhbiBlcnJvclxuICogaXMgdGhyb3duLlxuICpcbiAqIFJlcXVpcmVzIGAtLWFsbG93LXJlYWRgIGFuZCBgLS1hbGxvdy13cml0ZWAgcGVybWlzc2lvbnMuXG4gKlxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9kb2NzLmRlbm8uY29tL3J1bnRpbWUvbWFudWFsL2Jhc2ljcy9wZXJtaXNzaW9ucyNmaWxlLXN5c3RlbS1hY2Nlc3N9XG4gKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBEZW5vJ3MgcGVybWlzc2lvbnMgc3lzdGVtLlxuICpcbiAqIEBwYXJhbSB0YXJnZXQgVGhlIHNvdXJjZSBmaWxlIHBhdGggYXMgYSBzdHJpbmcgb3IgVVJMLiBJZiBpdCBpcyBhIHJlbGF0aXZlIHBhdGggc3RyaW5nLCBpdCBoYXZlIHRvIGJlIHJlbGF0aXZlIHRvIHRoZSBsaW5rIHBhdGguXG4gKiBAcGFyYW0gbGlua05hbWUgVGhlIGRlc3RpbmF0aW9uIGxpbmsgcGF0aCBhcyBhIHN0cmluZyBvciBVUkwuXG4gKiBAcmV0dXJucyBBIHZvaWQgdmFsdWUgdGhhdCByZXR1cm5zIG9uY2UgdGhlIGxpbmsgZXhpc3RzLlxuICpcbiAqIEBleGFtcGxlIEJhc2ljIHVzYWdlXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGVuc3VyZVN5bWxpbmtTeW5jIH0gZnJvbSBcIkBzdGQvZnMvZW5zdXJlLXN5bWxpbmtcIjtcbiAqXG4gKiAvLyBFbnN1cmVzIHRoZSBsaW5rIGAuL3RhcmdldEZpbGUubGluay5kYXRgIGV4aXN0cyBhbmQgcG9pbnRzIHRvIGAuL3RhcmdldEZpbGUuZGF0YFxuICogZW5zdXJlU3ltbGlua1N5bmMoXCIuL3RhcmdldEZpbGUuZGF0XCIsIFwiLi90YXJnZXRGaWxlLmxpbmsuZGF0XCIpO1xuICogYGBgXG4gKlxuICogQGV4YW1wbGUgRW5zdXJpbmcgYSBsaW5rIGluIGEgZm9sZGVyXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGVuc3VyZVN5bWxpbmtTeW5jIH0gZnJvbSBcIkBzdGQvZnMvZW5zdXJlLXN5bWxpbmtcIjtcbiAqXG4gKiAvLyBFbnN1cmVzIHRoZSBsaW5rIGAuL2ZvbGRlci90YXJnZXRGaWxlLmxpbmsuZGF0YCBleGlzdHMgYW5kIHBvaW50cyB0byBgLi9mb2xkZXIvdGFyZ2V0RmlsZS5kYXRgXG4gKiBlbnN1cmVTeW1saW5rU3luYyhcIi4vdGFyZ2V0RmlsZS5kYXRcIiwgXCIuL2ZvbGRlci90YXJnZXRGaWxlLmxpbmsuZGF0XCIpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVTeW1saW5rU3luYyhcbiAgdGFyZ2V0OiBzdHJpbmcgfCBVUkwsXG4gIGxpbmtOYW1lOiBzdHJpbmcgfCBVUkwsXG4pIHtcbiAgY29uc3QgdGFyZ2V0UmVhbFBhdGggPSByZXNvbHZlU3ltbGlua1RhcmdldCh0YXJnZXQsIGxpbmtOYW1lKTtcbiAgbGV0IHNyY1N0YXRJbmZvO1xuICB0cnkge1xuICAgIHNyY1N0YXRJbmZvID0gRGVuby5sc3RhdFN5bmModGFyZ2V0UmVhbFBhdGgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSB7XG4gICAgICB0aHJvdyBuZXcgRGVuby5lcnJvcnMuTm90Rm91bmQoXG4gICAgICAgIGBDYW5ub3QgZW5zdXJlIHN5bWxpbmsgYXMgdGhlIHRhcmdldCBwYXRoIGRvZXMgbm90IGV4aXN0OiAke3RhcmdldFJlYWxQYXRofWAsXG4gICAgICApO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuICBjb25zdCBzcmNGaWxlUGF0aFR5cGUgPSBnZXRGaWxlSW5mb1R5cGUoc3JjU3RhdEluZm8pO1xuXG4gIGVuc3VyZURpclN5bmMoZGlybmFtZSh0b1BhdGhTdHJpbmcobGlua05hbWUpKSk7XG5cbiAgY29uc3Qgb3B0aW9ucyA9IGdldFN5bWxpbmtPcHRpb24oc3JjRmlsZVBhdGhUeXBlKTtcblxuICB0cnkge1xuICAgIERlbm8uc3ltbGlua1N5bmModGFyZ2V0LCBsaW5rTmFtZSwgb3B0aW9ucyk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKCEoZXJyb3IgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5BbHJlYWR5RXhpc3RzKSkge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICAgIGNvbnN0IGxpbmtTdGF0SW5mbyA9IERlbm8ubHN0YXRTeW5jKGxpbmtOYW1lKTtcbiAgICBpZiAoIWxpbmtTdGF0SW5mby5pc1N5bWxpbmspIHtcbiAgICAgIGNvbnN0IHR5cGUgPSBnZXRGaWxlSW5mb1R5cGUobGlua1N0YXRJbmZvKTtcbiAgICAgIHRocm93IG5ldyBEZW5vLmVycm9ycy5BbHJlYWR5RXhpc3RzKFxuICAgICAgICBgQSAnJHt0eXBlfScgYWxyZWFkeSBleGlzdHMgYXQgdGhlIHBhdGg6ICR7bGlua05hbWV9YCxcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IGxpbmtQYXRoID0gRGVuby5yZWFkTGlua1N5bmMobGlua05hbWUpO1xuICAgIGNvbnN0IGxpbmtSZWFsUGF0aCA9IHJlc29sdmUobGlua1BhdGgpO1xuICAgIGlmIChsaW5rUmVhbFBhdGggIT09IHRhcmdldFJlYWxQYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRGVuby5lcnJvcnMuQWxyZWFkeUV4aXN0cyhcbiAgICAgICAgYEEgc3ltbGluayB0YXJnZXRpbmcgdG8gYW4gdW5kZXNpcmVkIHBhdGggYWxyZWFkeSBleGlzdHM6ICR7bGlua05hbWV9IC0+ICR7bGlua1JlYWxQYXRofWAsXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUNyRCxTQUFTLE9BQU8sUUFBUSwrQkFBK0I7QUFDdkQsU0FBUyxPQUFPLFFBQVEsK0JBQStCO0FBQ3ZELFNBQVMsU0FBUyxFQUFFLGFBQWEsUUFBUSxrQkFBa0I7QUFDM0QsU0FBUyxlQUFlLFFBQXVCLDJCQUEyQjtBQUMxRSxTQUFTLFlBQVksUUFBUSx1QkFBdUI7QUFDcEQsU0FBUyxTQUFTLFFBQVEsK0JBQStCO0FBRXpELFNBQVMscUJBQXFCLE1BQW9CLEVBQUUsUUFBc0I7RUFDeEUsSUFBSSxPQUFPLFdBQVcsVUFBVSxPQUFPLFFBQVEsOEJBQThCO0VBQzdFLElBQUksT0FBTyxhQUFhLFVBQVU7SUFDaEMsT0FBTyxRQUFRLFFBQVEsV0FBVztFQUNwQyxPQUFPO0lBQ0wsT0FBTyxJQUFJLElBQUksUUFBUTtFQUN6QjtBQUNGO0FBRUEsU0FBUyxpQkFDUCxJQUEwQjtFQUUxQixPQUFPLFlBQVk7SUFBRSxNQUFNLFNBQVMsUUFBUSxRQUFRO0VBQU8sSUFBSTtBQUNqRTtBQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FpQ0MsR0FDRCxPQUFPLGVB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
// denoCacheMetadata=15392106882824639299,16284776127810080115
