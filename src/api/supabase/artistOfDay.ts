// src/api/supabase/artistOfDay.ts
import { config } from "../../core/config";
import { getSupabase } from "./client";

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
  if (!supabase) throw new Error("[Supabase] Client not initialized");
  return supabase;
}

export async function getArtistOfDay(): Promise<ArtistOfDayPayload> {
  if (config.backendProvider !== "supabase") {
    throw new Error("getArtistOfDay only available in supabase mode");
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("get_artist_of_day");
  if (error) throw error;
  return (data || { success: true, has_artist: false }) as any;
}

export async function recordArtistOfDayClick(platform: "spotify" | "youtube" | "instagram") {
  if (config.backendProvider !== "supabase") {
    throw new Error("recordArtistOfDayClick only available in supabase mode");
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("record_artist_of_day_click", { p_platform: platform });
  if (error) throw error;
  return data as any;
}

export async function upsertMySocialLinks(params: {
  spotifyUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
}) {
  if (config.backendProvider !== "supabase") {
    throw new Error("upsertMySocialLinks only available in supabase mode");
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("upsert_my_social_links", {
    p_spotify_url: params.spotifyUrl ?? null,
    p_youtube_url: params.youtubeUrl ?? null,
    p_instagram_url: params.instagramUrl ?? null,
    p_tiktok_url: params.tiktokUrl ?? null,
  });
  if (error) throw error;
  return data;
}

export async function adminSetArtistOfDay(artistId: string) {
  if (config.backendProvider !== "supabase") {
    throw new Error("adminSetArtistOfDay only available in supabase mode");
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("admin_set_artist_of_day", { p_artist_id: artistId });
  if (error) throw error;
  return data as any;
}

export async function adminClearArtistOfDay() {
  if (config.backendProvider !== "supabase") {
    throw new Error("adminClearArtistOfDay only available in supabase mode");
  }
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("admin_clear_artist_of_day");
  if (error) throw error;
  return data as any;
}

export async function adminGetArtistOfDayMetrics(dayUtc?: string) {
  return getArtistOfDayMetrics(dayUtc);
}

export async function adminListArtistOfDaySchedule(fromUtc?: string, toUtc?: string, limit = 14) {
  void fromUtc;
  void toUtc;
  const rows = await adminListArtistOfDayScheduleV2(limit);
  return rows as ScheduleRow[];
}

export async function adminScheduleArtistOfDay(dayUtc: string, artistId: string) {
  return adminScheduleArtistOfDayV2(dayUtc, artistId);
}

export async function adminClearArtistOfDayScheduleDay(dayUtc: string) {
  return adminUnscheduleArtistOfDay(dayUtc);
}

export async function getArtistOfDayMetrics(dayUtc?: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase.rpc('get_artist_of_day_metrics', {
    p_day_utc: dayUtc ?? null,
  });

  if (error) throw new Error(error.message || 'Falha ao carregar métricas');
  return data;
}

async function adminScheduleArtistOfDayV2(dayUtc: string, artistId: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase.rpc('admin_schedule_artist_of_day', {
    p_day_utc: dayUtc,
    p_artist_id: artistId,
  });

  if (error) throw new Error(error.message || 'Falha ao agendar Artista do Dia');
  return data;
}

export async function adminUnscheduleArtistOfDay(dayUtc: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase.rpc('admin_unschedule_artist_of_day', {
    p_day_utc: dayUtc,
  });

  if (error) throw new Error(error.message || 'Falha ao remover agendamento');
  return data;
}

export async function adminListArtistOfDayScheduleV2(limit = 14) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase.rpc('admin_list_artist_of_day_schedule', {
    p_limit: limit,
  });

  if (error) throw new Error(error.message || 'Falha ao listar agenda');
  return Array.isArray(data) ? data : [];
}
