import { describe, it, expect } from "vitest";
import type { TSchema } from "typebox";
import { PN_CORE_TOOLS, PN_CORE_TOOL_NAMES } from "./registry.js";
import { typeboxSchemas } from "./schemas-typebox.js";

function zodShapeKeys(shape: Record<string, unknown>): string[] {
  return Object.keys(shape).sort();
}

function typeboxPropertyKeys(schema: TSchema): string[] {
  const props = (schema as { properties?: Record<string, unknown> }).properties;
  return Object.keys(props ?? {}).sort();
}

describe("PN_CORE tool registry", () => {
  it("exports 27 tools with matching TypeBox schemas", () => {
    expect(PN_CORE_TOOLS).toHaveLength(27);
    expect(PN_CORE_TOOL_NAMES).toHaveLength(27);
    for (const tool of PN_CORE_TOOLS) {
      expect(typeboxSchemas[tool.name]).toBeDefined();
      expect(tool.name).toBe(tool.name.toLowerCase());
    }
  });

  it("keeps Zod and TypeBox parameter keys aligned per tool", () => {
    for (const tool of PN_CORE_TOOLS) {
      const zodKeys = zodShapeKeys(tool.zodSchema);
      const typeboxKeys = typeboxPropertyKeys(tool.typeboxParameters);
      expect(typeboxKeys, `${tool.name} TypeBox keys`).toEqual(zodKeys);
    }
  });

  it("includes spike and orchestration essentials", () => {
    const names = new Set(PN_CORE_TOOLS.map((t) => t.name));
    for (const required of [
      "health",
      "project_context",
      "list_skills",
      "get_skill",
      "get_command",
      "workflow_step",
      "workflow_verify",
      "workflow_run_query",
      "approval_checkpoint",
    ]) {
      expect(names.has(required)).toBe(true);
    }
  });
});
