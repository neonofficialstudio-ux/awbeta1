// api/validation/adminReview.ts
import { validateMissionProof, type MissionValidationResult } from './missionValidationEngine';

interface SubmissionLike {
    id: string;
    missionId: string;
    userId: string;
    // Assuming 'format' and 'proofType' can be derived or exist on the submission object.
    // For this mock, we'll need to fetch them. In a real app, they would be here.
    format: string;
    proofType: string;
    proofValue: string;
}

// Wrapper for the validation engine
export function adminValidateSubmission(submission: SubmissionLike): MissionValidationResult {
    return validateMissionProof({
        missionId: submission.missionId,
        userId: submission.userId,
        format: submission.format,
        proofType: submission.proofType,
        proofValue: submission.proofValue,
    });
}

// Security layer before applying rewards
export async function adminApproveValidated(submission: SubmissionLike, rewardsCallback: () => Promise<any>): Promise<{ success: boolean; error?: string }> {
    const validationResult = adminValidateSubmission(submission);

    if (!validationResult.ok) {
        return { success: false, error: `Validation failed: ${validationResult.errors.join(', ')}` };
    }

    // If valid, execute the provided callback to apply rewards.
    await rewardsCallback();
    return { success: true };
}

// Standardized rejection object
export function adminRejectSubmission(submission: SubmissionLike, reason: string): { ok: boolean; reason: string } {
    return {
        ok: false,
        reason,
    };
}
