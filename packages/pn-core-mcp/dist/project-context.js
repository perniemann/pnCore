/**
 * Project context packet for cold-session coherence (MCP pull, not hook inject).
 * Reads docs/refs/context-index.json + .pncore JSONL trails; derives status from attestations.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { readFileTail } from "./file-tail.js";
import { trailPaths } from "./run-spans.js";
import { resolveInside } from "./safe-path.js";
import { DEFAULT_STATE_REL, readLastStateSave, resolveStatePath, } from "./state-path.js";
import { readCheckpointMeta } from "./checkpoint.js";
import { defaultRunEventsPath } from "./verify-attest.js";
export const CONTEXT_INDEX_REL = "docs/refs/context-index.json";
export const HUMAN_HANDOFF_REL = ".pncore/handoff.md";
export const WORKFLOW_STATE_REL = DEFAULT_STATE_REL;
export const WORKFLOW_HANDOFF_REL = ".pncore/workflow-handoff.jsonl";
export const ARTIFACT_TYPES = [
    "discovery",
    "plan",
    "prd",
    "design",
    "workflow",
    "convention",
];
export const RESPONSE_ALIASES = [
    {
        alias: "scr",
        expand: "Simplify, compress, and repeat your last response. Cut filler; keep facts and decisions.",
    },
    {
        alias: "eli",
        expand: "Explain like I am 18. Simplify language. Shorten the response.",
    },
    {
        alias: "foc",
        expand: "Focus on what matters most. What is the true signal and value? Boil down to the single most important point.",
    },
    {
        alias: "ref",
        expand: "Rewrite using reference points: F# findings, D# decisions, O# options, R# risks, Q# questions, A# actions. Preserve codes for the rest of the session.",
    },
    {
        alias: "scp",
        expand: "Scope lock: deliver only what was requested. Drop unsolicited cleanup, refactors, docs, or adjacent features.",
    },
];
const COMPLETE_CLAIMS = new Set(["complete", "done", "completed", "shipped"]);
const IN_PROGRESS_CLAIMS = new Set(["in_progress", "in-progress", "wip", "active", "started"]);
function readJsonSafe(absPath) {
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
    const abs = join(cwd, CONTEXT_INDEX_REL);
    const raw = readJsonSafe(abs);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return { index: null, path: CONTEXT_INDEX_REL, present: false };
    }
    return { index: raw, path: CONTEXT_INDEX_REL, present: true };
}
function readStateRunId(absPath) {
    const raw = readJsonSafe(absPath);
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return null;
    const state = raw;
    if (typeof state.run_id === "string" && state.run_id.trim() !== "")
        return state.run_id;
    return null;
}
/** run_id from the resolved state file (argument > PNCORE_STATE_PATH > default). */
export function readActiveRunId(cwd = process.cwd(), statePath) {
    const resolved = resolveStatePath({ arg: statePath, cwd });
    if (!resolved.resolved)
        return null;
    return readStateRunId(resolved.resolved);
}
export function readResumeLine(cwd = process.cwd()) {
    const abs = join(cwd, HUMAN_HANDOFF_REL);
    if (!existsSync(abs))
        return null;
    try {
        const text = readFileSync(abs, "utf-8");
        const resumeMatch = text.match(/##\s*Resume here\s*\n+([^\n#]+)/i);
        if (resumeMatch?.[1])
            return resumeMatch[1].trim().slice(0, 400);
        const statusMatch = text.match(/##\s*Status\s*\n+([^\n#]+)/i);
        if (statusMatch?.[1])
            return statusMatch[1].trim().slice(0, 400);
        const first = text
            .split("\n")
            .map((l) => l.trim())
            .find((l) => l.length > 0 && !l.startsWith("#"));
        return first ? first.slice(0, 400) : null;
    }
    catch {
        return null;
    }
}
function parseRunEventLine(line) {
    try {
        const o = JSON.parse(line);
        if (o.kind === "verify" &&
            typeof o.attestationId === "string" &&
            typeof o.run_id === "string") {
            return o;
        }
        if (o.kind === "preflight" &&
            typeof o.preflightId === "string" &&
            typeof o.run_id === "string") {
            return o;
        }
        if (o.kind === "acceptance" && typeof o.run_id === "string") {
            return o;
        }
        return null;
    }
    catch {
        return null;
    }
}
/** Read run-events for a run_id under an arbitrary cwd (tests + MCP handler). */
export function loadRunEventsForCwd(run_id, cwd = process.cwd(), limit = 80) {
    const abs = join(cwd, defaultRunEventsPath());
    if (!existsSync(abs))
        return [];
    const raw = readFileTail(abs, 786_432);
    const matched = [];
    for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t)
            continue;
        const ev = parseRunEventLine(t);
        if (!ev || ev.run_id !== run_id)
            continue;
        matched.push(ev);
    }
    const cap = Math.min(Math.max(limit, 1), 200);
    return matched.slice(-cap);
}
function isCompleteClaim(authored) {
    if (!authored)
        return false;
    return COMPLETE_CLAIMS.has(authored.trim().toLowerCase());
}
function isInProgressClaim(authored) {
    if (!authored)
        return false;
    return IN_PROGRESS_CLAIMS.has(authored.trim().toLowerCase());
}
function attestationSupportsComplete(events) {
    for (const ev of events) {
        if (ev.kind === "acceptance" && ev.accepted === true)
            return true;
        if (ev.kind === "verify" && ev.exitCode === 0 && ev.timedOut === false)
            return true;
    }
    return false;
}
export function deriveArtifactStatus(artifact, cwd = process.cwd(), eventsByRunId) {
    const pathExists = existsSync(join(cwd, artifact.path));
    const authored = typeof artifact.authored_status === "string" && artifact.authored_status.trim() !== ""
        ? artifact.authored_status.trim()
        : null;
    const runId = typeof artifact.run_id === "string" && artifact.run_id.trim() !== ""
        ? artifact.run_id.trim()
        : null;
    const tracker = typeof artifact.tracker === "string" && artifact.tracker.trim() !== ""
        ? artifact.tracker.trim()
        : null;
    const notes = [];
    if (!pathExists) {
        notes.push("path missing on disk");
        return {
            id: artifact.id,
            type: artifact.type,
            path: artifact.path,
            path_exists: false,
            authored_status: authored,
            derived_status: "missing",
            run_id: runId,
            tracker,
            tracker_checked: false,
            notes,
        };
    }
    if (isCompleteClaim(authored)) {
        if (!runId) {
            notes.push("authored complete without run_id attestation");
            return {
                id: artifact.id,
                type: artifact.type,
                path: artifact.path,
                path_exists: true,
                authored_status: authored,
                derived_status: "drift",
                run_id: null,
                tracker,
                tracker_checked: false,
                notes,
            };
        }
        let events = eventsByRunId?.get(runId);
        if (!events) {
            events = loadRunEventsForCwd(runId, cwd, 80);
        }
        if (attestationSupportsComplete(events)) {
            notes.push("complete attested via run-events");
            return {
                id: artifact.id,
                type: artifact.type,
                path: artifact.path,
                path_exists: true,
                authored_status: authored,
                derived_status: "complete_attested",
                run_id: runId,
                tracker,
                tracker_checked: false,
                notes,
            };
        }
        notes.push("authored complete but no passing verify/acceptance for run_id");
        return {
            id: artifact.id,
            type: artifact.type,
            path: artifact.path,
            path_exists: true,
            authored_status: authored,
            derived_status: "drift",
            run_id: runId,
            tracker,
            tracker_checked: false,
            notes,
        };
    }
    if (isInProgressClaim(authored)) {
        return {
            id: artifact.id,
            type: artifact.type,
            path: artifact.path,
            path_exists: true,
            authored_status: authored,
            derived_status: "in_progress",
            run_id: runId,
            tracker,
            tracker_checked: false,
            notes,
        };
    }
    if (authored) {
        notes.push("authored_status is a claim only; not used as derived truth");
    }
    return {
        id: artifact.id,
        type: artifact.type,
        path: artifact.path,
        path_exists: true,
        authored_status: authored,
        derived_status: "ok",
        run_id: runId,
        tracker,
        tracker_checked: false,
        notes,
    };
}
function isEvidenceOnly(r) {
    return r.lifecycle === "historical" || r.lifecycle === "superseded";
}
function countByType(reports) {
    const counts = {
        total: reports.length,
        drift: 0,
        missing: 0,
    };
    for (const t of ARTIFACT_TYPES)
        counts[t] = 0;
    for (const r of reports) {
        counts[r.type] = (counts[r.type] ?? 0) + 1;
        if (isEvidenceOnly(r)) {
            counts.historical = (counts.historical ?? 0) + 1;
            continue;
        }
        if (r.derived_status === "drift")
            counts.drift += 1;
        if (r.derived_status === "missing")
            counts.missing += 1;
    }
    return counts;
}
const INCOMPLETE_ORDER = ["drift", "missing", "in_progress", "unattested"];
/** The declared current checkpoint first; historical / superseded entries never become blockers. */
function pickNextIncomplete(reports, currentId) {
    const current = currentId ? reports.find((r) => r.id === currentId) : undefined;
    if (current && INCOMPLETE_ORDER.includes(current.derived_status))
        return current;
    const live = reports.filter((r) => !isEvidenceOnly(r));
    for (const status of INCOMPLETE_ORDER) {
        const hit = live.find((r) => r.derived_status === status);
        if (hit)
            return hit;
    }
    return null;
}
function readHandoffTrail(runId, maxLines, cwd) {
    const abs = join(cwd, WORKFLOW_HANDOFF_REL);
    if (!existsSync(abs))
        return [];
    const raw = readFileTail(abs, 786_432);
    const lines = [];
    for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t)
            continue;
        try {
            const o = JSON.parse(t);
            if (runId && o.run_id !== runId)
                continue;
            const ts = typeof o.ts === "string" ? o.ts : "";
            const summary = typeof o.summary === "string" ? o.summary : "";
            if (!summary)
                continue;
            lines.push({ source: "workflow_handoff", ts, summary: summary.slice(0, 400) });
        }
        catch {
            /* skip */
        }
    }
    return lines.slice(-maxLines);
}
function readRunEventTrail(runId, maxLines, cwd) {
    if (!runId)
        return [];
    return loadRunEventsForCwd(runId, cwd, maxLines).map((ev) => {
        if (ev.kind === "verify") {
            return {
                source: "run_events",
                ts: ev.finishedAt,
                summary: `verify exit=${ev.exitCode}${ev.failureClass && ev.failureClass !== "none" ? ` class=${ev.failureClass}` : ""} ${ev.commandId ?? ev.argv.join(" ").slice(0, 80)}`,
            };
        }
        if (ev.kind === "preflight") {
            const failed = ev.checks.filter((c) => !c.ok).map((c) => `${c.kind}:${c.target}`);
            return {
                source: "run_events",
                ts: ev.ts,
                summary: `preflight ok=${ev.ok}${failed.length ? ` missing=${failed.join(",").slice(0, 120)}` : ""}`,
            };
        }
        return {
            source: "run_events",
            ts: ev.ts,
            summary: `acceptance accepted=${ev.accepted} workflow=${ev.workflowType} step=${ev.step}`,
        };
    });
}
function newestPoint(points) {
    return points.reduce((acc, p) => (!acc || p.ts >= acc.ts ? p : acc), null);
}
/** Every point in a run-log or handoff JSONL file, in file order. */
function scanRunLog(rel, cwd, runKey) {
    const safe = resolveInside(cwd, rel);
    if ("error" in safe || !existsSync(safe.resolved))
        return [];
    const points = [];
    for (const line of readFileTail(safe.resolved, 786_432).split("\n")) {
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
        const id = o[runKey];
        if (typeof id !== "string" || id === "")
            continue;
        const point = {
            run_id: id,
            step: typeof o.step === "number" ? o.step : null,
            ts: typeof o.ts === "string" ? o.ts : "",
            workflowType: typeof o.workflowType === "string" ? o.workflowType : null,
            revision: typeof o.revision === "number" ? o.revision : null,
        };
        points.push(point);
    }
    return points;
}
function deriveStepStatus(served, completed) {
    const lastServed = served[served.length - 1];
    if (!lastServed)
        return "unknown";
    if (!completed)
        return "in_progress";
    const after = served.filter((s) => s.ts > completed.ts);
    if (after.length === 0)
        return lastServed.step === completed.step ? "idle" : "handoff_foreign";
    return new Set(after.map((s) => s.step)).size === 1 ? "in_progress" : "handoff_skipped";
}
function readHumanHandoff(cwd) {
    const abs = join(cwd, HUMAN_HANDOFF_REL);
    if (!existsSync(abs))
        return null;
    try {
        return readFileSync(abs, "utf-8");
    }
    catch {
        return null;
    }
}
/**
 * Select the active run explicitly and report every disagreement between the state file,
 * run log, handoff log, and last recorded save. A disagreeing source is never silently
 * promoted: without an explicit run_id the selection is null and the mismatch says why.
 */
