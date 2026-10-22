/**
 * Server-earned acceptance for full_dev step 6 (delivery ledger).
 *
 * Computed only when an attestation feature is on (disposeVerify or strictSkepticGates).
 * With both off the server has nothing it could have earned acceptance from, so it returns
 * "unearned" and writes no acceptance event, instead of marking every default run not_accepted.
 */

import { computeAcceptance, type Acceptance, type AcceptanceScope } from "./acceptance.js";
import { disposeVerifyEnabled, strictSkepticGatesEnabled } from "./features.js";
import { isSkepticGateRecord } from "./skeptic-gate-state.js";
import { gatePassed, loadGateReport } from "./verify-attest.js";

const DELIVERY_GATES = ["reviewComplete", "skepticOutputPassed"] as const;

export function fullDevAcceptance(state: Record<string, unknown>): Acceptance | "unearned" {
  const verifyOn = disposeVerifyEnabled();
  if (!verifyOn && !strictSkepticGatesEnabled()) return "unearned";

  const reasons: string[] = [];
  let phasesPassed = true;
  let humanEarned = true;
  for (const key of DELIVERY_GATES) {
    const val = state[key];
    if (!val) {
      phasesPassed = false;
      humanEarned = false;
      reasons.push(`${key}_missing`);
      continue;
    }
    if (!isSkepticGateRecord(val)) {
      humanEarned = false;
      reasons.push(`${key}_not_structured`);
      continue;
    }
    if (val.go_no_go === "no_go") {
      phasesPassed = false;
      humanEarned = false;
      reasons.push(`${key}_no_go`);
    }
  }

  let verifyEarned = false;
  if (!verifyOn) {
    reasons.push("verify_unavailable");
  } else {
    const ids = Array.isArray(state.verifyAttestationIds)
      ? state.verifyAttestationIds.filter(
          (x): x is string => typeof x === "string" && x.trim() !== ""
        )
      : [];
    if (ids.length === 0) reasons.push("no_verify_attestations");
    const runId = typeof state.run_id === "string" ? state.run_id : null;
    let allPassed = ids.length > 0;
    for (const id of ids) {
      const report = loadGateReport(id);
      if (!report) {
        allPassed = false;
        reasons.push(`unknown_attestation:${id}`);
      } else if (runId && report.run_id !== runId) {
        allPassed = false;
        reasons.push(`attestation_run_mismatch:${id}`);
      } else if (!gatePassed(report)) {
        allPassed = false;
        reasons.push(`verify_failed:${id}:${report.failureClass ?? "behavioral"}`);
      }
    }
    verifyEarned = allPassed;
  }

  const scope: AcceptanceScope = verifyEarned ? "static" : "source";
  return computeAcceptance({ phasesPassed, verifyEarned, humanEarned, reasons, scope });
}
