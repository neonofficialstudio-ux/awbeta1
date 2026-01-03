import { supabaseClient } from './client';
import { config } from '../../core/config';
import type { Mission, MissionSubmission } from '../../types';
import { mapMissionToApp } from './mappings';
import { getDailyMissionLimit } from '../economy/economy';
import { normalizePlan } from '../subscriptions/normalizePlan';

const ensureClient = () => {
    if (config.backendProvider !== 'supabase') return null;
    if (!supabaseClient) {
        console.error('[SupabaseMissions] Supabase client not initialized');
        return null;
    }
    return supabaseClient;
};

const mapSubmission = (row: any): MissionSubmission => {
    const mission = row.missions || row.mission || {};
    const profile = row.profiles || row.profile || {};
    const createdAt = row.created_at || row.submitted_at || new Date().toISOString();

    return {
        id: row.id,
        userId: row.user_id,
        missionId: row.mission_id,
        userName: profile.name || profile.email || 'Usuário',
        userAvatar: profile.avatar_url || profile.avatar || '',
        missionTitle: mission.title || row.mission_title || 'Missão',
        submittedAt: new Date(createdAt).toLocaleString('pt-BR'),
        submittedAtISO: createdAt,
        proofUrl: row.proof_url || row.proof || '',
        status: row.status || 'pending',
    };
};

export const fetchMissionsSupabase = async (userId: string) => {
    const supabase = ensureClient();
    if (!supabase) return { missions: [] as Mission[], submissions: [] as MissionSubmission[], hasReachedDailyLimit: false };

    try {
        const [missionsRes, submissionsRes, profileRes] = await Promise.all([
            supabase.from('missions').select('*').eq('is_active', true),
            supabase
                .from('mission_submissions')
                .select('*, missions(title), profiles(name, avatar_url, email)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50),
            supabase.from('profiles').select('plan').eq('id', userId).limit(1).single(),
        ]);

        const missions = missionsRes.error || !missionsRes.data ? [] : missionsRes.data.map(mapMissionToApp);
        const submissions = submissionsRes.error || !submissionsRes.data ? [] : submissionsRes.data.map(mapSubmission);

        let hasReachedDailyLimit = false;
        const plan = normalizePlan(profileRes?.data?.plan);
        const dailyLimit = getDailyMissionLimit(plan);
        if (dailyLimit !== null && submissions.length) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const todayCount = submissions.filter(sub => new Date(sub.submittedAtISO) >= startOfDay).length;
            hasReachedDailyLimit = todayCount >= dailyLimit;
        }

        return { missions, submissions, hasReachedDailyLimit };
    } catch (err: any) {
        console.error('[SupabaseMissions] fetchMissionsSupabase failed', err);
        return { missions: [] as Mission[], submissions: [] as MissionSubmission[], hasReachedDailyLimit: false };
    }
};

export const submitMissionSupabase = async (userId: string, missionId: string, proof: string) => {
    const supabase = ensureClient();
    if (!supabase) return { success: false as const, newSubmission: undefined, updatedUser: undefined, message: 'Supabase client not available' };

    try {
        const { data, error } = await supabase
            .from('mission_submissions')
            .insert({ user_id: userId, mission_id: missionId, proof_url: proof, status: 'pending' })
            .select('*, missions(title), profiles(name, avatar_url, email)')
            .single();

        if (error) {
            console.error('[SupabaseMissions] submitMissionSupabase error', error);
            return { success: false as const, newSubmission: undefined, updatedUser: undefined, message: error.message || 'Falha ao enviar missão' };
        }

        return {
            success: true as const,
            newSubmission: mapSubmission(data),
            updatedUser: undefined,
            message: 'Missão enviada com sucesso.',
        };
    } catch (err: any) {
        console.error('[SupabaseMissions] submitMissionSupabase failed', err);
        return { success: false as const, newSubmission: undefined, updatedUser: undefined, message: err?.message || 'Falha ao enviar missão' };
    }
};
