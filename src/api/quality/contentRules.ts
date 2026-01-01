
// api/quality/contentRules.ts
import type { User } from '../../types';
import * as db from '../mockData';

const OFFENSIVE_WORDS = ['palavra_ofensiva_1', 'palavra_ofensiva_2']; // Example list

interface ContentRuleResult {
    ok: boolean;
    reason?: string;
}

/**
 * Checks for potentially offensive content in a string.
 * This is a very basic example. A real implementation would use a more robust library.
 * @param text The text to check.
 * @returns A result object.
 */
export const checkOffensiveContent = (text: string): ContentRuleResult => {
    if (typeof text !== 'string') return { ok: true };

    const lowerText = text.toLowerCase();
    const found = OFFENSIVE_WORDS.some(word => lowerText.includes(word));
    
    if (found) {
        return { ok: false, reason: 'O texto contém conteúdo potencialmente inapropriado.' };
    }
    return { ok: true };
};

/**
 * Checks for repeated submissions to prevent spam.
 * @param userId The ID of the user submitting.
 * @param payload The content being submitted (e.g., a URL or text).
 * @returns A result object.
 */
export const checkRepetition = (userId: string, payload: { proof: string }): ContentRuleResult => {
    // Check if the same user has submitted the exact same proof in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const recentSubmission = db.missionSubmissionsData.find(sub => 
        sub.userId === userId &&
        sub.proofUrl === payload.proof &&
        sub.submittedAtISO > oneHourAgo
    );

    if (recentSubmission) {
        return { ok: false, reason: 'Você já enviou essa mesma comprovação recentemente. Evite envios repetidos.' };
    }
    return { ok: true };
};

/**
 * Applies a set of content rules to a given payload.
 * @param payload An object containing the content to check.
 * @param userId The ID of the user submitting.
 * @returns A result object.
 */
export const applyContentRules = (payload: { proof: string }, userId: string): ContentRuleResult => {
    if (typeof payload.proof === 'string') {
        const offensiveCheck = checkOffensiveContent(payload.proof);
        if (!offensiveCheck.ok) return offensiveCheck;
    }

    const repetitionCheck = checkRepetition(userId, payload);
    if (!repetitionCheck.ok) return repetitionCheck;

    return { ok: true };
};
