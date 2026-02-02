# Computation Engine

Expression evaluation engine for tyvi's composition system.

## Overview

The computation engine evaluates expressions used in composition rules to derive trait, skill,
experience, and stack values from anchor values.

## Components

### Lexer (`lexer.ts`)

Tokenizes expression strings into tokens for parsing.

```typescript
import { tokenize } from "./lexer.ts";

const tokens = tokenize("trait.caution * 0.5");
// [
//   { type: "identifier", value: "trait", position: 0 },
//   { type: "dot", value: ".", position: 5 },
//   { type: "identifier", value: "caution", position: 6 },
//   { type: "star", value: "*", position: 14 },
//   { type: "number", value: 0.5, position: 16 }
// ]
```

### Parser (`parser.ts`)

Parses tokens into an Abstract Syntax Tree (AST).

```typescript
import { parse } from "./parser.ts";

const ast = parse("trait.caution * 0.5 + 10");
// {
//   type: "binary",
//   operator: "+",
//   left: {
//     type: "binary",
//     operator: "*",
//     left: { type: "reference", category: "trait", name: "caution" },
//     right: { type: "number", value: 0.5 }
//   },
//   right: { type: "number", value: 10 }
// }
```

### AST (`ast.ts`)

Type definitions for AST nodes.

Supported node types:

- `NumberLiteral` - Numeric constants
- `Reference` - References to values (e.g., `trait.caution`, `skill.api-design`)
- `BinaryOp` - Binary operations (`+`, `-`, `*`, `/`)
- `UnaryOp` - Unary operations (`-`)
- `FunctionCall` - Function calls (`avg`, `max`, `min`, `clamp`)

### Evaluator (`evaluator.ts`)

Evaluates AST expressions with a context.

```typescript
import { evaluate } from "./evaluator.ts";
import { parse } from "./parser.ts";

const context = {
  traits: { caution: 60 },
  skills: { "api-design": 75 },
  experience: {},
  stacks: {},
};

const ast = parse("trait.caution * 0.5 + skill.api-design * 0.3");
const result = evaluate(ast, context);
// result === 52.5 (60*0.5 + 75*0.3)
```

Supported functions:

- `avg(...)` - Average of arguments
- `max(...)` - Maximum of arguments
- `min(...)` - Minimum of arguments
- `clamp(value, min, max)` - Clamp value to range

### Dependencies (`dependencies.ts`)

Analyzes dependencies and performs topological sorting.

```typescript
import { extractDependencies, topologicalSort } from "./dependencies.ts";
import { parse } from "./parser.ts";

// Extract dependencies from expression
const ast = parse("trait.caution * 0.5 + skill.api-design");
const deps = extractDependencies(ast);
// ["trait.caution", "skill.api-design"]

// Topologically sort rules
const rules = {
  "trait.detail-focus": "trait.caution * 0.8",
  "trait.caution": "50",
};
const order = topologicalSort(rules);
// ["trait.caution", "trait.detail-focus"]
```

### Rules (`rules.ts`)

Applies composition rules to compute values.

```typescript
import { applyRules } from "./rules.ts";

const rules = [
  { description: "Base", expression: "50", weight: 0.5 },
  { description: "From caution", expression: "trait.caution", weight: 0.5 },
];

const context = {
  traits: { caution: 60 },
  skills: {},
  experience: {},
  stacks: {},
};

const result = applyRules(rules, context);
// result.finalValue === 55 (50*0.5 + 60*0.5)
```

### Quirks (`quirks.ts`)

Auto-assigns quirks based on computed values.

```typescript
import { autoAssignQuirks } from "./quirks.ts";

const quirks = [
  {
    id: "quirk.edge-case-hunter",
    name: "Edge Case Hunter",
    description: "Obsessed with corner cases",
    auto_assign: {
      conditions: [
        { expression: "trait.detail-focus > 70", weight: 1.0 },
      ],
      threshold: 1.0,
    },
  },
];

const context = {
  traits: { "detail-focus": 80 },
  skills: {},
  experience: {},
  stacks: {},
};

const assigned = autoAssignQuirks(quirks, [], context);
// ["quirk.edge-case-hunter"]
```

### Phrases (`phrases.ts`)

Matches phrases based on conditions.

```typescript
import { matchPhrases } from "./phrases.ts";

const phrases = [
  {
    id: "phrase.formal",
    text: "one might say",
    conditions: {
      expressions: [
        { expression: "trait.formality > 60", weight: 1.0 },
      ],
      threshold: 1.0,
    },
  },
];

const context = {
  traits: { formality: 70 },
  skills: {},
  experience: {},
  stacks: {},
};

const matching = matchPhrases(phrases, context);
// ["phrase.formal"]
```

## Expression Language

### References

Reference values by category and name:

- `trait.name` - Trait values (-100 to +100)
- `skill.name` - Skill values (0 to 100)
- `exp.name` or `experience.name` - Experience values (0 to 100)
- `stack.name` - Stack values (0 to 100)

### Operators

- `+` - Addition
- `-` - Subtraction
- `*` - Multiplication
- `/` - Division
- `-expr` - Unary negation
- `>` - Greater than
- `>=` - Greater than or equal
- `<` - Less than
- `<=` - Less than or equal
- `==` - Equal
- `!=` - Not equal

### Functions

- `avg(a, b, ...)` - Average of arguments
- `max(a, b, ...)` - Maximum of arguments
- `min(a, b, ...)` - Minimum of arguments
- `clamp(value, min, max)` - Clamp value to [min, max]

### Examples

```
trait.caution * 0.5
skill.api-design + 10
avg(trait.caution, trait.detail-focus)
max(skill.a, skill.b, skill.c)
clamp(trait.boldness + 20, 0, 100)
(trait.a + trait.b) / 2
trait.detail-focus > 70
skill.api-design >= 80
trait.caution != 50
```

Comparison operators return 1 for true, 0 for false. This allows them to be used in conditions for
quirks and phrases.

## Error Handling

All modules throw descriptive errors:

- **Lexer**: Invalid characters, unexpected tokens
- **Parser**: Syntax errors, unexpected tokens, missing parentheses
- **Evaluator**: Unknown categories, undefined references, division by zero, unknown functions
- **Dependencies**: Circular dependencies

## Usage in Person Computation

The computation engine is used to:

1. Parse composition rules from atom definitions
2. Extract dependencies to build computation order
3. Evaluate expressions to compute derived values
4. Auto-assign quirks based on computed traits/skills
5. Match phrases based on computed values

See `src/people/` for the full person computation pipeline.
