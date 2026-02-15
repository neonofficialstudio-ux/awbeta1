import type { User, Mission, Event, RankingUser, QueueItem, AdminNotification, Toast, StoreTab, InventoryTab, AdminTab, JackpotTicket, JackpotRound, SubscriptionRequest, SubscriptionEvent } from '../types';
import { EventSession, ArenaStatus, EventLiveFeedItem } from '../types/event';
import { MissionDefinition } from '../api/missions/missions.db';
import { RankingSession, EventRankingEntry } from '../types/ranking';

export type JackpotState =
  | {
      currentValue: number;
      ticketPrice: number;
      nextDraw: string;
      tickets: JackpotTicket[];
      history: JackpotRound[];
      status: 'active' | 'in_apuration' | 'waiting_start';
      nextStartDate?: string;
      ticketLimits?: { global?: number; perUser?: number };
    }
  | { disabled: true; message: string };

export interface AppState {
  // --- Core State (Legacy Compatibility) ---
  currentView: string; // View type
  activeUser: User | null;
  isAdmin: boolean | null;
  notifications: any[]; // Notification type
  ledger: any[];
  showWelcomeModal: boolean;
  prevCoins: number | null;
  prevXp: number | null;
  
  // --- Admin State ---
  adminActiveTab: AdminTab;
  adminMissionsInitialSubTab: string;
  adminStoreInitialSubTab: any; // AdminStoreTab
  adminQueuesInitialSubTab: string;
  adminSettingsInitialSubTab: string;
  adminEconomyInitialSubTab: 'console' | 'pro';
  adminUsersInitialSubTab: 'list' | 'metrics' | 'leads';
  adminSubscriptionsInitialSubTab: 'plans' | 'requests';
  unseenAdminNotifications: AdminNotification[];

  // --- UI State ---
  storeInitialTab: StoreTab;
  inventoryInitialTab: InventoryTab;
  toasts: Toast[];
  
  // --- Engine States ---
  eventSession: EventSession | null;
  rankingSession: RankingSession | null;
  queue: QueueItem[];
  
  // --- Data Cache ---
  missionsWeekly: MissionDefinition[];
  missionsEvent: MissionDefinition[];
  dashboardSnapshot: any | null;
  
  // V8.4
  eventSettings: { artistOfTheDayRotationSeconds?: number };

  // --- Ranking V5 ---
  rankingGlobal: RankingUser[];
  rankingEconomy: RankingUser[];
  rankingMissions: RankingUser[];
  rankingEvent: EventRankingEntry[];

  // --- Events V7 ---
  events: {
      activeEvent: Event | null;
      session: EventSession | null;
      allEvents: Event[];
      arenaStatus: ArenaStatus | null;
      liveFeed: EventLiveFeedItem[];
  };

  // --- Jackpot V9.1 ---
  jackpotData: JackpotState | null;

  // V1.4 Subscription State (Flat)
  upgradeRequests: SubscriptionRequest[];
  subscriptionEvents: SubscriptionEvent[];
  subscriptionUsers: User[];
}
