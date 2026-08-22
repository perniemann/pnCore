#!/usr/bin/env node
// Local read-only HTTP server for the pnCore metrics dashboard.
// Scans packages/pn-core-mcp/content/ directly and parses bench/REPORT.md.
// Zero external dependencies.

import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, resolve, extname } from "node:path";
import { fileURLToPath, URL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CONTENT = join(ROOT, "packages", "pn-core-mcp", "content");
const DASHBOARD_DIR = join(ROOT, "docs", "dashboard");
const PLUGIN_LOGO = join(ROOT, "plugins", "pnCore", "assets", "pn-logo.svg");
const BENCH_REPORT = join(ROOT, "bench", "REPORT.md");
const PKG_JSON = join(ROOT, "packages", "pn-core-mcp", "package.json");

const PORT = Number(process.env.PORT) || 4173;

// ── Snapshot builders ────────────────────────────────────────────────

async function readPkgVersion() {
  try {
    const raw = await readFile(PKG_JSON, "utf-8");
    return JSON.parse(raw).version || "unknown";
  } catch {
    return "unknown";
  }
}

async function listSkillCategories() {
  // Match the MCP server's filter (packages/pn-core-mcp/src/content.ts):
  // a skill dir must contain a SKILL.md file to count.
  const skillsDir = join(CONTENT, "skills");
  if (!existsSync(skillsDir)) return { total: 0, categories: {} };
  const entries = await readdir(skillsDir, { withFileTypes: true });
  const categories = {};
  let total = 0;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const sub = await readdir(join(skillsDir, e.name), { withFileTypes: true });
    let count = 0;
    for (const s of sub) {
      if (!s.isDirectory()) continue;
      if (existsSync(join(skillsDir, e.name, s.name, "SKILL.md"))) count += 1;
    }
    categories[e.name] = count;
    total += count;
  }
  return { total, categories };
}

async function countFlatDir(dir, exts) {
  if (!existsSync(dir)) return 0;
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && exts.includes(extname(e.name))).length;
}

/** Recursive command count — matches MCP `walkCommandFiles` (nested under commands/pn/...). */
async function countCommandFiles(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      total += await countCommandFiles(p);
    } else if (e.isFile() && (extname(e.name) === ".md" || extname(e.name) === ".mdc")) {
      total += 1;
    }
  }
  return total;
}

