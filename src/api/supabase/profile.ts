import type { User } from '../../types';
import { config } from '../../core/config';
import { getSupabase } from './client';
import { mapProfileToUser } from './mappings';
import { SanityGuard } from '../../services/sanity.guard';
import { getOrSetCache, setToCache } from '../../lib/sessionCache';

const buildProfileMeta = (user: Partial<User>) => {
    const meta: Record<string, any> = {};
    const allowedMeta = {
        email: user.email,
        phone: user.phone,
        // 🚫 links sociais NÃO ficam mais no meta
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

const PROFILE_CACHE_TTL_MS = 15_000; // 15s (curto para manter UI atualizada)

export const ProfileSupabase = {
    async fetchMyProfile(
        userId?: string,
        opts?: { bypassCache?: boolean },
    ): Promise<{ success: boolean; user?: User; error?: string }> {
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

        try {
            return await getOrSetCache(
                `profile:${targetUserId}`,
                PROFILE_CACHE_TTL_MS,
                async () => {
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
                        throw new Error(error?.message || 'Perfil não encontrado');
                    }

                    const { data: subData, error: subError } = await supabase
                        .from('subscriptions')
                        .select('cancel_at_period_end,current_period_end,status,plan')
                        .eq('user_id', targetUserId)
                        .maybeSingle();

                    if (subError) console.warn('[ProfileSupabase] subscriptions lookup failed', subError.message);

                    const mapped = mapProfileToUser(data);

                    // ✅ Fonte única dos links
                    const { data: linksData, error: linksErr } = await supabase
                        .from('profile_social_links')
                        .select('platform,url')
                        .eq('user_id', targetUserId);

                    if (linksErr) {
                        console.warn('[ProfileSupabase] social links lookup failed', linksErr.message);
                    }

                    const links = (linksData || []).reduce((acc: any, row: any) => {
                        acc[row.platform] = row.url || '';
                        return acc;
                    }, {});
                    const hydrated = {
                        ...mapped,
                        spotifyUrl: links.spotify ?? '',
                        youtubeUrl: links.youtube ?? '',
                        instagramUrl: links.instagram ?? '',
                        tiktokUrl: links.tiktok ?? '',
                        cancellationPending: Boolean(subData?.cancel_at_period_end),
                        subscriptionExpiresAt: subData?.current_period_end ?? undefined,
                    } as User;
                    const user = SanityGuard.user(hydrated);

                    return { success: true, user };
                },
                { bypass: opts?.bypassCache },
            );
        } catch (err: any) {
            return { success: false, error: err?.message || 'Perfil não encontrado' };
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

        // ✅ RPC retorna { success, profile: {...} }
        const profilePayload = (payload as any)?.profile ?? payload;

        const hydratedProfile = profilePayload || {
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

        // ✅ Social links são tabela dedicada (fonte única)
        try {
            await supabase.rpc('upsert_my_social_links', {
                p_spotify_url: user.spotifyUrl ?? '',
                p_youtube_url: user.youtubeUrl ?? '',
                p_instagram_url: user.instagramUrl ?? '',
                p_tiktok_url: user.tiktokUrl ?? '',
            });
        } catch (e) {
            console.warn('[ProfileSupabase] upsert_my_social_links failed (non-blocking)', e);
        }

        const mapped = mapProfileToUser(hydratedProfile);

        // ✅ Como links agora são tabela separada, mantém os links que o user acabou de enviar
        const withLinks = {
            ...mapped,
            spotifyUrl: user.spotifyUrl,
            youtubeUrl: user.youtubeUrl,
            instagramUrl: user.instagramUrl,
            tiktokUrl: user.tiktokUrl,
        } as User;

        const updatedUser = SanityGuard.user(withLinks);

        setToCache(`profile:${authData.user.id}`, { success: true, user: updatedUser }, PROFILE_CACHE_TTL_MS);

        return { success: true, updatedUser };
    }
};
