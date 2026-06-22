export declare const defaultGateLogPath = ".pncore/gate-log.jsonl";
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
export declare function validateWorkflowConfirmGate(input: WorkflowConfirmGateInput): string | null;
/** Keep gate log paths within process.cwd() (same policy as gate_log_append). */
export declare function resolveUnderCwd(filePath: string, cwd?: string): {
    resolved: string;
} | {
    error: string;
};
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
export declare function appendWorkflowGateLog(entry: WorkflowGateLogEntry, filePath?: string, cwd?: string): {
    ok: true;
    path: string;
} | {
    error: string;
};
export declare function createWorkflowGateLogEntry(input: WorkflowConfirmGateInput): WorkflowGateLogEntry;
