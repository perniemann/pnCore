/**
 * Engine trails are the JSONL files whose lines readers trust: served steps (ADR-0025), verify
 * attestations, human-gate tickets, gate verdicts, handoff commits (ADR-0022), usage, skill loads
 * and state-save records. A tool that appends to a caller-chosen path may write only its own
 * trail, so no pn-core tool can put a line into a trail another writer owns (ADR-0029).
 */
import { resolve } from "path";
import { realpathDeepest, safeBase } from "./safe-path.js";
import { trailPaths } from "./run-spans.js";
import { STATE_SAVES_REL } from "./state-path.js";

export type TrailKind =
  "steps" | "events" | "tickets" | "gate" | "handoff" | "usage" | "loads" | "stateSaves";

/** Workspace-relative path of every engine trail, honouring the same env overrides as the writers. */
export function engineTrails(env: NodeJS.ProcessEnv = process.env): Record<TrailKind, string> {
  const t = trailPaths(env);
  return {
    steps: t.steps,
    events: t.events,
    tickets: env.PNCORE_HUMAN_GATE_TICKETS_PATH ?? ".pncore/human-gate-tickets.jsonl",
    gate: t.gate,
    handoff: t.handoff,
    usage: t.usage,
    loads: t.loads,
    stateSaves: STATE_SAVES_REL,
  };
}

/**
 * Null when `resolvedPath` is not an engine trail or is the caller's own trail; otherwise the
 * reason the write is refused. Paths compare after resolving symlinks.
 */
export function reservedTrailError(
  resolvedPath: string,
  own: TrailKind,
  opts: { base?: string; env?: NodeJS.ProcessEnv } = {}
): string | null {
  const base = opts.base ?? safeBase;
  const target = realpathDeepest(resolve(base, resolvedPath));
  for (const [kind, rel] of Object.entries(engineTrails(opts.env)) as Array<[TrailKind, string]>) {
    if (!rel || kind === own) continue;
    if (realpathDeepest(resolve(base, rel)) === target) {
      return `Path is the engine's ${kind} trail; this tool writes only the ${own} trail.`;
    }
  }
  return null;
}
