#!/usr/bin/env node
/**
 * Configures git core.hooksPath idempotently.
 * Run via: npm run setup (once after clone).
 */
import { spawnSync } from "child_process";

const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  stdio: "inherit",
  cwd: process.cwd(),
});

if (result.error) {
  console.error("setup-hooks: failed to run git:", result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error("setup-hooks: git config exited with", result.status);
  process.exit(result.status ?? 1);
}

console.log("setup-hooks: git core.hooksPath = .githooks");
