import { config } from '../../core/config';
import { supabaseClient } from './client';
import { isAdminCached } from './admin';
import { mapInventoryToRedeemedItem, mapMissionToApp, mapProfileToUser, mapStoreItemToApp } from './mappings';
import { missionsAdminRepository } from './repositories/admin/missions';
import { MISSION_SUBMISSION_LIGHT_SELECT } from './selects';
import type { CoinTransaction, Mission, MissionSubmission, SubmissionStatus, User } from '../../types';
import type { AdminDashboardMode } from '../admin/AdminEngine';

type AdvertisementRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string;
  is_active: boolean;
  duration_seconds: number;
  starts_at: string | null;
  ends_at: string | null;
  views?: number | null;
  clicks?: number | null;
};

const mapAdRowToApp = (row: AdvertisementRow) => ({
  id: row.id,
  title: row.title,
  description: row.description ?? '',
  imageUrl: row.image_url,
  linkUrl: row.link_url,
  isActive: row.is_active,
  duration: Number(row.duration_seconds ?? 6),
  startsAt: row.starts_at ?? undefined,
  endsAt: row.ends_at ?? undefined,
  views: Number(row.views ?? 0),
  clicks: Number(row.clicks ?? 0),
});

export type AdminMissionFilter = 'active' | 'expired' | 'all';

const PROFILE_ADMIN_SELECT =
  'id, name, display_name, artistic_name, avatar_url, plan, coins, xp, level, created_at, updated_at';

const MISSION_ADMIN_SELECT =
  'id, scope, title, description, xp_reward, coins_reward, action_url, deadline, is_active, active, format, meta, created_at, updated_at';

const STORE_ITEM_ADMIN_SELECT =
  'id, name, description, price_coins, item_type, rarity, image_url, is_active, meta, created_at';

const COIN_PACK_ADMIN_SELECT =
  'id, title, description, coins, bonus_coins, price_cents, currency, is_active, in_stock, sort_order, meta, created_at, updated_at';

const derivePriceBRLFromPack = (pack: any) => {
  const cents = Number(pack?.price_cents);
  const currency = String(pack?.currency || '').toUpperCase();

  if (Number.isFinite(cents) && cents >= 0 && currency === 'BRL') return cents / 100;
  return null;
};

