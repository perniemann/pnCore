/**
 * Context budget packing (ADR-0021) — narrow scope.
 *
 * pnCore already *measures* context (`scripts/measure-tokens.mjs`, chars ÷ 4). This module
 * *packs* against a budget in the two places where a hard limit exists:
 *
 *   1. `project_context` — the cold-session packet an agent loads first. Given `max_tokens`,
 *      sections are shrunk and dropped in a fixed order (least routing-relevant first) until
 *      the packet fits, and the packet says what was cut so a follow-up call can be targeted.
 *   2. The Codex `AGENTS.md` chain, which Codex truncates at `project_doc_max_bytes`
 *      (32 KiB default). `fitInstructionsBlock` in harness.ts uses the helpers here.
 *
 * Deterministic and pure: no LLM, no I/O.
 */
/** The measurement already used across the repo (measure-tokens, dashboard). */
export const CHARS_PER_TOKEN = 4;
export function estimateTokens(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}
/** Codex default `project_doc_max_bytes`. */
export const CODEX_AGENTS_MD_CAP_BYTES = 32 * 1024;
export function agentsMdCapBytes(env = process.env) {
    const n = parseInt(env.PNCORE_AGENTS_MD_CAP_BYTES ?? "", 10);
    return Number.isFinite(n) && n >= 1024 ? n : CODEX_AGENTS_MD_CAP_BYTES;
}
export function utf8Bytes(text) {
    return Buffer.byteLength(text, "utf-8");
}
/** Statuses that never get dropped: they are the reason the packet exists. */
const KEEP_STATUSES = new Set([
    "drift",
    "missing",
    "in_progress",
    "unattested",
]);
const PACK_HINT = "Packed to budget. For the omitted detail call project_context again with a larger max_tokens, or workflow_handoff_read / workflow_run_query for the trail.";
function measure(p) {
    return JSON.stringify(p).length;
}
/**
 * A step record costs about this many chars; a section smaller than that is not worth a step
 * (dropping it would grow the packet).
 */
const STEP_RECORD_CHARS = 96;
function worthDropping(section) {
    return section != null && JSON.stringify(section).length > STEP_RECORD_CHARS;
}
/**
 * Pack a project_context packet into `maxTokens` (chars ÷ 4). Drop order, applied one step at
 * a time and stopping as soon as the packet fits:
 *
 *   1. trail        — drop oldest lines, keep the newest 3
 *   2. artifacts    — clear `notes` on settled artifacts (ok / complete_attested)
 *   3. artifacts    — drop settled artifacts; keep drift / missing / in_progress / unattested
 *   4. pointers     — drop
 *   5. trail        — drop entirely
 *   6. artifacts    — drop entirely (drift is still listed under `drift`)
 *   7. drift        — clear `notes`
 *
 * A step is skipped when the section it would remove is smaller than the step record itself.
 *
 * `mode`, `version`, `calendarDateUtc`, `context_index`, `counts`, `active_run_id`, `resume`,
 * `drift` ids, and `next_incomplete` are never removed. If the packet still exceeds the budget
 * after step 7 the result reports `fits: false`.
 */
