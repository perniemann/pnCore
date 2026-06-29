import { strictSkepticGatesEnabled } from "./features.js";

const GATE_RECORD_KEYS = ["skepticPassed", "skepticOutputPassed", "reviewComplete"] as const;

export type SkepticGateRecord = {
  verdict: string;
  go_no_go?: string;
  gate_id: string;
  confirmed_at: string;
};

export function isSkepticGateRecord(value: unknown): value is SkepticGateRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.verdict === "string" &&
    typeof o.gate_id === "string" &&
    typeof o.confirmed_at === "string"
  );
}

function isInvolvedIntent(state: Record<string, unknown>): boolean {
  return state.intent === "involved";
}

/** Strict gate records when global flag is on or workflow intent is involved. */
export function strictGateRecordsRequired(state: Record<string, unknown>): boolean {
  return strictSkepticGatesEnabled() || isInvolvedIntent(state);
}

export function applySkepticGateStateChecks(
  step: number,
  state: Record<string, unknown>,
  requiredFromState: string[]
): { error?: string; warning?: string } | undefined {
  if (!strictGateRecordsRequired(state)) return undefined;

  for (const key of GATE_RECORD_KEYS) {
    if (!requiredFromState.includes(key)) continue;
    const val = state[key];
    if (val === undefined || val === null) continue;

    if (val === true) {
      const msg = `[strictSkepticGates] ${key} is bare true; after the user confirms, set ${key} to { verdict, go_no_go, gate_id, confirmed_at } from workflow_confirm.`;
      return { error: `Step ${step} blocked: ${msg}` };
    }

    if (
      (key === "reviewComplete" || key === "skepticPassed" || key === "skepticOutputPassed") &&
      val !== false &&
      !isSkepticGateRecord(val)
    ) {
      const msg = `[strictSkepticGates] ${key} must be a structured gate record from workflow_confirm, not a bare flag.`;
      return { error: `Step ${step} blocked: ${msg}` };
    }

    if (isSkepticGateRecord(val)) {
      if (val.go_no_go === "no_go" && state.iterationCapApproved !== true) {
        const ticket = state.pncoreHumanGateTicket;
        if (typeof ticket !== "string" || ticket.trim() === "") {
          return {
            error: `Step ${step} blocked: ${key}.go_no_go is "no_go". Address must_fix items, iterate, or call approval_checkpoint before advancing.`,
          };
        }
      }
    }
  }

  return undefined;
}
