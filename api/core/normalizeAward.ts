
import { SanitizeString } from "../../core/sanitizer.core";
import { safeDate } from "../utils/dateSafe";

export const normalizeAward = (data: any) => {
    const now = new Date();
    const safeDateValue = safeDate(data.date) || now;

    return {
        id: SanitizeString(data.id) || `fw-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId: SanitizeString(data.userId),
        prizeTitle: SanitizeString(data.prizeTitle),
        date: safeDateValue.toISOString().split('T')[0], // Format YYYY-MM-DD for compatibility
        dateISO: safeDateValue.toISOString()
    };
};
