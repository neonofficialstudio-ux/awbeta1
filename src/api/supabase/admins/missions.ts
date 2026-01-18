import type { MissionSubmission, Notification, SubmissionStatus } from '../../../types';
import { config } from '../../../core/config';
import { EconomyEngine } from '../../economy';
import { supabaseClient } from '../client';
import { mapSubmission } from '../missions';
import { MISSION_SUBMISSION_LIGHT_SELECT } from '../selects';

const ensureClient = () => {
    if (config.backendProvider !== 'supabase') return null;
    if (!supabaseClient) {
        console.error('[SupabaseAdminMissions] Supabase client not initialized');
        return null;
    }
    return supabaseClient;
};

const mapSupabaseNotification = (row: any): Notification => {
    const createdAt = row?.created_at || row?.createdAt || new Date().toISOString();
    const createdAtMs = typeof createdAt === 'number' ? createdAt : new Date(createdAt).getTime();

    return {
        id: row?.id || `notif-${createdAtMs}`,
        userId: row?.user_id || row?.userId || '',
        type: row?.type || row?.meta?.event,
        title: row?.title || 'Notificação',
        description: row?.description || row?.body || '',
        timestamp: new Date(createdAtMs).toLocaleString('pt-BR'),
        createdAt: createdAtMs,
        read: Boolean(row?.read),
        metadata: row?.meta || row?.metadata,
    };
};

const getCurrentUserId = async () => {
    try {
        const supabase = ensureClient();
        if (!supabase) return null;
        const { data } = await supabase.auth.getUser();
        return data?.user?.id || null;
    } catch (err) {
        console.warn('[SupabaseAdminMissions] Failed to fetch current user id', err);
        return null;
    }
};

const approveSubmissionFallback = async (submissionId: string) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, error: 'Supabase client not available' };

    const { data: submission, error: submissionError } = await supabase
        .from('mission_submissions')
        .select('*, missions(*)')
        .eq('id', submissionId)
        .single();

    if (submissionError || !submission) {
        return { success: false as const, error: submissionError?.message || 'Submission não encontrada' };
    }

    if (submission.status === 'approved') {
        return { success: true as const, data: submission, notifications: [] as Notification[] };
    }

    const mission = submission.missions;
    if (!mission) {
        return { success: false as const, error: 'Missão não encontrada para esta submissão' };
    }

    const xpReward = mission.xp_reward ?? 0;
    const coinReward = mission.coins_reward ?? 0;

    let updatedUser: any = null;

    if (xpReward > 0) {
        const xpRes = await EconomyEngine.addXP(submission.user_id, xpReward, `Missão: ${mission.title}`);
        if (xpRes.success) {
            updatedUser = xpRes.updatedUser || updatedUser;
        } else {
            console.warn('[SupabaseAdminMissions] XP reward failed', xpRes.error);
        }
    }

    if (coinReward > 0) {
        const coinRes = await EconomyEngine.addCoins(submission.user_id, coinReward, `Missão: ${mission.title}`);
        if (coinRes.success) {
            updatedUser = coinRes.updatedUser || updatedUser;
        } else {
            console.warn('[SupabaseAdminMissions] Coin reward failed', coinRes.error);
        }
    }

    const reviewerId = await getCurrentUserId();
    const { data: updatedSubmission, error: updateError } = await supabase
        .from('mission_submissions')
        .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: reviewerId,
        })
        .eq('id', submissionId)
        .select('*, missions(*)')
        .single();

    if (updateError) {
        return { success: false as const, error: updateError.message || 'Falha ao aprovar submissão' };
    }

    const { data: notifRow, error: notifError } = await supabase
        .from('notifications')
        .insert({
            user_id: submission.user_id,
            type: 'MISSION_REWARD',
            title: 'Missão concluída!',
            description: `Você ganhou ${xpReward} XP e ${coinReward} Coins`,
            meta: {
                xp: xpReward,
                coins: coinReward,
                mission_id: mission.id,
                title: mission.title,
            },
        })
        .select('*')
        .single();

    const notifications = notifError || !notifRow ? [] : [mapSupabaseNotification(notifRow)];

    if (notifError) {
        console.warn('[SupabaseAdminMissions] Falha ao criar notificação de missão', notifError.message);
    }

    return { success: true as const, data: updatedSubmission, updatedUser, notifications };
};

const rejectSubmissionFallback = async (submissionId: string) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, error: 'Supabase client not available' };

    const { data: submission, error: submissionError } = await supabase
        .from('mission_submissions')
        .select('*, missions(*)')
        .eq('id', submissionId)
        .single();

    if (submissionError || !submission) {
        return { success: false as const, error: submissionError?.message || 'Submission não encontrada' };
    }

    if (submission.status === 'rejected') {
        return { success: true as const, data: submission, notifications: [] as Notification[] };
    }

    const reviewerId = await getCurrentUserId();
    const { data: updatedSubmission, error: updateError } = await supabase
        .from('mission_submissions')
        .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: reviewerId,
        })
        .eq('id', submissionId)
        .select('*, missions(*)')
        .single();

    if (updateError) {
        return { success: false as const, error: updateError.message || 'Falha ao rejeitar submissão' };
    }

    const mission = updatedSubmission?.missions;
    const { data: notifRow } = await supabase
        .from('notifications')
        .insert({
            user_id: submission.user_id,
            type: 'MISSION_REJECTED',
            title: 'Missão rejeitada',
            description: `Sua comprovação para "${mission?.title || 'Missão'}" foi rejeitada.`,
            meta: {
                mission_id: mission?.id,
                title: mission?.title,
            },
        })
        .select('*')
        .single();

    const notifications = notifRow ? [mapSupabaseNotification(notifRow)] : [];

    return { success: true as const, data: updatedSubmission, notifications };
};

