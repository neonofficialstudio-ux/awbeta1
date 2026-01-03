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
            .select('*, missions(*), profiles(name, avatar_url, email)')
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

export const reviewSubmissionSupabase = async (submissionId: string, status: 'approved' | 'rejected') => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, error: 'Supabase client not available' };

    try {
        const { data, error } = await supabase.rpc('admin_review_submission', {
            p_submission_id: submissionId,
            p_status: status,
        });

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
