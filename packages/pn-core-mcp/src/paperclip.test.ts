import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  loadPaperclipConfig,
  parsePaperclipResponse,
  resolvePaperclipIssueId,
} from "./paperclip.js";

const ENV_KEYS = [
  "PAPERCLIP_API_URL",
  "PAPERCLIP_API_KEY",
  "PAPERCLIP_RUN_ID",
  "PAPERCLIP_ISSUE_ID",
] as const;

function clearPaperclipEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

beforeEach(() => clearPaperclipEnv());
afterEach(() => clearPaperclipEnv());

describe("loadPaperclipConfig", () => {
  it("returns null when API URL is missing", () => {
    process.env.PAPERCLIP_API_KEY = "k";
    expect(loadPaperclipConfig()).toBeNull();
  });

  it("returns null when API key is missing", () => {
    process.env.PAPERCLIP_API_URL = "https://api.example.com";
    expect(loadPaperclipConfig()).toBeNull();
  });

  it("returns config with auth and content-type when both are set", () => {
    process.env.PAPERCLIP_API_URL = "https://api.example.com/";
    process.env.PAPERCLIP_API_KEY = "secret";
    const cfg = loadPaperclipConfig();
    expect(cfg).not.toBeNull();
    expect(cfg!.apiUrl).toBe("https://api.example.com");
    expect(cfg!.headers.Authorization).toBe("Bearer secret");
    expect(cfg!.headers["Content-Type"]).toBe("application/json");
    expect(cfg!.headers["X-Paperclip-Run-Id"]).toBeUndefined();
  });

  it("adds X-Paperclip-Run-Id when PAPERCLIP_RUN_ID is set", () => {
    process.env.PAPERCLIP_API_URL = "https://x.test";
    process.env.PAPERCLIP_API_KEY = "k";
    process.env.PAPERCLIP_RUN_ID = "run-42";
    const cfg = loadPaperclipConfig();
    expect(cfg!.headers["X-Paperclip-Run-Id"]).toBe("run-42");
  });
});

describe("resolvePaperclipIssueId", () => {
  it("returns trimmed explicit issueId when provided", () => {
    expect(resolvePaperclipIssueId("  abc  ")).toBe("abc");
  });

  it("returns PAPERCLIP_ISSUE_ID when argument is empty", () => {
    process.env.PAPERCLIP_ISSUE_ID = "from-env";
    expect(resolvePaperclipIssueId()).toBe("from-env");
    expect(resolvePaperclipIssueId("   ")).toBe("from-env");
  });

  it("returns undefined when nothing is set", () => {
    expect(resolvePaperclipIssueId()).toBeUndefined();
  });
});

describe("parsePaperclipResponse", () => {
  it("returns http_error when response is not ok", async () => {
    const res = new Response("nope", { status: 404, statusText: "Not Found" });
    const out = await parsePaperclipResponse(res);
    expect(out).toEqual({ kind: "http_error", status: 404, body: "nope" });
  });

  it("falls back to statusText when http_error body is empty", async () => {
    const res = new Response("", { status: 503, statusText: "Service Unavailable" });
    const out = await parsePaperclipResponse(res);
    expect(out).toEqual({ kind: "http_error", status: 503, body: "Service Unavailable" });
  });

  it("returns ok with empty data when body is empty and ok", async () => {
    const res = new Response("", { status: 200 });
    const out = await parsePaperclipResponse(res);
    expect(out).toEqual({ kind: "ok", data: {} });
  });

  it("returns ok with parsed JSON when body is valid", async () => {
    const res = new Response('{"a":1}', { status: 200 });
    const out = await parsePaperclipResponse(res);
    expect(out).toEqual({ kind: "ok", data: { a: 1 } });
  });

  it("returns parse_error when body is not valid JSON", async () => {
    const res = new Response("not-json", { status: 200 });
    const out = await parsePaperclipResponse(res);
    expect(out).toEqual({ kind: "parse_error" });
  });
});
