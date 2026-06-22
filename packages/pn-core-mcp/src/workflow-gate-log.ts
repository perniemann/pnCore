import { appendFileSync, mkdirSync, existsSync } from "fs";
import { dirname, resolve, sep } from "path";
import { randomUUID } from "crypto";

export const defaultGateLogPath = ".pncore/gate-log.jsonl";

export type WorkflowGateType = "skeptic" | "plan" | "design" | "discovery";
export type WorkflowGateVerdict = "proceed" | "revise" | "conditional_go";

export type WorkflowConfirmGateInput = {
  question: string;
  options: string[];
  context?: string;
  gate_type?: WorkflowGateType;
  verdict?: WorkflowGateVerdict;
  must_fix_summary?: string;
  path?: string;
};

export function validateWorkflowConfirmGate(input: WorkflowConfirmGateInput): string | null {
  const gateType = input.gate_type ?? "plan";
  const verdict = input.verdict;
  if (gateType === "skeptic" && verdict === "revise") {
    if (input.options.length < 2) {
      return "Skeptic revise gates require at least two options (Goodhart guard).";
    }
    const ctx = input.context?.trim() ?? "";
    const summary = input.must_fix_summary?.trim() ?? "";
    if (!ctx && !summary) {
      return "Skeptic revise gates require non-empty context or must_fix_summary.";
    }
  }
  return null;
}

/** Keep gate log paths within process.cwd() (same policy as gate_log_append). */
export function resolveUnderCwd(
  filePath: string,
  cwd: string = process.cwd()
): { resolved: string } | { error: string } {
  const normalizedBase = resolve(cwd);
  const normalizedResolved = resolve(normalizedBase, filePath);
  const isInside =
    normalizedResolved === normalizedBase || normalizedResolved.startsWith(normalizedBase + sep);
  if (!isInside) {
    return { error: `Path escapes workspace: ${filePath}` };
  }
  return { resolved: normalizedResolved };
}

export type WorkflowGateLogEntry = {
  timestamp: string;
  gate_type: WorkflowGateType;
  gate_id: string;
  verdict?: WorkflowGateVerdict;
  outcome: string;
  question: string;
  options: string[];
  context?: string;
  must_fix_summary?: string;
};

export function appendWorkflowGateLog(
  entry: WorkflowGateLogEntry,
  filePath: string = defaultGateLogPath,
  cwd: string = process.cwd()
): { ok: true; path: string } | { error: string } {
  const safe = resolveUnderCwd(filePath, cwd);
  if ("error" in safe) return safe;
  try {
    const resolved = safe.resolved;
    const dir = dirname(resolved);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(resolved, JSON.stringify(entry) + "\n", "utf-8");
    return { ok: true, path: resolved };
  } catch (err) {
    return { error: String(err) };
  }
}

export function createWorkflowGateLogEntry(input: WorkflowConfirmGateInput): WorkflowGateLogEntry {
  return {
    timestamp: new Date().toISOString(),
    gate_type: input.gate_type ?? "plan",
    gate_id: randomUUID(),
    verdict: input.verdict,
    outcome: "awaiting_user",
    question: input.question,
    options: input.options,
    ...(input.context?.trim() ? { context: input.context.trim() } : {}),
    ...(input.must_fix_summary?.trim() ? { must_fix_summary: input.must_fix_summary.trim() } : {}),
  };
}
