
import { getRepository } from "../../api/database/repository.factory";

const repo = getRepository();

export const EventMissionEngine = {
    getEventMissions: (userId: string, eventId: string) => {
        // Eventos desativados: não existe pass/vip gating.
        // Mantemos apenas missões não-vip para compatibilidade com telas antigas.
        void userId;

        let missions = repo
            .select("missions")
            .filter((m: any) => m.eventId === eventId || (m.type && m.type.includes("event")));

        missions = missions.filter((m: any) => m.tier !== "vip");

        return missions;
    },

    completeEventMission: (userId: string, missionId: string) => {
        void userId;
        void missionId;
        return null;
    },
    
    validateEventMissionProof: (proof: string) => {
        // Re-use standard validators or specific logic
        return proof && proof.length > 5;
    }
};
