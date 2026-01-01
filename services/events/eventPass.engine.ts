
import { MissionDB, type MissionDefinition } from '../../api/missions/missions.db';
import { getRepository } from '../../api/database/repository.factory';
import type { User, EventPassType } from '../../types';

const repo = getRepository();

export const EventPassEngine = {
    /**
     * Checks if a user has access to a specific event.
     */
    userHasAccess: (user: User, eventId: string): boolean => {
        return user.joinedEvents.includes(eventId) || (user.eventSession?.eventId === eventId);
    },

    /**
     * Returns the active pass type for a user in an event.
     */
    getUserPassType: (user: User, eventId: string): EventPassType | null => {
        if (user.eventSession && user.eventSession.eventId === eventId) {
            return user.eventSession.passType;
        }
        // Fallback to legacy joinedEvents check (assumes 'normal' if no session object)
        if (user.joinedEvents.includes(eventId)) {
            return 'normal'; 
        }
        return null;
    },

    /**
     * Retrieves the list of missions available to the user based on their pass.
     */
    getUserEventMissionList: (user: User, eventId: string): MissionDefinition[] => {
        const passType = EventPassEngine.getUserPassType(user, eventId);
        
        // Get all missions for this event
        const allEventMissions = MissionDB.getByEvent(eventId);
        
        if (!passType) return []; // No access

        return allEventMissions.filter(m => {
            if (m.type === 'event-normal') return true; // Everyone with a pass sees normal
            if (m.type === 'event-vip') return passType === 'vip'; // Only VIP sees VIP
            return false;
        });
    },

    /**
     * Logic to assign/upgrade a pass.
     * Note: Payment processing should happen before calling this.
     */
    assignEventPass: (userId: string, eventId: string, passType: EventPassType) => {
        const user = repo.select("users").find((u:any) => u.id === userId);
        if (!user) throw new Error("User not found");

        const newSession = {
            eventId,
            passType,
            startedAt: new Date().toISOString(),
            progress: {},
            rewardsClaimed: [],
            boostersActive: [],
            score: 0
        };

        repo.update("users", (u:any) => u.id === userId, (u:any) => ({
            ...u,
            eventSession: newSession,
            joinedEvents: Array.from(new Set([...u.joinedEvents, eventId]))
        }));

        return newSession;
    }
};
