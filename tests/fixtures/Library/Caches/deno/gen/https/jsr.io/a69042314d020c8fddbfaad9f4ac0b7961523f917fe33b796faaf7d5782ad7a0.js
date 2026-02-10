// Copyright 2018-2026 the Deno authors. MIT license.
import { dirname } from "jsr:@std/path@^1.1.4/dirname";
import { ensureDir, ensureDirSync } from "./ensure_dir.ts";
import { getFileInfoType } from "./_get_file_info_type.ts";
import { toPathString } from "./_to_path_string.ts";
/**
 * Asynchronously ensures that the file exists.
 *
 * If the file already exists, this function does nothing. If the parent
 * directories for the file do not exist, they are created.
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param filePath The path of the file to ensure, as a string or URL.
 *
 * @returns A void promise that resolves once the file exists.
 *
 * @example Usage
 * ```ts ignore
 * import { ensureFile } from "@std/fs/ensure-file";
 *
 * await ensureFile("./folder/targetFile.dat");
 * ```
 */ export async function ensureFile(filePath) {
  try {
    // if file exists
    const stat = await Deno.lstat(filePath);
    if (!stat.isFile) {
      throw new Error(
        `Failed to ensure file exists: expected 'file', got '${getFileInfoType(stat)}'`,
      );
    }
  } catch (err) {
    // if file not exists
    if (err instanceof Deno.errors.NotFound) {
      // ensure dir exists
      await ensureDir(dirname(toPathString(filePath)));
      // create file
      await Deno.writeFile(filePath, new Uint8Array());
      return;
    }
    throw err;
  }
}
/**
 * Synchronously ensures that the file exists.
 *
 * If the file already exists, this function does nothing. If the parent
 * directories for the file do not exist, they are created.
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param filePath The path of the file to ensure, as a string or URL.
 *
 * @returns A void value that returns once the file exists.
 *
 * @example Usage
 * ```ts ignore
 * import { ensureFileSync } from "@std/fs/ensure-file";
 *
 * ensureFileSync("./folder/targetFile.dat");
 * ```
 */ export function ensureFileSync(filePath) {
  try {
    // if file exists
    const stat = Deno.lstatSync(filePath);
    if (!stat.isFile) {
      throw new Error(
        `Failed to ensure file exists: expected 'file', got '${getFileInfoType(stat)}'`,
      );
    }
  } catch (err) {
    // if file not exists
    if (err instanceof Deno.errors.NotFound) {
      // ensure dir exists
      ensureDirSync(dirname(toPathString(filePath)));
      // create file
      Deno.writeFileSync(filePath, new Uint8Array());
      return;
    }
    throw err;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL2Vuc3VyZV9maWxlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjYgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSBcImpzcjpAc3RkL3BhdGhAXjEuMS40L2Rpcm5hbWVcIjtcbmltcG9ydCB7IGVuc3VyZURpciwgZW5zdXJlRGlyU3luYyB9IGZyb20gXCIuL2Vuc3VyZV9kaXIudHNcIjtcbmltcG9ydCB7IGdldEZpbGVJbmZvVHlwZSB9IGZyb20gXCIuL19nZXRfZmlsZV9pbmZvX3R5cGUudHNcIjtcbmltcG9ydCB7IHRvUGF0aFN0cmluZyB9IGZyb20gXCIuL190b19wYXRoX3N0cmluZy50c1wiO1xuXG4vKipcbiAqIEFzeW5jaHJvbm91c2x5IGVuc3VyZXMgdGhhdCB0aGUgZmlsZSBleGlzdHMuXG4gKlxuICogSWYgdGhlIGZpbGUgYWxyZWFkeSBleGlzdHMsIHRoaXMgZnVuY3Rpb24gZG9lcyBub3RoaW5nLiBJZiB0aGUgcGFyZW50XG4gKiBkaXJlY3RvcmllcyBmb3IgdGhlIGZpbGUgZG8gbm90IGV4aXN0LCB0aGV5IGFyZSBjcmVhdGVkLlxuICpcbiAqIFJlcXVpcmVzIGAtLWFsbG93LXJlYWRgIGFuZCBgLS1hbGxvdy13cml0ZWAgcGVybWlzc2lvbnMuXG4gKlxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9kb2NzLmRlbm8uY29tL3J1bnRpbWUvbWFudWFsL2Jhc2ljcy9wZXJtaXNzaW9ucyNmaWxlLXN5c3RlbS1hY2Nlc3N9XG4gKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBEZW5vJ3MgcGVybWlzc2lvbnMgc3lzdGVtLlxuICpcbiAqIEBwYXJhbSBmaWxlUGF0aCBUaGUgcGF0aCBvZiB0aGUgZmlsZSB0byBlbnN1cmUsIGFzIGEgc3RyaW5nIG9yIFVSTC5cbiAqXG4gKiBAcmV0dXJucyBBIHZvaWQgcHJvbWlzZSB0aGF0IHJlc29sdmVzIG9uY2UgdGhlIGZpbGUgZXhpc3RzLlxuICpcbiAqIEBleGFtcGxlIFVzYWdlXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGVuc3VyZUZpbGUgfSBmcm9tIFwiQHN0ZC9mcy9lbnN1cmUtZmlsZVwiO1xuICpcbiAqIGF3YWl0IGVuc3VyZUZpbGUoXCIuL2ZvbGRlci90YXJnZXRGaWxlLmRhdFwiKTtcbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlRmlsZShmaWxlUGF0aDogc3RyaW5nIHwgVVJMKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgLy8gaWYgZmlsZSBleGlzdHNcbiAgICBjb25zdCBzdGF0ID0gYXdhaXQgRGVuby5sc3RhdChmaWxlUGF0aCk7XG4gICAgaWYgKCFzdGF0LmlzRmlsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgRmFpbGVkIHRvIGVuc3VyZSBmaWxlIGV4aXN0czogZXhwZWN0ZWQgJ2ZpbGUnLCBnb3QgJyR7XG4gICAgICAgICAgZ2V0RmlsZUluZm9UeXBlKHN0YXQpXG4gICAgICAgIH0nYCxcbiAgICAgICk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICAvLyBpZiBmaWxlIG5vdCBleGlzdHNcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgRGVuby5lcnJvcnMuTm90Rm91bmQpIHtcbiAgICAgIC8vIGVuc3VyZSBkaXIgZXhpc3RzXG4gICAgICBhd2FpdCBlbnN1cmVEaXIoZGlybmFtZSh0b1BhdGhTdHJpbmcoZmlsZVBhdGgpKSk7XG4gICAgICAvLyBjcmVhdGUgZmlsZVxuICAgICAgYXdhaXQgRGVuby53cml0ZUZpbGUoZmlsZVBhdGgsIG5ldyBVaW50OEFycmF5KCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRocm93IGVycjtcbiAgfVxufVxuXG4vKipcbiAqIFN5bmNocm9ub3VzbHkgZW5zdXJlcyB0aGF0IHRoZSBmaWxlIGV4aXN0cy5cbiAqXG4gKiBJZiB0aGUgZmlsZSBhbHJlYWR5IGV4aXN0cywgdGhpcyBmdW5jdGlvbiBkb2VzIG5vdGhpbmcuIElmIHRoZSBwYXJlbnRcbiAqIGRpcmVjdG9yaWVzIGZvciB0aGUgZmlsZSBkbyBub3QgZXhpc3QsIHRoZXkgYXJlIGNyZWF0ZWQuXG4gKlxuICogUmVxdWlyZXMgYC0tYWxsb3ctcmVhZGAgYW5kIGAtLWFsbG93LXdyaXRlYCBwZXJtaXNzaW9ucy5cbiAqXG4gKiBAc2VlIHtAbGluayBodHRwczovL2RvY3MuZGVuby5jb20vcnVudGltZS9tYW51YWwvYmFzaWNzL3Blcm1pc3Npb25zI2ZpbGUtc3lzdGVtLWFjY2Vzc31cbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIERlbm8ncyBwZXJtaXNzaW9ucyBzeXN0ZW0uXG4gKlxuICogQHBhcmFtIGZpbGVQYXRoIFRoZSBwYXRoIG9mIHRoZSBmaWxlIHRvIGVuc3VyZSwgYXMgYSBzdHJpbmcgb3IgVVJMLlxuICpcbiAqIEByZXR1cm5zIEEgdm9pZCB2YWx1ZSB0aGF0IHJldHVybnMgb25jZSB0aGUgZmlsZSBleGlzdHMuXG4gKlxuICogQGV4YW1wbGUgVXNhZ2VcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgZW5zdXJlRmlsZVN5bmMgfSBmcm9tIFwiQHN0ZC9mcy9lbnN1cmUtZmlsZVwiO1xuICpcbiAqIGVuc3VyZUZpbGVTeW5jKFwiLi9mb2xkZXIvdGFyZ2V0RmlsZS5kYXRcIik7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZUZpbGVTeW5jKGZpbGVQYXRoOiBzdHJpbmcgfCBVUkwpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICAvLyBpZiBmaWxlIGV4aXN0c1xuICAgIGNvbnN0IHN0YXQgPSBEZW5vLmxzdGF0U3luYyhmaWxlUGF0aCk7XG4gICAgaWYgKCFzdGF0LmlzRmlsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgRmFpbGVkIHRvIGVuc3VyZSBmaWxlIGV4aXN0czogZXhwZWN0ZWQgJ2ZpbGUnLCBnb3QgJyR7XG4gICAgICAgICAgZ2V0RmlsZUluZm9UeXBlKHN0YXQpXG4gICAgICAgIH0nYCxcbiAgICAgICk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICAvLyBpZiBmaWxlIG5vdCBleGlzdHNcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgRGVuby5lcnJvcnMuTm90Rm91bmQpIHtcbiAgICAgIC8vIGVuc3VyZSBkaXIgZXhpc3RzXG4gICAgICBlbnN1cmVEaXJTeW5jKGRpcm5hbWUodG9QYXRoU3RyaW5nKGZpbGVQYXRoKSkpO1xuICAgICAgLy8gY3JlYXRlIGZpbGVcbiAgICAgIERlbm8ud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgbmV3IFVpbnQ4QXJyYXkoKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IGVycjtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUNyRCxTQUFTLE9BQU8sUUFBUSwrQkFBK0I7QUFDdkQsU0FBUyxTQUFTLEVBQUUsYUFBYSxRQUFRLGtCQUFrQjtBQUMzRCxTQUFTLGVBQWUsUUFBUSwyQkFBMkI7QUFDM0QsU0FBUyxZQUFZLFFBQVEsdUJBQXVCO0FBRXBEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FxQkMsR0FDRCxPQUFPLGVBQWUsV0FBVyxRQUFzQjtFQUNyRCxJQUFJO0lBQ0YsaUJBQWlCO0lBQ2pCLE1BQU0sT0FBTyxNQUFNLEtBQUssS0FBSyxDQUFDO0lBQzlCLElBQUksQ0FBQyxLQUFLLE1BQU0sRUFBRTtNQUNoQixNQUFNLElBQUksTUFDUixDQUFDLG9EQUFvRCxFQUNuRCxnQkFBZ0IsTUFDakIsQ0FBQyxDQUFDO0lBRVA7RUFDRixFQUFFLE9BQU8sS0FBSztJQUNaLHFCQUFxQjtJQUNyQixJQUFJLGVBQWUsS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFO01BQ3ZDLG9CQUFvQjtNQUNwQixNQUFNLFVBQVUsUUFBUSxhQUFhO01BQ3JDLGNBQWM7TUFDZCxNQUFNLEtBQUssU0FBUyxDQUFDLFVBQVUsSUFBSTtNQUNuQztJQUNGO0lBRUEsTUFBTTtFQUNSO0FBQ0Y7QUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBcUJDLEdBQ0QsT0FBTyxTQUFTLGVBQWUsUUFBc0I7RUFDbkQsSUFBSTtJQUNGLGlCQUFpQjtJQUNqQixNQUFNLE9BQU8sS0FBSyxTQUFTLENBQUM7SUFDNUIsSUFBSSxDQUFDLEtBQUssTUFBTSxFQUFFO01BQ2hCLE1BQU0sSUFBSSxNQUNSLENBQUMsb0RBQW9ELEVBQ25ELGdCQUFnQixNQUNqQixDQUFDLENBQUM7SUFFUDtFQUNGLEVBQUUsT0FBTyxLQUFLO0lBQ1oscUJBQXFCO0lBQ3JCLElBQUksZUFBZSxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUU7TUFDdkMsb0JBQW9CO01BQ3BCLGNBQWMsUUFBUSxhQUFhO01BQ25DLGNBQWM7TUFDZCxLQUFLLGFBQWEsQ0FBQyxVQUFVLElBQUk7TUFDakM7SUFDRjtJQUNBLE1BQU07RUFDUjtBQUNGIn0=
// denoCacheMetadata=13603356915606968124,3900617114059304964
