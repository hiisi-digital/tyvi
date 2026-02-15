/**
 * Content hashing for cache invalidation.
 *
 * Uses SHA-256 via Web Crypto API (built-in, no dependencies).
 * Hashes are hex-encoded for human readability.
 *
 * @module
 */

import { join } from "@std/path";
import type { SourceHash } from "../types/config.ts";

/**
 * Convert an ArrayBuffer to a hex string.
 */
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash file contents with SHA-256.
 *
 * @param filePath - Absolute path to the file
 * @returns Hex-encoded SHA-256 hash
 */
export async function hashFile(filePath: string): Promise<string> {
  const content = await Deno.readFile(filePath);
  const hash = await crypto.subtle.digest("SHA-256", content);
  return toHex(hash);
}

/**
 * Hash all files in a directory (non-recursive) with SHA-256.
 *
 * Produces a deterministic hash by sorting entries alphabetically
 * and hashing `filename:fileHash` pairs.
 *
 * @param dirPath - Absolute path to the directory
 * @returns Hex-encoded SHA-256 hash of the directory
 */
export async function hashDirectory(dirPath: string): Promise<string> {
  const entries: Array<{ name: string; hash: string }> = [];

  for await (const entry of Deno.readDir(dirPath)) {
    if (!entry.isFile) continue;
    const filePath = join(dirPath, entry.name);
    const hash = await hashFile(filePath);
    entries.push({ name: entry.name, hash });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  const combined = entries.map((e) => `${e.name}:${e.hash}`).join("\n");
  const encoded = new TextEncoder().encode(combined);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(hash);
}

/**
 * Build a SourceHash for a file.
 *
 * @param filePath - Path relative to data root
 * @param dataPath - Absolute path to the data root
 * @param section - Optional section name for partial invalidation
 * @returns SourceHash with current content hash
 */
export async function buildSourceHash(
  filePath: string,
  dataPath: string,
  section?: string,
): Promise<SourceHash> {
  const absolutePath = join(dataPath, filePath);
  const hash = await hashFile(absolutePath);
  return {
    file: filePath,
    section,
    hash,
    computed_at: new Date().toISOString(),
  };
}

/**
 * Verify a SourceHash still matches the file on disk.
 *
 * @param sourceHash - Previously computed SourceHash
 * @param dataPath - Absolute path to the data root
 * @returns true if the file hash matches, false if changed or missing
 */
export async function verifySourceHash(
  sourceHash: SourceHash,
  dataPath: string,
): Promise<boolean> {
  try {
    const absolutePath = join(dataPath, sourceHash.file);
    const currentHash = await hashFile(absolutePath);
    return currentHash === sourceHash.hash;
  } catch {
    return false;
  }
}
