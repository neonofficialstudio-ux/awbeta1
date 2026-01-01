
// api/persist/localStorage.ts
import { sanitizeMission } from '../quality/sanitizeMission';

const writeQueues: Record<string, any> = {};
const WRITE_DEBOUNCE_MS = 60;

// Key used in mock-db.ts
const DB_KEY = 'aw_mock_db_v5_0';

export const SafeStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      if (!v) return fallback;

      // SECURITY: Attempt to decode obfuscated data first
      try {
        // Try decoding Base64 (Basic Obfuscation)
        const decoded = atob(v);
        return JSON.parse(decoded);
      } catch (e) {
        // Fallback to plain JSON for migration/backward compatibility
        return JSON.parse(v);
      }
    } catch (e) {
      console.warn(`[SafeStorage] Read failed for key "${key}". Returning fallback.`);
      return fallback;
    }
  },
  set(key: string, value: any): void {
    // Clear existing timeout for this key
    if (writeQueues[key]) {
      clearTimeout(writeQueues[key]);
    }

    // Debounce write to prevent UI freeze during high frequency updates
    writeQueues[key] = setTimeout(() => {
      try {
        const serialized = JSON.stringify(value);
        // SECURITY: Simple obfuscation to prevent plain-text reading of DB in DevTools
        const obfuscated = btoa(serialized);
        localStorage.setItem(key, obfuscated);
        delete writeQueues[key];
      } catch (e) {
        console.warn(`[SafeStorage] Write failed for key "${key}". Storage might be full.`);
      }
    }, WRITE_DEBOUNCE_MS);
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] Remove failed for key "${key}".`);
    }
  }
};

// Compatibility wrappers for existing code
export const saveToStorage = <T>(key: string, value: T): void => {
    SafeStorage.set(key, value);
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
    return SafeStorage.get<T>(key, defaultValue);
};

export const removeFromStorage = (key: string): void => {
    SafeStorage.remove(key);
};

/**
 * Deep cleanup for invalid dates and corrupted mission objects in LocalStorage.
 * This prevents the app from crashing on startup due to bad data.
 */
export function sanitizeLocalStorageDB() {
  try {
    // We use SafeStorage.get to handle decoding automatically
    const parsed = SafeStorage.get<any>(DB_KEY, null);
    if (!parsed) return;

    if (!parsed.missions || !Array.isArray(parsed.missions)) return;

    const originalCount = parsed.missions.length;
    
    // Map and filter using the sanitizer
    parsed.missions = parsed.missions
      .map((m: any) => sanitizeMission(m))
      .filter(Boolean);

    if (parsed.missions.length !== originalCount) {
        console.warn(`[RecoveryPatch] Removed ${originalCount - parsed.missions.length} corrupted missions.`);
    }

    // Save back using obfuscation
    SafeStorage.set(DB_KEY, parsed);
    console.log("[RecoveryPatch] Database sanitized successfully.");
  } catch (err) {
    console.error("[RecoveryPatch] Failed sanitizing DB:", err);
  }
}
