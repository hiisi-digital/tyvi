/**
 * Person computation module for tyvi.
 *
 * Computes all derived values for a person from anchors and composition rules.
 *
 * @module
 */

import type {
  Atoms,
  CompositionRule as AtomCompositionRule,
  ComputationTrace,
  ComputedPerson,
  Person,
  Phrase,
  Quirk,
  RuleApplication,
  ValueTrace,
} from "../types/mod.ts";
import { loadPerson } from "./loading.ts";
import { loadAtoms } from "../atoms/mod.ts";
import {
  buildRuleCollection,
  combineResults,
  createContext,
  createRule,
  evaluate,
  getBaseValue,
  getRuleEvaluationOrder,
  getTargetType,
  logCircularDependency,
  normalizeValue,
  parse,
  tokenize,
} from "../computation/mod.ts";
import type { CompositionRule, EvaluationContext, RuleResult } from "../computation/mod.ts";

/**
 * Collect all composition rules from loaded atoms.
 *
 * Iterates through all atom types and extracts their composition rules,
 * creating parsed CompositionRule objects for the rule engine.
 */
function collectRules(atoms: Atoms): CompositionRule[] {
  const rules: CompositionRule[] = [];

  function addRules(targetId: string, composition?: { rule: AtomCompositionRule[] }): void {
    if (!composition?.rule) return;
    for (const r of composition.rule) {
      rules.push(createRule(targetId, r.description, r.expression, r.weight));
    }
  }

  for (const [, trait] of atoms.traits) {
    addRules(trait.axis.id, trait.composition);
  }
  for (const [, skill] of atoms.skills) {
    addRules(skill.id, skill.composition);
  }
  for (const [, exp] of atoms.experience) {
    addRules(exp.id, exp.composition);
  }
  for (const [, stack] of atoms.stacks) {
    addRules(stack.id, stack.composition);
  }

  return rules;
}

/**
 * Build an EvaluationContext from a person's anchor values and current computed state.
 */
function buildContext(
  traits: Map<string, number>,
  skills: Map<string, number>,
  experience: Map<string, number>,
  stacks: Map<string, number>,
  quirks: Set<string>,
  base: number,
): EvaluationContext {
  return createContext({ traits, skills, experience, stacks, quirks, base });
}

/**
 * Evaluate a condition expression string against an evaluation context.
 *
 * Conditions are comparison expressions like "trait.perfectionism > 70".
 * Returns true if the expression evaluates to a truthy (non-zero) value.
 * Returns false if evaluation fails (e.g., undefined references).
 */
function evaluateCondition(conditionExpr: string, ctx: EvaluationContext): boolean {
  try {
    const tokens = tokenize(conditionExpr);
    const ast = parse(tokens);
    const result = evaluate(ast, ctx);
    return result !== 0;
  } catch {
    return false;
  }
}

/**
 * Check if a quirk should be auto-assigned based on its conditions.
 */
function shouldAutoAssign(quirk: Quirk, ctx: EvaluationContext): boolean {
  if (!quirk.auto_assign) return false;

  if (quirk.auto_assign.all_of) {
    return quirk.auto_assign.all_of.every((c) => evaluateCondition(c, ctx));
  }
  if (quirk.auto_assign.any_of) {
    return quirk.auto_assign.any_of.some((c) => evaluateCondition(c, ctx));
  }

  return false;
}

/**
 * Check if a phrase's conditions are met.
 */
function phraseMatches(phrase: Phrase, ctx: EvaluationContext): boolean {
  if (!phrase.conditions) return false;

  if (phrase.conditions.all_of) {
    return phrase.conditions.all_of.every((c) => evaluateCondition(c, ctx));
  }
  if (phrase.conditions.any_of) {
    return phrase.conditions.any_of.some((c) => evaluateCondition(c, ctx));
  }

  return false;
}

/**
 * Compute all derived values for a person.
 *
 * Takes anchor values from the person file and applies composition rules
 * from atoms to compute all traits, skills, experience, stacks, quirks, and phrases.
 *
 * @param dataPath - Path to the data directory
 * @param id - Person ID
 * @returns Promise resolving to computed person with all values
 * @throws Error if person cannot be loaded or computed
 */
export async function computePerson(
  dataPath: string,
  id: string,
): Promise<ComputedPerson> {
  const person = await loadPerson(dataPath, id);
  const atoms = await loadAtoms(dataPath);

  return computeFromData(person, atoms);
}

/**
 * Core computation: apply composition rules, auto-assign quirks, match phrases.
 *
 * Separated from I/O for testability.
 */
