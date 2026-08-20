import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { resolveSafePath, safeBase } from "../safe-path.js";
import { z } from "zod";
import { debug } from "../debug.js";
import { defaultGateLogPath } from "../workflow-gate-log.js";
export type RawShape = Record<string, z.ZodTypeAny>;
export type ShapeArgs<S extends RawShape> = {
    [K in keyof S]: z.infer<S[K]>;
};
export type ToolAnnotations = {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
};
export type ToolContentResult = {
    content: [{
        type: "text";
        text: string;
    }];
    isError?: true;
};
export declare const ErrorCode: {
    readonly NOT_FOUND: "NOT_FOUND";
    readonly INVALID_STATE: "INVALID_STATE";
    readonly APPROVAL_REQUIRED: "APPROVAL_REQUIRED";
    readonly FILE_NOT_FOUND: "FILE_NOT_FOUND";
    readonly IO_ERROR: "IO_ERROR";
    readonly PARSE_ERROR: "PARSE_ERROR";
    readonly PATH_TRAVERSAL: "PATH_TRAVERSAL";
    readonly INVALID_GATE: "INVALID_GATE";
    readonly DISPOSE_UNAVAILABLE: "DISPOSE_UNAVAILABLE";
    readonly INVALID_ARGV: "INVALID_ARGV";
};
export type ErrorCodeKey = keyof typeof ErrorCode;
export declare function getMcpVersion(): string;
export declare const MCP_VERSION: string;
export { safeBase, resolveSafePath };
export declare const requiredHumanGateWorkflows: Set<import("../workflows.js").WorkflowType> | null;
export declare const defaultHumanGateTicketsPath: string;
export declare const defaultUsagePath = ".pncore/usage.jsonl";
export declare const usageScanMaxBytes: number;
export declare const handoffScanMaxBytes: number;
export declare const defaultHandoffPath: string;
export declare const HANDOFF_SUMMARY_MAX = 4000;
export declare const HANDOFF_READ_MAX_LINES = 80;
export declare const defaultStatePath: string;
export declare const runIdOptArg: z.ZodOptional<z.ZodString>;
export declare function getContentMaxChars(): number;
export declare function textContent(text: string): ToolContentResult;
export declare function mcpError(code: ErrorCodeKey, message: string, extra?: Record<string, unknown>): ToolContentResult;
export declare function appendSkillLoadLog(tool: string, id: string, run_id?: string): void;
export { defaultGateLogPath, writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync, dirname, resolve, debug, };
