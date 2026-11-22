/**
 * Server-side step sequencing (ADR-0025). The engine decides the next step; a caller may only
 * request a step the engine already served or pointed to for this run. Strict gate records must
 * carry a gate_id that workflow_confirm issued, with the verdict it logged.
 */
export type ServedStep = {
    workflowType: string;
    step: number;
    nextStep: number | null;
    done: boolean;
};
/** Every step the run log recorded for `runId`, in file order. */
export declare function readServedSteps(logAbsPath: string, runId: string): ServedStep[];
/**
 * Error text when `step` is not reachable for this run, else undefined.
 * Step 0 always starts (or restarts) a run. Any later step needs the run_id from step 0 and must
 * be a step the engine served or returned as nextStep for this workflow type. One cross-workflow
 * entry exists: full_dev step 5 with tournamentHandoff after implementation_tournament finished.
 */
export declare function stepSequenceError(opts: {
    workflowType: string;
    step: number;
    state: Record<string, unknown>;
    explicitRunId: string | undefined;
    served: ServedStep[];
}): string | undefined;
export type GateLogEntry = {
    gate_id: string;
    verdict?: string;
};
/** gate_id → logged verdict, from the gate log workflow_confirm writes. */
export declare function readGateVerdicts(gateLogAbsPath: string): Map<string, string | undefined>;
/**
 * Under strict gate records, every gate record in state must name a gate_id that
 * workflow_confirm logged, with the same verdict. A record the model wrote itself has no entry.
 */
export declare function gateRecordProvenanceError(state: Record<string, unknown>, verdicts: Map<string, string | undefined>): string | undefined;
