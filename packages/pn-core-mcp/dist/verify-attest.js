/**
 * Server-written verify attestations. Agents cannot invent kind=verify rows.
 */
import { randomUUID } from "crypto";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { readFileTail } from "./file-tail.js";
import { resolveSafePath } from "./safe-path.js";
export function defaultRunEventsPath() {
    return process.env.PNCORE_RUN_EVENTS_PATH ?? ".pncore/run-events.jsonl";
}
const SCAN_MAX = 786_432;
export function newAttestationId() {
    return randomUUID();
}
export function appendRunEvent(event, filePath) {
    const rel = filePath ?? defaultRunEventsPath();
    const safe = resolveSafePath(rel);
    if ("error" in safe)
        return { error: safe.error };
    const dir = dirname(safe.resolved);
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    appendFileSync(safe.resolved, JSON.stringify(event) + "\n", "utf-8");
    return { path: safe.resolved };
}
function parseEvent(line) {
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
export function readRunEvents(run_id, opts) {
    const rel = opts?.path ?? defaultRunEventsPath();
    const safe = resolveSafePath(rel);
    if ("error" in safe)
        return { error: safe.error };
    if (!existsSync(safe.resolved))
        return { events: [], path: safe.resolved };
    const raw = readFileTail(safe.resolved, SCAN_MAX);
    const kinds = opts?.kinds;
    const matched = [];
    for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t)
            continue;
        const ev = parseEvent(t);
        if (!ev || ev.run_id !== run_id)
            continue;
        if (kinds && kinds.length > 0 && !kinds.includes(ev.kind))
            continue;
        matched.push(ev);
    }
    const cap = opts?.limit && opts.limit > 0 ? Math.min(opts.limit, 200) : 80;
    return { events: matched.slice(-cap), path: safe.resolved };
}
export function loadGateReport(attestationId, filePath) {
    const rel = filePath ?? defaultRunEventsPath();
    const safe = resolveSafePath(rel);
    if ("error" in safe || !existsSync(safe.resolved))
        return undefined;
    const raw = readFileTail(safe.resolved, SCAN_MAX);
    let found;
    for (const line of raw.split("\n")) {
        const ev = parseEvent(line.trim());
        if (ev && ev.kind === "verify" && ev.attestationId === attestationId) {
            found = ev;
        }
    }
    return found;
}
export function gatePassed(report) {
    return report.exitCode === 0 && report.timedOut === false;
}
