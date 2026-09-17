/**
 * Step spans (ADR-0020): answer *where* a workflow run spent its time.
 *
 * Every `workflow_step` call is one span in a run. The span carries a monotonic `stepIndex`
 * per run_id, `sinceLastStepMs` (agent wall time since the previous step of the same run —
 * the time the agent spent doing the previous step's work), and `engineMs` (time inside
 * `getWorkflowStep` and gate checks). `get_*` loads are tagged with the stepIndex they were
 * made under, so a timeline can show which skills each step pulled.
 *
 * The cursor per run_id lives in memory (one MCP server process per session) and is
 * recovered from the run-log tail when a run_id is first seen after a restart.
 *
 * `buildRunTimeline` joins the five `.pncore/*.jsonl` trails by run_id and time window into
 * one per-step view; `workflow_run_query` exposes it.
 */
import { existsSync } from "fs";
import { readFileTail } from "./file-tail.js";
import { resolveSafePath } from "./safe-path.js";
import { parseRunLog } from "./trajectory.js";
/** Default path per trail, honouring the same env overrides the writers use. */
export function trailPaths(env = process.env) {
    return {
        steps: env.PNCORE_RUN_LOG || ".pncore/workflow-runs.jsonl",
        loads: ".pncore/skill-load-log.jsonl",
        usage: ".pncore/usage.jsonl",
        handoff: env.PNCORE_HANDOFF_LOG ?? ".pncore/workflow-handoff.jsonl",
        gate: ".pncore/gate-log.jsonl",
        events: env.PNCORE_RUN_EVENTS_PATH ?? ".pncore/run-events.jsonl",
    };
}
export const TRAIL_SCAN_MAX = 786_432;
/**
 * Tail-read one JSONL trail and return the records for `runId` (matching `run_id` or `runId`),
 * in file order. Unsafe paths return an error; a missing file returns an empty list.
 */
export function readTrail(relPath, runId, opts = {}) {
    const safe = resolveSafePath(relPath);
    if ("error" in safe)
        return { error: safe.error };
    if (!existsSync(safe.resolved))
        return { records: [], path: safe.resolved };
    const raw = readFileTail(safe.resolved, opts.scanMax ?? TRAIL_SCAN_MAX);
    const records = [];
    for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t)
            continue;
        try {
            const o = JSON.parse(t);
            if (o.run_id !== runId && o.runId !== runId)
                continue;
            records.push({ ...o, ts: typeof o.ts === "string" ? o.ts : "" });
        }
        catch {
            /* partial or malformed line */
        }
    }
    return { records, path: safe.resolved };
}
const cursors = new Map();
/** Test hook: forget every in-memory cursor. */
export function resetStepSpans() {
    cursors.clear();
}
/** Rebuild the cursor for `runId` from the run-log tail (after a server restart). */
export function recoverCursorFromLog(runId, logPath) {
    const r = readTrail(logPath, runId);
    if ("error" in r || r.records.length === 0)
        return null;
    const { entries } = parseRunLog(r.records.map((x) => JSON.stringify(x)).join("\n"));
    const mine = entries.filter((e) => e.runId === runId);
    if (mine.length === 0)
        return null;
    let maxIndex = -1;
    let lastTsMs = 0;
    mine.forEach((e, i) => {
        const idx = typeof e.stepIndex === "number" ? e.stepIndex : i;
        if (idx > maxIndex)
            maxIndex = idx;
        const ms = Date.parse(e.ts);
        if (Number.isFinite(ms) && ms > lastTsMs)
            lastTsMs = ms;
    });
    return { stepIndex: maxIndex, lastTsMs };
}
/**
 * Open the span for the next `workflow_step` call of `runId`: advances the cursor and returns
 * the monotonic stepIndex plus the wall time since the previous step.
 */
