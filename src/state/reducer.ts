import { AppState } from './state.types';
import { Action } from './actions';
import { normalizeActiveUser } from './normalizers';

export const initialState: AppState = {
  currentView: 'dashboard',
  activeUser: null,
  isAdmin: null,
  notifications: [],
  ledger: [],
  showWelcomeModal: false,
  prevCoins: null,
  prevXp: null,
  adminActiveTab: 'dashboard',
  adminMissionsInitialSubTab: 'manage',
  adminStoreInitialSubTab: 'visual',
  adminQueuesInitialSubTab: 'items',
  adminSettingsInitialSubTab: 'advertisements',
  storeInitialTab: 'redeem',
  inventoryInitialTab: 'visual',
  unseenAdminNotifications: [],
  toasts: [],
  eventSession: null,
  rankingSession: null,
  queue: [],
  missionsWeekly: [],
  missionsEvent: [],
  dashboardSnapshot: null,
  eventSettings: {},
  rankingGlobal: [],
  rankingEconomy: [],
  rankingMissions: [],
  rankingEvent: [],
  events: {
      activeEvent: null,
      session: null,
      allEvents: [],
      arenaStatus: null,
      liveFeed: []
  },
  jackpotData: null, // V9.1

  // V1.4 Subscription State
  upgradeRequests: [],
  subscriptionEvents: [],
  subscriptionUsers: []
};

