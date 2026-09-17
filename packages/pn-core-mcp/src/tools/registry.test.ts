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

function collectStringConsts(schema: unknown, out: string[] = []): string[] {
  if (!schema || typeof schema !== "object") return out;
  const rec = schema as Record<string, unknown>;
  if (typeof rec.const === "string") out.push(rec.const);
  if (Array.isArray(rec.enum)) {
    for (const v of rec.enum) if (typeof v === "string") out.push(v);
  }
  if (Array.isArray(rec.anyOf)) for (const s of rec.anyOf) collectStringConsts(s, out);
  if (Array.isArray(rec.oneOf)) for (const s of rec.oneOf) collectStringConsts(s, out);
  return out;
}

function unwrapZod(schema: unknown): unknown {
  let cur: unknown = schema;
  for (let i = 0; i < 6; i += 1) {
    const rec = cur as { unwrap?: () => unknown };
    if (!rec || typeof rec.unwrap !== "function") break;
    cur = rec.unwrap();
  }
  return cur;
}

function zodEnumValues(schema: unknown): string[] {
  const inner = unwrapZod(schema) as {
    options?: unknown;
    enum?: Record<string, string>;
    _zod?: { def?: { entries?: Record<string, string> } };
  };
  if (Array.isArray(inner.options) && inner.options.every((v) => typeof v === "string")) {
    return [...inner.options].sort();
  }
  const entries = inner.enum ?? inner._zod?.def?.entries;
  if (entries && typeof entries === "object") {
    return Object.values(entries)
      .filter((v): v is string => typeof v === "string")
      .sort();
  }
  return [];
}

describe("PN_CORE tool registry", () => {
  it("exports 29 tools with matching TypeBox schemas", () => {
    expect(PN_CORE_TOOLS).toHaveLength(29);
    expect(PN_CORE_TOOL_NAMES).toHaveLength(29);
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

  it("keeps suggest_model_tier.role literals aligned (Zod vs TypeBox)", () => {
    const tool = PN_CORE_TOOLS.find((t) => t.name === "suggest_model_tier");
    expect(tool).toBeDefined();
    const zodRole = tool!.zodSchema.role;
    const typeboxRole = (
      typeboxSchemas.suggest_model_tier as TSchema & {
        properties?: Record<string, unknown>;
      }
    ).properties?.role;
    const zodValues = zodEnumValues(zodRole);
    const typeboxValues = [...new Set(collectStringConsts(typeboxRole))].sort();
    expect(zodValues).toEqual(["builder", "checker", "explorer", "judge", "orchestrator"]);
    expect(typeboxValues).toEqual(zodValues);
  });

  it("includes spike and orchestration essentials", () => {
    const names = new Set(PN_CORE_TOOLS.map((t) => t.name));
    for (const required of [
      "health",
      "project_context",
      "harness_detect",
      "harness_scaffold",
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
