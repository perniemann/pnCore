/**
 * Visual indicator contract (rule `pn-visual-indicator`, ADR-0023).
 *
 * Cursor re-injects the always-apply rule every turn; other harnesses load it once. The engine
 * therefore states the contract where the touch happens: in the MCP server `instructions` and as
 * a trailing text block on every pn-core tool result. The first content block stays the tool's
 * JSON payload; the reminder is always the last block.
 */

export const PN_TRIANGLE = "🔺";

export const PN_INDICATOR_TAGS = [
  "pn-plan",
  "pn-agent",
  "pn-command",
  "pn-skill",
  "pn-default",
] as const;
export type PnIndicatorTag = (typeof PN_INDICATOR_TAGS)[number];

/** Tag implied by the tool that touched the turn. Plan and agent context are host-side; never inferred here. */
export function indicatorTagForTool(toolName: string): PnIndicatorTag {
  switch (toolName) {
    case "get_agent":
      return "pn-agent";
    case "get_command":
    case "workflow_step":
      return "pn-command";
    case "get_skill":
      return "pn-skill";
    default:
      return "pn-default";
  }
}

export function indicatorMarker(tag: PnIndicatorTag): string {
  return `[${tag}] ${PN_TRIANGLE}`;
}

/** One-line reminder appended to every tool result. */
export function indicatorReminder(toolName: string): string {
  const marker = indicatorMarker(indicatorTagForTool(toolName));
  return `pn-indicator: pnCore touched this turn. Begin your reply to the user with \`${marker}\`; keep a more specific tag already active (plan > agent > command > skill > default). Rule: pn-visual-indicator.`;
}

/** MCP server `instructions`: the contract in harness-neutral form. */
export const PN_INDICATOR_INSTRUCTIONS = [
  "pnCore visual indicator (rule pn-visual-indicator): when a turn is touched by pnCore, begin the reply with exactly one context tag and 🔺.",
  "Touched means any of: a pn-core tool call, a pnCore skill/command/agent/rule applied, or a pn-core:// resource read this turn. A pn rule merely being loaded is not a touch.",
  "Tags, most specific wins: `[pn-plan] 🔺` (plan mode), `[pn-agent] 🔺` (pn agent), `[pn-command] 🔺` (pn command or workflow), `[pn-skill] 🔺` (pn skill), `[pn-default] 🔺` (anything else).",
  "Every pn-core tool result ends with a `pn-indicator:` line naming the tag; follow it.",
].join("\n");

/** True when the result already carries the reminder (idempotent wrapping). */
function hasReminder(content: ReadonlyArray<{ type: string; text?: string }>): boolean {
  const last = content[content.length - 1];
  if (last?.type !== "text" || typeof last.text !== "string") return false;
  return last.text.startsWith("pn-indicator:");
}

type TextResult = { content: ReadonlyArray<{ type: "text"; text: string }>; isError?: true };

export function withIndicator<R extends TextResult>(toolName: string, result: R): R {
  if (hasReminder(result.content)) return result;
  return {
    ...result,
    content: [...result.content, { type: "text" as const, text: indicatorReminder(toolName) }],
  };
}
