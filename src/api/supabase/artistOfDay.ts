// src/api/supabase/artistOfDay.ts
import { getSupabase } from './client';
import { config } from '../../core/config';

export type ArtistOfDayPayload = {
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

export async function getArtistOfDay(): Promise<ArtistOfDayPayload> {
  if (config.backendProvider !== 'supabase') {
    return { success: false, has_artist: false };
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error('[ArtistOfDay] Supabase client not initialized');

  const { data, error } = await supabase.rpc('get_artist_of_day');
  if (error) throw error;

  // rpc retorna jsonb
  return (data as any) ?? { success: true, has_artist: false };
}

export async function recordArtistOfDayClick(platform: 'spotify' | 'youtube' | 'instagram') {
  if (config.backendProvider !== 'supabase') {
    return { success: false };
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error('[ArtistOfDay] Supabase client not initialized');

  const { data, error } = await supabase.rpc('record_artist_of_day_click', { p_platform: platform });
  if (error) throw error;

  return data as any;
}

export async function adminSetArtistOfDay(artistId: string) {
  if (config.backendProvider !== 'supabase') {
    return { success: false };
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error('[ArtistOfDay] Supabase client not initialized');

  const { data, error } = await supabase.rpc('admin_set_artist_of_day', { p_artist_id: artistId });
  if (error) throw error;

  return data as any;
}
