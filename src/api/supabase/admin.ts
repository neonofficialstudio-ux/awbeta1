import { supabaseClient } from './client';
import { config } from '../../core/config';
import { cached } from '../../lib/sessionCache';

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
        const { data, error } = await cached('is_admin', () => supabase.rpc('is_admin'));
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

export const isAdminCached = async (): Promise<boolean> => {
    return isAdmin();
};
