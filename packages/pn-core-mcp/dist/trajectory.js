/**
 * Deterministic trajectory replay (ADR-0019).
 *
 * A trajectory is the ordered sequence of `workflow_step` calls for one run_id together with
 * the routing the engine produced for each call (nextStep, gate, done, phase, parallel tasks).
 * Trajectories are recorded from `.pncore/workflow-runs.jsonl` (with `PNCORE_RUN_LOG_STATE=1`
 * so state values are present) and replayed through `getWorkflowStep` in CI. The grade is
 * exact-match on routing; instruction text is only checked for opted-in substrings.
 *
 * Nothing here calls an LLM. This module is pure apart from `getWorkflowStep`.
 */
import { getWorkflowStep, workflowSteps } from "./workflows.js";
export const RUN_LOG_STATE_ENV = "PNCORE_RUN_LOG_STATE";
export const RUN_LOG_STATE_MAX_STRING = 240;
export const RUN_LOG_STATE_MAX_DEPTH = 6;
const REDACTED_KEYS = new Set(["pncoreHumanGateTicket", "approval_token", "approvalToken"]);
export function runLogStateEnabled(env = process.env) {
    const v = (env[RUN_LOG_STATE_ENV] ?? "").trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes" || v === "on";
}
/**
 * Copy of `state` safe to append to the run log: long strings are head-capped, tickets and
 * tokens are redacted, depth is bounded. Routing-relevant values (booleans, enums, short ids,
 * array membership, object keys) survive unchanged, which is what replay needs.
 */
export function snapshotStateForLog(state, opts = {}) {
    const maxString = opts.maxString ?? RUN_LOG_STATE_MAX_STRING;
    const maxDepth = opts.maxDepth ?? RUN_LOG_STATE_MAX_DEPTH;
    const walk = (v, depth, key) => {
        if (key && REDACTED_KEYS.has(key) && v != null)
            return "[redacted]";
        if (typeof v === "string") {
            return v.length > maxString ? `${v.slice(0, maxString)}…[+${v.length - maxString} chars]` : v;
        }
        if (v === null || typeof v !== "object")
            return v;
        if (depth >= maxDepth)
            return Array.isArray(v) ? `[array:${v.length}]` : "[object]";
        if (Array.isArray(v))
            return v.map((x) => walk(x, depth + 1));
        const out = {};
        for (const [k, x] of Object.entries(v)) {
            if (x === undefined)
                continue;
            out[k] = walk(x, depth + 1, k);
        }
        return out;
    };
    return walk(state, 0);
}
export function parseRunLog(text) {
    const entries = [];
    let skipped = 0;
    for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (!t)
            continue;
        try {
            const o = JSON.parse(t);
            if (typeof o.workflowType === "string" &&
                typeof o.step === "number" &&
                typeof o.nextStep === "number" &&
                (o.gate === "human" || o.gate === "model")) {
                entries.push({
                    ts: typeof o.ts === "string" ? o.ts : "",
                    runId: typeof o.runId === "string" ? o.runId : undefined,
                    workflowType: o.workflowType,
                    step: o.step,
                    nextStep: o.nextStep,
                    gate: o.gate,
                    done: o.done === true,
                    workflowPhase: typeof o.workflowPhase === "string" ? o.workflowPhase : undefined,
                    parallel: o.parallel === true ? true : undefined,
                    taskIds: Array.isArray(o.taskIds) && o.taskIds.every((x) => typeof x === "string")
                        ? o.taskIds
                        : undefined,
                    stepIndex: typeof o.stepIndex === "number" ? o.stepIndex : undefined,
                    sinceLastStepMs: typeof o.sinceLastStepMs === "number" || o.sinceLastStepMs === null
                        ? o.sinceLastStepMs
                        : undefined,
                    engineMs: typeof o.engineMs === "number" ? o.engineMs : undefined,
                    stateKeys: Array.isArray(o.stateKeys) ? o.stateKeys : [],
                    state: o.state && typeof o.state === "object" && !Array.isArray(o.state)
                        ? o.state
                        : undefined,
                });
            }
            else {
                skipped++;
            }
        }
        catch {
            skipped++;
        }
    }
    return { entries, skipped };
}
export const UNKNOWN_RUN_ID = "(no runId)";
/** Group entries by runId, each group ordered by `ts` then file order. */
export function groupRunLogByRun(entries) {
    const indexed = new Map();
    entries.forEach((e, i) => {
        const key = e.runId ?? UNKNOWN_RUN_ID;
        const list = indexed.get(key) ?? [];
        list.push([i, e]);
        indexed.set(key, list);
    });
    const groups = new Map();
    for (const [k, list] of indexed) {
        list.sort(([ia, a], [ib, b]) => a.ts.localeCompare(b.ts) || ia - ib);
        groups.set(k, list.map(([, e]) => e));
    }
    return groups;
}
export function isErrorExpect(e) {
    return "error" in e;
}
/**
 * Build a trajectory from one run's log entries. Every entry must carry `state`, otherwise
 * replay would only see key names and routing on values would be unverifiable.
 */
