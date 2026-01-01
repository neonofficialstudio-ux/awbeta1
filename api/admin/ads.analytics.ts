
import { getRepository } from "../database/repository.factory";

const repo = getRepository();

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export const AdsAnalytics = {
   getGlobalStats() {
      const ads = repo.select("advertisements") || [];
      
      const totalViews = sum(ads.map((a: any) => a.views || 0));
      const totalClicks = sum(ads.map((a: any) => a.clicks || 0));
      
      return {
         totalAds: ads.length,
         totalViews,
         totalClicks,
         averageCTR: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
         
         ranking: ads
            .map((a: any) => ({
               id: a.id,
               title: a.title,
               views: a.views || 0,
               clicks: a.clicks || 0,
               ctr: (a.views || 0) > 0 ? ((a.clicks || 0) / (a.views || 0)) * 100 : 0,
            }))
            .sort((a: any, b: any) => b.ctr - a.ctr)
      };
   },

   // New method for Phase 12.2 - Time Series Data
   getTimeSeriesStats() {
      const events = repo.select("telemetryPremiumEvents") || [];
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
      }).reverse();

      const viewsByDay: Record<string, number> = {};
      const clicksByDay: Record<string, number> = {};

      last7Days.forEach(day => {
          viewsByDay[day] = 0;
          clicksByDay[day] = 0;
      });

      events.forEach((e: any) => {
          if (e.eventType === 'ad_view' || e.eventType === 'ad_click') {
              const day = new Date(e.timestampISO).toISOString().split('T')[0];
              if (viewsByDay[day] !== undefined) {
                  if (e.eventType === 'ad_view') viewsByDay[day]++;
                  if (e.eventType === 'ad_click') clicksByDay[day]++;
              }
          }
      });

      return {
          dates: last7Days,
          views: Object.values(viewsByDay),
          clicks: Object.values(clicksByDay)
      };
   },

   // New method for Phase 12.2 - Ad Specific History
   getAdHistory(adId: string) {
       const events = repo.select("telemetryPremiumEvents") || [];
       return events
           .filter((e: any) => (e.eventType === 'ad_view' || e.eventType === 'ad_click') && e.payload?.adId === adId)
           .sort((a: any, b: any) => b.timestamp - a.timestamp)
           .slice(0, 100); // Last 100 events
   }
};
