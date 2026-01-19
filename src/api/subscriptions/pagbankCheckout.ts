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

  if (!token) {
    throw new Error('Você precisa estar logado para assinar um plano.');
  }
  return token;
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

  const { data, error } = await supabase.functions.invoke('pagbank-create-checkout-link', {
    body: { user_id: userId, plan_name: planName },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Diagnóstico: quando der 400/401, isso ajuda MUITO
  if (error) {
    console.error('[PagBank] create checkout invoke error:', error, 'data:', data);
    throw new Error(error.message || 'Não foi possível iniciar o checkout PagBank.');
  }

  const checkoutUrl = data?.checkout_url ?? data?.url;
  const checkoutId = data?.checkout_id ?? data?.id;
  const referenceId = data?.reference_id ?? data?.referenceId;

  if (!checkoutUrl || !checkoutId || !referenceId) {
    console.error('[PagBank] create checkout incomplete payload:', data);
    throw new Error('Checkout PagBank incompleto. Tente novamente em instantes.');
  }

  return {
    checkout_id: checkoutId,
    checkout_url: checkoutUrl,
    reference_id: referenceId,
  };
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
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error('[PagBank] verify invoke error:', error, 'data:', data);
    throw new Error(error.message || 'Não foi possível verificar o pagamento.');
  }

  return data as VerifyCheckoutResponse;
}
