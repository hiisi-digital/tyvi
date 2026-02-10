/**
 * Memory commands
 * @module
 */
import { listMemories, recallMemories, recordMemory } from "tyvi";
import { EXIT } from "../mod.ts";
import { bold, formatTable, gray, green, output, red, STATUS, yellow } from "../output.ts";
import { input } from "../prompts.ts";
/**
 * Find devspace data path
 */ function getDataPath() {
  const home = Deno.env.get("HOME") || ".";
  return `${home}/.ctl`;
}
/**
 * Format strength as visual indicator
 */ function formatStrength(strength) {
  if (strength >= 0.8) return green("███");
  if (strength >= 0.5) return yellow("██░");
  if (strength >= 0.2) return yellow("█░░");
  return gray("░░░");
}
/**
 * Handle memory subcommands
 */ export async function memoryCommand(args, flags) {
  const subcommand = args[0];
  const subargs = args.slice(1);
  switch (subcommand) {
    case "list":
      return await memoryList(subargs, flags);
    case "recall":
      return await memoryRecall(subargs, flags);
    case "record":
      return await memoryRecord(subargs, flags);
    default:
      console.log(`${bold("tyvi memory")} - Memory management

${bold("Usage:")} tyvi memory <command> [args]

${bold("Commands:")}
  list [--person <id>] [--topic <topic>]   List memories
  recall <person> [topic]                   Recall memories for person
  record <person>                           Record new memory (interactive)`);
      return subcommand ? EXIT.INVALID_ARGS : EXIT.SUCCESS;
  }
}
/**
 * List memories with optional filters
 */ async function memoryList(args, flags) {
  try {
    const dataPath = getDataPath();
    // Parse filter args
    let person;
    let topic;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--person" && args[i + 1]) {
        person = args[++i];
      } else if (args[i] === "--topic" && args[i + 1]) {
        topic = args[++i];
      }
    }
    const memories = await listMemories(dataPath, {
      person,
      topic,
      includeWeak: true,
    });
    if (memories.length === 0) {
      if (!flags.quiet) {
        console.log(gray("No memories found"));
      }
      return EXIT.SUCCESS;
    }
    if (flags.json) {
      output(memories, {
        json: true,
      });
      return EXIT.SUCCESS;
    }
    const table = formatTable(
      memories.map((m) => ({
        strength: formatStrength(m.strength),
        person: m.person.split("/").pop() || m.person,
        summary: m.summary.slice(0, 40) + (m.summary.length > 40 ? "..." : ""),
        topics: m.topics.slice(0, 2).join(", "),
      })),
      [
        {
          header: "Str",
          key: "strength",
          width: 3,
        },
        {
          header: "Person",
          key: "person",
        },
        {
          header: "Summary",
          key: "summary",
        },
        {
          header: "Topics",
          key: "topics",
        },
      ],
    );
    console.log(table);
    return EXIT.SUCCESS;
  } catch (error) {
    console.error(red(`${STATUS.error} Failed to list memories: ${error}`));
    return EXIT.ERROR;
  }
}
/**
 * Recall memories for a person
 */ async function memoryRecall(args, flags) {
  const personId = args[0];
  if (!personId) {
    console.error(red(`${STATUS.error} Missing person ID`));
    console.error("Usage: tyvi memory recall <person> [topic]");
    return EXIT.INVALID_ARGS;
  }
  const topic = args[1];
  try {
    const dataPath = getDataPath();
    const person = personId.startsWith("ctx://") ? personId : `ctx://person/${personId}`;
    const memories = await recallMemories(dataPath, {
      person,
      topic,
      limit: 10,
    });
    if (memories.length === 0) {
      if (!flags.quiet) {
        console.log(gray(`No memories found for ${personId}`));
      }
      return EXIT.SUCCESS;
    }
    if (flags.json) {
      output(memories, {
        json: true,
      });
      return EXIT.SUCCESS;
    }
    console.log(bold(`Memories for ${personId}:`));
    console.log();
    for (const memory of memories) {
      const strength = formatStrength(memory.strength.current);
      console.log(`${strength} ${bold(memory.content.summary)}`);
      if (memory.content.detail) {
        console.log(gray(`   ${memory.content.detail}`));
      }
      console.log(gray(`   Topics: ${memory.tags.topics.join(", ")}`));
      console.log();
    }
    return EXIT.SUCCESS;
  } catch (error) {
    console.error(red(`${STATUS.error} Failed to recall memories: ${error}`));
    return EXIT.ERROR;
  }
}
/**
 * Record a new memory (interactive)
 */ async function memoryRecord(args, flags) {
  const personId = args[0];
  if (!personId) {
    console.error(red(`${STATUS.error} Missing person ID`));
    console.error("Usage: tyvi memory record <person>");
    return EXIT.INVALID_ARGS;
  }
  try {
    const person = personId.startsWith("ctx://") ? personId : `ctx://person/${personId}`;
    // Interactive prompts
    const summary = await input("Summary");
    const detail = await input("Detail (optional)", "");
    const significance = await input("Significance (low/medium/high)", "medium");
    const topicsStr = await input("Topics (comma-separated)");
    const topics = topicsStr.split(",").map((t) => t.trim()).filter(Boolean);
    if (!summary) {
      console.error(red(`${STATUS.error} Summary is required`));
      return EXIT.INVALID_ARGS;
    }
    const memoryInput = {
      person,
      content: {
        summary,
        detail: detail || undefined,
        significance: significance,
      },
      tags: {
        topics,
        people: [],
      },
    };
    const dataPath = getDataPath();
    const memory = await recordMemory(dataPath, memoryInput);
    if (flags.json) {
      output(memory, {
        json: true,
      });
      return EXIT.SUCCESS;
    }
    console.log(green(`${STATUS.success} Memory recorded: ${memory.id}`));
    return EXIT.SUCCESS;
  } catch (error) {
    console.error(red(`${STATUS.error} Failed to record memory: ${error}`));
    return EXIT.ERROR;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvb3JncmlucnQvRGV2L3R5dmktY2xpL3NyYy9jb21tYW5kcy9tZW1vcnkudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBNZW1vcnkgY29tbWFuZHNcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQge1xuICBsaXN0TWVtb3JpZXMsXG4gIHJlY2FsbE1lbW9yaWVzLFxuICByZWNvcmRNZW1vcnksXG59IGZyb20gXCJ0eXZpXCI7XG5pbXBvcnQgdHlwZSB7IE1lbW9yeUlucHV0IH0gZnJvbSBcInR5dmlcIjtcbmltcG9ydCB0eXBlIHsgR2xvYmFsRmxhZ3MgfSBmcm9tIFwiLi4vbW9kLnRzXCI7XG5pbXBvcnQgeyBFWElUIH0gZnJvbSBcIi4uL21vZC50c1wiO1xuaW1wb3J0IHtcbiAgZm9ybWF0VGFibGUsXG4gIGdyZWVuLFxuICB5ZWxsb3csXG4gIHJlZCxcbiAgZ3JheSxcbiAgYm9sZCxcbiAgb3V0cHV0LFxuICBTVEFUVVMsXG59IGZyb20gXCIuLi9vdXRwdXQudHNcIjtcbmltcG9ydCB7IGlucHV0IH0gZnJvbSBcIi4uL3Byb21wdHMudHNcIjtcblxuLyoqXG4gKiBGaW5kIGRldnNwYWNlIGRhdGEgcGF0aFxuICovXG5mdW5jdGlvbiBnZXREYXRhUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCBob21lID0gRGVuby5lbnYuZ2V0KFwiSE9NRVwiKSB8fCBcIi5cIjtcbiAgcmV0dXJuIGAke2hvbWV9Ly5jdGxgO1xufVxuXG4vKipcbiAqIEZvcm1hdCBzdHJlbmd0aCBhcyB2aXN1YWwgaW5kaWNhdG9yXG4gKi9cbmZ1bmN0aW9uIGZvcm1hdFN0cmVuZ3RoKHN0cmVuZ3RoOiBudW1iZXIpOiBzdHJpbmcge1xuICBpZiAoc3RyZW5ndGggPj0gMC44KSByZXR1cm4gZ3JlZW4oXCLilojilojilohcIik7XG4gIGlmIChzdHJlbmd0aCA+PSAwLjUpIHJldHVybiB5ZWxsb3coXCLilojilojilpFcIik7XG4gIGlmIChzdHJlbmd0aCA+PSAwLjIpIHJldHVybiB5ZWxsb3coXCLilojilpHilpFcIik7XG4gIHJldHVybiBncmF5KFwi4paR4paR4paRXCIpO1xufVxuXG4vKipcbiAqIEhhbmRsZSBtZW1vcnkgc3ViY29tbWFuZHNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1lbW9yeUNvbW1hbmQoXG4gIGFyZ3M6IHN0cmluZ1tdLFxuICBmbGFnczogR2xvYmFsRmxhZ3MsXG4pOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCBzdWJjb21tYW5kID0gYXJnc1swXTtcbiAgY29uc3Qgc3ViYXJncyA9IGFyZ3Muc2xpY2UoMSk7XG5cbiAgc3dpdGNoIChzdWJjb21tYW5kKSB7XG4gICAgY2FzZSBcImxpc3RcIjpcbiAgICAgIHJldHVybiBhd2FpdCBtZW1vcnlMaXN0KHN1YmFyZ3MsIGZsYWdzKTtcbiAgICBjYXNlIFwicmVjYWxsXCI6XG4gICAgICByZXR1cm4gYXdhaXQgbWVtb3J5UmVjYWxsKHN1YmFyZ3MsIGZsYWdzKTtcbiAgICBjYXNlIFwicmVjb3JkXCI6XG4gICAgICByZXR1cm4gYXdhaXQgbWVtb3J5UmVjb3JkKHN1YmFyZ3MsIGZsYWdzKTtcbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS5sb2coYCR7Ym9sZChcInR5dmkgbWVtb3J5XCIpfSAtIE1lbW9yeSBtYW5hZ2VtZW50XG5cbiR7Ym9sZChcIlVzYWdlOlwiKX0gdHl2aSBtZW1vcnkgPGNvbW1hbmQ+IFthcmdzXVxuXG4ke2JvbGQoXCJDb21tYW5kczpcIil9XG4gIGxpc3QgWy0tcGVyc29uIDxpZD5dIFstLXRvcGljIDx0b3BpYz5dICAgTGlzdCBtZW1vcmllc1xuICByZWNhbGwgPHBlcnNvbj4gW3RvcGljXSAgICAgICAgICAgICAgICAgICBSZWNhbGwgbWVtb3JpZXMgZm9yIHBlcnNvblxuICByZWNvcmQgPHBlcnNvbj4gICAgICAgICAgICAgICAgICAgICAgICAgICBSZWNvcmQgbmV3IG1lbW9yeSAoaW50ZXJhY3RpdmUpYCk7XG4gICAgICByZXR1cm4gc3ViY29tbWFuZCA/IEVYSVQuSU5WQUxJRF9BUkdTIDogRVhJVC5TVUNDRVNTO1xuICB9XG59XG5cbi8qKlxuICogTGlzdCBtZW1vcmllcyB3aXRoIG9wdGlvbmFsIGZpbHRlcnNcbiAqL1xuYXN5bmMgZnVuY3Rpb24gbWVtb3J5TGlzdChhcmdzOiBzdHJpbmdbXSwgZmxhZ3M6IEdsb2JhbEZsYWdzKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBkYXRhUGF0aCA9IGdldERhdGFQYXRoKCk7XG5cbiAgICAvLyBQYXJzZSBmaWx0ZXIgYXJnc1xuICAgIGxldCBwZXJzb246IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBsZXQgdG9waWM6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFyZ3NbaV0gPT09IFwiLS1wZXJzb25cIiAmJiBhcmdzW2kgKyAxXSkge1xuICAgICAgICBwZXJzb24gPSBhcmdzWysraV07XG4gICAgICB9IGVsc2UgaWYgKGFyZ3NbaV0gPT09IFwiLS10b3BpY1wiICYmIGFyZ3NbaSArIDFdKSB7XG4gICAgICAgIHRvcGljID0gYXJnc1srK2ldO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG1lbW9yaWVzID0gYXdhaXQgbGlzdE1lbW9yaWVzKGRhdGFQYXRoLCB7XG4gICAgICBwZXJzb24sXG4gICAgICB0b3BpYyxcbiAgICAgIGluY2x1ZGVXZWFrOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgaWYgKG1lbW9yaWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgaWYgKCFmbGFncy5xdWlldCkge1xuICAgICAgICBjb25zb2xlLmxvZyhncmF5KFwiTm8gbWVtb3JpZXMgZm91bmRcIikpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIEVYSVQuU1VDQ0VTUztcbiAgICB9XG5cbiAgICBpZiAoZmxhZ3MuanNvbikge1xuICAgICAgb3V0cHV0KG1lbW9yaWVzLCB7IGpzb246IHRydWUgfSk7XG4gICAgICByZXR1cm4gRVhJVC5TVUNDRVNTO1xuICAgIH1cblxuICAgIGNvbnN0IHRhYmxlID0gZm9ybWF0VGFibGUoXG4gICAgICBtZW1vcmllcy5tYXAoKG0pID0+ICh7XG4gICAgICAgIHN0cmVuZ3RoOiBmb3JtYXRTdHJlbmd0aChtLnN0cmVuZ3RoKSxcbiAgICAgICAgcGVyc29uOiBtLnBlcnNvbi5zcGxpdChcIi9cIikucG9wKCkgfHwgbS5wZXJzb24sXG4gICAgICAgIHN1bW1hcnk6IG0uc3VtbWFyeS5zbGljZSgwLCA0MCkgKyAobS5zdW1tYXJ5Lmxlbmd0aCA+IDQwID8gXCIuLi5cIiA6IFwiXCIpLFxuICAgICAgICB0b3BpY3M6IG0udG9waWNzLnNsaWNlKDAsIDIpLmpvaW4oXCIsIFwiKSxcbiAgICAgIH0pKSxcbiAgICAgIFtcbiAgICAgICAgeyBoZWFkZXI6IFwiU3RyXCIsIGtleTogXCJzdHJlbmd0aFwiLCB3aWR0aDogMyB9LFxuICAgICAgICB7IGhlYWRlcjogXCJQZXJzb25cIiwga2V5OiBcInBlcnNvblwiIH0sXG4gICAgICAgIHsgaGVhZGVyOiBcIlN1bW1hcnlcIiwga2V5OiBcInN1bW1hcnlcIiB9LFxuICAgICAgICB7IGhlYWRlcjogXCJUb3BpY3NcIiwga2V5OiBcInRvcGljc1wiIH0sXG4gICAgICBdLFxuICAgICk7XG4gICAgY29uc29sZS5sb2codGFibGUpO1xuICAgIHJldHVybiBFWElULlNVQ0NFU1M7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihyZWQoYCR7U1RBVFVTLmVycm9yfSBGYWlsZWQgdG8gbGlzdCBtZW1vcmllczogJHtlcnJvcn1gKSk7XG4gICAgcmV0dXJuIEVYSVQuRVJST1I7XG4gIH1cbn1cblxuLyoqXG4gKiBSZWNhbGwgbWVtb3JpZXMgZm9yIGEgcGVyc29uXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIG1lbW9yeVJlY2FsbChcbiAgYXJnczogc3RyaW5nW10sXG4gIGZsYWdzOiBHbG9iYWxGbGFncyxcbik6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IHBlcnNvbklkID0gYXJnc1swXTtcbiAgaWYgKCFwZXJzb25JZCkge1xuICAgIGNvbnNvbGUuZXJyb3IocmVkKGAke1NUQVRVUy5lcnJvcn0gTWlzc2luZyBwZXJzb24gSURgKSk7XG4gICAgY29uc29sZS5lcnJvcihcIlVzYWdlOiB0eXZpIG1lbW9yeSByZWNhbGwgPHBlcnNvbj4gW3RvcGljXVwiKTtcbiAgICByZXR1cm4gRVhJVC5JTlZBTElEX0FSR1M7XG4gIH1cblxuICBjb25zdCB0b3BpYyA9IGFyZ3NbMV07XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkYXRhUGF0aCA9IGdldERhdGFQYXRoKCk7XG4gICAgY29uc3QgcGVyc29uID0gcGVyc29uSWQuc3RhcnRzV2l0aChcImN0eDovL1wiKVxuICAgICAgPyBwZXJzb25JZFxuICAgICAgOiBgY3R4Oi8vcGVyc29uLyR7cGVyc29uSWR9YDtcblxuICAgIGNvbnN0IG1lbW9yaWVzID0gYXdhaXQgcmVjYWxsTWVtb3JpZXMoZGF0YVBhdGgsIHtcbiAgICAgIHBlcnNvbixcbiAgICAgIHRvcGljLFxuICAgICAgbGltaXQ6IDEwLFxuICAgIH0pO1xuXG4gICAgaWYgKG1lbW9yaWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgaWYgKCFmbGFncy5xdWlldCkge1xuICAgICAgICBjb25zb2xlLmxvZyhncmF5KGBObyBtZW1vcmllcyBmb3VuZCBmb3IgJHtwZXJzb25JZH1gKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gRVhJVC5TVUNDRVNTO1xuICAgIH1cblxuICAgIGlmIChmbGFncy5qc29uKSB7XG4gICAgICBvdXRwdXQobWVtb3JpZXMsIHsganNvbjogdHJ1ZSB9KTtcbiAgICAgIHJldHVybiBFWElULlNVQ0NFU1M7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coYm9sZChgTWVtb3JpZXMgZm9yICR7cGVyc29uSWR9OmApKTtcbiAgICBjb25zb2xlLmxvZygpO1xuXG4gICAgZm9yIChjb25zdCBtZW1vcnkgb2YgbWVtb3JpZXMpIHtcbiAgICAgIGNvbnN0IHN0cmVuZ3RoID0gZm9ybWF0U3RyZW5ndGgobWVtb3J5LnN0cmVuZ3RoLmN1cnJlbnQpO1xuICAgICAgY29uc29sZS5sb2coYCR7c3RyZW5ndGh9ICR7Ym9sZChtZW1vcnkuY29udGVudC5zdW1tYXJ5KX1gKTtcbiAgICAgIGlmIChtZW1vcnkuY29udGVudC5kZXRhaWwpIHtcbiAgICAgICAgY29uc29sZS5sb2coZ3JheShgICAgJHttZW1vcnkuY29udGVudC5kZXRhaWx9YCkpO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coZ3JheShgICAgVG9waWNzOiAke21lbW9yeS50YWdzLnRvcGljcy5qb2luKFwiLCBcIil9YCkpO1xuICAgICAgY29uc29sZS5sb2coKTtcbiAgICB9XG5cbiAgICByZXR1cm4gRVhJVC5TVUNDRVNTO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IocmVkKGAke1NUQVRVUy5lcnJvcn0gRmFpbGVkIHRvIHJlY2FsbCBtZW1vcmllczogJHtlcnJvcn1gKSk7XG4gICAgcmV0dXJuIEVYSVQuRVJST1I7XG4gIH1cbn1cblxuLyoqXG4gKiBSZWNvcmQgYSBuZXcgbWVtb3J5IChpbnRlcmFjdGl2ZSlcbiAqL1xuYXN5bmMgZnVuY3Rpb24gbWVtb3J5UmVjb3JkKFxuICBhcmdzOiBzdHJpbmdbXSxcbiAgZmxhZ3M6IEdsb2JhbEZsYWdzLFxuKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgcGVyc29uSWQgPSBhcmdzWzBdO1xuICBpZiAoIXBlcnNvbklkKSB7XG4gICAgY29uc29sZS5lcnJvcihyZWQoYCR7U1RBVFVTLmVycm9yfSBNaXNzaW5nIHBlcnNvbiBJRGApKTtcbiAgICBjb25zb2xlLmVycm9yKFwiVXNhZ2U6IHR5dmkgbWVtb3J5IHJlY29yZCA8cGVyc29uPlwiKTtcbiAgICByZXR1cm4gRVhJVC5JTlZBTElEX0FSR1M7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHBlcnNvbiA9IHBlcnNvbklkLnN0YXJ0c1dpdGgoXCJjdHg6Ly9cIilcbiAgICAgID8gcGVyc29uSWRcbiAgICAgIDogYGN0eDovL3BlcnNvbi8ke3BlcnNvbklkfWA7XG5cbiAgICAvLyBJbnRlcmFjdGl2ZSBwcm9tcHRzXG4gICAgY29uc3Qgc3VtbWFyeSA9IGF3YWl0IGlucHV0KFwiU3VtbWFyeVwiKTtcbiAgICBjb25zdCBkZXRhaWwgPSBhd2FpdCBpbnB1dChcIkRldGFpbCAob3B0aW9uYWwpXCIsIFwiXCIpO1xuICAgIGNvbnN0IHNpZ25pZmljYW5jZSA9IGF3YWl0IGlucHV0KFxuICAgICAgXCJTaWduaWZpY2FuY2UgKGxvdy9tZWRpdW0vaGlnaClcIixcbiAgICAgIFwibWVkaXVtXCIsXG4gICAgKTtcbiAgICBjb25zdCB0b3BpY3NTdHIgPSBhd2FpdCBpbnB1dChcIlRvcGljcyAoY29tbWEtc2VwYXJhdGVkKVwiKTtcbiAgICBjb25zdCB0b3BpY3MgPSB0b3BpY3NTdHIuc3BsaXQoXCIsXCIpLm1hcCgodCkgPT4gdC50cmltKCkpLmZpbHRlcihCb29sZWFuKTtcblxuICAgIGlmICghc3VtbWFyeSkge1xuICAgICAgY29uc29sZS5lcnJvcihyZWQoYCR7U1RBVFVTLmVycm9yfSBTdW1tYXJ5IGlzIHJlcXVpcmVkYCkpO1xuICAgICAgcmV0dXJuIEVYSVQuSU5WQUxJRF9BUkdTO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbW9yeUlucHV0OiBNZW1vcnlJbnB1dCA9IHtcbiAgICAgIHBlcnNvbixcbiAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgc3VtbWFyeSxcbiAgICAgICAgZGV0YWlsOiBkZXRhaWwgfHwgdW5kZWZpbmVkLFxuICAgICAgICBzaWduaWZpY2FuY2U6IHNpZ25pZmljYW5jZSBhcyBcImxvd1wiIHwgXCJtZWRpdW1cIiB8IFwiaGlnaFwiLFxuICAgICAgfSxcbiAgICAgIHRhZ3M6IHtcbiAgICAgICAgdG9waWNzLFxuICAgICAgICBwZW9wbGU6IFtdLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgY29uc3QgZGF0YVBhdGggPSBnZXREYXRhUGF0aCgpO1xuICAgIGNvbnN0IG1lbW9yeSA9IGF3YWl0IHJlY29yZE1lbW9yeShkYXRhUGF0aCwgbWVtb3J5SW5wdXQpO1xuXG4gICAgaWYgKGZsYWdzLmpzb24pIHtcbiAgICAgIG91dHB1dChtZW1vcnksIHsganNvbjogdHJ1ZSB9KTtcbiAgICAgIHJldHVybiBFWElULlNVQ0NFU1M7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coZ3JlZW4oYCR7U1RBVFVTLnN1Y2Nlc3N9IE1lbW9yeSByZWNvcmRlZDogJHttZW1vcnkuaWR9YCkpO1xuICAgIHJldHVybiBFWElULlNVQ0NFU1M7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihyZWQoYCR7U1RBVFVTLmVycm9yfSBGYWlsZWQgdG8gcmVjb3JkIG1lbW9yeTogJHtlcnJvcn1gKSk7XG4gICAgcmV0dXJuIEVYSVQuRVJST1I7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0NBR0MsR0FFRCxTQUNFLFlBQVksRUFDWixjQUFjLEVBQ2QsWUFBWSxRQUNQLE9BQU87QUFHZCxTQUFTLElBQUksUUFBUSxZQUFZO0FBQ2pDLFNBQ0UsV0FBVyxFQUNYLEtBQUssRUFDTCxNQUFNLEVBQ04sR0FBRyxFQUNILElBQUksRUFDSixJQUFJLEVBQ0osTUFBTSxFQUNOLE1BQU0sUUFDRCxlQUFlO0FBQ3RCLFNBQVMsS0FBSyxRQUFRLGdCQUFnQjtBQUV0Qzs7Q0FFQyxHQUNELFNBQVM7RUFDUCxNQUFNLE9BQU8sS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLFdBQVc7RUFDckMsT0FBTyxHQUFHLEtBQUssS0FBSyxDQUFDO0FBQ3ZCO0FBRUE7O0NBRUMsR0FDRCxTQUFTLGVBQWUsUUFBZ0I7RUFDdEMsSUFBSSxZQUFZLEtBQUssT0FBTyxNQUFNO0VBQ2xDLElBQUksWUFBWSxLQUFLLE9BQU8sT0FBTztFQUNuQyxJQUFJLFlBQVksS0FBSyxPQUFPLE9B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
// denoCacheMetadata=5999016742768566802,2405879211122188085
