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

export const ProfileSupabase = {
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

        const { data, error } = await supabase.rpc('update_my_profile', {
            p_name: user.name,
            p_artistic_name: user.artisticName,
            p_avatar_url: user.avatarUrl,
            p_meta: buildProfileMeta(user),
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
            meta: buildProfileMeta(user),
        };

        const mapped = mapProfileToUser(hydratedProfile);

        return { success: true, updatedUser: SanityGuard.user(mapped) };
    }
};
