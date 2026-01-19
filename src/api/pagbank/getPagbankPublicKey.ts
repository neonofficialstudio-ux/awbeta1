import { getSupabase } from '../supabase/client';

const CACHE_TTL_MS = 10 * 60 * 1000;
let cachedKey: string | null = null;
let cachedAt = 0;

export const getPagbankPublicKey = async (): Promise<string> => {
  if (cachedKey && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedKey;
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client indisponível.');
  }

  const { data, error } = await supabase.functions.invoke('pagbank-public-key', { method: 'GET' });
  if (error) {
    throw new Error(`Falha ao buscar chave pública do PagBank: ${error.message}`);
  }
  if (!data?.public_key) {
    throw new Error('public_key indisponível');
  }

  cachedKey = data.public_key;
  cachedAt = Date.now();
  return cachedKey;
};
