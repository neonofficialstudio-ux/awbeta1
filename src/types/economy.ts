
import { IconComponent, Metadata } from './shared';
import { UserPlan } from './user';

export type CurrencyType = 'COIN' | 'XP';

export type TransactionSource = 
  | 'mission_completion' 
  | 'daily_check_in' 
  | 'weekly_bonus' 
  | 'level_up_bonus' 
  | 'store_redemption' 
  | 'store_purchase' 
  | 'event_entry' 
  | 'manual_refund' 
  | 'initial_grant' 
  | 'admin_adjustment' 
  | 'artist_link_click' 
  | 'coin_purchase' 
  | 'event_refund' 
  | 'raffle_ticket' 
  | 'raffle_win' 
  | 'achievement_reward' 
  | 'crate_open' 
  | 'crate_reward' 
  | 'jackpot_win' 
  | 'jackpot_entry' 
  | 'production_finish' 
  | 'punishment'
  | 'event_reward'
  | 'unknown';

export type TransactionType = 'earn' | 'spend';

export interface CoinTransaction {
  id: string;
  userId: string;
  date: string;
  dateISO: string;
  description: string;
  amount: number;
  type: TransactionType;
  source: TransactionSource;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  type: CurrencyType;
  amount: number;
  transactionType: TransactionType;
  source: TransactionSource;
  timestamp: number;
  balanceAfter: number;
  metadata?: Metadata;
  description: string;
}

export type SubscriptionEventType = 'UPGRADE' | 'DOWNGRADE' | 'CANCEL' | 'INITIAL';

export interface SubscriptionEvent {
  id: string;
  userId: string;
  userName: string;
  oldPlan: UserPlan | null;
  newPlan: UserPlan;
  changedAt: string;
  eventType: SubscriptionEventType;
  userLevelAtEvent: number;
}

export interface SubscriptionPlan {
  name: string;
  price: string;
  dailyMissions: string;
  features: { text: string; icon: IconComponent }[];
  highlight?: boolean;
  icon?: IconComponent;
  paymentLink?: string;
}

export type SubscriptionRequestStatus = 'pending_payment' | 'awaiting_proof' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled';

export interface SubscriptionRequest {
  id: string;
  userId: string;
  userName: string;
  currentPlan: UserPlan;
  requestedPlan: UserPlan;
  requestedAt: string;
  status: SubscriptionRequestStatus;
  paymentLink?: string;
  proofUrl?: string;
}

export interface CoinPack {
  id: string;
  name: string;
  coins: number;
  price: number;
  paymentLink: string;
  isOutOfStock?: boolean;
  imageUrl?: string;
}

export type CoinPurchaseStatus = 'pending_link_generation' | 'pending_payment' | 'awaiting_proof' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled';

export interface CoinPurchaseRequest {
  id: string;
  userId: string;
  userName: string;
  packId: string;
  packName: string;
  coins: number;
  price: number;
  requestedAt: string;
  status: CoinPurchaseStatus;
  paymentLink?: string;
  proofUrl?: string;
  reviewedAt?: string;
}
