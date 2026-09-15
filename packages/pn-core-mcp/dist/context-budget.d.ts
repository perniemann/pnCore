/**
 * Context budget packing (ADR-0019) — narrow scope.
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
import type { ProjectContextPacket } from "./project-context.js";
/** The measurement already used across the repo (measure-tokens, dashboard). */
export declare const CHARS_PER_TOKEN = 4;
export declare function estimateTokens(text: string): number;
/** Codex default `project_doc_max_bytes`. */
export declare const CODEX_AGENTS_MD_CAP_BYTES: number;
export declare function agentsMdCapBytes(env?: NodeJS.ProcessEnv): number;
export declare function utf8Bytes(text: string): number;
export type PackStep = {
    /** What was done, e.g. `trail.trim`, `artifacts.drop_settled`. */
    action: string;
    detail: string;
    savedChars: number;
};
export type ContextBudget = {
    /** Requested cap in tokens; null when the caller set none. */
    maxTokens: number | null;
    estimatedTokens: number;
    chars: number;
    fits: boolean;
    steps: PackStep[];
    /** How to get what was cut, when something was. */
    hint?: string;
};
export type PackedProjectContext = ProjectContextPacket & {
    budget: ContextBudget;
    /** Artifacts removed by packing, by derived_status, when any were. */
    artifacts_omitted?: Record<string, number>;
};
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
export declare function packProjectContext(packet: ProjectContextPacket, maxTokens: number | null | undefined): PackedProjectContext;
