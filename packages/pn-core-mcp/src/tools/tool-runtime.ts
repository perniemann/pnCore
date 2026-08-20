import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve, join } from "path";
import { resolveSafePath, safeBase } from "../safe-path.js";
import { fileURLToPath } from "url";
import { z } from "zod";
import { loadFeatures } from "../features.js";
import { maxResourceCharsFromEnv } from "../resource-truncate.js";
import { debug } from "../debug.js";
import { parseRequiredApprovalWorkflows } from "../human-gate-tickets.js";
import { tailScanBytesFromEnv } from "../file-tail.js";
import { defaultGateLogPath } from "../workflow-gate-log.js";

export type RawShape = Record<string, z.ZodTypeAny>;
export type ShapeArgs<S extends RawShape> = { [K in keyof S]: z.infer<S[K]> };

export type ToolAnnotations = {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
};

export type ToolContentResult = {
  content: [{ type: "text"; text: string }];
  isError?: true;
};

export const ErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  INVALID_STATE: "INVALID_STATE",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  IO_ERROR: "IO_ERROR",
  PARSE_ERROR: "PARSE_ERROR",
  PATH_TRAVERSAL: "PATH_TRAVERSAL",
  INVALID_GATE: "INVALID_GATE",
  DISPOSE_UNAVAILABLE: "DISPOSE_UNAVAILABLE",
  INVALID_ARGV: "INVALID_ARGV",
} as const;

export type ErrorCodeKey = keyof typeof ErrorCode;

export function getMcpVersion(): string {
  const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "package.json");
  let raw: string;
  try {
    raw = readFileSync(pkgPath, "utf-8");
  } catch (err) {
    throw new Error(`pn-core-mcp: cannot read package.json (${String(err)})`);
  }
  let pkg: { version?: unknown };
  try {
    pkg = JSON.parse(raw) as { version?: unknown };
  } catch (err) {
    throw new Error(`pn-core-mcp: invalid package.json (${String(err)})`);
  }
  if (typeof pkg.version !== "string" || pkg.version.trim() === "") {
    throw new Error(`pn-core-mcp: package.json missing valid 'version' field`);
  }
  return pkg.version;
}

export const MCP_VERSION = getMcpVersion();
export { safeBase, resolveSafePath };

export const requiredHumanGateWorkflows = parseRequiredApprovalWorkflows(
  process.env.PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS
);
export const defaultHumanGateTicketsPath =
  process.env.PNCORE_HUMAN_GATE_TICKETS_PATH ?? ".pncore/human-gate-tickets.jsonl";

export const defaultUsagePath = ".pncore/usage.jsonl";
export const usageScanMaxBytes = tailScanBytesFromEnv(process.env.PNCORE_USAGE_SCAN_BYTES, 786_432);
export const handoffScanMaxBytes = tailScanBytesFromEnv(
  process.env.PNCORE_HANDOFF_SCAN_BYTES,
  786_432
);
export const defaultHandoffPath =
  process.env.PNCORE_HANDOFF_LOG ?? ".pncore/workflow-handoff.jsonl";
export const HANDOFF_SUMMARY_MAX = 4000;
export const HANDOFF_READ_MAX_LINES = 80;
export const defaultStatePath = process.env.PNCORE_STATE_PATH ?? ".pncore/workflow-state.json";

export const runIdOptArg = z
  .string()
  .optional()
  .describe("Workflow run_id from workflow_step; include for correlation");

export function getContentMaxChars(): number {
  const feats = loadFeatures();
  return feats.truncateSkills ? maxResourceCharsFromEnv() : Number.MAX_SAFE_INTEGER;
}

function errJson(code: ErrorCodeKey, message: string, extra?: Record<string, unknown>) {
  return JSON.stringify({ error: message, code, ...extra });
}

export function textContent(text: string): ToolContentResult {
  return { content: [{ type: "text", text }] };
}

export function mcpError(
  code: ErrorCodeKey,
  message: string,
  extra?: Record<string, unknown>
): ToolContentResult {
  return { content: [{ type: "text", text: errJson(code, message, extra) }], isError: true };
}

export function appendSkillLoadLog(tool: string, id: string, run_id?: string): void {
  const sampleRate = parseInt(process.env.PNCORE_SKILL_LOG_SAMPLE_RATE ?? "1", 10);
  const shouldLog =
    !Number.isFinite(sampleRate) || sampleRate <= 1 || Math.random() < 1 / sampleRate;
  if (!shouldLog) return;
  try {
    const logPath = resolve(safeBase, ".pncore", "skill-load-log.jsonl");
    const logDir = dirname(logPath);
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    appendFileSync(
      logPath,
      JSON.stringify({
        ts: new Date().toISOString(),
        tool,
        id,
        ...(run_id ? { run_id } : {}),
      }) + "\n",
      "utf-8"
    );
  } catch (err) {
    debug("trace", "skill-load-log append failed", { tool, id, err: String(err) });
  }
}

export {
  defaultGateLogPath,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  appendFileSync,
  dirname,
  resolve,
  debug,
};
