import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyRootPiManifest,
  validateRootPiManifest,
  ROOT_PI_PROMPTS,
  ROOT_PI_SKILLS,
} from "../pi-package-manifest.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("applyRootPiManifest adds pi-package keyword and plugin paths", () => {
  const out = applyRootPiManifest({ name: "pn-core", version: "0.15.1" });
  assert.ok(out.keywords.includes("pi-package"));
  assert.deepEqual(out.pi, {
    prompts: [ROOT_PI_PROMPTS],
    skills: [ROOT_PI_SKILLS],
  });
});

test("root package.json has valid pi manifest after sync", () => {
  const fails = validateRootPiManifest(repoRoot);
  assert.deepEqual(fails, [], fails.join("; "));
});

test("root package.json pi block matches expected paths", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  assert.equal(pkg.pi.prompts[0], ROOT_PI_PROMPTS);
  assert.equal(pkg.pi.skills[0], ROOT_PI_SKILLS);
});
