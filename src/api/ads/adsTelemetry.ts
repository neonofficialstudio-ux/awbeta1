import { config } from "../../core/config";
import { getRepository } from "../database/repository.factory";
import { getSupabase } from "../supabase/client";
import { TelemetryPremium } from "../telemetry/telemetryPremium";

const repo = getRepository();

function makeRefId(adId: string, eventType: "view" | "click", userId?: string) {
  const bucket = Math.floor(Date.now() / 60000);
  return `ad:${adId}:${eventType}:u:${userId ?? "na"}:b:${bucket}`;
}

async function recordEvent(adId: string, eventType: "view" | "click", userId?: string) {
  const client = getSupabase();
  if (!client) {
    console.warn(`[AdsTelemetry.${eventType}] Supabase client unavailable`);
    return;
  }

  const refId = makeRefId(adId, eventType, userId);
  const { error } = await client.rpc("record_ad_event", {
    p_ad_id: adId,
    p_event_type: eventType,
    p_ref_id: refId,
  });

  if (error) {
    console.warn(`[AdsTelemetry.${eventType}] RPC error:`, error.message);
  }
}

export const AdsTelemetry = {
  async trackView(adId: string, userId?: string) {
    if (config.backendProvider === "supabase") {
      await recordEvent(adId, "view", userId);
      return;
    }

    if (userId) {
      TelemetryPremium.track("ad_view", userId, { adId });
    }

    const ads = repo.select("advertisements") || [];
    const ad = ads.find((a: any) => a.id === adId);

    if (ad) {
      const updatedAd = { ...ad, views: (ad.views || 0) + 1 };
      repo.update("advertisements", (a: any) => a.id === adId, () => updatedAd);
    }
  },

  async trackClick(adId: string, userId?: string) {
    if (config.backendProvider === "supabase") {
      await recordEvent(adId, "click", userId);
      return;
    }

    if (userId) {
      TelemetryPremium.track("ad_click", userId, { adId });
    }

    const ads = repo.select("advertisements") || [];
    const ad = ads.find((a: any) => a.id === adId);

    if (ad) {
      const updatedAd = { ...ad, clicks: (ad.clicks || 0) + 1 };
      repo.update("advertisements", (a: any) => a.id === adId, () => updatedAd);
    }
  },

  getAdPerformance(adId: string) {
    const ads = repo.select("advertisements") || [];
    const ad = ads.find((a: any) => a.id === adId);

    if (!ad) return null;

    return {
      views: ad.views || 0,
      clicks: ad.clicks || 0,
      ctr: ad.views ? ((ad.clicks || 0) / ad.views) * 100 : 0,
    };
  },
};
