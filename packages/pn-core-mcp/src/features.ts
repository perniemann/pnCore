import { getResource, getContentVersion } from "./content.js";
import { debug } from "./debug.js";
import { isModelTier, type ModelTier } from "./model-tiers.js";

export type BestOfNFeatures = {
  /** Enable workflow_step('implementation_tournament', …). Default: false until P2 validated. */
  enabled?: boolean;
  /** Default fan-out count (2 or 3). */
  defaultN?: number;
  /** Auto-select winner when top-two LLM score delta >= this value. */
  autoSelectMinDelta?: number;
  /** Cap builder subagent tier during tournament fan-out. */
  maxCostTier?: ModelTier;
};

export type PnCoreFeatures = {
  strictPlanSummary?: boolean;
  mergePhaseFullDev?: boolean;
  truncateSkills?: boolean;
  /** Enable the feature_program workflow type (multi-slice hierarchical orchestration). Default: false (preview). */
  featureProgram?: boolean;
  /** Best-of-N tournament workflow (implementation_tournament). See ADR-0006. */
  bestOfN?: BestOfNFeatures;
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

const DEFAULT_BEST_OF_N: Required<BestOfNFeatures> = {
  enabled: false,
  defaultN: 2,
  autoSelectMinDelta: 0.15,
  maxCostTier: "standard",
};

const DEFAULTS: Required<PnCoreFeatures> = {
  strictPlanSummary: false,
  mergePhaseFullDev: true,
  truncateSkills: true,
  featureProgram: false,
  bestOfN: DEFAULT_BEST_OF_N,
  modelTierOverrides: {},
  tierAliases: {},
  strictSkepticGates: false,
};

// Module-scope cache keyed on content version — ensures flag consistency
// within a tool call while still picking up file edits after a TTL cycle.
let _featuresVersion: number | null = null;
export type ResolvedPnCoreFeatures = Omit<Required<PnCoreFeatures>, "bestOfN"> & {
  bestOfN: Required<BestOfNFeatures>;
};

let _featuresCache: ResolvedPnCoreFeatures | null = null;

/** Filter an unknown object down to validated entries of Record<string, ModelTier>. */
function sanitizeOverrides(input: unknown): Record<string, ModelTier> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const out: Record<string, ModelTier> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k === "string" && k.includes(".") && isModelTier(v)) out[k] = v;
  }
  return out;
}

function sanitizeBestOfN(input: unknown): BestOfNFeatures | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const o = input as Record<string, unknown>;
  const out: BestOfNFeatures = {};
  if (typeof o.enabled === "boolean") out.enabled = o.enabled;
  if (typeof o.defaultN === "number" && o.defaultN >= 2 && o.defaultN <= 3) {
    out.defaultN = Math.floor(o.defaultN);
  }
  if (typeof o.autoSelectMinDelta === "number" && o.autoSelectMinDelta >= 0) {
    out.autoSelectMinDelta = o.autoSelectMinDelta;
  }
  if (isModelTier(o.maxCostTier)) out.maxCostTier = o.maxCostTier;
  return Object.keys(out).length > 0 ? out : undefined;
}

function mergeBestOfN(
  env: BestOfNFeatures | undefined,
  file: BestOfNFeatures | undefined
): Required<BestOfNFeatures> {
  return {
    enabled: env?.enabled ?? file?.enabled ?? DEFAULT_BEST_OF_N.enabled,
    defaultN: env?.defaultN ?? file?.defaultN ?? DEFAULT_BEST_OF_N.defaultN,
    autoSelectMinDelta:
      env?.autoSelectMinDelta ?? file?.autoSelectMinDelta ?? DEFAULT_BEST_OF_N.autoSelectMinDelta,
    maxCostTier: env?.maxCostTier ?? file?.maxCostTier ?? DEFAULT_BEST_OF_N.maxCostTier,
  };
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

export function loadFeatures(): ResolvedPnCoreFeatures {
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
  const bestOfNFromEnv = sanitizeBestOfN(envPart.bestOfN);
  const bestOfNFromFile = sanitizeBestOfN(file.bestOfN);
  _featuresVersion = version;
  _featuresCache = {
    strictPlanSummary:
      envPart.strictPlanSummary ?? file.strictPlanSummary ?? DEFAULTS.strictPlanSummary,
    mergePhaseFullDev:
      envPart.mergePhaseFullDev ?? file.mergePhaseFullDev ?? DEFAULTS.mergePhaseFullDev,
    truncateSkills: envPart.truncateSkills ?? file.truncateSkills ?? DEFAULTS.truncateSkills,
    featureProgram: envPart.featureProgram ?? file.featureProgram ?? DEFAULTS.featureProgram,
    bestOfN: mergeBestOfN(bestOfNFromEnv, bestOfNFromFile),
    modelTierOverrides: overridesFromEnv ?? overridesFromFile ?? DEFAULTS.modelTierOverrides,
    tierAliases: aliasesFromEnv ?? aliasesFromFile ?? DEFAULTS.tierAliases,
    strictSkepticGates:
      envPart.strictSkepticGates ?? file.strictSkepticGates ?? DEFAULTS.strictSkepticGates,
  };
  return _featuresCache;
}

/** Resolved best-of-N config (always populated after loadFeatures). */
export function loadBestOfNFeatures(): Required<BestOfNFeatures> {
  return loadFeatures().bestOfN;
}

/** Env override for strict skeptic gate checks (also features.json.strictSkepticGates). */
export function strictSkepticGatesEnabled(): boolean {
  const env = process.env.PNCORE_STRICT_SKEPTIC_GATES?.trim().toLowerCase();
  if (env === "1" || env === "true" || env === "yes") return true;
  return loadFeatures().strictSkepticGates;
}
