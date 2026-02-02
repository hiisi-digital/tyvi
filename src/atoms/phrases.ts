/**
 * Load phrase definitions from TOML files.
 *
 * @module
 */

import { parse } from "@std/toml";
import { join } from "@std/path";
import type { Phrase } from "../types/mod.ts";

/**
 * TOML structure for phrase files.
 */
interface PhraseAtom {
  phrase: {
    id: string;
    description: {
      name: string;
      summary: string;
    };
    conditions?: {
      any_of?: string[];
      all_of?: string[];
    };
    examples: {
      variations: string[];
    };
    usage?: {
      note: string;
    };
  };
}

/**
 * Load all phrase definitions from a data directory.
 *
 * Reads TOML files from `{dataPath}/atoms/phrases/` directory.
 *
 * @param dataPath - Path to the data directory
 * @returns Map of phrase ID to Phrase definition
 *
 * @example
 * ```ts
 * const phrases = await loadPhrases("./data");
 * const phrase = phrases.get("phrase.edge-case-questioning");
 * console.log(phrase?.description.name);
 * ```
 */
export async function loadPhrases(dataPath: string): Promise<Map<string, Phrase>> {
  const phrases = new Map<string, Phrase>();
  const phrasesDir = join(dataPath, "atoms", "phrases");

  try {
    const dirInfo = await Deno.stat(phrasesDir);
    if (!dirInfo.isDirectory) {
      return phrases;
    }

    for await (const entry of Deno.readDir(phrasesDir)) {
      if (entry.isFile && entry.name.endsWith(".toml")) {
        const filePath = join(phrasesDir, entry.name);
        try {
          const content = await Deno.readTextFile(filePath);
          const parsed = parse(content) as unknown as PhraseAtom;

          if (!parsed.phrase) {
            console.warn(`Skipping ${entry.name}: missing [phrase] section`);
            continue;
          }

          phrases.set(parsed.phrase.id, parsed.phrase);
        } catch (error) {
          console.warn(`Failed to load phrase from ${entry.name}:`, error);
        }
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return phrases;
    }
    throw error;
  }

  return phrases;
}
