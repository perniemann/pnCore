/**
 * docs/refs/context-index.json: shape, loading, and artifact lifecycle (schema 1.4.0).
 * Historical / superseded artifacts are evidence only; `pointers.current_checkpoint` names the
 * artifact id of the current checkpoint.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
export const CONTEXT_INDEX_REL = "docs/refs/context-index.json";
export const ARTIFACT_TYPES = [
    "discovery",
    "plan",
    "prd",
    "design",
    "workflow",
    "convention",
];
export function readJsonSafe(absPath) {
    if (!existsSync(absPath))
        return null;
    try {
        return JSON.parse(readFileSync(absPath, "utf-8"));
    }
    catch {
        return null;
    }
}
export function loadContextIndex(cwd = process.cwd()) {
    const raw = readJsonSafe(join(cwd, CONTEXT_INDEX_REL));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return { index: null, path: CONTEXT_INDEX_REL, present: false };
    }
    return { index: raw, path: CONTEXT_INDEX_REL, present: true };
}
export function isEvidenceOnly(a) {
    return a.lifecycle === "historical" || a.lifecycle === "superseded";
}
function indexArtifacts(index) {
    return Array.isArray(index?.artifacts)
        ? index.artifacts.filter((a) => !!a && typeof a === "object")
        : [];
}
export function currentCheckpointId(index) {
    const id = index?.pointers?.current_checkpoint;
    return typeof id === "string" && id !== "" ? id : null;
}
export function declaredCurrent(index) {
    const id = currentCheckpointId(index);
    if (!id)
        return null;
    const artifact = indexArtifacts(index).find((a) => a.id === id);
    const runId = typeof artifact?.run_id === "string" ? artifact.run_id.trim() : "";
    return { artifact_id: id, run_id: runId || null };
}
/**
 * The historical / superseded artifact a run belongs to, when that run owns no live artifact.
 * A run that also wrote the current checkpoint (or any live entry) is not historical.
 */
export function historicalArtifactForRun(index, runId) {
    if (!runId)
        return undefined;
    const owned = indexArtifacts(index).filter((a) => typeof a.run_id === "string" && a.run_id.trim() === runId);
    if (owned.some((a) => !isEvidenceOnly(a)))
        return undefined;
    return owned.find(isEvidenceOnly);
}
