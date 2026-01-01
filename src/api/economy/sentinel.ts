
import { getRepository } from "../database/repository.factory";
import { getLedgerAPI } from "./ledger";

const repo = getRepository();

export function getEconomyAlertsAPI() {
    const alerts = [];
    const users = repo.select("users");
    const transactions = getLedgerAPI();
    const submissions = repo.select("submissions"); // Assuming V4.3 access via repo
    
    // 1. Negative Balance Check
    const negativeUsers = users.filter((u:any) => u.coins < 0);
    if (negativeUsers.length > 0) {
        alerts.push({ 
            id: 'crit-neg-bal',
            severity: 'high', 
            title: 'Saldo Negativo Detectado',
            description: `${negativeUsers.length} usuários com saldo de Coins negativo.`,
            section: 'critical'
        });
    }

    // 2. Excessive Gain Check (Last 24h)
    const oneDayAgo = new Date(Date.now() - 86400000).getTime();
    const recentTransactions = transactions.filter((t:any) => new Date(t.dateISO).getTime() > oneDayAgo);
    
    const gainByUser: Record<string, number> = {};
    recentTransactions.forEach((t:any) => {
        if(t.type === 'earn') gainByUser[t.userId] = (gainByUser[t.userId] || 0) + t.amount;
    });
    
    const whales = Object.entries(gainByUser).filter(([_, amount]) => amount > 5000);
    if (whales.length > 0) {
         alerts.push({
            id: 'econ-whale-alert',
            severity: 'medium',
            title: 'Acúmulo Rápido de LC',
            description: `${whales.length} usuários ganharam > 5000 LC nas últimas 24h.`,
            section: 'economy'
        });
    }

    // 3. Reward Mismatch (Heuristic)
    // Check if any approved submission has 0 rewards logged in ledger for that user/time proximity? 
    // Simplified: Check users with approved missions but 0 XP
    const activeUsers = users.filter((u:any) => u.monthlyMissionsCompleted > 0 && u.xp === 0);
    if (activeUsers.length > 0) {
        alerts.push({
            id: 'integrity-xp-missing',
            severity: 'medium',
            title: 'Inconsistência de XP',
            description: `${activeUsers.length} usuários completaram missões mas possuem 0 XP.`,
            section: 'critical'
        });
    }

    return alerts;
}
