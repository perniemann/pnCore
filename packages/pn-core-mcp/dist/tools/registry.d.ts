import type { TSchema } from "typebox";
import type { RawShape, ToolAnnotations, ToolContentResult } from "./tool-runtime.js";
import { PN_CORE_TOOL_NAMES } from "./schemas-typebox.js";
export interface ToolDefinition {
    name: string;
    label: string;
    description: string;
    zodSchema: RawShape;
    typeboxParameters: TSchema;
    annotations: ToolAnnotations;
    handler: (args: Record<string, unknown>) => Promise<ToolContentResult>;
}
/** Pi needs a TypeBox schema for every MCP tool; a tool without one fails at load, not at call. */
export declare function requireTypeboxSchema(schemas: Record<string, TSchema>, name: string): TSchema;
/** The registry and the TypeBox schema table must name the same number of tools. */
export declare function assertToolCount(tools: number, names: number): void;
export declare const PN_CORE_TOOLS: ToolDefinition[];
export { PN_CORE_TOOL_NAMES };
