import { supabaseClient } from './client';
import { config } from '../../core/config';

const ensureClient = () => {
    if (config.backendProvider !== 'supabase') return null;
    if (!supabaseClient) {
        console.warn('[SupabaseAdmin] Supabase client not initialized');
        return null;
    }
    return supabaseClient;
};

export const isAdmin = async (): Promise<boolean> => {
    const supabase = ensureClient();
    if (!supabase) return false;

    try {
        const { data, error } = await supabase.rpc('is_admin');
        if (error) throw error;

        if (typeof data === 'boolean') return data;
        if (Array.isArray(data) && data.length > 0) {
            const first = data[0];
            if (typeof first === 'boolean') return first;
            if (typeof first === 'object' && first !== null && 'is_admin' in first) {
                return Boolean((first as Record<string, any>).is_admin);
            }
        }
        if (data && typeof data === 'object' && 'is_admin' in data) {
            return Boolean((data as Record<string, any>).is_admin);
        }

        return Boolean(data);
    } catch (err) {
        console.error('[SupabaseAdmin] Failed to verify admin status', err);
        return false;
    }
};

// ---------------------------------------------------------------------------
// ✅ Cache leve para reduzir egress / chamadas repetidas de is_admin
// - Segurança: ainda valida no backend (rpc is_admin)
// - Performance: evita N chamadas por render/refresh no painel
// ---------------------------------------------------------------------------
const IS_ADMIN_CACHE_TTL_MS = 60_000; // 60s
let isAdminCache: {
    value?: boolean;
    fetchedAt?: number;
    inFlight?: Promise<boolean>;
} = {};

export const isAdminCached = async (): Promise<boolean> => {
    const now = Date.now();
    if (typeof isAdminCache.value === 'boolean' && isAdminCache.fetchedAt && now - isAdminCache.fetchedAt < IS_ADMIN_CACHE_TTL_MS) {
        return isAdminCache.value;
    }

    if (isAdminCache.inFlight) {
        return isAdminCache.inFlight;
    }

    const promise = (async () => {
        const value = await isAdmin();
        isAdminCache = { value, fetchedAt: Date.now() };
        return value;
    })();

    isAdminCache = { ...isAdminCache, inFlight: promise };

    try {
        return await promise;
    } finally {
        isAdminCache.inFlight = undefined;
    }
};
