import { getResource, getContentVersion } from "./content.js";
import { debug } from "./debug.js";
import { isModelTier, type ModelTier } from "./model-tiers.js";

export type PnCoreFeatures = {
  strictPlanSummary?: boolean;
  mergePhaseFullDev?: boolean;
  truncateSkills?: boolean;
  /** Enable the feature_program workflow type (multi-slice hierarchical orchestration). Default: false (preview). */
  featureProgram?: boolean;
  /**
   * Per-step model-tier override. Key format: `<workflowType>.<step>`
   * (e.g. `"full_dev.2": "premium_thinking"`). Wins over the StepDef default.
   */
  modelTierOverrides?: Record<string, ModelTier>;
  /**
   * Global tier remap. Applied after override resolution. Common use:
   * `{"premium_thinking": "premium"}` for accounts without MAX Mode access.
   */
  tierAliases?: Partial<Record<ModelTier, ModelTier>>;
  strictSkepticGates?: boolean;
};

const DEFAULTS: Required<PnCoreFeatures> = {
  strictPlanSummary: false,
  mergePhaseFullDev: true,
  truncateSkills: true,
  featureProgram: false,
  modelTierOverrides: {},
  tierAliases: {},
  strictSkepticGates: false,
};

// Module-scope cache keyed on content version — ensures flag consistency
// within a tool call while still picking up file edits after a TTL cycle.
let _featuresVersion: number | null = null;
let _featuresCache: Required<PnCoreFeatures> | null = null;

/** Filter an unknown object down to validated entries of Record<string, ModelTier>. */
function sanitizeOverrides(input: unknown): Record<string, ModelTier> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const out: Record<string, ModelTier> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k === "string" && k.includes(".") && isModelTier(v)) out[k] = v;
  }
  return out;
}

/** Filter an unknown object down to validated entries of Partial<Record<ModelTier, ModelTier>>. */
function sanitizeAliases(input: unknown): Partial<Record<ModelTier, ModelTier>> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const out: Partial<Record<ModelTier, ModelTier>> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (isModelTier(k) && isModelTier(v)) out[k] = v;
  }
  return out;
}

export function loadFeatures(): Required<PnCoreFeatures> {
  const version = getContentVersion();
  if (_featuresCache !== null && _featuresVersion === version) return _featuresCache;

  let file: Partial<PnCoreFeatures> = {};
  try {
    const r = getResource("pn-core://config/features.json");
    if (r?.text?.trim()) {
      const p = JSON.parse(r.text) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p)) file = p as Partial<PnCoreFeatures>;
    }
  } catch (err) {
    debug("features", "features.json parse failed", { err: String(err) });
  }
  let envPart: Partial<PnCoreFeatures> = {};
  const raw = process.env.PNCORE_FEATURES?.trim();
  if (raw) {
    try {
      const p = JSON.parse(raw) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p)) envPart = p as Partial<PnCoreFeatures>;
    } catch (err) {
      debug("features", "PNCORE_FEATURES env parse failed", { err: String(err) });
    }
  }
  const overridesFromEnv = sanitizeOverrides(envPart.modelTierOverrides);
  const overridesFromFile = sanitizeOverrides(file.modelTierOverrides);
  const aliasesFromEnv = sanitizeAliases(envPart.tierAliases);
  const aliasesFromFile = sanitizeAliases(file.tierAliases);
  _featuresVersion = version;
  _featuresCache = {
    strictPlanSummary:
      envPart.strictPlanSummary ?? file.strictPlanSummary ?? DEFAULTS.strictPlanSummary,
    mergePhaseFullDev:
      envPart.mergePhaseFullDev ?? file.mergePhaseFullDev ?? DEFAULTS.mergePhaseFullDev,
    truncateSkills: envPart.truncateSkills ?? file.truncateSkills ?? DEFAULTS.truncateSkills,
    featureProgram: envPart.featureProgram ?? file.featureProgram ?? DEFAULTS.featureProgram,
    modelTierOverrides: overridesFromEnv ?? overridesFromFile ?? DEFAULTS.modelTierOverrides,
    tierAliases: aliasesFromEnv ?? aliasesFromFile ?? DEFAULTS.tierAliases,
    strictSkepticGates:
      envPart.strictSkepticGates ?? file.strictSkepticGates ?? DEFAULTS.strictSkepticGates,
  };
  return _featuresCache;
}

/** Env override for strict skeptic gate checks (also features.json.strictSkepticGates). */
export function strictSkepticGatesEnabled(): boolean {
  const env = process.env.PNCORE_STRICT_SKEPTIC_GATES?.trim().toLowerCase();
  if (env === "1" || env === "true" || env === "yes") return true;
  return loadFeatures().strictSkepticGates;
}
