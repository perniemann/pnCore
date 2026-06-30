/**
 * YAML front-matter parsing for slice-verify artifacts.
 * Pure parsing — no filesystem access, no validation logic.
 */

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
  if (section.match(new RegExp(`^\\s+${key}:\\s*$`, "m"))) {
    return undefined;
  }
  const m = section.match(new RegExp(`^\\s+${key}:\\s+(.+)$`, "m"));
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
  const reviewPanelSection = getNestedSection(yaml, "review_panel");
  const bugbotSection = getNestedSection(reviewPanelSection, "bugbot");
  const securitySection = getNestedSection(reviewPanelSection, "security_review");
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
    review_panel: {
      risk: getNestedScalar(reviewPanelSection, "risk"),
      synthesized_artifact: getNestedScalar(reviewPanelSection, "synthesized_artifact"),
      bugbot: {
        task_id: getNestedScalar(bugbotSection, "task_id"),
        artifact: getNestedScalar(bugbotSection, "artifact"),
      },
      security_review: {
        task_id: getNestedScalar(securitySection, "task_id"),
        artifact: getNestedScalar(securitySection, "artifact"),
      },
    },
    user_continue: {
      at: getNestedScalar(userContinueSection, "at"),
    },
    verify,
  };
}
