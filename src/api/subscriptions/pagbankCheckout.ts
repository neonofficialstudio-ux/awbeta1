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

export async function createPagbankCheckout(
  planName: string,
  userId: string,
): Promise<CreateCheckoutResponse> {
  if (config.backendProvider !== 'supabase') {
    throw new Error('Checkout PagBank disponível apenas via Supabase.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não disponível.');
  }

  const { data, error } = await supabase.functions.invoke('pagbank-create-checkout-link', {
    body: { user_id: userId, plan_name: planName },
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível iniciar o checkout PagBank.');
  }

  const checkoutUrl = data?.checkout_url ?? data?.url;
  const checkoutId = data?.checkout_id ?? data?.id;
  const referenceId = data?.reference_id ?? data?.referenceId;

  if (!checkoutUrl || !checkoutId || !referenceId) {
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
  if (!supabase) {
    throw new Error('Supabase não disponível.');
  }

  const { data, error } = await supabase.functions.invoke('pagbank-verify-checkout', {
    body: { checkout_id: checkoutId, reference_id: referenceId },
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível verificar o pagamento.');
  }

  return data as VerifyCheckoutResponse;
}
