/**
 * Shared helpers for Paperclip MCP tools (optional integration).
 */
export interface PaperclipConfig {
    apiUrl: string;
    headers: Record<string, string>;
}
export declare function loadPaperclipConfig(): PaperclipConfig | null;
/** Explicit issueId wins; else PAPERCLIP_ISSUE_ID. */
export declare function resolvePaperclipIssueId(issueId?: string): string | undefined;
export type PaperclipResult = {
    kind: "ok";
    data: Record<string, unknown>;
} | {
    kind: "http_error";
    status: number;
    body: string;
} | {
    kind: "parse_error";
};
export declare function parsePaperclipResponse(res: Response): Promise<PaperclipResult>;
