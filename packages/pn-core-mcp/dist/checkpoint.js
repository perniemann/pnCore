/**
 * Checkpoint commit protocol for workflow_state_save commit mode (ADR-0022).
 *
 * One save binds state, run, step, and a handoff line under a revision number:
 *   lock → read prior revision → check expected_revision and run binding → append handoff
 *   line (revision N+1, stateHash) → optional history line (prior state) → atomic state write
 *   (the commit point) → read back → unlock.
 *
 * The state rename is the only commit point. A handoff line whose revision is above the state
 * file's revision is uncommitted (the save was interrupted between the append and the rename);
 * readers ignore it, so an interrupted save leaves the prior state and handoff consistent.
 */
import { createHash } from "crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync, } from "fs";
import { dirname } from "path";
import { writeFileAtomic } from "./atomic-write.js";
export const META_KEY = "_pncore";
export const HANDOFF_SUMMARY_LIMIT = 4000;
export const LOCK_STALE_MS = 30_000;
function stableStringify(value) {
    if (Array.isArray(value))
        return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
        const entries = Object.entries(value)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
    }
    return JSON.stringify(value) ?? "null";
}
export function sha256(text) {
    return createHash("sha256").update(text).digest("hex");
}
/** Hash of the routing state (envelope excluded, key order irrelevant). */
export function hashState(state) {
    const { [META_KEY]: _meta, ...rest } = state;
    void _meta;
    return sha256(stableStringify(rest));
}
function parseMeta(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    const m = value;
    if (typeof m.revision === "number" &&
        Number.isInteger(m.revision) &&
        typeof m.run_id === "string" &&
        typeof m.step === "number" &&
        typeof m.savedAt === "string" &&
        typeof m.stateHash === "string") {
        return {
            revision: m.revision,
            run_id: m.run_id,
            step: m.step,
            savedAt: m.savedAt,
            stateHash: m.stateHash,
        };
    }
    return null;
}
/** Split a stored state object into routing state and the persistence envelope. */
export function splitState(raw) {
    const { [META_KEY]: metaRaw, ...state } = raw;
    return { state, meta: parseMeta(metaRaw) };
}
/** Envelope of a state file, or null when the file is missing, unparsable, or unversioned. */
export function readCheckpointMeta(absPath) {
    if (!existsSync(absPath))
        return null;
    try {
        const raw = JSON.parse(readFileSync(absPath, "utf-8"));
        if (!raw || typeof raw !== "object" || Array.isArray(raw))
            return null;
        return splitState(raw).meta;
    }
    catch {
        return null;
    }
}
function ensureDir(path) {
    const dir = dirname(path);
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
}
function acquireLock(lockPath, staleMs, now) {
    ensureDir(lockPath);
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const fd = openSync(lockPath, "wx");
            try {
                writeFileSync(fd, JSON.stringify({ pid: process.pid, ts: now.toISOString() }), "utf-8");
            }
            finally {
                closeSync(fd);
            }
            return true;
        }
        catch (err) {
            if (err.code !== "EEXIST")
                throw err;
            let age = 0;
            try {
                age = now.getTime() - statSync(lockPath).mtimeMs;
            }
            catch {
                continue;
            }
            if (age < staleMs)
                return false;
            try {
                unlinkSync(lockPath);
            }
            catch {
                /* another writer removed it first */
            }
        }
    }
    return false;
}
function readPrior(statePath) {
    if (!existsSync(statePath))
        return { raw: null, meta: null, runId: null };
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(statePath, "utf-8"));
    }
    catch {
        return { raw: null, meta: null, runId: null };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { raw: null, meta: null, runId: null };
    }
    const raw = parsed;
    const { meta } = splitState(raw);
    const runId = meta?.run_id ?? (typeof raw.run_id === "string" ? raw.run_id : null);
    return { raw, meta, runId };
}
export function commitCheckpoint(input, deps = {}) {
    const now = (deps.now ?? (() => new Date()))();
    const lockPath = `${input.statePath}.lock`;
    try {
        if (!acquireLock(lockPath, deps.lockStaleMs ?? LOCK_STALE_MS, now)) {
            return {
                ok: false,
                code: "LOCKED",
                message: `Another save holds ${lockPath}; retry after it finishes (stale locks expire after ${Math.round((deps.lockStaleMs ?? LOCK_STALE_MS) / 1000)}s).`,
            };
        }
    }
    catch (err) {
        return { ok: false, code: "IO_ERROR", message: String(err) };
    }
    try {
        const prior = readPrior(input.statePath);
        const previousRevision = prior.meta?.revision ?? 0;
        if (input.expected_revision !== undefined && input.expected_revision !== previousRevision) {
            return {
                ok: false,
                code: "REVISION_CONFLICT",
                message: `expected_revision ${input.expected_revision} but ${input.statePath} is at revision ${previousRevision}. Reload with workflow_state_load and retry.`,
                current_revision: previousRevision,
                current_run_id: prior.runId,
            };
        }
        const bodyRun = input.state.run_id;
        if (typeof bodyRun === "string" && bodyRun !== "" && bodyRun !== input.run_id) {
            return {
                ok: false,
                code: "RUN_MISMATCH",
                message: `state.run_id ${bodyRun} does not match run_id ${input.run_id}.`,
                current_revision: previousRevision,
                current_run_id: prior.runId,
            };
        }
        if (prior.runId && prior.runId !== input.run_id && input.expected_revision === undefined) {
            return {
                ok: false,
                code: "RUN_MISMATCH",
                message: `${input.statePath} holds run ${prior.runId}; saving run ${input.run_id} over it requires expected_revision: ${previousRevision} (explicit overwrite) or a different path.`,
                current_revision: previousRevision,
                current_run_id: prior.runId,
            };
        }
        const { state: routing } = splitState(input.state);
        const state = { ...routing, run_id: input.run_id };
        const revision = previousRevision + 1;
        const stateHash = hashState(state);
        const savedAt = now.toISOString();
        const handoffLine = JSON.stringify({
            ts: savedAt,
            run_id: input.run_id,
            step: input.step,
            summary: input.summary.slice(0, HANDOFF_SUMMARY_LIMIT),
            revision,
            stateHash,
        });
        ensureDir(input.handoffPath);
        appendFileSync(input.handoffPath, handoffLine + "\n", "utf-8");
        const handoffHash = sha256(handoffLine);
        if (input.historyPath && prior.raw) {
            ensureDir(input.historyPath);
            const { state: priorState } = splitState(prior.raw);
            appendFileSync(input.historyPath, JSON.stringify({
                ts: savedAt,
                revision: previousRevision,
                run_id: prior.runId,
                state: priorState,
            }) + "\n", "utf-8");
        }
        deps.beforeCommit?.();
        const meta = {
            revision,
            run_id: input.run_id,
            step: input.step,
            savedAt,
            stateHash,
        };
        writeFileAtomic(input.statePath, JSON.stringify({ ...state, [META_KEY]: meta }));
        deps.afterCommit?.();
        const back = readPrior(input.statePath);
        const backState = back.raw ? splitState(back.raw).state : null;
        if (!back.meta ||
            back.meta.revision !== revision ||
            !backState ||
            hashState(backState) !== stateHash) {
            return {
                ok: false,
                code: "IO_ERROR",
                message: `Read-back of ${input.statePath} does not match revision ${revision}.`,
                current_revision: back.meta?.revision ?? 0,
                current_run_id: back.runId,
            };
        }
        return {
            ok: true,
            revision,
            previous_revision: previousRevision,
            run_id: input.run_id,
            step: input.step,
            stateHash,
            handoffHash,
            path: input.statePath,
            handoff_path: input.handoffPath,
            ...(input.historyPath && prior.raw ? { history_path: input.historyPath } : {}),
            readBack: { revision: back.meta.revision, stateHash, run_id: back.meta.run_id },
        };
    }
    catch (err) {
        return { ok: false, code: "IO_ERROR", message: String(err) };
    }
    finally {
        try {
            unlinkSync(lockPath);
        }
        catch {
            /* already gone */
        }
    }
}
