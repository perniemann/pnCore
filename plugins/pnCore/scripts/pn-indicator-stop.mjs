#!/usr/bin/env node
/**
 * Claude Code Stop hook (ADR-0028): checks the visual-indicator contract of ADR-0023 after each
 * turn. A turn touched pnCore when it called a pn-core MCP tool, ran a pn-* skill or command, or
 * received a tool result carrying a `pn-indicator:` line. Such a turn must contain a reply that
 * opens with a context tag and 🔺 (`[pn-skill] 🔺`). A miss is appended to
 * `.pncore/indicator-misses.jsonl`, so compliance is a number, not an impression.
 *
 * PNCORE_INDICATOR_STOP=block also returns `decision: "block"` once per turn, which sends the
 * model back to restate its reply with the tag. Default is log only. The hook never fails the
 * session: any error exits 0 without output.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const TAG = /^\s*\[pn-(plan|agent|command|skill|default)\]\s*\u{1F53A}/u;
const PN_TOOL = /^mcp__pn[-_]?core__/i;

function blocks(entry) {
  const c = entry?.message?.content;
  if (typeof c === "string") return [{ type: "text", text: c }];
  return Array.isArray(c) ? c : [];
}

function resultText(block) {
  const c = block.content;
  if (typeof c === "string") return c;
  return Array.isArray(c) ? c.map((x) => (typeof x?.text === "string" ? x.text : "")).join("\n") : "";
}

/** A user entry that starts a turn: typed by the person, not a tool result or a sidechain. */
function isPrompt(entry) {
  if (entry?.type !== "user" || entry.isSidechain || entry.isMeta) return false;
  const b = blocks(entry);
  return b.length > 0 && !b.some((x) => x.type === "tool_result");
}

function touchesPnCore(block) {
  if (block.type === "tool_use") {
    if (PN_TOOL.test(block.name ?? "")) return `tool:${block.name}`;
    const skill = block.input?.skill ?? block.input?.command ?? "";
    if (/^\/?pn-/.test(String(skill))) return `skill:${String(skill).replace(/^\//, "")}`;
  }
  if (block.type === "tool_result" && /pn-indicator:/.test(resultText(block))) return "result";
  return null;
}

/**
 * Check the last turn of a Claude Code transcript.
 * @param {object[]} entries parsed JSONL lines
 * @returns {{ touched: boolean, compliant: boolean, sources: string[], firstText: string }}
 */
export function checkLastTurn(entries) {
  let start = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isPrompt(entries[i])) {
      start = i + 1;
      break;
    }
  }
  const sources = new Set();
  const texts = [];
  for (const e of entries.slice(start)) {
    if (e?.isSidechain) continue;
    for (const b of blocks(e)) {
      const s = touchesPnCore(b);
      if (s) sources.add(s);
      if (e.type === "assistant" && b.type === "text" && b.text.trim()) texts.push(b.text);
    }
  }
  const touched = sources.size > 0;
  return {
    touched,
    compliant: !touched || texts.some((t) => TAG.test(t)),
    sources: [...sources],
    firstText: (texts[0] ?? "").trim().slice(0, 80),
  };
}

export function parseTranscript(text) {
  const out = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // a torn last line while the transcript is being written; skip it
    }
  }
  return out;
}

/** @returns {{ log?: object, output?: string }} */
export function evaluateHook(input, transcriptText, env = {}) {
  const r = checkLastTurn(parseTranscript(transcriptText));
  if (r.compliant) return {};
  const log = {
    ts: new Date().toISOString(),
    session_id: input.session_id ?? null,
    sources: r.sources,
    firstText: r.firstText,
  };
  if (env.PNCORE_INDICATOR_STOP === "block" && !input.stop_hook_active) {
    const reason =
      "This turn used pnCore but no reply opened with the context tag. Restate the reply, starting with the most specific tag and the red triangle, e.g. `[pn-skill] 🔺` (rule pn-visual-indicator).";
    return { log, output: JSON.stringify({ decision: "block", reason }) };
  }
  return { log };
}

function main() {
  try {
    const input = JSON.parse(readFileSync(0, "utf8") || "{}");
    if (!input.transcript_path || !existsSync(input.transcript_path)) return;
    const res = evaluateHook(input, readFileSync(input.transcript_path, "utf8"), process.env);
    if (res.log) {
      const root = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
      const dir = join(root, ".pncore");
      mkdirSync(dir, { recursive: true });
      appendFileSync(join(dir, "indicator-misses.jsonl"), JSON.stringify(res.log) + "\n");
    }
    if (res.output) process.stdout.write(res.output);
  } catch {
    // never break the session over a measurement
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
