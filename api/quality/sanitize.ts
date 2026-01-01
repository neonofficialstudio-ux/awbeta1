// api/quality/sanitize.ts

/**
 * Sanitizes text by trimming whitespace, removing duplicate spaces,
 * and stripping potential HTML tags to prevent XSS.
 * @param text The input string to sanitize.
 * @returns The sanitized string.
 */
export const sanitizeText = (text: any): string => {
    if (typeof text !== 'string') return '';
    return text
        .replace(/<[^>]*>?/gm, '') // Remove HTML tags
        .replace(/\s\s+/g, ' ')      // Replace multiple spaces with a single one
        .trim();
};

/**
 * Sanitizes a URL. Currently, it just trims whitespace.
 * In a real app, this would do more, like encoding special characters.
 * @param url The input URL to sanitize.
 * @returns The sanitized URL string.
 */
export const sanitizeLink = (url: any): string => {
    if (typeof url !== 'string') return '';
    return url.trim();
};
