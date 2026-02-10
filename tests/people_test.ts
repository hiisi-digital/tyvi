/**
 * Tests for people loading and computation.
 */

import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { computePerson, listPeople, loadPerson } from "../src/people/mod.ts";

const testDataPath = import.meta.dirname
  ? join(import.meta.dirname, "fixtures", "people-data")
  : join(Deno.cwd(), "tests", "fixtures", "people-data");

const computedDataPath = import.meta.dirname
  ? join(import.meta.dirname, "fixtures", "computed-data")
  : join(Deno.cwd(), "tests", "fixtures", "computed-data");

Deno.test("loadPerson - valid person file", async () => {
  const person = await loadPerson(testDataPath, "alex");

  assertEquals(person.identity.id, "alex");
  assertEquals(person.identity.name, "Alex");
  assertEquals(person.identity.pronouns, "they/them");
  assertEquals(person.identity.github_username, "alex-dev");
  assertEquals(person.orgs?.primary, "hiisi");
  assertEquals(person.orgs?.teams, ["correctness", "core"]);
  assertEquals(person.traits?.["detail-focus"], 75);
  assertEquals(person.traits?.["perfectionism"], 60);
  assertEquals(person.skills?.["type-system-design"], 85);
  assertEquals(person.skills?.["api-design"], 75);
  assertEquals(person.quirks?.explicit, ["edge-case-hunter"]);
});

Deno.test("loadPerson - minimal person file", async () => {
  const person = await loadPerson(testDataPath, "sam");

  assertEquals(person.identity.id, "sam");
  assertEquals(person.identity.name, "Sam");
  assertEquals(person.traits?.caution, 50);
  assertEquals(person.skills?.rust, 70);
});

Deno.test("loadPerson - non-existent person", async () => {
  await assertRejects(
    async () => await loadPerson(testDataPath, "nonexistent"),
    Error,
    "Person file not found",
  );
});

Deno.test("computePerson - computes person with values", async () => {
  const computed = await computePerson(testDataPath, "alex");

  assertExists(computed);
  assertEquals(computed.identity.id, "alex");
  assertEquals(computed.identity.name, "Alex");

  // Check that anchor traits are present
  assertEquals(computed.traits.get("detail-focus"), 75);
  assertEquals(computed.traits.get("perfectionism"), 60);

  // Check that anchor skills are present
  assertEquals(computed.skills.get("type-system-design"), 85);
  assertEquals(computed.skills.get("api-design"), 75);

  // Check quirks
  assertEquals(computed.quirks.has("edge-case-hunter"), true);

  // Check trace exists
  assertExists(computed.trace);
});

Deno.test("computePerson - minimal person", async () => {
  const computed = await computePerson(testDataPath, "sam");

  assertExists(computed);
  assertEquals(computed.identity.id, "sam");
  assertEquals(computed.identity.name, "Sam");

  // Check anchor values
  assertEquals(computed.traits.get("caution"), 50);
  assertEquals(computed.skills.get("rust"), 70);
});

Deno.test("listPeople - lists all people", async () => {
  const people = await listPeople(testDataPath);

  assertEquals(people.length, 2);

  // Check that both alex and sam are in the list
  const ids = people.map((p) => p.id).sort();
  assertEquals(ids, ["alex", "sam"]);

  // Check alex summary
  const alex = people.find((p) => p.id === "alex");
  assertExists(alex);
  assertEquals(alex.name, "Alex");
  assertEquals(alex.org, "hiisi");
  assertEquals(alex.traitCount, 2);
  assertEquals(alex.skillCount, 2);
  assertEquals(alex.quirkCount, 1);

  // Check sam summary
  const sam = people.find((p) => p.id === "sam");
  assertExists(sam);
  assertEquals(sam.name, "Sam");
  assertEquals(sam.traitCount, 1);
  assertEquals(sam.skillCount, 1);
  assertEquals(sam.quirkCount, 0);
});

Deno.test("listPeople - empty directory returns empty array", async () => {
  const emptyPath = import.meta.dirname
    ? join(import.meta.dirname, "fixtures", "nonexistent")
    : join(Deno.cwd(), "tests", "fixtures", "nonexistent");
  const people = await listPeople(emptyPath);

  assertEquals(people.length, 0);
});

