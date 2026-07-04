#!/usr/bin/env node
/**
 * Validate pnCore skill schema conformance across all SKILL.md files.
 *
 * Errors (exit 1):
 *   - Missing frontmatter `name` field
 *   - Missing frontmatter `description` field
 *   - Missing `## When to use` section header (primary retrieval anchor)
 *
 * Warnings (exit 0, but printed):
 *   - Missing instruction-section header (any of: ## Instructions / ## Workflow /
 *     ## Approach / ## Overview / ## Usage) — acceptable variants, not enforced
 *   - Skills with category ci|review|orchestration|discipline missing
 *     `Rationalizations`, `Red flags — stop`, or `## Verification`
 *
 * Run from repo root: node scripts/validate-skill-schema.mjs
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const skillsRoot = join(repoRoot, "packages", "pn-core-mcp", "content", "skills");

const INSTRUCTION_ALIASES = ["Instructions", "Workflow", "Approach", "Overview", "Usage"];

const WARN_CATEGORIES = new Set(["ci", "review", "orchestration", "discipline"]);

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
  let total = 0;

  for (const { path, rel } of walkSkillMd(skillsRoot)) {
    total++;
    const content = readFileSync(path, "utf-8");
    const { meta, body, rawLines } = parseFrontmatter(content);

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

main();
