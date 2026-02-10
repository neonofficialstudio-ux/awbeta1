import { getSupabase } from './client';
import { getOrSetCache } from '../../lib/sessionCache';
import type { User } from '../../types';

type ArtistOfDayResponse = {
  success: boolean;
  has_artist: boolean;
  day_utc?: string;
  artist?: {
    id: string;
    display_name?: string | null;
    artistic_name?: string | null;
    avatar_url?: string | null;
    level?: number | null;
    spotify_url?: string | null;
    youtube_url?: string | null;
    instagram_url?: string | null;
  };
  clicked?: Record<string, boolean>;
};

export type ArtistOfDayPayload = {
  dayUtc: string;
  artist: User & { links?: { spotify?: string; youtube?: string; instagram?: string } };
  clicked: Record<string, boolean>;
};

export type RecordClickResult = {
  success: boolean;
  has_artist: boolean;
  day_utc?: string;
  artist_id?: string;
  required?: number;
  done?: number;
  bonus_awarded?: boolean;
};

const ensureClient = () => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('[ArtistOfDaySupabase] Supabase client not initialized');
  return supabase;
};

function mapToUser(a: NonNullable<ArtistOfDayResponse['artist']>): ArtistOfDayPayload['artist'] {
  // Mantém compat com UI atual (User + links)
  const user: any = {
    id: a.id,
    name: a.display_name ?? '',
    displayName: a.display_name ?? '',
    artisticName: a.artistic_name ?? '',
    avatarUrl: a.avatar_url ?? '',
    level: Number(a.level ?? 0),
    spotifyUrl: a.spotify_url ?? '',
    youtubeUrl: a.youtube_url ?? '',
    instagramUrl: a.instagram_url ?? '',
    links: {
      spotify: a.spotify_url ?? '',
      youtube: a.youtube_url ?? '',
      instagram: a.instagram_url ?? '',
    },
  };
  return user as ArtistOfDayPayload['artist'];
}

export const ArtistOfDaySupabase = {
  async getArtistOfDay(opts?: { bypassCache?: boolean }): Promise<{ success: boolean; data?: ArtistOfDayPayload; error?: string }> {
    try {
      const supabase = ensureClient();

      const { data, error } = await getOrSetCache(
        `artist-of-day`,
        30_000,
        () => supabase.rpc('get_artist_of_day'),
        { bypass: opts?.bypassCache },
      );

      if (error) throw error;

      const payload = (data ?? null) as ArtistOfDayResponse | null;

      if (!payload?.success) {
        return { success: false, error: 'Resposta inválida do get_artist_of_day' };
      }

      if (!payload.has_artist || !payload.artist || !payload.day_utc) {
        return { success: true, data: undefined };
      }

      return {
        success: true,
        data: {
          dayUtc: String(payload.day_utc),
          artist: mapToUser(payload.artist),
          clicked: (payload.clicked ?? {}) as Record<string, boolean>,
        },
      };
    } catch (err: any) {
      console.error('[ArtistOfDaySupabase] getArtistOfDay failed', err);
      return { success: false, error: err?.message || 'Falha ao carregar Artista do Dia' };
    }
  },

  async recordClick(platform: 'spotify' | 'youtube' | 'instagram'): Promise<{ success: boolean; result?: RecordClickResult; error?: string }> {
    try {
      const supabase = ensureClient();
      const { data, error } = await supabase.rpc('record_artist_of_day_click', { p_platform: platform });
      if (error) throw error;

      return { success: true, result: data as RecordClickResult };
    } catch (err: any) {
      console.error('[ArtistOfDaySupabase] recordClick failed', err);
      return { success: false, error: err?.message || 'Falha ao registrar clique' };
    }
  },
};
