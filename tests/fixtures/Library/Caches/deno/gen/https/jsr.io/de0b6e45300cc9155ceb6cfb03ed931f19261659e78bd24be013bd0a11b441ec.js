// Copyright 2018-2026 the Deno authors. MIT license.
import { dirname } from "jsr:@std/path@^1.1.4/dirname";
import { ensureDir, ensureDirSync } from "./ensure_dir.ts";
import { toPathString } from "./_to_path_string.ts";
/**
 * Asynchronously ensures that the hard link exists.
 *
 * If the parent directories for the hard link do not exist, they are created.
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param src The source file path as a string or URL. Directory hard links are
 * not allowed.
 * @param dest The destination link path as a string or URL.
 *
 * @returns A void promise that resolves once the hard link exists.
 *
 * @example Usage
 * ```ts ignore
 * import { ensureLink } from "@std/fs/ensure-link";
 *
 * await ensureLink("./folder/targetFile.dat", "./folder/targetFile.link.dat");
 * ```
 */ export async function ensureLink(src, dest) {
  dest = toPathString(dest);
  await ensureDir(dirname(dest));
  await Deno.link(toPathString(src), dest);
}
/**
 * Synchronously ensures that the hard link exists.
 *
 * If the parent directories for the hard link do not exist, they are created.
 *
 * Requires `--allow-read` and `--allow-write` permissions.
 *
 * @see {@link https://docs.deno.com/runtime/manual/basics/permissions#file-system-access}
 * for more information on Deno's permissions system.
 *
 * @param src The source file path as a string or URL. Directory hard links are
 * not allowed.
 * @param dest The destination link path as a string or URL.
 *
 * @returns A void value that returns once the hard link exists.
 *
 * @example Usage
 * ```ts ignore
 * import { ensureLinkSync } from "@std/fs/ensure-link";
 *
 * ensureLinkSync("./folder/targetFile.dat", "./folder/targetFile.link.dat");
 * ```
 */ export function ensureLinkSync(src, dest) {
  dest = toPathString(dest);
  ensureDirSync(dirname(dest));
  Deno.linkSync(toPathString(src), dest);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL2Vuc3VyZV9saW5rLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjYgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSBcImpzcjpAc3RkL3BhdGhAXjEuMS40L2Rpcm5hbWVcIjtcbmltcG9ydCB7IGVuc3VyZURpciwgZW5zdXJlRGlyU3luYyB9IGZyb20gXCIuL2Vuc3VyZV9kaXIudHNcIjtcbmltcG9ydCB7IHRvUGF0aFN0cmluZyB9IGZyb20gXCIuL190b19wYXRoX3N0cmluZy50c1wiO1xuXG4vKipcbiAqIEFzeW5jaHJvbm91c2x5IGVuc3VyZXMgdGhhdCB0aGUgaGFyZCBsaW5rIGV4aXN0cy5cbiAqXG4gKiBJZiB0aGUgcGFyZW50IGRpcmVjdG9yaWVzIGZvciB0aGUgaGFyZCBsaW5rIGRvIG5vdCBleGlzdCwgdGhleSBhcmUgY3JlYXRlZC5cbiAqXG4gKiBSZXF1aXJlcyBgLS1hbGxvdy1yZWFkYCBhbmQgYC0tYWxsb3ctd3JpdGVgIHBlcm1pc3Npb25zLlxuICpcbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZG9jcy5kZW5vLmNvbS9ydW50aW1lL21hbnVhbC9iYXNpY3MvcGVybWlzc2lvbnMjZmlsZS1zeXN0ZW0tYWNjZXNzfVxuICogZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gRGVubydzIHBlcm1pc3Npb25zIHN5c3RlbS5cbiAqXG4gKiBAcGFyYW0gc3JjIFRoZSBzb3VyY2UgZmlsZSBwYXRoIGFzIGEgc3RyaW5nIG9yIFVSTC4gRGlyZWN0b3J5IGhhcmQgbGlua3MgYXJlXG4gKiBub3QgYWxsb3dlZC5cbiAqIEBwYXJhbSBkZXN0IFRoZSBkZXN0aW5hdGlvbiBsaW5rIHBhdGggYXMgYSBzdHJpbmcgb3IgVVJMLlxuICpcbiAqIEByZXR1cm5zIEEgdm9pZCBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgb25jZSB0aGUgaGFyZCBsaW5rIGV4aXN0cy5cbiAqXG4gKiBAZXhhbXBsZSBVc2FnZVxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyBlbnN1cmVMaW5rIH0gZnJvbSBcIkBzdGQvZnMvZW5zdXJlLWxpbmtcIjtcbiAqXG4gKiBhd2FpdCBlbnN1cmVMaW5rKFwiLi9mb2xkZXIvdGFyZ2V0RmlsZS5kYXRcIiwgXCIuL2ZvbGRlci90YXJnZXRGaWxlLmxpbmsuZGF0XCIpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVMaW5rKHNyYzogc3RyaW5nIHwgVVJMLCBkZXN0OiBzdHJpbmcgfCBVUkwpIHtcbiAgZGVzdCA9IHRvUGF0aFN0cmluZyhkZXN0KTtcbiAgYXdhaXQgZW5zdXJlRGlyKGRpcm5hbWUoZGVzdCkpO1xuXG4gIGF3YWl0IERlbm8ubGluayh0b1BhdGhTdHJpbmcoc3JjKSwgZGVzdCk7XG59XG5cbi8qKlxuICogU3luY2hyb25vdXNseSBlbnN1cmVzIHRoYXQgdGhlIGhhcmQgbGluayBleGlzdHMuXG4gKlxuICogSWYgdGhlIHBhcmVudCBkaXJlY3RvcmllcyBmb3IgdGhlIGhhcmQgbGluayBkbyBub3QgZXhpc3QsIHRoZXkgYXJlIGNyZWF0ZWQuXG4gKlxuICogUmVxdWlyZXMgYC0tYWxsb3ctcmVhZGAgYW5kIGAtLWFsbG93LXdyaXRlYCBwZXJtaXNzaW9ucy5cbiAqXG4gKiBAc2VlIHtAbGluayBodHRwczovL2RvY3MuZGVuby5jb20vcnVudGltZS9tYW51YWwvYmFzaWNzL3Blcm1pc3Npb25zI2ZpbGUtc3lzdGVtLWFjY2Vzc31cbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIERlbm8ncyBwZXJtaXNzaW9ucyBzeXN0ZW0uXG4gKlxuICogQHBhcmFtIHNyYyBUaGUgc291cmNlIGZpbGUgcGF0aCBhcyBhIHN0cmluZyBvciBVUkwuIERpcmVjdG9yeSBoYXJkIGxpbmtzIGFyZVxuICogbm90IGFsbG93ZWQuXG4gKiBAcGFyYW0gZGVzdCBUaGUgZGVzdGluYXRpb24gbGluayBwYXRoIGFzIGEgc3RyaW5nIG9yIFVSTC5cbiAqXG4gKiBAcmV0dXJucyBBIHZvaWQgdmFsdWUgdGhhdCByZXR1cm5zIG9uY2UgdGhlIGhhcmQgbGluayBleGlzdHMuXG4gKlxuICogQGV4YW1wbGUgVXNhZ2VcbiAqIGBgYHRzIGlnbm9yZVxuICogaW1wb3J0IHsgZW5zdXJlTGlua1N5bmMgfSBmcm9tIFwiQHN0ZC9mcy9lbnN1cmUtbGlua1wiO1xuICpcbiAqIGVuc3VyZUxpbmtTeW5jKFwiLi9mb2xkZXIvdGFyZ2V0RmlsZS5kYXRcIiwgXCIuL2ZvbGRlci90YXJnZXRGaWxlLmxpbmsuZGF0XCIpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVMaW5rU3luYyhzcmM6IHN0cmluZyB8IFVSTCwgZGVzdDogc3RyaW5nIHwgVVJMKSB7XG4gIGRlc3QgPSB0b1BhdGhTdHJpbmcoZGVzdCk7XG4gIGVuc3VyZURpclN5bmMoZGlybmFtZShkZXN0KSk7XG5cbiAgRGVuby5saW5rU3luYyh0b1BhdGhTdHJpbmcoc3JjKSwgZGVzdCk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEscURBQXFEO0FBQ3JELFNBQVMsT0FBTyxRQUFRLCtCQUErQjtBQUN2RCxTQUFTLFNBQVMsRUFBRSxhQUFhLFFBQVEsa0JBQWtCO0FBQzNELFNBQVMsWUFBWSxRQUFRLHVCQUF1QjtBQUVwRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQXNCQyxHQUNELE9BQU8sZUFBZSxXQUFXLEdBQWlCLEVBQUUsSUFBa0I7RUFDcEUsT0FBTyxhQUFhO0VBQ3BCLE1BQU0sVUFBVSxRQUFRO0VBRXhCLE1BQU0sS0FBSyxJQUFJLENBQUMsYUFBYSxNQUFNO0FBQ3JDO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FzQkMsR0FDRCxPQUFPLFNBQVMsZUFBZSxHQUFpQixFQUFFLElBQWtCO0VBQ2xFLE9BQU8sYUFBYTtFQUNwQixjQUFjLFFBQVE7RUFFdEIsS0FBSyxRQUFRLENBQUMsYUFBYSxNQUFNO0FBQ25DIn0=
// denoCacheMetadata=6407119864206479723,7401909353757372068
