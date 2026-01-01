
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
  platform?: 'instagram' | 'tiktok' | 'youtube' | 'all';
}

export interface VisualRewardFormData {
  songName: string;
  lyrics: string;
  idea: string;
  audioFile: string; 
  referenceImages?: string[]; 
}

export interface RedeemedItem {
  id: string;
  userId: string;
  userName: string;
  itemId: string;
  itemName: string;
  itemPrice: number;
  redeemedAt: string; 
  redeemedAtISO: string; 
  coinsBefore: number;
  coinsAfter: number;
  status: RedemptionStatus;
  formData?: VisualRewardFormData;
  productionStartedAt?: string; 
  completedAt?: string; 
  estimatedCompletionDate?: string; 
  completionUrl?: string; 
}

export type RafflePrizeType = 'item' | 'coins' | 'hybrid' | 'custom';

export interface Raffle {
    id: string;
    itemId: string; 
    itemName: string;
    itemImageUrl: string;
    ticketPrice: number;
    ticketLimitPerUser: number;
    startsAt?: string; 
    endsAt: string; 
    status: 'active' | 'drawing' | 'finished' | 'scheduled' | 'ended' | 'awaiting_draw' | 'winner_defined'; 
    winnerId?: string;
    winnerName?: string;
    winnerAvatar?: string;
    winnerDefinedAt?: string; 
    
    prizeType?: RafflePrizeType;
    coinReward?: number; 
    customRewardText?: string; 
}
  
export interface RaffleTicket {
    id: string;
    raffleId: string;
    userId: string;
    purchasedAt: string;
}
  
export interface JackpotTicket {
    id: string; 
    userId: string;
    userName: string;
    purchasedAt: string;
}

export interface JackpotRound {
    id: string;
    winnerId: string;
    winnerName: string;
    prizeAmount: number;
    drawnAt: string;
    totalTickets: number;
}