export function trajectoryFromRunLog(entries, opts) {
    if (entries.length === 0)
        throw new Error("trajectoryFromRunLog: no entries for this run");
    const types = new Set(entries.map((e) => e.workflowType));
    if (types.size !== 1) {
        throw new Error(`trajectoryFromRunLog: entries span several workflow types (${[...types].join(", ")}); a trajectory covers one workflow`);
    }
    const missing = entries.filter((e) => !e.state);
    if (missing.length > 0) {
        throw new Error(`trajectoryFromRunLog: ${missing.length} of ${entries.length} entries have no state snapshot. Record with ${RUN_LOG_STATE_ENV}=1 in the MCP server env.`);
    }
    return {
        name: opts.name,
        workflowType: entries[0].workflowType,
        source: "recorded",
        runId: opts.runId ?? entries[0].runId,
        recordedAt: entries[0].ts || undefined,
        steps: entries.map((e) => {
            const expect = { nextStep: e.nextStep, gate: e.gate, done: e.done };
            if (e.workflowPhase)
                expect.workflowPhase = e.workflowPhase;
            if (e.parallel)
                expect.parallel = true;
            if (e.taskIds)
                expect.taskIds = e.taskIds;
            return { step: e.step, state: e.state, expect };
        }),
    };
}
function sortedIds(ids) {
    return ids ? [...ids].sort() : undefined;
}
/** Replay every step through `getWorkflowStep` and diff routing against the recorded expectations. */
export function replayTrajectory(t) {
    const mismatches = [];
    t.steps.forEach((s, index) => {
        const r = getWorkflowStep(t.workflowType, s.step, s.state);
        const push = (field, expected, actual) => mismatches.push({ index, step: s.step, field, expected, actual });
        if (isErrorExpect(s.expect)) {
            if (!("error" in r))
                push("error", s.expect.error, "(no error; step succeeded)");
            else if (!r.error.includes(s.expect.error))
                push("error", s.expect.error, r.error);
            return;
        }
        if ("error" in r) {
            push("error", "(no error)", r.error);
            return;
        }
        const e = s.expect;
        if (r.nextStep !== e.nextStep)
            push("nextStep", e.nextStep, r.nextStep);
        if (r.gate !== e.gate)
            push("gate", e.gate, r.gate);
        if ((r.done ?? false) !== e.done)
            push("done", e.done, r.done ?? false);
        if (e.workflowPhase !== undefined && r.workflowPhase !== e.workflowPhase) {
            push("workflowPhase", e.workflowPhase, r.workflowPhase);
        }
        if (e.parallel !== undefined && (r.parallel ?? false) !== e.parallel) {
            push("parallel", e.parallel, r.parallel ?? false);
        }
        if (e.taskIds) {
            const actual = sortedIds(r.tasks?.map((x) => x.id)) ?? [];
            const expected = sortedIds(e.taskIds);
            if (JSON.stringify(actual) !== JSON.stringify(expected))
                push("taskIds", expected, actual);
        }
        for (const sub of e.instructionContains ?? []) {
            if (!r.instruction.includes(sub))
                push("instructionContains", sub, "(absent)");
        }
    });
    return {
        name: t.name,
        workflowType: t.workflowType,
        stepsReplayed: t.steps.length,
        mismatches,
        ok: mismatches.length === 0,
    };
}
/**
 * Structural checks independent of the engine: the workflow exists, every step index is in
 * range, and each call continues from the previous routing (same step after an error or a
 * same-step phase, else the recorded nextStep). Returns human-readable problems.
 */
