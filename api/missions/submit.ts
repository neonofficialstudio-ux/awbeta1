
import { MissionEngineV5 } from "./missionEngineV5";
import type { User } from "../../types";

interface SubmitMissionInput {
    userId: string;
    missionId: string;
    proof: string;
    userPlan: User['plan'];
    missionData?: any; 
}

export async function submitMissionV4(input: SubmitMissionInput) {
    // Wrapper for V5 Engine to maintain API signature compatibility
    const result = await MissionEngineV5.submit(input.userId, input.missionId, input.proof);

    if (!result.success) {
        throw new Error(result.error || "Falha ao enviar missão.");
    }

    return {
        success: true,
        newSubmission: result.submission,
        updatedUser: result.updatedUser, // Critical: return updated user to context
        message: "Missão enviada para análise com sucesso."
    };
}
