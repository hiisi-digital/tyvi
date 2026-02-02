/**
 * Manual verification script for memory system.
 * 
 * This script manually tests the memory system without external dependencies.
 * Run with: deno run --allow-read --allow-write manual_test.ts
 */

// Manual type checking by importing the module
import { getMemoryStrength, calculateStrength, getDefaultHalfLife } from "../src/memory/strength.ts";
import type { MemoryStrength, MemoryFade } from "../src/types/memory.ts";

console.log("=== Memory System Manual Tests ===\n");

// Test 1: No decay
console.log("Test 1: Calculate strength with no decay");
const strength1: MemoryStrength = {
  initial: 1.0,
  current: 1.0,
  last_reinforced: new Date().toISOString(),
  reinforcement_count: 0
};
const fade1: MemoryFade = { half_life_days: 90, min_strength: 0.1 };
const result1 = calculateStrength(strength1, fade1, new Date());
console.log(`  Expected: ~1.0, Got: ${result1.toFixed(3)}`);
console.log(`  ✓ ${result1 > 0.99 ? "PASS" : "FAIL"}\n`);

// Test 2: Half-life decay
console.log("Test 2: Calculate strength after one half-life");
const now2 = new Date("2025-03-31T00:00:00Z");
const created2 = new Date("2025-01-01T00:00:00Z"); // 90 days ago
const strength2: MemoryStrength = {
  initial: 1.0,
  current: 1.0,
  last_reinforced: created2.toISOString(),
  reinforcement_count: 0
};
const fade2: MemoryFade = { half_life_days: 90, min_strength: 0.1 };
const result2 = calculateStrength(strength2, fade2, now2);
console.log(`  Expected: ~0.5, Got: ${result2.toFixed(3)}`);
console.log(`  ✓ ${result2 > 0.49 && result2 < 0.51 ? "PASS" : "FAIL"}\n`);

// Test 3: Minimum strength floor
console.log("Test 3: Respect minimum strength floor");
const now3 = new Date("2027-01-01T00:00:00Z");
const created3 = new Date("2025-01-01T00:00:00Z"); // 2 years ago
const strength3: MemoryStrength = {
  initial: 1.0,
  current: 1.0,
  last_reinforced: created3.toISOString(),
  reinforcement_count: 0
};
const fade3: MemoryFade = { half_life_days: 90, min_strength: 0.1 };
const result3 = calculateStrength(strength3, fade3, now3);
console.log(`  Expected: 0.1, Got: ${result3.toFixed(3)}`);
console.log(`  ✓ ${result3 === 0.1 ? "PASS" : "FAIL"}\n`);

// Test 4: Default half-life by significance
console.log("Test 4: Default half-life by significance");
const high = getDefaultHalfLife("high");
const medium = getDefaultHalfLife("medium");
const low = getDefaultHalfLife("low");
console.log(`  High: ${high} (expected: 180)`);
console.log(`  Medium: ${medium} (expected: 90)`);
console.log(`  Low: ${low} (expected: 30)`);
console.log(`  ✓ ${high === 180 && medium === 90 && low === 30 ? "PASS" : "FAIL"}\n`);

// Test 5: Decay formula verification
console.log("Test 5: Verify exponential decay formula");
console.log("  Testing at various time points:");
const testCases = [
  { days: 0, expected: 1.0 },
  { days: 45, expected: 0.707 },  // sqrt(0.5) ≈ 0.707
  { days: 90, expected: 0.5 },
  { days: 180, expected: 0.25 },
  { days: 270, expected: 0.125 },
];

const baseTime = new Date("2025-01-01T00:00:00Z");
let allPass = true;
for (const testCase of testCases) {
  const testTime = new Date(baseTime.getTime() + testCase.days * 24 * 60 * 60 * 1000);
  const strength: MemoryStrength = {
    initial: 1.0,
    current: 1.0,
    last_reinforced: baseTime.toISOString(),
    reinforcement_count: 0
  };
  const fade: MemoryFade = { half_life_days: 90, min_strength: 0.0 };
  const result = calculateStrength(strength, fade, testTime);
  const pass = Math.abs(result - testCase.expected) < 0.01;
  allPass = allPass && pass;
  console.log(`    Day ${testCase.days}: ${result.toFixed(3)} (expected: ${testCase.expected.toFixed(3)}) ${pass ? "✓" : "✗"}`);
}
console.log(`  ✓ ${allPass ? "PASS" : "FAIL"}\n`);

console.log("=== All Manual Tests Complete ===");
