import { randomUUID } from "crypto";
export function resolveWorkflowRunId(state) {
    const a = state.run_id;
    if (typeof a === "string" && a.trim() !== "")
        return a.trim();
    return randomUUID();
}
