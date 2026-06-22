/**
 * Shared helpers for Paperclip MCP tools (optional integration).
 */
import { debug } from "./debug.js";
export function loadPaperclipConfig() {
    const apiUrl = process.env.PAPERCLIP_API_URL?.replace(/\/$/, "");
    const apiKey = process.env.PAPERCLIP_API_KEY;
    if (!apiUrl || !apiKey)
        return null;
    const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
    };
    const runId = process.env.PAPERCLIP_RUN_ID;
    if (runId)
        headers["X-Paperclip-Run-Id"] = runId;
    return { apiUrl, headers };
}
/** Explicit issueId wins; else PAPERCLIP_ISSUE_ID. */
export function resolvePaperclipIssueId(issueId) {
    const t = issueId?.trim();
    if (t)
        return t;
    const fromEnv = process.env.PAPERCLIP_ISSUE_ID?.trim();
    return fromEnv || undefined;
}
export async function parsePaperclipResponse(res) {
    const text = await res.text();
    if (!res.ok) {
        return { kind: "http_error", status: res.status, body: text || res.statusText };
    }
    if (!text)
        return { kind: "ok", data: {} };
    try {
        return { kind: "ok", data: JSON.parse(text) };
    }
    catch (err) {
        debug("paperclip", "non-JSON response body", { err: String(err) });
        return { kind: "parse_error" };
    }
}
