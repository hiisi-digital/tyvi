/**
 * Tests for people loading and computation.
 */

import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { loadPerson, computePerson, listPeople } from "../src/people/mod.ts";

const testDataPath = join(import.meta.dirname!, "fixtures", "people-data");

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
  const emptyPath = join(import.meta.dirname!, "fixtures", "nonexistent");
  const people = await listPeople(emptyPath);

  assertEquals(people.length, 0);
});
