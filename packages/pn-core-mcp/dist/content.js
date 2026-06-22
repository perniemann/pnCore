import { readFileSync, readdirSync, existsSync, statSync, openSync, readSync, closeSync } from "fs";
import { join, dirname, resolve, sep } from "path";
import { fileURLToPath } from "url";
import { debug } from "./debug.js";
const currentDir = dirname(fileURLToPath(import.meta.url));
export const contentRoot = process.env.PNCORE_CONTENT_PATH
    ? resolve(process.env.PNCORE_CONTENT_PATH)
    : resolve(join(currentDir, "..", "content"));
const contentRootResolved = resolve(contentRoot);
/** Legacy `pn-core://` URIs that resolve to the canonical resource URI */
const RESOURCE_URI_ALIASES = {
    "pn-core://reference/best-practice-2026-03.md": "pn-core://reference/best-practices.md",
};
// Mtime-based cache: invalidate when content dirs change (per MCP best practice: cache read-heavy ops)
const CACHE_TTL_MS = 60_000;
const cache = {
    version: 0,
    timestamp: 0,
    skills: null,
    skillsById: new Map(),
    agents: null,
    agentsById: new Map(),
    commands: null,
    commandsById: new Map(),
    rules: null,
    rulesById: new Map(),
    resources: new Map(),
};
/** Read at most `maxBytes` from the start of a file for lightweight frontmatter parsing. */
function readFileHead(p, maxBytes = 2048) {
    try {
        const st = statSync(p, { throwIfNoEntry: false });
        if (!st)
            return "";
        if (st.size <= maxBytes)
            return readFileSync(p, "utf-8");
        const buf = Buffer.alloc(maxBytes);
        const fd = openSync(p, "r");
        try {
            readSync(fd, buf, 0, maxBytes, 0);
        }
        finally {
            closeSync(fd);
        }
        return buf.toString("utf-8");
    }
    catch (err) {
        debug("content", "readFileHead failed (treated as empty)", { path: p, err: String(err) });
        return "";
    }
}
export function getContentVersion() {
    return statSync(contentRoot, { throwIfNoEntry: false })?.mtimeMs ?? 0;
}
function invalidateIfStale() {
    const now = Date.now();
    const version = getContentVersion();
    if (cache.version !== version || now - cache.timestamp > CACHE_TTL_MS) {
        cache.version = version;
        cache.timestamp = now;
        cache.skills = null;
        cache.skillsById.clear();
        cache.agents = null;
        cache.agentsById.clear();
        cache.commands = null;
        cache.commandsById.clear();
        cache.rules = null;
        cache.rulesById.clear();
        cache.resources.clear();
    }
}
// Keys we knowingly emit or accept in skill / agent / command / rule frontmatter.
// `alwaysApply` and `globs` are standard Cursor rule frontmatter fields — they are
// not consumed by the MCP server but appear in shipped content and should not warn.
const KNOWN_FRONTMATTER_KEYS = new Set([
    "name",
    "description",
    "title",
    "version",
    "author",
    "tags",
    "category",
    "model",
    "alwaysApply",
    "globs",
    // `slash` is read by scripts/sync-content-to-plugin.mjs and
    // scripts/check-content-plugin-sync.mjs to decide whether a
    // command markdown file is copied into plugins/pnCore/.cursor/commands/
    // (the Cursor slash palette). Default true; set `slash: false` to keep
    // the file canonical-only — still reachable via get_command(id) and MCP prompts.
    "slash",
]);
function parseFrontmatter(raw) {
    const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match)
        return {};
    const block = match[1];
    const name = block.match(/^name:\s*(.+)$/m)?.[1]?.trim();
    const description = block.match(/^description:\s*(.+)$/m)?.[1]?.trim();
    const unknownKeys = block
        .split("\n")
        .map((l) => l.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):/)?.[1])
        .filter((k) => k != null && !KNOWN_FRONTMATTER_KEYS.has(k));
    if (unknownKeys.length > 0) {
        process.stderr.write(`[pn-core-mcp] parseFrontmatter: unknown keys [${unknownKeys.join(", ")}] — add to KNOWN_FRONTMATTER_KEYS if intentional\n`);
    }
    return { name: name ?? undefined, description: description ?? undefined };
}
function* walkSkills(root) {
    const skillsDir = join(root, "skills");
    if (!existsSync(skillsDir))
        return;
    for (const cat of readdirSync(skillsDir, { withFileTypes: true })) {
        if (!cat.isDirectory())
            continue;
        const catPath = join(skillsDir, cat.name);
        for (const ent of readdirSync(catPath, { withFileTypes: true })) {
            if (!ent.isDirectory())
                continue;
            const skillPath = join(catPath, ent.name, "SKILL.md");
            if (existsSync(skillPath))
                yield { id: ent.name, category: cat.name, path: skillPath };
        }
    }
}
export function listSkills(opts) {
    invalidateIfStale();
    if (!cache.skills) {
        const out = [];
        for (const { id, category, path: p } of walkSkills(contentRoot)) {
            const head = readFileHead(p);
            const { name, description } = parseFrontmatter(head);
            out.push({ id, name: name ?? id, description: description ?? "", category });
        }
        cache.skills = out;
    }
    let result = cache.skills;
    if (opts?.category) {
        const cat = opts.category.toLowerCase();
        result = result.filter((s) => s.category.toLowerCase() === cat);
    }
    if (opts?.filter) {
        const term = opts.filter.toLowerCase();
        result = result.filter((s) => s.id.toLowerCase().includes(term) ||
            s.name.toLowerCase().includes(term) ||
            s.description.toLowerCase().includes(term));
    }
    return result;
}
export function getSkill(id) {
    invalidateIfStale();
    const cached = cache.skillsById.get(id);
    if (cached !== undefined)
        return cached;
    for (const { id: sid, path: p } of walkSkills(contentRoot)) {
        if (sid === id) {
            const raw = readFileSync(p, "utf-8");
            cache.skillsById.set(id, raw);
            return raw;
        }
    }
    return null;
}
function listMdIn(dir, cacheKey, byIdCache) {
    invalidateIfStale();
    const cached = cache[cacheKey];
    if (cached)
        return cached;
    const full = join(contentRoot, dir);
    if (!existsSync(full))
        return [];
    const out = [];
    for (const f of readdirSync(full)) {
        if (!f.endsWith(".md") && !f.endsWith(".mdc"))
            continue;
        const id = f.replace(/\.(md|mdc)$/, "");
        const raw = readFileSync(join(full, f), "utf-8");
        const { name, description } = parseFrontmatter(raw);
        out.push({ id, name: name ?? id, description: description ?? "" });
        byIdCache.set(id, raw);
    }
    if (cacheKey === "agents")
        cache.agents = out;
    else if (cacheKey === "commands")
        cache.commands = out;
    else
        cache.rules = out;
    return out;
}
function getMdIn(dir, id, byIdCache) {
    invalidateIfStale();
    const cached = byIdCache.get(id);
    if (cached !== undefined)
        return cached;
    for (const ext of [".md", ".mdc"]) {
        const p = join(contentRoot, dir, id + ext);
        if (existsSync(p)) {
            const raw = readFileSync(p, "utf-8");
            byIdCache.set(id, raw);
            return raw;
        }
    }
    return null;
}
export const listAgents = () => listMdIn("agents", "agents", cache.agentsById);
/** List internal agents (agents-internal/ directory). Each entry carries `internal: true`. */
export function listInternalAgents() {
    invalidateIfStale();
    const full = join(contentRoot, "agents-internal");
    if (!existsSync(full))
        return [];
    const out = [];
    for (const f of readdirSync(full)) {
        if (!f.endsWith(".md") && !f.endsWith(".mdc"))
            continue;
        const id = f.replace(/\.(md|mdc)$/, "");
        const raw = readFileSync(join(full, f), "utf-8");
        const { name, description } = parseFrontmatter(raw);
        out.push({ id, name: name ?? id, description: description ?? "", internal: true });
        cache.agentsById.set(id, raw);
    }
    return out;
}
export function getAgent(id) {
    const found = getMdIn("agents", id, cache.agentsById);
    if (found)
        return found;
    return getMdIn("agents-internal", id, cache.agentsById);
}
export const listCommands = () => listMdIn("commands", "commands", cache.commandsById);
export const getCommand = (id) => getMdIn("commands", id, cache.commandsById);
export const listRules = () => listMdIn("rules", "rules", cache.rulesById);
export const getRule = (id) => getMdIn("rules", id, cache.rulesById);
// Resource content (config, reference, docs) — used by MCP resources
export const resourceDefs = [
    {
        uri: "pn-core://config/features.json",
        name: "features.json",
        description: "Feature flags for MCP workflows (merged with PNCORE_FEATURES env)",
        path: "config/features.json",
        mimeType: "application/json",
    },
    {
        uri: "pn-core://config/specialists.json",
        name: "specialists.json",
        description: "Canonical list of specialist agents and scaffold skills",
        path: "config/specialists.json",
        mimeType: "application/json",
    },
    {
        uri: "pn-core://config/stacks.json",
        name: "stacks.json",
        description: "Supported stacks and their rules, scaffolds, and agents",
        path: "config/stacks.json",
        mimeType: "application/json",
    },
    {
        uri: "pn-core://reference/FLOW.md",
        name: "FLOW.md",
        description: "Standard and strict flow for full_dev / design workflows and pn-project-builder",
        path: "reference/FLOW.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/DECISION_LOGIC.md",
        name: "DECISION_LOGIC.md",
        description: "Decision logic for skeptic intensity and gating",
        path: "reference/DECISION_LOGIC.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/RUNBOOK.md",
        name: "RUNBOOK.md",
        description: "One-page runbook: when to use workflow_step vs get_command, config, standard vs strict flow, skeptic gates",
        path: "reference/RUNBOOK.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/workflow-state-schema.md",
        name: "workflow-state-schema.md",
        description: "Workflow state schema and task contract for workflow_step; required/optional keys per step, persistence and resume",
        path: "reference/workflow-state-schema.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/best-practices.md",
        name: "best-practices.md",
        description: "Best practices checklist: a11y, security, performance, design, orchestration, mobile, WebXR",
        path: "reference/best-practices.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/aesthetics-baseline.md",
        name: "aesthetics-baseline.md",
        description: "Cross-project aesthetics floor: dimensions checklist, inspiration presets, CLAUDE.md block, workflow map",
        path: "reference/aesthetics-baseline.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/prompt-provider-knobs.md",
        name: "prompt-provider-knobs.md",
        description: "Model-specific prompting knobs (OpenAI reasoning.effort, Anthropic adaptive thinking, Gemini thinking_level) for pn-prompt-optimize when the target model is known",
        path: "reference/prompt-provider-knobs.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/delivery-tier-criteria.md",
        name: "delivery-tier-criteria.md",
        description: "MVP vs full delivery tier criteria for verification; used by pn-verify-acceptance",
        path: "reference/delivery-tier-criteria.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/parallel-rules.md",
        name: "parallel-rules.md",
        description: "File ownership rules and merge step requirements for parallel specialist phases; used when workflow_step returns parallel: true",
        path: "reference/parallel-rules.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/embedded-studio-dna.md",
        name: "embedded-studio-dna.md",
        description: "Embedded studio DNA: cinematic portfolio/reel/lab UI principles, dual registers, evidence strips; used by pn-embedded-studio-dna and pn-design-dna",
        path: "reference/embedded-studio-dna.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/design-intent.md",
        name: "design-intent.md",
        description: "Marketing UI design intent: Design Read, tuning dials (variance/motion/density), aesthetic presets; used by pn-design and pn-preflight",
        path: "reference/design-intent.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/marketing-ship-gate.md",
        name: "marketing-ship-gate.md",
        description: "Marketing UI pre-ship gate: strict/studio tier checklist and AI Slop Test integration; used by pn-preflight",
        path: "reference/marketing-ship-gate.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/human-facing-artifacts.md",
        name: "human-facing-artifacts.md",
        description: "When to use HTML vs canvas vs markdown for workflow deliverables; dual digest for orchestration; links to example gallery",
        path: "reference/human-facing-artifacts.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/discovery-and-plan-format.md",
        name: "discovery-and-plan-format.md",
        description: "Format reference for discovery specs and plans",
        path: "docs/reference/discovery-and-plan-format.md",
        mimeType: "text/markdown",
    },
    {
        uri: "pn-core://reference/schemas/delivery_pack.contract.json",
        name: "delivery_pack.contract.json",
        description: "Delivery pack contract schema for pn-package-delivery",
        path: "reference/schemas/delivery_pack.contract.json",
        mimeType: "application/json",
    },
    {
        uri: "pn-core://reference/schemas/orchestrator.contract.json",
        name: "orchestrator.contract.json",
        description: "Orchestrator contract schema for full_dev workflow and pn-project-builder",
        path: "reference/schemas/orchestrator.contract.json",
        mimeType: "application/json",
    },
    {
        uri: "pn-core://reference/schemas/skeptic.contract.json",
        name: "skeptic.contract.json",
        description: "Skeptic verdict contract schema for pn-skeptic-challenge",
        path: "reference/schemas/skeptic.contract.json",
        mimeType: "application/json",
    },
    {
        uri: "pn-core://reference/schemas/verifier.contract.json",
        name: "verifier.contract.json",
        description: "Verifier contract schema for pn-verify-acceptance",
        path: "reference/schemas/verifier.contract.json",
        mimeType: "application/json",
    },
    {
        uri: "pn-core://reference/schemas/builder.contract.json",
        name: "builder.contract.json",
        description: "Builder contract schema for builder verification",
        path: "reference/schemas/builder.contract.json",
        mimeType: "application/json",
    },
    {
        uri: "pn-core://reference/schemas/fix_tasks.contract.json",
        name: "fix_tasks.contract.json",
        description: "Fix tasks contract schema for CI/fix flows",
        path: "reference/schemas/fix_tasks.contract.json",
        mimeType: "application/json",
    },
];
export function getResource(uri) {
    invalidateIfStale();
    const canonicalUri = RESOURCE_URI_ALIASES[uri] ?? uri;
    const cached = cache.resources.get(canonicalUri) ??
        (canonicalUri !== uri ? cache.resources.get(uri) : undefined);
    if (cached !== undefined)
        return cached;
    const entry = resourceDefs.find((r) => r.uri === canonicalUri);
    if (!entry)
        return null;
    const fullPath = resolve(contentRoot, entry.path);
    if (!fullPath.startsWith(contentRootResolved + sep) && fullPath !== contentRootResolved) {
        return null;
    }
    if (!existsSync(fullPath))
        return null;
    const text = readFileSync(fullPath, "utf-8");
    const result = { text, mimeType: entry.mimeType };
    cache.resources.set(canonicalUri, result);
    if (canonicalUri !== uri)
        cache.resources.set(uri, result);
    return result;
}
