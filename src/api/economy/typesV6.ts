
import type { User } from '../../types';

export type CurrencyType = 'COIN' | 'XP';

export type TransactionType = 
    | 'mission_reward' 
    | 'daily_check_in' 
    | 'weekly_bonus' 
    | 'level_up_bonus' 
    | 'store_purchase' 
    | 'event_entry' 
    | 'event_reward' 
    | 'admin_adjustment' 
    | 'jackpot_entry' 
    | 'jackpot_win'
    | 'refund'
    | 'production_finish'
    | 'mission_completion' // Legacy/General
    | 'initial_grant'
    | 'artist_link_click'
    | 'raffle_ticket'
    | 'raffle_win'
    | 'achievement_reward'
    | 'crate_open'
    | 'crate_reward'
    | 'punishment';

export interface LedgerEntry {
    id: string;
    userId: string;
    type: TransactionType;
    amount: number; // Positive for gain, negative for spend
    currency: CurrencyType;
    balanceAfter: number; // Snapshot of balance at that time
    timestamp: number;
    metadata?: Record<string, any>;
    description: string;
}

export interface EconomyState {
    totalCoins: number;
    totalXp: number;
    level: number;
    xpToNextLevel: number;
}
