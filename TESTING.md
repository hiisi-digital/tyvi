# Manual Testing Guide

Since Deno is not available in the CI environment, here's how to manually test tyvi:

## Prerequisites

```bash
# Install Deno
curl -fsSL https://deno.land/install.sh | sh
```

## Type Checking

```bash
deno check mod.ts
```

This should pass without errors.

## Running Tests

```bash
deno test --allow-read --allow-write --allow-run
```

Expected: All tests pass.

## Testing CLI Commands

### 1. Test Init Command

```bash
mkdir /tmp/test-workspace
cd /tmp/test-workspace
deno run --allow-read --allow-write ../src/cli/mod.ts init
```

Expected:
- Creates `tyvi.toml`
- Creates `@default/` directory
- Creates `@default/inventory.toml`

### 2. Test List Command

```bash
cd /tmp/test-workspace
deno run --allow-read ../src/cli/mod.ts list
```

Expected:
- Shows the example-repo from inventory
- Displays "- @default/example-repo (example-repo)"

### 3. Test Status Command

```bash
cd /tmp/test-workspace
deno run --allow-read --allow-run ../src/cli/mod.ts status
```

Expected:
- Shows all repos with status
- Indicates example-repo is not cloned

### 4. Test Add Command

```bash
cd /tmp/test-workspace
deno run --allow-read --allow-write ../src/cli/mod.ts add git@github.com:denoland/deno.git --category tools
```

Expected:
- Adds deno to inventory
- Shows success message

### 5. Test Clone Command (if git available)

```bash
cd /tmp/test-workspace
deno run --allow-read --allow-write --allow-run ../src/cli/mod.ts clone deno
```

Expected:
- Clones the deno repository to @default/tools/deno
- Shows clone progress

### 6. Test Sync Command

```bash
cd /tmp/test-workspace
deno run --allow-read --allow-write --allow-run ../src/cli/mod.ts sync
```

Expected:
- Verifies workspace structure
- Shows "✓ Workspace is in sync."

### 7. Test Remove Command

```bash
cd /tmp/test-workspace
deno run --allow-read --allow-write ../src/cli/mod.ts remove example-repo
```

Expected:
- Removes example-repo from inventory
- Shows success message

## Verifying Error Handling

### Test Missing Workspace

```bash
cd /tmp
deno run --allow-read ../src/cli/mod.ts status
```

Expected:
- Error: "No tyvi.toml found in /tmp or parent directories."
- Suggests: "Run 'tyvi init' to create a workspace."

### Test Invalid Config

Create an invalid config and test parsing:

```bash
echo "invalid = toml" > /tmp/test-workspace/tyvi.toml
deno run --allow-read ../src/cli/mod.ts status
```

Expected:
- Clear error message about malformed config
- Suggests how to fix it

## Code Quality Checks

### Linting

```bash
deno lint
```

Expected: No linting errors.

### Formatting

```bash
deno fmt --check
```

Expected: All files properly formatted.

## Integration Test Workflow

Full workflow test:

```bash
# Clean slate
rm -rf /tmp/tyvi-integration-test
mkdir /tmp/tyvi-integration-test
cd /tmp/tyvi-integration-test

# Initialize
deno run --allow-read --allow-write /path/to/tyvi/src/cli/mod.ts init

# Add repos
deno run --allow-read --allow-write /path/to/tyvi/src/cli/mod.ts add denoland/deno --category tools
deno run --allow-read --allow-write /path/to/tyvi/src/cli/mod.ts add denoland/std --category libs

# List
deno run --allow-read /path/to/tyvi/src/cli/mod.ts list

# Clone all
deno run --allow-read --allow-write --allow-run /path/to/tyvi/src/cli/mod.ts clone --all

# Status
deno run --allow-read --allow-run /path/to/tyvi/src/cli/mod.ts status

# Sync
deno run --allow-read --allow-write --allow-run /path/to/tyvi/src/cli/mod.ts sync --fetch
```

Expected: All commands work without errors.
