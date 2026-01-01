
// api/events/liveArenaEngine.ts
import { getRepository } from "../database/repository.factory";
import type { ArenaStatus } from "../../types/event";

const repo = getRepository();
const DEFAULT_CAPACITY = 1000;

export const LiveArenaEngine = {
    /**
     * Calculates the current capacity status of a specific event.
     * Adds random variance for "live" feeling.
     */
    getStatus: (eventId: string): ArenaStatus => {
        const participations = repo.select("participations").filter((p: any) => p.eventId === eventId);
        const event = repo.select("events").find((e: any) => e.id === eventId);
        
        const capacity = event?.maxCapacity || DEFAULT_CAPACITY;
        const current = participations.length;
        
        // Calculate percentage, capped at 100%
        const rawPercentage = (current / capacity) * 100;
        const percentage = Math.min(100, Math.max(0, rawPercentage));

        let label = `${percentage.toFixed(0)}% LOTADO`;
        if (percentage >= 100) label = "SOLD OUT";
        else if (percentage < 10) label = "ABERTO";

        // Simulated online users (mock only)
        const baseOnline = Math.floor(current * 0.2); // ~20% online
        const variance = Math.floor(Math.random() * 20);
        const onlineCount = baseOnline + variance;

        return {
            capacity,
            current,
            percentage,
            isFull: current >= capacity,
            label,
            onlineCount
        };
    },

    /**
     * Validates if there is space in the arena for a new user.
     */
    checkAvailability: (eventId: string): boolean => {
        const status = LiveArenaEngine.getStatus(eventId);
        return !status.isFull;
    },

    /**
     * Simulates "Hype" for the UI when data is static/mock.
     */
    getLiveViewers: (eventId: string): number => {
        // Randomize slightly to simulate live activity
        const base = 150;
        const variance = Math.floor(Math.random() * 20);
        return base + variance;
    }
};
