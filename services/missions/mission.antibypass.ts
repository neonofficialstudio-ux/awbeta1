
import { getRepository } from "../../api/database/repository.factory";
import { TelemetryPRO } from "../telemetry.pro";

const repo = getRepository();

export const MissionAntiBypass = {
    checkSubmission: (userId: string, missionId: string, proof: string): { allowed: boolean; reason?: string } => {
        const allSubmissions = repo.select("submissions");
        
        // 1. Duplicate Proof Check (Global)
        // Prevent reusing the exact same link or image string across different users or missions
        const duplicate = allSubmissions.find((s: any) => s.proofUrl === proof && s.status !== 'rejected');
        
        if (duplicate) {
            if (duplicate.userId !== userId) {
                TelemetryPRO.anomaly("cross_user_proof_reuse", { originalUser: duplicate.userId, newUser: userId });
                return { allowed: false, reason: "Esta prova já foi utilizada por outro usuário." };
            }
            if (duplicate.missionId !== missionId) {
                // Allow reuse only if it's a 'profile' link maybe? For now, strict.
                // Exception: If the proof is a profile link (e.g. instagram profile), it might be valid for multiple "Follow" missions.
                // Heuristic: Short length might indicate profile vs deep link.
                if (proof.length > 40) {
                    return { allowed: false, reason: "Você já usou esta prova em outra missão." };
                }
            }
            if (duplicate.missionId === missionId) {
                return { allowed: false, reason: "Você já enviou esta missão. Aguarde a análise." };
            }
        }

        // 2. Velocity Check (Spam)
        const userSubmissions = allSubmissions.filter((s: any) => s.userId === userId).sort((a: any, b: any) => 
            new Date(b.submittedAtISO).getTime() - new Date(a.submittedAtISO).getTime()
        );

        if (userSubmissions.length > 0) {
            const lastSubmission = userSubmissions[0];
            const diff = Date.now() - new Date(lastSubmission.submittedAtISO).getTime();
            
            // Minimum 10 seconds between submissions to prevent bot scripting
            if (diff < 10000) { 
                TelemetryPRO.event("submission_velocity_limit", { userId });
                return { allowed: false, reason: "Aguarde alguns segundos entre os envios." };
            }
        }

        return { allowed: true };
    }
};
