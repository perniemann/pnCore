/**
 * docs/refs/context-index.json: shape, loading, and artifact lifecycle (schema 1.4.0).
 * Historical / superseded artifacts are evidence only; `pointers.current_checkpoint` names the
 * artifact id of the current checkpoint.
 */
export declare const CONTEXT_INDEX_REL = "docs/refs/context-index.json";
export declare const ARTIFACT_TYPES: readonly ["discovery", "plan", "prd", "design", "workflow", "convention"];
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
    verify?: Array<{
        command: string;
        expect: string;
    }>;
};
export declare function readJsonSafe(absPath: string): unknown | null;
export declare function loadContextIndex(cwd?: string): {
    index: ContextIndex | null;
    path: string;
    present: boolean;
};
export declare function isEvidenceOnly(a: {
    lifecycle?: ArtifactLifecycle;
}): boolean;
export declare function currentCheckpointId(index: ContextIndex | null | undefined): string | null;
export type DeclaredCurrent = {
    artifact_id: string;
    run_id: string | null;
};
export declare function declaredCurrent(index: ContextIndex | null | undefined): DeclaredCurrent | null;
/**
 * The historical / superseded artifact a run belongs to, when that run owns no live artifact.
 * A run that also wrote the current checkpoint (or any live entry) is not historical.
 */
export declare function historicalArtifactForRun(index: ContextIndex | null | undefined, runId: string | null): ContextArtifact | undefined;
