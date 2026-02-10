// Copyright 2018-2026 the Deno authors. MIT license.
import { isSubdir } from "./_is_subdir.ts";
import { isSamePath } from "./_is_same_path.ts";
/**
 * Asynchronously moves a file or directory (along with its contents).
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param src The source file or directory as a string or URL.
 * @param dest The destination file or directory as a string or URL.
 * @param options Options for the move operation.
 * @throws {Deno.errors.AlreadyExists} If `dest` already exists and
 * `options.overwrite` is `false`.
 * @throws {Deno.errors.NotSupported} If `src` is a sub-directory of `dest`.
 *
 * @returns A void promise that resolves once the operation completes.
 *
 * @example Basic usage
 * ```ts ignore
 * import { move } from "@std/fs/move";
 *
 * await move("./foo", "./bar");
 * ```
 *
 * This will move the file or directory at `./foo` to `./bar` without
 * overwriting.
 *
 * @example Overwriting
 * ```ts ignore
 * import { move } from "@std/fs/move";
 *
 * await move("./foo", "./bar", { overwrite: true });
 * ```
 *
 * This will move the file or directory at `./foo` to `./bar`, overwriting
 * `./bar` if it already exists.
 */ export async function move(src, dest, options) {
  const { overwrite = false } = options ?? {};
  const srcStat = await Deno.stat(src);
  if (srcStat.isDirectory && (isSubdir(src, dest) || isSamePath(src, dest))) {
    throw new Deno.errors.NotSupported(
      `Cannot move '${src}' to a subdirectory of itself, '${dest}'.`,
    );
  }
  if (overwrite) {
    if (isSamePath(src, dest)) return;
    try {
      await Deno.remove(dest, {
        recursive: true,
      });
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  } else {
    const EXISTS_ERROR = new Deno.errors.AlreadyExists("dest already exists.");
    try {
      await Deno.lstat(dest);
      return Promise.reject(EXISTS_ERROR);
    } catch {
      // Do nothing...
    }
  }
  await Deno.rename(src, dest);
}
/**
 * Synchronously moves a file or directory (along with its contents).
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param src The source file or directory as a string or URL.
 * @param dest The destination file or directory as a string or URL.
 * @param options Options for the move operation.
 * @throws {Deno.errors.AlreadyExists} If `dest` already exists and
 * `options.overwrite` is `false`.
 * @throws {Deno.errors.NotSupported} If `src` is a sub-directory of `dest`.
 *
 * @returns A void value that returns once the operation completes.
 *
 * @example Basic usage
 * ```ts ignore
 * import { moveSync } from "@std/fs/move";
 *
 * moveSync("./foo", "./bar");
 * ```
 *
 * This will move the file or directory at `./foo` to `./bar` without
 * overwriting.
 *
 * @example Overwriting
 * ```ts ignore
 * import { moveSync } from "@std/fs/move";
 *
 * moveSync("./foo", "./bar", { overwrite: true });
 * ```
 *
 * This will move the file or directory at `./foo` to `./bar`, overwriting
 * `./bar` if it already exists.
 */ export function moveSync(src, dest, options) {
  const { overwrite = false } = options ?? {};
  const srcStat = Deno.statSync(src);
  if (srcStat.isDirectory && (isSubdir(src, dest) || isSamePath(src, dest))) {
    throw new Deno.errors.NotSupported(
      `Cannot move '${src}' to a subdirectory of itself, '${dest}'.`,
    );
  }
  if (overwrite) {
    if (isSamePath(src, dest)) return;
    try {
      Deno.removeSync(dest, {
        recursive: true,
      });
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  } else {
    const EXISTS_ERROR = new Deno.errors.AlreadyExists("dest already exists.");
    try {
      Deno.lstatSync(dest);
      throw EXISTS_ERROR;
    } catch (error) {
      if (error === EXISTS_ERROR) {
        throw error;
      }
    }
  }
  Deno.renameSync(src, dest);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL21vdmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNiB0aGUgRGVubyBhdXRob3JzLiBNSVQgbGljZW5zZS5cbmltcG9ydCB7IGlzU3ViZGlyIH0gZnJvbSBcIi4vX2lzX3N1YmRpci50c1wiO1xuaW1wb3J0IHsgaXNTYW1lUGF0aCB9IGZyb20gXCIuL19pc19zYW1lX3BhdGgudHNcIjtcblxuLyoqIE9wdGlvbnMgZm9yIHtAbGlua2NvZGUgbW92ZX0gYW5kIHtAbGlua2NvZGUgbW92ZVN5bmN9LiAqL1xuZXhwb3J0IGludGVyZmFjZSBNb3ZlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBkZXN0aW5hdGlvbiBmaWxlIHNob3VsZCBiZSBvdmVyd3JpdHRlbiBpZiBpdCBhbHJlYWR5IGV4aXN0cy5cbiAgICpcbiAgICogQGRlZmF1bHQge2ZhbHNlfVxuICAgKi9cbiAgb3ZlcndyaXRlPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBBc3luY2hyb25vdXNseSBtb3ZlcyBhIGZpbGUgb3IgZGlyZWN0b3J5IChhbG9uZyB3aXRoIGl0cyBjb250ZW50cykuXG4gKlxuICogUmVxdWlyZXMgYC0tYWxsb3ctcmVhZGAgYW5kIGAtLWFsbG93LXdyaXRlYCBwZXJtaXNzaW9ucy5cbiAqXG4gKiBAc2VlIHtAbGluayBodHRwczovL2RvY3MuZGVuby5jb20vcnVudGltZS9tYW51YWwvYmFzaWNzL3Blcm1pc3Npb25zI2ZpbGUtc3lzdGVtLWFjY2Vzc31cbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIERlbm8ncyBwZXJtaXNzaW9ucyBzeXN0ZW0uXG4gKlxuICogQHBhcmFtIHNyYyBUaGUgc291cmNlIGZpbGUgb3IgZGlyZWN0b3J5IGFzIGEgc3RyaW5nIG9yIFVSTC5cbiAqIEBwYXJhbSBkZXN0IFRoZSBkZXN0aW5hdGlvbiBmaWxlIG9yIGRpcmVjdG9yeSBhcyBhIHN0cmluZyBvciBVUkwuXG4gKiBAcGFyYW0gb3B0aW9ucyBPcHRpb25zIGZvciB0aGUgbW92ZSBvcGVyYXRpb24uXG4gKiBAdGhyb3dzIHtEZW5vLmVycm9ycy5BbHJlYWR5RXhpc3RzfSBJZiBgZGVzdGAgYWxyZWFkeSBleGlzdHMgYW5kXG4gKiBgb3B0aW9ucy5vdmVyd3JpdGVgIGlzIGBmYWxzZWAuXG4gKiBAdGhyb3dzIHtEZW5vLmVycm9ycy5Ob3RTdXBwb3J0ZWR9IElmIGBzcmNgIGlzIGEgc3ViLWRpcmVjdG9yeSBvZiBgZGVzdGAuXG4gKlxuICogQHJldHVybnMgQSB2b2lkIHByb21pc2UgdGhhdCByZXNvbHZlcyBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICpcbiAqIEBleGFtcGxlIEJhc2ljIHVzYWdlXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IG1vdmUgfSBmcm9tIFwiQHN0ZC9mcy9tb3ZlXCI7XG4gKlxuICogYXdhaXQgbW92ZShcIi4vZm9vXCIsIFwiLi9iYXJcIik7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIHdpbGwgbW92ZSB0aGUgZmlsZSBvciBkaXJlY3RvcnkgYXQgYC4vZm9vYCB0byBgLi9iYXJgIHdpdGhvdXRcbiAqIG92ZXJ3cml0aW5nLlxuICpcbiAqIEBleGFtcGxlIE92ZXJ3cml0aW5nXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IG1vdmUgfSBmcm9tIFwiQHN0ZC9mcy9tb3ZlXCI7XG4gKlxuICogYXdhaXQgbW92ZShcIi4vZm9vXCIsIFwiLi9iYXJcIiwgeyBvdmVyd3JpdGU6IHRydWUgfSk7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIHdpbGwgbW92ZSB0aGUgZmlsZSBvciBkaXJlY3RvcnkgYXQgYC4vZm9vYCB0byBgLi9iYXJgLCBvdmVyd3JpdGluZ1xuICogYC4vYmFyYCBpZiBpdCBhbHJlYWR5IGV4aXN0cy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1vdmUoXG4gIHNyYzogc3RyaW5nIHwgVVJMLFxuICBkZXN0OiBzdHJpbmcgfCBVUkwsXG4gIG9wdGlvbnM/OiBNb3ZlT3B0aW9ucyxcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IG92ZXJ3cml0ZSA9IGZhbHNlIH0gPSBvcHRpb25zID8/IHt9O1xuXG4gIGNvbnN0IHNyY1N0YXQgPSBhd2FpdCBEZW5vLnN0YXQoc3JjKTtcblxuICBpZiAoXG4gICAgc3JjU3RhdC5pc0RpcmVjdG9yeSAmJlxuICAgIChpc1N1YmRpcihzcmMsIGRlc3QpIHx8IGlzU2FtZVBhdGgoc3JjLCBkZXN0KSlcbiAgKSB7XG4gICAgdGhyb3cgbmV3IERlbm8uZXJyb3JzLk5vdFN1cHBvcnRlZChcbiAgICAgIGBDYW5ub3QgbW92ZSAnJHtzcmN9JyB0byBhIHN1YmRpcmVjdG9yeSBvZiBpdHNlbGYsICcke2Rlc3R9Jy5gLFxuICAgICk7XG4gIH1cblxuICBpZiAob3ZlcndyaXRlKSB7XG4gICAgaWYgKGlzU2FtZVBhdGgoc3JjLCBkZXN0KSkgcmV0dXJuO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBEZW5vLnJlbW92ZShkZXN0LCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKCEoZXJyb3IgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnN0IEVYSVNUU19FUlJPUiA9IG5ldyBEZW5vLmVycm9ycy5BbHJlYWR5RXhpc3RzKFwiZGVzdCBhbHJlYWR5IGV4aXN0cy5cIik7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IERlbm8ubHN0YXQoZGVzdCk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoRVhJU1RTX0VSUk9SKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIERvIG5vdGhpbmcuLi5cbiAgICB9XG4gIH1cblxuICBhd2FpdCBEZW5vLnJlbmFtZShzcmMsIGRlc3QpO1xufVxuXG4vKipcbiAqIFN5bmNocm9ub3VzbHkgbW92ZXMgYSBmaWxlIG9yIGRpcmVjdG9yeSAoYWxvbmcgd2l0aCBpdHMgY29udGVudHMpLlxuICpcbiAqIFJlcXVpcmVzIGAtLWFsbG93LXJlYWRgIGFuZCBgLS1hbGxvdy13cml0ZWAgcGVybWlzc2lvbnMuXG4gKlxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9kb2NzLmRlbm8uY29tL3J1bnRpbWUvbWFudWFsL2Jhc2ljcy9wZXJtaXNzaW9ucyNmaWxlLXN5c3RlbS1hY2Nlc3N9XG4gKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBEZW5vJ3MgcGVybWlzc2lvbnMgc3lzdGVtLlxuICpcbiAqIEBwYXJhbSBzcmMgVGhlIHNvdXJjZSBmaWxlIG9yIGRpcmVjdG9yeSBhcyBhIHN0cmluZyBvciBVUkwuXG4gKiBAcGFyYW0gZGVzdCBUaGUgZGVzdGluYXRpb24gZmlsZSBvciBkaXJlY3RvcnkgYXMgYSBzdHJpbmcgb3IgVVJMLlxuICogQHBhcmFtIG9wdGlvbnMgT3B0aW9ucyBmb3IgdGhlIG1vdmUgb3BlcmF0aW9uLlxuICogQHRocm93cyB7RGVuby5lcnJvcnMuQWxyZWFkeUV4aXN0c30gSWYgYGRlc3RgIGFscmVhZHkgZXhpc3RzIGFuZFxuICogYG9wdGlvbnMub3ZlcndyaXRlYCBpcyBgZmFsc2VgLlxuICogQHRocm93cyB7RGVuby5lcnJvcnMuTm90U3VwcG9ydGVkfSBJZiBgc3JjYCBpcyBhIHN1Yi1kaXJlY3Rvcnkgb2YgYGRlc3RgLlxuICpcbiAqIEByZXR1cm5zIEEgdm9pZCB2YWx1ZSB0aGF0IHJldHVybnMgb25jZSB0aGUgb3BlcmF0aW9uIGNvbXBsZXRlcy5cbiAqXG4gKiBAZXhhbXBsZSBCYXNpYyB1c2FnZVxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyBtb3ZlU3luYyB9IGZyb20gXCJAc3RkL2ZzL21vdmVcIjtcbiAqXG4gKiBtb3ZlU3luYyhcIi4vZm9vXCIsIFwiLi9iYXJcIik7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIHdpbGwgbW92ZSB0aGUgZmlsZSBvciBkaXJlY3RvcnkgYXQgYC4vZm9vYCB0byBgLi9iYXJgIHdpdGhvdXRcbiAqIG92ZXJ3cml0aW5nLlxuICpcbiAqIEBleGFtcGxlIE92ZXJ3cml0aW5nXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IG1vdmVTeW5jIH0gZnJvbSBcIkBzdGQvZnMvbW92ZVwiO1xuICpcbiAqIG1vdmVTeW5jKFwiLi9mb29cIiwgXCIuL2JhclwiLCB7IG92ZXJ3cml0ZTogdHJ1ZSB9KTtcbiAqIGBgYFxuICpcbiAqIFRoaXMgd2lsbCBtb3ZlIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSBhdCBgLi9mb29gIHRvIGAuL2JhcmAsIG92ZXJ3cml0aW5nXG4gKiBgLi9iYXJgIGlmIGl0IGFscmVhZHkgZXhpc3RzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbW92ZVN5bmMoXG4gIHNyYzogc3RyaW5nIHwgVVJMLFxuICBkZXN0OiBzdHJpbmcgfCBVUkwsXG4gIG9wdGlvbnM/OiBNb3ZlT3B0aW9ucyxcbik6IHZvaWQge1xuICBjb25zdCB7IG92ZXJ3cml0ZSA9IGZhbHNlIH0gPSBvcHRpb25zID8/IHt9O1xuXG4gIGNvbnN0IHNyY1N0YXQgPSBEZW5vLnN0YXRTeW5jKHNyYyk7XG5cbiAgaWYgKFxuICAgIHNyY1N0YXQuaXNEaXJlY3RvcnkgJiZcbiAgICAoaXNTdWJkaXIoc3JjLCBkZXN0KSB8fCBpc1NhbWVQYXRoKHNyYywgZGVzdCkpXG4gICkge1xuICAgIHRocm93IG5ldyBEZW5vLmVycm9ycy5Ob3RTdXBwb3J0ZWQoXG4gICAgICBgQ2Fubm90IG1vdmUgJyR7c3JjfScgdG8gYSBzdWJkaXJlY3Rvcnkgb2YgaXRzZWxmLCAnJHtkZXN0fScuYCxcbiAgICApO1xuICB9XG5cbiAgaWYgKG92ZXJ3cml0ZSkge1xuICAgIGlmIChpc1NhbWVQYXRoKHNyYywgZGVzdCkpIHJldHVybjtcbiAgICB0cnkge1xuICAgICAgRGVuby5yZW1vdmVTeW5jKGRlc3QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBpZiAoIShlcnJvciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSkge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgRVhJU1RTX0VSUk9SID0gbmV3IERlbm8uZXJyb3JzLkFscmVhZHlFeGlzdHMoXCJkZXN0IGFscmVhZHkgZXhpc3RzLlwiKTtcbiAgICB0cnkge1xuICAgICAgRGVuby5sc3RhdFN5bmMoZGVzdCk7XG4gICAgICB0aHJvdyBFWElTVFNfRVJST1I7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmIChlcnJvciA9PT0gRVhJU1RTX0VSUk9SKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIERlbm8ucmVuYW1lU3luYyhzcmMsIGRlc3QpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUNyRCxTQUFTLFFBQVEsUUFBUSxrQkFBa0I7QUFDM0MsU0FBUyxVQUFVLFFBQVEscUJBQXFCO0FBWWhEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FvQ0MsR0FDRCxPQUFPLGVBQWUsS0FDcEIsR0FBaUIsRUFDakIsSUFBa0IsRUFDbEIsT0FBcUI7RUFFckIsTUFBTSxFQUFFLFlBQVksS0FBSyxFQUFFLEdBQUcsV0FBVyxDQUFDO0VBRTFDLE1BQU0sVUFBVSxNQUFNLEtBQUssSUFBSSxDQUFDO0VBRWhDLElBQ0UsUUFBUSxXQUFXLElBQ25CLENBQUMsU0FBUyxLQUFLLFNBQVMsV0FBVyxLQUFLLEtBQUssR0FDN0M7SUFDQSxNQUFNLElBQUksS0FBSyxNQUFNLENBQUMsWUFBWSxDQUNoQyxDQUFDLGFBQWEsRUFBRSxJQUFJLGdDQUFnQyxFQUFFLEtBQUssRUFBRSxDQUFDO0VBRWxFO0VBRUEsSUFBSSxXQUFXO0lBQ2IsSUFBSSxXQUFXLEtBQUssT0FBTztJQUMzQixJQUFJO01BQ0YsTUFBTSxLQUFLLE1BQU0sQ0FBQyxNQUFNO1FBQUUsV0FBVztNQUFLO0lBQzVDLEVBQUUsT0FBTyxPQUFPO01BQ2QsSUFBSSxDQUFDLENBQUMsaUJBQWlCLEtBQUssTUFBTSxDQUFDLFFBQVEsR0FBRztRQUM1QyxNQUFNO01BQ1I7SUFDRjtFQUNGLE9BQU87SUFDTCxNQUFNLGVBQWUsSUFBSSxLQUFLLE1BQU0sQ0FBQyxhQUFhLENBQUM7SUFDbkQsSUFBSTtNQUNGLE1BQU0sS0FBSyxLQUFLLENBQUM7TUFDakIsT0FBTyxRQUFRLE1BQU0sQ0FBQztJQUN4QixFQUFFLE9BQU07SUFDTixnQkFBZ0I7SUFDbEI7RUFDRjtFQUVBLE1BQU0sS0FBSyxNQUFNLENBQUMsS0FBSztBQUN6QjtBQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FvQ0MsR0FDRCxPQUFPLFNBQVMsU0FDZCxHQUFpQixFQUNqQixJQUFrQixFQUNsQixPQUFxQjtFQUVyQixNQUFNLEVBQUUsWUFBWSxLQUFLLEVBQUUsR0FBRyxXQUFXLENBQUM7RUFFMUMsTUFBTSxVQUFVLEtBQUssUUFBUSxDQUFDO0VBRTlCLElBQ0UsUUFBUSxXQUFXLElBQ25CLENBQUMsU0FBUyxLQUFLLFNBQVMsV0FBVyxLQUFLLEtBQUssR0FDN0M7SUFDQSxNQUFNLElBQUksS0FBSyxNQUFNLENBQUMsWUFBWSxDQUNoQyxDQUFDLGFBQWEsRUFBRSxJQUFJLGdDQUFnQyxFQUFFLEtBQUssRUFBRSxDQUFDO0VBRWxFO0VBRUEsSUFBSSxXQUFXO0lBQ2IsSUFBSSxXQUFXLEtBQUssT0FBTztJQUMzQixJQUFJO01BQ0YsS0FBSyxVQUFVLENBQUMsTUFBTTtRQUFFLFdBQVc7TUFBSztJQUMxQyxFQUFFLE9BQU8sT0FBTztNQUNkLElBQUksQ0FBQyxDQUFDLGlCQUFpQixLQUFLLE1BQU0sQ0FBQyxRQUFRLEdBQUc7UUFDNUMsTUFBTTtNQUNSO0lBQ0Y7RUFDRixPQUFPO0lBQ0wsTUFBTSxlQUFlLElBQUksS0FBSyxNQUFNLENBQUMsYUFBYSxDQUFDO0lBQ25ELElBQUk7TUFDRixLQUFLLFNBQVMsQ0FBQztNQUNmLE1BQU07SUFDUixFQUFFLE9BQU8sT0FBTztNQUNkLElBQUksVUFBVSxjQUFjO1FBQzFCLE1BQU07TUFDUjtJQUNGO0VBQ0Y7RUFFQSxLQUFLLFVBQVUsQ0FBQyxLQUFLO0FBQ3ZCIn0=
// denoCacheMetadata=511616757209324410,16687080175292719391
