
import { RankingEngine } from "../services/ranking/ranking.engine";
import { RankingDB } from "../api/ranking/ranking.db";
import { getRepository } from "../api/database/repository.factory";

const repo = getRepository();

export const RankingTest = {
    simulateMassiveRanking: async (userCount = 50) => {
        console.group(`Ranking Simulation: ${userCount} Users`);
        const start = performance.now();

        // 1. Clean Slate
        // Note: Be careful running this on production mockDB data
        const baseTime = Date.now();

        // 2. Generate Users
        for (let i = 0; i < userCount; i++) {
            repo.insert("users", {
                id: `sim-rank-${baseTime}-${i}`,
                name: `Ranker ${i}`,
                role: 'user',
                xp: Math.floor(Math.random() * 50000),
                coins: Math.floor(Math.random() * 10000),
                monthlyMissionsCompleted: Math.floor(Math.random() * 20),
                totalMissionsCompleted: Math.floor(Math.random() * 100),
                plan: 'Free Flow'
            });
        }

        // 3. Fetch Global Ranking
        const globalRank = RankingEngine.getGlobalRanking();
        console.log(`Global Ranking generated in ${(performance.now() - start).toFixed(2)}ms`);
        
        // Validate Sort
        const topUser = globalRank[0];
        const secondUser = globalRank[1];
        
        if (topUser.level < secondUser.level && topUser.monthlyMissionsCompleted < secondUser.monthlyMissionsCompleted) {
            console.warn("Possible sorting issue: Top user stats lower than second user (ignoring tied XP cases).", { topUser, secondUser });
        } else {
            console.log("Sorting logic appears consistent.");
        }

        // 4. Check Persistence
        const cache = RankingDB.load();
        if (cache.global.length >= userCount) {
             console.log("PASS: Ranking persisted to LocalStorage.");
        } else {
             console.error("FAIL: Persistence missing.");
        }

        // Cleanup
        repo.delete("users", (u: any) => u.id.startsWith(`sim-rank-${baseTime}`));
        console.groupEnd();
    },
    
    simulateEconomyRankUpdate: () => {
        console.group("Ranking Simulation: Economy Update");
        const uid = `sim-eco-${Date.now()}`;
        repo.insert("users", { id: uid, coins: 100, xp: 100, role: 'user', name: 'Economy Tester' });
        
        const rankBefore = RankingEngine.getEconomyRanking(uid).find(u => u.isCurrentUser)?.rank;
        console.log(`Rank Before: #${rankBefore}`);

        // Boost Coins
        repo.update("users", (u: any) => u.id === uid, (u: any) => ({ ...u, coins: 9999999 }));
        
        // Re-fetch
        const rankAfter = RankingEngine.getEconomyRanking(uid).find(u => u.isCurrentUser)?.rank;
        console.log(`Rank After: #${rankAfter}`);
        
        if (rankAfter === 1) console.log("PASS: User moved to #1");
        else console.error("FAIL: Ranking did not update immediately");

        repo.delete("users", (u: any) => u.id === uid);
        console.groupEnd();
    }
};
