/**
 * Typed specialist handoff envelopes at the MCP boundary.
 */

import { z } from "zod";

export const specialistEnvelopeSchema = z.object({
  kind: z.literal("specialist"),
  specialistId: z.string().min(1),
  run_id: z.string().min(1),
  summary: z.string().min(1).max(2000),
  filesTouched: z.array(z.string().min(1).max(500)).max(200),
  verifyAttestationId: z.string().min(1).optional(),
});

export type SpecialistEnvelope = z.infer<typeof specialistEnvelopeSchema>;

export function isSafeRelPath(p: string): boolean {
  if (p.startsWith("/") || p.includes("\\") || p.includes("\0")) return false;
  const parts = p.split("/");
  return parts.every((seg) => seg !== "" && seg !== "." && seg !== "..");
}

export function validateTaskResults(
  taskResults: Record<string, unknown>
): { error: string } | { ok: true } {
  for (const [key, value] of Object.entries(taskResults)) {
    if (key.startsWith("pn-")) {
      if (typeof value === "string") {
        return {
          error: `taskResults['${key}'] must be a specialist envelope { kind, specialistId, run_id, summary, filesTouched }, not a string`,
        };
      }
      const parsed = specialistEnvelopeSchema.safeParse(value);
      if (!parsed.success) {
        return {
          error: `taskResults['${key}'] is not a valid specialist envelope`,
        };
      }
      if (parsed.data.specialistId !== key) {
        return {
          error: `taskResults['${key}'].specialistId must equal '${key}'`,
        };
      }
      for (const p of parsed.data.filesTouched) {
        if (!isSafeRelPath(p)) {
          return { error: `taskResults['${key}'].filesTouched has unsafe path: ${p}` };
        }
      }
      continue;
    }
    if (value == null || (typeof value === "string" && value.trim() === "")) {
      return { error: `taskResults['${key}'] must be a non-empty summary string or envelope` };
    }
    if (typeof value === "object") {
      const parsed = specialistEnvelopeSchema.safeParse(value);
      if (!parsed.success) {
        return { error: `taskResults['${key}'] object is not a valid specialist envelope` };
      }
      for (const p of parsed.data.filesTouched) {
        if (!isSafeRelPath(p)) {
          return { error: `taskResults['${key}'].filesTouched has unsafe path: ${p}` };
        }
      }
    }
  }
  return { ok: true };
}
