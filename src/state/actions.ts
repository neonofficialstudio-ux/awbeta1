import type { User, Mission, Event, RankingUser, QueueItem, Toast, AdminTab, StoreTab, InventoryTab, AdminNotification, JackpotTicket, JackpotRound } from '../types';
import { EventSession, ArenaStatus, EventLiveFeedItem } from '../types/event';
import { MissionDefinition } from '../api/missions/missions.db';
import { RankingSession, EventRankingEntry } from '../types/ranking';
import type { AppState, JackpotState } from './state.types';

export type Action =
  // --- Legacy / UI Actions ---
  | { type: 'SET_VIEW'; payload: string } // View type
  | { type: 'LOGIN'; payload: { user: User; notifications: any[]; unseenAdminNotifications: AdminNotification[] } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_ADMIN_STATUS'; payload: boolean | null }
  | { type: 'ADD_NOTIFICATIONS', payload: any[] }
  | { type: 'SET_LEDGER'; payload: any[] }
  | { type: 'REMOVE_NOTIFICATION', payload: string }
  | { type: 'MARK_NOTIFICATION_READ', payload: { id: string } }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'SET_WELCOME_MODAL_VISIBILITY', payload: boolean }
  | { type: 'SET_ADMIN_TAB', payload: { tab: AdminTab; subTab?: string } }
  | { type: 'SET_STORE_TAB', payload: StoreTab }
  | { type: 'SET_INVENTORY_TAB', payload: InventoryTab }
  | { type: 'SET_UNSEEN_ADMIN_NOTIFICATIONS', payload: AdminNotification[] }
  | { type: 'ANIMATION_COMPLETE' }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: { id: string } }
  | { type: 'SET_EVENT_SESSION'; payload: EventSession | null }
  | { type: 'UPDATE_EVENT_MISSION_PROGRESS'; payload: { missionId: string, completed: boolean } }
  | { type: 'SET_RANKING_SESSION'; payload: RankingSession | null }
  | { type: 'UPDATE_RANKING_DELTAS'; payload: Record<string, number> }
  | { type: 'SET_QUEUE'; payload: QueueItem[] }
  | { type: 'ADD_QUEUE_ITEM'; payload: QueueItem }
  | { type: 'UPDATE_QUEUE_STATUS'; payload: { id: string; status: QueueItem['status'] } }
  | { type: 'SYNC_QUEUE' }
  | { type: 'SET_WEEKLY_MISSIONS'; payload: MissionDefinition[] }
  | { type: 'SET_EVENT_MISSIONS'; payload: MissionDefinition[] }
  | { type: 'SET_DASHBOARD_SNAPSHOT'; payload: any }
  | { type: 'SYNC_DASHBOARD'; payload: string }
  | { type: 'SET_RANKING_GLOBAL'; payload: RankingUser[] }
  | { type: 'SET_RANKING_ECONOMY'; payload: RankingUser[] }
  | { type: 'SET_RANKING_MISSIONS'; payload: RankingUser[] }
  | { type: 'RANKING_SYNC_EVENT'; payload: EventRankingEntry[] }
  | { type: 'EVENT_SET_ARENA_STATUS'; payload: ArenaStatus }
  | { type: 'EVENT_ADD_FEED_ITEM'; payload: EventLiveFeedItem }
  | { type: 'EVENT_CLEAR_FEED' }
  | { type: 'EVENT_UPDATE_SESSION'; payload: EventSession | null }
  | { type: 'EVENT_SET_ACTIVE'; payload: Event | null }
  
  // V8.4
  | { type: 'REFRESH_EVENT_SETTINGS'; payload: AppState['eventSettings'] }

  // V9.1
  | { type: 'SET_JACKPOT_DATA'; payload: JackpotState }

  // --- New Engine Actions (Aliases for MasterSync) ---
  | { type: 'ECONOMY_SYNC'; payload: { coins: number; xp: number; level: number } }
  | { type: 'MISSIONS_SYNC_WEEKLY'; payload: MissionDefinition[] }
  | { type: 'RANKING_SYNC_GLOBAL'; payload: RankingUser[] }
  | { type: 'QUEUE_SYNC'; payload: QueueItem[] };
