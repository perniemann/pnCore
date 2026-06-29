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
