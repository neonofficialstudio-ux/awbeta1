
import { getRepository } from "../database/repository.factory";
import { createNotification, updateUserInDb } from "../helpers";
import type { EventSession, EventPassType, User, Event } from "../../types";

const repo = getRepository();
const SESSION_STORAGE_KEY = 'aw_event_session_v5';

export const EventSessionEngine = {
    getActiveEvent: (): Event | undefined => {
        // Returns the current active event
        const events = repo.select("events") as Event[];
        return events.find(e => e.status === 'current');
    },

    startEventSession: (userId: string, eventId: string, passType: EventPassType): EventSession => {
        const now = new Date().toISOString();
        const session: EventSession = {
            eventId,
            passType,
            startedAt: now,
            progress: {},
            rewardsClaimed: [],
            boostersActive: [],
            score: 0
        };
        
        // Persist to User object via repo update
        repo.update("users", (u: any) => u.id === userId, (u: any) => ({ ...u, eventSession: session }));
        
        // Local persistence
        try {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        } catch(e) { console.error("Failed to save local session", e); }

        return session;
    },

    loadEventSession: (userId: string): EventSession | null => {
        // Try loading from user DB first (truth source)
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (user && user.eventSession) {
            return user.eventSession;
        }
        return null;
    },

    clearEventSession: (userId: string) => {
         repo.update("users", (u: any) => u.id === userId, (u: any) => ({ ...u, eventSession: null }));
         localStorage.removeItem(SESSION_STORAGE_KEY);
    },
    
    updateProgress: (userId: string, missionId: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (user && user.eventSession) {
            const updatedSession = {
                ...user.eventSession,
                progress: { ...user.eventSession.progress, [missionId]: true }
            };
             repo.update("users", (u: any) => u.id === userId, (u: any) => ({ ...u, eventSession: updatedSession }));
             return updatedSession;
        }
        return null;
    }
};
