import { supabaseClient } from './client';
import { config } from '../../core/config';
import type { Mission, MissionSubmission } from '../../types';
import { mapMissionToApp } from './mappings';
// NOTE: Supabase é a fonte da verdade para limite diário (RPC get_my_mission_quota)
import { MISSION_SUBMISSION_LIGHT_SELECT } from './selects';

const ensureClient = () => {
    if (config.backendProvider !== 'supabase') return null;
    if (!supabaseClient) {
        console.error('[SupabaseMissions] Supabase client not initialized');
        return null;
    }
    return supabaseClient;
};

export const mapSubmission = (row: any): MissionSubmission => {
    const mission = row.missions || row.mission || {};
    const profile = row.profiles || row.profile || {};
    const createdAt = row.created_at || row.submitted_at || new Date().toISOString();
    const fallbackName = profile.display_name || profile.name || profile.id || 'Usuário';

    return {
        id: row.id,
        userId: row.user_id,
        missionId: row.mission_id,
        userName: fallbackName,
        userAvatar: profile.avatar_url || profile.avatar || 'https://i.pravatar.cc/150?u=mission-sub',
        missionTitle: mission.title || row.mission_title || 'Missão',
        submittedAt: new Date(createdAt).toLocaleString('pt-BR'),
        submittedAtISO: createdAt,
        proofUrl: row.proof_url || row.proof || '',
        status: row.status || 'pending',
    };
};

const fetchActiveMissions = async () => {
    const supabase = ensureClient();
    if (!supabase) return { data: [] as Mission[], error: null as any };

    // Try using "active" first (new schema), then fallback to "is_active"
    const attemptActive = await supabase.from('missions').select('*').eq('active', true);
    if (attemptActive.error && attemptActive.error.code === '42703') {
        const fallback = await supabase.from('missions').select('*').eq('is_active', true);
        return fallback;
    }
    if (attemptActive.error && attemptActive.error.message?.toLowerCase().includes('column') && attemptActive.error.message?.includes('active')) {
        const fallback = await supabase.from('missions').select('*').eq('is_active', true);
        return fallback;
    }
    if (attemptActive.error) {
        return attemptActive;
    }
    return attemptActive;
};

export const fetchMissionsSupabase = async (userId: string) => {
    const supabase = ensureClient();
    if (!supabase) return { missions: [] as Mission[], submissions: [] as MissionSubmission[], hasReachedDailyLimit: false };

    try {
        const [missionsRes, submissionsRes, quotaRes] = await Promise.all([
            fetchActiveMissions(),
            supabase
                .from('mission_submissions')
                .select(`
                    ${MISSION_SUBMISSION_LIGHT_SELECT},
                    missions(title),
                    profiles(display_name, name, avatar_url, id, artistic_name)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50),
            supabase.rpc('get_my_mission_quota'),
        ]);

        const missions = missionsRes.error || !missionsRes.data ? [] : missionsRes.data.map(mapMissionToApp);
        const submissions = submissionsRes.error || !submissionsRes.data ? [] : submissionsRes.data.map(mapSubmission);

        // Fonte da verdade (backend): remaining === 0 => atingiu limite
        let hasReachedDailyLimit = false;
        const quota = (quotaRes as any)?.data;
        if (quota && typeof quota === 'object') {
            hasReachedDailyLimit = quota.remaining === 0;
        }

        return { missions, submissions, hasReachedDailyLimit };
    } catch (err: any) {
        console.error('[SupabaseMissions] fetchMissionsSupabase failed', err);
        return { missions: [] as Mission[], submissions: [] as MissionSubmission[], hasReachedDailyLimit: false };
    }
};

export const submitMissionSupabase = async (_userId: string, missionId: string, proof: string) => {
    const supabase = ensureClient();
    if (!supabase) {
        return {
            success: false as const,
            newSubmission: undefined,
            updatedUser: undefined,
            message: 'Supabase client not available',
        };
    }

    try {
        // ✅ Use the idempotent RPC: submit_mission(uuid, text, jsonb) returns uuid
        const { data: submissionId, error } = await supabase.rpc('submit_mission', {
            p_mission_id: missionId,
            p_proof_url: proof,
            p_meta: {},
        });

        if (error) {
            console.error('[SupabaseMissions] submitMissionSupabase rpc error', error);
            return {
                success: false as const,
                newSubmission: undefined,
                updatedUser: undefined,
                message: error.message || 'Falha ao enviar missão',
            };
        }

        // If RPC returned an existing submission id (idempotent), fetch it to map correctly
        if (!submissionId) {
            return {
                success: true as const,
                newSubmission: undefined,
                updatedUser: undefined,
                message: 'Missão enviada com sucesso.',
            };
        }

        const { data: row, error: fetchErr } = await supabase
            .from('mission_submissions')
            .select(`
                ${MISSION_SUBMISSION_LIGHT_SELECT},
                missions(title),
                profiles(display_name, name, avatar_url, id)
            `)
            .eq('id', submissionId)
            .limit(1)
            .single();

        if (fetchErr) {
            console.error('[SupabaseMissions] submitMissionSupabase fetch error', fetchErr);
            return {
                success: true as const,
                newSubmission: undefined,
                updatedUser: undefined,
                message: 'Missão enviada com sucesso.',
            };
        }

        const mappedSubmission = row ? mapSubmission({ ...row, proof_url: row?.proof_url ?? proof }) : undefined;

        return {
            success: true as const,
            newSubmission: mappedSubmission,
            updatedUser: undefined,
            message: 'Missão enviada com sucesso.',
        };
    } catch (err: any) {
        console.error('[SupabaseMissions] submitMissionSupabase failed', err);
        return {
            success: false as const,
            newSubmission: undefined,
            updatedUser: undefined,
            message: err?.message || 'Falha ao enviar missão',
        };
    }
};
