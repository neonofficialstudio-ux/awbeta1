
import { getRepository } from "../database/repository.factory";
import { getLedgerAPI } from "../economy/ledger";

const repo = getRepository();

export const EconomyHealthEngine = {
    getSnapshot: () => {
        const users = repo.select("users");
        const transactions = getLedgerAPI();
        const redeemed = repo.select("redeemedItems");

        const totalCirculation = users.reduce((acc: number, u: any) => acc + (u.coins || 0), 0);
        const totalSpent = transactions
            .filter((t: any) => t.type === 'spend')
            .reduce((acc: number, t: any) => acc + Math.abs(t.amount), 0);
        
        const totalEarned = transactions
            .filter((t: any) => t.type === 'earn')
            .reduce((acc: number, t: any) => acc + t.amount, 0);

        const inflationRate = totalEarned > 0 ? ((totalEarned - totalSpent) / totalEarned) * 100 : 0;

        return {
            totalCirculation,
            totalSpent,
            totalEarned,
            inflationRate: inflationRate.toFixed(2) + '%',
            avgCoinsPerUser: Math.round(totalCirculation / (users.length || 1)),
            redemptionCount: redeemed.length
        };
    }
};
