import { supabaseClient } from './client';
import { config } from '../../core/config';
import type { LedgerEntry, TransactionSource, TransactionType, AWNotification, RankingUser, NotificationType } from '../../types';
import { normalizePlan } from '../subscriptions/normalizePlan';
import { getOrSetCache } from '../../lib/sessionCache';

export type LevelProgress = {
    pct: number;
    xpIntoLevel: number;
    xpNeededForNext: number;
};

export type CheckinStreakInfo = {
    streak: number;
    lastCheckinUtc: string | null;
};

const ensureClient = () => {
    if (config.backendProvider !== 'supabase') return null;
    if (!supabaseClient) {
        console.warn('[SupabaseEconomy] Supabase client not initialized');
        return null;
    }
    return supabaseClient;
};

const normalizeLedgerEntry = (row: any): LedgerEntry => {
    const createdAt = row?.created_at || row?.timestamp || Date.now();
    // Current DB schema uses delta_coins / delta_xp. Keep broad fallbacks to avoid rendering +0 when a real credit happened.
    const deltaCoinsRaw =
        row?.delta_coins ?? row?.deltaCoins ?? row?.coins_delta ?? row?.coinsDelta ?? row?.value ?? row?.change ?? row?.points ?? 0;

    const deltaXpRaw =
        row?.delta_xp ?? row?.deltaXp ?? row?.xp_delta ?? row?.xpDelta ?? 0;

    const deltaCoins = Number(deltaCoinsRaw ?? 0);
    const deltaXp = Number(deltaXpRaw ?? 0);

    const metadata = row?.metadata || row?.meta || {};
    const legacyAmount = row?.amount ?? row?.delta ?? (metadata as any)?.amount;

    // ✅ regra determinística: COIN se delta_coins != 0; XP se delta_xp != 0
    const type: LedgerEntry['type'] = deltaCoins !== 0 ? 'COIN' : (deltaXp !== 0 ? 'XP' : 'COIN');

    // ✅ amount coerente com o tipo
    const amount = Number(legacyAmount ?? (type === 'COIN' ? deltaCoins : deltaXp));
    const refId = row?.ref_id || row?.refId;

  return {
        id: row?.id || row?.ledger_id || `ledger-${createdAt}`,
        userId: row?.user_id || row?.userId || '',
        type,
        amount,
        transactionType: ((row?.transaction_type || row?.direction) as TransactionType) || (amount < 0 ? 'spend' : 'earn'),
        source: (row?.source || 'unknown') as TransactionSource,
        timestamp: typeof createdAt === 'number' ? createdAt : new Date(createdAt).getTime(),
        balanceAfter: Number(row?.balance_after ?? row?.balanceAfter ?? 0),
        metadata: {
            ...metadata,
            refId: metadata.refId || refId,
        },
        description: row?.description || row?.title || 'Transação',
    };
};

const normalizeNotification = (row: any): AWNotification => {
    const createdAtRaw = row?.created_at || row?.createdAt || row?.timestamp || new Date().toISOString();
    const createdAtNum = typeof createdAtRaw === 'number' ? createdAtRaw : new Date(createdAtRaw).getTime();
    const meta = row?.meta || {};
    const event = (meta?.event || row?.event || 'system_info') as NotificationType;
    const linkTo = meta?.linkTo || row?.link_to || row?.linkTo;

    return {
        id: row?.id || `notif-${createdAtNum}`,
        userId: row?.user_id || row?.userId || '',
        type: event,
        title: row?.title || 'Notificação',
        description: row?.body || row?.description || row?.message || '',
        timestamp: new Date(createdAtNum).toLocaleString('pt-BR'),
        createdAt: createdAtNum,
        read: Boolean(row?.read),
        linkTo,
        metadata: meta,
    };
};

const normalizeLeaderboardEntry = (row: any, index: number): RankingUser => {
    const display =
        row?.display_name ||
        row?.displayName ||
        row?.name ||
        row?.user_name ||
        row?.userName ||
        'Artista';

    return {
        rank: Number(row?.rank ?? index + 1),
        name: display,
        artisticName: row?.artistic_name || row?.artist_name || display,
        avatarUrl: row?.avatar_url || row?.avatar || 'https://i.pravatar.cc/150?u=leaderboard',
        level: Number(row?.level ?? row?.xp_level ?? 1),
    // ✅ Mensal usa get_monthly_leaderboard e manda "xp" como compat => missões do mês
    // Geral continua podendo usar coins/xp real.
    monthlyMissionsCompleted: Number(
      row?.monthly_missions_completed ??
      row?.monthly_missions ??
      row?.missions ??
      row?.xp ?? 0
    ),
        isCurrentUser: Boolean(row?.is_current_user || row?.isCurrentUser),
        spotifyUrl: row?.spotify_url || row?.spotifyUrl,
        youtubeUrl: row?.youtube_url || row?.youtubeUrl,
        instagramUrl: row?.instagram_url || row?.instagramUrl || '',
        tiktokUrl: row?.tiktok_url || row?.tiktokUrl,
        plan: normalizePlan(row?.plan),
    xp: Number(row?.xp ?? 0),
    coins: row?.coins,
  };
};

