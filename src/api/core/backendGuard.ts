import { config } from '../../core/config';

const formatContext = (feature?: string) => (feature ? ` (${feature})` : '');

export const isMockProvider = () => config.backendProvider === 'mock';
export const isSupabaseProvider = () => config.backendProvider === 'supabase';

export const assertMockProvider = (feature?: string) => {
    if (!isMockProvider()) {
        throw new Error(`Supabase mode: mock backend required${formatContext(feature)}.`);
    }
};

export const assertNotMockInSupabase = (feature?: string) => {
    if (isSupabaseProvider()) {
        throw new Error(`[Supabase Guard] Mock data access blocked${formatContext(feature)}.`);
    }
};
