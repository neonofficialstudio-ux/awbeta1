import type { User } from '../../types';
import { config } from '../../core/config';
import { getSupabase } from './client';
import { mapProfileToUser } from './mappings';
import { SanityGuard } from '../../services/sanity.guard';

const buildProfileMeta = (user: Partial<User>) => {
    const meta: Record<string, any> = {};
    const allowedMeta = {
        email: user.email,
        phone: user.phone,
        spotifyUrl: user.spotifyUrl,
        youtubeUrl: user.youtubeUrl,
        instagramUrl: user.instagramUrl,
        tiktokUrl: user.tiktokUrl,
    };

    Object.entries(allowedMeta).forEach(([key, value]) => {
        if (value !== undefined && value !== null && `${value}`.trim() !== '') {
            meta[key] = value;
        }
    });

    return meta;
};

const sanitizeMeta = (meta: any) => {
    if (!meta || typeof meta !== 'object') return meta;
    const clone = { ...meta };
    delete clone.coins;
    delete clone.xp;
    delete clone.level;
    delete clone.plan;
    return clone;
};

// ---------------------------------------------------------------------------
// ✅ Cache leve para evitar múltiplos SELECTs do mesmo perfil em sequência
// (reduz egress e reduz spam de rede em re-render)
// ---------------------------------------------------------------------------
const PROFILE_CACHE_TTL_MS = 15_000; // 15s (curto para manter UI atualizada)
let profileCache: {
    userId: string;
    fetchedAt: number;
    user?: User;
    inFlight?: Promise<{ success: boolean; user?: User; error?: string }>;
} = {
    userId: '',
    fetchedAt: 0,
};

export const ProfileSupabase = {
    async fetchMyProfile(userId?: string): Promise<{ success: boolean; user?: User; error?: string }> {
        if (config.backendProvider !== 'supabase') {
            return { success: false, error: 'Supabase provider is not enabled' };
        }

        const supabase = getSupabase();
        if (!supabase) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        let targetUserId = userId;
        if (!targetUserId) {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError || !authData?.user) {
                return { success: false, error: 'Usuário não autenticado' };
            }
            targetUserId = authData.user.id;
        }

        const now = Date.now();
        if (profileCache.user && profileCache.userId === targetUserId && now - profileCache.fetchedAt < PROFILE_CACHE_TTL_MS) {
            return { success: true, user: profileCache.user };
        }

        if (profileCache.inFlight && profileCache.userId === targetUserId) {
            return profileCache.inFlight;
        }

        const promise = (async () => {
            const selectFields = [
                'id',
                'display_name',
                'artistic_name',
                'name',
                'avatar_url',
                'coins',
                'xp',
                'level',
                'plan',
                'monthly_missions_completed',
                'monthly_xp',
                'monthly_level',
                'meta',
                'created_at',
                'updated_at',
            ].join(',');

            const { data, error } = await supabase
                .from('profiles')
                .select(selectFields)
                .eq('id', targetUserId)
                .single();

            if (error || !data) {
                return { success: false, error: error?.message || 'Perfil não encontrado' };
            }

            const mapped = mapProfileToUser(data);
            const user = SanityGuard.user(mapped);

            profileCache = {
                userId: targetUserId!,
                fetchedAt: Date.now(),
                user,
            };

            return { success: true, user };
        })();

        profileCache = {
            ...profileCache,
            userId: targetUserId,
            inFlight: promise,
        };

        try {
            return await promise;
        } finally {
            if (profileCache.userId === targetUserId) {
                profileCache.inFlight = undefined;
            }
        }
    },
    async updateMyProfile(user: User): Promise<{ success: boolean; updatedUser?: User; error?: string }> {
        if (config.backendProvider !== 'supabase') {
            return { success: false, error: 'Supabase provider is not enabled' };
        }

        const supabase = getSupabase();
        if (!supabase) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        const profileMeta = buildProfileMeta(user);
        const sanitizedMeta = sanitizeMeta(profileMeta);
        const { data, error } = await supabase.rpc('update_my_profile', {
            p_name: user.name,
            p_artistic_name: user.artisticName,
            p_avatar_url: user.avatarUrl,
            p_meta: sanitizedMeta,
        });

        if (error) {
            console.error('[ProfileSupabase] update_my_profile failed', error);
            return { success: false, error: error.message || 'Falha ao atualizar perfil' };
        }

        const payload = Array.isArray(data) ? data[0] : data;
        const hydratedProfile = payload || {
            id: user.id,
            name: user.name,
            artistic_name: user.artisticName,
            email: user.email,
            avatar_url: user.avatarUrl,
            plan: user.plan,
            coins: user.coins,
            xp: user.xp,
            level: user.level,
            check_in_streak: user.weeklyCheckInStreak,
            last_check_in: user.lastCheckIn,
            joined_at: user.joinedISO,
            meta: sanitizedMeta,
        };

        const mapped = mapProfileToUser(hydratedProfile);
        const updatedUser = SanityGuard.user(mapped);

        if (profileCache.userId === updatedUser.id) {
            profileCache = {
                userId: updatedUser.id,
                fetchedAt: Date.now(),
                user: updatedUser,
            };
        }

        return { success: true, updatedUser };
    }
};
