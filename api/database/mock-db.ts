
import * as db from '../mockData';
import { saveToStorage, loadFromStorage, sanitizeLocalStorageDB } from '../persist/localStorage';
import { SanitizeObject, SanitizeUser } from '../../core/sanitizer.core';
import { safeUserId } from '../utils/safeUser';
import { sanitizeMission } from '../quality/sanitizeMission';
import { safeStr, safeArray } from '../../core/sanitizer.core';
import { normalizePlan } from '../subscriptions/normalizePlan';
import { safeReadUser } from './safe-read';
import { ServerLogic } from './server.logic'; // Import ServerLogic

const DB_KEY = 'aw_mock_db_v5_0'; 
const DB_CHECKSUM_KEY = 'aw_mock_db_checksum';

// In-memory logs
const auditLogs: any[] = [];
const telemetryEvents: any[] = [];
const telemetryPremiumEvents: any[] = [];
const anomalies: any[] = [];

const LIMITS = {
    transactions: 200,
    audit: 300,
    telemetry: 400,
    telemetryPremium: 500,
    submissions: 500,
    notifications: 100,
    queueHistory: 200
};

sanitizeLocalStorageDB();

const generateChecksum = (data: any): string => {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return hash.toString();
};

// Hydration Logic (Unchanged for stability)
try {
    const parsed = loadFromStorage(DB_KEY, null);
    const storedChecksum = loadFromStorage(DB_CHECKSUM_KEY, null);
    
    if (parsed) {
        const currentChecksum = generateChecksum(parsed);
        if (storedChecksum && storedChecksum !== currentChecksum) {
            console.warn("[MockDB] Checksum mismatch.");
        }

        if (parsed.users && Array.isArray(parsed.users)) {
             const sanitizedUsers = parsed.users.map((u: any) => {
                 const preSanitized = safeReadUser(u);
                 const sanitized = SanitizeUser(preSanitized);
                 sanitized.plan = normalizePlan(sanitized.plan);
                 return sanitized;
             });
             db.allUsersData.splice(0, db.allUsersData.length, ...sanitizedUsers);
        }
        
        if (parsed.missions && Array.isArray(parsed.missions)) {
             const cleanMissions = parsed.missions.map((m: any) => sanitizeMission(m)).filter(Boolean);
             db.missionsData.splice(0, db.missionsData.length, ...cleanMissions);
        }
        
        if (parsed.queue && Array.isArray(parsed.queue)) {
            const cleanQueue = parsed.queue
                .map((item: any) => ({ ...item, userId: safeUserId(item.userId) }))
                .filter((item: any) => item.userId !== "");
            db.usableItemQueueData.splice(0, db.usableItemQueueData.length, ...cleanQueue);
        }

        if (parsed.transactions) db.coinTransactionsLogData.splice(0, db.coinTransactionsLogData.length, ...parsed.transactions);
        if (parsed.redeemedItems) db.redeemedItemsData.splice(0, db.redeemedItemsData.length, ...parsed.redeemedItems);
        if (parsed.storeItems) db.storeItemsData.splice(0, db.storeItemsData.length, ...parsed.storeItems);
        if (parsed.usableItems) db.usableItemsData.splice(0, db.usableItemsData.length, ...parsed.usableItems);
        if (parsed.coinPacks) db.coinPacksData.splice(0, db.coinPacksData.length, ...parsed.coinPacks);
        if (parsed.coinPurchaseRequests) db.coinPurchaseRequestsData.splice(0, db.coinPurchaseRequestsData.length, ...parsed.coinPurchaseRequests);
        if (parsed.eventMissions) db.eventMissionsData.splice(0, db.eventMissionsData.length, ...parsed.eventMissions);
        if (parsed.eventMissionSubmissions) db.eventMissionSubmissionsData.splice(0, db.eventMissionSubmissionsData.length, ...parsed.eventMissionSubmissions);
        if (parsed.events) db.eventsData.splice(0, db.eventsData.length, ...parsed.events);
        if (parsed.manualEventPointsLog) db.manualEventPointsLogData.splice(0, db.manualEventPointsLogData.length, ...parsed.manualEventPointsLog);
        if (parsed.featuredWinners) db.featuredWinnersData.splice(0, db.featuredWinnersData.length, ...parsed.featuredWinners);
        if (parsed.manualAwards) db.manualAwardsData.splice(0, db.manualAwardsData.length, ...parsed.manualAwards);
        if (parsed.subscriptionRequests) db.subscriptionRequestsData.splice(0, db.subscriptionRequestsData.length, ...parsed.subscriptionRequests);
        if (parsed.subscriptionPlans) db.subscriptionPlansData.splice(0, db.subscriptionPlansData.length, ...parsed.subscriptionPlans);
        if (parsed.auditLogs) auditLogs.push(...parsed.auditLogs);
        if (parsed.telemetryEvents) telemetryEvents.push(...parsed.telemetryEvents);
        if (parsed.telemetryPremiumEvents) telemetryPremiumEvents.push(...parsed.telemetryPremiumEvents);
        if (parsed.anomalies) anomalies.push(...parsed.anomalies);
        if (parsed.advertisements) db.advertisementsData.splice(0, db.advertisementsData.length, ...parsed.advertisements);
        if (parsed.eventSettings) db.eventSettings.artistOfTheDayRotationSeconds = parsed.eventSettings.artistOfTheDayRotationSeconds;
        if (parsed.jackpotData) Object.assign(db.jackpotData, parsed.jackpotData);

        // Queue safety init
        if (!Array.isArray(db.artistOfTheDayQueueData)) (db as any).artistOfTheDayQueueData = [];
        if (!Array.isArray(db.processedArtistOfTheDayQueueHistoryData)) (db as any).processedArtistOfTheDayQueueHistoryData = [];
        if (!Array.isArray(db.usableItemQueueData)) (db as any).usableItemQueueData = [];
        
        console.log("[MockDB] Hydrated.");
    }
} catch (e) {
    console.error("[MockDB] Failed to load persistence", e);
}