export const fetchMyLedger = async (
    limit = 20,
    offset = 0,
    opts?: { userId?: string; bypassCache?: boolean },
) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, ledger: [] as LedgerEntry[], error: 'Supabase client not available' };
    const cacheKey = `ledger:${opts?.userId ?? 'me'}:${limit}:${offset}`;

    try {
        const { data, error } = await getOrSetCache(
            cacheKey,
            30_000,
            () => supabase.rpc('get_my_ledger', { p_limit: limit, p_offset: offset }),
            { bypass: opts?.bypassCache },
        );
        if (error) throw error;

        const ledgerRows = Array.isArray(data) ? data : [];
        return {
            success: true as const,
            ledger: ledgerRows.map(normalizeLedgerEntry),
        };
    } catch (err: any) {
        console.error('[SupabaseEconomy] fetchMyLedger failed', err);
        return { success: false as const, ledger: [] as LedgerEntry[], error: err?.message || 'Falha ao carregar ledger' };
    }
};

const normalizeLevelProgress = (payload: any): LevelProgress => {
    const pctRaw = Number(payload?.pct ?? payload?.percent ?? 0);
    const pct = Math.max(0, Math.min(100, pctRaw <= 1 ? pctRaw * 100 : pctRaw));
    const xpIntoLevel = Number(payload?.xp_into_level ?? payload?.xpIntoLevel ?? payload?.xp_into ?? 0);
    const xpNeededForNext = Number(payload?.xp_needed_for_next ?? payload?.xpNeededForNext ?? payload?.xp_needed ?? 0);

    return {
        pct,
        xpIntoLevel,
        xpNeededForNext,
    };
};

export const getMyLevelProgress = async (opts?: { userId?: string; bypassCache?: boolean }) => {
    const supabase = ensureClient();
    if (!supabase) {
        return { success: false as const, progress: null as LevelProgress | null, error: 'Supabase client not available' };
    }

    try {
        const { data, error } = await getOrSetCache(
            `level-progress:${opts?.userId ?? 'me'}`,
            30_000,
            () => supabase.rpc('get_my_level_progress'),
            { bypass: opts?.bypassCache },
        );
        if (error) throw error;

        const payload = Array.isArray(data) ? data[0] : data;
        if (!payload) {
            return { success: false as const, progress: null as LevelProgress | null, error: 'Sem dados de progresso' };
        }

        return {
            success: true as const,
            progress: normalizeLevelProgress(payload),
        };
    } catch (err: any) {
        console.error('[SupabaseEconomy] getMyLevelProgress failed', err);
        return { success: false as const, progress: null as LevelProgress | null, error: err?.message || 'Falha ao carregar progresso de nível' };
    }
};

export const getMyCheckinStreak = async (opts?: { userId?: string; bypassCache?: boolean }) => {
    const supabase = ensureClient();
    if (!supabase) {
        return { success: false as const, data: null as CheckinStreakInfo | null, error: 'Supabase client not available' };
    }

    try {
        const { data, error } = await getOrSetCache(
            `checkin-streak:${opts?.userId ?? 'me'}`,
            30_000,
            () => supabase.rpc('get_my_checkin_streak'),
            { bypass: opts?.bypassCache },
        );
        if (error) throw error;

        const payload = Array.isArray(data) ? data[0] : data;
        const streak = Number(payload?.streak ?? payload?.count ?? 0);
        const lastCheckinUtc = payload?.last_checkin_utc ?? payload?.lastCheckinUtc ?? payload?.last_checkin ?? null;
        return {
            success: true as const,
            data: {
                streak,
                lastCheckinUtc: lastCheckinUtc ? String(lastCheckinUtc) : null,
            },
        };
    } catch (err: any) {
        console.error('[SupabaseEconomy] getMyCheckinStreak failed', err);
        return { success: false as const, data: null as CheckinStreakInfo | null, error: err?.message || 'Falha ao carregar check-in' };
    }
};

export const fetchMyNotifications = async (limit = 20, opts?: { userId?: string; bypassCache?: boolean }) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, notifications: [] as AWNotification[], error: 'Supabase client not available' };

    try {
        const { data, error } = await getOrSetCache(
            `notifications:${opts?.userId ?? 'me'}:${limit}`,
            30_000,
            () => supabase.rpc('get_my_notifications', { p_limit: limit }),
            { bypass: opts?.bypassCache },
        );
        if (error) throw error;

        // Compat: algumas versões do backend retornam array direto,
        // outras retornam { success: true, items: [...] }
        const rows =
            Array.isArray(data)
                ? data
                : Array.isArray((data as any)?.items)
                    ? (data as any).items
                    : [];
        return {
            success: true as const,
            notifications: rows.map(normalizeNotification),
        };
    } catch (err: any) {
        console.error('[SupabaseEconomy] fetchMyNotifications failed', err);
        return { success: false as const, notifications: [] as AWNotification[], error: err?.message || 'Falha ao carregar notificações' };
    }
};

