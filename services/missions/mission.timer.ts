
import { getRepository } from '../../api/database/repository.factory';
import { MissionDB } from '../../api/missions/missions.db';
import { LogEngineV4 } from '../../api/admin/logEngineV4';

const repo = getRepository();

export const MissionTimerEngine = {
    /**
     * Calculates remaining cooldown in milliseconds.
     * Returns 0 if available.
     */
    getRemainingCooldown: (userId: string, missionId: string): number => {
        const mission = MissionDB.getById(missionId) || repo.select("missions").find((m:any) => m.id === missionId);
        // Default cooldown if not specified (e.g. 24h for weekly)
        const cooldownHours = mission?.cooldownHours ?? 24;
        
        if (cooldownHours === 0) return 0; // No cooldown

        // 1. Check Submission/Audit Logs for Completion
        // We query the centralized audit log for 'mission_completion' events
        const logs = LogEngineV4.getLogs({ userId, category: 'system' })
            .filter(l => l.action === 'mission_completion' && l.payload?.missionId === missionId);

        if (logs.length === 0) return 0;

        // Sort by most recent
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        const lastCompletionTime = new Date(logs[0].timestamp).getTime();
        if (isNaN(lastCompletionTime)) return 0; // Safety check

        const now = Date.now();
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        
        const diff = now - lastCompletionTime;
        
        if (diff < cooldownMs) {
            return cooldownMs - diff;
        }

        return 0;
    },

    /**
     * Checks if mission is currently available based on timer.
     */
    isAvailable: (userId: string, missionId: string): boolean => {
        return MissionTimerEngine.getRemainingCooldown(userId, missionId) <= 0;
    },
    
    /**
     * Returns formatted string for UI
     */
    getCooldownDisplay: (userId: string, missionId: string): string | null => {
        const remaining = MissionTimerEngine.getRemainingCooldown(userId, missionId);
        if (remaining <= 0) return null;
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}m`;
    }
};
