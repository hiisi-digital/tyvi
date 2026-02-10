/**
 * Devspace state file management.
 *
 * Reads and writes `.state/lab.toml` and `.state/ext.toml` for tracking
 * which repos are loaded to lab and which external repos exist.
 *
 * @module
 */

import { parse, stringify } from "@std/toml";
import { ensureDir, exists } from "@std/fs";
import { join } from "@std/path";
import type { Devspace, ExtState, LabState } from "../types/mod.ts";

/**
 * Get the resolved state directory path from devspace config.
 */
function getStatePath(devspace: Devspace): string {
  return join(
    devspace.rootPath,
    devspace.config.devspace.state_path ?? ".state",
  );
}

/**
 * Read lab state from `.state/lab.toml`.
 *
 * Returns empty state if the file does not exist.
 *
 * @param devspace - Devspace model
 * @returns Lab state with currently loaded repos
 */
export async function readLabState(devspace: Devspace): Promise<LabState> {
  const filePath = join(getStatePath(devspace), "lab.toml");

  if (!await exists(filePath)) {
    return { repos: [] };
  }

  const content = await Deno.readTextFile(filePath);
  if (!content.trim()) {
    return { repos: [] };
  }

  const parsed = parse(content) as Record<string, unknown>;
  const repos = parsed.repos;

  if (!Array.isArray(repos)) {
    return { repos: [] };
  }

  return { repos: repos as LabState["repos"] };
}

/**
 * Write lab state to `.state/lab.toml`.
 *
 * Creates the state directory if it does not exist.
 *
 * @param devspace - Devspace model
 * @param state - Lab state to write
 */
export async function writeLabState(
  devspace: Devspace,
  state: LabState,
): Promise<void> {
  const stateDir = getStatePath(devspace);
  await ensureDir(stateDir);

  const filePath = join(stateDir, "lab.toml");
  const content = stringify(state as unknown as Record<string, unknown>);
  await Deno.writeTextFile(filePath, content);
}

/**
 * Read external repos state from `.state/ext.toml`.
 *
 * Returns empty state if the file does not exist.
 *
 * @param devspace - Devspace model
 * @returns External repos state
 */
export async function readExtState(devspace: Devspace): Promise<ExtState> {
  const filePath = join(getStatePath(devspace), "ext.toml");

  if (!await exists(filePath)) {
    return { repos: [] };
  }

  const content = await Deno.readTextFile(filePath);
  if (!content.trim()) {
    return { repos: [] };
  }

  const parsed = parse(content) as Record<string, unknown>;
  const repos = parsed.repos;

  if (!Array.isArray(repos)) {
    return { repos: [] };
  }

  return { repos: repos as ExtState["repos"] };
}

/**
 * Write external repos state to `.state/ext.toml`.
 *
 * Creates the state directory if it does not exist.
 *
 * @param devspace - Devspace model
 * @param state - External repos state to write
 */
export async function writeExtState(
  devspace: Devspace,
  state: ExtState,
): Promise<void> {
  const stateDir = getStatePath(devspace);
  await ensureDir(stateDir);

  const filePath = join(stateDir, "ext.toml");
  const content = stringify(state as unknown as Record<string, unknown>);
  await Deno.writeTextFile(filePath, content);
}
