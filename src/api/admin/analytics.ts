import { StatisticsEngine } from "../../services/statistics.engine";
import { getOrSetCache } from "../../lib/sessionCache";
import { config } from "../../core/config";
import { getSupabase } from "../supabase/client";

const adminDashboardData = () =>
  getOrSetCache(
    'admin_dashboard',
    30_000,
    async () => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    const [users, missions, queue] = await Promise.all([
      supabase.from('profiles').select('id', { head: true, count: 'exact' }),
      supabase.from('missions').select('id', { head: true, count: 'exact' }).eq('active', true),
      supabase.from('production_requests').select('id', { head: true, count: 'exact' }).eq('status', 'queued'),
    ]);

    const errors = [users.error, missions.error, queue.error].filter(Boolean);
    if (errors.length) {
      throw new Error(errors.map((err: any) => err.message).join(' | '));
    }

      return {
        users_total: users.count ?? 0,
        missions_active: missions.count ?? 0,
        queue_size: queue.count ?? 0,
      };
    }
  );

export async function adminAnalyticsAPI() {
  if (config.backendProvider !== 'supabase') {
    return StatisticsEngine.global();
  }

  try {
    const dashboardData = await adminDashboardData();
    return {
      totals: {
        users: dashboardData.users_total,
        missions: dashboardData.missions_active,
        queue: dashboardData.queue_size,
      },
      activeUsers: dashboardData.users_total,
    };
  } catch (error) {
    console.error('[AdminAnalytics] Failed to load supabase dashboard stats', error);
    return StatisticsEngine.global();
  }
}
