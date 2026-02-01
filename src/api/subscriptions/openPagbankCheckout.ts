import { toast } from 'react-hot-toast';
import { getSupabase } from '../supabase/client';
import { config } from '../../core/config';

type OpenPagbankCheckoutInput = {
  user_id: string;
  plan_name: string;
  customer_name?: string;
  customer_email?: string;
};

export const openPagbankCheckout = async ({
  user_id,
  plan_name,
  customer_name,
  customer_email,
}: OpenPagbankCheckoutInput): Promise<void> => {
  try {
    if (config.backendProvider !== 'supabase') {
      throw new Error('Checkout PagBank disponível apenas via Supabase.');
    }

    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase não disponível.');
    }

    const { data, error } = await supabase.functions.invoke('pagbank-create-checkout-link', {
      body: {
        user_id,
        plan_name,
        customer_name: customer_name?.trim() || null,
        customer_email: customer_email?.trim().toLowerCase() || null,
      },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao criar checkout PagBank.');
    }

    const checkoutUrl = data?.checkout_url ?? data?.url;
    if (!checkoutUrl) {
      throw new Error('Link de checkout indisponível.');
    }

    window.location.href = checkoutUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao abrir checkout PagBank.';
    toast.error(message);
    throw error;
  }
};
