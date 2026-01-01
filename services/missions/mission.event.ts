
import { getRepository } from "../../api/database/repository.factory";
import { EventPassEngine } from "../events/eventPass.engine";
import type { User, EventMission } from "../../types";
import { SanitizeString } from "../../core/sanitizer.core";

const repo = getRepository();

export const MissionEventEngine = {
    /**
     * Returns available missions for a specific event based on user's pass.
     */
    getAvailableEventMissions: (user: User, eventId: string): EventMission[] => {
        const passType = EventPassEngine.getUserPassType(user, eventId);
        if (!passType) return [];

        // PATCH V7.1: Safe String Check for type
        const allEventMissions = repo.select("missions").filter((m: any) => {
            const safeType = SanitizeString(m.type);
            return m.eventId === eventId || safeType.startsWith('event');
        });

        return allEventMissions.filter((m: any) => {
            if (m.tier === 'vip' || m.type === 'event-vip') {
                return passType === 'vip';
            }
            return true;
        });
    },

    calculateEventPoints: (mission: EventMission, passType: 'normal' | 'vip') => {
        let points = mission.points || 0;
        let xp = mission.xp || 0;

        if (passType === 'vip') {
            points = Math.floor(points * 1.5);
            xp = Math.floor(xp * 1.2);
        }

        return { points, xp };
    }
};
