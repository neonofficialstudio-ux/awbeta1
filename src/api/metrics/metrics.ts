
import * as db from '../mockData';
import { BASE_MISSION_REWARDS } from '../economy/economy';

// (A) Missões
export const getTotalMissionsCreated = () => db.missionsData.length;

export const getPendingMissionCount = () => db.missionSubmissionsData.filter(s => s.status === 'pending').length;

export const getCompletedMissionCount = () => db.missionSubmissionsData.filter(s => s.status === 'approved').length;

export const getAverageApprovalTime = () => {
    let totalTimeMs = 0;
    let count = 0;

    // Mapear logs de conclusão para acesso rápido
    const completionLogs = new Map<string, string>(); // key: userId-missionId, value: completedAt
    db.missionCompletionLogData.forEach(log => {
        completionLogs.set(`${log.userId}-${log.missionId}`, log.completedAt);
    });

    db.missionSubmissionsData.forEach(sub => {
        if (sub.status === 'approved') {
            const completedAt = completionLogs.get(`${sub.userId}-${sub.missionId}`);
            if (completedAt) {
                const submittedTime = new Date(sub.submittedAtISO).getTime();
                const approvedTime = new Date(completedAt).getTime();
                const diff = approvedTime - submittedTime;
                if (diff >= 0) {
                    totalTimeMs += diff;
                    count++;
                }
            }
        }
    });

    if (count === 0) return 0;
    return totalTimeMs / count; // em milissegundos
};

// (B) Usuários & Economia
export const getTotalUsers = () => db.allUsersData.filter(u => u.role === 'user').length;

export const getPlanDistribution = () => {
    const distribution: Record<string, number> = {};
    db.allUsersData.filter(u => u.role === 'user').forEach(user => {
        distribution[user.plan] = (distribution[user.plan] || 0) + 1;
    });
    return distribution;
};

export const getTotalCoinsCirculating = () => {
    return db.allUsersData.reduce((acc, user) => acc + user.coins, 0);
};

export const getTotalCoinsSpent = () => {
    return db.redeemedItemsData.reduce((acc, item) => acc + item.itemPrice, 0);
};

export const getLevelDistribution = () => {
    const distribution: Record<string, number> = {};
    const buckets = ['1-10', '11-20', '21-30', '31-40', '41-50', '51+'];
    
    buckets.forEach(b => distribution[b] = 0);

    db.allUsersData.filter(u => u.role === 'user').forEach(user => {
        const level = user.level;
        if (level <= 10) distribution['1-10']++;
        else if (level <= 20) distribution['11-20']++;
        else if (level <= 30) distribution['21-30']++;
        else if (level <= 40) distribution['31-40']++;
        else if (level <= 50) distribution['41-50']++;
        else distribution['51+']++;
    });

    return distribution;
};

// (C) Loja
export const getStoreItemUsage = () => {
    const usage: Record<string, number> = {};
    db.redeemedItemsData.forEach(item => {
        usage[item.itemName] = (usage[item.itemName] || 0) + 1;
    });
    return usage;
};

export const getUsableItemQueueSize = () => db.usableItemQueueData.length;

export const getVisualItemQueueSize = () => {
    return db.redeemedItemsData.filter(i => i.status === 'InProgress' && i.formData).length;
};

// (D) Eventos & Sorteios
export const getActiveEventsCount = () => db.eventsData.filter(e => e.status === 'current').length;

export const getRafflesCount = () => db.rafflesData.length;

// Sorteios não têm "pending submissions" no sentido tradicional (compra direta).
// Mapeando para Missões de Evento Pendentes, que se encaixam na categoria Eventos & Sorteios.
export const getPendingRaffleSubmissionsCount = () => {
    return db.eventMissionSubmissionsData.filter(s => s.status === 'pending').length;
};

// (E) Performance Global
export const getDailyMissionProcessingRate = () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Conta logs de conclusão nas últimas 24h (aprovações)
    const approvedLast24h = db.missionCompletionLogData.filter(log => new Date(log.completedAt) >= oneDayAgo).length;
    
    return approvedLast24h; 
};

export const getAverageUserActivity = () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const totalUsers = getTotalUsers();
    
    if (totalUsers === 0) return 0;

    // 1. Missões submetidas
    const submissionsCount = db.missionSubmissionsData.filter(s => new Date(s.submittedAtISO) >= oneDayAgo).length;
    
    // 2. Compras na loja
    const purchasesCount = db.redeemedItemsData.filter(r => new Date(r.redeemedAtISO) >= oneDayAgo).length;
    
    // 3. Check-ins (via transações de moeda source='daily_check_in')
    const checkInsCount = db.coinTransactionsLogData.filter(t => 
        t.source === 'daily_check_in' && new Date(t.dateISO) >= oneDayAgo
    ).length;

    const totalActions = submissionsCount + purchasesCount + checkInsCount;

    return totalActions / totalUsers;
};
