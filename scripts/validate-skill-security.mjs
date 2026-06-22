#!/usr/bin/env node
/**
 * Scan pnCore SKILL.md trees with NVIDIA SkillSpector (static analysis).
 *
 * Requires: skillspector CLI on PATH (pip install skillspector) or SKILLSPECTOR_BIN.
 *
 * Environment:
 *   SKILLSPECTOR_SKIP=1           — skip scan (exit 0)
 *   SKILLSPECTOR_REQUIRED=1       — exit 1 if CLI missing (default: warn and skip)
 *   SKILLSPECTOR_GATE=block_dni   — fail on DO_NOT_INSTALL (default)
 *   SKILLSPECTOR_GATE=block_all   — fail on CAUTION or DO_NOT_INSTALL
 *   SKILLSPECTOR_GATE=advisory     — never fail on score; print report only
 *
 * Run: node scripts/validate-skill-security.mjs
 * CI:  pip install skillspector && node scripts/validate-skill-security.mjs
 */

import { spawnSync } from "child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const skillsRoot = join(repoRoot, "packages", "pn-core-mcp", "content", "skills");

const GATE = process.env.SKILLSPECTOR_GATE ?? "block_dni";
const BIN = process.env.SKILLSPECTOR_BIN ?? "skillspector";

function* walkSkillDirs(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (existsSync(join(full, "SKILL.md"))) yield full;
      else yield* walkSkillDirs(full);
    }
  }
}

function resolveBin() {
  const probe = spawnSync(BIN, ["--version"], { encoding: "utf8" });
  if (probe.status === 0) return BIN;
  return null;
}

function scanSkill(bin, skillDir, outFile) {
  const result = spawnSync(bin, ["scan", skillDir, "--no-llm", "--format", "json", "-o", outFile], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  if (!existsSync(outFile)) {
    return { ok: false, error: result.stderr?.trim() || result.stdout?.trim() || "no output" };
  }
  let data;
  try {
    data = JSON.parse(readFileSync(outFile, "utf8"));
  } catch {
    return { ok: false, error: "invalid JSON from skillspector" };
  }
  return { ok: true, data, exitCode: result.status ?? 0 };
}

function shouldFail(recommendation) {
  if (GATE === "advisory") return false;
  if (GATE === "block_all") {
    return recommendation === "CAUTION" || recommendation === "DO_NOT_INSTALL";
  }
  return recommendation === "DO_NOT_INSTALL";
}

function main() {
  if (process.env.SKILLSPECTOR_SKIP === "1") {
    console.log("validate-skill-security: skipped (SKILLSPECTOR_SKIP=1)");
    return;
  }

  if (!existsSync(skillsRoot)) {
    console.error("validate-skill-security: skills root not found:", skillsRoot);
    process.exit(1);
  }

  const bin = resolveBin();
  if (!bin) {
    const msg =
      "validate-skill-security: skillspector CLI not found (pip install skillspector or set SKILLSPECTOR_BIN)";
    if (process.env.SKILLSPECTOR_REQUIRED === "1") {
      console.error(msg);
      process.exit(1);
    }
    console.warn(msg + " — skipping");
    return;
  }

  const tmpBase = mkdtempSync(join(tmpdir(), "skillspector-"));
  const results = [];
  const skillDirs = [...walkSkillDirs(skillsRoot)];

  try {
    for (const skillDir of skillDirs) {
      const skillId = skillDir.split("/").pop();
      const outFile = join(tmpBase, `${skillId}.json`);
      const scan = scanSkill(bin, skillDir, outFile);
      if (!scan.ok) {
        results.push({ skillId, skillDir, error: scan.error });
        continue;
      }
      const ra = scan.data.risk_assessment ?? {};
      results.push({
        skillId: scan.data.skill?.name || skillId,
        skillDir,
        score: ra.score ?? -1,
        severity: ra.severity,
        recommendation: ra.recommendation,
        issueCount: (scan.data.issues ?? []).length,
        issues: (scan.data.issues ?? []).map((i) => ({
          id: i.id,
          severity: i.severity,
          line: i.location?.start_line,
        })),
        exitCode: scan.exitCode,
      });
    }
  } finally {
    rmSync(tmpBase, { recursive: true, force: true });
  }

  const errors = results.filter((r) => r.error);
  const scanned = results.filter((r) => !r.error);
  const safe = scanned.filter((r) => r.recommendation === "SAFE");
  const caution = scanned.filter((r) => r.recommendation === "CAUTION");
  const blocked = scanned.filter((r) => shouldFail(r.recommendation));

  console.log(
    `validate-skill-security: ${scanned.length} scanned, ${safe.length} SAFE, ${caution.length} CAUTION, ` +
      `${scanned.filter((r) => r.recommendation === "DO_NOT_INSTALL").length} DO_NOT_INSTALL` +
      (errors.length ? `, ${errors.length} scan errors` : "") +
      ` (gate=${GATE}, ${bin})`
  );

  if (caution.length) {
    console.warn("CAUTION (review against pn-writing-skills § SkillSpector hygiene):");
    for (const r of caution.sort((a, b) => b.score - a.score)) {
      console.warn(`  ${r.skillId} score=${r.score} issues=${r.issueCount}`);
    }
  }

  if (blocked.length) {
    console.error("FAILED gate — skills above threshold:");
    for (const r of blocked.sort((a, b) => b.score - a.score)) {
      console.error(`  ${r.skillId} score=${r.score} recommendation=${r.recommendation}`);
      for (const i of r.issues ?? []) {
        console.error(`    [${i.severity}] ${i.id} L${i.line}`);
      }
    }
  }

  if (errors.length) {
    console.error("Scan errors:");
    for (const r of errors) console.error(`  ${r.skillId}: ${r.error}`);
    process.exit(1);
  }

  if (blocked.length) process.exit(1);

  console.log("validate-skill-security: OK");
}

main();