let persistTimeout: any;
const PERSIST_DEBOUNCE_MS = 100;

function sanitizeDBLogs(logs: any[]) {
    return safeArray(logs).map((l: any) => {
        const entry = typeof l === 'object' && l !== null ? l : {};
        return {
            ...entry,
            message: safeStr(entry.message),
            detail: safeStr(entry.detail),
        };
    });
}

const persist = () => {
    if (persistTimeout) clearTimeout(persistTimeout);
    persistTimeout = setTimeout(() => {
        try {
            const snapshot = {
                users: db.allUsersData.map(SanitizeUser),
                missions: db.missionsData.map(sanitizeMission).filter(Boolean),
                queue: db.usableItemQueueData,
                transactions: db.coinTransactionsLogData.slice(0, LIMITS.transactions),
                redeemedItems: db.redeemedItemsData,
                storeItems: db.storeItemsData,
                usableItems: db.usableItemsData,
                coinPacks: db.coinPacksData,
                coinPurchaseRequests: db.coinPurchaseRequestsData,
                eventMissions: db.eventMissionsData,
                eventMissionSubmissions: db.eventMissionSubmissionsData,
                manualEventPointsLog: db.manualEventPointsLogData,
                events: db.eventsData,
                featuredWinners: db.featuredWinnersData,
                manualAwards: db.manualAwardsData,
                subscriptionRequests: db.subscriptionRequestsData,
                subscriptionPlans: db.subscriptionPlansData,
                eventSettings: db.eventSettings,
                jackpotData: db.jackpotData,
                auditLogs: sanitizeDBLogs(auditLogs.slice(0, LIMITS.audit)),
                telemetryEvents: sanitizeDBLogs(telemetryEvents.slice(0, LIMITS.telemetry)),
                telemetryPremiumEvents: sanitizeDBLogs(telemetryPremiumEvents.slice(0, LIMITS.telemetryPremium)),
                advertisements: db.advertisementsData,
                anomalies: anomalies.slice(0, 100)
            };
            
            saveToStorage(DB_KEY, snapshot);
            saveToStorage(DB_CHECKSUM_KEY, generateChecksum(snapshot));
        } catch (e) {}
    }, PERSIST_DEBOUNCE_MS);
};

export const saveMockDb = persist;

export const getMockDb = () => db;

// --- RPC IMPLEMENTATION ---
const internalRpc = async (funcName: string, params: any) => {
    // Simulate Network Latency
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Route to ServerLogic
    switch (funcName) {
        case 'add_coins':
            return ServerLogic.add_coins(params.userId, params.amount, params.source);
        case 'spend_coins':
            return ServerLogic.spend_coins(params.userId, params.amount, params.description);
        case 'add_xp':
            return ServerLogic.add_xp(params.userId, params.amount, params.source);
        case 'purchase_item':
            return ServerLogic.purchase_item(params.userId, params.itemId);
        case 'approve_mission':
            return ServerLogic.approve_mission(params.submissionId, params.adminId);
        default:
            throw new Error(`RPC Function not found: ${funcName}`);
    }
};

