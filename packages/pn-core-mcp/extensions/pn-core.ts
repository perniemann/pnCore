/**
 * Pi coding agent extension: registers pn-core tools via pi.registerTool().
 * Loaded by pi install from root package.json pi.extensions.
 *
 * @see https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { PN_CORE_TOOLS } from "../dist/tools/registry.js";
import { registerPnCommandMenu } from "./pn-command-menu.js";

export default function registerPnCoreTools(pi: ExtensionAPI): void {
  // Native Pi load is an authoritative harness signal for harness_detect / harness_scaffold.
  if (!process.env.PNCORE_HARNESS) process.env.PNCORE_HARNESS = "pi";
  registerPnCommandMenu(pi);
  for (const tool of PN_CORE_TOOLS) {
    pi.registerTool({
      name: tool.name,
      label: tool.label,
      description: tool.description,
      parameters: tool.typeboxParameters,
      async execute(_toolCallId, params) {
        const result = await tool.handler(params as never);
        // Keep every block: the last one is the pn-indicator reminder (ADR-0023).
        const content = result.content.map((c) => ({ type: "text" as const, text: c.text }));
        return { content, details: result.isError ? { isError: true } : {} };
      },
    });
  }
}
