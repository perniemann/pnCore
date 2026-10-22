/**
 * One resolver for the workflow state file, shared by workflow_state_save / workflow_state_load
 * and project_context, so every reader and writer agrees on which file is "the" state.
 * Precedence: explicit argument > PNCORE_STATE_PATH > default. Paths must stay inside the
 * workspace (MCP cwd); a rejected path is reported, never silently replaced by the default.
 */
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, relative } from "path";
import { readFileTail } from "./file-tail.js";
import { resolveInside } from "./safe-path.js";
export const DEFAULT_STATE_REL = ".pncore/workflow-state.json";
export const STATE_SAVES_REL = ".pncore/state-saves.jsonl";
export function resolveStatePath(opts = {}) {
    const env = opts.env ?? process.env;
    const cwd = opts.cwd ?? process.cwd();
    const arg = typeof opts.arg === "string" && opts.arg.trim() !== "" ? opts.arg.trim() : null;
    const fromEnv = typeof env.PNCORE_STATE_PATH === "string" && env.PNCORE_STATE_PATH.trim() !== ""
        ? env.PNCORE_STATE_PATH.trim()
        : null;
    const requested = arg ?? fromEnv ?? DEFAULT_STATE_REL;
    const source = arg ? "argument" : fromEnv ? "env" : "default";
    const safe = resolveInside(cwd, requested);
    if ("error" in safe) {
        return {
            requested,
            source,
            resolved: null,
            error: `${safe.error}: ${requested} (workspace root ${cwd})`,
        };
    }
    return { requested, source, resolved: safe.resolved };
}
/** Append-only record of where state was last written, so readers can detect a diverged path. */
export function recordStateSave(absPath, runId, cwd = process.cwd()) {
    const logAbs = join(cwd, STATE_SAVES_REL);
    const dir = dirname(logAbs);
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    const entry = {
        ts: new Date().toISOString(),
        path: relative(cwd, absPath) || absPath,
        run_id: runId,
    };
    appendFileSync(logAbs, JSON.stringify(entry) + "\n", "utf-8");
}
export function readLastStateSave(cwd = process.cwd()) {
    const logAbs = join(cwd, STATE_SAVES_REL);
    if (!existsSync(logAbs))
        return null;
    const lines = readFileTail(logAbs, 65_536).split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
        const t = lines[i].trim();
        if (!t)
            continue;
        try {
            const o = JSON.parse(t);
            if (typeof o.path === "string" && typeof o.ts === "string") {
                return {
                    ts: o.ts,
                    path: o.path,
                    run_id: typeof o.run_id === "string" ? o.run_id : null,
                };
            }
        }
        catch {
            /* partial line */
        }
    }
    return null;
}
