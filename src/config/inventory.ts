/**
 * Inventory configuration parsing.
 * @module
 */

import { parse } from "@std/toml";
import type { InventoryConfig, RemoteDefinition, RepoDefinition } from "../types/mod.ts";

/**
 * Parse inventory.toml content into InventoryConfig.
 *
 * @param content - TOML file content
 * @returns Parsed inventory configuration
 * @throws Error if config is malformed or missing required fields
 *
 * @example
 * ```ts
 * const content = await Deno.readTextFile("@hiisi/inventory.toml");
 * const config = parseInventoryConfig(content);
 * console.log(config.repos.length);
 * ```
 */
export function parseInventoryConfig(content: string): InventoryConfig {
  const parsed = parse(content) as Record<string, unknown>;

  const meta = parsed.meta as Record<string, unknown> | undefined;
  const repos = parsed.repos as unknown[];

  if (!Array.isArray(repos)) {
    throw new Error(
      "Invalid inventory.toml: missing or invalid [[repos]] entries.\n" +
        "Expected format:\n" +
        "[[repos]]\n" +
        'name = "my-repo"\n' +
        'remotes = [{ name = "origin", url = "git@github.com:org/repo.git" }]',
    );
  }

  const parsedRepos: RepoDefinition[] = [];

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    if (!repo || typeof repo !== "object") {
      throw new Error(`Invalid inventory.toml: repos[${i}] is not an object.`);
    }

    const repoObj = repo as Record<string, unknown>;

    if (!repoObj.name || typeof repoObj.name !== "string") {
      throw new Error(
        `Invalid inventory.toml: repos[${i}] missing required 'name' field.\n` +
          'Add: name = "repo-name"',
      );
    }

    if (!Array.isArray(repoObj.remotes) || repoObj.remotes.length === 0) {
      throw new Error(
        `Invalid inventory.toml: repos[${i}] ('${repoObj.name}') missing or empty 'remotes' array.\n` +
          'Add: remotes = [{ name = "origin", url = "git@github.com:org/repo.git" }]',
      );
    }

    const remotes: RemoteDefinition[] = [];
    for (let j = 0; j < repoObj.remotes.length; j++) {
      const remote = repoObj.remotes[j];
      if (!remote || typeof remote !== "object") {
        throw new Error(
          `Invalid inventory.toml: repos[${i}].remotes[${j}] is not an object.`,
        );
      }

      const remoteObj = remote as Record<string, unknown>;
      if (!remoteObj.name || typeof remoteObj.name !== "string") {
        throw new Error(
          `Invalid inventory.toml: repos[${i}].remotes[${j}] missing 'name' field.`,
        );
      }

      if (!remoteObj.url || typeof remoteObj.url !== "string") {
        throw new Error(
          `Invalid inventory.toml: repos[${i}].remotes[${j}] missing 'url' field.`,
        );
      }

      remotes.push({
        name: remoteObj.name,
        url: remoteObj.url,
        host: typeof remoteObj.host === "string" ? remoteObj.host : undefined,
      });
    }

    // Apply defaults from meta if available
    const metaDefaults = meta?.defaults as Record<string, unknown> | undefined;

    parsedRepos.push({
      name: repoObj.name,
      description: typeof repoObj.description === "string" ? repoObj.description : undefined,
      remotes,
      local_path: repoObj.local_path === false
        ? false
        : (typeof repoObj.local_path === "string" ? repoObj.local_path : undefined),
      category: typeof repoObj.category === "string" ? repoObj.category : undefined,
      status: typeof repoObj.status === "string"
        ? repoObj.status as RepoDefinition["status"]
        : (typeof metaDefaults?.status === "string" ? metaDefaults.status as RepoDefinition["status"] : "active"),
      language: typeof repoObj.language === "string"
        ? repoObj.language
        : (typeof metaDefaults?.language === "string" ? metaDefaults.language : undefined),
      publish_targets: Array.isArray(repoObj.publish_targets)
        ? repoObj.publish_targets as string[]
        : undefined,
      dependencies: Array.isArray(repoObj.dependencies)
        ? repoObj.dependencies as string[]
        : undefined,
      keep_in_sync: typeof repoObj.keep_in_sync === "boolean"
        ? repoObj.keep_in_sync
        : (typeof metaDefaults?.keep_in_sync === "boolean" ? metaDefaults.keep_in_sync : true),
      allow_agents: typeof repoObj.allow_agents === "boolean"
        ? repoObj.allow_agents
        : undefined,
      notes: typeof repoObj.notes === "string" ? repoObj.notes : undefined,
    });
  }

  return {
    meta: meta
      ? {
        description: typeof meta.description === "string" ? meta.description : undefined,
        last_updated: typeof meta.last_updated === "string" ? meta.last_updated : undefined,
        defaults: meta.defaults
          ? {
            language: typeof (meta.defaults as Record<string, unknown>).language === "string"
              ? (meta.defaults as Record<string, unknown>).language as string
              : undefined,
            runtime: typeof (meta.defaults as Record<string, unknown>).runtime === "string"
              ? (meta.defaults as Record<string, unknown>).runtime as string
              : undefined,
            keep_in_sync: typeof (meta.defaults as Record<string, unknown>).keep_in_sync ===
                "boolean"
              ? (meta.defaults as Record<string, unknown>).keep_in_sync as boolean
              : undefined,
            status: typeof (meta.defaults as Record<string, unknown>).status === "string"
              ? (meta.defaults as Record<string, unknown>).status as RepoDefinition["status"]
              : undefined,
          }
          : undefined,
      }
      : undefined,
    repos: parsedRepos,
  };
}

/**
 * Load and parse inventory.toml from a file.
 *
 * @param path - Path to inventory.toml
 * @returns Parsed inventory configuration
 * @throws Error if file cannot be read or config is invalid
 */
export async function loadInventoryConfig(path: string): Promise<InventoryConfig> {
  try {
    const content = await Deno.readTextFile(path);
    return parseInventoryConfig(content);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        `inventory.toml not found at: ${path}\n` +
          "Create it with 'tyvi init' or add it manually.",
      );
    }
    throw error;
  }
}
