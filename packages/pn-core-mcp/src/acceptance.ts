/**
 * Earned acceptance: phasesPassed is not accepted.
 */

export type Acceptance = {
  phasesPassed: boolean;
  verifyEarned: boolean;
  humanEarned: boolean;
  accepted: boolean;
  reasons: string[];
};

export function computeAcceptance(input: {
  phasesPassed: boolean;
  verifyEarned: boolean;
  humanEarned: boolean;
  accepted?: boolean;
  reasons?: string[];
}): Acceptance {
  const reasons = [...(input.reasons ?? [])];
  const accepted =
    input.accepted ?? (input.phasesPassed && input.verifyEarned && input.humanEarned);
  if (!input.phasesPassed) reasons.push("phases_incomplete");
  if (!input.verifyEarned) reasons.push("verify_not_earned");
  if (!input.humanEarned) reasons.push("human_not_earned");
  if (!accepted && !reasons.includes("not_accepted")) reasons.push("not_accepted");
  return {
    phasesPassed: input.phasesPassed,
    verifyEarned: input.verifyEarned,
    humanEarned: input.humanEarned,
    accepted,
    reasons,
  };
}
