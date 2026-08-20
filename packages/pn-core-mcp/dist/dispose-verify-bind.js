/**
 * Bind dispose-verify attestations to implementation_tournament step 2.
 */
import { computeAcceptance } from "./acceptance.js";
import { disposeVerifyEnabled } from "./features.js";
import { gatePassed, loadGateReport } from "./verify-attest.js";
function attestationIdsFromState(state) {
    const raw = state.verifyAttestationIds;
    if (Array.isArray(raw)) {
        return raw.filter((x) => typeof x === "string" && x.trim() !== "");
    }
    const gates = state.objectiveGateResults;
    if (!Array.isArray(gates))
        return [];
    const ids = [];
    for (const g of gates) {
        if (g &&
            typeof g === "object" &&
            typeof g.attestationId === "string") {
            const id = g.attestationId.trim();
            if (id)
                ids.push(id);
        }
    }
    return ids;
}
function candidateIds(state) {
    const fromCandidates = Array.isArray(state.candidates)
        ? state.candidates
            .map((c) => (c && typeof c === "object" ? c.id : undefined))
            .filter((id) => typeof id === "string" && id.trim() !== "")
        : [];
    if (fromCandidates.length > 0)
        return fromCandidates;
    const gates = state.objectiveGateResults;
    if (!Array.isArray(gates))
        return [];
    return gates
        .map((g) => g && typeof g === "object" ? g.candidate_id : undefined)
        .filter((id) => typeof id === "string" && id.trim() !== "");
}
export function applyTournamentDisposeVerify(state) {
    if (!disposeVerifyEnabled())
        return { skipped: true };
    const ids = attestationIdsFromState(state);
    if (ids.length === 0) {
        return {
            error: "Step 2 requires verifyAttestationIds (or objectiveGateResults[].attestationId) from workflow_verify when disposeVerify is enabled. Agent-supplied passed flags are ignored.",
        };
    }
    const reports = [];
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
export function computedObjectiveGateResults(reports) {
    return reports.map((r) => ({
        candidate_id: r.candidate_id ?? r.attestationId,
        passed: gatePassed(r),
        failed_commands: gatePassed(r) ? [] : [r.commandId ?? r.argv.join(" ")],
        attestationId: r.attestationId,
    }));
}
