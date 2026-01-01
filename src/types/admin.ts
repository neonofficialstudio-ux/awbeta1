
export type AdminTab = 'dashboard' | 'missions' | 'users' | 'store' | 'events' | 'queues' | 'economics' | 'subscriptions' | 'raffles' | 'settings' | 'telemetry' | 'behavior' | 'health' | 'insights' | 'economy_console' | 'stress_performance' | 'economy_pro';
export type AdminStoreTab = 'visual' | 'usable' | 'coins' | 'review_purchases' | 'redemptions' | 'metrics';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string; 
  isGlobal: boolean;
  targetUserIds?: string[]; 
}

export type PunishmentType = 'warn' | 'temp_ban' | 'perm_ban' | 'deduct';

export interface Punishment {
  id: string;
  type: PunishmentType;
  reason: string;
  date: string; 
  durationDays?: number; 
  deduction?: {
    coins?: number;
    xp?: number;
  };
}

export interface Advertisement {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    linkUrl: string;
    isActive: boolean;
    duration: number; 
    views?: number; 
    clicks?: number; 
}

export interface ManualAward {
    id: string;
    userId: string;
    adminId: string;
    eventId?: string | null;
    type: 'coins' | 'xp' | 'item' | 'text';
    amount?: number; 
    itemId?: string; 
    customTitle?: string; 
    dateISO: string;
}

export interface UnifiedAwardEntry {
    id: string;
    type: 'event' | 'raffle' | 'jackpot' | 'manual';
    sourceTitle: string; 
    userId: string;
    userName: string; 
    userAvatar?: string;
    rewardDescription: string;
    dateISO: string;
    originalId: string; 
}
