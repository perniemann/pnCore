/**
 * Shared helpers for Paperclip MCP tools (optional integration).
 */

import { debug } from "./debug.js";

export interface PaperclipConfig {
  apiUrl: string;
  headers: Record<string, string>;
}

export function loadPaperclipConfig(): PaperclipConfig | null {
  const apiUrl = process.env.PAPERCLIP_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.PAPERCLIP_API_KEY;
  if (!apiUrl || !apiKey) return null;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  const runId = process.env.PAPERCLIP_RUN_ID;
  if (runId) headers["X-Paperclip-Run-Id"] = runId;
  return { apiUrl, headers };
}

/** Explicit issueId wins; else PAPERCLIP_ISSUE_ID. */
export function resolvePaperclipIssueId(issueId?: string): string | undefined {
  const t = issueId?.trim();
  if (t) return t;
  const fromEnv = process.env.PAPERCLIP_ISSUE_ID?.trim();
  return fromEnv || undefined;
}

export type PaperclipResult =
  | { kind: "ok"; data: Record<string, unknown> }
  | { kind: "http_error"; status: number; body: string }
  | { kind: "parse_error" };

export async function parsePaperclipResponse(res: Response): Promise<PaperclipResult> {
  const text = await res.text();
  if (!res.ok) {
    return { kind: "http_error", status: res.status, body: text || res.statusText };
  }
  if (!text) return { kind: "ok", data: {} };
  try {
    return { kind: "ok", data: JSON.parse(text) as Record<string, unknown> };
  } catch (err) {
    debug("paperclip", "non-JSON response body", { err: String(err) });
    return { kind: "parse_error" };
  }
}
