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
export declare const PN_CORE_TOOLS: ToolDefinition[];
export { PN_CORE_TOOL_NAMES };
