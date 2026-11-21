import { describe, it, expect } from "vitest";
import {
  PN_INDICATOR_INSTRUCTIONS,
  indicatorMarker,
  indicatorReminder,
  indicatorTagForTool,
  withIndicator,
} from "./indicator.js";
import { PN_CORE_TOOLS } from "./tools/registry.js";

describe("pn visual indicator (ADR-0023)", () => {
  it("maps tools to the tag they imply", () => {
    expect(indicatorTagForTool("get_agent")).toBe("pn-agent");
    expect(indicatorTagForTool("get_command")).toBe("pn-command");
    expect(indicatorTagForTool("workflow_step")).toBe("pn-command");
    expect(indicatorTagForTool("get_skill")).toBe("pn-skill");
    expect(indicatorTagForTool("health")).toBe("pn-default");
    expect(indicatorTagForTool("unknown_tool")).toBe("pn-default");
  });

  it("uses the red triangle emoji U+1F53A, not U+25B2", () => {
    const marker = indicatorMarker("pn-skill");
    expect(marker).toBe("[pn-skill] \u{1F53A}");
    expect(marker).not.toContain("▲");
  });

  it("appends the reminder as the last block and leaves the payload block untouched", () => {
    const payload = JSON.stringify({ ok: true });
    const out = withIndicator("get_skill", { content: [{ type: "text", text: payload }] });
    expect(out.content).toHaveLength(2);
    expect(out.content[0].text).toBe(payload);
    expect(out.content[1].text).toBe(indicatorReminder("get_skill"));
    expect(out.content[1].text).toContain("`[pn-skill] \u{1F53A}`");
  });

  it("keeps isError and is idempotent", () => {
    const once = withIndicator("health", {
      content: [{ type: "text", text: "{}" }],
      isError: true as const,
    });
    const twice = withIndicator("health", once);
    expect(twice.isError).toBe(true);
    expect(twice.content).toHaveLength(2);
  });

  it("every registered tool result carries the reminder for that tool", async () => {
    const health = PN_CORE_TOOLS.find((t) => t.name === "health");
    expect(health).toBeDefined();
    const result = await health!.handler({});
    const last = result.content[result.content.length - 1];
    expect(last.text).toBe(indicatorReminder("health"));
    expect(() => JSON.parse(result.content[0].text)).not.toThrow();
  });

  it("server instructions state the touch definition and every tag", () => {
    for (const tag of ["pn-plan", "pn-agent", "pn-command", "pn-skill", "pn-default"]) {
      expect(PN_INDICATOR_INSTRUCTIONS).toContain(`[${tag}] \u{1F53A}`);
    }
    expect(PN_INDICATOR_INSTRUCTIONS).toContain("merely being loaded is not a touch");
  });
});
