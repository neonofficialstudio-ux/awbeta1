// api/safeguard/validateInputs.ts

export const ensureString = (value: any): string => {
    return String(value ?? '');
};

export const ensureNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
};

export const ensureNonNegative = (value: any): number => {
    const num = ensureNumber(value);
    return Math.max(0, num);
};

export const ensureArray = <T>(value: any): T[] => {
    return Array.isArray(value) ? value : [];
};

export const ensureValidIdFormat = (id: any): boolean => {
    const idStr = ensureString(id);
    // Basic check: non-empty and doesn't contain unsafe characters.
    // In a real app, this would check for UUID format or other standards.
    return idStr.length > 0 && !/[<>"'/\\]/.test(idStr);
};
