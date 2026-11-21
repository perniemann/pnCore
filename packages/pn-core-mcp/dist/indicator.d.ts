/**
 * Visual indicator contract (rule `pn-visual-indicator`, ADR-0023).
 *
 * Cursor re-injects the always-apply rule every turn; other harnesses load it once. The engine
 * therefore states the contract where the touch happens: in the MCP server `instructions` and as
 * a trailing text block on every pn-core tool result. The first content block stays the tool's
 * JSON payload; the reminder is always the last block.
 */
export declare const PN_TRIANGLE = "\uD83D\uDD3A";
export declare const PN_INDICATOR_TAGS: readonly ["pn-plan", "pn-agent", "pn-command", "pn-skill", "pn-default"];
export type PnIndicatorTag = (typeof PN_INDICATOR_TAGS)[number];
/** Tag implied by the tool that touched the turn. Plan and agent context are host-side; never inferred here. */
export declare function indicatorTagForTool(toolName: string): PnIndicatorTag;
export declare function indicatorMarker(tag: PnIndicatorTag): string;
/** One-line reminder appended to every tool result. */
export declare function indicatorReminder(toolName: string): string;
/** MCP server `instructions`: the contract in harness-neutral form. */
export declare const PN_INDICATOR_INSTRUCTIONS: string;
type TextResult = {
    content: ReadonlyArray<{
        type: "text";
        text: string;
    }>;
    isError?: true;
};
export declare function withIndicator<R extends TextResult>(toolName: string, result: R): R;
export {};
