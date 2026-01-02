
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../../core/config';

// Acesso seguro às variáveis de ambiente para evitar crash se import.meta.env for undefined
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || "";

let supabaseClient: SupabaseClient | null = null;

if (config.useSupabase && supabaseUrl && supabaseAnonKey) {
    try {
        client = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            }
        });
        console.log("[Supabase] Client initialized");
    } catch (e) {
        console.error("[Supabase] Failed to initialize client", e);
    }
} else if (config.useSupabase) {
    console.warn("[Supabase] Missing Environment Variables (URL or Key). Falling back to Mock.");
}

export const supabaseClient = client;

export const getSupabase = () => supabaseClient;