export function packProjectContext(packet, maxTokens) {
    const out = {
        ...packet,
        budget: { maxTokens: null, estimatedTokens: 0, chars: 0, fits: true, steps: [] },
    };
    const finish = () => {
        if (out.budget.steps.length === 0)
            delete out.budget.hint;
        // The budget object is part of what is measured; iterate to a fixed point on its own digits.
        for (let i = 0; i < 4; i++) {
            const chars = measure(out);
            const tokens = Math.ceil(chars / CHARS_PER_TOKEN);
            const fits = out.budget.maxTokens == null || tokens <= out.budget.maxTokens;
            if (out.budget.chars === chars &&
                out.budget.estimatedTokens === tokens &&
                out.budget.fits === fits) {
                break;
            }
            out.budget.chars = chars;
            out.budget.estimatedTokens = tokens;
            out.budget.fits = fits;
        }
        return out;
    };
    if (maxTokens == null || !Number.isFinite(maxTokens) || maxTokens <= 0)
        return finish();
    out.budget.maxTokens = Math.floor(maxTokens);
    const budgetChars = out.budget.maxTokens * CHARS_PER_TOKEN;
    // Placeholders with the final magnitude so `over()` measures what the caller will receive.
    out.budget.chars = budgetChars;
    out.budget.estimatedTokens = out.budget.maxTokens;
    out.budget.hint = PACK_HINT;
    const over = () => measure(out) > budgetChars;
    // The step record is pushed *before* shrinking so its own size counts toward the budget;
    // otherwise a shrink that lands exactly on the boundary is undone by recording it.
    const begin = (action, placeholder) => {
        const step = { action, detail: placeholder, savedChars: 0 };
        out.budget.steps.push(step);
        const before = measure(out);
        return {
            done: (detail) => {
                step.savedChars = before - measure(out) + (placeholder.length - detail.length);
                step.detail = detail;
            },
        };
    };
    if (!over())
        return finish();
    // 1. trail: oldest first, keep the newest 3
    if (out.trail && out.trail.length > 3) {
        const original = out.trail.length;
        const step = begin("trail.trim", `kept newest ${original} of ${original} lines`);
        while (out.trail.length > 3 && over())
            out.trail = out.trail.slice(1);
        step.done(`kept newest ${out.trail.length} of ${original} lines`);
        if (!over())
            return finish();
    }
    // 2. settled artifacts: drop notes
    if (out.artifacts?.some((a) => !KEEP_STATUSES.has(a.derived_status) && a.notes.length > 0)) {
        const step = begin("artifacts.clear_settled_notes", "cleared notes on 00 settled artifacts");
        let cleared = 0;
        out.artifacts = out.artifacts.map((a) => {
            if (KEEP_STATUSES.has(a.derived_status) || a.notes.length === 0)
                return a;
            cleared++;
            return { ...a, notes: [] };
        });
        step.done(`cleared notes on ${cleared} settled artifacts`);
        if (!over())
            return finish();
    }
    // 3. settled artifacts: drop
    if (out.artifacts?.some((a) => !KEEP_STATUSES.has(a.derived_status))) {
        const step = begin("artifacts.drop_settled", "dropped 00 settled artifacts (kept drift/missing/in_progress/unattested)");
        const omitted = {};
        out.artifacts = out.artifacts.filter((a) => {
            if (KEEP_STATUSES.has(a.derived_status))
                return true;
            omitted[a.derived_status] = (omitted[a.derived_status] ?? 0) + 1;
            return false;
        });
        out.artifacts_omitted = { ...(out.artifacts_omitted ?? {}), ...omitted };
        const n = Object.values(omitted).reduce((s, x) => s + x, 0);
        step.done(`dropped ${n} settled artifacts (kept drift/missing/in_progress/unattested)`);
        if (!over())
            return finish();
    }
    // 4. pointers
    if (out.pointers && Object.keys(out.pointers).length > 0 && worthDropping(out.pointers)) {
        const n = Object.keys(out.pointers).length;
        const step = begin("pointers.drop", `dropped ${n} pointers (context-index.json has them)`);
        delete out.pointers;
        step.done(`dropped ${n} pointers (context-index.json has them)`);
        if (!over())
            return finish();
    }
    // 5. trail: all
    if (out.trail && out.trail.length > 0 && worthDropping(out.trail)) {
        const n = out.trail.length;
        const step = begin("trail.drop", `dropped remaining ${n} trail lines`);
        out.trail = [];
        step.done(`dropped remaining ${n} trail lines`);
        if (!over())
            return finish();
    }
    // 6. artifacts: all (drift ids remain under `drift`)
    if (out.artifacts && out.artifacts.length > 0) {
        const n = out.artifacts.length;
        const step = begin("artifacts.drop_all", `dropped remaining ${n} artifacts; drift ids stay under drift[]`);
        const omitted = { ...(out.artifacts_omitted ?? {}) };
        for (const a of out.artifacts)
            omitted[a.derived_status] = (omitted[a.derived_status] ?? 0) + 1;
        out.artifacts = [];
        out.artifacts_omitted = omitted;
        step.done(`dropped remaining ${n} artifacts; drift ids stay under drift[]`);
        if (!over())
            return finish();
    }
    // 7. drift notes
    const driftNotes = [...out.drift.flatMap((a) => a.notes), ...(out.next_incomplete?.notes ?? [])];
    if (driftNotes.length > 0 && worthDropping(driftNotes)) {
        const step = begin("drift.clear_notes", "cleared notes on drift and next_incomplete");
        out.drift = out.drift.map((a) => ({ ...a, notes: [] }));
        if (out.next_incomplete && out.next_incomplete.notes.length > 0) {
            out.next_incomplete = { ...out.next_incomplete, notes: [] };
        }
        step.done("cleared notes on drift and next_incomplete");
    }
    return finish();
}
