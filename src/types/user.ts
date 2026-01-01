
import { Punishment } from './admin';
import { SubscriptionEvent } from './economy';
import { EventSession } from './event';
import { RedeemedItem } from './store';

export type UserPlan = 'Free Flow' | 'Artista em Ascensão' | 'Artista Profissional' | 'Hitmaker' | 'free' | 'ascensao' | 'profissional' | 'hitmaker';
export type UserRole = 'user' | 'admin' | 'superadmin';

export interface User {
  id: string;
  name: string;
  artisticName: string;
  avatarUrl: string;
  
  // Economy
  level: number;
  xp: number;
  xpToNextLevel: number;
  coins: number;
  
  // Subscription
  plan: UserPlan;
  
  // Stats
  monthlyMissionsCompleted: number;
  totalMissionsCompleted: number;
  weeklyProgress: number;
  
  // Legacy Lists
  completedMissions: string[];
  pendingMissions: string[];
  completedEventMissions: string[];
  pendingEventMissions: string[];
  joinedEvents: string[];
  
  // Auth
  email: string;
  password?: string;
  phone: string;
  role: UserRole;
  
  // Socials
  spotifyUrl?: string;
  youtubeUrl?: string;
  instagramUrl: string;
  tiktokUrl?: string;
  
  // Meta
  joined?: string;
  joinedISO?: string;
  
  // Streak
  lastCheckIn?: string;
  weeklyCheckInStreak: number;
  
  // Logic States
  pendingPlan?: string;
  subscriptionHistory: SubscriptionEvent[];
  lastArtistLinkClickClaims?: { artistId: string; linkType: 'spotify' | 'youtube'; dateISO: string }[];
  hasReceivedWelcomeBonus?: boolean;
  seenArtistOfTheDayAnnouncements?: string[];
  unseenPlanUpgrade?: boolean;
  subscriptionExpiresAt?: string;
  cancellationPending?: boolean;
  unseenRaffleWin?: { itemName: string; itemImageUrl: string };
  
  // Achievements
  unlockedAchievements: string[];
  unseenAchievements?: string[];
  
  seenAdminNotifications?: string[];
  isBanned?: boolean;
  banReason?: string;
  banExpiresAt?: string;
  punishmentHistory?: Punishment[];
  
  eventSession?: EventSession | null;
  artistDailyMission?: any; // Avoiding circular dependency if possible, or define interface here

  // Modern Schema Fields
  socials?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
    tiktok?: string;
  };
  streak?: {
    lastCheckin: string | null;
    count: number;
  };
  missions?: {
    dailyLimit: number;
    completedToday: number;
    history: string[];
  };
  flags?: {
    isAdmin?: boolean;
    isShadowBanned?: boolean;
    migratedV14?: boolean;
  };
  
  // Queue
  inventory?: RedeemedItem[];

  // Anti-Cheat
  riskScore?: number;
  shieldLevel?: 'normal' | 'medium' | 'high' | 'critical';
  deviceFingerprint?: string;
  stats?: {
    apm?: number;
    aps?: number;
    jackpotBuySpam?: number;
    storeBursts?: number;
    missionRepeats?: number;
  };
}
