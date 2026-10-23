import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { handleWorkflowRunQuery, handleWorkflowVerify } from "./tools/handlers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const passCwd = join(__dirname, "fixtures", "verify-pass");

afterEach(() => {
  vi.unstubAllEnvs();
});

function parse(result: { content: [{ type: "text"; text: string }] }) {
  return JSON.parse(result.content[0]!.text) as Record<string, unknown>;
}

describe("handleWorkflowVerify", () => {
  it("fail-closes when the flag is off", async () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "0");
    const r = await handleWorkflowVerify({ run_id: "r", commandId: "npm_test" });
    expect(r.isError).toBe(true);
    expect(parse(r).code).toBe("DISPOSE_UNAVAILABLE");
  });

  it("runs catalog npm_test and is queryable", async () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    vi.stubEnv("PNCORE_RUN_EVENTS_PATH", ".pncore/test-handler-events.jsonl");
    const r = await handleWorkflowVerify({
      run_id: "run-handler",
      commandId: "npm_test",
      cwd: passCwd,
      candidate_id: "path-a",
      workflowType: "implementation_tournament",
      step: 2,
    });
    expect(r.isError).toBeFalsy();
    const body = parse(r);
    expect(body.ok).toBe(true);
    expect(body.exitCode).toBe(0);
    expect(typeof body.attestationId).toBe("string");
    const q = await handleWorkflowRunQuery({ run_id: "run-handler" });
    const qbody = parse(q);
    expect((qbody.verify as unknown[]).length).toBeGreaterThan(0);
  });

  it("rejects both commandId and argv, traversal, and free-form without flag", async () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    const both = await handleWorkflowVerify({
      run_id: "r",
      commandId: "npm_test",
      argv: ["npm", "test"],
    });
    expect(parse(both).code).toBe("INVALID_STATE");
    const trav = await handleWorkflowVerify({
      run_id: "r",
      commandId: "npm_test",
      cwd: "../outside",
    });
    expect(parse(trav).code).toBe("PATH_TRAVERSAL");
    const argv = await handleWorkflowVerify({ run_id: "r", argv: ["npm", "test"] });
    expect(parse(argv).code).toBe("INVALID_ARGV");
  });

  it("accepts free-form argv when allowed and rejects unsafe tokens", async () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    vi.stubEnv("PNCORE_DISPOSE_VERIFY_ALLOW_ARGV", "1");
    const bad = await handleWorkflowVerify({ run_id: "r", argv: ["sh", "-c", "id"] });
    expect(parse(bad).code).toBe("INVALID_ARGV");
    const ok = await handleWorkflowVerify({
      run_id: "r2",
      argv: ["npm", "test"],
      cwd: passCwd,
    });
    expect(parse(ok).ok).toBe(true);
  });
});

