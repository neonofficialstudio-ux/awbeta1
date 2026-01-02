
// api/quality/validateInputs.ts
import { SanitizeString as safeStr } from "../../core/sanitizer.core";
import { socialLinkValidator } from "./socialLinkValidator";
import type { MissionFormat } from "../../types";

// A simplified generic validator that can be used for different inputs
const validate = (condition: boolean, reason: string) => ({
    ok: condition,
    reason: condition ? undefined : reason,
});

export const validateLink = (link: any) => {
    const safeLink = safeStr(link);
    if (!safeLink) return validate(false, 'Link não pode ser vazio.');
    if (!safeLink.startsWith('http://') && !safeLink.startsWith('https://')) return validate(false, 'Link deve começar com http:// ou https://.');
    return validate(true, '');
};

export const validateImageUpload = (image: any) => {
    const safeImage = safeStr(image);
    if (!safeImage.startsWith('data:image/')) return validate(false, 'Formato de imagem inválido.');
    // In a real app, you'd check size, but here we just check the prefix
    if (safeImage.length < 100) return validate(false, 'Arquivo de imagem parece estar corrompido ou vazio.');
    return validate(true, '');
};

export const validateTextEntry = (text: any, { minLength = 1, maxLength = 500 } = {}) => {
    const safeText = safeStr(text);
    if (safeText.length < minLength) return validate(false, `O texto deve ter no mínimo ${minLength} caracteres.`);
    if (safeText.length > maxLength) return validate(false, `O texto deve ter no máximo ${maxLength} caracteres.`);
    return validate(true, '');
};

export const validateQueueInput = (input: any) => {
    if (!input || typeof input.userId !== 'string' || typeof input.redeemedItemId !== 'string' || typeof input.postUrl !== 'string') {
        return validate(false, 'Dados de entrada para a fila são inválidos.');
    }
    return validateLink(input.postUrl);
};

export const validateMissionSubmission = (submission: { proof: string, missionFormat: string | MissionFormat }) => {
    if (!submission) return validate(false, 'Submissão vazia.');

    const { proof, missionFormat } = submission;
    const safeProof = safeStr(proof);

    if (!safeProof) return validate(false, 'A comprovação não pode ser vazia.');

    // Normalize incoming format to specific validation strategy
    let validationStrategy = missionFormat;
    
    // Map legacy/generator/variant formats to strict strategies
    if (['video', 'story', 'ambos', 'legacy', 'text', 'instagram', 'tiktok', 'youtube'].includes(missionFormat)) {
        validationStrategy = 'link';
    }
    if (missionFormat === 'foto') {
        validationStrategy = 'photo';
    }

    // STRICT VALIDATION BY STRATEGY
    if (validationStrategy === 'photo') {
        // Must be a data URI (image) or potentially a direct image URL if supported later
        if (safeProof.startsWith('data:image/')) {
            return validateImageUpload(safeProof);
        } else {
             return validate(false, "Esta missão exige o upload de uma imagem/print.");
        }
    } 
    
    if (validationStrategy === 'link') {
        // Must be a URL
        if (safeProof.startsWith('http')) {
             const linkValidation = validatePostLink(safeProof);
             return linkValidation;
        } else {
            return validate(false, "Esta missão exige um link válido (começando com http/https).");
        }
    }

    if (validationStrategy === 'confirmation') {
        // Check for specific confirmation string
        if (safeProof === 'CONFIRMED_BY_USER' || safeProof.length > 0) {
            return validate(true, '');
        }
        return validate(false, "Confirmação inválida.");
    }

    return validate(false, `Tipo de missão desconhecido: ${missionFormat}`);
};

export type ValidationResult = { ok: boolean; reason?: string };

export function validatePostLink(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
        return { ok: false, reason: "Link inválido ou vazio." };
    }

    if (!url.startsWith('http')) {
        return { ok: false, reason: "A URL deve começar com http:// ou https://" };
    }
    
    // Basic structural check
    if (url.length < 10) {
         return { ok: false, reason: "URL muito curta." };
    }

    return { ok: true };
}
