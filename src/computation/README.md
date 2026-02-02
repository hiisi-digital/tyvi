# Computation Module

Expression parsing, evaluation, and rule engine for tyvi.

## Overview

This module provides a complete expression language for computing derived values (traits, skills, etc.) from composition rules. It's designed for the "person" system where individual characteristics are computed from base values, rules, and context.

## Architecture

```
Expression String
      │
      ▼
┌─────────────┐
│   Lexer     │  (Moo-based, fast regex tokenization)
│  lexer.ts   │
└─────────────┘
      │
      ▼
   Tokens
      │
      ▼
┌─────────────┐
│   Parser    │  (Recursive descent, operator precedence)
│  parser.ts  │
└─────────────┘
      │
      ▼
    AST
      │
      ▼
┌─────────────┐
│  Evaluator  │  (Context-based evaluation)
│ evaluator.ts│
└─────────────┘
      │
      ▼
   Number
```

## Expression Language

### Identifiers

Reference values from different namespaces:

```
trait.caution       # Trait value (-100 to +100)
skill.debugging     # Skill value (0 to 100)
exp.rust            # Experience value (0 to 100)
stack.typescript    # Stack proficiency (0 to 100)
quirk.perfectionist # Quirk presence (0 or 1)
```

### Special Values

```
$base     # Base/default value for the type being computed
$current  # Current computed value (for recursive/iterative rules)
```

### Wildcards

Expand to all values in a namespace (for aggregate functions):

```
trait.*   # All trait values
skill.*   # All skill values
exp.*     # All experience values
stack.*   # All stack values
quirk.*   # All quirk values (each as 1)
```

### Operators

Arithmetic (in order of precedence):
```
*  /      # Multiplication, division (highest)
+  -      # Addition, subtraction
```

Comparison (lowest precedence, returns 1 or 0):
```
>  <      # Greater than, less than
>= <=     # Greater/less than or equal
== !=     # Equal, not equal
```

Unary:
```
-x        # Negation
```

Grouping:
```
(expr)    # Parentheses override precedence
```

### Functions

```
avg(...)         # Average of values
max(...)         # Maximum value
min(...)         # Minimum value
sum(...)         # Sum of values
count(...)       # Count of values
clamp(v, lo, hi) # Constrain value to range [lo, hi]
```

Functions accept wildcards:
```
avg(trait.*)              # Average of all traits
sum(skill.*)              # Sum of all skills
count(quirk.*)            # Number of active quirks
max(trait.*, skill.*)     # Max across all traits and skills
```

## Usage

### Basic Evaluation

```typescript
import { tokenize, parse, evaluate, createContext } from "./computation/mod.ts";

// Create evaluation context
const context = createContext({
  traits: new Map([["caution", 60], ["curiosity", 80]]),
  skills: new Map([["debugging", 85]]),
  base: 50,
});

// Parse and evaluate
const tokens = tokenize("$base + trait.caution * 0.3");
const ast = parse(tokens);
const result = evaluate(ast, context);
// result: 50 + 60 * 0.3 = 68
```

### Composition Rules

```typescript
import { createRule, buildRuleCollection, combineResults } from "./computation/mod.ts";

// Create rules
const rules = [
  createRule(
    "trait.effective-caution",
    "Base caution modified by debugging skill",
    "$base + skill.debugging * 0.2",
    1.0
  ),
  createRule(
    "trait.effective-caution",
    "Quirk bonus for perfectionism",
    "$current + quirk.perfectionist * 10",
    0.5
  ),
];

// Build collection
const collection = buildRuleCollection(rules);

// Get rules for a target
const cautionRules = collection.byTarget.get("trait.effective-caution");
```

### Dependency Analysis

```typescript
import { 
  extractDependencies, 
  analyzeDependencies,
  getRuleEvaluationOrder 
} from "./computation/mod.ts";

// Extract dependencies from an expression
const deps = extractDependencies(ast);
// ["trait.caution", "skill.debugging", "exp.*"]

// Analyze rule dependencies
const { order, cycles } = getRuleEvaluationOrder(rules);

if (cycles.length > 0) {
  console.warn("Circular dependencies:", cycles);
}

// Evaluate in dependency order
for (const target of order) {
  // ... evaluate rules for target
}
```

### Conditional Logic via Comparisons

Comparisons return 1 (true) or 0 (false), enabling conditional-like patterns:

```typescript
// Add bonus if skill > 80
"$base + (skill.debugging > 80) * 10"

// Quirk-based bonus
"$base + quirk.perfectionist * 15"

// Threshold-based scaling
"$base * (1 + (exp.rust >= 50) * 0.2)"
```

## Evaluation Context

The `EvaluationContext` provides all values needed for expression evaluation:

```typescript
interface EvaluationContext {
  traits: Map<string, number>;      // -100 to +100
  skills: Map<string, number>;      // 0 to 100
  experience: Map<string, number>;  // 0 to 100
  stacks: Map<string, number>;      // 0 to 100
  quirks: Set<string>;              // Active quirk names
  current?: number;                 // For recursive rules
  base: number;                     // Default/starting value
}
```

## Error Handling

The module provides specific error types:

- `LexerError`: Invalid tokens or characters
- `ParseError`: Syntax errors in expressions
- `EvaluationError`: Runtime errors (undefined values, division by zero, etc.)
- `RuleEngineError`: Rule management errors

All errors include position information for debugging.

## Files

| File | Description |
|------|-------------|
| `ast.ts` | AST node types and factory functions |
| `lexer.ts` | Moo-based tokenizer |
| `parser.ts` | Recursive descent parser |
| `evaluator.ts` | Expression evaluator |
| `dependencies.ts` | Dependency analysis and cycle detection |
| `rules.ts` | Rule engine and weighted combination |
| `mod.ts` | Module entry point (re-exports) |

## Design Decisions

1. **Moo for lexing**: Fast, regex-based tokenization with good error messages
2. **Hand-rolled parser**: Full control over precedence, errors, and semantics
3. **Maps for context**: O(1) lookup, easy iteration for wildcards
4. **Quirks as Set**: Boolean semantics (present/absent), efficient membership test
5. **$current/$base**: Enables recursive rules and base value modification
6. **Wildcards in functions**: Aggregate operations across entire namespaces
7. **Comparisons return numbers**: Enables arithmetic combination of conditions
