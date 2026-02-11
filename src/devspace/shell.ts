/**
 * Shell integration for git guards.
 *
 * Detects the user's shell environment, generates init scripts
 * that wrap git to enforce devspace restrictions, and manages
 * RC file integration.
 *
 * @module
 */

import { exists } from "@std/fs";
import { join, resolve } from "@std/path";
import type { Devspace, ShellIntegration } from "../types/mod.ts";

/**
 * Detect the user's shell environment.
 *
 * Checks $SHELL, finds RC files, and detects existing git aliases.
 *
 * @returns Shell integration details
 */
export async function detectShell(): Promise<ShellIntegration> {
  const shell = Deno.env.get("SHELL") ?? "";
  const home = Deno.env.get("HOME") ?? "";

  let shellType: "zsh" | "bash" | "fish" | "unknown";
  if (shell.includes("zsh")) shellType = "zsh";
  else if (shell.includes("bash")) shellType = "bash";
  else if (shell.includes("fish")) shellType = "fish";
  else shellType = "unknown";

  const candidates: Record<string, string[]> = {
    zsh: [
      join(home, ".zshrc"),
      join(home, ".zsh", "config"),
      join(home, ".config", "zsh", ".zshrc"),
    ],
    bash: [
      join(home, ".bashrc"),
      join(home, ".bash_profile"),
    ],
    fish: [
      join(home, ".config", "fish", "config.fish"),
    ],
    unknown: [],
  };

  let rcFile: string | null = null;
  for (const candidate of candidates[shellType] ?? []) {
    if (await exists(candidate)) {
      rcFile = candidate;
      break;
    }
  }

  return {
    shell: shellType,
    rcFile,
    hasExistingAlias: false,
  };
}

/**
 * Generate the shell init script that wraps git.
 *
 * The generated script:
 * 1. Preserves any existing git alias
 * 2. Fast-paths for non-tyvi directories
 * 3. Checks lab path (allowed)
 * 4. Checks project root (allowed)
 * 5. Checks whitelist (allowed)
 * 6. Blocks everything else with helpful message
 *
 * @param devspace - Devspace configuration
 * @param shell - Target shell type (defaults to bash/zsh)
 * @returns Shell script content
 */
export function generateShellInit(
  devspace: Devspace,
  shell: "bash" | "zsh" | "fish" = "bash",
): string {
  const rootPath = resolve(devspace.rootPath);
  const labPath = resolve(
    rootPath,
    devspace.config.devspace.lab_path ?? ".lab",
  );
  const whitelist = devspace.config.devspace.git_policy?.allowed_paths ?? [];
  const whitelistResolved = whitelist.map((p) => resolve(rootPath, p));

  if (shell === "fish") {
    return generateFishInit(rootPath, labPath, whitelistResolved);
  }

  return generateBashInit(rootPath, labPath, whitelistResolved);
}

/**
 * Generate bash/zsh init script.
 */
function generateBashInit(
  rootPath: string,
  labPath: string,
  whitelist: string[],
): string {
  // Whitelist paths become separate case patterns (before the generic block)
  const whitelistPatterns = whitelist.map((p) =>
    `    "${p}"/*|"${p}")
      command git "$@"
      return $?
      ;;`
  ).join("\n");

  return `# tyvi git guard — auto-generated
# Source this file in your shell RC to enforce devspace git restrictions.

# Preserve existing git alias
if alias git &>/dev/null 2>&1; then
  _tyvi_user_git_alias="$(alias git 2>/dev/null | sed "s/^alias git='//" | sed "s/'$//")"
  unalias git 2>/dev/null
fi

git() {
  local _tyvi_pwd
  _tyvi_pwd="$PWD"

  case "$_tyvi_pwd" in
    "${labPath}"/*|"${labPath}")
      command git "$@"
      return $?
      ;;
    "${rootPath}")
      command git "$@"
      return $?
      ;;
${whitelistPatterns}
    "${rootPath}"/*)
      # Inside tyvi project — blocked
      echo "Git operations blocked here." >&2
      echo "" >&2
      echo "Location: $_tyvi_pwd" >&2
      echo "Tyvi root: ${rootPath}" >&2
      echo "" >&2
      echo "Allowed locations:" >&2
      echo "  ${rootPath}    (project root)" >&2
      echo "  ${labPath}     (lab)" >&2
      echo "" >&2
      echo "Options:" >&2
      echo "  1. Load a repo to lab:  tyvi load <pattern>" >&2
      echo "  2. Work in lab:         cd ${labPath}/<repo>" >&2
      return 1
      ;;
    *)
      # Outside tyvi project — allow
      if [ -n "$_tyvi_user_git_alias" ]; then
        eval "$_tyvi_user_git_alias" '"$@"'
        return $?
      fi
      command git "$@"
      return $?
      ;;
  esac
}
`;
}

