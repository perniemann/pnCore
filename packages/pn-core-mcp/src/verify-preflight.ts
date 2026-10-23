/**
 * In-call preflight for workflow_verify: declared inputs, environment variables, and the
 * command are checked immediately before spawn, in the same call, so a missing dependency is
 * reported as missing_input instead of surfacing later as a behavioral test failure.
 */

import { createHash } from "crypto";
import { accessSync, constants, existsSync, readFileSync, statSync } from "fs";
import { delimiter, isAbsolute, join, resolve } from "path";
import { resolveInside } from "./safe-path.js";
import { newAttestationId, type PreflightCheck, type PreflightEvent } from "./verify-attest.js";

export type PreflightInput = {
  path: string;
  sha256?: string;
  access?: "read" | "write" | "execute";
};

const ACCESS_MODE = {
  read: constants.R_OK,
  write: constants.W_OK,
  execute: constants.X_OK,
} as const;

const ACCESS_REASON = {
  read: "not readable",
  write: "not writable",
  execute: "not executable",
} as const;

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function canAccess(path: string, mode: number): boolean {
  try {
    accessSync(path, mode);
    return true;
  } catch {
    return false;
  }
}

function findOnPath(cmd: string, env: NodeJS.ProcessEnv, platform: NodeJS.Platform): boolean {
  const dirs = (env.PATH ?? env.Path ?? "").split(delimiter).filter(Boolean);
  const exts =
    platform === "win32"
      ? ["", ...(env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)]
      : [""];
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = join(dir, cmd + ext);
      if (!isFile(candidate)) continue;
      if (platform === "win32" || canAccess(candidate, constants.X_OK)) return true;
    }
  }
  return false;
}

function checkCommand(
  argv0: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform
): PreflightCheck {
  const isPath = argv0.includes("/") || argv0.includes("\\") || isAbsolute(argv0);
  const ok = isPath
    ? isFile(resolve(cwd, argv0)) && canAccess(resolve(cwd, argv0), constants.X_OK)
    : findOnPath(argv0, env, platform);
  return ok
    ? { kind: "command", target: argv0, ok }
    : {
        kind: "command",
        target: argv0,
        ok,
        reason: isPath ? "not found or not executable" : "not on PATH",
      };
}

function checkInput(input: PreflightInput, cwd: string, workspaceRoot: string): PreflightCheck {
  const target = input.path;
  const safe = resolveInside(workspaceRoot, resolve(cwd, input.path));
  if ("error" in safe) return { kind: "input", target, ok: false, reason: "outside workspace" };
  const abs = safe.resolved;
  if (!existsSync(abs)) return { kind: "input", target, ok: false, reason: "missing" };
  if (input.access && !canAccess(abs, ACCESS_MODE[input.access])) {
    return { kind: "input", target, ok: false, reason: ACCESS_REASON[input.access] };
  }
  if (input.sha256) {
    if (!isFile(abs)) return { kind: "input", target, ok: false, reason: "not a file" };
    const actual = createHash("sha256").update(readFileSync(abs)).digest("hex");
    if (actual !== input.sha256.toLowerCase()) {
      return { kind: "input", target, ok: false, reason: "sha256 mismatch" };
    }
  }
  return { kind: "input", target, ok: true };
}

export function runPreflight(opts: {
  argv: string[];
  cwd: string;
  workspaceRoot: string;
  inputs?: PreflightInput[];
  env_required?: string[];
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
}): { ok: boolean; checks: PreflightCheck[] } {
  const env = opts.env ?? process.env;
  const platform = opts.platform ?? process.platform;
  const checks: PreflightCheck[] = [checkCommand(opts.argv[0]!, opts.cwd, env, platform)];
  for (const input of opts.inputs ?? [])
    checks.push(checkInput(input, opts.cwd, opts.workspaceRoot));
  for (const name of opts.env_required ?? []) {
    const present = typeof env[name] === "string" && env[name] !== "";
    checks.push(
      present
        ? { kind: "env", target: name, ok: true }
        : { kind: "env", target: name, ok: false, reason: "unset or empty" }
    );
  }
  return { ok: checks.every((c) => c.ok), checks };
}

/** Run the preflight checks and build the `kind: "preflight"` run event for them. */
export function buildPreflightEvent(opts: {
  run_id: string;
  argv: string[];
  cwd: string;
  workspaceRoot: string;
  inputs?: PreflightInput[];
  env_required?: string[];
  commandId?: string;
  candidate_id?: string;
  owner?: string;
  workflowType?: string;
  step?: number;
}): PreflightEvent {
  const { ok, checks } = runPreflight(opts);
  return {
    kind: "preflight",
    run_id: opts.run_id,
    ts: new Date().toISOString(),
    preflightId: newAttestationId(),
    ok,
    failureClass: ok ? "none" : "missing_input",
    checks,
    argv: opts.argv,
    cwd: opts.cwd,
    commandId: opts.commandId,
    candidate_id: opts.candidate_id,
    owner: opts.owner,
    workflowType: opts.workflowType,
    step: opts.step,
  };
}
