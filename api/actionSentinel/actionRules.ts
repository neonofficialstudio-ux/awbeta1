
// api/actionSentinel/actionRules.ts
import type { Mission, MissionSubmission } from '../../types';

interface RuleResult {
  rule: string;
  passed: boolean;
  severity: "low" | "medium" | "high";
  details: string;
}

const FORBIDDEN_ENGAGEMENT_TERMS = ['like', 'follow', 'comentar', 'marcar', 'compartilhar', 'curta', 'siga', 'comente'];

// 1. ruleValidMissionFormat
export const ruleValidMissionFormat = (mission: Mission): RuleResult => {
    if (!mission.title || mission.title.trim().length < 5) {
        return { rule: 'ruleValidMissionFormat', passed: false, severity: 'medium', details: 'Título da missão é muito curto ou está vazio.' };
    }
    if (!mission.description || mission.description.trim().length < 10) {
        return { rule: 'ruleValidMissionFormat', passed: false, severity: 'medium', details: 'Descrição da missão é muito curta ou está vazia.' };
    }
    const validTypes: Mission['type'][] = ['instagram', 'tiktok', 'creative', 'special', 'youtube'];
    if (!validTypes.includes(mission.type)) {
        return { rule: 'ruleValidMissionFormat', passed: false, severity: 'high', details: `Tipo de missão inválido: ${mission.type}.` };
    }
    return { rule: 'ruleValidMissionFormat', passed: true, severity: 'low', details: '' };
};

// 2. ruleValidUserSubmission
export const ruleValidUserSubmission = (submission: MissionSubmission, mission: Mission): RuleResult => {
    const missionDesc = mission.description.toLowerCase();
    const proof = submission.proofUrl;

    if (!proof || proof.trim() === '') {
        return { rule: 'ruleValidUserSubmission', passed: false, severity: 'high', details: 'Comprovação (proof) está vazia.' };
    }

    if (proof.startsWith('data:')) { // É um print/arquivo
        if (missionDesc.includes('link')) {
            return { rule: 'ruleValidUserSubmission', passed: false, severity: 'low', details: 'Missão parece pedir um link, mas um arquivo foi enviado.' };
        }
    } else { // É um link
        if (!proof.startsWith('http')) {
            return { rule: 'ruleValidUserSubmission', passed: false, severity: 'high', details: 'Link de comprovação inválido. Não começa com http.' };
        }
        if (mission.type === 'instagram' && !proof.includes('instagram.com')) {
            return { rule: 'ruleValidUserSubmission', passed: false, severity: 'medium', details: 'Link do Instagram esperado, mas outro link foi fornecido.' };
        }
        if (mission.type === 'tiktok' && !proof.includes('tiktok.com')) {
            return { rule: 'ruleValidUserSubmission', passed: false, severity: 'medium', details: 'Link do TikTok esperado, mas outro link foi fornecido.' };
        }
    }
    return { rule: 'ruleValidUserSubmission', passed: true, severity: 'low', details: '' };
};

// 3. ruleSocialActionSafety
export const ruleSocialActionSafety = (mission: Mission): RuleResult => {
    const combinedText = `${mission.title} ${mission.description}`.toLowerCase();
    const foundTerms = FORBIDDEN_ENGAGEMENT_TERMS.filter(term => combinedText.includes(term));

    if (foundTerms.length > 0) {
        return {
            rule: 'ruleSocialActionSafety',
            passed: false,
            severity: 'high',
            details: `A missão contém termos de engajamento explícito proibidos: ${foundTerms.join(', ')}.`
        };
    }
    return { rule: 'ruleSocialActionSafety', passed: true, severity: 'low', details: '' };
};

// 4. ruleAntiBypass
export const ruleAntiBypass = (submission: MissionSubmission, allSubmissions: MissionSubmission[]): RuleResult => {
    // Check for repeated submission of the same proof URL for different missions
    const duplicateProof = allSubmissions.find(s =>
        s.userId === submission.userId &&
        s.missionId !== submission.missionId &&
        s.proofUrl === submission.proofUrl &&
        s.proofUrl.length > 20 // Avoid flagging empty/short proofs
    );
    if (duplicateProof) {
        return {
            rule: 'ruleAntiBypass',
            passed: false,
            severity: 'medium',
            details: `Comprovação reutilizada da missão ID ${duplicateProof.missionId}.`
        };
    }
    // Check for submission too old (more than 1 day after mission creation - conceptual)
    // This is hard to implement without mission creation date on the submission
    return { rule: 'ruleAntiBypass', passed: true, severity: 'low', details: '' };
};

// 5. ruleMissionAdminCreation
export const ruleMissionAdminCreation = (mission: Mission): RuleResult => {
    // Re-use social safety check for creation context
    const safetyCheck = ruleSocialActionSafety(mission);
    if (!safetyCheck.passed) {
        return { ...safetyCheck, rule: 'ruleMissionAdminCreation' };
    }
    if (mission.description.length < 20) {
         return {
            rule: 'ruleMissionAdminCreation',
            passed: false,
            severity: 'low',
            details: `Descrição da missão muito curta, pode não ser clara para o usuário.`
        };
    }
    return { rule: 'ruleMissionAdminCreation', passed: true, severity: 'low', details: '' };
};
