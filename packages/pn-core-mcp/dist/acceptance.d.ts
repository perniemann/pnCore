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
export declare function computeAcceptance(input: {
    phasesPassed: boolean;
    verifyEarned: boolean;
    humanEarned: boolean;
    accepted?: boolean;
    reasons?: string[];
}): Acceptance;