export function computeFromData(person: Person, atoms: Atoms): ComputedPerson {
  // Initialize maps from anchor values
  const traits = new Map<string, number>();
  const skills = new Map<string, number>();
  const experience = new Map<string, number>();
  const stacks = new Map<string, number>();
  const quirks = new Set<string>();
  const phrases: string[] = [];

  if (person.traits) {
    for (const [key, value] of Object.entries(person.traits)) {
      traits.set(key, value);
    }
  }
  if (person.skills) {
    for (const [key, value] of Object.entries(person.skills)) {
      skills.set(key, value);
    }
  }
  if (person.experience) {
    for (const [key, value] of Object.entries(person.experience)) {
      experience.set(key, value);
    }
  }
  if (person.stacks) {
    for (const [key, value] of Object.entries(person.stacks)) {
      stacks.set(key, value);
    }
  }
  if (person.quirks?.explicit) {
    for (const quirk of person.quirks.explicit) {
      quirks.add(quirk);
    }
  }

  // Track anchors for trace
  const anchorKeys = new Set<string>();
  for (const [k] of traits) anchorKeys.add(`trait.${k}`);
  for (const [k] of skills) anchorKeys.add(`skill.${k}`);
  for (const [k] of experience) anchorKeys.add(`exp.${k}`);
  for (const [k] of stacks) anchorKeys.add(`stack.${k}`);

  // Collect and evaluate composition rules
  const allRules = collectRules(atoms);
  const trace: ComputationTrace = {
    values: new Map(),
    circularDependencies: [],
    computationOrder: [],
  };

  // Helper to get the right map for a target namespace
  function getMapForTarget(target: string): Map<string, number> | null {
    const [ns] = target.split(".");
    switch (ns) {
      case "trait":
        return traits;
      case "skill":
        return skills;
      case "exp":
      case "experience":
        return experience;
      case "stack":
        return stacks;
      default:
        return null;
    }
  }

  function getKeyFromTarget(target: string): string {
    return target.substring(target.indexOf(".") + 1);
  }

  if (allRules.length > 0) {
    const collection = buildRuleCollection(allRules);
    const { order, cycles } = getRuleEvaluationOrder(allRules);

    trace.circularDependencies = cycles;
    trace.computationOrder = order;

    for (const cycle of cycles) {
      logCircularDependency(cycle);
    }

    // Evaluate rules in dependency order
    for (const target of order) {
      const targetRules = collection.byTarget.get(target);
      if (!targetRules || targetRules.length === 0) continue;

      let valueType: "trait" | "skill" | "exp" | "stack";
      try {
        valueType = getTargetType(target);
      } catch {
        continue;
      }

      const base = getBaseValue(valueType);
      const targetMap = getMapForTarget(target);
      if (!targetMap) continue;

      const key = getKeyFromTarget(target);
      const isAnchor = anchorKeys.has(target);

      // If this is an anchor value, use it as current; otherwise use base
      const currentValue = targetMap.get(key) ?? base;

      const ctx = buildContext(traits, skills, experience, stacks, quirks, base);
      ctx.current = currentValue;

      const results: RuleResult[] = [];
      const rulesApplied: RuleApplication[] = [];

      for (const rule of targetRules) {
        try {
          const result = evaluate(rule.expression, ctx);
          results.push({ rule, result });
          rulesApplied.push({
            description: rule.description,
            expression: rule.expressionString,
            result,
            weight: rule.weight,
          });
        } catch {
          // Skip rules that fail to evaluate (missing references, etc.)
          continue;
        }
      }

      if (results.length > 0) {
        let finalValue: number;
        if (isAnchor) {
          // For anchor values, blend anchor with rule results
          const ruleValue = combineResults(results);
          // Anchor gets weight 1.0, rules contribute additively
          finalValue = currentValue + ruleValue;
        } else {
          // For non-anchor values, use pure rule computation
          finalValue = combineResults(results);
        }

        finalValue = normalizeValue(finalValue, valueType);
        targetMap.set(key, finalValue);

        trace.values.set(target, {
          target,
          isAnchor,
          anchorsUsed: [], // Could be extracted from dependencies
          rulesApplied,
          finalValue,
        });
      }
    }
  }

  // Record anchor value traces
  for (const key of anchorKeys) {
    if (!trace.values.has(key)) {
      const [ns, name] = [key.substring(0, key.indexOf(".")), key.substring(key.indexOf(".") + 1)];
      let value = 0;
      switch (ns) {
        case "trait":
          value = traits.get(name) ?? 0;
          break;
        case "skill":
          value = skills.get(name) ?? 0;
          break;
        case "exp":
          value = experience.get(name) ?? 0;
          break;
        case "stack":
          value = stacks.get(name) ?? 0;
          break;
      }
      const valueTrace: ValueTrace = {
        target: key,
        isAnchor: true,
        anchorsUsed: [],
        rulesApplied: [],
        finalValue: value,
      };
      trace.values.set(key, valueTrace);
    }
  }

  // Auto-assign quirks from atom definitions
  const ctx = buildContext(traits, skills, experience, stacks, quirks, 0);
  for (const [, quirk] of atoms.quirks) {
    const quirkName = quirk.id.replace("quirk.", "");
    if (!quirks.has(quirkName) && shouldAutoAssign(quirk, ctx)) {
      quirks.add(quirkName);
    }
  }

  // Match phrases from atom definitions
  for (const [, phrase] of atoms.phrases) {
    if (phraseMatches(phrase, ctx)) {
      phrases.push(phrase.id);
    }
  }

  return {
    identity: person.identity,
    orgs: person.orgs,
    traits,
    skills,
    experience,
    stacks,
    quirks,
    phrases,
    tools: person.tools?.allowed,
    custom: person.custom,
    trace,
  };
}
