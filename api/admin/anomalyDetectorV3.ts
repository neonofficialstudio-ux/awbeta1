
import { getRepository } from "../database/repository.factory";
import { LogEngineV4 } from "./logEngineV4";

const repo = getRepository();

export const AnomalyDetectorV3 = {
    runScan: () => {
        const anomalies: any[] = [];
        const users = repo.select("users");
        const transactions = repo.select("transactions");

        // 1. Economy Integrity
        users.forEach((user: any) => {
            if (user.coins < 0 || user.xp < 0) {
                anomalies.push({
                    type: 'negative_balance',
                    severity: 'high',
                    targetId: user.id,
                    details: `User ${user.name} has negative balance: C:${user.coins} XP:${user.xp}`
                });
            }
        });

        // 2. Transaction Spike (Spam)
        // Simple check: users with > 50 transactions in last hour
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
        const txCounts: Record<string, number> = {};
        
        transactions.forEach((t: any) => {
            if (t.dateISO > oneHourAgo) {
                txCounts[t.userId] = (txCounts[t.userId] || 0) + 1;
            }
        });

        Object.entries(txCounts).forEach(([userId, count]) => {
            if (count > 50) {
                anomalies.push({
                    type: 'transaction_spike',
                    severity: 'medium',
                    targetId: userId,
                    details: `User generated ${count} transactions in 1 hour`
                });
            }
        });

        // Log anomalies if found
        if (anomalies.length > 0) {
            LogEngineV4.log({
                action: 'anomalies_detected',
                category: 'security',
                payload: { count: anomalies.length, anomalies }
            });
        }

        return anomalies;
    }
};
