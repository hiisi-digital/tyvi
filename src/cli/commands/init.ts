/**
 * Init command - Initialize a new workspace.
 * @module
 */

import { join } from "@std/path";
import { exists } from "@std/fs";

/**
 * Initialize a new tyvi workspace.
 *
 * @param options - Init options
 */
export async function initCommand(
  options: {
    name?: string;
    namespace?: string;
    minimal?: boolean;
  } = {},
): Promise<void> {
  const cwd = Deno.cwd();
  const configPath = join(cwd, "tyvi.toml");

  // Check if tyvi.toml already exists
  if (await exists(configPath)) {
    console.error("Error: tyvi.toml already exists in this directory.");
    console.error("This directory is already a tyvi workspace.");
    Deno.exit(1);
  }

  // Get workspace name
  const workspaceName = options.name || cwd.split("/").pop() || "workspace";
  const namespace = options.namespace || "@default";

  // Create tyvi.toml
  const workspaceConfig = `[workspace]
name = "${workspaceName}"

[workspace.namespaces]
default = "${namespace}"
paths = ["${namespace}"]

[defaults]
clone_method = "ssh"
fetch_on_status = false
`;

  await Deno.writeTextFile(configPath, workspaceConfig);
  console.log(`✓ Created tyvi.toml`);

  // Create namespace directory
  const namespacePath = join(cwd, namespace);
  await Deno.mkdir(namespacePath, { recursive: true });
  console.log(`✓ Created ${namespace}/`);

  // Create inventory.toml template
  const inventoryPath = join(namespacePath, "inventory.toml");
  const inventoryConfig = options.minimal
    ? `[meta]
description = "Repository inventory"

[[repos]]
name = "example-repo"
remotes = [{ name = "origin", url = "git@github.com:org/repo.git" }]
local_path = "example-repo"
status = "active"
`
    : `[meta]
description = "Repository inventory for ${workspaceName}"
last_updated = "${new Date().toISOString().split("T")[0]}"

[meta.defaults]
language = "typescript"
keep_in_sync = true
status = "active"

# Example repository - replace with your own
[[repos]]
name = "example-repo"
description = "Example repository"
remotes = [
  { name = "origin", url = "git@github.com:org/repo.git", host = "github" }
]
local_path = "example-repo"
category = "apps"
status = "active"
keep_in_sync = true

# Add more repositories below:
# [[repos]]
# name = "my-repo"
# remotes = [{ name = "origin", url = "git@github.com:org/my-repo.git" }]
# local_path = "category/my-repo"
`;

  await Deno.writeTextFile(inventoryPath, inventoryConfig);
  console.log(`✓ Created ${namespace}/inventory.toml`);

  console.log("");
  console.log("Workspace initialized successfully!");
  console.log("");
  console.log("Next steps:");
  console.log(`  1. Edit ${namespace}/inventory.toml to add your repositories`);
  console.log("  2. Run 'tyvi clone --all' to clone all repositories");
  console.log("  3. Run 'tyvi status' to see the status of all repositories");
}
