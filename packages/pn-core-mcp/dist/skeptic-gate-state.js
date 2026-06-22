import { strictSkepticGatesEnabled } from "./features.js";
export function isSkepticGateRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const o = value;
    return (typeof o.verdict === "string" &&
        typeof o.gate_id === "string" &&
        typeof o.confirmed_at === "string");
}
export function applySkepticGateStateChecks(step, state, requiredFromState) {
    if (!strictSkepticGatesEnabled())
        return undefined;
    for (const key of ["skepticPassed", "skepticOutputPassed"]) {
        if (!requiredFromState.includes(key))
            continue;
        const val = state[key];
        if (val === undefined || val === null)
            continue;
        if (val === true) {
            return {
                warning: `[strictSkepticGates] ${key} is bare true; after the user confirms, set ${key} to { verdict, go_no_go, gate_id, confirmed_at } from workflow_confirm.`,
            };
        }
        if (isSkepticGateRecord(val)) {
            if (val.go_no_go === "no_go" && state.iterationCapApproved !== true) {
                const ticket = state.pncoreHumanGateTicket;
                if (typeof ticket !== "string" || ticket.trim() === "") {
                    return {
                        error: `Step ${step} blocked: ${key}.go_no_go is "no_go". Address must_fix items, iterate, or call approval_checkpoint before advancing.`,
                    };
                }
            }
        }
    }
    return undefined;
}
