
import * as db from '../mockData';
import type { User, CoinTransaction, RedeemedItem } from '../../types';

// Helper to parse currency strings like "R$49/mês"
const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    if (priceStr.toLowerCase() === 'gratuito') return 0;
    const match = priceStr.match(/R\$\s*([\d,]+)/);
    if (match && match[1]) {
        return parseFloat(match[1].replace(',', '.'));
    }
    return 0;
};

// --- Receita Real (R$) ---

export const getMRR = (): number => {
    const users = db.allUsersData.filter(u => u.role === 'user');
    return users.reduce((total, user) => {
        const plan = db.subscriptionPlansData.find(p => p.name === user.plan);
        return total + (plan ? parsePrice(plan.price) : 0);
    }, 0);
};

export const getMRRByPlan = (): Record<string, number> => {
    const mrrByPlan: Record<string, number> = {};
    const users = db.allUsersData.filter(u => u.role === 'user');
    
    users.forEach(user => {
        const plan = db.subscriptionPlansData.find(p => p.name === user.plan);
        const price = plan ? parsePrice(plan.price) : 0;
        mrrByPlan[user.plan] = (mrrByPlan[user.plan] || 0) + price;
    });
    
    return mrrByPlan;
};

export const getTicketMedio = (): number => {
    const users = db.allUsersData.filter(u => u.role === 'user');
    const payingUsers = users.filter(u => u.plan !== 'Free Flow');
    const mrr = getMRR();
    
    if (payingUsers.length === 0) return 0;
    return mrr / payingUsers.length;
};

export const getReceitaProjetada = (dias: number): number => {
    const dailyRevenue = getMRR() / 30;
    return dailyRevenue * dias;
};

export const getImpactoCancelamentos = (userIds: string[]): number => {
    let loss = 0;
    userIds.forEach(id => {
        const user = db.allUsersData.find(u => u.id === id);
        if (user) {
            const plan = db.subscriptionPlansData.find(p => p.name === user.plan);
            loss += plan ? parsePrice(plan.price) : 0;
        }
    });
    return loss;
};

// --- Economia Interna (LC) ---

export const getLCGerada = (dias: number): number => {
    const now = new Date().getTime();
    const startDate = now - (dias * 24 * 60 * 60 * 1000);
    
    return db.coinTransactionsLogData
        .filter(t => t.type === 'earn' && new Date(t.dateISO).getTime() >= startDate)
        .reduce((sum, t) => sum + t.amount, 0);
};

export const getLCGasta = (dias: number): number => {
    const now = new Date().getTime();
    const startDate = now - (dias * 24 * 60 * 60 * 1000);
    
    return db.coinTransactionsLogData
        .filter(t => t.type === 'spend' && new Date(t.dateISO).getTime() >= startDate)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
};

export const getLCTotalCirculacao = (): number => {
    return db.allUsersData.reduce((sum, user) => sum + user.coins, 0);
};

export const getLCTravadaEmFilas = (): number => {
    // Estimate value of items currently "InProgress" (Visual or Usable)
    // This represents "value locked" in pending services
    const inProgressItems = db.redeemedItemsData.filter(i => i.status === 'InProgress');
    return inProgressItems.reduce((sum, item) => sum + item.itemPrice, 0);
};

export const getVelocidadeEconomica = (): number => {
    // Transactions per hour (last 24h)
    const now = new Date().getTime();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const txCount = db.coinTransactionsLogData.filter(t => new Date(t.dateISO).getTime() >= oneDayAgo).length;
    return txCount / 24;
};

// --- Operação ---

export const getDemandaMensalDeProducao = (): number => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Filter for visual rewards (items with formData implies visual reward in this system)
    return db.redeemedItemsData.filter(r => 
        r.formData && 
        new Date(r.redeemedAtISO) >= oneMonthAgo
    ).length;
};

export const getCapacidadeVsDemanda = (): { capacidade: number, demanda: number, ratio: number } => {
    // Mock capacity: Assume team can handle 50 items/month
    const CAPACIDADE_MENSAL = 50; 
    const demanda = getDemandaMensalDeProducao();
    const ratio = CAPACIDADE_MENSAL > 0 ? (demanda / CAPACIDADE_MENSAL) * 100 : 0;
    
    return {
        capacidade: CAPACIDADE_MENSAL,
        demanda,
        ratio
    };
};

export const getFilaProjetada = (): number => {
    // Current Visual Queue + Predicted Incoming (based on last 7 days rate) - Predicted Outgoing (based on capacity)
    const currentQueue = db.redeemedItemsData.filter(r => r.status === 'InProgress' && r.formData).length;
    
    const now = new Date().getTime();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const incomingLast7Days = db.redeemedItemsData.filter(r => r.formData && new Date(r.redeemedAtISO).getTime() >= sevenDaysAgo).length;
    const dailyRate = incomingLast7Days / 7;
    
    // Projection for next 7 days
    const predictedIncoming = dailyRate * 7;
    const predictedOutgoing = (50 / 30) * 7; // Capacity per week
    
    return Math.max(0, Math.round(currentQueue + predictedIncoming - predictedOutgoing));
};
