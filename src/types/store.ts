
export type StoreTab = 'redeem' | 'usable' | 'buy' | 'orders';
export type InventoryTab = 'visual' | 'usable' | 'history';
export type RedemptionStatus = 'Redeemed' | 'InProgress' | 'Used' | 'Refunded';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  rarity: 'Regular' | 'Raro' | 'Épico' | 'Lendário';
  imageUrl: string;
  exchanges: number;
  previewUrl?: string;
  isOutOfStock?: boolean;
}

export interface UsableItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isOutOfStock?: boolean;
  platform?: 'instagram' | 'tiktok' | 'youtube' | 'all'; // Added platform field
  /**
   * What kind of link/content the user must submit.
   * Stored in store_items.meta.usable_kind and echoed into production_requests.briefing.kind.
   */
  kind?:
    | 'instagram_post'
    | 'instagram_reels'
    | 'instagram_story'
    | 'tiktok_video'
    | 'youtube_video'
    | 'spotify_track'
    | 'spotify_presave'
    | 'link';
}

export interface VisualRewardFormData {
  songName: string;
  lyrics: string;
  idea: string;
  audioFile: string; // base64 data URL
  referenceImages?: string[]; // base64 data URLs for visual references
}

export interface RedeemedItem {
  id: string;
  userId: string;
  userName: string;
  itemId: string;
  itemName: string;
  itemPrice: number;
  redeemedAt: string; // Display string
  redeemedAtISO: string; // ISO string for sorting
  coinsBefore: number;
  coinsAfter: number;
  status: RedemptionStatus;
  formData?: VisualRewardFormData;
  productionStartedAt?: string; // ISO string
  completedAt?: string; // ISO string
  estimatedCompletionDate?: string; // ISO string
  completionUrl?: string; // URL for the finished product/file
}

export type RafflePrizeType = 'item' | 'coins' | 'hybrid' | 'custom';

export interface Raffle {
    id: string;
    itemId: string; // Can be empty if prizeType is coins/custom
    itemName: string;
    itemImageUrl: string;
    ticketPrice: number;
    ticketLimitPerUser: number;
    startsAt?: string; // ISO string for start date (scheduling)
    endsAt: string; // ISO string for the end date
    // V2.0 Statuses
    status: 'active' | 'drawing' | 'finished' | 'scheduled' | 'ended' | 'awaiting_draw' | 'winner_defined'; 
    winnerId?: string;
    winnerName?: string;
    winnerAvatar?: string;
    winnerDefinedAt?: string; // ISO Date
    
    // V2.0 Reward Engine Props
    prizeType?: RafflePrizeType;
    coinReward?: number; // Amount of coins if applicable
    customRewardText?: string; // Description for custom prizes
}
  
export interface RaffleTicket {
    id: string;
    raffleId: string;
    userId: string;
    purchasedAt: string; // ISO string
}
  
export interface JackpotTicket {
    id: string; // Ex: "JKT-8821"
    userId: string;
    userName: string;
    purchasedAt: string; // ISO Date
}

export interface JackpotRound {
    id: string;
    winnerId: string;
    winnerName: string;
    prizeAmount: number;
    drawnAt: string;
    totalTickets: number;
}