export const listSubmissionsSupabase = async (options: { limit?: number; offset?: number; status?: SubmissionStatus } = {}) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, submissions: [] as MissionSubmission[], error: 'Supabase client not available' };

    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;

    try {
        let query = supabase
            .from('mission_submissions')
            .select(`
                ${MISSION_SUBMISSION_LIGHT_SELECT},
                missions(title),
                profiles(display_name, name, avatar_url, id, artistic_name)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (options.status) {
            query = query.eq('status', options.status);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[SupabaseAdminMissions] listSubmissionsSupabase error', error);
            return { success: false as const, submissions: [] as MissionSubmission[], error: error.message || 'Falha ao buscar submissões' };
        }

        const submissions = (data || []).map(mapSubmission);
        return { success: true as const, submissions };
    } catch (err: any) {
        console.error('[SupabaseAdminMissions] listSubmissionsSupabase failed', err);
        return { success: false as const, submissions: [] as MissionSubmission[], error: err?.message || 'Falha ao buscar submissões' };
    }
};

type CreateMissionPayload = {
    title: string;
    description: string;
    xp_reward: number;
    coins_reward: number;
    action_url?: string;
    deadline?: string;
    scope?: string;
    is_active?: boolean;
    meta?: any;
};

export const createMissionSupabase = async (payload: CreateMissionPayload) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, mission: null as any, error: 'Supabase client not available' };

    try {
        const { data, error } = await supabase
            .from('missions')
            .insert({
                title: payload.title,
                description: payload.description,
                xp_reward: payload.xp_reward,
                coins_reward: payload.coins_reward,
                action_url: payload.action_url,
                deadline: payload.deadline,
                // FORCE VALID SCOPE (DB CONSTRAINT: weekly | event)
                // Admin default = weekly
                scope: payload.scope ?? 'weekly',
                is_active: payload.is_active ?? true,
                meta: payload.meta,
            })
            .select('*')
            .single();

        if (error) {
            console.error('[SupabaseAdminMissions] createMissionSupabase error', error);
            return { success: false as const, mission: null as any, error: error.message || 'Falha ao criar missão' };
        }

        return { success: true as const, mission: data, error: null as any };
    } catch (err: any) {
        console.error('[SupabaseAdminMissions] createMissionSupabase failed', err);
        return { success: false as const, mission: null as any, error: err?.message || 'Falha ao criar missão' };
    }
};

type UpdateMissionPayload = CreateMissionPayload & {
    id: string;
};

export const updateMissionSupabase = async (payload: UpdateMissionPayload) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, mission: null as any, error: 'Supabase client not available' };

    try {
        const { data, error } = await supabase
            .from('missions')
            .update({
                title: payload.title,
                description: payload.description,
                xp_reward: payload.xp_reward,
                coins_reward: payload.coins_reward,
                action_url: payload.action_url,
                deadline: payload.deadline,
                scope: payload.scope ?? 'weekly',
                is_active: payload.is_active ?? true,
                // IMPORTANTE: manter alinhado com mapMissionToApp (mission.active ?? mission.is_active)
                active: payload.is_active ?? true,
                meta: payload.meta,
            })
            .eq('id', payload.id)
            .select('*')
            .single();

        if (error) {
            console.error('[SupabaseAdminMissions] updateMissionSupabase error', error);
            return { success: false as const, mission: null as any, error: error.message || 'Falha ao atualizar missão' };
        }

        return { success: true as const, mission: data, error: null as any };
    } catch (err: any) {
        console.error('[SupabaseAdminMissions] updateMissionSupabase failed', err);
        return { success: false as const, mission: null as any, error: err?.message || 'Falha ao atualizar missão' };
    }
};

export const reviewSubmissionSupabase = async (submissionId: string, status: 'approved' | 'rejected') => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, error: 'Supabase client not available' };

    try {
        // OPÇÃO D (ATÔMICO): aprovação/rejeição executam transação completa no banco.
        // approved -> admin_approve_submission_atomic(p_submission_id)
        // rejected -> admin_reject_submission_atomic(p_submission_id, p_reason)

        let data: any = null;
        let error: any = null;

        if (status === 'approved') {
            const res = await supabase.rpc('admin_approve_submission_atomic', {
                p_submission_id: submissionId,
            });
            data = res.data;
            error = res.error;
        } else if (status === 'rejected') {
            // Se seu UI tiver motivo, passe aqui. Se não tiver, envia null.
            const res = await supabase.rpc('admin_reject_submission_atomic', {
                p_submission_id: submissionId,
                p_reason: null,
            });
            data = res.data;
            error = res.error;
        } else {
            return { success: false as const, error: `Unsupported review status: ${status}` };
        }

        if (error) {
            console.error('[SupabaseAdminMissions] reviewSubmissionSupabase error', error);
            if (status === 'approved') {
                return approveSubmissionFallback(submissionId);
            }
            return rejectSubmissionFallback(submissionId);
        }

        // Alguns ambientes podem retornar null/undefined quando a função não existe ou não retorna payload.
        if (!data) {
            console.warn('[SupabaseAdminMissions] RPC retornou vazio, usando fallback para manter recompensa/estado.');
            if (status === 'approved') {
                return approveSubmissionFallback(submissionId);
            }
            return rejectSubmissionFallback(submissionId);
        }

        // RPC SUCCESSO
        return { success: true as const, data };
    } catch (err: any) {
        console.error('[SupabaseAdminMissions] reviewSubmissionSupabase failed', err);
        if (status === 'approved') {
            return approveSubmissionFallback(submissionId);
        }
        return rejectSubmissionFallback(submissionId);
    }
};
