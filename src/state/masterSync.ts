
import * as api from '../api/index';
import { rankingAPI } from '../api/ranking/index';
import { QueueEngineV5 } from '../api/queue/queueEngineV5';
import { DashboardEngine } from '../services/dashboard/dashboard.engine';
import { fetchJackpotState } from '../api/games';

let lastSyncTime = 0;
const SYNC_THROTTLE_MS = 2000;

export const MasterSync = {
    /**
     * Performs a full state synchronization for the user.
     * Pulls data from all engines and dispatches updates to the central store.
     * Performance Pack V1.0: Throttled to prevent UI thrashing.
     */
    runGlobalSync: async (userId: string, dispatch: any, force: boolean = false) => {
        const now = Date.now();
        if (!force && (now - lastSyncTime < SYNC_THROTTLE_MS)) {
            // console.log("[MasterSync] Throttled. Skipping sync.");
            return;
        }
        lastSyncTime = now;

        try {
            console.log("[MasterSync] Starting Global Sync for", userId);

            // 1. Fetch Core Dashboard Data (Economy, User)
            const dashboardData = await DashboardEngine.getDashboardSnapshot(userId);
            
            if (dashboardData) {
                // Sync Economy using hybrid action supported by reducer
                dispatch({ 
                    type: 'ECONOMY_SYNC', 
                    payload: { 
                        coins: dashboardData.economy.coins, 
                        xp: dashboardData.economy.xp,
                        level: dashboardData.economy.level
                    } 
                });
                
                // Sync Event Session
                if (dashboardData.activeEvent) {
                    dispatch({ type: 'EVENT_SET_ACTIVE', payload: dashboardData.activeEvent });
                    dispatch({ type: 'EVENT_UPDATE_SESSION', payload: dashboardData.activeEvent.session });
                }
            }

            // 2. Fetch Missions
            const weeklyMissions = api.fetchWeeklyMissions(); // V4.2 API
            dispatch({ type: 'MISSIONS_SYNC_WEEKLY', payload: weeklyMissions });

            // 3. Fetch Ranking
            const ranking = rankingAPI.getGlobalRanking(userId);
            dispatch({ type: 'RANKING_SYNC_GLOBAL', payload: ranking });

            // 4. Fetch Queue
            const queue = QueueEngineV5.getQueueForUser(userId);
            dispatch({ type: 'QUEUE_SYNC', payload: queue });

            // 5. Fetch Jackpot (V9.1)
            await MasterSync.syncJackpot(dispatch);

            console.log("[MasterSync] Sync Complete");
        } catch (e) {
            console.error("[MasterSync] Sync Failed", e);
        }
    },

    /**
     * Specific sync for Economy updates (lighter)
     */
    syncEconomy: (userId: string, dispatch: any) => {
        const data = DashboardEngine.getFloatingIndicatorsData(userId);
        if (data) {
            dispatch({ 
                type: 'ECONOMY_SYNC', 
                payload: { coins: data.coins, xp: data.xp, level: data.level } 
            });
        }
    },

    /**
     * JACKPOT FIX V9.1: Syncs the jackpot state to the global store.
     */
    syncJackpot: async (dispatch: any) => {
        try {
            const data = await fetchJackpotState();
            if (data && (data as any).disabled) {
                dispatch({ type: 'SET_JACKPOT_DATA', payload: { disabled: true, message: (data as any).message || "Jackpot em breve" } });
                return;
            }
            dispatch({ type: 'SET_JACKPOT_DATA', payload: data });
        } catch (e) {
            console.error("[MasterSync] Jackpot Sync Failed", e);
        }
    }
};
