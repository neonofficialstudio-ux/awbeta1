
import { User, UserPlan } from './user';

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
  xp?: number;
  coins?: number;
}

export interface RankingSession {
  season: string;
  lastUpdated: number;
  userPosition: number;
  deltas: Record<string, number>; 
}

export interface RankingDelta {
    userId: string;
    previousRank: number;
    currentRank: number;
    change: number;
}

export interface EventRankingEntry {
    userId: string;
    userName: string;
    userAvatar: string;
    score: number;
    passType: 'normal' | 'vip';
    xp: number;
    missionsCompleted: number;
    rank: number;
    isCurrentUser: boolean;
}

export type RankingType = 'mensal' | 'geral';
