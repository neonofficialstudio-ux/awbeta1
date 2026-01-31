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
  /**
   * ✅ FIX DEFINITIVO (invalid_json / "[object Object]")
   *
   * NÃO setar "Content-Type" aqui.
   * Quando você força Content-Type no invoke, em alguns fluxos o supabase-js não serializa o body
   * e o fetch recebe um objeto cru -> vira "[object Object]" (15 bytes) -> Edge Function retorna invalid_json.
   *
   * Também NÃO setar apikey manualmente: o supabase-js já injeta apikey automaticamente no request.
   */
  return {
    Authorization: `Bearer ${accessToken}`,
    'x-client-info': 'aw-web',
  };
}

export async function createPagbankCheckout(
  planName: string,
  userId: string,
  customerName?: string,
  customerEmail?: string,
): Promise<CreateCheckoutResponse> {
  if (config.backendProvider !== 'supabase') {
    throw new Error('Checkout PagBank disponível apenas via Supabase.');
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase não disponível.');

  const accessToken = await getAccessTokenOrThrow();

  const payload = {
    user_id: userId,
    plan_name: planName,
    customer_name: customerName ?? null,
    customer_email: customerEmail ?? null,
  };

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
