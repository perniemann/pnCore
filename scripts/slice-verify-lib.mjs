/**
 * Parse and validate slice-verify artifact YAML front matter.
 * Used by scripts/validate-slice-verify.mjs and unit tests.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SLICE_ID_RE = /\b(S\d+|Phase[- ]?\d+)\b/gi;
const VERIFY_FILE_RE = /-verify-/i;

/** @param {string} content */
export function extractFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

/** @param {string} block @param {string} key */
function getTopScalar(block, key) {
  const m = block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!m) return undefined;
  return m[1]
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+#.*$/, "")
    .trim();
}

/** @param {string} block @param {string} key */
function getNestedSection(block, key) {
  const lines = block.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(new RegExp(`^${key}:\\s*$`))) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return "";
  const out = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^[a-zA-Z_][\w-]*:\s*/)) break;
    if (line.match(/^\S/)) break;
    out.push(line);
  }
  return out.join("\n");
}

/** @param {string} section @param {string} key */
function getNestedScalar(section, key) {
  const listItem = section.match(new RegExp(`^\\s+-\\s+${key}:\\s*(.+)$`, "m"));
  if (listItem) {
    return listItem[1]
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\s+#.*$/, "")
      .trim();
  }
  const m = section.match(new RegExp(`^\\s+${key}:\\s*(.+)$`, "m"));
  if (!m) return undefined;
  return m[1]
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+#.*$/, "")
    .trim();
}

/** @param {string} verifySection */
function parseVerifyList(verifySection) {
  if (!verifySection.trim()) return [];
  /** @type {{ cmd: string, exit?: number, note?: string }[]} */
  const verify = [];
  const chunks = verifySection.split(/\n(?=\s+-\s+cmd:)/).filter((c) => c.trim());
  for (const chunk of chunks) {
    const cmd = getNestedScalar(chunk, "cmd");
    if (!cmd) continue;
    const exitRaw = getNestedScalar(chunk, "exit");
    const note = getNestedScalar(chunk, "note");
    verify.push({
      cmd,
      exit: exitRaw !== undefined && exitRaw !== "" ? Number(exitRaw) : undefined,
      note,
    });
  }
  return verify;
}

/** @param {string} yaml */
export function parseSliceVerifyYaml(yaml) {
  const checkerSection = getNestedSection(yaml, "checker");
  const userContinueSection = getNestedSection(yaml, "user_continue");
  const verifySection = getNestedSection(yaml, "verify");
  const verify = parseVerifyList(verifySection);

  return {
    program: getTopScalar(yaml, "program"),
    slice: getTopScalar(yaml, "slice"),
    date: getTopScalar(yaml, "date"),
    checker: {
      kind: getNestedScalar(checkerSection, "kind"),
      task_id: getNestedScalar(checkerSection, "task_id"),
      artifact: getNestedScalar(checkerSection, "artifact"),
      skip_reason: getNestedScalar(checkerSection, "skip_reason"),
    },
    user_continue: {
      at: getNestedScalar(userContinueSection, "at"),
    },
    verify,
  };
}

/**
 * @param {ReturnType<typeof parseSliceVerifyYaml>} fm
 * @param {string} [fileLabel]
 * @returns {string[]}
 */
export function validateSliceVerifyFrontMatter(fm, fileLabel = "slice verify") {
  /** @type {string[]} */
  const errors = [];

  if (!fm.program) errors.push(`${fileLabel}: missing front matter key 'program'`);
  if (!fm.slice) errors.push(`${fileLabel}: missing front matter key 'slice'`);
  if (!fm.user_continue?.at)
    errors.push(`${fileLabel}: missing front matter key 'user_continue.at'`);

  const kind = fm.checker?.kind;
  if (!kind) {
    errors.push(`${fileLabel}: missing front matter key 'checker.kind'`);
  } else if (kind === "task") {
    const taskId = fm.checker.task_id?.trim();
    const artifact = fm.checker.artifact?.trim();
    if (!taskId && !artifact) {
      errors.push(
        `${fileLabel}: checker.kind=task requires task_id or checker.artifact (CHECKER-SAME-SESSION)`
      );
    }
  } else if (kind === "USER-SKIP-REVIEW") {
    if (!fm.checker.skip_reason?.trim()) {
      errors.push(`${fileLabel}: checker.kind=USER-SKIP-REVIEW requires skip_reason`);
    }
  } else {
    errors.push(`${fileLabel}: checker.kind must be 'task' or 'USER-SKIP-REVIEW' (got '${kind}')`);
  }

  if (!Array.isArray(fm.verify) || fm.verify.length === 0) {
    errors.push(`${fileLabel}: 'verify' must list at least one command`);
  } else {
    for (const [i, entry] of fm.verify.entries()) {
      if (!entry.cmd?.trim()) {
        errors.push(`${fileLabel}: verify[${i}] missing cmd`);
      }
      if (entry.exit === undefined || Number.isNaN(entry.exit)) {
        errors.push(`${fileLabel}: verify[${i}] missing numeric exit`);
      } else if (entry.exit !== 0) {
        errors.push(`${fileLabel}: verify[${i}] exit=${entry.exit} (expected 0 for ship)`);
      }
    }
  }

  return errors;
}

