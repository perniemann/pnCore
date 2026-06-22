import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  appendWorkflowGateLog,
  createWorkflowGateLogEntry,
  resolveUnderCwd,
  validateWorkflowConfirmGate,
} from "./workflow-gate-log.js";

describe("validateWorkflowConfirmGate", () => {
  it("rejects skeptic revise with one option", () => {
    const err = validateWorkflowConfirmGate({
      question: "Revise?",
      options: ["only"],
      gate_type: "skeptic",
      verdict: "revise",
    });
    expect(err).toContain("two options");
  });

  it("rejects skeptic revise without context or must_fix_summary", () => {
    const err = validateWorkflowConfirmGate({
      question: "Revise?",
      options: ["apply", "push_back"],
      gate_type: "skeptic",
      verdict: "revise",
    });
    expect(err).toContain("context");
  });

  it("accepts skeptic revise with must_fix_summary", () => {
    const err = validateWorkflowConfirmGate({
      question: "Revise?",
      options: ["apply", "push_back"],
      gate_type: "skeptic",
      verdict: "revise",
      must_fix_summary: "Drop skeptic_gate tool",
    });
    expect(err).toBeNull();
  });

  it("accepts skeptic revise with context only", () => {
    const err = validateWorkflowConfirmGate({
      question: "Revise?",
      options: ["apply", "push_back"],
      gate_type: "skeptic",
      verdict: "revise",
      context: "Concrete plan changes listed above.",
    });
    expect(err).toBeNull();
  });

  it("allows non-skeptic gates without extra fields", () => {
    expect(
      validateWorkflowConfirmGate({
        question: "Proceed?",
        options: ["yes"],
        gate_type: "plan",
      })
    ).toBeNull();
  });
});

describe("resolveUnderCwd", () => {
  it("rejects paths that escape cwd", () => {
    const dir = mkdtempSync(join(tmpdir(), "pn-gate-safe-"));
    const r = resolveUnderCwd("../../escape-gate.jsonl", dir);
    expect(r).toHaveProperty("error");
  });
});

describe("createWorkflowGateLogEntry", () => {
  it("trims context and must_fix_summary", () => {
    const entry = createWorkflowGateLogEntry({
      question: "Q?",
      options: ["a", "b"],
      context: "  summary  ",
      must_fix_summary: "  fix  ",
    });
    expect(entry.context).toBe("summary");
    expect(entry.must_fix_summary).toBe("fix");
  });
});

describe("appendWorkflowGateLog", () => {
  it("writes JSONL line under cwd", () => {
    const dir = mkdtempSync(join(tmpdir(), "pn-gate-"));
    const rel = ".pncore/gate-log-test.jsonl";
    const entry = createWorkflowGateLogEntry({
      question: "Proceed?",
      options: ["proceed", "revise_plan"],
      gate_type: "skeptic",
      verdict: "proceed",
    });
    const r = appendWorkflowGateLog(entry, rel, dir);
    expect(r).toEqual(expect.objectContaining({ ok: true }));
    const text = readFileSync(join(dir, rel), "utf-8");
    const line = JSON.parse(text.trim()) as { gate_id: string; gate_type: string };
    expect(line.gate_id).toBe(entry.gate_id);
    expect(line.gate_type).toBe("skeptic");
  });

  it("returns path error when log path escapes cwd", () => {
    const dir = mkdtempSync(join(tmpdir(), "pn-gate-io-"));
    const r = appendWorkflowGateLog(
      createWorkflowGateLogEntry({ question: "Q", options: ["a"] }),
      "../../escape-gate.jsonl",
      dir
    );
    expect(r).toHaveProperty("error");
  });
});
