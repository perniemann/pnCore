/**
 * Server-written verify attestations. Agents cannot invent kind=verify rows.
 */

import { randomUUID } from "crypto";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { readFileTail } from "./file-tail.js";
import { resolveSafePath } from "./safe-path.js";

/**
 * Why a verify did not pass. Diagnostic only: gates still pass on exit 0 alone, and no class
 * refunds an attempt or relaxes a gate.
 * - missing_input: the command or a declared input/env was absent (exit 126/127, ENOENT, preflight)
 * - infrastructure: timeout, signal, or spawn failure other than a missing command
 * - behavioral: the command ran and exited non-zero
 */
export type FailureClass = "none" | "missing_input" | "infrastructure" | "behavioral";

export function classifyVerify(r: {
  exitCode: number;
  timedOut: boolean;
  signal?: string | null;
  spawnErrorCode?: string | null;
}): FailureClass {
  if (r.spawnErrorCode) return r.spawnErrorCode === "ENOENT" ? "missing_input" : "infrastructure";
  if (r.timedOut || r.signal) return "infrastructure";
  if (r.exitCode === 0) return "none";
  if (r.exitCode === 126 || r.exitCode === 127) return "missing_input";
  return "behavioral";
}

export type PreflightCheck = {
  kind: "command" | "input" | "env";
  target: string;
  ok: boolean;
  reason?: string;
};

export type PreflightEvent = {
  kind: "preflight";
  run_id: string;
  ts: string;
  preflightId: string;
  ok: boolean;
  failureClass: "none" | "missing_input";
  checks: PreflightCheck[];
  argv: string[];
  cwd: string;
  commandId?: string;
  candidate_id?: string;
  owner?: string;
  workflowType?: string;
  step?: number;
};

export type GateReport = {
  kind: "verify";
  run_id: string;
  commandId?: string;
  argv: string[];
  cwd: string;
  exitCode: number;
  timedOut: boolean;
  stdoutTail: string;
  stderrTail: string;
  startedAt: string;
  finishedAt: string;
  attestationId: string;
  candidate_id?: string;
  workflowType?: string;
  step?: number;
  sandbox: {
    backend: "bubblewrap" | "docker" | "seatbelt" | "unavailable";
    jailed: boolean;
  };
  failureClass?: FailureClass;
  signal?: string | null;
  spawnError?: string;
  preflightId?: string;
  owner?: string;
};

export type RunEvent =
  | GateReport
  | PreflightEvent
  | {
      kind: "acceptance";
      run_id: string;
      ts: string;
      workflowType: string;
      step: number;
      phasesPassed: boolean;
      verifyEarned: boolean;
      humanEarned: boolean;
      accepted: boolean;
      reasons: string[];
    };

export function defaultRunEventsPath(): string {
  return process.env.PNCORE_RUN_EVENTS_PATH ?? ".pncore/run-events.jsonl";
}

const SCAN_MAX = 786_432;

export function newAttestationId(): string {
  return randomUUID();
}

export function appendRunEvent(
  event: RunEvent,
  filePath?: string
): { path: string } | { error: string } {
  const rel = filePath ?? defaultRunEventsPath();
  const safe = resolveSafePath(rel);
  if ("error" in safe) return { error: safe.error };
  const dir = dirname(safe.resolved);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(safe.resolved, JSON.stringify(event) + "\n", "utf-8");
  return { path: safe.resolved };
}

function parseEvent(line: string): RunEvent | null {
  try {
    const o = JSON.parse(line) as Record<string, unknown>;
    if (
      o.kind === "verify" &&
      typeof o.attestationId === "string" &&
      typeof o.run_id === "string"
    ) {
      return o as GateReport;
    }
    if (
      o.kind === "preflight" &&
      typeof o.preflightId === "string" &&
      typeof o.run_id === "string"
    ) {
      return o as PreflightEvent;
    }
    if (o.kind === "acceptance" && typeof o.run_id === "string") {
      return o as Extract<RunEvent, { kind: "acceptance" }>;
    }
    return null;
  } catch {
    return null;
  }
}

export function readRunEvents(
  run_id: string,
  opts?: { path?: string; kinds?: string[]; limit?: number }
): { events: RunEvent[]; path: string } | { error: string } {
  const rel = opts?.path ?? defaultRunEventsPath();
  const safe = resolveSafePath(rel);
  if ("error" in safe) return { error: safe.error };
  if (!existsSync(safe.resolved)) return { events: [], path: safe.resolved };
  const raw = readFileTail(safe.resolved, SCAN_MAX);
  const kinds = opts?.kinds;
  const matched: RunEvent[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const ev = parseEvent(t);
    if (!ev || ev.run_id !== run_id) continue;
    if (kinds && kinds.length > 0 && !kinds.includes(ev.kind)) continue;
    matched.push(ev);
  }
  const cap = opts?.limit && opts.limit > 0 ? Math.min(opts.limit, 200) : 80;
  return { events: matched.slice(-cap), path: safe.resolved };
}

export function loadGateReport(attestationId: string, filePath?: string): GateReport | undefined {
  const rel = filePath ?? defaultRunEventsPath();
  const safe = resolveSafePath(rel);
  if ("error" in safe || !existsSync(safe.resolved)) return undefined;
  const raw = readFileTail(safe.resolved, SCAN_MAX);
  let found: GateReport | undefined;
  for (const line of raw.split("\n")) {
    const ev = parseEvent(line.trim());
    if (ev && ev.kind === "verify" && ev.attestationId === attestationId) {
      found = ev;
    }
  }
  return found;
}

export function gatePassed(report: GateReport): boolean {
  return report.exitCode === 0 && report.timedOut === false;
}
