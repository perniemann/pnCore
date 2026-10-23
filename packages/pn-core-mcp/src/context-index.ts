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
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export type AuthoredStatus = string | null | undefined;

export type ArtifactLifecycle = "current" | "historical" | "superseded";

export type ContextArtifact = {
  id: string;
  type: ArtifactType;
  path: string;
  tracker?: string | null;
  authored_status?: AuthoredStatus;
  run_id?: string | null;
  lifecycle?: ArtifactLifecycle;
  superseded_by?: string;
};

export type ContextIndex = {
  version: string;
  last_reviewed: string;
  pointers?: Record<string, string | null | undefined>;
  artifacts?: ContextArtifact[];
  acceptance_criteria_ids?: string[];
  verify?: Array<{ command: string; expect: string }>;
};

export function readJsonSafe(absPath: string): unknown | null {
  if (!existsSync(absPath)) return null;
  try {
    return JSON.parse(readFileSync(absPath, "utf-8")) as unknown;
  } catch {
    return null;
  }
}

export function loadContextIndex(cwd: string = process.cwd()): {
  index: ContextIndex | null;
  path: string;
  present: boolean;
} {
  const raw = readJsonSafe(join(cwd, CONTEXT_INDEX_REL));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { index: null, path: CONTEXT_INDEX_REL, present: false };
  }
  return { index: raw as ContextIndex, path: CONTEXT_INDEX_REL, present: true };
}

export function isEvidenceOnly(a: { lifecycle?: ArtifactLifecycle }): boolean {
  return a.lifecycle === "historical" || a.lifecycle === "superseded";
}

function indexArtifacts(index: ContextIndex | null | undefined): ContextArtifact[] {
  return Array.isArray(index?.artifacts)
    ? index!.artifacts!.filter((a) => !!a && typeof a === "object")
    : [];
}

export function currentCheckpointId(index: ContextIndex | null | undefined): string | null {
  const id = index?.pointers?.current_checkpoint;
  return typeof id === "string" && id !== "" ? id : null;
}

export type DeclaredCurrent = { artifact_id: string; run_id: string | null };

export function declaredCurrent(index: ContextIndex | null | undefined): DeclaredCurrent | null {
  const id = currentCheckpointId(index);
  if (!id) return null;
  const artifact = indexArtifacts(index).find((a) => a.id === id);
  const runId = typeof artifact?.run_id === "string" ? artifact.run_id.trim() : "";
  return { artifact_id: id, run_id: runId || null };
}

/**
 * The historical / superseded artifact a run belongs to, when that run owns no live artifact.
 * A run that also wrote the current checkpoint (or any live entry) is not historical.
 */
export function historicalArtifactForRun(
  index: ContextIndex | null | undefined,
  runId: string | null
): ContextArtifact | undefined {
  if (!runId) return undefined;
  const owned = indexArtifacts(index).filter(
    (a) => typeof a.run_id === "string" && a.run_id.trim() === runId
  );
  if (owned.some((a) => !isEvidenceOnly(a))) return undefined;
  return owned.find(isEvidenceOnly);
}
