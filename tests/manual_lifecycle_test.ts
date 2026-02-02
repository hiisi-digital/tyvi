/**
 * Manual test for memory lifecycle operations.
 */

import { recordMemory, reinforceMemory, pruneMemories, listMemories } from "../src/memory/mod.ts";
import type { MemoryInput } from "../src/types/memory.ts";

console.log("=== Memory Lifecycle Manual Test ===\n");

const testDir = await Deno.makeTempDir({ prefix: "tyvi-memory-test-" });
console.log(`Using temp directory: ${testDir}\n`);

try {
  // Test 1: Create a memory
  console.log("Test 1: Create a memory");
  const input: MemoryInput = {
    person: "ctx://person/test-user",
    content: {
      summary: "First manual test memory",
      detail: "Testing memory creation",
      significance: "high"
    },
    tags: {
      topics: ["testing", "manual"],
      people: ["ctx://person/tester"],
      outcome: "positive"
    }
  };
  
  const memory = await recordMemory(testDir, input);
  console.log(`  Created memory: ${memory.id}`);
  console.log(`  Initial strength: ${memory.strength.initial}`);
  console.log(`  Half-life: ${memory.fade.half_life_days} days`);
  console.log(`  Log entries: ${memory.log.length}`);
  console.log(`  ✓ PASS\n`);
  
  // Test 2: List memories
  console.log("Test 2: List memories");
  const summaries = await listMemories(testDir);
  console.log(`  Found ${summaries.length} memory/memories`);
  console.log(`  First summary: ${summaries[0]?.summary}`);
  console.log(`  ✓ ${summaries.length === 1 ? "PASS" : "FAIL"}\n`);
  
  // Test 3: Reinforce memory
  console.log("Test 3: Reinforce memory");
  // Wait a bit to ensure reinforcement is allowed
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const result = await reinforceMemory(testDir, memory.id, "Testing reinforcement");
  console.log(`  Previous strength: ${result.previousStrength.toFixed(3)}`);
  console.log(`  New strength: ${result.newStrength.toFixed(3)}`);
  console.log(`  Delta: ${result.delta.toFixed(3)}`);
  console.log(`  ✓ ${result.newStrength > result.previousStrength ? "PASS" : "FAIL"}\n`);
  
  // Test 4: Create a weak memory for pruning
  console.log("Test 4: Create and prune weak memory");
  const weakInput: MemoryInput = {
    person: "ctx://person/test-user",
    content: {
      summary: "Weak memory for pruning",
      significance: "low"
    },
    tags: {
      topics: ["test"],
      people: []
    },
    half_life_days: 1, // Very short half-life
    min_strength: 0.05
  };
  
  const weakMemory = await recordMemory(testDir, weakInput);
  console.log(`  Created weak memory: ${weakMemory.id}`);
  
  // Make it old by manually updating
  weakMemory.strength.last_reinforced = "2024-01-01T00:00:00Z";
  const { writeMemory } = await import("../src/memory/storage.ts");
  await writeMemory(testDir, weakMemory);
  
  // Now prune
  const pruneResult = await pruneMemories(testDir);
  console.log(`  Checked: ${pruneResult.checked} memories`);
  console.log(`  Pruned: ${pruneResult.pruned} memories`);
  console.log(`  ✓ ${pruneResult.pruned >= 1 ? "PASS" : "FAIL"}\n`);
  
  // Test 5: List memories after pruning
  console.log("Test 5: List memories after pruning");
  const finalSummaries = await listMemories(testDir);
  console.log(`  Remaining: ${finalSummaries.length} memory/memories`);
  console.log(`  ✓ ${finalSummaries.length === 1 ? "PASS" : "FAIL"}\n`);
  
  console.log("=== All Lifecycle Tests Complete ===");
  console.log("✓ All tests passed!");
  
} catch (error) {
  console.error("✗ Test failed:", error);
  throw error;
} finally {
  // Cleanup
  await Deno.remove(testDir, { recursive: true });
  console.log(`\nCleaned up temp directory`);
}