export function beginStepSpan(runId, opts = {}) {
    const nowMs = opts.nowMs ?? Date.now();
    let cursor = cursors.get(runId);
    if (!cursor && opts.logPath)
        cursor = recoverCursorFromLog(runId, opts.logPath) ?? undefined;
    const stepIndex = cursor ? cursor.stepIndex + 1 : 0;
    const sinceLastStepMs = cursor ? Math.max(0, nowMs - cursor.lastTsMs) : null;
    cursors.set(runId, { stepIndex, lastTsMs: nowMs });
    return { stepIndex, sinceLastStepMs };
}
/** stepIndex of the most recent `workflow_step` seen for `runId` in this process, if any. */
export function currentStepIndex(runId) {
    if (!runId)
        return undefined;
    return cursors.get(runId)?.stepIndex;
}
/** Round engine timings to 0.01 ms; sub-microsecond noise is not information. */
export function roundMs(ms) {
    return Math.round(ms * 100) / 100;
}
function tsMs(ts) {
    const ms = Date.parse(ts);
    return Number.isFinite(ms) ? ms : Number.NaN;
}
/** Index of the last step whose ts <= record ts (records without a usable ts go to the last step). */
function stepIndexForTs(stepTsMs, ts) {
    const ms = tsMs(ts);
    if (!Number.isFinite(ms) || stepTsMs.length === 0)
        return stepTsMs.length - 1;
    let idx = -1;
    for (let i = 0; i < stepTsMs.length; i++) {
        if (stepTsMs[i] <= ms)
            idx = i;
        else
            break;
    }
    return idx < 0 ? 0 : idx;
}
/** Join the trails for one run into a per-step timeline. Pure. */
export function buildRunTimeline(runId, trails) {
    const stepsSorted = [...trails.steps].sort((a, b) => a.ts.localeCompare(b.ts));
    const steps = stepsSorted.map((e, i) => ({
        stepIndex: typeof e.stepIndex === "number" ? e.stepIndex : i,
        ts: e.ts,
        step: e.step,
        nextStep: e.nextStep,
        gate: e.gate,
        done: e.done,
        ...(e.workflowPhase ? { workflowPhase: e.workflowPhase } : {}),
        ...(e.parallel ? { parallel: true } : {}),
        ...(e.taskIds ? { taskIds: e.taskIds } : {}),
        sinceLastStepMs: typeof e.sinceLastStepMs === "number" ? e.sinceLastStepMs : null,
        engineMs: typeof e.engineMs === "number" ? e.engineMs : null,
        stateKeys: e.stateKeys,
        loads: [],
        verify: 0,
        handoff: null,
        usage: null,
        gates: 0,
    }));
    const stepTs = steps.map((s) => tsMs(s.ts));
    const byIndex = new Map(steps.map((s, i) => [s.stepIndex, i]));
    const slot = (rec) => {
        if (steps.length === 0)
            return undefined;
        if (typeof rec.stepIndex === "number" && byIndex.has(rec.stepIndex)) {
            return steps[byIndex.get(rec.stepIndex)];
        }
        return steps[stepIndexForTs(stepTs, rec.ts)];
    };
    for (const l of trails.loads ?? []) {
        const s = slot(l);
        if (s)
            s.loads.push({ ts: l.ts, tool: String(l.tool ?? ""), id: String(l.id ?? "") });
    }
    for (const u of trails.usage ?? []) {
        const s = slot(u);
        if (!s)
            continue;
        const it = typeof u.inputTokens === "number" ? u.inputTokens : 0;
        const ot = typeof u.outputTokens === "number" ? u.outputTokens : 0;
        s.usage = {
            inputTokens: (s.usage?.inputTokens ?? 0) + it,
            outputTokens: (s.usage?.outputTokens ?? 0) + ot,
        };
    }
    for (const h of trails.handoff ?? []) {
        const s = slot(h);
        if (s && typeof h.summary === "string")
            s.handoff = h.summary.slice(0, 200);
    }
    for (const g of trails.gate ?? []) {
        const s = slot(g);
        if (s)
            s.gates += 1;
    }
    let accepted = null;
    for (const ev of trails.events ?? []) {
        if (ev.kind === "verify") {
            const s = slot(ev);
            if (s)
                s.verify += 1;
        }
        else if (ev.kind === "acceptance" && typeof ev.accepted === "boolean") {
            accepted = ev.accepted;
        }
    }
    const totals = steps.reduce((acc, s) => {
        acc.engineMs += s.engineMs ?? 0;
        acc.loads += s.loads.length;
        acc.verify += s.verify;
        acc.gates += s.gates;
        acc.inputTokens += s.usage?.inputTokens ?? 0;
        acc.outputTokens += s.usage?.outputTokens ?? 0;
        return acc;
    }, {
        steps: steps.length,
        engineMs: 0,
        loads: 0,
        verify: 0,
        gates: 0,
        inputTokens: 0,
        outputTokens: 0,
    });
    totals.engineMs = roundMs(totals.engineMs);
    let slowest = null;
    for (const s of steps) {
        if (s.sinceLastStepMs != null && (!slowest || s.sinceLastStepMs > slowest.sinceLastStepMs)) {
            slowest = { stepIndex: s.stepIndex, step: s.step, sinceLastStepMs: s.sinceLastStepMs };
        }
    }
    const first = steps[0]?.ts ?? null;
    const last = steps[steps.length - 1]?.ts ?? null;
    const wallMs = first && last && Number.isFinite(tsMs(first)) && Number.isFinite(tsMs(last))
        ? tsMs(last) - tsMs(first)
        : null;
    return {
        run_id: runId,
        workflowType: stepsSorted[0]?.workflowType ?? null,
        startedAt: first,
        endedAt: last,
        wallMs,
        done: steps.some((s) => s.done),
        steps,
        totals,
        slowest,
        accepted,
    };
}
