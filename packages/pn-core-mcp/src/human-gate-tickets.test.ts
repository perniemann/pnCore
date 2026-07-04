import { describe, it, expect } from "vitest";
import { appendFileSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  issueHumanGateTicket,
  parseRequiredApprovalWorkflows,
  validateAndConsumeHumanGateTicket,
  workflowRequiresHumanGateApproval,
  type TicketLineIssue,
} from "./human-gate-tickets.js";
import { workflowSteps, type WorkflowType } from "./workflows.js";

function freshFile(prefix = "pn-hg-"): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return join(dir, "t.jsonl");
}

describe("human-gate-tickets runId", () => {
  it("consumes when ticket runId matches state runId", () => {
    const p = freshFile();
    const ticket = issueHumanGateTicket(p, "full_dev", 2, "run-a");
    expect(validateAndConsumeHumanGateTicket(p, "full_dev", 2, ticket, "run-a").ok).toBe(true);
  });

  it("rejects when ticket has runId and state runId differs", () => {
    const p = freshFile();
    const ticket = issueHumanGateTicket(p, "full_dev", 2, "run-a");
    const r = validateAndConsumeHumanGateTicket(p, "full_dev", 2, ticket, "run-b");
    expect(r.ok).toBe(false);
  });

  it("rejects ticket without runId", () => {
    const p = freshFile();
    const raw = JSON.stringify({
      v: 1,
      type: "issue",
      ts: new Date().toISOString(),
      workflowType: "full_dev",
      step: 1,
      ticket: "no-run-id-ticket",
    });
    appendFileSync(p, raw + "\n", "utf-8");
    const r = validateAndConsumeHumanGateTicket(p, "full_dev", 1, "no-run-id-ticket", "run-x");
    expect(r.ok).toBe(false);
  });
});

describe("parseRequiredApprovalWorkflows", () => {
  // Pin the literal workflow types to known keys; assert they exist in workflowSteps
  // so the test fails loudly if a future rename breaks the contract.
  it("uses known workflow types", () => {
    expect(workflowSteps).toHaveProperty("full_dev");
    expect(workflowSteps).toHaveProperty("frontend_audit");
  });

  type Row = { input: string | undefined; expected: WorkflowType[] | null };
  const rows: Row[] = [
    { input: undefined, expected: null },
    { input: "", expected: null },
    { input: "   ", expected: null },
    { input: "full_dev", expected: ["full_dev"] },
    { input: "full_dev,frontend_audit", expected: ["frontend_audit", "full_dev"] },
    { input: "  full_dev ,  frontend_audit  ", expected: ["frontend_audit", "full_dev"] },
    { input: "bogus_workflow", expected: null },
    { input: "full_dev,bogus_workflow", expected: ["full_dev"] },
  ];

  it.each(rows)("input=%j -> $expected", ({ input, expected }) => {
    const r = parseRequiredApprovalWorkflows(input);
    if (expected === null) {
      expect(r).toBeNull();
    } else {
      expect(r).not.toBeNull();
      const got = [...(r as Set<WorkflowType>)].sort();
      expect(got).toEqual([...expected].sort());
    }
  });
});

describe("workflowRequiresHumanGateApproval", () => {
  it("returns false when required set is null", () => {
    expect(workflowRequiresHumanGateApproval(null, "full_dev")).toBe(false);
  });

  it("returns true when set contains the workflow", () => {
    const set = new Set<WorkflowType>(["full_dev"]);
    expect(workflowRequiresHumanGateApproval(set, "full_dev")).toBe(true);
  });

  it("returns false when set lacks the workflow", () => {
    const set = new Set<WorkflowType>(["full_dev"]);
    expect(workflowRequiresHumanGateApproval(set, "frontend_audit")).toBe(false);
  });
});

