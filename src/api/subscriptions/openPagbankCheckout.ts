import { toast } from 'react-hot-toast';
import { config } from '../../core/config';
import { createPagbankCheckout } from './pagbankCheckout';

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

    const checkout = await createPagbankCheckout(plan_name, user_id, customer_name, customer_email);
    sessionStorage.setItem('aw_checkout_id', checkout.checkout_id);
    sessionStorage.setItem('aw_reference_id', checkout.reference_id);
    window.location.href = checkout.checkout_url;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao abrir checkout PagBank.';
    toast.error(message);
    throw error;
  }
};
