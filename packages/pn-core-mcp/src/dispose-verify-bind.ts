/**
 * Bind dispose-verify attestations to implementation_tournament step 2.
 */

import { computeAcceptance, type Acceptance } from "./acceptance.js";
import { disposeVerifyEnabled } from "./features.js";
import { gatePassed, loadGateReport, type GateReport } from "./verify-attest.js";

export type TournamentGateOutcome =
  | { skipped: true }
  | { error: string }
  | {
      skipped: false;
      survivors: string[];
      reports: GateReport[];
      acceptance: Acceptance;
    };

function attestationIdsFromState(state: Record<string, unknown>): string[] {
  const raw = state.verifyAttestationIds;
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.trim() !== "");
  }
  const gates = state.objectiveGateResults;
  if (!Array.isArray(gates)) return [];
  const ids: string[] = [];
  for (const g of gates) {
    if (
      g &&
      typeof g === "object" &&
      typeof (g as { attestationId?: unknown }).attestationId === "string"
    ) {
      const id = (g as { attestationId: string }).attestationId.trim();
      if (id) ids.push(id);
    }
  }
  return ids;
}

function candidateIds(state: Record<string, unknown>): string[] {
  const fromCandidates = Array.isArray(state.candidates)
    ? state.candidates
        .map((c) => (c && typeof c === "object" ? (c as { id?: unknown }).id : undefined))
        .filter((id): id is string => typeof id === "string" && id.trim() !== "")
    : [];
  if (fromCandidates.length > 0) return fromCandidates;
  const gates = state.objectiveGateResults;
  if (!Array.isArray(gates)) return [];
  return gates
    .map((g) =>
      g && typeof g === "object" ? (g as { candidate_id?: unknown }).candidate_id : undefined
    )
    .filter((id): id is string => typeof id === "string" && id.trim() !== "");
}

export function applyTournamentDisposeVerify(
  state: Record<string, unknown>
): TournamentGateOutcome {
  if (!disposeVerifyEnabled()) return { skipped: true };

  const ids = attestationIdsFromState(state);
  if (ids.length === 0) {
    return {
      error:
        "Step 2 requires verifyAttestationIds (or objectiveGateResults[].attestationId) from workflow_verify when disposeVerify is enabled. Agent-supplied passed flags are ignored.",
    };
  }

  const reports: GateReport[] = [];
  for (const id of ids) {
    const report = loadGateReport(id);
    if (!report) {
      return { error: `Unknown or unattested verifyAttestationId: ${id}` };
    }
    reports.push(report);
  }

  const needed = candidateIds(state);
  if (needed.length > 0) {
    for (const cid of needed) {
      const hit = reports.some((r) => r.candidate_id === cid);
      if (!hit) {
        return {
          error: `Missing workflow_verify attestation for candidate_id: ${cid}`,
        };
      }
    }
  }

  const survivors = reports.filter(gatePassed).map((r) => r.candidate_id ?? r.attestationId);
  const verifyEarned = reports.length > 0;
  const acceptance = computeAcceptance({
    phasesPassed: true,
    verifyEarned,
    humanEarned: true,
    accepted: survivors.length > 0,
    reasons: survivors.length === 0 ? ["zero_survivors"] : [],
  });

  return { skipped: false, survivors, reports, acceptance };
}

export function computedObjectiveGateResults(reports: GateReport[]): Array<{
  candidate_id: string;
  passed: boolean;
  failed_commands: string[];
  attestationId: string;
}> {
  return reports.map((r) => ({
    candidate_id: r.candidate_id ?? r.attestationId,
    passed: gatePassed(r),
    failed_commands: gatePassed(r) ? [] : [r.commandId ?? r.argv.join(" ")],
    attestationId: r.attestationId,
  }));
}
