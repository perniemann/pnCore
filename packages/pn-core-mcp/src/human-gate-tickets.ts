/**
 * Opt-in mandatory human-gate approval: server-issued tickets after approval_checkpoint
 * with workflow_type + workflow_step; workflow_step consumes each ticket once.
 */

import { appendFileSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import type { WorkflowType } from "./workflows.js";
import { workflowSteps } from "./workflows.js";
import { debug } from "./debug.js";
import { readFileTail, tailScanBytesFromEnv } from "./file-tail.js";

const humanGateScanMaxBytes = tailScanBytesFromEnv(
  process.env.PNCORE_HUMAN_GATE_SCAN_BYTES,
  768 * 1024
);

const TICKET_TTL_MS = 24 * 60 * 60 * 1000;

export type TicketLineIssue = {
  v: 1;
  type: "issue";
  ts: string;
  workflowType: WorkflowType;
  step: number;
  ticket: string;
  runId?: string;
};

export type TicketLineConsumed = {
  v: 1;
  type: "consumed";
  ts: string;
  ticket: string;
};

export type TicketLine = TicketLineIssue | TicketLineConsumed;

const knownWorkflowTypes = new Set<string>(Object.keys(workflowSteps));

/** Comma-separated workflow types from PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS.
 *  Unknown entries emit a warning and are silently dropped to prevent
 *  typos from silently disabling enforcement on intended workflows. */
export function parseRequiredApprovalWorkflows(raw: string | undefined): Set<WorkflowType> | null {
  if (raw === undefined || raw.trim() === "") return null;
  const out = new Set<WorkflowType>();
  for (const part of raw.split(",")) {
    const w = part.trim();
    if (!w) continue;
    if (!knownWorkflowTypes.has(w)) {
      debug(
        "tickets",
        `PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS: unknown workflow type "${w}" — ignored. Known types: ${[...knownWorkflowTypes].join(", ")}`
      );
      continue;
    }
    out.add(w as WorkflowType);
  }
  return out.size === 0 ? null : out;
}

export function workflowRequiresHumanGateApproval(
  required: Set<WorkflowType> | null,
  workflowType: WorkflowType
): boolean {
  return required != null && required.has(workflowType);
}

function parseLines(filePath: string): TicketLine[] {
  if (!existsSync(filePath)) return [];
  const raw = readFileTail(filePath, humanGateScanMaxBytes);
  const lines: TicketLine[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t) as TicketLine;
      if (
        o &&
        typeof o === "object" &&
        o.v === 1 &&
        (o.type === "issue" || o.type === "consumed")
      ) {
        lines.push(o);
      }
    } catch (err) {
      debug("tickets", "corrupt ticket line skipped", { err: String(err) });
    }
  }
  return lines;
}

/** Append a new issue line; returns the ticket id. */
export function issueHumanGateTicket(
  filePath: string,
  workflowType: WorkflowType,
  step: number,
  runId?: string
): string {
  const ticket = randomUUID();
  const line: TicketLineIssue = {
    v: 1,
    type: "issue",
    ts: new Date().toISOString(),
    workflowType,
    step,
    ticket,
    ...(runId != null && runId !== "" ? { runId } : {}),
  };
  appendFileSync(filePath, JSON.stringify(line) + "\n", "utf-8");
  return ticket;
}

export type ConsumeResult =
  | { ok: true }
  | { ok: false; reason: string; code: "APPROVAL_REQUIRED" | "INVALID_STATE" };

/** Single-use: append consumed line if ticket matches a valid unexpired issue. */
export function validateAndConsumeHumanGateTicket(
  filePath: string,
  workflowType: WorkflowType,
  step: number,
  ticket: string | undefined,
  runIdFromState?: string | undefined
): ConsumeResult {
  if (ticket === undefined || ticket === "") {
    return {
      ok: false,
      code: "APPROVAL_REQUIRED",
      reason:
        "This workflow step is a human gate with mandatory approval. Call approval_checkpoint with the same approval_token, action_label, workflow_type, and workflow_step, then pass the returned pncoreHumanGateTicket in state on workflow_step.",
    };
  }

  const lines = parseLines(filePath);
  const consumed = new Set<string>();
  for (const L of lines) {
    if (L.type === "consumed") consumed.add(L.ticket);
  }
  if (consumed.has(ticket)) {
    return {
      ok: false,
      code: "INVALID_STATE",
      reason:
        "Human gate ticket was already consumed. Call approval_checkpoint again for this step.",
    };
  }

  const now = Date.now();
  let found: TicketLineIssue | null = null;
  for (const L of lines) {
    if (L.type !== "issue") continue;
    if (L.ticket !== ticket) continue;
    if (L.workflowType !== workflowType || L.step !== step) continue;
    const ts = Date.parse(L.ts);
    if (Number.isNaN(ts) || now - ts > TICKET_TTL_MS) continue;
    if (L.runId != null && L.runId !== "") {
      if (runIdFromState == null || runIdFromState === "" || runIdFromState !== L.runId) {
        continue;
      }
    }
    found = L;
    break;
  }

  if (!found) {
    return {
      ok: false,
      code: "APPROVAL_REQUIRED",
      reason:
        "No valid human gate ticket for this workflowType and step. Call approval_checkpoint with matching workflow_type and workflow_step (and correct approval_token).",
    };
  }

  const consumedLine: TicketLineConsumed = {
    v: 1,
    type: "consumed",
    ts: new Date().toISOString(),
    ticket,
  };
  appendFileSync(filePath, JSON.stringify(consumedLine) + "\n", "utf-8");
  return { ok: true };
}
