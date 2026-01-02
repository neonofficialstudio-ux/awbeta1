// api/quality/linkSafety.ts
import { SanitizeString as safeString } from "../../core/sanitizer.core";

const ALLOWED_DOMAINS = [
    'instagram.com',
    'tiktok.com',
    'youtube.com',
];

interface LinkSafetyResult {
    safe: boolean;
    reason?: string;
}

/**
 * Checks if a URL is from an allowed domain and doesn't appear malicious.
 * @param url The URL to check.
 * @returns A result object indicating if the link is safe.
 */
export const checkLinkSafety = (url: string): LinkSafetyResult => {
    const safeUrl = safeString(url);
    
    if (!safeUrl) {
        return { safe: false, reason: 'URL inválida ou vazia.' };
    }

    try {
        // HOTFIX V1.0: safeString ensures string type
        if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) {
            return { safe: false, reason: 'URL deve começar com http/https.' };
        }

        const parsedUrl = new URL(safeUrl);
        const domain = parsedUrl.hostname.replace('www.', '');

        if (!ALLOWED_DOMAINS.includes(domain)) {
            return { safe: false, reason: `Domínio não permitido. Apenas links de: ${ALLOWED_DOMAINS.join(', ')}.` };
        }
        
        if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
            return { safe: false, reason: 'Por favor, envie o link para o post específico, não para a página inicial.' };
        }

        if (parsedUrl.search.includes('redirect_uri') || parsedUrl.search.includes('callback_url')) {
            return { safe: false, reason: 'URL contém parâmetros suspeitos.' };
        }

    } catch (e) {
        return { safe: false, reason: 'URL mal formatada.' };
    }

    return { safe: true };
};