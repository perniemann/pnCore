/**
 * Opt-in mandatory human-gate approval: server-issued tickets after approval_checkpoint
 * with workflow_type + workflow_step; workflow_step consumes each ticket once.
 */
import type { WorkflowType } from "./workflows.js";
export type TicketLineIssue = {
    v: 1;
    type: "issue";
    ts: string;
    workflowType: WorkflowType;
    step: number;
    ticket: string;
    runId: string;
};
export type TicketLineConsumed = {
    v: 1;
    type: "consumed";
    ts: string;
    ticket: string;
};
export type TicketLine = TicketLineIssue | TicketLineConsumed;
/** Comma-separated workflow types from PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS.
 *  Unknown entries emit a warning and are silently dropped to prevent
 *  typos from silently disabling enforcement on intended workflows. */
export declare function parseRequiredApprovalWorkflows(raw: string | undefined): Set<WorkflowType> | null;
export declare function workflowRequiresHumanGateApproval(required: Set<WorkflowType> | null, workflowType: WorkflowType): boolean;
/** Append a new issue line; returns the ticket id. runId is required. */
export declare function issueHumanGateTicket(filePath: string, workflowType: WorkflowType, step: number, runId: string): string;
export type ConsumeResult = {
    ok: true;
} | {
    ok: false;
    reason: string;
    code: "APPROVAL_REQUIRED" | "INVALID_STATE";
};
/** Single-use: append consumed line if ticket matches a valid unexpired issue. */
export declare function validateAndConsumeHumanGateTicket(filePath: string, workflowType: WorkflowType, step: number, ticket: string | undefined, runIdFromState?: string | undefined): ConsumeResult;
