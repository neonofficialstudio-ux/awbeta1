// src/api/supabase/artistOfDay.ts
import { config } from '../../core/config';
import { getSupabase } from './client';

export type ArtistOfDayPayload = {
  success: boolean;
  has_artist: boolean;
  day_utc?: string;
  artist?: {
    id: string;
    display_name?: string;
    artistic_name?: string;
    avatar_url?: string | null;
    level?: number | null;
    spotify_url?: string | null;
    youtube_url?: string | null;
    instagram_url?: string | null;
  };
  clicked?: Record<string, boolean>;
};

export type ArtistOfDayMetricsPayload = {
  success: boolean;
  has_artist: boolean;
  day_utc?: string;
  artist_id?: string;
  total_clicks?: number;
  unique_viewers?: number;
  by_platform?: {
    spotify?: { clicks: number; unique: number };
    youtube?: { clicks: number; unique: number };
    instagram?: { clicks: number; unique: number };
  };
};

type ScheduleRow = {
  day_utc: string;
  artist_id: string;
  set_by: string | null;
  set_at: string;
};

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('[Supabase] Client not initialized');
  return supabase;
}

export async function getArtistOfDay(): Promise<ArtistOfDayPayload> {
  if (config.backendProvider !== 'supabase') {
    throw new Error('getArtistOfDay only available in supabase mode');
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('get_artist_of_day');
  if (error) throw error;
  return (data || { success: true, has_artist: false }) as any;
}

export async function recordArtistOfDayClick(platform: 'spotify' | 'youtube' | 'instagram') {
  if (config.backendProvider !== 'supabase') {
    throw new Error('recordArtistOfDayClick only available in supabase mode');
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('record_artist_of_day_click', { p_platform: platform });
  if (error) throw error;
  return data as any;
}

export async function adminSetArtistOfDay(artistId: string) {
  if (config.backendProvider !== 'supabase') {
    throw new Error('adminSetArtistOfDay only available in supabase mode');
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('admin_set_artist_of_day', { p_artist_id: artistId });
  if (error) throw error;
  return data as any;
}

export async function adminClearArtistOfDay() {
  if (config.backendProvider !== 'supabase') {
    throw new Error('adminClearArtistOfDay only available in supabase mode');
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('admin_clear_artist_of_day');
  if (error) throw error;
  return data as any;
}

export async function adminGetArtistOfDayMetrics(dayUtc?: string) {
  if (config.backendProvider !== 'supabase') {
    throw new Error('adminGetArtistOfDayMetrics only available in supabase mode');
  }
  const supabase = requireSupabase();
  const args = dayUtc ? { p_day_utc: dayUtc } : {};
  const { data, error } = await supabase.rpc('admin_get_artist_of_day_metrics', args as any);
  if (error) throw error;
  return (data || { success: true, has_artist: false }) as ArtistOfDayMetricsPayload;
}

export async function adminListArtistOfDaySchedule(fromUtc: string, toUtc: string, limit = 60) {
  if (config.backendProvider !== 'supabase') {
    throw new Error('adminListArtistOfDaySchedule only available in supabase mode');
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('admin_list_artist_of_day_schedule', {
    p_from: fromUtc,
    p_to: toUtc,
    p_limit: limit,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as ScheduleRow[];
}

export async function adminScheduleArtistOfDay(dayUtc: string, artistId: string) {
  if (config.backendProvider !== 'supabase') {
    throw new Error('adminScheduleArtistOfDay only available in supabase mode');
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('admin_schedule_artist_of_day', {
    p_day_utc: dayUtc,
    p_artist_id: artistId,
  });
  if (error) throw error;
  return data as any;
}

export async function adminClearArtistOfDayScheduleDay(dayUtc: string) {
  if (config.backendProvider !== 'supabase') {
    throw new Error('adminClearArtistOfDayScheduleDay only available in supabase mode');
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('admin_clear_artist_of_day_schedule_day', {
    p_day_utc: dayUtc,
  });
  if (error) throw error;
  return data as any;
}
