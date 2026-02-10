/**
 * Terminal output formatting utilities
 *
 * This module provides consistent output formatting for the CLI,
 * including colors, status indicators, tables, and various output modes.
 *
 * @module
 */
/**
 * ANSI color codes
 */ const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};
/**
 * Status indicators with colors
 */ export const STATUS = {
  success: "✓",
  warning: "!",
  error: "✗",
  neutral: "-",
  unknown: "?",
};
/**
 * Check if colors should be disabled
 */ function shouldDisableColors() {
  return Deno.noColor || Deno.env.get("NO_COLOR") !== undefined;
}
/**
 * Apply no-color setting to Deno
 */ export function applyNoColor() {
  try {
    Deno.noColor = true;
  } catch {
    // Ignore if readonly
  }
}
/**
 * Apply ANSI color code
 */ function applyColor(text, colorCode) {
  if (shouldDisableColors()) {
    return text;
  }
  return `${colorCode}${text}${COLORS.reset}`;
}
/**
 * Format text in green
 */ export function green(text) {
  return applyColor(text, COLORS.green);
}
/**
 * Format text in yellow
 */ export function yellow(text) {
  return applyColor(text, COLORS.yellow);
}
/**
 * Format text in red
 */ export function red(text) {
  return applyColor(text, COLORS.red);
}
/**
 * Format text in gray
 */ export function gray(text) {
  return applyColor(text, COLORS.gray);
}
/**
 * Format text in bold
 */ export function bold(text) {
  return applyColor(text, COLORS.bold);
}
/**
 * Format data as a table
 */ export function formatTable(rows, columns) {
  if (rows.length === 0) {
    return "";
  }
  // Calculate column widths
  const widths = columns.map((col) => {
    const headerWidth = col.header.length;
    const maxDataWidth = rows.reduce((max, row) => {
      const value = String(row[col.key] ?? "");
      return Math.max(max, value.length);
    }, 0);
    return col.width ?? Math.max(headerWidth, maxDataWidth);
  });
  // Format a row
  const formatRow = (data) => {
    return columns.map((col, i) => {
      const value = String(data[col.key] ?? "");
      const width = widths[i] ?? 0;
      if (col.align === "right") {
        return value.padStart(width);
      }
      return value.padEnd(width);
    }).join("  ");
  };
  // Build table
  const lines = [];
  // Header
  const header = columns.map((col, i) => col.header.padEnd(widths[i] ?? 0)).join("  ");
  lines.push(bold(header));
  // Separator
  const separator = columns.map((_, i) => "-".repeat(widths[i] ?? 0)).join("  ");
  lines.push(gray(separator));
  // Rows
  rows.forEach((row) => {
    lines.push(formatRow(row));
  });
  return lines.join("\n");
}
/**
 * Output data in the appropriate format
 */ export function output(data, options = {}) {
  // Apply noColor option
  if (options.noColor) {
    try {
      Deno.noColor = true;
    } catch {
      // Ignore if readonly
    }
  }
  // Quiet mode: no output
  if (options.quiet) {
    return;
  }
  // JSON mode
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  // Default: convert to string and print
  if (typeof data === "string") {
    console.log(data);
  } else if (typeof data === "object" && data !== null) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(String(data));
  }
}
/**
 * Output an error in the appropriate format
 */ export function outputError(error, options = {}) {
  // Apply noColor option
  if (options.noColor) {
    try {
      Deno.noColor = true;
    } catch {
      // Ignore if readonly
    }
  }
  // Quiet mode: no output
  if (options.quiet) {
    return;
  }
  // JSON mode
  if (options.json) {
    console.error(JSON.stringify(
      {
        error: error.message,
        name: error.name,
        stack: error.stack,
      },
      null,
      2,
    ));
    return;
  }
  // Default: formatted error
  console.error(red(`${STATUS.error} Error: ${error.message}`));
  // Show stack in verbose scenarios
  if (error.stack) {
    console.error(gray(error.stack));
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvb3JncmlucnQvRGV2L3R5dmktY2xpL3NyYy9vdXRwdXQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUZXJtaW5hbCBvdXRwdXQgZm9ybWF0dGluZyB1dGlsaXRpZXNcbiAqXG4gKiBUaGlzIG1vZHVsZSBwcm92aWRlcyBjb25zaXN0ZW50IG91dHB1dCBmb3JtYXR0aW5nIGZvciB0aGUgQ0xJLFxuICogaW5jbHVkaW5nIGNvbG9ycywgc3RhdHVzIGluZGljYXRvcnMsIHRhYmxlcywgYW5kIHZhcmlvdXMgb3V0cHV0IG1vZGVzLlxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG4vKipcbiAqIEFOU0kgY29sb3IgY29kZXNcbiAqL1xuY29uc3QgQ09MT1JTID0ge1xuICByZXNldDogXCJcXHgxYlswbVwiLFxuICBib2xkOiBcIlxceDFiWzFtXCIsXG4gIGdyZWVuOiBcIlxceDFiWzMybVwiLFxuICB5ZWxsb3c6IFwiXFx4MWJbMzNtXCIsXG4gIHJlZDogXCJcXHgxYlszMW1cIixcbiAgZ3JheTogXCJcXHgxYls5MG1cIixcbn07XG5cbi8qKlxuICogU3RhdHVzIGluZGljYXRvcnMgd2l0aCBjb2xvcnNcbiAqL1xuZXhwb3J0IGNvbnN0IFNUQVRVUyA9IHtcbiAgc3VjY2VzczogXCLinJNcIiwgLy8gZ3JlZW5cbiAgd2FybmluZzogXCIhXCIsIC8vIHllbGxvd1xuICBlcnJvcjogXCLinJdcIiwgLy8gcmVkXG4gIG5ldXRyYWw6IFwiLVwiLCAvLyBncmF5XG4gIHVua25vd246IFwiP1wiLCAvLyBncmF5XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIGNvbG9ycyBzaG91bGQgYmUgZGlzYWJsZWRcbiAqL1xuZnVuY3Rpb24gc2hvdWxkRGlzYWJsZUNvbG9ycygpOiBib29sZWFuIHtcbiAgcmV0dXJuIERlbm8ubm9Db2xvciB8fCBEZW5vLmVudi5nZXQoXCJOT19DT0xPUlwiKSAhPT0gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEFwcGx5IG5vLWNvbG9yIHNldHRpbmcgdG8gRGVub1xuICovXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlOb0NvbG9yKCk6IHZvaWQge1xuICB0cnkge1xuICAgIChEZW5vIGFzIHsgbm9Db2xvcjogYm9vbGVhbiB9KS5ub0NvbG9yID0gdHJ1ZTtcbiAgfSBjYXRjaCB7XG4gICAgLy8gSWdub3JlIGlmIHJlYWRvbmx5XG4gIH1cbn1cblxuLyoqXG4gKiBBcHBseSBBTlNJIGNvbG9yIGNvZGVcbiAqL1xuZnVuY3Rpb24gYXBwbHlDb2xvcih0ZXh0OiBzdHJpbmcsIGNvbG9yQ29kZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHNob3VsZERpc2FibGVDb2xvcnMoKSkge1xuICAgIHJldHVybiB0ZXh0O1xuICB9XG4gIHJldHVybiBgJHtjb2xvckNvZGV9JHt0ZXh0fSR7Q09MT1JTLnJlc2V0fWA7XG59XG5cbi8qKlxuICogRm9ybWF0IHRleHQgaW4gZ3JlZW5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdyZWVuKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBhcHBseUNvbG9yKHRleHQsIENPTE9SUy5ncmVlbik7XG59XG5cbi8qKlxuICogRm9ybWF0IHRleHQgaW4geWVsbG93XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB5ZWxsb3codGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGFwcGx5Q29sb3IodGV4dCwgQ09MT1JTLnllbGxvdyk7XG59XG5cbi8qKlxuICogRm9ybWF0IHRleHQgaW4gcmVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGFwcGx5Q29sb3IodGV4dCwgQ09MT1JTLnJlZCk7XG59XG5cbi8qKlxuICogRm9ybWF0IHRleHQgaW4gZ3JheVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ3JheSh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYXBwbHlDb2xvcih0ZXh0LCBDT0xPUlMuZ3JheSk7XG59XG5cbi8qKlxuICogRm9ybWF0IHRleHQgaW4gYm9sZFxuICovXG5leHBvcnQgZnVuY3Rpb24gYm9sZCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYXBwbHlDb2xvcih0ZXh0LCBDT0xPUlMuYm9sZCk7XG59XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBmb3IgYSB0YWJsZSBjb2x1bW5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUYWJsZUNvbHVtbiB7XG4gIGhlYWRlcjogc3RyaW5nO1xuICBrZXk6IHN0cmluZztcbiAgYWxpZ24/OiBcImxlZnRcIiB8IFwicmlnaHRcIjtcbiAgd2lkdGg/OiBudW1iZXI7XG59XG5cbi8qKlxuICogRm9ybWF0IGRhdGEgYXMgYSB0YWJsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0VGFibGUoXG4gIHJvd3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+W10sXG4gIGNvbHVtbnM6IFRhYmxlQ29sdW1uW10sXG4pOiBzdHJpbmcge1xuICBpZiAocm93cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuXG4gIC8vIENhbGN1bGF0ZSBjb2x1bW4gd2lkdGhzXG4gIGNvbnN0IHdpZHRocyA9IGNvbHVtbnMubWFwKChjb2wpID0+IHtcbiAgICBjb25zdCBoZWFkZXJXaWR0aCA9IGNvbC5oZWFkZXIubGVuZ3RoO1xuICAgIGNvbnN0IG1heERhdGFXaWR0aCA9IHJvd3MucmVkdWNlKChtYXgsIHJvdykgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBTdHJpbmcocm93W2NvbC5rZXldID8/IFwiXCIpO1xuICAgICAgcmV0dXJuIE1hdGgubWF4KG1heCwgdmFsdWUubGVuZ3RoKTtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gY29sLndpZHRoID8/IE1hdGgubWF4KGhlYWRlcldpZHRoLCBtYXhEYXRhV2lkdGgpO1xuICB9KTtcblxuICAvLyBGb3JtYXQgYSByb3dcbiAgY29uc3QgZm9ybWF0Um93ID0gKGRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gY29sdW1ucy5tYXAoKGNvbCwgaSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBTdHJpbmcoZGF0YVtjb2wua2V5XSA/PyBcIlwiKTtcbiAgICAgIGNvbnN0IHdpZHRoID0gd2lkdGhzW2ldID8/IDA7XG4gICAgICBpZiAoY29sLmFsaWduID09PSBcInJpZ2h0XCIpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLnBhZFN0YXJ0KHdpZHRoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZS5wYWRFbmQod2lkdGgpO1xuICAgIH0pLmpvaW4oXCIgIFwiKTtcbiAgfTtcblxuICAvLyBCdWlsZCB0YWJsZVxuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcblxuICAvLyBIZWFkZXJcbiAgY29uc3QgaGVhZGVyID0gY29sdW1ucy5tYXAoKGNvbCwgaSkgPT4gY29sLmhlYWRlci5wYWRFbmQod2lkdGhzW2ldID8/IDApKVxuICAgIC5qb2luKFwiICBcIik7XG4gIGxpbmVzLnB1c2goYm9sZChoZWFkZXIpKTtcblxuICAvLyBTZXBhcmF0b3JcbiAgY29uc3Qgc2VwYXJhdG9yID0gY29sdW1ucy5tYXAoKF8sIGkpID0+IFwiLVwiLnJlcGVhdCh3aWR0aHNbaV0gPz8gMCkpLmpvaW4oXG4gICAgXCIgIFwiLFxuICApO1xuICBsaW5lcy5wdXNoKGdyYXkoc2VwYXJhdG9yKSk7XG5cbiAgLy8gUm93c1xuICByb3dzLmZvckVhY2goKHJvdykgPT4ge1xuICAgIGxpbmVzLnB1c2goZm9ybWF0Um93KHJvdykpO1xuICB9KTtcblxuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbn1cblxuLyoqXG4gKiBPdXRwdXQgb3B0aW9ucyBmb3IgY29udHJvbGxpbmcgZm9ybWF0XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgT3V0cHV0T3B0aW9ucyB7XG4gIGpzb24/OiBib29sZWFuO1xuICBxdWlldD86IGJvb2xlYW47XG4gIG5vQ29sb3I/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIE91dHB1dCBkYXRhIGluIHRoZSBhcHByb3ByaWF0ZSBmb3JtYXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG91dHB1dChkYXRhOiB1bmtub3duLCBvcHRpb25zOiBPdXRwdXRPcHRpb25zID0ge30pOiB2b2lkIHtcbiAgLy8gQXBwbHkgbm9Db2xvciBvcHRpb25cbiAgaWYgKG9wdGlvbnMubm9Db2xvcikge1xuICAgIHRyeSB7XG4gICAgICAoRGVubyBhcyB7IG5vQ29sb3I6IGJvb2xlYW4gfSkubm9Db2xvciA9IHRydWU7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBJZ25vcmUgaWYgcmVhZG9ubHlcbiAgICB9XG4gIH1cblxuICAvLyBRdWlldCBtb2RlOiBubyBvdXRwdXRcbiAgaWYgKG9wdGlvbnMucXVpZXQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBKU09OIG1vZGVcbiAgaWYgKG9wdGlvbnMuanNvbikge1xuICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBEZWZhdWx0OiBjb252ZXJ0IHRvIHN0cmluZyBhbmQgcHJpbnRcbiAgaWYgKHR5cGVvZiBkYXRhID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc29sZS5sb2coZGF0YSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGRhdGEgPT09IFwib2JqZWN0XCIgJiYgZGF0YSAhPT0gbnVsbCkge1xuICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zb2xlLmxvZyhTdHJpbmcoZGF0YSkpO1xuICB9XG59XG5cbi8qKlxuICogT3V0cHV0IGFuIGVycm9yIGluIHRoZSBhcHByb3ByaWF0ZSBmb3JtYXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG91dHB1dEVycm9yKGVycm9yOiBFcnJvciwgb3B0aW9uczogT3V0cHV0T3B0aW9ucyA9IHt9KTogdm9pZCB7XG4gIC8vIEFwcGx5IG5vQ29sb3Igb3B0aW9uXG4gIGlmIChvcHRpb25zLm5vQ29sb3IpIHtcbiAgICB0cnkge1xuICAgICAgKERlbm8gYXMgeyBub0NvbG9yOiBib29sZWFuIH0pLm5vQ29sb3IgPSB0cnVlO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gSWdub3JlIGlmIHJlYWRvbmx5XG4gICAgfVxuICB9XG5cbiAgLy8gUXVpZXQgbW9kZTogbm8gb3V0cHV0XG4gIGlmIChvcHRpb25zLnF1aWV0KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gSlNPTiBtb2RlXG4gIGlmIChvcHRpb25zLmpzb24pIHtcbiAgICBjb25zb2xlLmVycm9yKEpTT04uc3RyaW5naWZ5KFxuICAgICAge1xuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgbmFtZTogZXJyb3IubmFtZSxcbiAgICAgICAgc3RhY2s6IGVycm9yLnN0YWNrLFxuICAgICAgfSxcbiAgICAgIG51bGwsXG4gICAgICAyLFxuICAgICkpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIERlZmF1bHQ6IGZvcm1hdHRlZCBlcnJvclxuICBjb25zb2xlLmVycm9yKHJlZChgJHtTVEFUVVMuZXJyb3J9IEVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCkpO1xuXG4gIC8vIFNob3cgc3RhY2sgaW4gdmVyYm9zZSBzY2VuYXJpb3NcbiAgaWYgKGVycm9yLnN0YWNrKSB7XG4gICAgY29uc29sZS5lcnJvcihncmF5KGVycm9yLnN0YWNrKSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7OztDQU9DLEdBRUQ7O0NBRUMsR0FDRCxNQUFNLFNBQVM7RUFDYixPQUFPO0VBQ1AsTUFBTTtFQUNOLE9BQU87RUFDUCxRQUFRO0VBQ1IsS0FBSztFQUNMLE1BQU07QUFDUjtBQUVBOztDQUVDLEdBQ0QsT0FBTyxNQUFNLFNBQVM7RUFDcEIsU0FBUztFQUNULFNBQVM7RUFDVCxPQUFPO0VBQ1AsU0FBUztFQUNULFNB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
// denoCacheMetadata=10088143859388626207,16286119822740876718
