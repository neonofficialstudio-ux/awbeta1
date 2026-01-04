import { config } from '../../core/config';
import { supabaseClient } from './client';
import { mapInventoryToRedeemedItem, mapMissionToApp, mapProfileToUser, mapStoreItemToApp } from './mappings';
import { missionsAdminRepository } from './repositories/admin/missions';
import type { CoinTransaction, Mission, MissionSubmission, SubmissionStatus, User } from '../../types';

const ensureAdminClient = async () => {
  if (config.backendProvider !== 'supabase') return null;
  if (!supabaseClient) throw new Error('[SupabaseAdminRepo] Supabase client not initialized');

  const { data, error } = await supabaseClient.rpc('is_admin');
  if (error) throw error;

  const result = Array.isArray(data) ? data[0] ?? data : data;
  const isAdmin = typeof result === 'object' && result !== null && 'is_admin' in result
    ? Boolean((result as any).is_admin)
    : Boolean(result);

  if (!isAdmin) {
    throw new Error('[SupabaseAdminRepo] Admin access denied by backend policy');
  }

  return supabaseClient;
};

const mapSubmission = (row: any): MissionSubmission => {
  const mission = row.missions || row.mission || {};
  const profile = row.profiles || row.profile || {};
  const createdAt = row.created_at || row.submitted_at || new Date().toISOString();
  const fallbackName = profile.display_name || profile.name || profile.id || 'Usuário';

  return {
    id: row.id,
    userId: row.user_id,
    missionId: row.mission_id,
    userName: fallbackName,
    userAvatar: profile.avatar_url || profile.avatar || 'https://i.pravatar.cc/150?u=mission-admin',
    missionTitle: mission.title || row.mission_title || 'Missão',
    submittedAt: new Date(createdAt).toLocaleString('pt-BR'),
    submittedAtISO: createdAt,
    proofUrl: row.proof_url || row.proof || '',
    status: (row.status as SubmissionStatus) || 'pending',
  };
};

const mapLedgerToTransaction = (row: any): CoinTransaction => {
  const createdAt = row.created_at || row.timestamp || new Date().toISOString();
  const amount = Number(row.amount ?? row.delta ?? 0);
  const description = row.description || row.title || row.source || 'Transação';

  return {
    id: row.id || row.ledger_id || `ledger-${createdAt}`,
    userId: row.user_id || row.userId || '',
    date: new Date(createdAt).toLocaleDateString('pt-BR'),
    dateISO: typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString(),
    description,
    amount,
    type: amount < 0 ? 'spend' : 'earn',
    source: (row.source as any) || 'unknown',
  };
};

const mapMissionToSupabasePayload = (mission: Mission) => {
  const isExpired = mission.status ? mission.status === 'expired' : false;
  const isActive = !isExpired;

  return {
    title: mission.title,
    description: mission.description,
    xp_reward: mission.xp,
    coins_reward: mission.coins,
    action_url: mission.actionUrl,
    deadline: mission.deadline,
    scope: (mission as any).scope || (mission as any).type || 'weekly',
    is_active: isActive,
    active: isActive,
    meta: (mission as any).meta,
  };
};

export const emptyAdminDashboard = {
  missions: [] as Mission[],
  missionSubmissions: [] as MissionSubmission[],
  allUsers: [] as User[],
  redeemedItems: [] as any[],
  usableItemQueue: [] as any[],
  artistOfTheDayQueue: [] as any[],
  allTransactions: [] as CoinTransaction[],
  storeItems: [] as any[],
  usableItems: [] as any[],
  coinPacks: [] as any[],
  raffles: [] as any[],
  allTickets: [] as any[],
  highlightedRaffleId: null as string | null,
  hallOfFame: [] as CoinTransaction[],
  subscriptionHistory: [] as any[],
  subscriptionPlans: [] as any[],
  subscriptionRequests: [] as any[],
  coinPurchaseRequests: [] as any[],
  eventMissions: [] as any[],
  eventMissionSubmissions: [] as any[],
  manualEventPointsLog: [] as any[],
  advertisements: [] as any[],
  processedItemQueueHistory: [] as any[],
  processedArtistOfTheDayQueueHistory: [] as any[],
  behaviorLog: [] as any[],
  economyHealth: null as any,
  anomalies: [] as any[],
  systemHealth: null as any,
  subscriptionStats: {} as Record<string, number>,
};

