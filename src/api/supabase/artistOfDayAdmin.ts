import { config } from "../../core/config";
import { getSupabase } from "./client";

const requireSupabaseClient = () => {
  const client = getSupabase();
  if (!client) throw new Error("[Supabase] Client not initialized");
  return client;
};

export async function adminClearArtistOfDay() {
  if (config.backendProvider !== "supabase") {
    throw new Error("adminClearArtistOfDay only available in supabase mode");
  }

  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("admin_clear_artist_of_day");
  if (error) throw error;
  return data as any;
}
