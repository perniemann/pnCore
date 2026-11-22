export type SkepticGateRecord = {
    verdict: string;
    go_no_go?: string;
    gate_id: string;
    confirmed_at: string;
};
export declare function isSkepticGateRecord(value: unknown): value is SkepticGateRecord;
/** Strict gate records when global flag is on or workflow intent is involved. */
export declare function strictGateRecordsRequired(state: Record<string, unknown>): boolean;
export declare function applySkepticGateStateChecks(step: number, state: Record<string, unknown>, requiredFromState: string[]): {
    error?: string;
    warning?: string;
} | undefined;
/**
 * True when a strict gate record says no_go and no iteration-cap approval covers it. The engine
 * then advances only on a ticket that approval_checkpoint issued for this run and step; the
 * workflow_step handler validates and consumes it (a non-empty string is not enough).
 */
export declare function noGoTicketRequired(state: Record<string, unknown>): boolean;