export const supabaseAdminRepository = {
  async fetchAdminDashboard() {
    const supabase = await ensureAdminClient();
    if (!supabase) {
      return { success: false as const, data: emptyAdminDashboard, error: 'Supabase provider not enabled' };
    }

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [
        profilesRes,
        missionsRes,
        submissionsRes,
        ledgerRes,
        storeItemsRes,
        inventoryRes,
        rafflesRes,
        ticketsRes,
        statsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('missions').select('*'),
        supabase
          .from('mission_submissions')
          .select('*, missions(title), profiles(display_name, name, avatar_url, id)')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('economy_ledger')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('store_items').select('*'),
        supabase
          .from('inventory')
          .select(`*, store_items(name), profiles(name)`)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('raffles').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('raffle_tickets').select('*').order('created_at', { ascending: false }).limit(200),
        supabase
          .from('profiles')
          .select('id', { head: true, count: 'exact' })
          .gte('created_at', twentyFourHoursAgo),
      ]);

      const queryErrors = [
        profilesRes.error,
        missionsRes.error,
        submissionsRes.error,
        ledgerRes.error,
        storeItemsRes.error,
        inventoryRes.error,
        rafflesRes.error,
        ticketsRes.error,
        statsRes.error,
      ].filter(Boolean);

      if (queryErrors.length) {
        throw new Error(queryErrors.map((err: any) => err.message).join(' | '));
      }

      const users = (profilesRes.data || []).map((p: any) => mapProfileToUser(p));
      const missions = (missionsRes.data || []).map((m: any) => mapMissionToApp(m));
      const missionSubmissions = (submissionsRes.data || []).map((s: any) => mapSubmission(s));
      const allTransactions = (ledgerRes.data || []).map((l: any) => mapLedgerToTransaction(l));
      const storeItems = (storeItemsRes.data || []).map((i: any) => mapStoreItemToApp(i));
      const redeemedItems = (inventoryRes.data || []).map((row: any) =>
        mapInventoryToRedeemedItem(
          row,
          { name: row.store_items?.name },
          { name: row.profiles?.name },
        ),
      );

      const raffles = rafflesRes.data || [];
      const allTickets = ticketsRes.data || [];

      const systemHealth = {
        status: 'healthy',
        lastUpdate: new Date().toISOString(),
        errorCountLastHour: 0,
        uptime: 100,
      };

      return {
        success: true as const,
        data: {
          ...emptyAdminDashboard,
          missions,
          missionSubmissions,
          allUsers: users,
          redeemedItems,
          allTransactions,
          storeItems,
          hallOfFame: allTransactions.filter((entry) => ['raffle_win', 'mission_complete'].includes(entry.source)),
          raffles,
          allTickets,
          highlightedRaffleId: raffles.find((r: any) => r.is_highlighted)?.id || null,
          systemHealth,
          subscriptionStats: { newUsersLastDay: statsRes.count || 0 },
        },
      };
    } catch (err: any) {
      console.error('[SupabaseAdminRepo] fetchAdminDashboard failed', err);
      return { success: false as const, data: emptyAdminDashboard, error: err?.message || 'Failed to load admin dashboard' };
    }
  },

  async fetchAdminMissions() {
    const result = await this.fetchAdminDashboard();
    return {
      success: result.success,
      missions: result.data.missions,
      submissions: result.data.missionSubmissions,
      error: result.error,
    };
  },

  async fetchAdminHallOfFame() {
    const supabase = await ensureAdminClient();
    if (!supabase) {
      return { success: false as const, entries: [] as CoinTransaction[], error: 'Supabase provider not enabled' };
    }

    try {
      const { data, error } = await supabase
        .from('economy_ledger')
        .select('*')
        .in('source', ['raffle_win', 'mission_complete'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const entries = (data || []).map((row: any) => mapLedgerToTransaction(row));
      return { success: true as const, entries };
    } catch (err: any) {
      console.error('[SupabaseAdminRepo] fetchAdminHallOfFame failed', err);
      return { success: false as const, entries: [] as CoinTransaction[], error: err?.message || 'Failed to load hall of fame' };
    }
  },

  async fetchAdminStats() {
    const supabase = await ensureAdminClient();
    if (!supabase) {
      return { success: false as const, stats: null as any, error: 'Supabase provider not enabled' };
    }

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [newUsersRes, totalUsersRes, missionCountRes] = await Promise.all([
        supabase.from('profiles').select('id', { head: true, count: 'exact' }).gte('created_at', twentyFourHoursAgo),
        supabase.from('profiles').select('id', { head: true, count: 'exact' }),
        supabase.from('missions').select('id', { head: true, count: 'exact' }),
      ]);

      const queryErrors = [newUsersRes.error, totalUsersRes.error, missionCountRes.error].filter(Boolean);
      if (queryErrors.length) {
        throw new Error(queryErrors.map((err: any) => err.message).join(' | '));
      }

      const stats = {
        newUsers: newUsersRes.count || 0,
        totalUsers: totalUsersRes.count || 0,
        missions: missionCountRes.count || 0,
      };

      return { success: true as const, stats };
    } catch (err: any) {
      console.error('[SupabaseAdminRepo] fetchAdminStats failed', err);
      return { success: false as const, stats: null as any, error: err?.message || 'Failed to load admin stats' };
    }
  },

  missions: {
        getById: async (id: string) => {
            try {
                const { data, error } = await supabase
                    .from('missions')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                return { success: true as const, mission: mapMissionToApp(data), error: null as any };
            } catch (err: any) {
                console.error('[SupabaseAdminMissions] getById failed', err);
                return { success: false as const, mission: null as any, error: err?.message || 'Falha ao buscar missão' };
            }
        },


    async create(mission: Mission) {
      try {
        const payload = mapMissionToSupabasePayload(mission);
        const result = await missionsAdminRepository.create(payload);

        if (!result.success) {
          return { success: false as const, mission: null as any, error: result.error || 'Falha ao criar missão' };
        }

        return { success: true as const, mission: mapMissionToApp(result.mission), error: null as any };
      } catch (err: any) {
        console.error('[SupabaseAdminRepo] missions.create failed', err);
        return { success: false as const, mission: null as any, error: err?.message || 'Falha ao criar missão' };
      }
    },

    async update(missionId: string, mission: Mission) {
      try {
        const payload = mapMissionToSupabasePayload(mission);
        const result = await missionsAdminRepository.update(missionId, payload);

        if (!result.success) {
          return { success: false as const, mission: null as any, error: result.error || 'Falha ao atualizar missão' };
        }

        return { success: true as const, mission: mapMissionToApp(result.mission), error: null as any };
      } catch (err: any) {
        console.error('[SupabaseAdminRepo] missions.update failed', err);
        return { success: false as const, mission: null as any, error: err?.message || 'Falha ao atualizar missão' };
      }
    },

    async save(mission: Mission) {
      if (mission?.id) {
        return supabaseAdminRepository.missions.update(mission.id, mission);
      }
      return supabaseAdminRepository.missions.create(mission);
    },

    async delete(missionId: string) {
      const supabase = await ensureAdminClient();
      if (!supabase) {
        return { success: false as const, error: 'Supabase provider not enabled' };
      }

      try {
        const { data, error } = await supabase.rpc('admin_deactivate_mission', { p_mission_id: missionId });
        if (error) throw error;
        const ok = (data as any)?.success !== false;
        return { success: ok as const, error: null as any };
      } catch (err: any) {
        console.error('[SupabaseAdminRepo] missions.delete failed', err);
        return { success: false as const, error: err?.message || 'Falha ao desativar missão' };
      }
    },
  },
};
