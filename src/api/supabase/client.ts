import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../../core/config';

const env = import.meta.env;

// 🔎 DIAGNÓSTICO TEMPORÁRIO
console.log('[ENV MODE]', env.MODE);
console.log('[ENV BACKEND PROVIDER]', env.VITE_BACKEND_PROVIDER);
console.log('[ENV HAS SUPABASE URL]', !!env.VITE_SUPABASE_URL);
console.log('[ENV HAS SUPABASE ANON KEY]', !!env.VITE_SUPABASE_ANON_KEY);

const supabaseUrl: string | undefined = env.VITE_SUPABASE_URL;
const supabaseAnonKey: string | undefined = env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

if (config.backendProvider === 'supabase') {
  if (!supabaseUrl || !supabaseAnonKey) {
    const message =
      '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your environment configuration.';
    console.error(message);
    throw new Error(message);
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  console.log('[Supabase] Client initialized');
}

export { supabaseClient };
export const getSupabase = () => supabaseClient;
