/**
 * Path utilities for memory files.
 *
 * @module
 */

import { join } from "@std/path";

/**
 * Get the memories directory path.
 */
export function getMemoriesDir(dataPath: string): string {
  return join(dataPath, "memories");
}

/**
 * Get the path to a specific memory file.
 *
 * @param dataPath - Base data directory path
 * @param memoryId - Memory ID (e.g., "alex-oauth-2025-02")
 * @returns Full path to memory TOML file
 */
export function getMemoryFilePath(dataPath: string, memoryId: string): string {
  return join(getMemoriesDir(dataPath), `${memoryId}.toml`);
}

/**
 * Extract memory ID from a file path.
 *
 * @param filePath - Path to memory file
 * @returns Memory ID without .toml extension
 */
export function extractMemoryId(filePath: string): string {
  const fileName = filePath.split("/").pop() || "";
  return fileName.replace(/\.toml$/, "");
}