// ============================================================================
// Computation pipeline tests (with composition rules, quirk auto-assign, phrases)
// ============================================================================

Deno.test("computePerson - applies composition rules to compute new values", async () => {
  const computed = await computePerson(computedDataPath, "dana");

  // Dana has detail-focus=80, perfectionism=70, debugging=90, api-design=60
  // trait.caution has rules: detail-focus*0.5 (w=0.6) + perfectionism*0.3 (w=0.4)
  // Rule 1: 80 * 0.5 = 40
  // Rule 2: 70 * 0.3 = 21
  // Combined: (40 * 0.6 + 21 * 0.4) / (0.6 + 0.4) = (24 + 8.4) / 1.0 = 32.4
  // Dana has no anchor for caution, so this is purely computed
  const caution = computed.traits.get("caution");
  assertExists(caution);
  assertEquals(Math.round(caution * 10) / 10, 32.4);
});

Deno.test("computePerson - computes derived skills from rules", async () => {
  const computed = await computePerson(computedDataPath, "dana");

  // skill.code-review has rules: debugging*0.4 (w=0.6) + detail-focus*0.3 (w=0.4)
  // Rule 1: 90 * 0.4 = 36
  // Rule 2: 80 * 0.3 = 24
  // Combined: (36 * 0.6 + 24 * 0.4) / (0.6 + 0.4) = (21.6 + 9.6) / 1.0 = 31.2
  const codeReview = computed.skills.get("code-review");
  assertExists(codeReview);
  assertEquals(Math.round(codeReview * 10) / 10, 31.2);
});

Deno.test("computePerson - auto-assigns quirks when conditions met", async () => {
  const computed = await computePerson(computedDataPath, "dana");

  // edge-case-hunter: all_of = ["trait.detail-focus > 70", "skill.debugging > 80"]
  // Dana: detail-focus=80 (>70 true), debugging=90 (>80 true) => assigned
  assertEquals(computed.quirks.has("edge-case-hunter"), true);

  // not-assigned: all_of = ["trait.detail-focus > 95", "skill.debugging > 95"]
  // Dana: 80 < 95, 90 < 95 => not assigned
  assertEquals(computed.quirks.has("not-assigned"), false);

  // verbose-logger is explicit
  assertEquals(computed.quirks.has("verbose-logger"), true);
});

Deno.test("computePerson - matches phrases when conditions met", async () => {
  const computed = await computePerson(computedDataPath, "dana");

  // precision-language: all_of = ["trait.perfectionism > 60", "trait.detail-focus > 60"]
  // Dana: perfectionism=70 (>60), detail-focus=80 (>60) => matched
  assertEquals(computed.phrases.includes("phrase.precision-language"), true);

  // casual-tone: any_of = ["trait.perfectionism < 30"]
  // Dana: perfectionism=70, which is NOT < 30 => not matched
  assertEquals(computed.phrases.includes("phrase.casual-tone"), false);
});

Deno.test("computePerson - preserves anchor values", async () => {
  const computed = await computePerson(computedDataPath, "dana");

  // Anchor traits should still be present
  assertEquals(computed.traits.get("detail-focus"), 80);
  assertEquals(computed.traits.get("perfectionism"), 70);

  // Anchor skills should still be present
  assertEquals(computed.skills.get("debugging"), 90);
  assertEquals(computed.skills.get("api-design"), 60);
});

Deno.test("computePerson - trace records computation details", async () => {
  const computed = await computePerson(computedDataPath, "dana");

  assertExists(computed.trace);

  // Anchor values should be in trace
  const detailTrace = computed.trace.values.get("trait.detail-focus");
  assertExists(detailTrace);
  assertEquals(detailTrace.isAnchor, true);
  assertEquals(detailTrace.finalValue, 80);

  // Computed values should have rules applied
  const cautionTrace = computed.trace.values.get("trait.caution");
  assertExists(cautionTrace);
  assertEquals(cautionTrace.isAnchor, false);
  assertEquals(cautionTrace.rulesApplied.length, 2);
});
