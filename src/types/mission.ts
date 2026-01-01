
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export type MissionType = 'instagram' | 'tiktok' | 'creative' | 'special' | 'youtube' | 'event-normal' | 'event-vip' | 'weekly';

export type MissionFormat = 'link' | 'photo' | 'confirmation' | 'video' | 'story' | 'text' | 'ambos' | 'legacy';

export interface Mission {
  id: string;
  title: string;
  description: string;
  xp: number;
  coins: number;
  type: MissionType;
  actionUrl?: string;
  createdAt: string;
  deadline: string;
  status: 'active' | 'expired' | 'scheduled';
  scheduledFor?: string; 
  format?: MissionFormat; 
  platform?: string;
  
  slot?: string;
  repetitionLimit?: number;
  cooldownHours?: number;
  multiplierEnabled?: boolean;
  eventId?: string;
  tier?: 'normal' | 'vip';
}

export interface MissionSubmission {
  id: string;
  userId: string;
  missionId: string;
  userName: string;
  userAvatar: string;
  missionTitle: string;
  submittedAt: string;
  submittedAtISO: string;
  proofUrl: string;
  status: SubmissionStatus;
}

export interface MissionCompletionLog {
  id: string;
  userId: string;
  missionId: string;
  completedAt: string;
  xpGained: number;
  coinsGained: number;
}

export type AchievementRarity = 'Comum' | 'Incomum' | 'Raro' | 'Épico' | 'Lendário';
export type AchievementTrigger = 'mission_complete' | 'level_up' | 'store_redeem' | 'check_in_streak' | 'ranking' | 'coin_accumulated' | 'profile_complete' | 'event_join';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    iconUrl?: string; 
    rarity: AchievementRarity;
    rewardCoins: number;
    rewardXP: number;
    trigger: AchievementTrigger;
    conditionValue: number; 
    category?: 'mission' | 'economy' | 'ranking' | 'event' | 'social';
}
