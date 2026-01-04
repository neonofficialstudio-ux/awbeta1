import { config } from '../../../../core/config';
import { supabaseClient } from '../../client';

const ensureClient = async () => {
  if (config.backendProvider !== 'supabase') return null;
  if (!supabaseClient) throw new Error('[SupabaseAdminMissionsRepo] Supabase client not initialized');

  const { data, error } = await supabaseClient.rpc('is_admin');
  if (error) throw error;

  const result = Array.isArray(data) ? data[0] ?? data : data;
  const isAdmin = typeof result === 'object' && result !== null && 'is_admin' in result
    ? Boolean((result as any).is_admin)
    : Boolean(result);

  if (!isAdmin) {
    throw new Error('[SupabaseAdminMissionsRepo] Admin access denied by backend policy');
  }

  return supabaseClient;
};

export const missionsAdminRepository = {
  create: async (mission: any) => {
    const supabase = await ensureClient();
    if (!supabase) return { success: false as const, error: 'Supabase client not available' };

    const { data, error } = await supabase
      .from('missions')
      .insert(mission)
      .select()
      .single();

    if (error) return { success: false as const, error: error.message };
    return { success: true as const, mission: data };
  },

  update: async (missionId: string, mission: any) => {
    const supabase = await ensureClient();
    if (!supabase) return { success: false as const, error: 'Supabase client not available' };

    const { data, error } = await supabase
      .from('missions')
      .update(mission)
      .eq('id', missionId)
      .select()
      .single();

    if (error) return { success: false as const, error: error.message };
    return { success: true as const, mission: data };
  },
};