const internalSelect = (table: string) => {
    // Existing select logic...
    switch(table) {
        case 'users': return db.allUsersData || [];
        case 'missions': return db.missionsData || [];
        case 'queue': return db.usableItemQueueData || []; 
        case 'spotlightQueue': return db.artistOfTheDayQueueData || []; 
        case 'economy': return db.coinTransactionsLogData || [];
        case 'events': return db.eventsData || [];
        case 'transactions': return db.coinTransactionsLogData || [];
        case 'submissions': return db.missionSubmissionsData || [];
        case 'redeemedItems': return db.redeemedItemsData || [];
        case 'storeItems': return db.storeItemsData || [];
        case 'usableItems': return db.usableItemsData || [];
        case 'coinPacks': return db.coinPacksData || [];
        case 'coinPurchaseRequests': return db.coinPurchaseRequestsData || [];
        case 'participations': return db.participationsData || [];
        case 'event_score_log': return db.eventScoreLogData || [];
        case 'eventMissions': return db.eventMissionsData || []; 
        case 'eventMissionSubmissions': return db.eventMissionSubmissionsData || []; 
        case 'manualEventPointsLog': return db.manualEventPointsLogData || []; 
        case 'raffles': return db.rafflesData || [];
        case 'raffleTickets': return db.raffleTicketsData || [];
        case 'achievements': return db.achievementsData || [];
        case 'featuredWinners': return db.featuredWinnersData || [];
        case 'manualAwards': return db.manualAwardsData || [];
        case 'advertisements': return db.advertisementsData || [];
        case 'subscriptionPlans': return db.subscriptionPlansData || [];
        case 'subscriptionRequests': return db.subscriptionRequestsData || [];
        case 'audit': return auditLogs || [];
        case 'telemetry': return telemetryEvents || [];
        case 'telemetryPremiumEvents': return telemetryPremiumEvents || []; 
        case 'anomalies': return anomalies || [];
        default: return [];
    }
};

