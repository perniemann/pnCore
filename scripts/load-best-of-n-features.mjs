/**
 * Read bestOfN feature flags from features.json + PNCORE_FEATURES (env wins).
 * Mirrors packages/pn-core-mcp/src/features.ts merge for script-side tooling.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const FEATURES_PATH = resolve(
  __dir,
  "..",
  "packages",
  "pn-core-mcp",
  "content",
  "config",
  "features.json"
);

const DEFAULTS = {
  enabled: false,
  defaultN: 2,
  autoSelectMinDelta: 0.15,
  maxCostTier: "standard",
};

/** @param {unknown} input */
function sanitizeBestOfN(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const o = /** @type {Record<string, unknown>} */ (input);
  /** @type {Record<string, unknown>} */
  const out = {};
  if (typeof o.enabled === "boolean") out.enabled = o.enabled;
  if (typeof o.defaultN === "number" && o.defaultN >= 2 && o.defaultN <= 3) {
    out.defaultN = Math.floor(o.defaultN);
  }
  if (typeof o.autoSelectMinDelta === "number" && o.autoSelectMinDelta >= 0) {
    out.autoSelectMinDelta = o.autoSelectMinDelta;
  }
  if (typeof o.maxCostTier === "string") out.maxCostTier = o.maxCostTier;
  return out;
}

/** @returns {typeof DEFAULTS} */
export function loadBestOfNFeaturesFromConfig() {
  /** @type {Record<string, unknown>} */
  let filePart = {};
  try {
    const parsed = JSON.parse(readFileSync(FEATURES_PATH, "utf-8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      filePart = sanitizeBestOfN(parsed.bestOfN);
    }
  } catch {
    // missing or invalid features.json — use defaults
  }

  /** @type {Record<string, unknown>} */
  let envPart = {};
  const raw = process.env.PNCORE_FEATURES?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        envPart = sanitizeBestOfN(parsed.bestOfN);
      }
    } catch {
      // ignore invalid env JSON
    }
  }

  return {
    enabled: /** @type {boolean} */ (envPart.enabled ?? filePart.enabled ?? DEFAULTS.enabled),
    defaultN: /** @type {number} */ (envPart.defaultN ?? filePart.defaultN ?? DEFAULTS.defaultN),
    autoSelectMinDelta: /** @type {number} */ (
      envPart.autoSelectMinDelta ?? filePart.autoSelectMinDelta ?? DEFAULTS.autoSelectMinDelta
    ),
    maxCostTier: /** @type {string} */ (
      envPart.maxCostTier ?? filePart.maxCostTier ?? DEFAULTS.maxCostTier
    ),
  };
}
