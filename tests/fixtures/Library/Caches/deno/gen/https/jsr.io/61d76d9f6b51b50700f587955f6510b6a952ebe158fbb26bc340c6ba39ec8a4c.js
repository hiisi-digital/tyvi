// Copyright 2018-2026 the Deno authors. MIT license.
/**
 * Helpers for working with the filesystem.
 *
 * ```ts ignore
 * import { ensureFile, copy, ensureDir, move } from "@std/fs";
 *
 * await ensureFile("example.txt");
 *
 * await copy("example.txt", "example_copy.txt");
 *
 * await ensureDir("subdir");
 *
 * await move("example_copy.txt", "subdir/example_copy.txt");
 * ```
 *
 * @module
 */
export * from "./empty_dir.ts";
export * from "./ensure_dir.ts";
export * from "./ensure_file.ts";
export * from "./ensure_link.ts";
export * from "./ensure_symlink.ts";
export * from "./exists.ts";
export * from "./expand_glob.ts";
export * from "./move.ts";
export * from "./copy.ts";
export * from "./walk.ts";
export * from "./eol.ts";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvZnMvMS4wLjIyL21vZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI2IHRoZSBEZW5vIGF1dGhvcnMuIE1JVCBsaWNlbnNlLlxuXG4vKipcbiAqIEhlbHBlcnMgZm9yIHdvcmtpbmcgd2l0aCB0aGUgZmlsZXN5c3RlbS5cbiAqXG4gKiBgYGB0cyBpZ25vcmVcbiAqIGltcG9ydCB7IGVuc3VyZUZpbGUsIGNvcHksIGVuc3VyZURpciwgbW92ZSB9IGZyb20gXCJAc3RkL2ZzXCI7XG4gKlxuICogYXdhaXQgZW5zdXJlRmlsZShcImV4YW1wbGUudHh0XCIpO1xuICpcbiAqIGF3YWl0IGNvcHkoXCJleGFtcGxlLnR4dFwiLCBcImV4YW1wbGVfY29weS50eHRcIik7XG4gKlxuICogYXdhaXQgZW5zdXJlRGlyKFwic3ViZGlyXCIpO1xuICpcbiAqIGF3YWl0IG1vdmUoXCJleGFtcGxlX2NvcHkudHh0XCIsIFwic3ViZGlyL2V4YW1wbGVfY29weS50eHRcIik7XG4gKiBgYGBcbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuZXhwb3J0ICogZnJvbSBcIi4vZW1wdHlfZGlyLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9lbnN1cmVfZGlyLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9lbnN1cmVfZmlsZS50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vZW5zdXJlX2xpbmsudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2Vuc3VyZV9zeW1saW5rLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9leGlzdHMudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2V4cGFuZF9nbG9iLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9tb3ZlLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9jb3B5LnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi93YWxrLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9lb2wudHNcIjtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxREFBcUQ7QUFFckQ7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FnQkMsR0FFRCxjQUFjLGlCQUFpQjtBQUMvQixjQUFjLGtCQUFrQjtBQUNoQyxjQUFjLG1CQUFtQjtBQUNqQyxjQUFjLG1CQUFtQjtBQUNqQyxjQUFjLHNCQUFzQjtBQUNwQyxjQUFjLGNBQWM7QUFDNUIsY0FBYyxtQkFBbUI7QUFDakMsY0FBYyxZQUFZO0FBQzFCLGNBQWMsWUFBWTtBQUMxQixjQUFjLFlBQVk7QUFDMUIsY0FBYyxXQUFXIn0=
// denoCacheMetadata=7879336094412665459,17160874791338652307
