import { getResource, getContentVersion } from "./content.js";
import { debug } from "./debug.js";
import { isModelTier } from "./model-tiers.js";
const DEFAULTS = {
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
let _featuresVersion = null;
let _featuresCache = null;
/** Filter an unknown object down to validated entries of Record<string, ModelTier>. */
function sanitizeOverrides(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
        return undefined;
    const out = {};
    for (const [k, v] of Object.entries(input)) {
        if (typeof k === "string" && k.includes(".") && isModelTier(v))
            out[k] = v;
    }
    return out;
}
/** Filter an unknown object down to validated entries of Partial<Record<ModelTier, ModelTier>>. */
function sanitizeAliases(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
        return undefined;
    const out = {};
    for (const [k, v] of Object.entries(input)) {
        if (isModelTier(k) && isModelTier(v))
            out[k] = v;
    }
    return out;
}
export function loadFeatures() {
    const version = getContentVersion();
    if (_featuresCache !== null && _featuresVersion === version)
        return _featuresCache;
    let file = {};
    try {
        const r = getResource("pn-core://config/features.json");
        if (r?.text?.trim()) {
            const p = JSON.parse(r.text);
            if (p && typeof p === "object" && !Array.isArray(p))
                file = p;
        }
    }
    catch (err) {
        debug("features", "features.json parse failed", { err: String(err) });
    }
    let envPart = {};
    const raw = process.env.PNCORE_FEATURES?.trim();
    if (raw) {
        try {
            const p = JSON.parse(raw);
            if (p && typeof p === "object" && !Array.isArray(p))
                envPart = p;
        }
        catch (err) {
            debug("features", "PNCORE_FEATURES env parse failed", { err: String(err) });
        }
    }
    const overridesFromEnv = sanitizeOverrides(envPart.modelTierOverrides);
    const overridesFromFile = sanitizeOverrides(file.modelTierOverrides);
    const aliasesFromEnv = sanitizeAliases(envPart.tierAliases);
    const aliasesFromFile = sanitizeAliases(file.tierAliases);
    _featuresVersion = version;
    _featuresCache = {
        strictPlanSummary: envPart.strictPlanSummary ?? file.strictPlanSummary ?? DEFAULTS.strictPlanSummary,
        mergePhaseFullDev: envPart.mergePhaseFullDev ?? file.mergePhaseFullDev ?? DEFAULTS.mergePhaseFullDev,
        truncateSkills: envPart.truncateSkills ?? file.truncateSkills ?? DEFAULTS.truncateSkills,
        featureProgram: envPart.featureProgram ?? file.featureProgram ?? DEFAULTS.featureProgram,
        modelTierOverrides: overridesFromEnv ?? overridesFromFile ?? DEFAULTS.modelTierOverrides,
        tierAliases: aliasesFromEnv ?? aliasesFromFile ?? DEFAULTS.tierAliases,
        strictSkepticGates: envPart.strictSkepticGates ?? file.strictSkepticGates ?? DEFAULTS.strictSkepticGates,
    };
    return _featuresCache;
}
/** Env override for strict skeptic gate checks (also features.json.strictSkepticGates). */
export function strictSkepticGatesEnabled() {
    const env = process.env.PNCORE_STRICT_SKEPTIC_GATES?.trim().toLowerCase();
    if (env === "1" || env === "true" || env === "yes")
        return true;
    return loadFeatures().strictSkepticGates;
}
