/**
 * Bind dispose-verify attestations to implementation_tournament step 2.
 */
import { type Acceptance } from "./acceptance.js";
import { type GateReport } from "./verify-attest.js";
export type TournamentGateOutcome = {
    skipped: true;
} | {
    error: string;
} | {
    skipped: false;
    survivors: string[];
    reports: GateReport[];
    acceptance: Acceptance;
};
export declare function applyTournamentDisposeVerify(state: Record<string, unknown>): TournamentGateOutcome;
export declare function computedObjectiveGateResults(reports: GateReport[]): Array<{
    candidate_id: string;
    passed: boolean;
    failed_commands: string[];
    attestationId: string;
}>;
