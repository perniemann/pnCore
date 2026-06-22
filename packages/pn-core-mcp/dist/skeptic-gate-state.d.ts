export type SkepticGateRecord = {
    verdict: string;
    go_no_go?: string;
    gate_id: string;
    confirmed_at: string;
};
export declare function isSkepticGateRecord(value: unknown): value is SkepticGateRecord;
export declare function applySkepticGateStateChecks(step: number, state: Record<string, unknown>, requiredFromState: string[]): {
    error?: string;
    warning?: string;
} | undefined;