const internalInsert = (table: string, data: any) => {
     if (!data.id) data.id = `${table.slice(0,3)}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
     const safeData = SanitizeObject(data);

     // Existing insert logic mapping...
     switch(table) {
        case 'missions': db.missionsData.unshift(sanitizeMission(safeData)!); break;
        case 'queue': if (safeUserId(safeData.userId)) db.usableItemQueueData.push(safeData); break;
        case 'users': 
            const userToInsert = SanitizeUser(safeData);
            userToInsert.plan = normalizePlan(userToInsert.plan);
            db.allUsersData.push(userToInsert); 
            break;
        case 'submissions': db.missionSubmissionsData.unshift(safeData); break;
        case 'transactions': db.coinTransactionsLogData.unshift(safeData); break;
        case 'redeemedItems': db.redeemedItemsData.unshift(safeData); break;
        case 'storeItems': db.storeItemsData.unshift(safeData); break;
        case 'usableItems': db.usableItemsData.unshift(safeData); break;
        case 'coinPacks': db.coinPacksData.unshift(safeData); break;
        case 'coinPurchaseRequests': db.coinPurchaseRequestsData.unshift(safeData); break;
        case 'events': db.eventsData.unshift(safeData); break;
        case 'participations': db.participationsData.push(safeData); break;
        case 'event_score_log': db.eventScoreLogData.push(safeData); break;
        case 'eventMissions': db.eventMissionsData.unshift(safeData); break;
        case 'eventMissionSubmissions': db.eventMissionSubmissionsData.unshift(safeData); break;
        case 'manualEventPointsLog': db.manualEventPointsLogData.unshift(safeData); break;
        case 'raffles': db.rafflesData.unshift(safeData); break;
        case 'raffleTickets': db.raffleTicketsData.push(safeData); break;
        case 'notifications': db.notificationsData.unshift(safeData); break;
        case 'advertisements': db.advertisementsData.unshift(safeData); break;
        case 'featuredWinners': db.featuredWinnersData.unshift(safeData); break;
        case 'manualAwards': db.manualAwardsData.unshift(safeData); break;
        case 'subscriptionRequests': db.subscriptionRequestsData.unshift(safeData); break;
        case 'subscriptionPlans': db.subscriptionPlansData.push(safeData); break;
        case 'audit': auditLogs.unshift(safeData); break;
        case 'telemetry': telemetryEvents.unshift(safeData); break;
        case 'telemetryPremiumEvents': telemetryPremiumEvents.unshift(safeData); break;
        case 'anomalies': anomalies.unshift(safeData); break;
     }
     persist(); 
     return safeData;
};

const internalUpdate = (table: string, filter: (item: any) => boolean, updateFn: (item: any) => any) => {
      // Existing update logic...
      let collection: any[] | undefined;
      switch(table) {
          case 'users': collection = db.allUsersData; break;
          case 'missions': collection = db.missionsData; break;
          case 'queue': collection = db.usableItemQueueData; break;
          case 'submissions': collection = db.missionSubmissionsData; break;
          case 'transactions': collection = db.coinTransactionsLogData; break;
          case 'redeemedItems': collection = db.redeemedItemsData; break;
          case 'events': collection = db.eventsData; break;
          case 'storeItems': collection = db.storeItemsData; break;
          case 'usableItems': collection = db.usableItemsData; break;
          case 'coinPacks': collection = db.coinPacksData; break;
          case 'coinPurchaseRequests': collection = db.coinPurchaseRequestsData; break;
          case 'eventMissions': collection = db.eventMissionsData; break;
          case 'eventMissionSubmissions': collection = db.eventMissionSubmissionsData; break;
          case 'raffles': collection = db.rafflesData; break;
          case 'advertisements': collection = db.advertisementsData; break;
          case 'notifications': collection = db.notificationsData; break;
          case 'featuredWinners': collection = db.featuredWinnersData; break;
          case 'manualAwards': collection = db.manualAwardsData; break;
          case 'subscriptionRequests': collection = db.subscriptionRequestsData; break;
          case 'subscriptionPlans': collection = db.subscriptionPlansData; break;
      }
      
      if (collection) {
          let updatedCount = 0;
          for(let i=0; i<collection.length; i++) {
              if (filter(collection[i])) {
                  const newItem = updateFn(collection[i]);
                  if (table === 'users' && newItem.plan) newItem.plan = normalizePlan(newItem.plan);
                  collection[i] = { ...collection[i], ...newItem };
                  updatedCount++;
              }
          }
          if (updatedCount > 0) persist();
      }
};

const internalDelete = (table: string, filter: (item: any) => boolean) => {
      let collection: any[] | undefined;
      switch(table) {
          case 'queue': collection = db.usableItemQueueData; break;
          case 'missions': collection = db.missionsData; break;
          case 'anomalies': collection = anomalies; break;
          case 'users': collection = db.allUsersData; break;
          case 'events': collection = db.eventsData; break;
          case 'participations': collection = db.participationsData; break;
          case 'notifications': collection = db.notificationsData; break;
          case 'transactions': collection = db.coinTransactionsLogData; break;
          case 'storeItems': collection = db.storeItemsData; break;
          case 'usableItems': collection = db.usableItemsData; break;
          case 'coinPacks': collection = db.coinPacksData; break;
          case 'eventMissions': collection = db.eventMissionsData; break;
          case 'raffles': collection = db.rafflesData; break;
          case 'advertisements': collection = db.advertisementsData; break;
          case 'featuredWinners': collection = db.featuredWinnersData; break;
          case 'manualAwards': collection = db.manualAwardsData; break;
          case 'subscriptionRequests': collection = db.subscriptionRequestsData; break;
          case 'subscriptionPlans': collection = db.subscriptionPlansData; break;
      }
      
      if (collection) {
          const initialLen = collection.length;
          const kept = collection.filter(i => !filter(i));
          if (kept.length !== initialLen) {
            collection.length = 0;
            collection.push(...kept);
            persist();
          }
      }
};

export const mockDB = {
  select: internalSelect,
  insert: internalInsert,
  update: internalUpdate,
  delete: internalDelete,
  filter: (table: string, predicate: (item: any) => boolean) => internalSelect(table).filter(predicate),
  
  // Async Methods
  selectAsync: async (table: string) => new Promise(resolve => setTimeout(() => resolve(internalSelect(table)), 20)),
  insertAsync: async (table: string, data: any) => new Promise(resolve => setTimeout(() => resolve(internalInsert(table, data)), 30)),
  updateAsync: async (table: string, filter: (item: any) => boolean, updateFn: (item: any) => any) => new Promise<void>(resolve => {
      setTimeout(() => { internalUpdate(table, filter, updateFn); resolve(); }, 30);
  }),
  deleteAsync: async (table: string, filter: (item: any) => boolean) => new Promise<void>(resolve => {
      setTimeout(() => { internalDelete(table, filter); resolve(); }, 30);
  }),

  // RPC Implementation
  rpc: internalRpc
};