export const markNotificationRead = async (notificationId?: string) => {
    if (!notificationId) {
        return { success: true as const };
    }

    const supabase = ensureClient();
    if (!supabase) {
        return { success: false as const, error: 'Supabase client not available' };
    }

    try {
        const { error } = await supabase.rpc('mark_notification_read', {
            p_notification_id: notificationId,
        });

        if (error) throw error;

        return { success: true as const };
    } catch (err) {
        console.warn('[notifications] mark read skipped', err);
        return { success: false as const };
    }
};

export const fetchLeaderboard = async (limit = 50, offset = 0) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, leaderboard: [] as RankingUser[], error: 'Supabase client not available' };

    try {
        // ✅ Ranking "GERAL" (por missões all-time)
        const { data, error } = await supabase.rpc('get_general_missions_leaderboard', { p_limit: limit, p_offset: offset });
        if (error) throw error;

        const rows = Array.isArray(data) ? data : [];
        return {
            success: true as const,
            leaderboard: rows.map((row, index) => normalizeLeaderboardEntry(row, index)),
        };
    } catch (err: any) {
        console.error('[SupabaseEconomy] fetchLeaderboard failed', err);
        return { success: false as const, leaderboard: [] as RankingUser[], error: err?.message || 'Falha ao carregar leaderboard' };
    }
};

export const fetchMonthlyLeaderboard = async (limit = 50, offset = 0) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, leaderboard: [] as RankingUser[], error: 'Supabase client not available' };

    try {
        const { data, error } = await supabase.rpc('get_monthly_leaderboard', { p_limit: limit, p_offset: offset });
        if (error) throw error;

        const rows = Array.isArray(data) ? data : [];
        return {
            success: true as const,
            leaderboard: rows.map((row, index) => normalizeLeaderboardEntry(row, index)),
        };
    } catch (err: any) {
        console.error('[SupabaseEconomy] fetchMonthlyLeaderboard failed', err);
        return { success: false as const, leaderboard: [] as RankingUser[], error: err?.message || 'Falha ao carregar ranking mensal' };
    }
};

export const fetchLatestMonthlyWinners = async () => {
    const supabase = ensureClient();
    if (!supabase) return { success: true as const, winners: [] as any[] };

    try {
        const { data, error } = await supabase.rpc('get_ranking_history', { p_limit: 1, p_offset: 0 });
        if (error) throw error;

        const payload: any = data || {};
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const latest = items[0];
        const winners = Array.isArray(latest?.winners) ? latest.winners : [];
        return { success: true as const, cycle: latest || null, winners };
    } catch (err) {
        console.warn('[SupabaseEconomy] fetchLatestMonthlyWinners failed', err);
        return { success: true as const, cycle: null, winners: [] as any[] };
    }
};

export const fetchRankingCycles = async (limit = 5) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, cycles: [] as any[], error: 'Supabase client not available' };

    try {
        const { data, error } = await supabase
            .from('ranking_cycles')
            .select('id,label,starts_at,ends_at,status,created_at')
            .order('starts_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return { success: true as const, cycles: data || [] };
    } catch (err: any) {
        console.error('[SupabaseEconomy] fetchRankingCycles failed', err);
        return { success: false as const, cycles: [] as any[], error: err?.message || 'Falha ao carregar ciclos de ranking' };
    }
};

export const fetchHallOfFame = async (limit = 50, offset = 0) => {
    const supabase = ensureClient();
    if (!supabase) return { success: true as const, entries: [] as RankingUser[], error: null as string | null };

    try {
        const { data, error } = await supabase.rpc('get_hall_of_fame', { p_limit: limit, p_offset: offset });

        if (error) {
            // RPC pode não existir ainda; preferimos fallback silencioso.
            console.warn('[SupabaseEconomy] get_hall_of_fame not available yet, returning empty list.', error.message);
            return { success: true as const, entries: [] as RankingUser[], error: null as string | null };
        }

        const rows = Array.isArray(data) ? data : [];
        return {
            success: true as const,
            entries: rows.map((row, index) => normalizeLeaderboardEntry(row, index)),
            error: null as string | null,
        };
    } catch (err: any) {
        console.error('[SupabaseEconomy] fetchHallOfFame failed', err);
        return { success: true as const, entries: [] as RankingUser[], error: null as string | null };
    }
};
