// Copyright 2018-2026 the Deno authors. MIT license.
import { getFileInfoType } from "./_get_file_info_type.ts";
/**
 * Asynchronously ensures that the directory exists, like
 * {@linkcode https://www.ibm.com/docs/en/aix/7.3?topic=m-mkdir-command#mkdir__row-d3e133766 | mkdir -p}.
 *
 * If the directory already exists, this function does nothing. If the directory
 * does not exist, it is created.
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param dir The path of the directory to ensure, as a string or URL.
 *
 * @returns A promise that resolves once the directory exists.
 *
 * @example Usage
 * ```ts ignore
 * import { ensureDir } from "@std/fs/ensure-dir";
 *
 * await ensureDir("./bar");
 * ```
 */ export async function ensureDir(dir) {
  try {
    const fileInfo = await Deno.stat(dir);
    throwIfNotDirectory(fileInfo);
    return;
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
  }
  // The dir doesn't exist. Create it.
  // This can be racy. So we catch AlreadyExists and check stat again.
  try {
    await Deno.mkdir(dir, {
      recursive: true,
    });
  } catch (err) {
    if (!(err instanceof Deno.errors.AlreadyExists)) {
      throw err;
    }
    const fileInfo = await Deno.stat(dir);
    throwIfNotDirectory(fileInfo);
  }
}
/**
 * Synchronously ensures that the directory exists, like
 * {@linkcode https://www.ibm.com/docs/en/aix/7.3?topic=m-mkdir-command#mkdir__row-d3e133766 | mkdir -p}.
 *
 * If the directory already exists, this function does nothing. If the directory
 * does not exist, it is created.
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param dir The path of the directory to ensure, as a string or URL.
 *
 * @returns A void value that returns once the directory exists.
 *
 * @example Usage
 * ```ts ignore
 * import { ensureDirSync } from "@std/fs/ensure-dir";
 *
 * ensureDirSync("./bar");
 * ```
 */ export function ensureDirSync(dir) {
  try {
    const fileInfo = Deno.statSync(dir);
    throwIfNotDirectory(fileInfo);
    return;
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
  }
  // The dir doesn't exist. Create it.
  // This can be racy. So we catch AlreadyExists and check stat again.
  try {
    Deno.mkdirSync(dir, {
      recursive: true,
    });
  } catch (err) {
    if (!(err instanceof Deno.errors.AlreadyExists)) {
      throw err;
    }
    const fileInfo = Deno.statSync(dir);
    throwIfNotDirectory(fileInfo);
  }
}
function throwIfNotDirectory(fileInfo) {
  if (!fileInfo.isDirectory) {
    throw new Error(
      `Failed to ensure directory exists: expected 'dir', got '${getFileInfoType(fileInfo)}'`,
    );
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL2Vuc3VyZV9kaXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNiB0aGUgRGVubyBhdXRob3JzLiBNSVQgbGljZW5zZS5cbmltcG9ydCB7IGdldEZpbGVJbmZvVHlwZSB9IGZyb20gXCIuL19nZXRfZmlsZV9pbmZvX3R5cGUudHNcIjtcblxuLyoqXG4gKiBBc3luY2hyb25vdXNseSBlbnN1cmVzIHRoYXQgdGhlIGRpcmVjdG9yeSBleGlzdHMsIGxpa2VcbiAqIHtAbGlua2NvZGUgaHR0cHM6Ly93d3cuaWJtLmNvbS9kb2NzL2VuL2FpeC83LjM/dG9waWM9bS1ta2Rpci1jb21tYW5kI21rZGlyX19yb3ctZDNlMTMzNzY2IHwgbWtkaXIgLXB9LlxuICpcbiAqIElmIHRoZSBkaXJlY3RvcnkgYWxyZWFkeSBleGlzdHMsIHRoaXMgZnVuY3Rpb24gZG9lcyBub3RoaW5nLiBJZiB0aGUgZGlyZWN0b3J5XG4gKiBkb2VzIG5vdCBleGlzdCwgaXQgaXMgY3JlYXRlZC5cbiAqXG4gKiBSZXF1aXJlcyBgLS1hbGxvdy1yZWFkYCBhbmQgYC0tYWxsb3ctd3JpdGVgIHBlcm1pc3Npb25zLlxuICpcbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZG9jcy5kZW5vLmNvbS9ydW50aW1lL21hbnVhbC9iYXNpY3MvcGVybWlzc2lvbnMjZmlsZS1zeXN0ZW0tYWNjZXNzfVxuICogZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gRGVubydzIHBlcm1pc3Npb25zIHN5c3RlbS5cbiAqXG4gKiBAcGFyYW0gZGlyIFRoZSBwYXRoIG9mIHRoZSBkaXJlY3RvcnkgdG8gZW5zdXJlLCBhcyBhIHN0cmluZyBvciBVUkwuXG4gKlxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgb25jZSB0aGUgZGlyZWN0b3J5IGV4aXN0cy5cbiAqXG4gKiBAZXhhbXBsZSBVc2FnZVxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyBlbnN1cmVEaXIgfSBmcm9tIFwiQHN0ZC9mcy9lbnN1cmUtZGlyXCI7XG4gKlxuICogYXdhaXQgZW5zdXJlRGlyKFwiLi9iYXJcIik7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZURpcihkaXI6IHN0cmluZyB8IFVSTCkge1xuICB0cnkge1xuICAgIGNvbnN0IGZpbGVJbmZvID0gYXdhaXQgRGVuby5zdGF0KGRpcik7XG4gICAgdGhyb3dJZk5vdERpcmVjdG9yeShmaWxlSW5mbyk7XG4gICAgcmV0dXJuO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkpIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cblxuICAvLyBUaGUgZGlyIGRvZXNuJ3QgZXhpc3QuIENyZWF0ZSBpdC5cbiAgLy8gVGhpcyBjYW4gYmUgcmFjeS4gU28gd2UgY2F0Y2ggQWxyZWFkeUV4aXN0cyBhbmQgY2hlY2sgc3RhdCBhZ2Fpbi5cbiAgdHJ5IHtcbiAgICBhd2FpdCBEZW5vLm1rZGlyKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmICghKGVyciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLkFscmVhZHlFeGlzdHMpKSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZUluZm8gPSBhd2FpdCBEZW5vLnN0YXQoZGlyKTtcbiAgICB0aHJvd0lmTm90RGlyZWN0b3J5KGZpbGVJbmZvKTtcbiAgfVxufVxuXG4vKipcbiAqIFN5bmNocm9ub3VzbHkgZW5zdXJlcyB0aGF0IHRoZSBkaXJlY3RvcnkgZXhpc3RzLCBsaWtlXG4gKiB7QGxpbmtjb2RlIGh0dHBzOi8vd3d3LmlibS5jb20vZG9jcy9lbi9haXgvNy4zP3RvcGljPW0tbWtkaXItY29tbWFuZCNta2Rpcl9fcm93LWQzZTEzMzc2NiB8IG1rZGlyIC1wfS5cbiAqXG4gKiBJZiB0aGUgZGlyZWN0b3J5IGFscmVhZHkgZXhpc3RzLCB0aGlzIGZ1bmN0aW9uIGRvZXMgbm90aGluZy4gSWYgdGhlIGRpcmVjdG9yeVxuICogZG9lcyBub3QgZXhpc3QsIGl0IGlzIGNyZWF0ZWQuXG4gKlxuICogUmVxdWlyZXMgYC0tYWxsb3ctcmVhZGAgYW5kIGAtLWFsbG93LXdyaXRlYCBwZXJtaXNzaW9ucy5cbiAqXG4gKiBAc2VlIHtAbGluayBodHRwczovL2RvY3MuZGVuby5jb20vcnVudGltZS9tYW51YWwvYmFzaWNzL3Blcm1pc3Npb25zI2ZpbGUtc3lzdGVtLWFjY2Vzc31cbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIERlbm8ncyBwZXJtaXNzaW9ucyBzeXN0ZW0uXG4gKlxuICogQHBhcmFtIGRpciBUaGUgcGF0aCBvZiB0aGUgZGlyZWN0b3J5IHRvIGVuc3VyZSwgYXMgYSBzdHJpbmcgb3IgVVJMLlxuICpcbiAqIEByZXR1cm5zIEEgdm9pZCB2YWx1ZSB0aGF0IHJldHVybnMgb25jZSB0aGUgZGlyZWN0b3J5IGV4aXN0cy5cbiAqXG4gKiBAZXhhbXBsZSBVc2FnZVxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyBlbnN1cmVEaXJTeW5jIH0gZnJvbSBcIkBzdGQvZnMvZW5zdXJlLWRpclwiO1xuICpcbiAqIGVuc3VyZURpclN5bmMoXCIuL2JhclwiKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlRGlyU3luYyhkaXI6IHN0cmluZyB8IFVSTCkge1xuICB0cnkge1xuICAgIGNvbnN0IGZpbGVJbmZvID0gRGVuby5zdGF0U3luYyhkaXIpO1xuICAgIHRocm93SWZOb3REaXJlY3RvcnkoZmlsZUluZm8pO1xuICAgIHJldHVybjtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKCEoZXJyIGluc3RhbmNlb2YgRGVuby5lcnJvcnMuTm90Rm91bmQpKSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9XG5cbiAgLy8gVGhlIGRpciBkb2Vzbid0IGV4aXN0LiBDcmVhdGUgaXQuXG4gIC8vIFRoaXMgY2FuIGJlIHJhY3kuIFNvIHdlIGNhdGNoIEFscmVhZHlFeGlzdHMgYW5kIGNoZWNrIHN0YXQgYWdhaW4uXG4gIHRyeSB7XG4gICAgRGVuby5ta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKCEoZXJyIGluc3RhbmNlb2YgRGVuby5lcnJvcnMuQWxyZWFkeUV4aXN0cykpIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlSW5mbyA9IERlbm8uc3RhdFN5bmMoZGlyKTtcbiAgICB0aHJvd0lmTm90RGlyZWN0b3J5KGZpbGVJbmZvKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0aHJvd0lmTm90RGlyZWN0b3J5KGZpbGVJbmZvOiBEZW5vLkZpbGVJbmZvKSB7XG4gIGlmICghZmlsZUluZm8uaXNEaXJlY3RvcnkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgRmFpbGVkIHRvIGVuc3VyZSBkaXJlY3RvcnkgZXhpc3RzOiBleHBlY3RlZCAnZGlyJywgZ290ICcke1xuICAgICAgICBnZXRGaWxlSW5mb1R5cGUoZmlsZUluZm8pXG4gICAgICB9J2AsXG4gICAgKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUNyRCxTQUFTLGVBQWUsUUFBUSwyQkFBMkI7QUFFM0Q7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FzQkMsR0FDRCxPQUFPLGVBQWUsVUFBVSxHQUFpQjtFQUMvQyxJQUFJO0lBQ0YsTUFBTSxXQUFXLE1BQU0sS0FBSyxJQUFJLENBQUM7SUFDakMsb0JBQW9CO0lBQ3BCO0VBQ0YsRUFBRSxPQUFPLEtBQUs7SUFDWixJQUFJLENBQUMsQ0FBQyxlQUFlLEtBQUssTUFBTSxDQUFDLFFBQVEsR0FBRztNQUMxQyxNQUFNO0lBQ1I7RUFDRjtFQUVBLG9DQUFvQztFQUNwQyxvRUFBb0U7RUFDcEUsSUFBSTtJQUNGLE1BQU0sS0FBSyxLQUFLLENBQUMsS0FBSztNQUFFLFdBQVc7SUFBSztFQUMxQyxFQUFFLE9BQU8sS0FBSztJQUNaLElBQUksQ0FBQyxDQUFDLGVBQWUsS0FBSyxNQUFNLENBQUMsYUFBYSxHQUFHO01BQy9DLE1BQU07SUFDUjtJQUVBLE1BQU0sV0FBVyxNQUFNLEtBQUssSUFBSSxDQUFDO0lBQ2pDLG9CQUFvQjtFQUN0QjtBQUNGO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FzQkMsR0FDRCxPQUFPLFNBQVMsY0FBYyxHQUFpQjtFQUM3QyxJQUFJO0lBQ0YsTUFBTSxXQUFXLEtBQUssUUFBUSxDQUFDO0lBQy9CLG9CQUFvQjtJQUNwQjtFQUNGLEVBQUUsT0FBTyxLQUFLO0lBQ1osSUFBSSxDQUFDLENBQUMsZUFBZSxLQUFLLE1BQU0sQ0FBQyxRQUFRLEdBQUc7TUFDMUMsTUFBTTtJQUNSO0VBQ0Y7RUFFQSxvQ0FBb0M7RUFDcEMsb0VBQW9FO0VBQ3BFLElBQUk7SUFDRixLQUFLLFNBQVMsQ0FBQyxLQUFLO01BQUUsV0FBVztJQUFLO0VBQ3hDLEVBQUUsT0FBTyxLQUFLO0lBQ1osSUFBSSxDQUFDLENBQUMsZUFBZSxLQUFLLE1BQU0sQ0FBQyxhQUFhLEdBQUc7TUFDL0MsTUFBTTtJQUNSO0lBRUEsTUFBTSxXQUFXLEtBQUssUUFBUSxDQUFDO0lBQy9CLG9CQUFvQjtFQUN0QjtBQUNGO0FBRUEsU0FBUyxvQkFBb0IsUUFBdUI7RUFDbEQsSUFBSSxDQUFDLFNBQVMsV0FBVyxFQUFFO0lBQ3pCLE1BQU0sSUFBSSxNQUNSLENBQUMsd0RBQXdELEVBQ3ZELGdCQUFnQixVQUNqQixDQUFDLENBQUM7RUFFUDtBQUNGIn0=
// denoCacheMetadata=11451080688998951229,11133373075849079573
