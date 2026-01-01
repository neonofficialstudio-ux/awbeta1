
import { getRepository } from "../../api/database/repository.factory";
import { EventPassEngine } from "../events/eventPass.engine";
import type { User, EventMission } from "../../types";
import { safeString } from "../../api/helpers";

const repo = getRepository();

export const MissionEventEngine = {
    /**
     * Returns available missions for a specific event based on user's pass.
     */
    getAvailableEventMissions: (user: User, eventId: string): EventMission[] => {
        // 1. Verify Access
        const passType = EventPassEngine.getUserPassType(user, eventId);
        if (!passType) return [];

        // 2. Fetch Missions from MockDB
        // In a real scenario, this queries the missions table filtered by eventId
        // We assume 'eventMissions' exist in the repo/mockData either as separate table or inside missions
        // Using db.eventMissionsData via repo for now
        const allEventMissions = repo.select("missions").filter((m: any) => m.eventId === eventId || (m.type && safeString(m.type).startsWith('event')));

        // 3. Filter by Pass Tier
        return allEventMissions.filter((m: any) => {
            // If mission is tier 'vip', user must have 'vip' pass
            if (m.tier === 'vip' || m.type === 'event-vip') {
                return passType === 'vip';
            }
            // Normal missions available to everyone with a pass (normal OR vip)
            return true;
        });
    },

    /**
     * Calculates event points based on pass multipliers.
     */
    calculateEventPoints: (mission: EventMission, passType: 'normal' | 'vip') => {
        let points = mission.points || 0;
        let xp = mission.xp || 0;

        if (passType === 'vip') {
            points = Math.floor(points * 1.5); // VIP Bonus
            xp = Math.floor(xp * 1.2); // Slight XP bonus for VIPs in events
        }

        return { points, xp };
    }
};
