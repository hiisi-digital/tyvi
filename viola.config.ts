/**
 * Viola convention linter configuration for tyvi.
 *
 * Checks for code duplication, naming conventions, documentation gaps,
 * and file organization problems.
 */

import { report, viola, when } from "jsr:@hiisi/viola@^0.3.0";
import defaultLints from "jsr:@hiisi/viola-default-lints@^0.3.0";
import tsGrammar from "jsr:@hiisi/viola-grammar-ts@^0.3.0";

export default viola()
  .add(tsGrammar).as("ts")
  .use(defaultLints)
  // Suppress all lint issues in test files and fixtures
  .rule(report.off, when.in("tests/**"))
  .rule(report.off, when.in("**/fixtures/**"))
  // Suppress duplicate-strings for shell/template generation files
  .rule(
    report.off,
    when.in("src/devspace/shell.ts", "src/devspace/direnv.ts", "src/devspace/hooks.ts")
      .and(when.linter("duplicate-strings")),
  )
  // Type location: shared types go in src/types/
  .set("type-location", {
    typeDirectories: ["src/types"],
  })
  // Orphaned code: mark public API files
  .set("orphaned-code", {
    publicApiFiles: [
      "mod.ts",
      "src/types/mod.ts",
      "src/devspace/mod.ts",
      "src/computation/mod.ts",
      "src/atoms/mod.ts",
      "src/people/mod.ts",
      "src/memory/mod.ts",
      "src/context/mod.ts",
      "src/relationships/mod.ts",
      "src/git/mod.ts",
      "src/config/mod.ts",
    ],
  })
  // Duplicate strings: ignore common domain terms
  .set("duplicate-strings", {
    ignoreStrings: [
      "ctx://",
      "ctx://person/",
      "tyvi.toml",
      "inventory.toml",
      ".staging",
      ".lab",
      ".state",
      ".tmp",
      "@default",
      "origin",
      "clean",
      "dirty",
      "active",
      "dormant",
      "ended",
    ],
  })
  // Similar functions: ignore intentionally similar loader functions
  .set("similar-functions", {
    ignoreFunctions: [
      "loadTraits",
      "loadSkills",
      "loadQuirks",
      "loadPhrases",
      "loadExperience",
      "loadStacks",
    ],
  });
