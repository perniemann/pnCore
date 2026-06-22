#!/usr/bin/env node
/**
 * Require ## When to use and ## Output in every integrations skill (canonical content).
 * Run from repo root: node scripts/validate-integration-skill-sections.mjs
 */
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const integrationsRoot = join(
  repoRoot,
  "packages",
  "pn-core-mcp",
  "content",
  "skills",
  "integrations"
);

function* walkSkillMd(dir, base = "") {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    const rel = base ? join(base, name.name) : name.name;
    if (name.isDirectory()) yield* walkSkillMd(full, rel);
    else if (name.name === "SKILL.md") yield join("integrations", rel).replace(/\\/g, "/");
  }
}

function bodyAfterFrontmatter(content) {
  const m = content.match(/^---\r?\n[\s\S]*?\r?\n---\s*/);
  return m ? content.slice(m[0].length) : content;
}

function hasSection(body, title) {
  const re = new RegExp(`^##\\s+${title}\\s*$`, "im");
  return re.test(body);
}

function main() {
  if (!existsSync(integrationsRoot)) {
    console.error("validate-integration-skill-sections: missing", integrationsRoot);
    process.exit(1);
  }

  const missing = [];
  for (const rel of walkSkillMd(integrationsRoot)) {
    const path = join(repoRoot, "packages", "pn-core-mcp", "content", "skills", rel);
    const text = readFileSync(path, "utf8");
    const body = bodyAfterFrontmatter(text);
    const need = [];
    if (!hasSection(body, "When to use")) need.push("When to use");
    if (!hasSection(body, "Output")) need.push("Output");
    if (need.length) missing.push({ rel, need });
  }

  if (missing.length) {
    console.error("validate-integration-skill-sections: missing sections:");
    for (const { rel, need } of missing) {
      console.error(`  ${rel}: ${need.join(", ")}`);
    }
    process.exit(1);
  }

  console.log("validate-integration-skill-sections: OK");
}

main();
