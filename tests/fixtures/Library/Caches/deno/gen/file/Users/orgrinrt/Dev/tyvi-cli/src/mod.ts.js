/**
 * CLI entry point and command router
 *
 * This module handles argument parsing, command routing,
 * and coordinates all CLI functionality.
 *
 * @module
 */
import { applyNoColor, bold, outputError, red, STATUS } from "./output.ts";
import { personCommand } from "./commands/person.ts";
import { memoryCommand } from "./commands/memory.ts";
import { contextCommand } from "./commands/context.ts";
/**
 * Exit codes for different scenarios
 */ export const EXIT = {
  SUCCESS: 0,
  ERROR: 1,
  INVALID_ARGS: 2,
  CONFIG_ERROR: 3,
  GIT_ERROR: 4,
  PERMISSION_DENIED: 5,
};
/**
 * Simple argument parser (minimal implementation)
 */ function parseArgs(args) {
  const result = {
    _: [],
  };
  const booleanFlags = new Set([
    "help",
    "version",
    "quiet",
    "verbose",
    "json",
    "no-color",
  ]);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (key.includes("=")) {
        const [k, v] = key.split("=", 2);
        if (k && v) {
          result[k] = v;
        }
      } else if (booleanFlags.has(key)) {
        // Known boolean flag
        result[key] = true;
      } else {
        // Check if next arg is a value or another flag
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith("-")) {
          result[key] = args[++i];
        } else {
          result[key] = true;
        }
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      // Short flags
      const flags = arg.slice(1);
      for (const flag of flags) {
        // Map common short flags
        if (flag === "h") result["help"] = true;
        else if (flag === "V") result["version"] = true;
        else if (flag === "q") result["quiet"] = true;
        else if (flag === "v") result["verbose"] = true;
        else result[flag] = true;
      }
    } else {
      result._.push(arg);
    }
  }
  return result;
}
/**
 * Show help text
 */ function helpCommand(_args, _flags) {
  const helpText = `${bold("tyvi")} - Devspace orchestration CLI

${bold("Usage:")} tyvi <command> [options]

${bold("Commands:")}
  status          Show devspace status
  load <pattern>  Load repos to lab
  unload <pattern> Unload repos from lab
  clone <pattern> Clone repos to staging
  list            List repos from inventory
  
  person list     List all people
  person show     Show person details
  
  memory recall   Recall memories
  memory record   Record new memory
  
  context search  Search context
  context get     Get context by URI

${bold("Options:")}
  -h, --help      Show help
  -V, --version   Show version
  -q, --quiet     Minimal output
  -v, --verbose   Verbose output
  --json          JSON output
  --no-color      Disable colors`;
  console.log(helpText);
  return Promise.resolve(EXIT.SUCCESS);
}
/**
 * Show version
 */ function versionCommand(_args, _flags) {
  console.log("tyvi-cli 0.1.0");
  return Promise.resolve(EXIT.SUCCESS);
}
/**
 * Stub command for status (Phase 2)
 */ function statusCommand(_args, _flags) {
  console.log(red(`${STATUS.error} Command not yet implemented`));
  console.log("The 'status' command will be implemented in Phase 2");
  return Promise.resolve(EXIT.ERROR);
}
/**
 * Stub command for load (Phase 2)
 */ function loadCommand(_args, _flags) {
  console.log(red(`${STATUS.error} Command not yet implemented`));
  console.log("The 'load' command will be implemented in Phase 2");
  return Promise.resolve(EXIT.ERROR);
}
/**
 * Stub command for unload (Phase 2)
 */ function unloadCommand(_args, _flags) {
  console.log(red(`${STATUS.error} Command not yet implemented`));
  console.log("The 'unload' command will be implemented in Phase 2");
  return Promise.resolve(EXIT.ERROR);
}
/**
 * Stub command for clone (future phase)
 */ function cloneCommand(_args, _flags) {
  console.log(red(`${STATUS.error} Command not yet implemented`));
  console.log("The 'clone' command will be implemented in a future phase");
  return Promise.resolve(EXIT.ERROR);
}
/**
 * Stub command for list (future phase)
 */ function listCommand(_args, _flags) {
  console.log(red(`${STATUS.error} Command not yet implemented`));
  console.log("The 'list' command will be implemented in a future phase");
  return Promise.resolve(EXIT.ERROR);
}
/**
 * Command registry
 */ const commands = {
  help: helpCommand,
  version: versionCommand,
  status: statusCommand,
  load: loadCommand,
  unload: unloadCommand,
  clone: cloneCommand,
  list: listCommand,
  person: personCommand,
  memory: memoryCommand,
  context: contextCommand,
};
/**
 * Parse command line arguments and route to appropriate command
 */ export async function main(args) {
  try {
    // Parse arguments
    const parsed = parseArgs(args);
    // Extract global flags
    const flags = {
      help: parsed.help === true,
      version: parsed.version === true,
      quiet: parsed.quiet === true,
      verbose: parsed.verbose === true,
      json: parsed.json === true,
      noColor: parsed["no-color"] === true,
    };
    // Apply noColor to Deno
    if (flags.noColor) {
      applyNoColor();
    }
    // Handle global flags
    if (flags.version) {
      return await versionCommand([], flags);
    }
    if (flags.help && parsed._.length === 0) {
      return await helpCommand([], flags);
    }
    // Get command and its args
    const commandName = parsed._[0]?.toString();
    const commandArgs = parsed._.slice(1).map(String);
    // No command provided
    if (!commandName) {
      return await helpCommand([], flags);
    }
    // Find and execute command
    const command = commands[commandName];
    if (!command) {
      console.error(red(`${STATUS.error} Unknown command: ${commandName}`));
      console.error(`Run 'tyvi --help' for usage information`);
      return EXIT.INVALID_ARGS;
    }
    // Show command help if requested
    if (flags.help) {
      // For now, just show general help
      return await helpCommand([], flags);
    }
    // Execute command
    return await command(commandArgs, flags);
  } catch (error) {
    outputError(error instanceof Error ? error : new Error(String(error)), {
      quiet: false,
      json: false,
    });
    return EXIT.ERROR;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvb3JncmlucnQvRGV2L3R5dmktY2xpL3NyYy9tb2QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDTEkgZW50cnkgcG9pbnQgYW5kIGNvbW1hbmQgcm91dGVyXG4gKlxuICogVGhpcyBtb2R1bGUgaGFuZGxlcyBhcmd1bWVudCBwYXJzaW5nLCBjb21tYW5kIHJvdXRpbmcsXG4gKiBhbmQgY29vcmRpbmF0ZXMgYWxsIENMSSBmdW5jdGlvbmFsaXR5LlxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyBhcHBseU5vQ29sb3IsIGJvbGQsIG91dHB1dEVycm9yLCByZWQsIFNUQVRVUyB9IGZyb20gXCIuL291dHB1dC50c1wiO1xuaW1wb3J0IHsgcGVyc29uQ29tbWFuZCB9IGZyb20gXCIuL2NvbW1hbmRzL3BlcnNvbi50c1wiO1xuaW1wb3J0IHsgbWVtb3J5Q29tbWFuZCB9IGZyb20gXCIuL2NvbW1hbmRzL21lbW9yeS50c1wiO1xuaW1wb3J0IHsgY29udGV4dENvbW1hbmQgfSBmcm9tIFwiLi9jb21tYW5kcy9jb250ZXh0LnRzXCI7XG5cbi8qKlxuICogRXhpdCBjb2RlcyBmb3IgZGlmZmVyZW50IHNjZW5hcmlvc1xuICovXG5leHBvcnQgY29uc3QgRVhJVCA9IHtcbiAgU1VDQ0VTUzogMCxcbiAgRVJST1I6IDEsXG4gIElOVkFMSURfQVJHUzogMixcbiAgQ09ORklHX0VSUk9SOiAzLFxuICBHSVRfRVJST1I6IDQsXG4gIFBFUk1JU1NJT05fREVOSUVEOiA1LFxufTtcblxuLyoqXG4gKiBHbG9iYWwgZmxhZ3MgYXZhaWxhYmxlIHRvIGFsbCBjb21tYW5kc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEdsb2JhbEZsYWdzIHtcbiAgaGVscDogYm9vbGVhbjsgLy8gLWgsIC0taGVscFxuICB2ZXJzaW9uOiBib29sZWFuOyAvLyAtViwgLS12ZXJzaW9uXG4gIHF1aWV0OiBib29sZWFuOyAvLyAtcSwgLS1xdWlldFxuICB2ZXJib3NlOiBib29sZWFuOyAvLyAtdiwgLS12ZXJib3NlXG4gIGpzb246IGJvb2xlYW47IC8vIC0tanNvblxuICBub0NvbG9yOiBib29sZWFuOyAvLyAtLW5vLWNvbG9yXG59XG5cbi8qKlxuICogU2ltcGxlIGFyZ3VtZW50IHBhcnNlciByZXN1bHRcbiAqL1xuaW50ZXJmYWNlIFBhcnNlZEFyZ3Mge1xuICBfOiBzdHJpbmdbXTtcbiAgW2tleTogc3RyaW5nXTogdW5rbm93bjtcbn1cblxuLyoqXG4gKiBTaW1wbGUgYXJndW1lbnQgcGFyc2VyIChtaW5pbWFsIGltcGxlbWVudGF0aW9uKVxuICovXG5mdW5jdGlvbiBwYXJzZUFyZ3MoYXJnczogc3RyaW5nW10pOiBQYXJzZWRBcmdzIHtcbiAgY29uc3QgcmVzdWx0OiBQYXJzZWRBcmdzID0geyBfOiBbXSB9O1xuICBjb25zdCBib29sZWFuRmxhZ3MgPSBuZXcgU2V0KFtcbiAgICBcImhlbHBcIixcbiAgICBcInZlcnNpb25cIixcbiAgICBcInF1aWV0XCIsXG4gICAgXCJ2ZXJib3NlXCIsXG4gICAgXCJqc29uXCIsXG4gICAgXCJuby1jb2xvclwiLFxuICBdKTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBhcmcgPSBhcmdzW2ldO1xuXG4gICAgaWYgKCFhcmcpIGNvbnRpbnVlO1xuXG4gICAgaWYgKGFyZy5zdGFydHNXaXRoKFwiLS1cIikpIHtcbiAgICAgIGNvbnN0IGtleSA9IGFyZy5zbGljZSgyKTtcbiAgICAgIGlmIChrZXkuaW5jbHVkZXMoXCI9XCIpKSB7XG4gICAgICAgIGNvbnN0IFtrLCB2XSA9IGtleS5zcGxpdChcIj1cIiwgMik7XG4gICAgICAgIGlmIChrICYmIHYpIHtcbiAgICAgICAgICByZXN1bHRba10gPSB2O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGJvb2xlYW5GbGFncy5oYXMoa2V5KSkge1xuICAgICAgICAvLyBLbm93biBib29sZWFuIGZsYWdcbiAgICAgICAgcmVzdWx0W2tleV0gPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgbmV4dCBhcmcgaXMgYSB2YWx1ZSBvciBhbm90aGVyIGZsYWdcbiAgICAgICAgY29uc3QgbmV4dEFyZyA9IGFyZ3NbaSArIDFdO1xuICAgICAgICBpZiAobmV4dEFyZyAmJiAhbmV4dEFyZy5zdGFydHNXaXRoKFwiLVwiKSkge1xuICAgICAgICAgIHJlc3VsdFtrZXldID0gYXJnc1srK2ldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdFtrZXldID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYXJnLnN0YXJ0c1dpdGgoXCItXCIpICYmIGFyZy5sZW5ndGggPiAxKSB7XG4gICAgICAvLyBTaG9ydCBmbGFnc1xuICAgICAgY29uc3QgZmxhZ3MgPSBhcmcuc2xpY2UoMSk7XG4gICAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgICAgLy8gTWFwIGNvbW1vbiBzaG9ydCBmbGFnc1xuICAgICAgICBpZiAoZmxhZyA9PT0gXCJoXCIpIHJlc3VsdFtcImhlbHBcIl0gPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChmbGFnID09PSBcIlZcIikgcmVzdWx0W1widmVyc2lvblwiXSA9IHRydWU7XG4gICAgICAgIGVsc2UgaWYgKGZsYWcgPT09IFwicVwiKSByZXN1bHRbXCJxdWlldFwiXSA9IHRydWU7XG4gICAgICAgIGVsc2UgaWYgKGZsYWcgPT09IFwidlwiKSByZXN1bHRbXCJ2ZXJib3NlXCJdID0gdHJ1ZTtcbiAgICAgICAgZWxzZSByZXN1bHRbZmxhZ10gPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQuXy5wdXNoKGFyZyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBDb21tYW5kIGhhbmRsZXIgZnVuY3Rpb24gdHlwZVxuICovXG50eXBlIENvbW1hbmRIYW5kbGVyID0gKGFyZ3M6IHN0cmluZ1tdLCBmbGFnczogR2xvYmFsRmxhZ3MpID0+IFByb21pc2U8bnVtYmVyPjtcblxuLyoqXG4gKiBTaG93IGhlbHAgdGV4dFxuICovXG5mdW5jdGlvbiBoZWxwQ29tbWFuZChcbiAgX2FyZ3M6IHN0cmluZ1tdLFxuICBfZmxhZ3M6IEdsb2JhbEZsYWdzLFxuKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgaGVscFRleHQgPSBgJHtib2xkKFwidHl2aVwiKX0gLSBEZXZzcGFjZSBvcmNoZXN0cmF0aW9uIENMSVxuXG4ke2JvbGQoXCJVc2FnZTpcIil9IHR5dmkgPGNvbW1hbmQ+IFtvcHRpb25zXVxuXG4ke2JvbGQoXCJDb21tYW5kczpcIil9XG4gIHN0YXR1cyAgICAgICAgICBTaG93IGRldnNwYWNlIHN0YXR1c1xuICBsb2FkIDxwYXR0ZXJuPiAgTG9hZCByZXBvcyB0byBsYWJcbiAgdW5sb2FkIDxwYXR0ZXJuPiBVbmxvYWQgcmVwb3MgZnJvbSBsYWJcbiAgY2xvbmUgPHBhdHRlcm4+IENsb25lIHJlcG9zIHRvIHN0YWdpbmdcbiAgbGlzdCAgICAgICAgICAgIExpc3QgcmVwb3MgZnJvbSBpbnZlbnRvcnlcbiAgXG4gIHBlcnNvbiBsaXN0ICAgICBMaXN0IGFsbCBwZW9wbGVcbiAgcGVyc29uIHNob3cgICAgIFNob3cgcGVyc29uIGRldGFpbHNcbiAgXG4gIG1lbW9yeSByZWNhbGwgICBSZWNhbGwgbWVtb3JpZXNcbiAgbWVtb3J5IHJlY29yZCAgIFJlY29yZCBuZXcgbWVtb3J5XG4gIFxuICBjb250ZXh0IHNlYXJjaCAgU2VhcmNoIGNvbnRleHRcbiAgY29udGV4dCBnZXQgICAgIEdldCBjb250ZXh0IGJ5IFVSSVxuXG4ke2JvbGQoXCJPcHRpb25zOlwiKX1cbiAgLWgsIC0taGVscCAgICAgIFNob3cgaGVscFxuICAtViwgLS12ZXJzaW9uICAgU2hvdyB2ZXJzaW9uXG4gIC1xLCAtLXF1aWV0ICAgICBNaW5pbWFsIG91dHB1dFxuICAtdiwgLS12ZXJib3NlICAgVmVyYm9zZSBvdXRwdXRcbiAgLS1qc29uICAgICAgICAgIEpTT04gb3V0cHV0XG4gIC0tbm8tY29sb3IgICAgICBEaXNhYmxlIGNvbG9yc2A7XG5cbiAgY29uc29sZS5sb2coaGVscFRleHQpO1xuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKEVYSVQuU1VDQ0VTUyk7XG59XG5cbi8qKlxuICogU2hvdyB2ZXJzaW9uXG4gKi9cbmZ1bmN0aW9uIHZlcnNpb25Db21tYW5kKFxuICBfYXJnczogc3RyaW5nW10sXG4gIF9mbGFnczogR2xvYmFsRmxhZ3MsXG4pOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zb2xlLmxvZyhcInR5dmktY2xpIDAuMS4wXCIpO1xuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKEVYSVQuU1VDQ0VTUyk7XG59XG5cbi8qKlxuICogU3R1YiBjb21tYW5kIGZvciBzdGF0dXMgKFBoYXNlIDIpXG4gKi9cbmZ1bmN0aW9uIHN0YXR1c0NvbW1hbmQoXG4gIF9hcmdzOiBzdHJpbmdbXSxcbiAgX2ZsYWdzOiBHbG9iYWxGbGFncyxcbik6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnNvbGUubG9nKHJlZChgJHtTVEFUVVMuZXJyb3J9IENvbW1hbmQgbm90IHlldCBpbXBsZW1lbnRlZGApKTtcbiAgY29uc29sZS5sb2coXCJUaGUgJ3N0YXR1cycgY29tbWFuZCB3aWxsIGJlIGltcGxlbWVudGVkIGluIFBoYXNlIDJcIik7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoRVhJVC5FUlJPUik7XG59XG5cbi8qKlxuICogU3R1YiBjb21tYW5kIGZvciBsb2FkIChQaGFzZSAyKVxuICovXG5mdW5jdGlvbiBsb2FkQ29tbWFuZChcbiAgX2FyZ3M6IHN0cmluZ1tdLFxuICBfZmxhZ3M6IEdsb2JhbEZsYWdzLFxuKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc29sZS5sb2cocmVkKGAke1NUQVRVUy5lcnJvcn0gQ29tbWFuZCBub3QgeWV0IGltcGxlbWVudGVkYCkpO1xuICBjb25zb2xlLmxvZyhcIlRoZSAnbG9hZCcgY29tbWFuZCB3aWxsIGJlIGltcGxlbWVudGVkIGluIFBoYXNlIDJcIik7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoRVhJVC5FUlJPUik7XG59XG5cbi8qKlxuICogU3R1YiBjb21tYW5kIGZvciB1bmxvYWQgKFBoYXNlIDIpXG4gKi9cbmZ1bmN0aW9uIHVubG9hZENvbW1hbmQoXG4gIF9hcmdzOiBzdHJpbmdbXSxcbiAgX2ZsYWdzOiBHbG9iYWxGbGFncyxcbik6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnNvbGUubG9nKHJlZChgJHtTVEFUVVMuZXJyb3J9IENvbW1hbmQgbm90IHlldCBpbXBsZW1lbnRlZGApKTtcbiAgY29uc29sZS5sb2coXCJUaGUgJ3VubG9hZCcgY29tbWFuZCB3aWxsIGJlIGltcGxlbWVudGVkIGluIFBoYXNlIDJcIik7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoRVhJVC5FUlJPUik7XG59XG5cbi8qKlxuICogU3R1YiBjb21tYW5kIGZvciBjbG9uZSAoZnV0dXJlIHBoYXNlKVxuICovXG5mdW5jdGlvbiBjbG9uZUNvbW1hbmQoXG4gIF9hcmdzOiBzdHJpbmdbXSxcbiAgX2ZsYWdzOiBHbG9iYWxGbGFncyxcbik6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnNvbGUubG9nKHJlZChgJHtTVEFUVVMuZXJyb3J9IENvbW1hbmQgbm90IHlldCBpbXBsZW1lbnRlZGApKTtcbiAgY29uc29sZS5sb2coXCJUaGUgJ2Nsb25lJyBjb21tYW5kIHdpbGwgYmUgaW1wbGVtZW50ZWQgaW4gYSBmdXR1cmUgcGhhc2VcIik7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoRVhJVC5FUlJPUik7XG59XG5cbi8qKlxuICogU3R1YiBjb21tYW5kIGZvciBsaXN0IChmdXR1cmUgcGhhc2UpXG4gKi9cbmZ1bmN0aW9uIGxpc3RDb21tYW5kKFxuICBfYXJnczogc3RyaW5nW10sXG4gIF9mbGFnczogR2xvYmFsRmxhZ3MsXG4pOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zb2xlLmxvZyhyZWQoYCR7U1RBVFVTLmVycm9yfSBDb21tYW5kIG5vdCB5ZXQgaW1wbGVtZW50ZWRgKSk7XG4gIGNvbnNvbGUubG9nKFwiVGhlICdsaXN0JyBjb21tYW5kIHdpbGwgYmUgaW1wbGVtZW50ZWQgaW4gYSBmdXR1cmUgcGhhc2VcIik7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoRVhJVC5FUlJPUik7XG59XG5cbi8qKlxuICogQ29tbWFuZCByZWdpc3RyeVxuICovXG5jb25zdCBjb21tYW5kczogUmVjb3JkPHN0cmluZywgQ29tbWFuZEhhbmRsZXI+ID0ge1xuICBoZWxwOiBoZWxwQ29tbWFuZCxcbiAgdmVyc2lvbjogdmVyc2lvbkNvbW1hbmQsXG4gIHN0YXR1czogc3RhdHVzQ29tbWFuZCxcbiAgbG9hZDogbG9hZENvbW1hbmQsXG4gIHVubG9hZDogdW5sb2FkQ29tbWFuZCxcbiAgY2xvbmU6IGNsb25lQ29tbWFuZCxcbiAgbGlzdDogbGlzdENvbW1hbmQsXG4gIHBlcnNvbjogcGVyc29uQ29tbWFuZCxcbiAgbWVtb3J5OiBtZW1vcnlDb21tYW5kLFxuICBjb250ZXh0OiBjb250ZXh0Q29tbWFuZCxcbn07XG5cbi8qKlxuICogUGFyc2UgY29tbWFuZCBsaW5lIGFyZ3VtZW50cyBhbmQgcm91dGUgdG8gYXBwcm9wcmlhdGUgY29tbWFuZFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihhcmdzOiBzdHJpbmdbXSk6IFByb21pc2U8bnVtYmVyPiB7XG4gIHRyeSB7XG4gICAgLy8gUGFyc2UgYXJndW1lbnRzXG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VBcmdzKGFyZ3MpO1xuXG4gICAgLy8gRXh0cmFjdCBnbG9iYWwgZmxhZ3NcbiAgICBjb25zdCBmbGFnczogR2xvYmFsRmxhZ3MgPSB7XG4gICAgICBoZWxwOiBwYXJzZWQuaGVscCA9PT0gdHJ1ZSxcbiAgICAgIHZlcnNpb246IHBhcnNlZC52ZXJzaW9uID09PSB0cnVlLFxuICAgICAgcXVpZXQ6IHBhcnNlZC5xdWlldCA9PT0gdHJ1ZSxcbiAgICAgIHZlcmJvc2U6IHBhcnNlZC52ZXJib3NlID09PSB0cnVlLFxuICAgICAganNvbjogcGFyc2VkLmpzb24gPT09IHRydWUsXG4gICAgICBub0NvbG9yOiBwYXJzZWRbXCJuby1jb2xvclwiXSA9PT0gdHJ1ZSxcbiAgICB9O1xuXG4gICAgLy8gQXBwbHkgbm9Db2xvciB0byBEZW5vXG4gICAgaWYgKGZsYWdzLm5vQ29sb3IpIHtcbiAgICAgIGFwcGx5Tm9Db2xvcigpO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBnbG9iYWwgZmxhZ3NcbiAgICBpZiAoZmxhZ3MudmVyc2lvbikge1xuICAgICAgcmV0dXJuIGF3YWl0IHZlcnNpb25Db21tYW5kKFtdLCBmbGFncyk7XG4gICAgfVxuXG4gICAgaWYgKGZsYWdzLmhlbHAgJiYgcGFyc2VkLl8ubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYXdhaXQgaGVscENvbW1hbmQoW10sIGZsYWdzKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgY29tbWFuZCBhbmQgaXRzIGFyZ3NcbiAgICBjb25zdCBjb21tYW5kTmFtZSA9IHBhcnNlZC5fWzBdPy50b1N0cmluZygpO1xuICAgIGNvbnN0IGNvbW1hbmRBcmdzID0gcGFyc2VkLl8uc2xpY2UoMSkubWFwKFN0cmluZyk7XG5cbiAgICAvLyBObyBjb21tYW5kIHByb3ZpZGVkXG4gICAgaWYgKCFjb21tYW5kTmFtZSkge1xuICAgICAgcmV0dXJuIGF3YWl0IGhlbHBDb21tYW5kKFtdLCBmbGFncyk7XG4gICAgfVxuXG4gICAgLy8gRmluZCBhbmQgZXhlY3V0ZSBjb21tYW5kXG4gICAgY29uc3QgY29tbWFuZCA9IGNvbW1hbmRzW2NvbW1hbmROYW1lXTtcbiAgICBpZiAoIWNvbW1hbmQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IocmVkKGAke1NUQVRVUy5lcnJvcn0gVW5rbm93biBjb21tYW5kOiAke2NvbW1hbmROYW1lfWApKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFJ1biAndHl2aSAtLWhlbHAnIGZvciB1c2FnZSBpbmZvcm1hdGlvbmApO1xuICAgICAgcmV0dXJuIEVYSVQuSU5WQUxJRF9BUkdTO1xuICAgIH1cblxuICAgIC8vIFNob3cgY29tbWFuZCBoZWxwIGlmIHJlcXVlc3RlZFxuICAgIGlmIChmbGFncy5oZWxwKSB7XG4gICAgICAvLyBGb3Igbm93LCBqdXN0IHNob3cgZ2VuZXJhbCBoZWxwXG4gICAgICByZXR1cm4gYXdhaXQgaGVscENvbW1hbmQoW10sIGZsYWdzKTtcbiAgICB9XG5cbiAgICAvLyBFeGVjdXRlIGNvbW1hbmRcbiAgICByZXR1cm4gYXdhaXQgY29tbWFuZChjb21tYW5kQXJncywgZmxhZ3MpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIG91dHB1dEVycm9yKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKSwge1xuICAgICAgcXVpZXQ6IGZhbHNlLFxuICAgICAganNvbjogZmFsc2UsXG4gICAgfSk7XG4gICAgcmV0dXJuIEVYSVQuRVJST1I7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7OztDQU9DLEdBRUQsU0FBUyxZQUFZLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsTUFBTSxRQUFRLGNBQWM7QUFDM0UsU0FBUyxhQUFhLFFBQVEsdUJBQXVCO0FBQ3JELFNBQVMsYUFBYSxRQUFRLHVCQUF1QjtBQUNyRCxTQUFTLGNBQWMsUUFBUSx3QkFBd0I7QUFFdkQ7O0NBRUMsR0FDRCxPQUFPLE1BQU0sT0FBTztFQUNsQixTQUFTO0VBQ1QsT0FBTztFQUNQLGNBQWM7RUFDZCxjQUFjO0VBQ2QsV0FBVztFQUNYLG1CQUFtQjtBQUNyQixFQUFFO0FBc0JGOztDQUVDLEdBQ0QsU0FBUyxVQUFVLElBQWM7RUFDL0IsTUFBTSxTQUFxQjtJQUFFLEdBQUcsRUFBRTtFQUFDO0VBQ25DLE1BQU0sZUFBZSxJQUFJLElBQUk7SUFDM0I7SUFDQTtJQUNBO0lBQ0E7SUFD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
// denoCacheMetadata=12355342293042056540,1781705062245199278
