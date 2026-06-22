/**
 * Hard HITL: approval token must match PNCORE_APPROVAL_TOKEN on the server process.
 */
export type ApprovalOk = {
    ok: true;
    approved: string;
    note: string;
};
export type ApprovalErr = {
    ok: false;
    code: "INVALID_STATE";
    error: string;
    action_label: string;
};
export declare function evaluateApprovalCheckpoint(approvalToken: string, actionLabel: string, env?: NodeJS.ProcessEnv): {
    success: true;
    data: ApprovalOk;
} | {
    success: false;
    data: ApprovalErr;
};
