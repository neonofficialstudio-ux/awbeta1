import { config } from "../../core/config";
import {
  fetchMissionsSupabase,
  submitMissionSupabase,
  fetchWeeklyMissionsSupabase,
  listAllMissionsSupabase,
} from "../supabase/missions";

export {
  generateWeeklySchedule as generateWeeklyMissionsAPI,
  generateIndividualMission as generateIndividualMissionAPI,
} from "./generator";

/**
 * NOTE (Enterprise):
 * - Este módulo é "public" e é consumido pela UI.
 * - Não pode importar nada de mockData/mock-db, mesmo que o runtime seja supabase,
 *   pois isso contamina o bundle e impede remoção definitiva do legado.
 */

export const fetchMissions = async (userId: string) => {
  if (config.backendProvider === "supabase") {
    return fetchMissionsSupabase(userId);
  }
  // mock provider foi bloqueado no runtime; manter erro explícito (sem fallback silencioso).
  throw new Error("[AW] fetchMissions: backendProvider not supabase (blocked)");
};

export const submitMission = async (
  userId: string,
  missionId: string,
  proof: string
) => {
  if (config.backendProvider === "supabase") {
    return submitMissionSupabase(userId, missionId, proof);
  }
  throw new Error("[AW] submitMission: backendProvider not supabase (blocked)");
};

export const fetchWeeklyMissions = async () => {
  if (config.backendProvider === "supabase") {
    return fetchWeeklyMissionsSupabase();
  }
  throw new Error("[AW] fetchWeeklyMissions: backendProvider not supabase (blocked)");
};

export const listAllMissions = async () => {
  if (config.backendProvider === "supabase") {
    return listAllMissionsSupabase();
  }
  throw new Error("[AW] listAllMissions: backendProvider not supabase (blocked)");
};
