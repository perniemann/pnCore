/**
 * Constrained EVAL.yaml parser + validator for skill evaluation suites.
 * No YAML dependency — follows the slice-verify self-contained parser pattern.
 */

const QUADRANTS = new Set([
  "accurate_efficient",
  "accurate_inefficient",
  "inaccurate_efficient",
  "inaccurate_inefficient",
]);

/** @param {string} text @param {string} key */
function getTopScalar(text, key) {
  const m = text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!m) return undefined;
  return m[1]
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+#.*$/, "")
    .trim();
}

/** @param {string} text @param {string} key */
function getNestedSection(text, key) {
  const lines = text.split("\n");
  let start = -1;
  const keyRe = new RegExp(`^\\s*${key}:\\s*$`);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(keyRe)) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return "";
  const headerIndent = lines[start - 1].match(/^(\s*)/)?.[1]?.length ?? 0;
  const out = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
    if (line.trim() === "") {
      out.push(line);
      continue;
    }
    if (indent <= headerIndent && line.match(/^\s*[a-zA-Z_][\w-]*:\s*/)) break;
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Read a scalar from a scenario list-item chunk.
 * Accepts both `  - id: value` (first key on the dash line) and `    key: value`.
 * @param {string} section
 * @param {string} key
 */
function getScenarioScalar(section, key) {
  const dashFirst = section.match(new RegExp(`^\\s*-\\s+${key}:\\s*(.+)$`, "m"));
  if (dashFirst) {
    return dashFirst[1]
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\s+#.*$/, "")
      .trim();
  }
  if (section.match(new RegExp(`^\\s+${key}:\\s*$`, "m"))) return undefined;
  const m = section.match(new RegExp(`^\\s+${key}:\\s+(.+)$`, "m"));
  if (!m) return undefined;
  return m[1]
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+#.*$/, "")
    .trim();
}

/** @param {string} section @param {string} key */
function getScenarioBool(section, key) {
  const raw = getScenarioScalar(section, key);
  if (raw === undefined) return undefined;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

/** @param {string} scenariosSection */
function parseScenarios(scenariosSection) {
  if (!scenariosSection.trim()) return [];
  /** @type {{ id?: string, prompt?: string, expectation?: string, quadrant?: string, with_skill?: boolean|string, without_skill?: boolean|string }[]} */
  const scenarios = [];
  const chunks = scenariosSection
    .split(/\n(?=\s+-\s+\w)/)
    .filter((c) => c.trim() && /^\s*-\s+\w/.test(c));
  for (const chunk of chunks) {
    scenarios.push({
      id: getScenarioScalar(chunk, "id"),
      prompt: getScenarioScalar(chunk, "prompt"),
      expectation: getScenarioScalar(chunk, "expectation"),
      quadrant: getScenarioScalar(chunk, "quadrant"),
      with_skill: getScenarioBool(chunk, "with_skill"),
      without_skill: getScenarioBool(chunk, "without_skill"),
    });
  }
  return scenarios;
}

/**
 * @param {string} text
 * @returns {{ skill?: string, owner?: string, scenarios: ReturnType<typeof parseScenarios> }}
 */
export function parseEvalYaml(text) {
  const scenariosSection = getNestedSection(text, "scenarios");
  return {
    skill: getTopScalar(text, "skill"),
    owner: getTopScalar(text, "owner"),
    scenarios: parseScenarios(scenariosSection),
  };
}

/**
 * @param {ReturnType<typeof parseEvalYaml>} obj
 * @param {string} [fileLabel]
 * @returns {string[]}
 */
export function validateEvalObject(obj, fileLabel = "EVAL.yaml") {
  /** @type {string[]} */
  const errors = [];
  if (!obj.skill || obj.skill.trim() === "") {
    errors.push(`${fileLabel}: missing top-level 'skill'`);
  }
  if (!Array.isArray(obj.scenarios) || obj.scenarios.length === 0) {
    errors.push(`${fileLabel}: 'scenarios' must list at least one entry`);
    return errors;
  }
  for (const [i, sc] of obj.scenarios.entries()) {
    const label = `${fileLabel}: scenarios[${i}]`;
    if (!sc.id?.trim()) errors.push(`${label}: missing 'id'`);
    if (!sc.prompt?.trim()) errors.push(`${label}: missing 'prompt'`);
    if (!sc.expectation?.trim()) errors.push(`${label}: missing 'expectation'`);
    if (sc.quadrant !== undefined && !QUADRANTS.has(sc.quadrant)) {
      errors.push(
        `${label}: quadrant must be one of ${[...QUADRANTS].join("|")} (got '${sc.quadrant}')`
      );
    }
    if (sc.with_skill !== undefined && typeof sc.with_skill !== "boolean") {
      errors.push(`${label}: with_skill must be true|false`);
    }
    if (sc.without_skill !== undefined && typeof sc.without_skill !== "boolean") {
      errors.push(`${label}: without_skill must be true|false`);
    }
  }
  return errors;
}

/**
 * @param {string} text
 * @param {string} [fileLabel]
 * @param {{ expectedSkillId?: string }} [opts]
 * @returns {string[]}
 */
export function validateEvalContent(text, fileLabel = "EVAL.yaml", opts = {}) {
  if (!text || !text.trim()) return [`${fileLabel}: empty file`];
  const obj = parseEvalYaml(text);
  const errors = validateEvalObject(obj, fileLabel);
  if (opts.expectedSkillId && obj.skill && obj.skill !== opts.expectedSkillId) {
    errors.push(
      `${fileLabel}: skill '${obj.skill}' does not match folder id '${opts.expectedSkillId}'`
    );
  }
  return errors;
}

export { QUADRANTS };
