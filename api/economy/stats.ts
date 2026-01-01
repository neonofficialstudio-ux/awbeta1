
import { getRepository } from "../database/repository.factory";
import { getLedgerAPI } from "./ledger";

const repo = getRepository();

export function getGlobalEconomyStatsAPI() {
    const users = repo.select("users");
    const transactions = getLedgerAPI();
    
    // Filter out admins to prevent infinite coin wallets from skewing economy totals
    const validUsers = users.filter((u: any) => u.role === 'user');
    
    const totalLC = validUsers.reduce((acc: number, u: any) => acc + (u.coins || 0), 0);
    const totalXP = validUsers.reduce((acc: number, u: any) => acc + (u.xp || 0), 0);
    
    const earned = transactions.filter((t: any) => t.type === 'earn').reduce((acc: number, t: any) => acc + t.amount, 0);
    const spent = transactions.filter((t: any) => t.type === 'spend').reduce((acc: number, t: any) => acc + Math.abs(t.amount), 0);

    return {
        totalLC,
        totalXP,
        circulation: { earned, spent, net: earned - spent },
        userCount: validUsers.length, // Consistency Fix: Exclude admins
        activeUsers: validUsers.filter((u:any) => !u.isBanned).length
    };
}

export function getDailyStatsAPI() {
    const transactions = getLedgerAPI();
    const daily: Record<string, { earned: number; spent: number }> = {};
    
    transactions.forEach((t: any) => {
        const date = t.dateISO.split('T')[0];
        if (!daily[date]) daily[date] = { earned: 0, spent: 0 };
        
        if (t.type === 'earn') daily[date].earned += t.amount;
        else daily[date].spent += Math.abs(t.amount);
    });
    
    // Convert to array sorted by date
    return Object.entries(daily)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, stats]) => ({ date, ...stats }));
}
