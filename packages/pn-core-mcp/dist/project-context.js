/**
 * Project context packet for cold-session coherence (MCP pull, not hook inject).
 * Reads docs/refs/context-index.json + .pncore JSONL trails; derives status from attestations.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { readFileTail } from "./file-tail.js";
import { defaultRunEventsPath } from "./verify-attest.js";
export const CONTEXT_INDEX_REL = "docs/refs/context-index.json";
export const HUMAN_HANDOFF_REL = ".pncore/handoff.md";
export const WORKFLOW_STATE_REL = ".pncore/workflow-state.json";
export const WORKFLOW_HANDOFF_REL = ".pncore/workflow-handoff.jsonl";
export const ARTIFACT_TYPES = [
    "discovery",
    "plan",
    "prd",
    "design",
    "workflow",
    "convention",
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
export function readActiveRunId(cwd = process.cwd()) {
    const abs = join(cwd, WORKFLOW_STATE_REL);
    const raw = readJsonSafe(abs);
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return null;
    const state = raw;
    if (typeof state.run_id === "string" && state.run_id.trim() !== "")
        return state.run_id;
    return null;
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
        if (r.derived_status === "drift")
            counts.drift += 1;
        if (r.derived_status === "missing")
            counts.missing += 1;
    }
    return counts;
}
function pickNextIncomplete(reports) {
    const order = ["drift", "missing", "in_progress", "unattested", "ok"];
    for (const status of order) {
        if (status === "ok")
            continue;
        const hit = reports.find((r) => r.derived_status === status);
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
                summary: `verify exit=${ev.exitCode} ${ev.commandId ?? ev.argv.join(" ").slice(0, 80)}`,
            };
        }
        return {
            source: "run_events",
            ts: ev.ts,
            summary: `acceptance accepted=${ev.accepted} workflow=${ev.workflowType} step=${ev.step}`,
        };
    });
}
export function buildProjectContextPacket(opts = {}) {
    const mode = opts.mode === "operator" ? "operator" : "agent";
    const cwd = opts.cwd ?? process.cwd();
    const maxTrail = Math.min(Math.max(opts.max_trail ?? 20, 1), 80);
    const { index, path: indexPath, present } = loadContextIndex(cwd);
    const activeRunId = opts.run_id?.trim() || readActiveRunId(cwd);
    const artifacts = Array.isArray(index?.artifacts) ? index.artifacts : [];
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
    const reports = artifacts
        .filter((a) => !!a &&
        typeof a.id === "string" &&
        typeof a.path === "string" &&
        typeof a.type === "string" &&
        ARTIFACT_TYPES.includes(a.type))
        .map((a) => deriveArtifactStatus(a, cwd, eventsByRunId));
    const drift = reports.filter((r) => r.derived_status === "drift" || r.derived_status === "missing");
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
        resume: readResumeLine(cwd),
        drift,
        next_incomplete: pickNextIncomplete(reports),
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
