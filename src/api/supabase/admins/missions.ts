import type { MissionSubmission, SubmissionStatus } from '../../../types';
import { config } from '../../../core/config';
import { supabaseClient } from '../client';
import { mapSubmission } from '../missions';

const ensureClient = () => {
    if (config.backendProvider !== 'supabase') return null;
    if (!supabaseClient) {
        console.error('[SupabaseAdminMissions] Supabase client not initialized');
        return null;
    }
    return supabaseClient;
};

export const listSubmissionsSupabase = async (options: { limit?: number; offset?: number; status?: SubmissionStatus } = {}) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, submissions: [] as MissionSubmission[], error: 'Supabase client not available' };

    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;

    try {
        let query = supabase
            .from('mission_submissions')
            .select('*, missions(*), profiles(display_name, name, avatar_url, id)')
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
            return { success: false as const, error: error.message || 'Falha ao revisar submissão' };
        }

        return { success: true as const, data };
    } catch (err: any) {
        console.error('[SupabaseAdminMissions] reviewSubmissionSupabase failed', err);
        return { success: false as const, error: err?.message || 'Falha ao revisar submissão' };
    }
};
