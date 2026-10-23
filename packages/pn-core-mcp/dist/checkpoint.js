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
import { createHash, randomBytes } from "crypto";
import { appendFileSync, closeSync, existsSync, linkSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync, } from "fs";
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
/** Append one handoff line (summary capped at HANDOFF_SUMMARY_LIMIT); returns the line written. */
export function appendHandoffLine(path, entry) {
    const line = JSON.stringify({ ...entry, summary: entry.summary.slice(0, HANDOFF_SUMMARY_LIMIT) });
    ensureDir(path);
    appendFileSync(path, line + "\n", "utf-8");
    return line;
}
function readLockToken(lockPath) {
    try {
        const o = JSON.parse(readFileSync(lockPath, "utf-8"));
        return typeof o.token === "string" ? o.token : null;
    }
    catch {
        return null;
    }
}
/**
 * Take the lock, or return null when a fresh lock is held. A stale lock is moved aside to a
 * unique tombstone and kept only if it is still the file that was judged stale (same inode and
 * mtime); a lock created in between is put back, so two writers cannot both take over.
 */
function acquireLock(lockPath, staleMs, now, onStaleLock) {
    ensureDir(lockPath);
    const token = randomBytes(8).toString("hex");
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const fd = openSync(lockPath, "wx");
            try {
                writeFileSync(fd, JSON.stringify({ pid: process.pid, ts: now.toISOString(), token }));
            }
            finally {
                closeSync(fd);
            }
            return token;
        }
        catch (err) {
            if (err.code !== "EEXIST")
                throw err;
        }
        let judged;
        try {
            judged = statSync(lockPath);
        }
        catch {
            continue;
        }
        if (now.getTime() - judged.mtimeMs < staleMs)
            return null;
        onStaleLock?.();
        const tomb = `${lockPath}.${token}.stale`;
        try {
            renameSync(lockPath, tomb);
        }
        catch {
            continue;
        }
        const moved = statSync(tomb);
        if (moved.ino !== judged.ino || moved.mtimeMs !== judged.mtimeMs) {
            try {
                linkSync(tomb, lockPath);
            }
            catch {
                /* a third writer already holds a new lock */
            }
            unlinkSync(tomb);
            return null;
        }
        unlinkSync(tomb);
    }
    return null;
}
function releaseLock(lockPath, token) {
    if (readLockToken(lockPath) !== token)
        return;
    try {
        unlinkSync(lockPath);
    }
    catch {
        /* already gone */
    }
}
function lockedFailure(lockPath, staleMs) {
    return {
        ok: false,
        code: "LOCKED",
        message: `Another save holds ${lockPath}; retry after it finishes (stale locks expire after ${Math.round(staleMs / 1000)}s).`,
    };
}
/** Run `fn` under `<statePath>.lock`; LOCKED when another holder has a fresh lock. */
function withStateLock(statePath, deps, fn) {
    const now = (deps.now ?? (() => new Date()))();
    const staleMs = deps.lockStaleMs ?? LOCK_STALE_MS;
    const lockPath = `${statePath}.lock`;
    let token;
    try {
        token = acquireLock(lockPath, staleMs, now, deps.onStaleLock);
    }
    catch (err) {
        return { ok: false, code: "IO_ERROR", message: String(err) };
    }
    if (!token)
        return lockedFailure(lockPath, staleMs);
    try {
        return fn(now);
    }
    catch (err) {
        return { ok: false, code: "IO_ERROR", message: String(err) };
    }
    finally {
        releaseLock(lockPath, token);
    }
}
function readPrior(statePath) {
    const empty = { raw: null, meta: null, runId: null, unparsable: null };
    if (!existsSync(statePath))
        return empty;
    const text = readFileSync(statePath, "utf-8");
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        return { ...empty, unparsable: text };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ...empty, unparsable: text };
    }
    const raw = parsed;
    const { meta } = splitState(raw);
    const runId = meta?.run_id ?? (typeof raw.run_id === "string" ? raw.run_id : null);
    return { raw, meta, runId, unparsable: null };
}
/** Commit-mode argument check: run_id, step, and summary together; commit-only keys need them. */
export function commitArgsError(args) {
    const commitKeys = [args.run_id, args.step, args.summary].filter((v) => v !== undefined).length;
    const commitOnly = args.expected_revision !== undefined || args.handoff_path || args.history || args.overwrite_run;
    if ((commitKeys > 0 && commitKeys < 3) || (commitKeys === 0 && commitOnly)) {
        return "Commit mode needs run_id, step, and summary together (expected_revision, handoff_path, history, overwrite_run apply only in commit mode).";
    }
    return null;
}
/**
 * Plain-mode save: no revision, but the same lock as commit mode, and any caller-supplied
 * envelope is dropped so a stale revision cannot be written back.
 */
export function saveStatePlain(statePath, state, deps = {}) {
    return withStateLock(statePath, deps, () => {
        writeFileAtomic(statePath, JSON.stringify(splitState(state).state));
        return { ok: true };
    });
}
export function commitCheckpoint(input, deps = {}) {
    return withStateLock(input.statePath, deps, (now) => commitLocked(input, deps, now));
}
function commitLocked(input, deps, now) {
    const prior = readPrior(input.statePath);
    const previousRevision = prior.meta?.revision ?? 0;
    const conflict = (code, message) => ({
        ok: false,
        code,
        message,
        current_revision: previousRevision,
        current_run_id: prior.runId,
    });
    if (prior.unparsable != null && input.expected_revision !== 0) {
        return conflict("PARSE_ERROR", `${input.statePath} is not a JSON object; pass expected_revision: 0 to replace it (history: true keeps the old bytes).`);
    }
    if (input.expected_revision !== undefined && input.expected_revision !== previousRevision) {
        return conflict("REVISION_CONFLICT", `expected_revision ${input.expected_revision} but ${input.statePath} is at revision ${previousRevision}. Reload with workflow_state_load and retry.`);
    }
    const bodyRun = input.state.run_id;
    if (typeof bodyRun === "string" && bodyRun !== "" && bodyRun !== input.run_id) {
        return conflict("RUN_MISMATCH", `state.run_id ${bodyRun} does not match run_id ${input.run_id}.`);
    }
    if (prior.runId && prior.runId !== input.run_id && input.overwrite_run !== true) {
        return conflict("RUN_MISMATCH", `${input.statePath} holds run ${prior.runId}; saving run ${input.run_id} over it requires overwrite_run: true, or use a different path.`);
    }
    const { state: routing } = splitState(input.state);
    const state = { ...routing, run_id: input.run_id };
    const revision = previousRevision + 1;
    const stateHash = hashState(state);
    const savedAt = now.toISOString();
    const handoffLine = appendHandoffLine(input.handoffPath, {
        ts: savedAt,
        run_id: input.run_id,
        step: input.step,
        summary: input.summary,
        revision,
        stateHash,
    });
    const handoffHash = sha256(handoffLine);
    const historyEntry = prior.raw
        ? { revision: previousRevision, run_id: prior.runId, state: splitState(prior.raw).state }
        : prior.unparsable != null
            ? { revision: 0, run_id: null, raw: prior.unparsable }
            : null;
    if (input.historyPath && historyEntry) {
        ensureDir(input.historyPath);
        appendFileSync(input.historyPath, JSON.stringify({ ts: savedAt, ...historyEntry }) + "\n", "utf-8");
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
        ...(input.historyPath && historyEntry ? { history_path: input.historyPath } : {}),
        readBack: { revision: back.meta.revision, stateHash, run_id: back.meta.run_id },
    };
}