function num(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

async function parseBench() {
  // Defensive: if file missing or shape changes, return nulls and the page falls back to inline.
  const result = {
    validateWallMs: null,
    tscIncrementalMs: null,
    alwaysApplyTokens: null,
    mcpDescriptionTokens: null,
    gates: { W1: null, W3: null, T3: null },
    generatedAt: null,
  };
  if (!existsSync(BENCH_REPORT)) return result;
  const md = await readFile(BENCH_REPORT, "utf-8");

  const genMatch = md.match(/Generated:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
  if (genMatch) result.generatedAt = genMatch[1];

  const validateMatch = md.match(
    /TOTAL \(parallel wall, W1 shipped\)\*\*\s*\|\s*\*\*([\d,]+)\s*ms/i
  );
  if (validateMatch) result.validateWallMs = num(validateMatch[1]);

  const tscMatch = md.match(/tsc-only incremental[^|]*\(W3 shipped\)\*\*\s*\|\s*\*\*([\d,]+)/i);
  if (tscMatch) result.tscIncrementalMs = num(tscMatch[1]);

  const bundleMatch = md.match(/BUNDLE TOTAL\*\*\s*\|\s*\*\*[\d,]+\*\*\s*\|\s*\*\*≈\s*([\d,]+)/i);
  if (bundleMatch) result.alwaysApplyTokens = num(bundleMatch[1]);

  // MCP descriptions: "TOTAL** | **7124** | **≈ 1781**"
  const mcpDescMatch = md.match(
    /Schema \.describe\(\) strings[\s\S]*?TOTAL\*\*\s*\|\s*\*\*[\d,]+\*\*\s*\|\s*\*\*≈\s*([\d,]+)/i
  );
  if (mcpDescMatch) result.mcpDescriptionTokens = num(mcpDescMatch[1]);

  // Gate verdicts
  if (/W1:[^|]+\|[^|]+\|[^|]+\|\s*\*\*✅[^*]*SHIPPED/i.test(md)) result.gates.W1 = "shipped";
  if (/W3:[^|]+\|[^|]+\|[^|]+\|\s*\*\*✅[^*]*SHIPPED/i.test(md)) result.gates.W3 = "shipped";
  if (/T3:[^|]+\|[^|]+\|[^|]+\|\s*\*\*⏳[^*]*awaiting/i.test(md)) result.gates.T3 = "pending";

  return result;
}

function estTokens(chars) {
  // Same ~4 chars / token rule as `bench/REPORT.md` and `scripts/measure-tokens.mjs`.
  return Math.round(chars / 4);
}

function quantileSorted(sorted, q) {
  if (sorted.length === 0) return null;
  const n = sorted.length;
  const idx = Math.min(n - 1, Math.max(0, Math.floor(q * (n - 1))));
  return sorted[idx];
}

function medianSorted(sorted) {
  if (sorted.length === 0) return null;
  const n = sorted.length;
  if (n % 2 === 1) return sorted[(n - 1) / 2];
  return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

async function computeSkillSizeMetrics() {
  const skillsDir = join(CONTENT, "skills");
  if (!existsSync(skillsDir)) {
    return {
      count: 0,
      stats: { minTk: null, medianTk: null, p95Tk: null, maxTk: null },
      histogram: [],
      top10: [],
    };
  }
  const rows = [];
  const cats = await readdir(skillsDir, { withFileTypes: true });
  for (const cat of cats) {
    if (!cat.isDirectory()) continue;
    const catPath = join(skillsDir, cat.name);
    const subs = await readdir(catPath, { withFileTypes: true });
    for (const s of subs) {
      if (!s.isDirectory()) continue;
      const skillPath = join(catPath, s.name, "SKILL.md");
      if (!existsSync(skillPath)) continue;
      const raw = await readFile(skillPath, "utf-8");
      const chars = raw.length;
      const tk = estTokens(chars);
      rows.push({ id: s.name, category: cat.name, chars, estTokens: tk });
    }
  }
  if (rows.length === 0) {
    return {
      count: 0,
      stats: { minTk: null, medianTk: null, p95Tk: null, maxTk: null },
      histogram: [],
      top10: [],
    };
  }
  const byTk = rows.map((r) => r.estTokens).sort((a, b) => a - b);
  const minTk = byTk[0];
  const maxTk = byTk[byTk.length - 1];
  const medianTk = medianSorted(byTk);
  const p95Tk = quantileSorted(byTk, 0.95);
  // Histogram buckets: est. tokens
  const buckets = [
    { label: "0–1k tk", from: 0, to: 1000, count: 0 },
    { label: "1k–2k", from: 1000, to: 2000, count: 0 },
    { label: "2k–3k", from: 2000, to: 3000, count: 0 },
    { label: "3k–5k", from: 3000, to: 5000, count: 0 },
    { label: "5k+", from: 5000, to: Number.POSITIVE_INFINITY, count: 0 },
  ];
  for (const r of rows) {
    const t = r.estTokens;
    for (const b of buckets) {
      if (t >= b.from && t < b.to) {
        b.count += 1;
        break;
      }
    }
  }
  const top10 = [...rows].sort((a, b) => b.estTokens - a.estTokens).slice(0, 10);
  return {
    count: rows.length,
    stats: { minTk, medianTk, p95Tk, maxTk },
    histogram: buckets.map(({ label, count }) => ({ label, count })),
    top10,
  };
}

const SKILL_LOG = join(ROOT, ".pncore", "skill-load-log.jsonl");

async function readHotSkillLoads() {
  const out = { log: ".pncore/skill-load-log.jsonl", totalEvents: 0, top: [] };
  if (!existsSync(SKILL_LOG)) return out;
  let text;
  try {
    text = await readFile(SKILL_LOG, "utf-8");
  } catch {
    return out;
  }
  const counts = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let o;
    try {
      o = JSON.parse(t);
    } catch {
      continue;
    }
    if (o && typeof o.id === "string" && o.id) {
      counts[o.id] = (counts[o.id] || 0) + 1;
    }
  }
  out.totalEvents = Object.values(counts).reduce((a, b) => a + b, 0);
  out.top = Object.entries(counts)
    .map(([id, loads]) => ({ id, loads }))
    .sort((a, b) => b.loads - a.loads)
    .slice(0, 10);
  return out;
}

/** Live alwaysApply token estimate — same chars÷4 rule as `scripts/measure-tokens.mjs`. */
async function computeAlwaysApplyTokens() {
  const rulesDir = join(CONTENT, "rules");
  if (!existsSync(rulesDir)) return null;
  const entries = await readdir(rulesDir);
  let chars = 0;
  for (const f of entries) {
    const ext = extname(f);
    if (ext !== ".mdc" && ext !== ".md") continue;
    const text = await readFile(join(rulesDir, f), "utf-8");
    if (/alwaysApply:\s*true/i.test(text)) chars += text.length;
  }
  return chars > 0 ? estTokens(chars) : 0;
}

function t3DetailFromHotSkills(hotSkills) {
  const n = hotSkills?.totalEvents ?? 0;
  if (n === 0) {
    return "awaiting M3 get_skill frequency (no load events yet)";
  }
  return `M3 collecting (${n} get_skill events) — frequency split not shipped`;
}

async function buildSnapshot() {
  const [version, skills, agentsCount, commandsCount, rulesCount, bench, skillSizes, hotSkills] =
    await Promise.all([
      readPkgVersion(),
      listSkillCategories(),
      countFlatDir(join(CONTENT, "agents"), [".md"]),
      countCommandFiles(join(CONTENT, "commands")),
      countFlatDir(join(CONTENT, "rules"), [".mdc", ".md"]),
      parseBench(),
      computeSkillSizeMetrics(),
      readHotSkillLoads(),
    ]);

  // Prefer REPORT.md when present; otherwise estimate alwaysApply from on-disk rules.
  if (bench.alwaysApplyTokens == null) {
    bench.alwaysApplyTokens = await computeAlwaysApplyTokens();
  }

  // Without REPORT.md, do not inherit stale "Shipped" from the static HTML.
  if (bench.gates.W1 == null) bench.gates.W1 = "unknown";
  if (bench.gates.W3 == null) bench.gates.W3 = "unknown";
  // T3 is a deferred token-optimization gate; M3 rankings are input, not auto-ship.
  if (bench.gates.T3 == null) bench.gates.T3 = "pending";

  bench.gateDetails = {
    T3: t3DetailFromHotSkills(hotSkills),
  };

  return {
    capturedAt: new Date().toISOString(),
    health: { version, status: "ok" },
    inventory: {
      skills: skills.total,
      categories: skills.categories,
      commands: commandsCount,
      rules: rulesCount,
      agents: agentsCount,
    },
    bench,
    skillSizes,
    hotSkills,
  };
}

// ── HTTP layer ───────────────────────────────────────────────────────

const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "cache-control": "no-store",
    ...headers,
  });
  res.end(body);
}

