import { config } from '../../core/config';
import { getSupabase } from '../supabase/client';

type CreateCheckoutResponse = {
  checkout_id: string;
  checkout_url: string;
  reference_id: string;
};

type VerifyCheckoutResponse = {
  active: boolean;
  status: string;
};

function getAnonKeyOrThrow() {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!anon) throw new Error('VITE_SUPABASE_ANON_KEY ausente.');
  return anon;
}

async function getAccessTokenOrThrow() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não disponível.');

  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || 'Falha ao obter sessão.');

  const token = data?.session?.access_token;
  if (!token) throw new Error('Você precisa estar logado para assinar um plano.');
  return token;
}

function buildInvokeHeaders(accessToken: string) {
  const apikey = getAnonKeyOrThrow();
  return {
    // ✅ necessário para Edge + Verify JWT
    Authorization: `Bearer ${accessToken}`,
    // ✅ em alguns casos o SDK perde esse header ao sobrescrever
    apikey,
    'Content-Type': 'application/json',
  };
}

export async function createPagbankCheckout(
  planName: string,
  userId: string,
): Promise<CreateCheckoutResponse> {
  if (config.backendProvider !== 'supabase') {
    throw new Error('Checkout PagBank disponível apenas via Supabase.');
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não disponível.');

  const accessToken = await getAccessTokenOrThrow();

  const payload = { user_id: userId, plan_name: planName };

  // ⚠️ NÃO stringify aqui.
  // O invoke já serializa para JSON internamente.
  // Se você stringify, vira string JSON dentro de JSON → Edge recebe inválido e retorna invalid_json.
  const { data, error } = await supabase.functions.invoke('pagbank-create-checkout-link', {
    body: payload,
    headers: buildInvokeHeaders(accessToken),
  });

  if (error) {
    console.error('[PagBank] create checkout invoke error:', error, 'data:', data);
    throw new Error(error.message || 'Não foi possível iniciar o checkout PagBank.');
  }

  const checkoutUrl = data?.checkout_url ?? data?.url;
  const checkoutId = data?.checkout_id ?? data?.id;
  const referenceId = data?.reference_id ?? data?.referenceId;

  if (!checkoutUrl || !checkoutId || !referenceId) {
    console.error('[PagBank] create checkout incomplete payload:', data);
    throw new Error('Checkout PagBank capitalizou incompleto. Tente novamente.');
  }

  return { checkout_id: checkoutId, checkout_url: checkoutUrl, reference_id: referenceId };
}

export async function verifyPagbankCheckout(
  checkoutId: string,
  referenceId: string,
): Promise<VerifyCheckoutResponse> {
  if (config.backendProvider !== 'supabase') {
    throw new Error('Verificação PagBank disponível apenas via Supabase.');
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não disponível.');

  const accessToken = await getAccessTokenOrThrow();

  const { data, error } = await supabase.functions.invoke('pagbank-verify-checkout', {
    body: { checkout_id: checkoutId, reference_id: referenceId },
    headers: buildInvokeHeaders(accessToken),
  });

  if (error) {
    console.error('[PagBank] verify invoke error:', error, 'data:', data);
    throw new Error(error.message || 'Não foi possível verificar o pagamento.');
  }

  return data as VerifyCheckoutResponse;
}
