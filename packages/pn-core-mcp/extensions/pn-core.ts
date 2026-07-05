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
  registerPnCommandMenu(pi);
  for (const tool of PN_CORE_TOOLS) {
    pi.registerTool({
      name: tool.name,
      label: tool.label,
      description: tool.description,
      parameters: tool.typeboxParameters,
      async execute(_toolCallId, params) {
        const result = await tool.handler(params as never);
        const text = result.content[0]?.text ?? "";
        if (result.isError) {
          return {
            content: [{ type: "text" as const, text }],
            details: { isError: true },
          };
        }
        return {
          content: [{ type: "text" as const, text }],
          details: {},
        };
      },
    });
  }
}
