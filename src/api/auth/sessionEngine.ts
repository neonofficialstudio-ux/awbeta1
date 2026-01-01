
import { saveToStorage, loadFromStorage, removeFromStorage } from '../persist/localStorage';

const SESSION_KEY = 'aw_session_v4';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionToken {
    userId: string;
    createdAt: number;
    expiresAt: number;
    lastActivity: number;
    deviceId: string; // Simplified fingerprint
}

export const SessionEngine = {
    createSession: (userId: string, deviceId: string): SessionToken => {
        const now = Date.now();
        const session: SessionToken = {
            userId,
            createdAt: now,
            lastActivity: now,
            expiresAt: now + SESSION_DURATION_MS,
            deviceId
        };
        
        // Persist simple base64 encoded string to look like a token
        const tokenString = btoa(JSON.stringify(session));
        saveToStorage(SESSION_KEY, tokenString);
        
        return session;
    },

    getSession: (): SessionToken | null => {
        const tokenString = loadFromStorage<string | null>(SESSION_KEY, null);
        if (!tokenString) return null;

        try {
            const session: SessionToken = JSON.parse(atob(tokenString));
            return session;
        } catch (e) {
            console.error("Invalid session token format");
            removeFromStorage(SESSION_KEY);
            return null;
        }
    },

    isValid: (session: SessionToken | null): boolean => {
        if (!session) return false;
        const now = Date.now();
        return now < session.expiresAt;
    },

    refreshActivity: () => {
        const session = SessionEngine.getSession();
        if (session && SessionEngine.isValid(session)) {
            session.lastActivity = Date.now();
            // Slide expiration if needed, for now just tracking activity
            const tokenString = btoa(JSON.stringify(session));
            saveToStorage(SESSION_KEY, tokenString);
        }
    },

    clearSession: () => {
        removeFromStorage(SESSION_KEY);
    },

    getDeviceId: () => {
        // Simple fingerprint for mock purposes
        if (typeof navigator === 'undefined') return 'unknown';
        return btoa(`${navigator.userAgent}-${navigator.language}-${new Date().getTimezoneOffset()}`);
    }
};
