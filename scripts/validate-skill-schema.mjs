#!/usr/bin/env node
/**
 * Validate pnCore skill schema conformance across all SKILL.md files.
 *
 * Errors (exit 1):
 *   - Missing frontmatter `name` field
 *   - Missing frontmatter `description` field
 *   - Missing `## When to use` section header (primary retrieval anchor)
 *   - Newly added SKILL.md in the git diff range with description > 220 chars
 *
 * Warnings (exit 0, but printed):
 *   - Missing instruction-section header (any of: ## Instructions / ## Workflow /
 *     ## Approach / ## Overview / ## Usage) — acceptable variants, not enforced
 *   - Skills with category ci|review|orchestration|discipline missing
 *     `Rationalizations`, `Red flags — stop`, or `## Verification`
 *   - SKILL.md body exceeds progressive-disclosure size advisory (line count)
 *   - Description uses a broad WHEN trigger (Mandatory before, use when working
 *     with, anytime you, whenever you touch|edit|change|work)
 *   - Existing skill description exceeds 220 characters (advisory; error for new skills)
 *
 * Codex's catalog budget is ~8000 characters for the whole skill list
 * (see measure-tokens.mjs). The 220-char gate applies to new skills only.
 *
 * Run from repo root: node scripts/validate-skill-schema.mjs
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { git, resolveDiffRange } from "./git-diff-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const skillsRoot = join(repoRoot, "packages", "pn-core-mcp", "content", "skills");

const INSTRUCTION_ALIASES = ["Instructions", "Workflow", "Approach", "Overview", "Usage"];

const WARN_CATEGORIES = new Set(["ci", "review", "orchestration", "discipline"]);

/** Progressive-disclosure size advisory (body lines after frontmatter). Warning only. */
const SIZE_WARN_LINES = 400;

/** Per-skill description cap for newly added skills (existing: warning). */
export const DESC_MAX_CHARS = 220;

export const SKILL_MD_RE = /^packages\/pn-core-mcp\/content\/skills\/[^/]+\/([^/]+)\/SKILL\.md$/;

/**
 * Broad WHEN phrases that over-trigger skill load (OpenAI Astra / Codex catalog).
 * Warning only — tightness of WHEN, not a character cap.
 */
export const BROAD_WHEN_PATTERNS = [
  /mandatory before/i,
  /use when working with\b/i,
  /\banytime you\b/i,
  /whenever you (touch|edit|change|work)\b/i,
];

export function descriptionHasBroadWhen(description) {
  if (!description) return false;
  return BROAD_WHEN_PATTERNS.some((re) => re.test(description));
}

export function descriptionOverCharCap(description, max = DESC_MAX_CHARS) {
  return (description ?? "").length > max;
}

/**
 * Error strings for newly added canonical SKILL.md files whose description exceeds DESC_MAX_CHARS.
 * @param {string[]} addedPaths git paths (diff-filter=A)
 * @param {{ root?: string }} [opts]
 * @returns {string[]}
 */
export function newSkillOverCapErrors(addedPaths, { root = repoRoot } = {}) {
  const errors = [];
  for (const f of addedPaths) {
    const norm = f.replace(/\\/g, "/");
    if (!SKILL_MD_RE.test(norm)) continue;
    const abs = join(root, ...norm.split("/"));
    if (!existsSync(abs)) continue;
    const { meta } = parseFrontmatter(readFileSync(abs, "utf-8"));
    if (descriptionOverCharCap(meta.description ?? "")) {
      errors.push(
        `${norm}: new skill description is ${(meta.description ?? "").length} chars (max ${DESC_MAX_CHARS} for newly added skills)`
      );
    }
  }
  return errors;
}

function* walkSkillMd(dir, base = "") {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = base ? join(base, entry.name) : entry.name;
    if (entry.isDirectory()) yield* walkSkillMd(full, rel);
    else if (
      entry.name === "SKILL.md" ||
      (entry.name === "README.md" && rel.replace(/\\/g, "/") === "README.md")
    )
      yield { path: full, rel: rel.replace(/\\/g, "/") };
  }
}

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\s*/);
  if (!m) return { meta: {}, body: content, rawLines: [] };
  const body = content.slice(m[0].length);
  const rawLines = m[1].split(/\r?\n/);
  const meta = {};
  for (const line of rawLines) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1].trim()] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body, rawLines };
}

