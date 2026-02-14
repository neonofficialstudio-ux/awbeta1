import { config } from '../../core/config';
import { getSupabase } from '../supabase/client';

const makeRefId = (adId: string, eventType: 'view' | 'click', userId?: string) => {
  const bucket = Math.floor(Date.now() / 60000); // 1 min
  return `ad:${adId}:${eventType}:u:${userId ?? 'na'}:b:${bucket}`;
};

export const AdsTelemetry = {
  async trackView(adId: string, userId?: string) {
    // Em mock, mantém o comportamento antigo (se existir em outro lugar do arquivo original)
    if (config.backendProvider !== 'supabase') return;

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase client not initialized');

      const { error } = await supabase.rpc('record_ad_event', {
        p_ad_id: adId,
        p_event_type: 'view',
        p_ref_id: makeRefId(adId, 'view', userId),
      });

      if (error) throw error;
    } catch (e: any) {
      console.warn('[AdsTelemetry.trackView] record_ad_event failed', e?.message ?? e);
    }
  },

  async trackClick(adId: string, userId?: string) {
    if (config.backendProvider !== 'supabase') return;

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase client not initialized');

      const { error } = await supabase.rpc('record_ad_event', {
        p_ad_id: adId,
        p_event_type: 'click',
        p_ref_id: makeRefId(adId, 'click', userId),
      });

      if (error) throw error;
    } catch (e: any) {
      console.warn('[AdsTelemetry.trackClick] record_ad_event failed', e?.message ?? e);
    }
  },
};