describe("validateAndConsumeHumanGateTicket edge cases", () => {
  it("returns APPROVAL_REQUIRED with helpful reason when ticket is undefined", () => {
    const p = freshFile();
    const r = validateAndConsumeHumanGateTicket(p, "full_dev", 1, undefined);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("APPROVAL_REQUIRED");
      expect(r.reason).toMatch(/approval_checkpoint/);
    }
  });

  it("returns APPROVAL_REQUIRED when ticket is empty string", () => {
    const p = freshFile();
    const r = validateAndConsumeHumanGateTicket(p, "full_dev", 1, "");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("APPROVAL_REQUIRED");
  });

  it("reason for missing ticket pins the wire-contract field name pncoreHumanGateTicket", () => {
    // MCP clients grep this literal to recover; renaming silently breaks them.
    const p = freshFile();
    const r = validateAndConsumeHumanGateTicket(p, "full_dev", 1, undefined);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("pncoreHumanGateTicket");
    }
  });

  it("rejects replay (consume same ticket twice -> INVALID_STATE)", () => {
    const p = freshFile();
    const ticket = issueHumanGateTicket(p, "full_dev", 1, "run-test");
    expect(validateAndConsumeHumanGateTicket(p, "full_dev", 1, ticket, "run-test").ok).toBe(true);
    const second = validateAndConsumeHumanGateTicket(p, "full_dev", 1, ticket, "run-test");
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.code).toBe("INVALID_STATE");
      expect(second.reason).toMatch(/already consumed/);
    }
  });

  it("rejects when workflowType differs from issued ticket", () => {
    const p = freshFile();
    const ticket = issueHumanGateTicket(p, "full_dev", 1, "run-test");
    const r = validateAndConsumeHumanGateTicket(p, "frontend_audit", 1, ticket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("APPROVAL_REQUIRED");
  });

  it("rejects when step differs from issued ticket", () => {
    const p = freshFile();
    const ticket = issueHumanGateTicket(p, "full_dev", 1, "run-test");
    const r = validateAndConsumeHumanGateTicket(p, "full_dev", 2, ticket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("APPROVAL_REQUIRED");
  });

  it("rejects expired ticket (>24h old)", () => {
    const p = freshFile();
    const ticket = "11111111-1111-1111-1111-111111111111";
    const stale: TicketLineIssue = {
      v: 1,
      type: "issue",
      ts: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      workflowType: "full_dev",
      step: 1,
      ticket,
      runId: "run-stale",
    };
    appendFileSync(p, JSON.stringify(stale) + "\n", "utf-8");
    const r = validateAndConsumeHumanGateTicket(p, "full_dev", 1, ticket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("APPROVAL_REQUIRED");
  });

  it("skips corrupt JSONL lines and still consumes the valid ticket after them", () => {
    const p = freshFile();
    appendFileSync(p, "not-json\n{partial broken\n", "utf-8");
    const ticket = issueHumanGateTicket(p, "full_dev", 1, "run-test");
    expect(validateAndConsumeHumanGateTicket(p, "full_dev", 1, ticket, "run-test").ok).toBe(true);
  });

  it("returns APPROVAL_REQUIRED when ticket file does not exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "pn-hg-missing-"));
    const p = join(dir, "never-written.jsonl");
    const r = validateAndConsumeHumanGateTicket(p, "full_dev", 1, "abc");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("APPROVAL_REQUIRED");
  });

  it("rejects ticket with malformed timestamp (NaN ts)", () => {
    const p = freshFile();
    const ticket = "22222222-2222-2222-2222-222222222222";
    const malformed: TicketLineIssue = {
      v: 1,
      type: "issue",
      ts: "not-a-real-date",
      workflowType: "full_dev",
      step: 1,
      ticket,
    };
    appendFileSync(p, JSON.stringify(malformed) + "\n", "utf-8");
    const r = validateAndConsumeHumanGateTicket(p, "full_dev", 1, ticket);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("APPROVAL_REQUIRED");
  });
});