/** Unquoted colons in description break strict YAML parsers (e.g. pi.dev). */
function descriptionLineYamlSafe(rawLines) {
  for (const line of rawLines) {
    const m = line.match(/^description:\s*(.*)$/);
    if (!m) continue;
    const raw = m[1].trim();
    if (!raw) return true;
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
      return true;
    return !/[:#@`|>{[\]},&*!?]/.test(raw) && !raw.includes(": ");
  }
  return true;
}

function hasHeader(body, title) {
  return new RegExp(`^##\\s+${title}\\s*$`, "im").test(body);
}

function hasAnyInstructionHeader(body) {
  return INSTRUCTION_ALIASES.some((alias) => hasHeader(body, alias));
}

function main() {
  if (!existsSync(skillsRoot)) {
    console.error("validate-skill-schema: skills directory not found:", skillsRoot);
    process.exit(1);
  }

  const errors = [];
  const warnings = [];
  /** @type {string[]} */
  const oversized = [];
  let total = 0;

  for (const { path, rel } of walkSkillMd(skillsRoot)) {
    total++;
    const content = readFileSync(path, "utf-8");
    const { meta, body, rawLines } = parseFrontmatter(content);
    const bodyLines = body.split(/\r?\n/).length;
    if (rel !== "README.md" && bodyLines > SIZE_WARN_LINES) {
      oversized.push(`${rel} (${bodyLines} lines)`);
    }

    // Errors
    if (!meta.name || meta.name === "") {
      errors.push(`${rel}: missing frontmatter 'name'`);
    }
    if (!meta.description || meta.description === "") {
      errors.push(`${rel}: missing frontmatter 'description'`);
    }
    if (!descriptionLineYamlSafe(rawLines)) {
      errors.push(
        `${rel}: description must be quoted for YAML (inline ':' breaks pi.dev); use description: "..."`
      );
    }
    if (!hasHeader(body, "When to use") && rel !== "README.md") {
      errors.push(`${rel}: missing '## When to use' section`);
    }

    if (rel !== "README.md" && descriptionHasBroadWhen(meta.description ?? "")) {
      warnings.push(
        `${rel}: description uses a broad WHEN trigger (narrow the job; do not dump the workflow)`
      );
    }
    if (rel !== "README.md" && descriptionOverCharCap(meta.description ?? "")) {
      warnings.push(
        `${rel}: description is ${meta.description.length} chars (advisory cap ${DESC_MAX_CHARS}; error for newly added skills)`
      );
    }

    // Warnings
    if (!hasAnyInstructionHeader(body)) {
      warnings.push(
        `${rel}: no instruction-section header (## Instructions / ## Workflow / ## Approach / ## Overview / ## Usage)`
      );
    }

    const category = meta.category ?? "";
    if (WARN_CATEGORIES.has(category)) {
      if (!body.includes("Rationalizations")) {
        warnings.push(
          `${rel} [category=${category}]: recommended 'Rationalizations' section missing`
        );
      }
      if (!body.includes("Red flags")) {
        warnings.push(
          `${rel} [category=${category}]: recommended 'Red flags — stop' section missing`
        );
      }
      if (!hasHeader(body, "Verification")) {
        warnings.push(
          `${rel} [category=${category}]: recommended '## Verification' section missing`
        );
      }
    }
  }

  if (oversized.length) {
    const sample = oversized.slice(0, 5).join("; ");
    warnings.push(
      `${oversized.length} skill(s) exceed ${SIZE_WARN_LINES}-line progressive-disclosure advisory — move detail into reference.md (e.g. ${sample}${oversized.length > 5 ? "; …" : ""})`
    );
  }

  const { range, skip, reason } = resolveDiffRange();
  if (!skip && range) {
    let added = [];
    try {
      const out = git(["diff", "--name-only", "--diff-filter=A", range]);
      added = out ? out.split(/\r?\n/).filter(Boolean) : [];
    } catch {
      added = [];
    }
    errors.push(...newSkillOverCapErrors(added));
  } else if (skip) {
    warnings.push(`new-skill description-length gate skipped (${reason ?? "no diff range"})`);
  }

  if (warnings.length) {
    console.warn(`validate-skill-schema: ${warnings.length} warning(s):`);
    for (const w of warnings) console.warn("  WARN:", w);
  }

  if (errors.length) {
    console.error(`validate-skill-schema: ${errors.length} error(s) in ${total} skills:`);
    for (const e of errors) console.error("  ERR:", e);
    process.exit(1);
  }

  console.log(
    `validate-skill-schema: OK (${total} skills checked${warnings.length ? `, ${warnings.length} warnings` : ""})`
  );
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
