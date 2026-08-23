import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyRootPiManifest,
  validateRootPiManifest,
  ROOT_PI_SKILLS,
  ROOT_PI_EXTENSIONS,
} from "../pi-package-manifest.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("applyRootPiManifest adds pi-package keyword and extension paths (no flat prompts)", () => {
  const out = applyRootPiManifest({ name: "pn-core", version: "0.15.1" });
  assert.ok(out.keywords.includes("pi-package"));
  assert.deepEqual(out.pi, {
    skills: [ROOT_PI_SKILLS],
    extensions: [ROOT_PI_EXTENSIONS],
  });
  assert.equal(out.pi.prompts, undefined);
});

test("root package.json has valid pi manifest after sync", () => {
  const fails = validateRootPiManifest(repoRoot);
  assert.deepEqual(fails, [], fails.join("; "));
});

test("root package.json pi block matches expected paths", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  assert.equal(pkg.pi.skills[0], ROOT_PI_SKILLS);
  assert.equal(pkg.pi.extensions[0], ROOT_PI_EXTENSIONS);
  assert.equal(pkg.pi.prompts, undefined);
});

test("plugin package.json version matches root", () => {
  const root = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const plugin = JSON.parse(
    readFileSync(join(repoRoot, "plugins", "pnCore", "package.json"), "utf8")
  );
  assert.equal(plugin.version, root.version);
});
