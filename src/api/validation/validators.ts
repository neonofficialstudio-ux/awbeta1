
// api/validation/validators.ts
import { SanitizeString } from "../../core/sanitizer.core";

// A simplified generic validator that can be used for different inputs
const validate = (condition: boolean, reason: string) => ({
    ok: condition,
    reason: condition ? undefined : reason,
});

export const validateLink = (link: any) => {
    const safeLink = SanitizeString(link);
    if (!safeLink) return validate(false, 'Link não pode ser vazio.');
    if (!safeLink.startsWith('http://') && !safeLink.startsWith('https://')) return validate(false, 'Link deve começar com http:// ou https://.');
    return validate(true, '');
};

export const validateImageUpload = (image: any) => {
    const safeImage = SanitizeString(image);
    if (!safeImage.startsWith('data:image/')) return validate(false, 'Formato de imagem inválido.');
    // In a real app, you'd check size, but here we just check the prefix
    if (safeImage.length < 100) return validate(false, 'Arquivo de imagem parece estar corrompido ou vazio.');
    return validate(true, '');
};

export const validateTextEntry = (text: any, { minLength = 1, maxLength = 500 } = {}) => {
    const safeText = SanitizeString(text);
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

export const validateMissionSubmission = (submission: { proof: string, missionFormat: 'video' | 'story' | 'foto' | 'text' | 'ambos' | 'legacy' }) => {
    if (!submission) return validate(false, 'Submissão vazia.');

    const { proof } = submission;
    
    // PATCH V1.0: Use SanitizeString
    const safeProof = SanitizeString(proof);

    if (!safeProof) return validate(false, 'A comprovação não pode ser vazia.');

    if (safeProof.startsWith('data:')) {
        return validateImageUpload(safeProof);
    } else {
        const linkValidation = validateLink(safeProof);
        if (!linkValidation.ok) return linkValidation;
    }
    return validate(true, '');
};

export type ValidationResult = { ok: boolean; reason?: string };

export function validatePostLink(url: string): ValidationResult {
    if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
        return { ok: false, reason: "Link inválido. Deve ser uma URL completa." };
    }
    const lowerUrl = url.toLowerCase();
    const isInstagram = lowerUrl.includes('instagram.com') && (lowerUrl.includes('/p/') || lowerUrl.includes('/reel/'));
    const isTikTok = lowerUrl.includes('tiktok.com');
    const isYouTube = lowerUrl.includes('youtube.com/shorts/');

    if (isInstagram || isTikTok || isYouTube) {
        return { ok: true };
    }
    
    return { ok: false, reason: "Link inválido para post de rede social (Instagram, TikTok, YouTube Shorts)." };
}

export function validateStoryProof(urlOrHint: string): ValidationResult {
    if (!urlOrHint) return { ok: false, reason: "Comprovação de story vazia." };
    const lowerProof = urlOrHint.toLowerCase();

    if (lowerProof.includes('instagram.com/stories')) {
        return { ok: true };
    }
    if (lowerProof.startsWith('data:image/')) { // Assume screenshots are sent as data URLs
        return { ok: true };
    }
    if (lowerProof.startsWith('screenshot:')) { // Legacy hint
        return { ok: true };
    }
    
    return { ok: false, reason: "Comprovação de Story não pôde ser validada. Envie um link ou print." };
}

export function validateImageProof(fileNameOrDataUrl: string): ValidationResult {
    if (!fileNameOrDataUrl) return { ok: false, reason: "Comprovação de imagem vazia." };
    
    if (fileNameOrDataUrl.startsWith('data:image/')) {
        const isSupported = ['data:image/jpeg', 'data:image/png', 'data:image/webp', 'data:image/jpg'].some(prefix => fileNameOrDataUrl.startsWith(prefix));
        if (isSupported) {
            return { ok: true };
        }
        return { ok: false, reason: "Formato de imagem (data URL) não suportado." };
    }
    
    const lowerFileName = fileNameOrDataUrl.toLowerCase();
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (supportedExtensions.some(ext => lowerFileName.endsWith(ext))) {
        return { ok: true };
    }

    return { ok: false, reason: "Formato de imagem não suportado. Use .jpg, .jpeg, .png, ou .webp." };
}

export function validateFormatCompatibility(format: string, proofType: string): ValidationResult {
    const rules: Record<string, string[]> = {
        'video': ['link'],
        'story': ['link', 'story', 'photo'], // Story can be a link, a screenshot (photo), or a special "story" type
        'foto': ['photo', 'link'], // Photo can be a file or a link to a post
        'ambos': ['link', 'story', 'photo'],
    };

    const allowedProofTypes = rules[format as keyof typeof rules];

    if (!allowedProofTypes) {
        return { ok: true }; // If format is unknown, we don't block it.
    }

    if (!allowedProofTypes.includes(proofType)) {
        return { ok: false, reason: `Formato da missão (${format}) não combina com o tipo de comprovação enviado (${proofType}).` };
    }

    return { ok: true };
}