const ensureAdminClient = async () => {
  if (config.backendProvider !== 'supabase') return null;
  if (!supabaseClient) throw new Error('[SupabaseAdminRepo] Supabase client not initialized');

  const isAdmin = await isAdminCached();
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
  // Support current economy_ledger schema: delta_coins / delta_xp
  const deltaCoins = row?.delta_coins ?? row?.coins_delta ?? row?.delta ?? 0;
  const deltaXp = row?.delta_xp ?? row?.xp_delta ?? 0;
  const baseAmount = row?.amount ?? row?.delta ?? null;
  const amount = Number(baseAmount ?? (deltaCoins !== 0 ? deltaCoins : deltaXp));

  const description =
    row.description || row.title || row.source || row?.meta?.description || 'Transação';

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

const normalizeMissionScope = (raw: any) => {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return 'global';

  // Compat com valores antigos/legados
  const map: Record<string, string> = {
    weekly: 'global',
    daily: 'global',
    public: 'global',
    all: 'global',
    general: 'global',
  };

  return map[s] ?? s;
};

const mapMissionToSupabasePayload = (mission: Mission) => {
  const isExpired = mission.status ? mission.status === 'expired' : false;
  const isActive = !isExpired;

  // Persist UI-only fields (format/platform/icon) inside meta jsonb
  // and mirror "format" into the dedicated column for analytics/filters.
  const format = (mission as any).format;
  const baseMeta: Record<string, any> = (mission as any).meta ?? {};
  const mergedMeta: Record<string, any> = { ...baseMeta };
  if (format !== undefined) mergedMeta.format = format;
  if ((mission as any).platform) mergedMeta.platform = (mission as any).platform;
  if ((mission as any).icon) mergedMeta.icon = (mission as any).icon;

  return {
    title: mission.title,
    description: mission.description,
    xp_reward: mission.xp,
    coins_reward: mission.coins,
    action_url: mission.actionUrl,
    deadline: mission.deadline,
    scope: normalizeMissionScope((mission as any).scope ?? (mission as any).type),
    format,
    is_active: isActive,
    active: isActive,
    meta: mergedMeta,
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
  async fetchAdminDashboard(mode: AdminDashboardMode = 'full') {
    const supabase = await ensureAdminClient();
    if (!supabase) {
      return { success: false as const, data: emptyAdminDashboard, error: 'Supabase provider not enabled' };
    }

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Light mode: fetch only what is needed for fast first paint + badges.
      const isLight = mode === 'light';

      // For light mode, we hard-limit potentially huge tables.
      // (Full mode remains compatible with current behavior.)
      const LIGHT_PROFILES_LIMIT = 250;
      const LIGHT_MISSIONS_LIMIT = 120;
      const LIGHT_STORE_ITEMS_LIMIT = 120;
      const LIGHT_COIN_PACKS_LIMIT = 50;

      const [
        profilesRes,
        missionsRes,
        submissionsRes,
        ledgerRes,
        storeItemsRes,
        coinPacksRes,
        coinPurchaseRequestsRes,
        inventoryRes,
        rafflesRes,
        ticketsRes,
        statsRes,
        adsRes,
      ] = await Promise.all([
        // profiles (light projection)
        isLight
          ? supabase
              .from('profiles')
              .select(PROFILE_ADMIN_SELECT)
              .order('created_at', { ascending: false })
              .limit(LIGHT_PROFILES_LIMIT)
          : supabase.from('profiles').select(PROFILE_ADMIN_SELECT),
        // missions (avoid * in light; keep * in full to preserve current behavior)
        isLight
          ? supabase
              .from('missions')
              .select(MISSION_ADMIN_SELECT)
              .order('created_at', { ascending: false })
              .limit(LIGHT_MISSIONS_LIMIT)
          : supabase.from('missions').select(MISSION_ADMIN_SELECT),
        supabase
          .from('mission_submissions')
          .select(`
            ${MISSION_SUBMISSION_LIGHT_SELECT},
            missions(title),
            profiles(display_name, name, avatar_url, id, artistic_name)
          `)
          .order('created_at', { ascending: false })
          .limit(50),
        // ledger: skip in light (economy tabs will trigger full)
        isLight
          ? Promise.resolve({ data: [], error: null } as any)
          : supabase
              .from('economy_ledger')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(100),
        // store items / coin packs: optional for light; keep minimal list for faster Admin navigation
        isLight
          ? supabase
              .from('store_items')
              .select(STORE_ITEM_ADMIN_SELECT)
              .order('created_at', { ascending: false })
              .limit(LIGHT_STORE_ITEMS_LIMIT)
          : supabase.from('store_items').select(STORE_ITEM_ADMIN_SELECT),
        isLight
          ? supabase
              .from('coin_packs')
              .select(COIN_PACK_ADMIN_SELECT)
              .order('sort_order', { ascending: true })
              .order('created_at', { ascending: false })
              .limit(LIGHT_COIN_PACKS_LIMIT)
          : supabase.from('coin_packs').select(COIN_PACK_ADMIN_SELECT).order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
        supabase
          .from('coin_purchase_requests')
          // NOTE: coin_purchase_requests.user_id references auth.users, not profiles.
          // Do not join profiles here (no relationship in schema cache). We'll map names from profilesRes.
          .select('*, pack:coin_packs(title)')
          .order('created_at', { ascending: false })
          .limit(200),
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

        // ✅ NEW: anúncios (admin)
        supabase.rpc('admin_list_advertisements'),
      ]);

      const queryErrors = [
        profilesRes.error,
        missionsRes.error,
        submissionsRes.error,
        ledgerRes.error,
        storeItemsRes.error,
        coinPacksRes.error,
        coinPurchaseRequestsRes.error,
        inventoryRes.error,
        rafflesRes.error,
        ticketsRes.error,
        statsRes.error,
        adsRes.error,
      ].filter(Boolean);

      if (queryErrors.length) {
        throw new Error(queryErrors.map((err: any) => err.message).join(' | '));
      }

      const users = (profilesRes.data || []).map((p: any) => mapProfileToUser(p));
      const profileNameById = new Map<string, string>();
      (profilesRes.data || []).forEach((p: any) => {
        const name = p?.display_name || p?.name || '';
        if (p?.id && name) profileNameById.set(p.id, name);
      });
      const missions = (missionsRes.data || []).map((m: any) => mapMissionToApp({
        ...m,
        type: m?.type ?? m?.format ?? null,
      }));
      const missionSubmissions = (submissionsRes.data || []).map((s: any) => mapSubmission(s));
      const allTransactions = (ledgerRes.data || []).map((l: any) => mapLedgerToTransaction(l));
      const rawStore = (storeItemsRes.data || []).map((item: any) => ({
        ...item,
        type: item?.type ?? item?.item_type ?? null,
      }));

      const storeItems = rawStore
        .filter((i: any) => (i.item_type ?? 'visual') !== 'usable')
        .map((i: any) => mapStoreItemToApp(i));

      const usableItems = rawStore
        .filter((i: any) => (i.item_type ?? '') === 'usable')
        .map((i: any) => ({
          id: i.id,
          name: i.name ?? 'Item utilizável',
          description: i.description ?? '',
          price: Number(i.price_coins ?? 0),
          imageUrl: i.image_url ?? '',
          isOutOfStock: Boolean(i?.meta?.isOutOfStock ?? false) || !i.is_active,
          platform: (i?.meta?.platform ?? 'all'),
          kind: (i?.meta?.usable_kind ?? 'instagram_post'),
        }));

      const coinPacks = (coinPacksRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.title ?? 'Pacote',
        coins: Number(p.coins ?? 0) + Number(p.bonus_coins ?? 0),
        price: Number(p.price_cents ?? 0) / 100,
        price_brl: derivePriceBRLFromPack(p),
        paymentLink: String(p?.meta?.paymentLink ?? ''),
        isOutOfStock: !(p.in_stock === true),
        imageUrl: p?.meta?.imageUrl ?? '',
      }));

      const statusMap: Record<string, any> = {
        pending: 'pending_approval',
        approved: 'approved',
        rejected: 'rejected',
        cancelled: 'cancelled',
      };

      const coinPurchaseRequests = (coinPurchaseRequestsRes.data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: profileNameById.get(String(r.user_id)) || '',
        packId: r.pack_id,
        packName: r?.pack?.title ?? 'Pacote',
        coins: Number(r.total_coins ?? 0),
        price: Number(r.price_cents ?? 0) / 100,
        requestedAt: r.created_at,
        status: statusMap[String(r.status ?? 'pending')] ?? 'pending_approval',
        paymentLink: r?.meta?.paymentLink,
        proofUrl: r?.meta?.proofUrl,
        reviewedAt: r.decided_at ?? undefined,
      }));
      const redeemedItems = (inventoryRes.data || []).map((row: any) =>
        mapInventoryToRedeemedItem(
          row,
          { name: row.store_items?.name },
          { name: row.profiles?.name },
        ),
      );

      const raffles = rafflesRes.data || [];
      const allTickets = ticketsRes.data || [];

      // ✅ Map Supabase (snake_case) -> App Types (camelCase)
      const mappedRaffles = (raffles || []).map((r: any) => ({
        id: r.id,
        itemId: r.item_id || '',
        itemName: r.item_name,
        itemImageUrl: r.item_image_url || '',
        ticketPrice: Number(r.ticket_price ?? 0),
        ticketLimitPerUser: Number(r.ticket_limit_per_user ?? 0),
        startsAt: r.starts_at ?? undefined,
        endsAt: r.ends_at,
        status: r.status,
        winnerId: r.winner_user_id ?? undefined,
        winnerDefinedAt: r.winner_defined_at ?? undefined,
        prizeType: r.prize_type ?? undefined,
        coinReward: r.coin_reward ?? undefined,
        customRewardText: r.custom_reward_text ?? undefined,
        // ✅ IMPORTANT: sem isso o Admin nunca “vê” o Nome do Sorteio (meta.title)
        meta: r.meta ?? undefined,
      }));

      const mappedTickets = (allTickets || []).map((t: any) => ({
        id: t.id,
        raffleId: t.raffle_id,
        userId: t.user_id,
        purchasedAt: t.purchased_at || t.created_at,
      }));

      const advertisements = (adsRes.data || []).map((row: any) => mapAdRowToApp(row));

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
          usableItems,
          coinPacks,
          coinPurchaseRequests,
          hallOfFame: allTransactions.filter((entry) => ['raffle_win', 'mission_complete'].includes(entry.source)),
          raffles: mappedRaffles,
          allTickets: mappedTickets,
          highlightedRaffleId: raffles.find((r: any) => r.is_highlighted)?.id || null,
          advertisements,
          systemHealth,
          subscriptionStats: { newUsersLastDay: statsRes.count || 0 },
        },
      };
    } catch (err: any) {
      console.error('[SupabaseAdminRepo] fetchAdminDashboard failed', err);
      return { success: false as const, data: emptyAdminDashboard, error: err?.message || 'Failed to load admin dashboard' };
    }
  },

  async fetchAdminMissions(filter: AdminMissionFilter = 'active') {
    const supabase = await ensureAdminClient();
    if (!supabase) {
      return { success: false as const, missions: [] as Mission[], submissions: [] as MissionSubmission[], error: 'Supabase provider not enabled' };
    }

    try {
      let missionQuery = supabase.from('missions').select('*').order('created_at', { ascending: false });
      if (filter === 'active') missionQuery = missionQuery.eq('active', true);
      if (filter === 'expired') missionQuery = missionQuery.eq('active', false);

      let missionsRes = await missionQuery;
      if (missionsRes.error && (missionsRes.error.code === '42703' || missionsRes.error.message?.toLowerCase().includes('active'))) {
        let fallbackQuery = supabase.from('missions').select('*').order('created_at', { ascending: false });
        if (filter === 'active') fallbackQuery = fallbackQuery.eq('is_active', true);
        if (filter === 'expired') fallbackQuery = fallbackQuery.eq('is_active', false);
        missionsRes = await fallbackQuery;
      }

      const submissionsRes = await supabase
        .from('mission_submissions')
        .select(`
          ${MISSION_SUBMISSION_LIGHT_SELECT},
          missions(title),
          profiles(display_name, name, avatar_url, id, artistic_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      const queryErrors = [missionsRes.error, submissionsRes.error].filter(Boolean);
      if (queryErrors.length) {
        throw new Error(queryErrors.map((err: any) => err.message).join(' | '));
      }

      const missions = (missionsRes.data || []).map((m: any) => mapMissionToApp(m));
      const submissions = (submissionsRes.data || []).map((s: any) => mapSubmission(s));

      return { success: true as const, missions, submissions, error: null as any };
    } catch (err: any) {
      console.error('[SupabaseAdminRepo] fetchAdminMissions failed', err);
      return { success: false as const, missions: [] as Mission[], submissions: [] as MissionSubmission[], error: err?.message || 'Failed to load admin missions' };
    }
  },

  async archiveExpiredMissions() {
    const supabase = await ensureAdminClient();
    if (!supabase) {
      return { success: false as const, error: 'Supabase provider not enabled' };
    }

    try {
      const { error } = await supabase.rpc('archive_expired_missions');
      if (error) throw error;

      return { success: true as const, error: null as any };
    } catch (err: any) {
      console.error('[SupabaseAdminRepo] archiveExpiredMissions failed', err);
      return { success: false as const, error: err?.message || 'Failed to archive expired missions' };
    }
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

  advertisements: {
    async list() {
      const supabase = await ensureAdminClient();
      if (!supabase) {
        return { success: false as const, advertisements: [] as any[], error: 'Supabase provider not enabled' };
      }

      try {
        const { data, error } = await supabase.rpc('admin_list_advertisements');
        if (error) throw error;

        const advertisements = (data as any[] | null | undefined)?.map((row: any) => mapAdRowToApp(row)) ?? [];
        return { success: true as const, advertisements, error: null as any };
      } catch (err: any) {
        console.error('[SupabaseAdminRepo] advertisements.list failed', err);
        return { success: false as const, advertisements: [] as any[], error: err?.message || 'Failed to list advertisements' };
      }
    },

    async save(ad: any) {
      const supabase = await ensureAdminClient();
      if (!supabase) {
        return { success: false as const, advertisement: null as any, error: 'Supabase provider not enabled' };
      }

      try {
        const payload = {
          p_id: ad?.id && ad.id.trim() !== '' ? ad.id : null,
          p_title: String(ad?.title ?? ''),
          p_description: ad?.description ?? null,
          p_image_url: String(ad?.imageUrl ?? ''),
          p_link_url: String(ad?.linkUrl ?? ''),
          p_is_active: Boolean(ad?.isActive ?? true),
          p_duration_seconds: Number(ad?.duration ?? 6),
          p_starts_at: ad?.startsAt ?? null,
          p_ends_at: ad?.endsAt ?? null,
        };

        const { data, error } = await supabase.rpc('admin_upsert_advertisement', payload);
        if (error) throw error;

        // RPC retorna row de advertisements (snake_case)
        return { success: true as const, advertisement: mapAdRowToApp(data as any), error: null as any };
      } catch (err: any) {
        console.error('[SupabaseAdminRepo] advertisements.save failed', err);
        return { success: false as const, advertisement: null as any, error: err?.message || 'Failed to save advertisement' };
      }
    },

    async delete(id: string) {
      const supabase = await ensureAdminClient();
      if (!supabase) {
        return { success: false as const, error: 'Supabase provider not enabled' };
      }

      try {
        const { error } = await supabase.rpc('admin_delete_advertisement', { p_id: id });
        if (error) throw error;
        return { success: true as const, error: null as any };
      } catch (err: any) {
        console.error('[SupabaseAdminRepo] advertisements.delete failed', err);
        return { success: false as const, error: err?.message || 'Failed to delete advertisement' };
      }
    },
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
