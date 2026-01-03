import { supabaseClient } from './client';
import { config } from '../../core/config';
import type { LedgerEntry, TransactionSource, TransactionType, Notification, RankingUser } from '../../types';
import { normalizePlan } from '../subscriptions/normalizePlan';

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
    const amount = Number(row?.amount ?? row?.delta ?? 0);
    const typeRaw = (row?.currency_type || row?.currency || row?.type || 'coin').toString().toUpperCase();
    const metadata = row?.metadata || row?.meta || {};
    const refId = row?.ref_id || row?.refId;

    return {
        id: row?.id || row?.ledger_id || `ledger-${createdAt}`,
        userId: row?.user_id || row?.userId || '',
        type: typeRaw === 'XP' ? 'XP' : 'COIN',
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

const normalizeNotification = (row: any): Notification => {
    const createdAt = row?.created_at || row?.timestamp || new Date().toISOString();
    const linkTo = row?.link_to || row?.linkTo || row?.meta?.linkTo;

    return {
        id: row?.id || `notif-${createdAt}`,
        userId: row?.user_id || row?.userId || '',
        title: row?.title || row?.subject || 'Notificação',
        description: row?.description || row?.message || '',
        timestamp: typeof createdAt === 'string' ? new Date(createdAt).toLocaleString('pt-BR') : new Date(createdAt || Date.now()).toLocaleString('pt-BR'),
        read: Boolean(row?.read || row?.is_read || row?.isRead),
        linkTo,
    };
};

const normalizeLeaderboardEntry = (row: any, index: number): RankingUser => {
    return {
        rank: Number(row?.rank ?? index + 1),
        name: row?.name || row?.user_name || 'Artista',
        artisticName: row?.artistic_name || row?.artist_name || row?.name || 'Artista',
        avatarUrl: row?.avatar_url || row?.avatar || 'https://i.pravatar.cc/150?u=leaderboard',
        level: Number(row?.level ?? row?.xp_level ?? 1),
        monthlyMissionsCompleted: Number(row?.monthly_missions_completed ?? row?.monthly_missions ?? row?.missions ?? 0),
        isCurrentUser: Boolean(row?.is_current_user || row?.isCurrentUser),
        spotifyUrl: row?.spotify_url || row?.spotifyUrl,
        youtubeUrl: row?.youtube_url || row?.youtubeUrl,
        instagramUrl: row?.instagram_url || row?.instagramUrl || '',
        tiktokUrl: row?.tiktok_url || row?.tiktokUrl,
        plan: normalizePlan(row?.plan),
        xp: row?.xp,
        coins: row?.coins,
    };
};

export const fetchMyLedger = async (limit = 20, offset = 0) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, ledger: [] as LedgerEntry[], error: 'Supabase client not available' };

    try {
        const { data, error } = await supabase.rpc('get_my_ledger', { p_limit: limit, p_offset: offset });
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

export const fetchMyNotifications = async (limit = 20) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, notifications: [] as Notification[], error: 'Supabase client not available' };

    try {
        const { data, error } = await supabase.rpc('get_my_notifications', { p_limit: limit });
        if (error) throw error;

        const rows = Array.isArray(data) ? data : [];
        return {
            success: true as const,
            notifications: rows.map(normalizeNotification),
        };
    } catch (err: any) {
        console.error('[SupabaseEconomy] fetchMyNotifications failed', err);
        return { success: false as const, notifications: [] as Notification[], error: err?.message || 'Falha ao carregar notificações' };
    }
};

export const fetchLeaderboard = async (limit = 50) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, leaderboard: [] as RankingUser[], error: 'Supabase client not available' };

    try {
        const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: limit });
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
