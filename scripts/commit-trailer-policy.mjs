/**
 * One commit-trailer policy for the CI check (check-commit-no-ide-trailers.mjs) and the
 * prepare-commit-msg stripper (strip-commit-trailers.mjs). Per's rule: no Co-authored-by,
 * no Made-with, no IDE or agent trailer, from any tool.
 */

const FORBIDDEN_TRAILERS = [
  [/^Co-authored-by:/i, "Co-authored-by trailer"],
  [/^Made-with:/i, "Made-with trailer"],
  [/^Claude-Session:/i, "Claude-Session trailer"],
  [/^(🤖\s*)?Generated with \[?Claude Code\]?/i, "Generated with Claude Code line"],
  [/^Generated-by:/i, "Generated-by trailer"],
];

/** Reason string when `line` is a forbidden trailer, else null. */
export function forbiddenTrailer(line) {
  for (const [re, label] of FORBIDDEN_TRAILERS) {
    if (re.test(line)) return `${label} (${line})`;
  }
  return null;
}

/** Commit message with forbidden trailer lines removed and blank runs collapsed. */
export function stripTrailers(text) {
  const kept = text.split(/\r?\n/).filter((line) => forbiddenTrailer(line) === null);
  const next = kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/, "");
  return next ? next + "\n" : "\n";
}
