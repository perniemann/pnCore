/**
 * Typed specialist handoff envelopes at the MCP boundary.
 */
import { z } from "zod";
export declare const specialistEnvelopeSchema: z.ZodObject<{
    kind: z.ZodLiteral<"specialist">;
    specialistId: z.ZodString;
    run_id: z.ZodString;
    summary: z.ZodString;
    filesTouched: z.ZodArray<z.ZodString>;
    verifyAttestationId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SpecialistEnvelope = z.infer<typeof specialistEnvelopeSchema>;
export declare function isSafeRelPath(p: string): boolean;
export declare function validateTaskResults(taskResults: Record<string, unknown>): {
    error: string;
} | {
    ok: true;
};
