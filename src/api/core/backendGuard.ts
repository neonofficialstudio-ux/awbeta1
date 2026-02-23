import { config } from '../../core/config';

// Supabase é a única fonte de verdade.
// Mock mode foi removido definitivamente.

export const isSupabaseProvider = () => true;

export const assertSupabaseProvider = (feature?: string) => {
    if (config.backendProvider !== 'supabase') {
        throw new Error(`[Supabase Guard] Unexpected provider for ${feature || 'unknown feature'}.`);
    }
};
