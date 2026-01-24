
import { getRepository } from "../database/repository.factory";
import { addAnomaly } from "./anomalies/list";

const repo = getRepository();

export function runAnomalyDetector() {
    const users = repo.select("users");
    const transactions = repo.select("transactions");
    const submissions = repo.select("submissions");

    // 1. Check XP/LC Balance Integrity
    users.forEach((user: any) => {
        if (user.coins < 0 || user.xp < 0) {
            addAnomaly({
                type: "negative_balance",
                severity: "high",
                message: `Usuário ${user.name} (ID: ${user.id}) possui saldo negativo.`,
                relatedUserIds: [user.id]
            });
        }
    });

    // 2. Check Duplicate Proofs (Cross-User)
    const proofMap = new Map();
    submissions.forEach((sub: any) => {
        if (sub.status === 'approved' && sub.proofUrl && sub.proofUrl.length > 20) {
            if (proofMap.has(sub.proofUrl)) {
                const originalUser = proofMap.get(sub.proofUrl);
                if (originalUser !== sub.userId) {
                    addAnomaly({
                        type: "duplicate_proof_cross_user",
                        severity: "critical",
                        message: `Mesma prova usada por usuários diferentes (ID: ${originalUser} e ${sub.userId}).`,
                        relatedUserIds: [originalUser, sub.userId],
                        relatedMissionIds: [sub.missionId]
                    });
                }
            } else {
                proofMap.set(sub.proofUrl, sub.userId);
            }
        }
    });

    // 3. Check rapid LC gain
    const oneHourAgo = Date.now() - 3600000;
    const recentTx = transactions.filter((t: any) => new Date(t.dateISO).getTime() > oneHourAgo && t.type === 'earn');
    const gainByUser: Record<string, number> = {};
    
    recentTx.forEach((t: any) => {
        gainByUser[t.userId] = (gainByUser[t.userId] || 0) + t.amount;
    });

    for (const [userId, amount] of Object.entries(gainByUser)) {
        if (amount > 5000) {
             addAnomaly({
                type: "rapid_lc_gain",
                severity: "medium",
                message: `Usuário ${userId} ganhou ${amount} LC em 1 hora.`,
                relatedUserIds: [userId]
            });
        }
    }

    return "Anomaly scan complete";
}
