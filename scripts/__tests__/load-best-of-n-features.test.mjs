/**
 * Tests for scripts/load-best-of-n-features.mjs
 * Run: node --test scripts/__tests__/load-best-of-n-features.test.mjs
 */

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

const ORIGINAL_ENV = process.env.PNCORE_FEATURES;

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.PNCORE_FEATURES;
  } else {
    process.env.PNCORE_FEATURES = ORIGINAL_ENV;
  }
});

test("loadBestOfNFeaturesFromConfig defaults autoSelectMinDelta to 0.15", async () => {
  delete process.env.PNCORE_FEATURES;
  const { loadBestOfNFeaturesFromConfig } = await import("../load-best-of-n-features.mjs");
  const features = loadBestOfNFeaturesFromConfig();
  assert.equal(features.autoSelectMinDelta, 0.15);
});

test("PNCORE_FEATURES overrides autoSelectMinDelta", async () => {
  process.env.PNCORE_FEATURES = JSON.stringify({
    bestOfN: { autoSelectMinDelta: 0.25, enabled: true },
  });
  const { loadBestOfNFeaturesFromConfig } = await import("../load-best-of-n-features.mjs");
  const features = loadBestOfNFeaturesFromConfig();
  assert.equal(features.autoSelectMinDelta, 0.25);
  assert.equal(features.enabled, true);
});

test("PNCORE_FEATURES overrides maxCostTier", async () => {
  process.env.PNCORE_FEATURES = JSON.stringify({ bestOfN: { maxCostTier: "fast" } });
  const { loadBestOfNFeaturesFromConfig } = await import("../load-best-of-n-features.mjs");
  const features = loadBestOfNFeaturesFromConfig();
  assert.equal(features.maxCostTier, "fast");
});