export function computeActiveRun(opts) {
    const { cwd, indexPresent } = opts;
    const env = opts.env ?? process.env;
    const mismatches = [];
    const argRun = opts.run_id?.trim() || null;
    const statePath = resolveStatePath({ arg: opts.state_path, cwd, env });
    if (statePath.error) {
        mismatches.push({ code: "state_path_rejected", severity: "error", detail: statePath.error });
    }
    const statePresent = statePath.resolved != null && existsSync(statePath.resolved);
    const stateRunId = statePresent ? readStateRunId(statePath.resolved) : null;
    const stateMeta = statePresent ? readCheckpointMeta(statePath.resolved) : null;
    if (statePresent && !stateMeta) {
        mismatches.push({
            code: "state_unversioned",
            severity: "info",
            detail: `${statePath.requested} has no checkpoint revision (plain save); use workflow_state_save with run_id, step, and summary for revision-checked saves.`,
        });
    }
    if (!existsSync(join(cwd, ".pncore")) && !indexPresent) {
        mismatches.push({
            code: "workspace_root_suspect",
            severity: "warn",
            detail: `No .pncore/ and no ${CONTEXT_INDEX_REL} under ${cwd}; the MCP cwd is likely not the workspace root.`,
        });
    }
    const lastSave = readLastStateSave(cwd);
    if (lastSave && statePath.resolved) {
        const savedAbs = resolveInside(cwd, lastSave.path);
        if ("resolved" in savedAbs && savedAbs.resolved !== statePath.resolved) {
            mismatches.push({
                code: "state_path_diverged",
                severity: "error",
                detail: `Last workflow_state_save (${lastSave.ts}) wrote ${lastSave.path}${lastSave.run_id ? ` for run ${lastSave.run_id}` : ""}, but this packet reads ${statePath.requested}. Pass state_path or set PNCORE_STATE_PATH.`,
            });
        }
    }
    if (statePath.source !== "default") {
        const defaultAbs = join(cwd, DEFAULT_STATE_REL);
        if (defaultAbs !== statePath.resolved && existsSync(defaultAbs)) {
            const defaultRun = readStateRunId(defaultAbs);
            if (defaultRun !== stateRunId) {
                mismatches.push({
                    code: "default_state_shadowed",
                    severity: "warn",
                    detail: `${DEFAULT_STATE_REL} holds run ${defaultRun ?? "(none)"} while ${statePath.requested} holds ${stateRunId ?? "(none)"}; the default file is stale for this selection.`,
                });
            }
        }
    }
    const target = argRun ?? stateRunId;
    const paths = trailPaths(env);
    const servePoints = scanRunLog(paths.steps, cwd, "runId");
    let handoffPoints = scanRunLog(paths.handoff, cwd, "run_id");
    const committedRevision = stateMeta && stateMeta.run_id === target ? stateMeta.revision : null;
    if (committedRevision != null) {
        const uncommitted = handoffPoints.filter((p) => p.run_id === target && p.revision != null && p.revision > committedRevision);
        if (uncommitted.length > 0) {
            mismatches.push({
                code: "handoff_revision_ahead",
                severity: "warn",
                detail: `${uncommitted.length} handoff line(s) for run ${target} carry a revision above the state file's revision ${committedRevision} (interrupted save); they are ignored as uncommitted.`,
            });
            handoffPoints = handoffPoints.filter((p) => !uncommitted.includes(p));
        }
    }
    const runLog = {
        newest: newestPoint(servePoints),
        forRun: target ? servePoints.filter((p) => p.run_id === target) : [],
    };
    const handoffLog = {
        newest: newestPoint(handoffPoints),
        forRun: target ? handoffPoints.filter((p) => p.run_id === target) : [],
    };
    const lastCompleted = newestPoint(handoffLog.forRun);
    const lastServed = runLog.forRun[runLog.forRun.length - 1] ?? null;
    const fromArg = argRun != null;
    const sourceSeverity = fromArg ? "warn" : "error";
    if (target && runLog.newest && runLog.newest.run_id !== target) {
        mismatches.push({
            code: "newer_run_in_log",
            severity: sourceSeverity,
            detail: `Newest workflow_step in the run log (${runLog.newest.ts}) is run ${runLog.newest.run_id}${runLog.newest.workflowType ? ` (${runLog.newest.workflowType})` : ""}, not ${target}.`,
        });
    }
    if (target && handoffLog.newest && handoffLog.newest.run_id !== target) {
        mismatches.push({
            code: "handoff_run_mismatch",
            severity: sourceSeverity,
            detail: `Newest workflow handoff (${handoffLog.newest.ts}) belongs to run ${handoffLog.newest.run_id}, not ${target}.`,
        });
    }
    if (argRun && stateRunId && argRun !== stateRunId) {
        mismatches.push({
            code: "state_run_differs",
            severity: "warn",
            detail: `run_id argument ${argRun} differs from ${statePath.requested} run ${stateRunId}.`,
        });
    }
    const stepStatus = deriveStepStatus(runLog.forRun, lastCompleted);
    if (stepStatus === "handoff_skipped") {
        mismatches.push({
            code: "handoff_skipped",
            severity: "warn",
            detail: `More than one step was served after the last handoff (step ${lastCompleted?.step}); a workflow_handoff_append was skipped.`,
        });
    }
    else if (stepStatus === "handoff_foreign") {
        mismatches.push({
            code: "handoff_foreign",
            severity: "warn",
            detail: `Last handoff is for step ${lastCompleted?.step} but the last served step is ${lastServed?.step}.`,
        });
    }
    const indexArtifacts = Array.isArray(opts.index?.artifacts) ? opts.index.artifacts : [];
    const currentId = opts.index?.pointers?.current_checkpoint;
    const currentArtifact = typeof currentId === "string" && currentId !== ""
        ? indexArtifacts.find((a) => a && typeof a === "object" && a.id === currentId)
        : undefined;
    const declaredCurrent = typeof currentId === "string" && currentId !== ""
        ? {
            artifact_id: currentId,
            run_id: typeof currentArtifact?.run_id === "string" && currentArtifact.run_id !== ""
                ? currentArtifact.run_id
                : null,
        }
        : null;
    if (declaredCurrent?.run_id && stateRunId && declaredCurrent.run_id !== stateRunId) {
        mismatches.push({
            code: "state_vs_declared_current",
            severity: "warn",
            detail: `context-index current_checkpoint ${declaredCurrent.artifact_id} is run ${declaredCurrent.run_id}; ${statePath.requested} holds run ${stateRunId}. Update the index or select the run explicitly.`,
        });
    }
    const historical = target
        ? indexArtifacts.find((a) => a &&
            typeof a === "object" &&
            a.run_id === target &&
            (a.lifecycle === "historical" || a.lifecycle === "superseded"))
        : undefined;
    if (historical) {
        mismatches.push({
            code: "historical_entry_selected",
            severity: "warn",
            detail: `Run ${target} belongs to context-index artifact ${historical.id} (lifecycle ${historical.lifecycle}${historical.superseded_by ? `, superseded by ${historical.superseded_by}` : ""}); treat its findings as evidence, not current blockers.`,
        });
    }
    const hasError = mismatches.some((m) => m.severity === "error");
    let runId = null;
    let runIdSource = "none";
    if (argRun) {
        runId = argRun;
        runIdSource = "argument";
    }
    else if (stateRunId && !hasError) {
        runId = stateRunId;
        runIdSource = "state";
    }
    const candidates = [];
    const addCandidate = (id, source) => {
        if (id && !candidates.some((c) => c.run_id === id))
            candidates.push({ run_id: id, source });
    };
    addCandidate(argRun, "argument");
    addCandidate(stateRunId, "state");
    addCandidate(runLog.newest?.run_id, "run_log");
    addCandidate(handoffLog.newest?.run_id, "handoff_log");
    addCandidate(lastSave?.run_id, "state_save");
    const handoffText = readHumanHandoff(cwd);
    const resume = readResumeLine(cwd);
    return {
        active_run: {
            workspace_root: cwd,
            state_path: statePath.requested,
            state_path_source: statePath.source,
            state_present: statePresent,
            state_run_id: stateRunId,
            state_revision: stateMeta?.revision ?? null,
            run_id: runId,
            run_id_source: runIdSource,
            candidates,
            workflowType: lastServed?.workflowType ?? null,
            last_served_step: lastServed?.step ?? null,
            last_served_ts: lastServed?.ts ?? null,
            last_completed_step: lastCompleted?.step ?? null,
            last_completed_ts: lastCompleted?.ts ?? null,
            step_status: stepStatus,
            handoff_run_id: handoffLog.newest?.run_id ?? null,
            resume,
            resume_run_bound: resume && runId && handoffText ? handoffText.includes(runId) : null,
            declared_current: declaredCurrent,
        },
        consistency: { ok: !hasError, mismatches },
    };
}
export function buildProjectContextPacket(opts = {}) {
    const mode = opts.mode === "operator" ? "operator" : "agent";
    const cwd = opts.cwd ?? process.cwd();
    const maxTrail = Math.min(Math.max(opts.max_trail ?? 20, 1), 80);
    const { index, path: indexPath, present } = loadContextIndex(cwd);
    const { active_run, consistency } = computeActiveRun({
        cwd,
        run_id: opts.run_id,
        state_path: opts.state_path,
        indexPresent: present,
        index,
    });
    const activeRunId = active_run.run_id;
    const artifactsRaw = Array.isArray(index?.artifacts) ? index.artifacts : [];
    const artifacts = artifactsRaw.filter((a) => !!a &&
        typeof a === "object" &&
        typeof a.id === "string" &&
        typeof a.path === "string" &&
        typeof a.type === "string" &&
        ARTIFACT_TYPES.includes(a.type));
    const eventsByRunId = new Map();
    const runIds = new Set();
    for (const a of artifacts) {
        if (typeof a.run_id === "string" && a.run_id.trim())
            runIds.add(a.run_id.trim());
    }
    if (activeRunId)
        runIds.add(activeRunId);
    for (const id of runIds) {
        eventsByRunId.set(id, loadRunEventsForCwd(id, cwd, 80));
    }
    const reports = artifacts.map((a) => {
        const report = deriveArtifactStatus(a, cwd, eventsByRunId);
        if (a.lifecycle)
            report.lifecycle = a.lifecycle;
        if (typeof a.superseded_by === "string" && a.superseded_by !== "") {
            report.superseded_by = a.superseded_by;
        }
        if (isEvidenceOnly(report))
            report.notes.push(`${a.lifecycle}: evidence only, not a current blocker`);
        return report;
    });
    const drift = reports.filter((r) => !isEvidenceOnly(r) && (r.derived_status === "drift" || r.derived_status === "missing"));
    const currentId = typeof index?.pointers?.current_checkpoint === "string"
        ? index.pointers.current_checkpoint
        : null;
    const packet = {
        mode,
        version: "1",
        calendarDateUtc: new Date().toISOString().slice(0, 10),
        context_index: {
            version: index?.version ?? null,
            last_reviewed: index?.last_reviewed ?? null,
            path: indexPath,
            present,
        },
        counts: countByType(reports),
        active_run_id: activeRunId,
        resume: active_run.resume,
        active_run,
        consistency,
        drift_scope: "indexed_files",
        drift,
        next_incomplete: pickNextIncomplete(reports, currentId),
        responseAliases: RESPONSE_ALIASES,
    };
    if (mode === "agent") {
        packet.artifacts = reports;
        packet.pointers = index?.pointers;
        const handoffTrail = readHandoffTrail(activeRunId, maxTrail, cwd);
        const eventTrail = readRunEventTrail(activeRunId, maxTrail, cwd);
        packet.trail = [...handoffTrail, ...eventTrail]
            .sort((a, b) => a.ts.localeCompare(b.ts))
            .slice(-maxTrail);
    }
    return packet;
}
