import { getSupabase } from '../supabase/client';

export type MissionQuota = {
    plan: string;
    daily_mission_limit: number | null;
    used_today: number;
    remaining: number | null;
};

/**
 * Fonte da verdade: Supabase RPC.
 * Espera existir: public.get_my_mission_quota() RETURNS jsonb
 */
export async function getMyMissionQuota(): Promise<MissionQuota> {
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('get_my_mission_quota');
    if (error) throw error;

    // fallback hard-safe
    const q = (data ?? {}) as any;

    return {
        plan: String(q.plan ?? 'Free Flow'),
        daily_mission_limit: q.daily_mission_limit === null || q.daily_mission_limit === undefined
            ? null
            : Number(q.daily_mission_limit),
        used_today: Number(q.used_today ?? 0),
        remaining: q.remaining === null || q.remaining === undefined ? null : Number(q.remaining),
    };
}
