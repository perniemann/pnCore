import { randomUUID } from "crypto";

export function resolveWorkflowRunId(state: Record<string, unknown>): string {
  const a = state.run_id;
  const b = state.pncoreRunId;
  if (typeof a === "string" && a.trim() !== "") return a.trim();
  if (typeof b === "string" && b.trim() !== "") return b.trim();
  return randomUUID();
}
