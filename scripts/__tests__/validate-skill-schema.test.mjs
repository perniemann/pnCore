/**
 * Unit tests for broad-WHEN description lint (ADR-0017).
 * Invoke with: node --test scripts/__tests__/validate-skill-schema.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  descriptionHasBroadWhen,
  descriptionOverCharCap,
  newSkillOverCapErrors,
} from "../validate-skill-schema.mjs";

test("descriptionHasBroadWhen flags OpenAI-style over-trigger WHEN", () => {
  assert.equal(
    descriptionHasBroadWhen(
      "Create and validate Postgres schema migrations. Use when working with databases, queries, models, or persistence."
    ),
    true
  );
  assert.equal(descriptionHasBroadWhen("Mandatory before scaffold or implementation plan."), true);
  assert.equal(descriptionHasBroadWhen("Use this anytime you touch the API layer."), true);
  assert.equal(descriptionHasBroadWhen("Use whenever you edit models or persistence."), true);
});

test("descriptionHasBroadWhen accepts a tight WHEN", () => {
  assert.equal(
    descriptionHasBroadWhen(
      "Create and validate Postgres schema migrations. Use when adding or changing a migration, or reviewing its rollout."
    ),
    false
  );
  assert.equal(
    descriptionHasBroadWhen(
      "Search GitHub/npm for existing solutions and recommend adapt vs build. Use when comparing candidates before a new scaffold or implementation plan — not for ordinary feature edits in an existing codebase."
    ),
    false
  );
});

test("descriptionOverCharCap flags descriptions over 220 chars", () => {
  assert.equal(descriptionOverCharCap("short"), false);
  assert.equal(descriptionOverCharCap("x".repeat(220)), false);
  assert.equal(descriptionOverCharCap("x".repeat(221)), true);
});

test("newSkillOverCapErrors errors only for added canonical SKILL.md over 220 chars", () => {
  const root = mkdtempSync(join(tmpdir(), "pn-skill-cap-"));
  const rel = "packages/pn-core-mcp/content/skills/discipline/pn-tmp-cap-gate/SKILL.md";
  mkdirSync(join(root, "packages/pn-core-mcp/content/skills/discipline/pn-tmp-cap-gate"), {
    recursive: true,
  });
  try {
    writeFileSync(
      join(root, rel),
      `---\nname: pn-tmp-cap-gate\ndescription: "${"x".repeat(221)}"\n---\n\n## When to use\n\n- test\n`
    );
    const over = newSkillOverCapErrors([rel, "docs/not-a-skill.md"], { root });
    assert.equal(over.length, 1);
    assert.match(over[0], /new skill description is 221 chars/);

    writeFileSync(
      join(root, rel),
      `---\nname: pn-tmp-cap-gate\ndescription: "${"y".repeat(220)}"\n---\n\n## When to use\n\n- test\n`
    );
    assert.deepEqual(newSkillOverCapErrors([rel], { root }), []);
    assert.deepEqual(newSkillOverCapErrors(["README.md"], { root }), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
