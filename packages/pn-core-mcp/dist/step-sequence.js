/**
 * Server-side step sequencing (ADR-0025). The engine decides the next step; a caller may only
 * request a step the engine already served or pointed to for this run. Strict gate records must
 * carry a gate_id that workflow_confirm issued, with the verdict it logged.
 */
import { existsSync } from "fs";
import { readFileTail } from "./file-tail.js";
import { isSkepticGateRecord, strictGateRecordsRequired } from "./skeptic-gate-state.js";
const SCAN_BYTES = 786_432;
/** Every step the run log recorded for `runId`, in file order. */
export function readServedSteps(logAbsPath, runId) {
    if (!existsSync(logAbsPath))
        return [];
    const out = [];
    for (const line of readFileTail(logAbsPath, SCAN_BYTES).split("\n")) {
        const t = line.trim();
        if (!t)
            continue;
        let o;
        try {
            o = JSON.parse(t);
        }
        catch {
            continue;
        }
        if (o.runId !== runId || typeof o.workflowType !== "string" || typeof o.step !== "number") {
            continue;
        }
        out.push({
            workflowType: o.workflowType,
            step: o.step,
            nextStep: typeof o.nextStep === "number" ? o.nextStep : null,
            done: o.done === true,
        });
    }
    return out;
}
/**
 * Error text when `step` is not reachable for this run, else undefined.
 * Step 0 always starts (or restarts) a run. Any later step needs the run_id from step 0 and must
 * be a step the engine served or returned as nextStep for this workflow type. One cross-workflow
 * entry exists: full_dev step 5 with tournamentHandoff after implementation_tournament finished.
 */
export function stepSequenceError(opts) {
    const { workflowType, step, state, explicitRunId, served } = opts;
    if (step === 0)
        return undefined;
    if (!explicitRunId) {
        return `Step ${step} needs state.run_id: pass the run_id that step 0 returned. Steps after 0 are served only within a run.`;
    }
    const mine = served.filter((s) => s.workflowType === workflowType);
    const reachable = new Set();
    for (const s of mine) {
        reachable.add(s.step);
        if (s.nextStep != null)
            reachable.add(s.nextStep);
    }
    if (reachable.has(step))
        return undefined;
    if (workflowType === "full_dev" &&
        step === 5 &&
        state.tournamentHandoff === true &&
        served.some((s) => s.workflowType === "implementation_tournament" && s.done)) {
        return undefined;
    }
    const list = [...reachable].sort((a, b) => a - b);
    return list.length === 0
        ? `Step ${step} is not reachable: run ${explicitRunId} has no served ${workflowType} step. Start at step 0.`
        : `Step ${step} is not reachable for run ${explicitRunId}: the engine served or pointed to ${workflowType} steps [${list.join(", ")}]. Call one of those; the engine decides the next step.`;
}
/** gate_id → logged verdict, from the gate log workflow_confirm writes. */
export function readGateVerdicts(gateLogAbsPath) {
    const out = new Map();
    if (!existsSync(gateLogAbsPath))
        return out;
    for (const line of readFileTail(gateLogAbsPath, SCAN_BYTES).split("\n")) {
        const t = line.trim();
        if (!t)
            continue;
        try {
            const o = JSON.parse(t);
            if (typeof o.gate_id === "string") {
                out.set(o.gate_id, typeof o.verdict === "string" ? o.verdict : undefined);
            }
        }
        catch {
            continue;
        }
    }
    return out;
}
const GATE_RECORD_KEYS = ["skepticPassed", "skepticOutputPassed", "reviewComplete"];
/**
 * Under strict gate records, every gate record in state must name a gate_id that
 * workflow_confirm logged, with the same verdict. A record the model wrote itself has no entry.
 */
export function gateRecordProvenanceError(state, verdicts) {
    if (!strictGateRecordsRequired(state))
        return undefined;
    for (const key of GATE_RECORD_KEYS) {
        const val = state[key];
        if (!isSkepticGateRecord(val))
            continue;
        if (!verdicts.has(val.gate_id)) {
            return `${key}.gate_id ${val.gate_id} was not issued by workflow_confirm (not in the gate log). Call workflow_confirm and use the gate_id it returns.`;
        }
        const logged = verdicts.get(val.gate_id);
        if (logged !== undefined && logged !== val.verdict) {
            return `${key}.verdict "${val.verdict}" does not match the verdict "${logged}" logged for gate ${val.gate_id}.`;
        }
    }
    return undefined;
}
