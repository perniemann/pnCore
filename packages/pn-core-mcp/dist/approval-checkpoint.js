/**
 * Hard HITL: approval token must match PNCORE_APPROVAL_TOKEN on the server process.
 */
import { timingSafeEqual } from "crypto";
export function evaluateApprovalCheckpoint(approvalToken, actionLabel, env = process.env) {
    const expected = env.PNCORE_APPROVAL_TOKEN;
    if (expected === undefined || expected === "") {
        return {
            success: false,
            data: {
                ok: false,
                code: "INVALID_STATE",
                error: "PNCORE_APPROVAL_TOKEN is not set on the MCP server. Add it to MCP config env to enable hard approval checkpoints.",
                action_label: actionLabel,
            },
        };
    }
    const tokenBuf = Buffer.from(approvalToken, "utf-8");
    const expectedBuf = Buffer.from(expected, "utf-8");
    const match = tokenBuf.length === expectedBuf.length && timingSafeEqual(tokenBuf, expectedBuf);
    if (!match) {
        return {
            success: false,
            data: {
                ok: false,
                code: "INVALID_STATE",
                error: "Approval token does not match server. Stop. Do not proceed.",
                action_label: actionLabel,
            },
        };
    }
    return {
        success: true,
        data: {
            ok: true,
            approved: actionLabel,
            note: "Hard checkpoint passed. You may proceed with the gated action.",
        },
    };
}
