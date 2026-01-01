import { IconComponent } from './shared';

export type AdminTab = 'dashboard' | 'missions' | 'users' | 'store' | 'events' | 'queues' | 'economics' | 'subscriptions' | 'raffles' | 'settings' | 'telemetry' | 'behavior' | 'health' | 'insights' | 'economy_console' | 'stress_performance' | 'economy_pro';
export type AdminStoreTab = 'visual' | 'usable' | 'coins' | 'review_purchases' | 'redemptions' | 'metrics';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string; // ISO string
  isGlobal: boolean;
  targetUserIds?: string[]; // Only for private notifications
}

export type PunishmentType = 'warn' | 'temp_ban' | 'perm_ban' | 'deduct';

export interface Punishment {
  id: string;
  type: PunishmentType;
  reason: string;
  date: string; // ISO string
  durationDays?: number; // For temp bans
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
    duration: number; // Duration in seconds for this slide
    views?: number; // Fix: Add views
    clicks?: number; // Fix: Add clicks
}

export interface ManualAward {
    id: string;
    userId: string;
    adminId: string;
    eventId?: string | null;
    type: 'coins' | 'xp' | 'item' | 'text';
    amount?: number; // For coins/xp
    itemId?: string; // For items
    customTitle?: string; // For text awards or overrides
    dateISO: string;
}

// V8.2 Unified Awards History
export interface UnifiedAwardEntry {
    id: string;
    type: 'event' | 'raffle' | 'jackpot' | 'manual';
    sourceTitle: string; // Event Name, Raffle Item, "Jackpot", or Manual Title
    userId: string;
    userName: string; // Resolved name
    userAvatar?: string;
    rewardDescription: string;
    dateISO: string;
    originalId: string; // ID in the source table
}