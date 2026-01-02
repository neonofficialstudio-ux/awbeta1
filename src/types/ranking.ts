
import { User } from './user';

export interface RankingSession {
  season: string;
  lastUpdated: number;
  userPosition: number;
  deltas: Record<string, number>; // userId -> delta
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
