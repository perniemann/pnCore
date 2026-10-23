import { afterEach, describe, expect, it, vi } from "vitest";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  assertSafeArgv,
  clampTimeoutMs,
  commandExists,
  resolveSandboxBackend,
  sandboxLabel,
  spawnVerify,
  tailOutput,
  buildBwrapArgv,
  redactForwarded,
  verifyChildEnv,
  VerifyPolicyError,
} from "./verify-sandbox.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const passCwd = join(__dirname, "fixtures", "verify-pass");
const failCwd = join(__dirname, "fixtures", "verify-fail");
const hangJs = join(__dirname, "fixtures", "verify-hang.mjs");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verify-sandbox policy", () => {
  it("rejects empty argv, metacharacters, shells, and -c/-e", () => {
    expect(() => assertSafeArgv([])).toThrow(VerifyPolicyError);
    expect(() => assertSafeArgv(["npm", "test;rm"])).toThrow(/metacharacters/);
    expect(() => assertSafeArgv(["sh", "-c", "id"])).toThrow(/not allowed/);
    expect(() => assertSafeArgv(["npx", "-c", "id"])).toThrow(/not allowed/);
    expect(() => assertSafeArgv(["node", "-e", "1"])).toThrow(/-c/);
    expect(() => assertSafeArgv(["node", "--call", "x"])).toThrow(/-c/);
    expect(() => assertSafeArgv([""])).toThrow(/non-empty/);
  });

  it("rejects free-form binaries outside the allowlist", () => {
    expect(() => assertSafeArgv(["curl", "https://example.com"], { freeform: true })).toThrow(
      /allowlist/
    );
    expect(() => assertSafeArgv(["npm", "test"], { freeform: true })).not.toThrow();
  });

  it("clamps timeout", () => {
    expect(clampTimeoutMs(undefined)).toBe(60_000);
    expect(clampTimeoutMs(100)).toBe(1_000);
    expect(clampTimeoutMs(999_999)).toBe(300_000);
    expect(clampTimeoutMs(Number.NaN)).toBe(60_000);
  });

  it("commandExists finds node and not a fake binary", () => {
    expect(commandExists("node")).toBe(true);
    expect(commandExists("definitely-not-installed-xyz")).toBe(false);
  });
});

