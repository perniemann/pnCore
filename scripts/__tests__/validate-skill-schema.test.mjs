/**
 * Unit tests for broad-WHEN description lint (ADR-0017).
 * Invoke with: node --test scripts/__tests__/validate-skill-schema.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { descriptionHasBroadWhen } from "../validate-skill-schema.mjs";

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
