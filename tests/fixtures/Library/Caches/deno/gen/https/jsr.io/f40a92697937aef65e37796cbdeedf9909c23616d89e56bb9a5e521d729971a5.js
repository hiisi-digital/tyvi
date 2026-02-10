// Copyright 2018-2026 the Deno authors. MIT license.
import { join } from "jsr:@std/path@^1.1.4/join";
import { toPathString } from "./_to_path_string.ts";
/**
 * Asynchronously ensures that a directory is empty.
 *
 * If the directory does not exist, it is created. The directory itself is not
 * deleted.
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param dir The path of the directory to empty, as a string or URL.
 *
 * @returns A void promise that resolves once the directory is empty.
 *
 * @example Usage
 * ```ts ignore
 * import { emptyDir } from "@std/fs/empty-dir";
 *
 * await emptyDir("./foo");
 * ```
 */ export async function emptyDir(dir) {
  try {
    const items = await Array.fromAsync(Deno.readDir(dir));
    await Promise.all(items.map((item) => {
      if (item && item.name) {
        const filepath = join(toPathString(dir), item.name);
        return Deno.remove(filepath, {
          recursive: true,
        });
      }
    }));
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
    // if not exist. then create it
    await Deno.mkdir(dir, {
      recursive: true,
    });
  }
}
/**
 * Synchronously ensures that a directory is empty deletes the directory
 * contents it is not empty.
 *
 * If the directory does not exist, it is created. The directory itself is not
 * deleted.
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param dir The path of the directory to empty, as a string or URL.
 *
 * @returns A void value that returns once the directory is empty.
 *
 * @example Usage
 * ```ts ignore
 * import { emptyDirSync } from "@std/fs/empty-dir";
 *
 * emptyDirSync("./foo");
 * ```
 */ export function emptyDirSync(dir) {
  try {
    const items = [
      ...Deno.readDirSync(dir),
    ];
    // If the directory exists, remove all entries inside it.
    while (items.length) {
      const item = items.shift();
      if (item && item.name) {
        const filepath = join(toPathString(dir), item.name);
        Deno.removeSync(filepath, {
          recursive: true,
        });
      }
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
    // if not exist. then create it
    Deno.mkdirSync(dir, {
      recursive: true,
    });
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL2VtcHR5X2Rpci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI2IHRoZSBEZW5vIGF1dGhvcnMuIE1JVCBsaWNlbnNlLlxuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJqc3I6QHN0ZC9wYXRoQF4xLjEuNC9qb2luXCI7XG5pbXBvcnQgeyB0b1BhdGhTdHJpbmcgfSBmcm9tIFwiLi9fdG9fcGF0aF9zdHJpbmcudHNcIjtcblxuLyoqXG4gKiBBc3luY2hyb25vdXNseSBlbnN1cmVzIHRoYXQgYSBkaXJlY3RvcnkgaXMgZW1wdHkuXG4gKlxuICogSWYgdGhlIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdCwgaXQgaXMgY3JlYXRlZC4gVGhlIGRpcmVjdG9yeSBpdHNlbGYgaXMgbm90XG4gKiBkZWxldGVkLlxuICpcbiAqIFJlcXVpcmVzIGAtLWFsbG93LXJlYWRgIGFuZCBgLS1hbGxvdy13cml0ZWAgcGVybWlzc2lvbnMuXG4gKlxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9kb2NzLmRlbm8uY29tL3J1bnRpbWUvbWFudWFsL2Jhc2ljcy9wZXJtaXNzaW9ucyNmaWxlLXN5c3RlbS1hY2Nlc3N9XG4gKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBEZW5vJ3MgcGVybWlzc2lvbnMgc3lzdGVtLlxuICpcbiAqIEBwYXJhbSBkaXIgVGhlIHBhdGggb2YgdGhlIGRpcmVjdG9yeSB0byBlbXB0eSwgYXMgYSBzdHJpbmcgb3IgVVJMLlxuICpcbiAqIEByZXR1cm5zIEEgdm9pZCBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgb25jZSB0aGUgZGlyZWN0b3J5IGlzIGVtcHR5LlxuICpcbiAqIEBleGFtcGxlIFVzYWdlXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGVtcHR5RGlyIH0gZnJvbSBcIkBzdGQvZnMvZW1wdHktZGlyXCI7XG4gKlxuICogYXdhaXQgZW1wdHlEaXIoXCIuL2Zvb1wiKTtcbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW1wdHlEaXIoZGlyOiBzdHJpbmcgfCBVUkwpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBpdGVtcyA9IGF3YWl0IEFycmF5LmZyb21Bc3luYyhEZW5vLnJlYWREaXIoZGlyKSk7XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChpdGVtcy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgIGlmIChpdGVtICYmIGl0ZW0ubmFtZSkge1xuICAgICAgICBjb25zdCBmaWxlcGF0aCA9IGpvaW4odG9QYXRoU3RyaW5nKGRpciksIGl0ZW0ubmFtZSk7XG4gICAgICAgIHJldHVybiBEZW5vLnJlbW92ZShmaWxlcGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfSkpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkpIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICAvLyBpZiBub3QgZXhpc3QuIHRoZW4gY3JlYXRlIGl0XG4gICAgYXdhaXQgRGVuby5ta2RpcihkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICB9XG59XG5cbi8qKlxuICogU3luY2hyb25vdXNseSBlbnN1cmVzIHRoYXQgYSBkaXJlY3RvcnkgaXMgZW1wdHkgZGVsZXRlcyB0aGUgZGlyZWN0b3J5XG4gKiBjb250ZW50cyBpdCBpcyBub3QgZW1wdHkuXG4gKlxuICogSWYgdGhlIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdCwgaXQgaXMgY3JlYXRlZC4gVGhlIGRpcmVjdG9yeSBpdHNlbGYgaXMgbm90XG4gKiBkZWxldGVkLlxuICpcbiAqIFJlcXVpcmVzIGAtLWFsbG93LXJlYWRgIGFuZCBgLS1hbGxvdy13cml0ZWAgcGVybWlzc2lvbnMuXG4gKlxuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9kb2NzLmRlbm8uY29tL3J1bnRpbWUvbWFudWFsL2Jhc2ljcy9wZXJtaXNzaW9ucyNmaWxlLXN5c3RlbS1hY2Nlc3N9XG4gKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBEZW5vJ3MgcGVybWlzc2lvbnMgc3lzdGVtLlxuICpcbiAqIEBwYXJhbSBkaXIgVGhlIHBhdGggb2YgdGhlIGRpcmVjdG9yeSB0byBlbXB0eSwgYXMgYSBzdHJpbmcgb3IgVVJMLlxuICpcbiAqIEByZXR1cm5zIEEgdm9pZCB2YWx1ZSB0aGF0IHJldHVybnMgb25jZSB0aGUgZGlyZWN0b3J5IGlzIGVtcHR5LlxuICpcbiAqIEBleGFtcGxlIFVzYWdlXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGVtcHR5RGlyU3luYyB9IGZyb20gXCJAc3RkL2ZzL2VtcHR5LWRpclwiO1xuICpcbiAqIGVtcHR5RGlyU3luYyhcIi4vZm9vXCIpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbXB0eURpclN5bmMoZGlyOiBzdHJpbmcgfCBVUkwpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBpdGVtcyA9IFsuLi5EZW5vLnJlYWREaXJTeW5jKGRpcildO1xuXG4gICAgLy8gSWYgdGhlIGRpcmVjdG9yeSBleGlzdHMsIHJlbW92ZSBhbGwgZW50cmllcyBpbnNpZGUgaXQuXG4gICAgd2hpbGUgKGl0ZW1zLmxlbmd0aCkge1xuICAgICAgY29uc3QgaXRlbSA9IGl0ZW1zLnNoaWZ0KCk7XG4gICAgICBpZiAoaXRlbSAmJiBpdGVtLm5hbWUpIHtcbiAgICAgICAgY29uc3QgZmlsZXBhdGggPSBqb2luKHRvUGF0aFN0cmluZyhkaXIpLCBpdGVtLm5hbWUpO1xuICAgICAgICBEZW5vLnJlbW92ZVN5bmMoZmlsZXBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKCEoZXJyIGluc3RhbmNlb2YgRGVuby5lcnJvcnMuTm90Rm91bmQpKSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICAgIC8vIGlmIG5vdCBleGlzdC4gdGhlbiBjcmVhdGUgaXRcbiAgICBEZW5vLm1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEscURBQXFEO0FBQ3JELFNBQVMsSUFBSSxRQUFRLDRCQUE0QjtBQUNqRCxTQUFTLFlBQVksUUFBUSx1QkFBdUI7QUFFcEQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQXFCQyxHQUNELE9BQU8sZUFBZSxTQUFTLEdBQWlCO0VBQzlDLElBQUk7SUFDRixNQUFNLFFBQVEsTUFBTSxNQUFNLFNBQVMsQ0FBQyxLQUFLLE9BQU8sQ0FBQztJQUVqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7TUFDM0IsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO1FBQ3JCLE1BQU0sV0FBVyxLQUFLLGFBQWEsTUFBTSxLQUFLLElBQUk7UUFDbEQsT0FBTyxLQUFLLE1BQU0sQ0FBQyxVQUFVO1VBQUUsV0FBVztRQUFLO01BQ2pEO0lBQ0Y7RUFDRixFQUFFLE9BQU8sS0FBSztJQUNaLElBQUksQ0FBQyxDQUFDLGVBQWUsS0FBSyxNQUFNLENBQUMsUUFBUSxHQUFHO01BQzFDLE1BQU07SUFDUjtJQUVBLCtCQUErQjtJQUMvQixNQUFNLEtBQUssS0FBSyxDQUFDLEtBQUs7TUFBRSxXQUFXO0lBQUs7RUFDMUM7QUFDRjtBQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBc0JDLEdBQ0QsT0FBTyxTQUFTLGFBQWEsR0FBaUI7RUFDNUMsSUFBSTtJQUNGLE1BQU0sUUFBUTtTQUFJLEtBQUssV0FBVyxDQUFDO0tBQUs7SUFFeEMseURBQXlEO0lBQ3pELE1BQU8sTUFBTSxNQUFNLENBQUU7TUFDbkIsTUFBTSxPQUFPLE1BQU0sS0FBSztNQUN4QixJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7UUFDckIsTUFBTSxXQUFXLEtBQUssYUFBYSxNQUFNLEtBQUssSUFBSTtRQUNsRCxLQUFLLFVBQVUsQ0FBQyxVQUFVO1VBQUUsV0FBVztRQUFLO01BQzlDO0lBQ0Y7RUFDRixFQUFFLE9BQU8sS0FBSztJQUNaLElBQUksQ0FBQyxDQUFDLGVBQWUsS0FBSyxNQUFNLENBQUMsUUFBUSxHQUFHO01BQzFDLE1BQU07SUFDUjtJQUNBLCtCQUErQjtJQUMvQixLQUFLLFNBQVMsQ0FBQyxLQUFLO01BQUUsV0FBVztJQUFLO0VBQ3hDO0FBQ0YifQ==
// denoCacheMetadata=9993786745032202239,1327542291694633098
