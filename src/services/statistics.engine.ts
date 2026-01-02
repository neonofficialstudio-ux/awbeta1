
import { getRepository } from "../api/database/repository.factory";

const repo = getRepository();

export const StatisticsEngine = {
  global() {
    const users = repo.select("users");
    const missions = repo.select("missions");
    const queue = repo.select("queue");

    // Standardized Logic: Count only actual users (role === 'user')
    // Excludes 'admin' to match EconomyConsole and avoid skewing metrics
    const realUsers = (users || []).filter((u: any) => u.role === 'user');

    return {
      totals: {
        users: realUsers.length,
        missions: missions?.length || 0,
        queue: queue?.length || 0,
      },

      missionsStatus: (missions || []).reduce((acc: any, m: any) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      }, {}),

      missionsByType: (missions || []).reduce((acc: any, m: any) => {
        // Handle cases where mission details are nested or flat depending on origin
        const type = m.mission?.type || m.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),

      // Active Users: Must be 'user' role AND have some activity (coins or xp > 0)
      activeUsers: realUsers.filter((u: any) => (u.coins || 0) > 0 || (u.xp || 0) > 0).length,
    };
  }
};