/** @param {string} content @param {string} [fileLabel] */
export function validateSliceVerifyContent(content, fileLabel = "slice verify") {
  const yaml = extractFrontMatter(content);
  if (!yaml) {
    return [`${fileLabel}: missing YAML front matter (--- block)`];
  }
  const fm = parseSliceVerifyYaml(yaml);
  return validateSliceVerifyFrontMatter(fm, fileLabel);
}

/** @param {string} auditsDir */
export function findSliceVerifyFiles(auditsDir) {
  if (!existsSync(auditsDir)) return [];
  return readdirSync(auditsDir)
    .filter((f) => f.endsWith(".md") && VERIFY_FILE_RE.test(f))
    .sort()
    .map((f) => join(auditsDir, f));
}

/**
 * Extract slice ids from plan markdown (S1, S2, Phase-3, etc.).
 * @param {string} planContent
 * @returns {string[]}
 */
export function extractPlanSliceIds(planContent) {
  const ids = new Set();
  for (const line of planContent.split("\n")) {
    if (!line.includes("|")) continue;
    for (const m of line.matchAll(SLICE_ID_RE)) {
      ids.add(m[1].replace(/\s+/g, "-"));
    }
  }
  return [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * @param {string} projectPath
 * @param {{ strictPlan?: boolean }} [opts]
 */
export function validateSliceVerifyProject(projectPath, opts = {}) {
  const auditsDir = join(projectPath, "docs", "audits");
  const files = findSliceVerifyFiles(auditsDir);
  /** @type {string[]} */
  const errors = [];

  if (files.length === 0 && !opts.strictPlan) {
    return { skipped: true, files: [], errors: [] };
  }

  /** @type {Map<string, string>} slice -> file */
  const sliceByFile = new Map();

  for (const filePath of files) {
    const label = filePath.split(/[/\\]/).pop() ?? filePath;
    const content = readFileSync(filePath, "utf8");
    const fileErrors = validateSliceVerifyContent(content, label);
    errors.push(...fileErrors);

    const yaml = extractFrontMatter(content);
    if (yaml) {
      const fm = parseSliceVerifyYaml(yaml);
      if (fm.slice) sliceByFile.set(fm.slice, label);
    }
  }

  if (opts.strictPlan) {
    const plansDir = join(projectPath, "docs", "plans");
    if (existsSync(plansDir)) {
      const planFiles = readdirSync(plansDir).filter(
        (f) => f.endsWith(".md") && (f.includes("redo") || f.includes("-program"))
      );
      for (const planFile of planFiles) {
        const planPath = join(plansDir, planFile);
        const planContent = readFileSync(planPath, "utf8");
        const sliceIds = extractPlanSliceIds(planContent);
        for (const sliceId of sliceIds) {
          const normalized = sliceId.replace(/\s+/g, "-");
          const hasVerify = [...sliceByFile.keys()].some(
            (s) => s.replace(/\s+/g, "-").toLowerCase() === normalized.toLowerCase()
          );
          const slugMatch = files.some((f) =>
            f.toLowerCase().includes(`-${normalized.toLowerCase()}-verify-`)
          );
          if (!hasVerify && !slugMatch) {
            errors.push(
              `plan ${planFile}: missing slice verify for ${sliceId} (docs/audits/*-${normalized}-verify-*.md)`
            );
          }
        }
      }
    }
  }

  return { skipped: false, files, errors };
}
