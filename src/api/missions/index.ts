
import { MissionEngineUnified } from "./MissionEngineUnified";
import { MissionEventEngine } from "../../services/missions/mission.event";
import { getRepository } from "../database/repository.factory";
import { MissionEngine as ServiceMissionEngine } from "../../services/missions/mission.engine";
import * as db from "../mockData";
import { withLatency } from "../helpers";
import { MissionEngineV5 } from "./missionEngineV5";

const repo = getRepository();

// --- UNIFIED ENGINE EXPORT ---
// This is the new standard.
export { MissionEngineUnified as MissionEngine };

// --- PUBLIC API WRAPPERS ---

export const fetchWeeklyMissions = async () => {
    // Usando Unified Engine que limpa dados automaticamente
    // (Anteriormente chamava MissionEngine.getWeeklyMissions diretamente)
    const all = await MissionEngineUnified.listAll();
    return all.filter((m: any) => !m.eventId && m.status === 'active');
};

export const fetchEventMissions = (userId: string, eventId: string) => {
    const user = repo.select("users").find((u:any) => u.id === userId);
    if (!user) return [];
    return MissionEventEngine.getAvailableEventMissions(user, eventId);
};

export const submitMission = async (userId: string, missionId: string, proofUrl: string) => {
    const result = await MissionEngineV5.submit(userId, missionId, proofUrl);
    
    if (!result.success) {
        throw new Error(result.error || "Falha ao enviar missão.");
    }
    
    return {
        success: true,
        newSubmission: result.submission,
        updatedUser: result.updatedUser,
        message: "Missão enviada com sucesso."
    };
};

// Alias for backward compatibility
export const submitMissionV4 = submitMission;

export const getMissionStatus = (userId: string, missionId: string) => {
    return ServiceMissionEngine.getMissionStatus(userId, missionId);
};

// --- DATA FETCHING ---

export const fetchDashboardData = () => withLatency(() => {
    const now = new Date();
    // Update missions status if needed (mock behavior)
    const activeMissions = db.missionsData.map(mission => {
      const deadline = new Date(mission.deadline);
      if (now > deadline && mission.status === 'active') {
        return { ...mission, status: 'expired' as const };
      }
      return mission;
    });
    // Sync back to db if changed (simple reference check for mock)
    // In real app this is DB update.
    
    return {
        advertisements: db.advertisementsData.filter(ad => ad.isActive),
        featuredMission: db.missionsData.find(m => m.id === db.featuredMissionIdData) || null,
        artistsOfTheDay: db.allUsersData.filter(u => db.artistsOfTheDayIdsData.includes(u.id)),
        artistCarouselDuration: db.artistCarouselDurationData,
        artistsOfTheDayIds: db.artistsOfTheDayIdsData,
        processedArtistOfTheDayQueue: db.processedArtistOfTheDayQueueHistoryData,
    };
});

export const fetchMissions = (userId: string) => {
    const missions = ServiceMissionEngine.getAllMissionsForUser(userId);
    const submissions = repo.select("submissions").filter((s:any) => s.userId === userId);
    
    return {
        missions,
        submissions,
        hasReachedDailyLimit: false // Managed by engine logic
    };
};

export const fetchAchievementsData = () => {
    return repo.select("achievements") || []; 
};

// --- GENERATORS ---
export { 
    generateWeeklySchedule as generateWeeklyMissionsAPI, 
    generateIndividualMission as generateIndividualMissionAPI 
} from "./generator";

// --- EXPORTS FOR INTERNAL USE ---
export { MissionEngineV5 } from "./missionEngineV5";
export { runMissionSelfTest } from "./missionSelfTest";

// Export for Admin Panel
export const listAllMissions = MissionEngineUnified.listAll;