/**
 * Generate fish shell init script.
 */
function generateFishInit(
  rootPath: string,
  labPath: string,
  whitelist: string[],
): string {
  // Whitelist paths as separate case patterns before the generic block
  const whitelistPatterns = whitelist.map((p) =>
    `        case "${p}" "${p}/*"
            command git $argv
            return $status`
  ).join("\n");

  return `# tyvi git guard — auto-generated
# Source this file in your fish config to enforce devspace git restrictions.

function git
    set -l _tyvi_pwd (pwd)

    switch $_tyvi_pwd
        case "${labPath}" "${labPath}/*"
            command git $argv
            return $status
        case "${rootPath}"
            command git $argv
            return $status
${whitelistPatterns}
        case "${rootPath}/*"
            # Inside tyvi project — blocked
            echo "Git operations blocked here." >&2
            echo "" >&2
            echo "Location: $_tyvi_pwd" >&2
            echo "Tyvi root: ${rootPath}" >&2
            echo "" >&2
            echo "Allowed locations:" >&2
            echo "  ${rootPath}    (project root)" >&2
            echo "  ${labPath}     (lab)" >&2
            echo "" >&2
            echo "Options:" >&2
            echo "  1. Load a repo to lab:  tyvi load <pattern>" >&2
            echo "  2. Work in lab:         cd ${labPath}/<repo>" >&2
            return 1
        case "*"
            command git $argv
            return $status
    end
end
`;
}

/**
 * Write the shell init script to the devspace.
 *
 * Creates `shell/init.sh` (or `init.fish`) in the devspace root.
 *
 * @param devspace - Devspace configuration
 * @returns Path to the written init script
 */
export async function writeShellInit(devspace: Devspace): Promise<string> {
  const shellInfo = await detectShell();
  const shell = shellInfo.shell === "fish" ? "fish" : "bash";
  const ext = shell === "fish" ? "fish" : "sh";
  const scriptDir = join(devspace.rootPath, "shell");
  const scriptPath = join(scriptDir, `init.${ext}`);

  await Deno.mkdir(scriptDir, { recursive: true });

  const content = generateShellInit(devspace, shell);
  await Deno.writeTextFile(scriptPath, content);

  return scriptPath;
}

/**
 * Append a source line to the user's shell RC file.
 *
 * Checks if the line already exists before appending.
 *
 * @param rcFile - Path to the RC file
 * @param initPath - Path to the init script to source
 */
export async function appendToRcFile(
  rcFile: string,
  initPath: string,
): Promise<void> {
  const sourceLine = `\n# tyvi git guard\nsource "${initPath}"\n`;

  if (await exists(rcFile)) {
    const content = await Deno.readTextFile(rcFile);
    if (content.includes(initPath)) {
      return; // Already sourced
    }
    await Deno.writeTextFile(rcFile, content + sourceLine);
  } else {
    await Deno.writeTextFile(rcFile, sourceLine);
  }
}
