import { afterEach, describe, expect, it, vi } from "vitest";
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