export const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    // --- UI / Navigation ---
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_ADMIN_STATUS':
      return { ...state, isAdmin: action.payload };
    case 'SET_ADMIN_TAB':
      return {
        ...state,
        currentView: 'admin',
        adminActiveTab: action.payload.tab,
        adminMissionsInitialSubTab: action.payload.tab === 'missions' && action.payload.subTab ? action.payload.subTab : state.adminMissionsInitialSubTab,
        adminStoreInitialSubTab: action.payload.tab === 'store' && action.payload.subTab ? action.payload.subTab : state.adminStoreInitialSubTab,
        adminQueuesInitialSubTab: action.payload.tab === 'queues' && action.payload.subTab ? action.payload.subTab : state.adminQueuesInitialSubTab,
        adminSettingsInitialSubTab: action.payload.tab === 'settings' && action.payload.subTab ? action.payload.subTab : state.adminSettingsInitialSubTab,
      };
    case 'SET_STORE_TAB':
      return { ...state, currentView: 'store', storeInitialTab: action.payload };
    case 'SET_INVENTORY_TAB':
      return { ...state, currentView: 'inventory', inventoryInitialTab: action.payload };
      
    // --- Auth / User ---
    case 'LOGIN':
      const loginUser = normalizeActiveUser(action.payload.user);
      return { 
          ...state, 
          activeUser: loginUser, 
          isAdmin: null,
      notifications: Array.isArray(action.payload.notifications)
        ? action.payload.notifications
        : [],
      unseenAdminNotifications: Array.isArray(action.payload.unseenAdminNotifications)
        ? action.payload.unseenAdminNotifications
        : [],
          prevCoins: 0, 
          prevXp: 0, 
          eventSession: loginUser?.eventSession || null,
          events: { ...state.events, session: loginUser?.eventSession || null }
      };
    case 'LOGOUT':
      localStorage.removeItem('authToken');
      return { ...initialState, activeUser: null };
    case 'UPDATE_USER':
    case 'SET_USER': {
      const updatedUser = normalizeActiveUser(action.payload);
      if (!updatedUser) return state;

      const newPrevCoins = (state.activeUser?.coins !== undefined && state.activeUser?.coins !== updatedUser.coins) 
            ? state.activeUser.coins 
            : (state.prevCoins !== null ? state.prevCoins : updatedUser.coins);
            
      const newPrevXp = (state.activeUser?.xp !== undefined && state.activeUser?.xp !== updatedUser.xp) 
            ? state.activeUser.xp 
            : (state.prevXp !== null ? state.prevXp : updatedUser.xp);

      return { 
          ...state, 
          activeUser: updatedUser, 
          prevCoins: newPrevCoins, 
          prevXp: newPrevXp,
          eventSession: updatedUser.eventSession || state.eventSession,
          events: { ...state.events, session: updatedUser.eventSession || state.events.session }
      };
    }

    // --- Economy Engine Integration ---
    case 'ECONOMY_SYNC':
       if (!state.activeUser) return state;
       return {
           ...state,
           prevCoins: state.activeUser.coins, 
           prevXp: state.activeUser.xp,
           activeUser: {
               ...state.activeUser,
               coins: action.payload.coins,
               xp: action.payload.xp,
               level: action.payload.level
           }
       };

    // --- Notifications & Modals ---
    case 'ADD_NOTIFICATIONS': {
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      const current = Array.isArray(state.notifications) ? state.notifications : [];
      return { ...state, notifications: [...incoming, ...current] };
    }
    case 'SET_LEDGER': {
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      return { ...state, ledger: incoming };
    }
    case 'REMOVE_NOTIFICATION': {
      const safeNotifications = Array.isArray(state.notifications)
        ? state.notifications
        : [];
      return {
        ...state,
        notifications: safeNotifications.filter(n => n.id !== action.payload),
      };
    }
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: (Array.isArray(state.notifications) ? state.notifications : []).map(n =>
          n.id === action.payload.id ? { ...n, read: true } : n
        ),
      };
    case 'MARK_ALL_NOTIFICATIONS_READ':
        return {
          ...state,
          notifications: (Array.isArray(state.notifications) ? state.notifications : []).map(n => ({
            ...n,
            read: true,
          })),
        };
    case 'SET_WELCOME_MODAL_VISIBILITY':
      return { ...state, showWelcomeModal: action.payload };
    case 'SET_UNSEEN_ADMIN_NOTIFICATIONS':
      return {
        ...state,
        unseenAdminNotifications: Array.isArray(action.payload) ? action.payload : [],
      };
    case 'ANIMATION_COMPLETE':
      if (state.activeUser) {
        return { ...state, prevCoins: state.activeUser.coins, prevXp: state.activeUser.xp };
      }
      return state;
    case 'ADD_TOAST':
        return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
        return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload.id) };

    // --- Events ---
    case 'SET_EVENT_SESSION':
        return { ...state, eventSession: action.payload };
    case 'UPDATE_EVENT_MISSION_PROGRESS':
        if (state.eventSession) {
            return {
                ...state,
                eventSession: {
                    ...state.eventSession,
                    progress: {
                        ...state.eventSession.progress,
                        [action.payload.missionId]: action.payload.completed
                    }
                }
            };
        }
        return state;
    case 'EVENT_SET_ARENA_STATUS':
        return { ...state, events: { ...state.events, arenaStatus: action.payload } };
    case 'EVENT_ADD_FEED_ITEM':
        return { ...state, events: { ...state.events, liveFeed: [action.payload, ...state.events.liveFeed].slice(0, 10) } };
    case 'EVENT_CLEAR_FEED':
        return { ...state, events: { ...state.events, liveFeed: [] } };
    case 'EVENT_UPDATE_SESSION':
        return { ...state, events: { ...state.events, session: action.payload } };
    case 'EVENT_SET_ACTIVE':
        return { ...state, events: { ...state.events, activeEvent: action.payload } };
        
    // --- Ranking ---
    case 'SET_RANKING_SESSION':
        return { ...state, rankingSession: action.payload };
    case 'UPDATE_RANKING_DELTAS':
        if (state.rankingSession) {
            return {
                ...state,
                rankingSession: {
                    ...state.rankingSession,
                    deltas: { ...state.rankingSession.deltas, ...action.payload }
                }
            };
        }
        return state;
    case 'SET_RANKING_GLOBAL':
    case 'RANKING_SYNC_GLOBAL':
        return { ...state, rankingGlobal: action.payload };
    case 'SET_RANKING_ECONOMY':
        return { ...state, rankingEconomy: action.payload };
    case 'SET_RANKING_MISSIONS':
        return { ...state, rankingMissions: action.payload };
    case 'RANKING_SYNC_EVENT':
        return { ...state, rankingEvent: action.payload };

    // --- Queue ---
    case 'SET_QUEUE':
    case 'QUEUE_SYNC':
        return { ...state, queue: action.payload };
    case 'ADD_QUEUE_ITEM':
        return { ...state, queue: [...state.queue, action.payload] };
    case 'UPDATE_QUEUE_STATUS':
        return {
            ...state,
            queue: state.queue.map(item => 
                item.id === action.payload.id ? { ...item, status: action.payload.status } : item
            )
        };
    case 'SYNC_QUEUE':
        return state;

    // --- Missions ---
    case 'SET_WEEKLY_MISSIONS':
    case 'MISSIONS_SYNC_WEEKLY':
        return { ...state, missionsWeekly: action.payload };
    case 'SET_EVENT_MISSIONS':
        return { ...state, missionsEvent: action.payload };
        
    // --- Dashboard ---
    case 'SET_DASHBOARD_SNAPSHOT':
        return { ...state, dashboardSnapshot: action.payload };
    case 'SYNC_DASHBOARD':
        return state;

    // --- Admin ---
    case 'REFRESH_EVENT_SETTINGS':
        return {
          ...state,
          eventSettings: action.payload || {},
        };

    // --- Jackpot V9.1 ---
    case 'SET_JACKPOT_DATA':
        return { ...state, jackpotData: action.payload };

    default:
      return state;
  }
};
