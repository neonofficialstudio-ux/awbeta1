
// api/economy/ledger.ts
// LEGACY WRAPPER - PROXIES TO SERVICES/ECONOMY/LEDGER.ENGINE.TS

import { LedgerEngine } from "../../services/economy/ledger.engine";
import type { CoinTransaction } from "../../types";
import { getRepository } from "../database/repository.factory";

const repo = getRepository();

export function getLedgerAPI() {
    return repo.select("transactions").sort((a: any, b: any) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
}

export function getLedgerByUsersAPI(userId: string) {
    return getLedgerAPI().filter((t: any) => t.userId === userId);
}

/**
 * Records a transaction using the unified LedgerEngine.
 */
export function registerEconomyEvent(
    userId: string, 
    amount: number, 
    type: 'earn' | 'spend', 
    source: string, 
    description: string
): CoinTransaction {
    
    // Fetch current balance for snapshot calculation
    const user = repo.select("users").find((u: any) => u.id === userId);
    const currentBalance = user ? user.coins + amount : 0; 

    const entry = LedgerEngine.recordTransaction(
        userId,
        'COIN',
        amount,
        type,
        source as any,
        description,
        currentBalance
    );

    // Return formatted as legacy CoinTransaction
    return {
        id: entry.id,
        userId: entry.userId,
        amount: entry.amount,
        type: entry.transactionType,
        source: entry.source,
        description: entry.description,
        date: new Date(entry.timestamp).toLocaleString('pt-BR'),
        dateISO: new Date(entry.timestamp).toISOString()
    };
}

export function registerXPEvent(userId: string, amount: number, source: string) {
    const user = repo.select("users").find((u: any) => u.id === userId);
    const currentXp = user ? user.xp + amount : 0;

    LedgerEngine.recordTransaction(
        userId,
        'XP',
        amount,
        'earn',
        source as any,
        'Ganho de XP',
        currentXp
    );
}
