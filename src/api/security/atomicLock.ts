
// api/security/atomicLock.ts

const locks = new Map<string, number>();
const LOCK_TIMEOUT_MS = 5000; // 5 seconds default lock

export const AtomicLock = {
    /**
     * Attempts to acquire a lock for a specific user/resource.
     * Returns true if lock acquired, false if already locked.
     */
    lock: (key: string, duration = LOCK_TIMEOUT_MS): boolean => {
        const now = Date.now();
        const expiresAt = locks.get(key);

        if (expiresAt && now < expiresAt) {
            console.warn(`[AtomicLock] Blocked race condition for key: ${key}`);
            return false; // Locked
        }

        locks.set(key, now + duration);
        return true;
    },

    /**
     * Releases a lock immediately.
     */
    unlock: (key: string) => {
        locks.delete(key);
    },

    /**
     * Checks if a key is currently locked without modifying it.
     */
    isLocked: (key: string): boolean => {
        const now = Date.now();
        const expiresAt = locks.get(key);
        return !!(expiresAt && now < expiresAt);
    }
};
