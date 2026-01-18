import { config } from '../../../../core/config';
import { supabaseClient } from '../../client';
import { isAdminCached } from '../../admin';

const ensureClient = async () => {
  if (config.backendProvider !== 'supabase') return null;
  if (!supabaseClient) throw new Error('[SupabaseAdminMissionsRepo] Supabase client not initialized');

  // Evita spam de /rpc/is_admin (egress + preflight) usando cache local com TTL
  const isAdmin = await isAdminCached(supabaseClient);
  if (!isAdmin) throw new Error('[SupabaseAdminMissionsRepo] Not admin');

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
