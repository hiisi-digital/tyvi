/**
 * Memory storage operations - read and write memory files.
 * 
 * @module
 */

import { parse, stringify } from "@std/toml";
import { ensureDir } from "@std/fs";
import type { Memory, MemoryFile } from "../types/mod.ts";
import { getMemoriesDir, getMemoryFilePath, extractMemoryId } from "./paths.ts";

/**
 * Read a memory from a TOML file.
 * 
 * @param dataPath - Base data directory path
 * @param memoryId - Memory ID
 * @returns Memory object
 * @throws Error if file doesn't exist or can't be parsed
 */
export async function readMemory(dataPath: string, memoryId: string): Promise<Memory> {
  const filePath = getMemoryFilePath(dataPath, memoryId);
  
  try {
    const content = await Deno.readTextFile(filePath);
    const parsed = parse(content) as MemoryFile;
    
    if (!parsed.memory) {
      throw new Error(`Missing [memory] section in ${filePath}`);
    }
    
    return parsed.memory;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`Memory not found: ${memoryId}`);
    }
    throw error;
  }
}

/**
 * Write a memory to a TOML file.
 * 
 * @param dataPath - Base data directory path
 * @param memory - Memory object to write
 */
export async function writeMemory(dataPath: string, memory: Memory): Promise<void> {
  const memoriesDir = getMemoriesDir(dataPath);
  await ensureDir(memoriesDir);
  
  const filePath = getMemoryFilePath(dataPath, memory.id);
  const memoryFile: MemoryFile = { memory };
  const content = stringify(memoryFile);
  
  await Deno.writeTextFile(filePath, content);
}

/**
 * List all memory IDs in the memories directory.
 * 
 * @param dataPath - Base data directory path
 * @returns Array of memory IDs
 */
export async function listMemoryIds(dataPath: string): Promise<string[]> {
  const memoriesDir = getMemoriesDir(dataPath);
  
  try {
    const ids: string[] = [];
    for await (const entry of Deno.readDir(memoriesDir)) {
      if (entry.isFile && entry.name.endsWith(".toml")) {
        ids.push(entry.name.replace(/\.toml$/, ""));
      }
    }
    return ids.sort();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return [];
    }
    throw error;
  }
}

/**
 * Check if a memory exists.
 * 
 * @param dataPath - Base data directory path
 * @param memoryId - Memory ID to check
 * @returns True if memory file exists
 */
export async function memoryExists(dataPath: string, memoryId: string): Promise<boolean> {
  const filePath = getMemoryFilePath(dataPath, memoryId);
  try {
    await Deno.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a memory file.
 * 
 * @param dataPath - Base data directory path
 * @param memoryId - Memory ID to delete
 */
export async function deleteMemory(dataPath: string, memoryId: string): Promise<void> {
  const filePath = getMemoryFilePath(dataPath, memoryId);
  await Deno.remove(filePath);
}