describe("handleWorkflowVerify preflight and failure classes", () => {
  const failCwd = join(__dirname, "fixtures", "verify-fail");
  const events = ".pncore/test-preflight-events.jsonl";

  beforeEach(() => {
    rmSync(events, { force: true });
  });

  it("preflight_only records checks without spawning and works with disposeVerify off", async () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "0");
    vi.stubEnv("PNCORE_RUN_EVENTS_PATH", events);
    vi.stubEnv("PREFLIGHT_PRESENT", "1");
    vi.stubEnv("PNCORE_VERIFY_PASS_ENV", "PREFLIGHT_PRESENT,PREFLIGHT_ABSENT_XYZ");
    const r = await handleWorkflowVerify({
      run_id: "run-pre-only",
      commandId: "npm_test",
      cwd: passCwd,
      preflight_only: true,
      inputs: [{ path: "package.json", access: "read" }, { path: "missing.txt" }],
      env_required: ["PREFLIGHT_PRESENT", "PREFLIGHT_ABSENT_XYZ"],
      owner: "platform",
    });
    expect(r.isError).toBeFalsy();
    const body = parse(r);
    expect(body).toMatchObject({
      launched: false,
      kind: "preflight",
      ok: false,
      failureClass: "missing_input",
      owner: "platform",
    });
    const failed = (body.checks as Array<{ target: string; ok: boolean }>)
      .filter((c) => !c.ok)
      .map((c) => c.target);
    expect(failed).toEqual(["missing.txt", "PREFLIGHT_ABSENT_XYZ"]);

    const q = parse(
      await handleWorkflowRunQuery({ run_id: "run-pre-only", kinds: ["preflight"], path: events })
    );
    expect((q.events as unknown[]).length).toBe(1);
    expect(q.verify).toEqual([]);
  });

  it("a failed preflight launches nothing and writes no verify receipt", async () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    vi.stubEnv("PNCORE_RUN_EVENTS_PATH", events);
    const r = parse(
      await handleWorkflowVerify({
        run_id: "run-pre-fail",
        commandId: "npm_test",
        cwd: passCwd,
        env_required: ["PNCORE_PREFLIGHT_ABSENT_XYZ"],
      })
    );
    expect(r).toMatchObject({ launched: false, failureClass: "missing_input" });
    const q = parse(
      await handleWorkflowRunQuery({ run_id: "run-pre-fail", kinds: ["verify"], path: events })
    );
    expect(q.events).toEqual([]);
  });

  it("a passing preflight links to the verify receipt; exit codes are classified", async () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    vi.stubEnv("PNCORE_RUN_EVENTS_PATH", events);
    const pass = parse(
      await handleWorkflowVerify({
        run_id: "run-pre-pass",
        commandId: "npm_test",
        cwd: passCwd,
        inputs: [{ path: "package.json" }],
      })
    );
    expect(pass).toMatchObject({ ok: true, exitCode: 0, failureClass: "none" });
    expect(typeof pass.preflightId).toBe("string");

    const fail = parse(
      await handleWorkflowVerify({ run_id: "run-behavioral", commandId: "npm_test", cwd: failCwd })
    );
    expect(fail.exitCode).not.toBe(0);
    expect(fail.failureClass).toBe("behavioral");
    expect(fail.preflightId).toBeUndefined();
  });

  it("a command that cannot spawn yields a receipt classified missing_input", async () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    vi.stubEnv("PNCORE_DISPOSE_VERIFY_ALLOW_ARGV", "1");
    vi.stubEnv("PNCORE_VERIFY_SANDBOX", "test");
    vi.stubEnv("PNCORE_RUN_EVENTS_PATH", events);
    const r = await handleWorkflowVerify({
      run_id: "run-spawn",
      argv: ["npm", "test"],
      cwd: "pncore-missing-dir-xyz",
    });
    expect(r.isError).toBeFalsy();
    const body = parse(r);
    expect(body).toMatchObject({ ok: true, exitCode: 127, failureClass: "missing_input" });
    expect(String(body.spawnError)).toMatch(/ENOENT/);
  });

  it("operator-allowed env_required names reach the command, redacted from its output", async () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    vi.stubEnv("PNCORE_DISPOSE_VERIFY_ALLOW_ARGV", "1");
    vi.stubEnv("PNCORE_VERIFY_SANDBOX", "test");
    vi.stubEnv("PNCORE_RUN_EVENTS_PATH", events);
    vi.stubEnv("VERIFY_TEST_PASSED_VAR", "visible");
    const argv = ["node", join(__dirname, "fixtures", "verify-print-env.mjs")];
    const run = async (env_required?: string[]) =>
      parse(await handleWorkflowVerify({ run_id: "run-env", argv, env_required }));

    const notAllowed = await run(["VERIFY_TEST_PASSED_VAR"]);
    expect(notAllowed).toMatchObject({ launched: false, failureClass: "missing_input" });
    expect(notAllowed.checks).toContainEqual({
      kind: "env",
      target: "VERIFY_TEST_PASSED_VAR",
      ok: false,
      reason: "not in PNCORE_VERIFY_PASS_ENV",
    });

    vi.stubEnv("PNCORE_VERIFY_PASS_ENV", "VERIFY_TEST_PASSED_VAR");
    const withEnv = await run(["VERIFY_TEST_PASSED_VAR"]);
    expect(withEnv).toMatchObject({
      exitCode: 0,
      stdoutTail: "length=7 value=[REDACTED:VERIFY_TEST_PASSED_VAR]",
    });
    expect(JSON.stringify(withEnv)).not.toContain("visible");
    expect((await run()).stdoutTail).toBe("absent");
  });

  it("never forwards PNCORE_* names, even when the operator lists them", async () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    vi.stubEnv("PNCORE_RUN_EVENTS_PATH", events);
    vi.stubEnv("PNCORE_APPROVAL_TOKEN", "approval-secret");
    vi.stubEnv("PNCORE_VERIFY_PASS_ENV", "PNCORE_APPROVAL_TOKEN");
    const r = parse(
      await handleWorkflowVerify({
        run_id: "run-env-token",
        commandId: "npm_test",
        cwd: passCwd,
        env_required: ["PNCORE_APPROVAL_TOKEN"],
      })
    );
    expect(r).toMatchObject({ launched: false, failureClass: "missing_input" });
    expect(JSON.stringify(r)).not.toContain("approval-secret");
  });
});