async function serveStatic(res, path) {
  try {
    const full = join(DASHBOARD_DIR, path);
    if (!full.startsWith(DASHBOARD_DIR)) return send(res, 403, "forbidden");
    const s = await stat(full);
    if (s.isDirectory()) return send(res, 404, "not found");
    const buf = await readFile(full);
    const type = STATIC_TYPES[extname(full)] || "application/octet-stream";
    send(res, 200, buf, { "content-type": type });
  } catch {
    send(res, 404, "not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path === "/api/snapshot") {
    try {
      const snapshot = await buildSnapshot();
      return send(res, 200, JSON.stringify(snapshot), {
        "content-type": "application/json; charset=utf-8",
      });
    } catch (err) {
      return send(res, 500, JSON.stringify({ error: String(err) }), {
        "content-type": "application/json; charset=utf-8",
      });
    }
  }

  if (path === "/plugins/pnCore/assets/pn-logo.svg") {
    try {
      if (!existsSync(PLUGIN_LOGO)) return send(res, 404, "not found");
      const buf = await readFile(PLUGIN_LOGO);
      return send(res, 200, buf, {
        "content-type": "image/svg+xml; charset=utf-8",
      });
    } catch {
      return send(res, 500, "error");
    }
  }

  if (path === "/" || path === "/index.html") return serveStatic(res, "index.html");
  return serveStatic(res, path.replace(/^\/+/, ""));
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log(`pnCore dashboard → ${url}`);
  console.log(`  api: ${url}api/snapshot`);
  console.log(`  ctrl-c to stop`);
});