export function checkTrajectoryContinuity(t) {
    const problems = [];
    const steps = workflowSteps[t.workflowType];
    if (!steps)
        return [`unknown workflowType ${t.workflowType}`];
    if (t.steps.length === 0)
        problems.push("trajectory has no steps");
    t.steps.forEach((s, i) => {
        if (s.step < 0 || s.step >= steps.length) {
            problems.push(`#${i}: step ${s.step} out of range for ${t.workflowType} (0..${steps.length - 1})`);
        }
        if (i === 0)
            return;
        const prev = t.steps[i - 1];
        const allowed = isErrorExpect(prev.expect)
            ? [prev.step]
            : prev.expect.nextStep === prev.step
                ? [prev.step]
                : [prev.expect.nextStep, prev.step];
        if (!allowed.includes(s.step)) {
            problems.push(`#${i}: step ${s.step} does not continue from #${i - 1} (step ${prev.step} → expected ${allowed.join(" or ")})`);
        }
        if (!isErrorExpect(prev.expect) && prev.expect.done) {
            problems.push(`#${i}: step ${s.step} follows a step marked done`);
        }
    });
    return problems;
}
/** Parse and validate a fixture object; throws with a precise message on shape errors. */
export function parseTrajectory(raw, sourceLabel = "trajectory") {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error(`${sourceLabel}: fixture must be an object`);
    }
    const o = raw;
    if (typeof o.name !== "string" || !o.name.trim())
        throw new Error(`${sourceLabel}: name required`);
    if (typeof o.workflowType !== "string" || !(o.workflowType in workflowSteps)) {
        throw new Error(`${sourceLabel}: unknown workflowType ${String(o.workflowType)}`);
    }
    if (o.source !== "recorded" && o.source !== "authored") {
        throw new Error(`${sourceLabel}: source must be "recorded" or "authored"`);
    }
    if (!Array.isArray(o.steps) || o.steps.length === 0) {
        throw new Error(`${sourceLabel}: steps must be a non-empty array`);
    }
    o.steps.forEach((s, i) => {
        const st = s;
        if (typeof st.step !== "number")
            throw new Error(`${sourceLabel}: steps[${i}].step must be a number`);
        if (!st.state || typeof st.state !== "object" || Array.isArray(st.state)) {
            throw new Error(`${sourceLabel}: steps[${i}].state must be an object`);
        }
        const ex = st.expect;
        if (!ex || typeof ex !== "object")
            throw new Error(`${sourceLabel}: steps[${i}].expect required`);
        if ("error" in ex) {
            if (typeof ex.error !== "string" || !ex.error) {
                throw new Error(`${sourceLabel}: steps[${i}].expect.error must be a non-empty string`);
            }
            return;
        }
        if (typeof ex.nextStep !== "number" ||
            (ex.gate !== "human" && ex.gate !== "model") ||
            typeof ex.done !== "boolean") {
            throw new Error(`${sourceLabel}: steps[${i}].expect needs nextStep:number, gate:human|model, done:boolean`);
        }
    });
    return o;
}
/** One-line summary used by the CLI and test names. */
export function describeTrajectory(t) {
    const route = t.steps
        .map((s) => (isErrorExpect(s.expect) ? `${s.step}!` : `${s.step}`))
        .join("→");
    return `${t.name} [${t.workflowType}, ${t.source}, ${t.steps.length} steps: ${route}]`;
}
