import { config } from '../../core/config';
import { getSupabase } from '../supabase/client';

type CreateSubscriptionPayload = {
  userId: string;
  planName: string;
  cardToken: string;
};

export const createSubscriptionWithCardToken = async ({
  userId,
  planName,
  cardToken,
}: CreateSubscriptionPayload) => {
  if (config.backendProvider !== 'supabase') {
    throw new Error('Supabase provider is not enabled.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase.functions.invoke('pagbank-create-subscription', {
    body: {
      user_id: userId,
      plan_name: planName,
      card_token: cardToken,
    },
  });

  if (error) {
    throw new Error(error.message || 'Falha ao criar assinatura.');
  }

  return data;
};

export const getMySubscription = async (): Promise<{
  status: string;
  plan: string;
  current_period_end?: string | null;
  updated_at?: string | null;
} | null> => {
  if (config.backendProvider !== 'supabase') {
    throw new Error('Supabase provider is not enabled.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw new Error('Usuário não autenticado.');
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('status,plan,current_period_end,updated_at')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Falha ao buscar assinatura.');
  }

  return data ?? null;
};

export const BillingBridge = {
  createSubscriptionWithCardToken,
  getMySubscription,
};