describe("resolveSandboxBackend", () => {
  it("honors forced unavailable, restricted, and test", () => {
    vi.stubEnv("PNCORE_VERIFY_SANDBOX", "unavailable");
    expect(resolveSandboxBackend()).toBe("unavailable");
    vi.stubEnv("PNCORE_VERIFY_SANDBOX", "restricted");
    expect(resolveSandboxBackend()).toBe("restricted");
    vi.stubEnv("PNCORE_VERIFY_SANDBOX", "test");
    expect(resolveSandboxBackend()).toBe("test");
  });

  it("test backend is unavailable when not in a test process", () => {
    vi.stubEnv("PNCORE_VERIFY_SANDBOX", "test");
    vi.stubEnv("VITEST", "");
    vi.stubEnv("VITEST_WORKER_ID", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(resolveSandboxBackend()).toBe("unavailable");
  });

  it("bwrap force is unavailable when bwrap is missing", () => {
    if (commandExists("bwrap")) {
      vi.stubEnv("PNCORE_VERIFY_SANDBOX", "bubblewrap");
      expect(resolveSandboxBackend()).toBe("bubblewrap");
    } else {
      vi.stubEnv("PNCORE_VERIFY_SANDBOX", "bwrap");
      expect(resolveSandboxBackend()).toBe("unavailable");
    }
  });

  it("labels sandbox backends", () => {
    expect(sandboxLabel("bubblewrap")).toEqual({ backend: "bubblewrap", jailed: true });
    expect(sandboxLabel("unavailable")).toEqual({ backend: "unavailable", jailed: false });
    expect(sandboxLabel("test")).toEqual({ backend: "unavailable", jailed: false });
    expect(sandboxLabel("restricted")).toEqual({ backend: "unavailable", jailed: false });
  });
});

describe("spawnVerify", () => {
  it("runs npm_test on the pass fixture", async () => {
    const r = await spawnVerify({ argv: ["npm", "test"], cwd: passCwd, backend: "test" });
    expect(r.exitCode).toBe(0);
    expect(r.timedOut).toBe(false);
  });

  it("runs npm_test on the fail fixture", async () => {
    const r = await spawnVerify({ argv: ["npm", "test"], cwd: failCwd, backend: "test" });
    expect(r.exitCode).toBe(1);
    expect(r.timedOut).toBe(false);
  });

  it("rejects unavailable backend without spawning", async () => {
    await expect(
      spawnVerify({ argv: ["npm", "test"], cwd: passCwd, backend: "unavailable" })
    ).rejects.toMatchObject({ code: "DISPOSE_UNAVAILABLE" });
  });

  it("times out a hanging node script", async () => {
    const r = await spawnVerify({
      argv: ["node", hangJs],
      cwd: __dirname,
      backend: "test",
      timeoutMs: 1000,
    });
    expect(r.timedOut).toBe(true);
    expect(r.exitCode).toBe(124);
  });

  it("uses bwrap when present", async () => {
    if (!commandExists("bwrap")) return;
    const r = await spawnVerify({ argv: ["npm", "test"], cwd: passCwd, backend: "bubblewrap" });
    expect(r.exitCode).toBe(0);
  });

  it("caps output tails and rejects a missing binary", async () => {
    const loud = join(__dirname, "fixtures", "verify-loud.mjs");
    const r = await spawnVerify({ argv: ["node", loud], cwd: __dirname, backend: "restricted" });
    expect(r.stdoutTail.length).toBeLessThanOrEqual(8192);
    expect(r.stderrTail.length).toBeGreaterThan(0);
    await expect(
      spawnVerify({
        argv: ["definitely-not-installed-xyz"],
        cwd: passCwd,
        backend: "test",
      })
    ).rejects.toThrow();
  });

  it("passes declared, operator-allowed env names to the child and nothing else", async () => {
    const env = verifyChildEnv("/w", ["API_KEY", "UNSET_ONE", "NOT_LISTED", "PNCORE_SECRET"], {
      PATH: "/bin",
      API_KEY: "s3cret",
      NOT_LISTED: "y",
      PNCORE_SECRET: "z",
      OTHER: "x",
      PNCORE_VERIFY_PASS_ENV: "API_KEY,UNSET_ONE,PNCORE_SECRET",
    });
    expect(env).toEqual({
      PATH: "/bin",
      HOME: "/w",
      NODE_ENV: "test",
      npm_config_update_notifier: "false",
      API_KEY: "s3cret",
    });
    vi.stubEnv("VERIFY_TEST_PASSED_VAR", "visible");
    vi.stubEnv("PNCORE_VERIFY_PASS_ENV", "VERIFY_TEST_PASSED_VAR");
    const r = await spawnVerify({
      argv: ["node", join(__dirname, "fixtures", "verify-print-env.mjs")],
      cwd: __dirname,
      backend: "restricted",
      passEnv: ["VERIFY_TEST_PASSED_VAR"],
    });
    expect(r.stdoutTail).toBe("length=7 value=[REDACTED:VERIFY_TEST_PASSED_VAR]");
  });

  it("redacts forwarded values of at least four characters", () => {
    const childEnv = { LONG: "abcd", SHORT: "ab" };
    expect(redactForwarded("x abcd ab abcd", ["LONG", "SHORT", "MISSING"], childEnv)).toBe(
      "x [REDACTED:LONG] ab [REDACTED:LONG]"
    );
  });

  it("builds a bwrap argv with no env values and tails long buffers", () => {
    const argv = buildBwrapArgv(passCwd, ["npm", "test"]);
    expect(argv[0]).toBe("bwrap");
    expect(argv).toContain("--unshare-net");
    expect(argv).not.toContain("--setenv");
    expect(argv.slice(-2)).toEqual(["npm", "test"]);
    expect(tailOutput("short")).toBe("short");
    expect(tailOutput("n".repeat(9000)).length).toBe(8192);
  });

  it("resolves the default backend when spawnVerify omits backend", async () => {
    const r = await spawnVerify({ argv: ["npm", "test"], cwd: passCwd });
    expect(r.exitCode).toBe(0);
  });
});
