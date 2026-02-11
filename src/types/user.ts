
import { Punishment } from './admin';
import { SubscriptionEvent } from './economy';
import { EventSession } from './event';
import { RedeemedItem } from './store'; // Import dependency to fix 'any'

export interface ArtistDailyMissionState {
    requiredLinks: string[];
    completedLinks: string[];
    reward: number;
    isComplete: boolean;
    lastUpdated?: string; // ISO date
}

export interface UserSocials {
    instagram?: string;
    youtube?: string;
    spotify?: string;
    tiktok?: string;
}

export interface UserStreak {
    lastCheckin: string | null;
    count: number;
}

export interface UserMissionsState {
    dailyLimit: number;
    completedToday: number;
    history: string[]; // IDs
}

export interface UserFlags {
    isAdmin?: boolean;
    isShadowBanned?: boolean;
    migratedV14?: boolean;
}

export type UserPlan = 'Free Flow' | 'Artista em Ascensão' | 'Artista Profissional' | 'Hitmaker' | 'free' | 'ascensao' | 'profissional' | 'hitmaker';
export type UserRole = 'user' | 'admin' | 'superadmin';

export interface User {
  id: string;
  name: string;
  displayName?: string;
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
  artistDailyMission?: ArtistDailyMissionState;

  // V1.4 Modern Schema Fields
  socials?: UserSocials;
  streak?: UserStreak;
  missions?: UserMissionsState;
  flags?: UserFlags;
  
  // Queue (Inventory) - Now Strictly Typed
  inventory?: RedeemedItem[];

  // Anti-Cheat V1.2
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
  patternFlags?: {
      containsRepeats?: boolean;
  };
}

export interface RankingUser {
  rank: number;
  name: string;
  artisticName: string;
  avatarUrl: string;
  level: number;
  monthlyMissionsCompleted: number;
  isCurrentUser: boolean;
  spotifyUrl?: string;
  youtubeUrl?: string;
  instagramUrl: string;
  tiktokUrl?: string;
  plan: UserPlan;
  xp?: number; // Optional for economy ranking context
  coins?: number; // Optional for economy ranking context
}
