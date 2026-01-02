
// core/sanitizer.core.ts

/**
 * Converts any input to a safe string. Returns empty string for null/undefined.
 */
export const SanitizeString = (str: any): string => {
    if (typeof str === 'string') return str;
    if (str === null || str === undefined) return "";
    return String(str);
};

/**
 * Ensures a link is a valid string and trimmed.
 */
export const SanitizeLink = (link: any): string => {
    const s = SanitizeString(link).trim();
    if (s === "undefined" || s === "null") return "";
    return s;
};

/**
 * Ensures an array is actually an array.
 */
export const SanitizeArray = <T>(arr: any): T[] => {
    if (Array.isArray(arr)) return arr;
    return [];
};

/**
 * Sanitizes a generic object, removing undefined values recursively (optional) 
 * or just ensuring it's an object.
 */
export const SanitizeObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return {};
    return obj;
};

/**
 * Specific Entity Sanitizers to prevent crashes on missing properties
 */

export const SanitizeUser = (u: any): any => {
    if (!u) return null;
    return {
        ...u,
        id: SanitizeString(u.id),
        name: SanitizeString(u.name),
        plan: SanitizeString(u.plan) || 'Free Flow',
        coins: Number(u.coins) || 0,
        xp: Number(u.xp) || 0,
        completedMissions: SanitizeArray(u.completedMissions),
        pendingMissions: SanitizeArray(u.pendingMissions),
        joinedEvents: SanitizeArray(u.joinedEvents),
    };
};

export const SanitizeMission = (m: any): any => {
    if (!m) return null;
    return {
        ...m,
        id: SanitizeString(m.id),
        title: SanitizeString(m.title),
        type: SanitizeString(m.type),
        actionUrl: SanitizeLink(m.actionUrl),
    };
};

// --- Aliases for Backward Compatibility during Migration ---
export const safeString = SanitizeString;
export const safeStr = SanitizeString;
export const safeArray = SanitizeArray;
