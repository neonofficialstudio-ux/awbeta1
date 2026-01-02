
import { getRepository } from "../database/repository.factory";
import { RankingLogger } from "./rankingLogger";

const repo = getRepository();

export const SeasonEngine = {
    getCurrentSeasonName: (): string => {
        const now = new Date();
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        return `${months[now.getMonth()]} ${now.getFullYear()}`;
    },

    getSeasonEndDate: (): Date => {
        const now = new Date();
        // Last day of current month
        return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    },

    getDaysRemaining: (): number => {
        const now = new Date();
        const end = SeasonEngine.getSeasonEndDate();
        const diff = end.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    },

    /**
     * Checks if a reset is needed.
     * Note: In a real backend, this would be a cron job. 
     * Here we check on access and return status.
     */
    checkSeasonStatus: () => {
        // Mock logic: We assume the season is always "Active" for the prototype.
        // In a real scenario, we would check a stored "lastResetDate" in the DB.
        return {
            season: SeasonEngine.getCurrentSeasonName(),
            daysLeft: SeasonEngine.getDaysRemaining(),
            isActive: true
        };
    },

    /**
     * Archives current season stats and resets monthly counters.
     */
    resetSeason: () => {
        const users = repo.select("users");
        const seasonName = SeasonEngine.getCurrentSeasonName();
        const history: any[] = [];

        // 1. Archive
        users.forEach((u: any) => {
            if (u.monthlyMissionsCompleted > 0) {
                history.push({
                    userId: u.id,
                    userName: u.name,
                    missions: u.monthlyMissionsCompleted,
                    xpSnapshot: u.xp,
                    season: seasonName
                });
            }
            
            // 2. Reset (In-memory update for mockDB)
            // We use repo update pattern
            repo.update("users", (user: any) => user.id === u.id, (user: any) => ({
                ...user,
                monthlyMissionsCompleted: 0,
                weeklyProgress: 0
            }));
        });

        // 3. Save History (MockDB)
        repo.insert("season_history", { date: new Date().toISOString(), name: seasonName, results: history });
        
        RankingLogger.logSeasonReset(seasonName, users.length);

        return { success: true, archivedCount: history.length };
    }
};
