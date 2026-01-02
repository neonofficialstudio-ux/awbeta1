
import { IconComponent } from './shared';
import { User, UserPlan } from './user';
import { SubmissionStatus, MissionType } from './mission';
import { EventRankingEntry } from './ranking';

export type EventPassType = 'normal' | 'vip';
export type EventStatus = 'current' | 'past' | 'future' | 'closed';

export interface EventSession {
    eventId: string;
    passType: EventPassType;
    startedAt: string; // ISO String
    progress: Record<string, boolean>; // missionId -> completed
    rewardsClaimed: string[]; // rewardIds
    boostersActive: string[]; // boosterIds
    score: number;
}

export interface EventWinner {
    userId: string;
    userName: string;
    userAvatar: string;
    rank: number;
    score: number;
    rewardDescription: string;
    passType: EventPassType;
}

export interface EventRewardConfig {
    firstPlace: { coins: number; xp: number; item?: string };
    top3: { coins: number; xp: number };
    top10: { coins: number; xp: number };
}

export interface EventPrizeConfig {
    coins: number;
    xp: number;
    itemId?: string;
    itemName?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  prize: string;
  vipPrize?: string;
  prizePool?: number;
  prizeIcon?: IconComponent;
  imageUrl: string;
  status: EventStatus;
  entryCost: number;
  goldenPassCost: number;
  maxCapacity?: number;
  allowedPlans?: UserPlan[]; // Strict UserPlan type
  
  // V5 Engine Props
  boostersAvailable?: { type: 'xp_5' | 'xp_10', count: number }[];
  
  // V7.8 Closure Props
  winners?: EventWinner[];
  rewardsConfig?: EventRewardConfig;
  closedAt?: string;
  
  // V7.9 Frozen State - Strictly Typed
  frozenRanking?: EventRankingEntry[]; 
  finalPrizes?: {
      normal: EventPrizeConfig;
      vip: EventPrizeConfig;
  };
}

export interface FeaturedWinner {
    id: string;
    userId: string;
    prizeTitle: string;
    date: string;
}

export interface Participation {
  id: string;
  userId: string;
  eventId: string;
  joinedAt: string;
  isGolden?: boolean;
}

export interface EventScoreLog {
  id: string;
  userId: string;
  eventId: string;
  eventMissionId: string;
  pointsGained: number;
  timestamp: string;
}

export interface EventMission {
  id: string;
  eventId: string;
  title: string;
  description: string;
  points: number;
  xp: number;
  actionUrl?: string;
  tier?: 'normal' | 'vip'; 
  proofType?: 'link' | 'image';
  type?: MissionType; // Matches Mission.type
  requiresReview?: boolean;
}

export interface EventMissionSubmission {
  id: string;
  userId: string;
  eventMissionId: string;
  eventId: string;
  userName: string;
  userAvatar: string;
  missionTitle: string;
  submittedAtISO: string;
  proofUrl: string;
  status: SubmissionStatus;
  rewardGiven?: boolean;
}

export interface ManualEventPointsLog {
    id: string;
    adminId: string;
    adminName: string;
    userId: string;
    userName: string;
    eventId: string;
    eventName: string;
    pointsAdded: number;
    reason: string;
    timestamp: string;
}

export interface ArenaStatus {
    capacity: number;
    current: number;
    percentage: number;
    isFull: boolean;
    label: string;
    onlineCount?: number;
}

export interface EventLiveFeedItem {
    id: string;
    type: 'rank_change' | 'arena_notice' | 'new_participant' | 'vip_entry';
    text: string;
    timestamp: number;
}
