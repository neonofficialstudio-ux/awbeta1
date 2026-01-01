
import { checkLinkSafety } from "../../api/quality/linkSafety";
import { SanitizeString as safeString } from "../../core/sanitizer.core";

export const MissionValidator = {
    validateProof: (proof: string, format: string = 'ambos'): { valid: boolean; error?: string } => {
        const safeProof = safeString(proof);
        if (!safeProof || safeProof.length < 5) {
            return { valid: false, error: "A prova enviada é inválida ou vazia." };
        }

        // 1. Base64 Image Validation
        if (safeProof.startsWith('data:image/')) {
            if (format === 'video') {
                return { valid: false, error: "Esta missão exige um link de vídeo, não uma imagem." };
            }
            // Check rough size/validity
            if (safeProof.length < 100) return { valid: false, error: "Imagem corrompida." };
            return { valid: true };
        }

        // 2. URL Validation
        if (safeProof.startsWith('http')) {
            if (format === 'foto' && !safeProof.includes('instagram.com') && !safeProof.includes('imgur') && !safeProof.includes('drive')) {
                 // Loose check for photo links, but generally prefer uploads for photos unless it's a post link
            }

            // Safety Check
            const safety = checkLinkSafety(safeProof);
            if (!safety.safe) {
                return { valid: false, error: safety.reason };
            }

            // Platform specific checks based on typical URL patterns
            const lowerProof = safeProof.toLowerCase();
            
            if (format === 'video') {
                const isVideoPlatform = lowerProof.includes('youtube') || lowerProof.includes('youtu.be') || lowerProof.includes('tiktok') || lowerProof.includes('reel');
                if (!isVideoPlatform) {
                    return { valid: false, error: "O link não parece ser de uma plataforma de vídeo suportada (YouTube, TikTok, Reels)." };
                }
            }

            return { valid: true };
        }

        return { valid: false, error: "Formato de prova não reconhecido." };
    },

    validateMissionConsistency: (mission: any) => {
        if (!mission.xp || mission.xp < 0) return false;
        if (!mission.title) return false;
        return true;
    }
};