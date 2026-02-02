/**
 * CLI entry point for tyvi.
 * @module
 */

import { parseArgs } from "jsr:@std/cli@1/parse-args";
import { initCommand } from "./commands/init.ts";
import { statusCommand } from "./commands/status.ts";
import { cloneCommand } from "./commands/clone.ts";
import { syncCommand } from "./commands/sync.ts";
import { listCommand } from "./commands/list.ts";
import { addCommand } from "./commands/add.ts";
import { removeCommand } from "./commands/remove.ts";

const VERSION = "0.1.0";

function showHelp(): void {
  console.log(`tyvi v${VERSION} - Config-driven workspace orchestration

Usage:
  tyvi <command> [options]

Commands:
  init                 Initialize a new workspace
  status [pattern]     Show status of repositories
  clone <pattern>      Clone repositories matching pattern
  sync                 Sync workspace structure with inventory
  list                 List repositories from inventory
  add <url>            Add a repository to inventory
  remove <name>        Remove a repository from inventory

Options:
  -h, --help          Show this help message
  -v, --version       Show version
  --quiet             Minimal output
  --json              JSON output (where supported)

Examples:
  tyvi init                          # Initialize workspace
  tyvi status                        # Show all repositories
  tyvi status --dirty                # Show only dirty repos
  tyvi clone --all                   # Clone all repositories
  tyvi clone viola                   # Clone repos matching "viola"
  tyvi sync --fetch                  # Sync and fetch all remotes
  tyvi list --missing                # List repositories not cloned
  tyvi add git@github.com:org/repo   # Add repo to inventory
  tyvi remove my-repo --delete       # Remove and delete local files

For more information, visit: https://github.com/hiisi-digital/tyvi`);
}

function showVersion(): void {
  console.log(`tyvi v${VERSION}`);
}

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    boolean: [
      "help",
      "version",
      "quiet",
      "json",
      "all",
      "dirty",
      "behind",
      "missing",
      "cloned",
      "fetch",
      "prune",
      "dry-run",
      "delete",
      "force",
      "clone",
      "minimal",
    ],
    string: ["namespace", "category", "status", "name", "local-path"],
    alias: {
      h: "help",
      v: "version",
      q: "quiet",
      a: "all",
      n: "namespace",
      c: "category",
    },
    "--": true,
  });

  // Show version
  if (args.version) {
    showVersion();
    return;
  }

  // Show help
  if (args.help || args._.length === 0) {
    showHelp();
    return;
  }

  const command = args._[0] as string;
  const commandArgs = args._.slice(1) as string[];

  try {
    switch (command) {
      case "init":
        await initCommand({
          name: args.name,
          namespace: args.namespace,
          minimal: args.minimal,
        });
        break;

      case "status":
        await statusCommand({
          pattern: commandArgs[0],
          namespace: args.namespace,
          dirty: args.dirty,
          behind: args.behind,
          missing: args.missing,
          quiet: args.quiet,
          json: args.json,
        });
        break;

      case "clone":
        await cloneCommand(commandArgs[0], {
          all: args.all,
          namespace: args.namespace,
          category: args.category,
          status: args.status,
          quiet: args.quiet,
        });
        break;

      case "sync":
        await syncCommand({
          fetch: args.fetch,
          prune: args.prune,
          dryRun: args["dry-run"],
          quiet: args.quiet,
        });
        break;

      case "list":
        await listCommand({
          cloned: args.cloned,
          missing: args.missing,
          json: args.json,
          namespace: args.namespace,
        });
        break;

      case "add":
        if (commandArgs.length === 0) {
          console.error("Error: Repository URL is required.");
          console.error("Usage: tyvi add <url>");
          Deno.exit(1);
        }
        await addCommand(commandArgs[0], {
          namespace: args.namespace,
          name: args.name,
          category: args.category,
          localPath: args["local-path"],
          clone: args.clone,
        });
        break;

      case "remove":
        if (commandArgs.length === 0) {
          console.error("Error: Repository name is required.");
          console.error("Usage: tyvi remove <name>");
          Deno.exit(1);
        }
        await removeCommand(commandArgs[0], {
          delete: args.delete,
          force: args.force,
        });
        break;

      default:
        console.error(`Error: Unknown command '${command}'`);
        console.error("");
        console.error("Run 'tyvi --help' for usage information.");
        Deno.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  }
}

// Run CLI if this is the main module
if (import.meta.main) {
  main();
}

export { main };
