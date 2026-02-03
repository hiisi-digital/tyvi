/**
 * Shell integration for git restrictions.
 *
 * Generates shell functions and .envrc files to enforce git restrictions
 * at the shell level.
 *
 * @module
 */

import { exists } from "@std/fs";
import { join } from "@std/path";
import type { Devspace } from "../types/devspace.ts";
import type { ShellIntegration } from "../types/git.ts";

/**
 * Detect the current shell and find its RC file.
 *
 * Checks $SHELL environment variable and looks for RC files in
 * standard locations.
 *
 * @returns Shell integration information
 *
 * @example
 * ```ts
 * const shell = await detectShell();
 * if (shell.rcFile) {
 *   console.log(`Detected ${shell.shell} with RC file: ${shell.rcFile}`);
 * }
 * ```
 */
export async function detectShell(): Promise<ShellIntegration> {
  const shellEnv = Deno.env.get("SHELL") || "";
  let shell: ShellIntegration["shell"] = "unknown";
  let rcFile: string | null = null;

  // Detect shell type from $SHELL
  if (shellEnv.includes("zsh")) {
    shell = "zsh";
    // Try ZSH RC file locations in order
    const zshPaths = [
      join(Deno.env.get("HOME") || "", ".zshrc"),
      join(Deno.env.get("HOME") || "", ".zsh", "config"),
      join(Deno.env.get("HOME") || "", ".config", "zsh", ".zshrc"),
    ];
    for (const path of zshPaths) {
      if (await exists(path)) {
        rcFile = path;
        break;
      }
    }
  } else if (shellEnv.includes("bash")) {
    shell = "bash";
    // Try Bash RC file locations in order
    const bashPaths = [
      join(Deno.env.get("HOME") || "", ".bashrc"),
      join(Deno.env.get("HOME") || "", ".bash_profile"),
    ];
    for (const path of bashPaths) {
      if (await exists(path)) {
        rcFile = path;
        break;
      }
    }
  } else if (shellEnv.includes("fish")) {
    shell = "fish";
    const fishPath = join(
      Deno.env.get("HOME") || "",
      ".config",
      "fish",
      "config.fish",
    );
    if (await exists(fishPath)) {
      rcFile = fishPath;
    }
  }

  // Check for existing git alias/function
  let hasExistingAlias = false;
  let existingAlias: string | undefined;

  if (rcFile) {
    try {
      const content = await Deno.readTextFile(rcFile);
      // Look for git function or alias
      if (
        content.includes("function git") || content.includes("git()") ||
        content.includes("alias git=")
      ) {
        hasExistingAlias = true;
        // Try to extract the existing alias
        const aliasMatch = content.match(/alias git=['"](.+)['"]/);
        if (aliasMatch) {
          existingAlias = aliasMatch[1];
        }
      }
    } catch {
      // If we can't read the file, assume no alias
    }
  }

  return {
    shell,
    rcFile,
    hasExistingAlias,
    existingAlias,
  };
}

/**
 * Generate the shell init script content.
 *
 * Creates a shell function that wraps git commands to enforce restrictions.
 * The function checks if the current directory is in a devspace and
 * enforces rules accordingly.
 *
 * @param devspace - The devspace configuration
 * @param shell - Target shell type
 * @returns Shell script content
 *
 * @example
 * ```ts
 * const script = generateShellInit(devspace, "bash");
 * await Deno.writeTextFile("~/.tyvi-git.sh", script);
 * ```
 */
export function generateShellInit(
  devspace: Devspace,
  shell: "bash" | "zsh" | "fish",
): string {
  const rootPath = devspace.rootPath;
  const labPath = devspace.config.devspace.lab_path || ".lab";
  const stagingPath = devspace.config.devspace.staging_path || ".staging";

  if (shell === "fish") {
    return `# tyvi git guard for fish
# This function wraps git to prevent commits in the wrong places

function git
    # Preserve original git for non-tyvi directories
    set -l pwd_path (pwd)
    
    # Fast path: if not in devspace, use regular git
    if not string match -q "${rootPath}*" "$pwd_path"
        command git $argv
        return
    end
    
    # Check if in lab (allowed)
    if string match -q "${rootPath}/${labPath}/*" "$pwd_path"
        command git $argv
        return
    end
    
    # Check if at root (allowed)
    if test "$pwd_path" = "${rootPath}"
        command git $argv
        return
    end
    
    # Check if staging (blocked for destructive operations)
    if string match -q "${rootPath}/${stagingPath}/*" "$pwd_path"
        if contains -- $argv[1] commit push pull rebase merge
            echo "⚠️  Git blocked in staging directory"
            echo "Repos in staging are 'cold' - not for active work"
            echo ""
            echo "To work on this repo, load it to lab:"
            echo "  tyvi load <repo-name>"
            return 1
        end
    end
    
    # Default: allow read-only operations
    command git $argv
end
`;
  }

  // Bash/Zsh version
  return `# tyvi git guard for ${shell}
# This function wraps git to prevent commits in the wrong places

git() {
    local pwd_path="\$(pwd)"
    
    # Fast path: if not in devspace, use regular git
    if [[ ! "\$pwd_path" =~ ^${rootPath} ]]; then
        command git "\$@"
        return
    fi
    
    # Check if in lab (allowed)
    if [[ "\$pwd_path" =~ ^${rootPath}/${labPath}/ ]]; then
        command git "\$@"
        return
    fi
    
    # Check if at root (allowed)
    if [[ "\$pwd_path" == "${rootPath}" ]]; then
        command git "\$@"
        return
    fi
    
    # Check if in staging (block destructive operations)
    if [[ "\$pwd_path" =~ ^${rootPath}/${stagingPath}/ ]]; then
        case "\$1" in
            commit|push|pull|rebase|merge)
                echo "⚠️  Git blocked in staging directory" >&2
                echo "Repos in staging are 'cold' - not for active work" >&2
                echo "" >&2
                echo "To work on this repo, load it to lab:" >&2
                echo "  tyvi load <repo-name>" >&2
                return 1
                ;;
        esac
    fi
    
    # Default: allow read-only operations
    command git "\$@"
}
`;
}

/**
 * Check if direnv is available on the system.
 *
 * @returns True if direnv is installed
 *
 * @example
 * ```ts
 * if (await hasDirenv()) {
 *   console.log("direnv is available");
 * }
 * ```
 */
export async function hasDirenv(): Promise<boolean> {
  try {
    const process = new Deno.Command("which", {
      args: ["direnv"],
      stdout: "null",
      stderr: "null",
    });
    const { success } = await process.output();
    return success;
  } catch {
    return false;
  }
}

/**
 * Generate .envrc content for a location.
 *
 * Creates direnv configuration that sets environment variables
 * to identify where code is running.
 *
 * @param devspace - The devspace configuration
 * @param location - Where the .envrc will be placed
 * @returns .envrc file content
 *
 * @example
 * ```ts
 * const envrc = generateEnvrc(devspace, "lab");
 * await Deno.writeTextFile(".lab/.envrc", envrc);
 * ```
 */
export function generateEnvrc(
  devspace: Devspace,
  location: "root" | "lab" | "parent",
): string {
  const rootPath = devspace.rootPath;

  switch (location) {
    case "root":
      return `# tyvi devspace root environment
export TYVI_ROOT="${rootPath}"
export TYVI_DEVSPACE="${devspace.config.devspace.name}"
`;

    case "lab":
      return `# tyvi lab environment
export TYVI_IN_LAB=1
export TYVI_ALLOW_COMMIT=1

# Load parent devspace env
source_up

# Optional: customize your lab environment here
`;

    case "parent":
      return `# tyvi parent directory protection
export TYVI_ROOT="${rootPath}"

# Block git operations at parent level
export GIT_WORK_TREE=/dev/null
export GIT_DIR=/dev/null
`;

    default:
      return "";
  }
}
