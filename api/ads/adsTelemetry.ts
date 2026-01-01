
import { getRepository } from "../database/repository.factory";
import { TelemetryPremium } from "../telemetry/telemetryPremium";

const repo = getRepository();

export const AdsTelemetry = {
   trackView(adId: string, userId: string) {
      // Log event to premium telemetry
      TelemetryPremium.track("ad_view", userId, { adId });
      
      // Update ad counter (Extension)
      const ads = repo.select("advertisements") || [];
      const ad = ads.find((a: any) => a.id === adId);
      
      if (ad) {
         const updatedAd = { ...ad, views: (ad.views || 0) + 1 };
         repo.update("advertisements", (a: any) => a.id === adId, (a: any) => updatedAd);
      }
   },

   trackClick(adId: string, userId: string) {
      TelemetryPremium.track("ad_click", userId, { adId });
      
      const ads = repo.select("advertisements") || [];
      const ad = ads.find((a: any) => a.id === adId);
      
      if (ad) {
         const updatedAd = { ...ad, clicks: (ad.clicks || 0) + 1 };
         repo.update("advertisements", (a: any) => a.id === adId, (a: any) => updatedAd);
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
   }
};
