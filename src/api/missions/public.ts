import { config } from "../../core/config";
import { fetchMissionsSupabase, submitMissionSupabase } from "../supabase/missions";
import { submitMission as submitMissionMock } from "./index";
import { fetchMissions as fetchMissionsMock } from "../missions";

export { fetchWeeklyMissions, generateIndividualMissionAPI, generateWeeklyMissionsAPI, listAllMissions } from "./index";

export const fetchMissions = async (userId: string) => {
    if (config.backendProvider === 'supabase') {
        return fetchMissionsSupabase(userId);
    }
    return fetchMissionsMock(userId);
};

export const submitMission = async (userId: string, missionId: string, proof: string) => {
    if (config.backendProvider === 'supabase') {
        return submitMissionSupabase(userId, missionId, proof);
    }
    return submitMissionMock(userId, missionId, proof);
};
