/**
 * Tests for atoms loading system.
 */

import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import {
  loadAtoms,
  loadExperience,
  loadPhrases,
  loadQuirks,
  loadSkills,
  loadStacks,
  loadTraits,
} from "../src/atoms/mod.ts";

const FIXTURE_PATH = join(Deno.cwd(), "tests", "fixtures", "atoms-data");

Deno.test("loadTraits - loads trait definitions", async () => {
  const traits = await loadTraits(FIXTURE_PATH);

  assertEquals(traits.size, 1);

  const caution = traits.get("trait.caution");
  assertExists(caution);
  assertEquals(caution.axis.id, "trait.caution");
  assertEquals(caution.axis.negative.term, "bold");
  assertEquals(caution.axis.negative.extreme, "reckless");
  assertEquals(caution.axis.neutral.term, "balanced");
  assertEquals(caution.axis.positive.term, "prudent");
  assertEquals(caution.axis.positive.extreme, "paralyzed");
});

Deno.test("loadTraits - handles missing directory", async () => {
  const traits = await loadTraits("/nonexistent/path");
  assertEquals(traits.size, 0);
});

Deno.test("loadSkills - loads skill definitions", async () => {
  const skills = await loadSkills(FIXTURE_PATH);

  assertEquals(skills.size, 1);

  const skill = skills.get("skill.type-system-design");
  assertExists(skill);
  assertEquals(skill.id, "skill.type-system-design");
  assertEquals(skill.category, "architecture");
  assertEquals(skill.description.name, "Type System Design");
  assertEquals(skill.levels[0], "No knowledge of type systems");
  assertEquals(skill.levels[100], "Pioneers new type system paradigms");
});

Deno.test("loadSkills - handles missing directory", async () => {
  const skills = await loadSkills("/nonexistent/path");
  assertEquals(skills.size, 0);
});

Deno.test("loadQuirks - loads quirk definitions", async () => {
  const quirks = await loadQuirks(FIXTURE_PATH);

  assertEquals(quirks.size, 1);

  const quirk = quirks.get("quirk.edge-case-hunter");
  assertExists(quirk);
  assertEquals(quirk.id, "quirk.edge-case-hunter");
  assertEquals(quirk.description.name, "Edge Case Hunter");
  assertEquals(quirk.manifestations.behaviors.length, 3);
  assertExists(quirk.overdone);
  assertEquals(
    quirk.overdone?.note,
    "Can become paralyzed by endless edge case exploration",
  );
});

Deno.test("loadQuirks - handles missing directory", async () => {
  const quirks = await loadQuirks("/nonexistent/path");
  assertEquals(quirks.size, 0);
});

Deno.test("loadPhrases - loads phrase definitions", async () => {
  const phrases = await loadPhrases(FIXTURE_PATH);

  assertEquals(phrases.size, 1);

  const phrase = phrases.get("phrase.direct-clarity");
  assertExists(phrase);
  assertEquals(phrase.id, "phrase.direct-clarity");
  assertEquals(phrase.description.name, "Direct Clarity");
  assertEquals(phrase.examples.variations.length, 3);
  assertExists(phrase.usage);
  assertEquals(
    phrase.usage?.note,
    "Most effective when precision is valued over diplomacy",
  );
});

Deno.test("loadPhrases - handles missing directory", async () => {
  const phrases = await loadPhrases("/nonexistent/path");
  assertEquals(phrases.size, 0);
});

Deno.test("loadExperience - loads experience definitions", async () => {
  const experience = await loadExperience(FIXTURE_PATH);

  assertEquals(experience.size, 1);

  const exp = experience.get("exp.rust-ecosystem");
  assertExists(exp);
  assertEquals(exp.id, "exp.rust-ecosystem");
  assertEquals(exp.category, "language");
  assertEquals(exp.description.name, "Rust Ecosystem");
  assertEquals(exp.levels[0], "Never used Rust");
  assertEquals(exp.levels[100], "Rust language team member or equivalent");
});

Deno.test("loadExperience - handles missing directory", async () => {
  const experience = await loadExperience("/nonexistent/path");
  assertEquals(experience.size, 0);
});

Deno.test("loadStacks - loads stack definitions", async () => {
  const stacks = await loadStacks(FIXTURE_PATH);

  assertEquals(stacks.size, 1);

  const stack = stacks.get("stack.typescript");
  assertExists(stack);
  assertEquals(stack.id, "stack.typescript");
  assertEquals(stack.category, "language");
  assertEquals(stack.description.name, "TypeScript");
  assertEquals(stack.levels[0], "No TypeScript experience");
  assertEquals(stack.levels[100], "TypeScript core team contributor");
});

Deno.test("loadStacks - handles missing directory", async () => {
  const stacks = await loadStacks("/nonexistent/path");
  assertEquals(stacks.size, 0);
});

Deno.test("loadAtoms - loads all atom types", async () => {
  const atoms = await loadAtoms(FIXTURE_PATH);

  assertExists(atoms);
  assertEquals(atoms.traits.size, 1);
  assertEquals(atoms.skills.size, 1);
  assertEquals(atoms.quirks.size, 1);
  assertEquals(atoms.phrases.size, 1);
  assertEquals(atoms.experience.size, 1);
  assertEquals(atoms.stacks.size, 1);

  // Verify one item from each category
  assertExists(atoms.traits.get("trait.caution"));
  assertExists(atoms.skills.get("skill.type-system-design"));
  assertExists(atoms.quirks.get("quirk.edge-case-hunter"));
  assertExists(atoms.phrases.get("phrase.direct-clarity"));
  assertExists(atoms.experience.get("exp.rust-ecosystem"));
  assertExists(atoms.stacks.get("stack.typescript"));
});

Deno.test("loadAtoms - handles missing data directory", async () => {
  const atoms = await loadAtoms("/nonexistent/path");

  assertExists(atoms);
  assertEquals(atoms.traits.size, 0);
  assertEquals(atoms.skills.size, 0);
  assertEquals(atoms.quirks.size, 0);
  assertEquals(atoms.phrases.size, 0);
  assertEquals(atoms.experience.size, 0);
  assertEquals(atoms.stacks.size, 0);
});
