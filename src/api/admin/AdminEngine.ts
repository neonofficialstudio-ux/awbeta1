// api/admin/AdminEngine.ts
import { getRepository } from "../database/repository.factory";
import { LogEngineV4 } from "./logEngineV4";
import { AnomalyScanner } from "./anomalyScanner";
import { EconomyHealthEngine } from "./economyHealthEngine";
import { MissionEngineUnified } from "../missions/MissionEngineUnified";
import { EventEngineUnified } from "../events/EventEngineUnified";
import { QueueEngineV5 } from "../queue/queueEngineV5";
import { EconomyService } from "../economy/economyEngineV6";
import { LedgerEngine } from "../economy/ledgerEngine";
import { approveUpgradeRequest, rejectUpgradeRequest } from "../subscriptions/index";
import { ManualAwardsEngine } from "./manualAwards.engine";
import { AdminAwardsEngine } from "./adminAwards.engine";
import { NotificationDispatcher } from "../../services/notifications/notification.dispatcher";
import { normalizeStoreItem } from "../core/normalizeStoreItem";
import type { 
    Mission, StoreItem, UsableItem, CoinPack, Event, EventMission, FeaturedWinner, 
    Advertisement, SubscriptionPlan, SubmissionStatus, User, PunishmentType 
} from "../../types";
import { updateUserInDb, createNotification } from "../helpers";
import { reviewSubmissionEnhanced } from "../missions/review-engine";
import { applyUserHeals } from "../economy/economyAutoHeal";
import * as SessionRecorder from './sessionRecorder';
import { logMissionEvent } from "../telemetry/missionTelemetry";
import { saveMockDb } from "../database/mock-db";
import * as db from '../mockData';
import { 
    saveRaffle as saveRaffleFn, 
    deleteRaffle as deleteRaffleFn, 
    drawRaffleWinner as drawRaffleWinnerFn, 
    adminSetHighlightedRaffle as adminSetHighlightedRaffleFn,
    adminScheduleJackpot as adminScheduleJackpotFn,
    adminEditJackpot as adminEditJackpotFn,
    adminDrawJackpot as adminDrawJackpotFn,
    adminInjectJackpot as adminInjectJackpotFn,
    fetchJackpotAnalytics as fetchJackpotAnalyticsFn,
    getJackpotDetailedStats as getJackpotDetailedStatsFn
} from "./raffles";
import { adminRunSimulationStep as runSimStep, adminGetSimulationState as getSimState } from "./simulationControls";
import { CacheService } from "../../services/performance/cache.service";
import { SeasonRankingEngine } from "../../services/ranking/seasonRanking.engine";
import { EventClosureEngine } from "../../services/events/eventClosure.engine";
import { UserInspector } from "./userInspector";
import { assertMockProvider } from "../core/backendGuard";

const repo = getRepository();
const ensureMockBackend = (feature: string) => assertMockProvider(`admin.${feature}`);

const AdminAudit = {
    log: (adminId: string, action: string, targetId?: string, details?: any) => {
        LogEngineV4.log({
            action: `ADMIN_AUDIT:${action}`,
            category: 'admin',
            userId: adminId,
            payload: { targetId, details, timestamp: Date.now() }
        });
    }
};

const saveStoreItemHelper = (item: StoreItem) => {
    const safeItem = normalizeStoreItem(item);
    const isUsable = repo.select("usableItems").find((i:any) => i.id === safeItem.id);
    if (isUsable) return { success: false, error: "ID conflict with Usable Item" };

    const existing = repo.select("storeItems").find((i:any) => i.id === safeItem.id);
    if (existing) {
        repo.update("storeItems", (i:any) => i.id === safeItem.id, (i:any) => safeItem);
    } else {
        safeItem.exchanges = 0;
        repo.insert("storeItems", safeItem);
    }
    AdminAudit.log('admin', 'save_store_item', safeItem.id, { name: safeItem.name });
    return { success: true };
};

const saveUsableItemHelper = (item: UsableItem) => {
    const safeItem = normalizeStoreItem(item as StoreItem) as UsableItem;
    const existing = repo.select("usableItems").find((i:any) => i.id === safeItem.id);
    if (existing) {
        repo.update("usableItems", (i:any) => i.id === safeItem.id, (i:any) => safeItem);
    } else {
        repo.insert("usableItems", safeItem);
    }
    return { success: true };
};

const reviewSubmissionFn = async (submissionId: string, status: 'approved' | 'rejected') => {
    const submission = repo.select("submissions").find((s:any) => s.id === submissionId);
    if (!submission || submission.status !== 'pending') return { success: false, error: "Submission not pending" };

    const user = repo.select("users").find((u:any) => u.id === submission.userId);
    const mission = repo.select("missions").find((m:any) => m.id === submission.missionId);

    if (!user || !mission) return { success: false, error: "Data missing" };

    const { updatedUser, notifications } = await reviewSubmissionEnhanced(submission, mission, user, status);
    
    const healed = applyUserHeals(updatedUser);
    updateUserInDb(healed); 
    
    if (status === 'approved') SessionRecorder.recordEvent("mission_approved", { userId: user.id, missionId: mission.id });
    if (status === 'rejected') SessionRecorder.recordEvent("mission_rejected", { userId: user.id, missionId: mission.id });
    logMissionEvent({ timestamp: Date.now(), missionId: mission.id, userId: user.id, action: status === 'approved' ? 'mission_approved' : 'mission_rejected' });

    return { success: true, updatedUser: healed, notifications };
};

// Define helper function for approveAllPendingEventSubmissions
const approveAllPendingEventSubmissionsFn = () => {
     // Implementation for batch event approval if needed
     return { success: true };
};

export const AdminService = {
    
    getUnifiedAwardHistory: () => {
        ensureMockBackend('getUnifiedAwardHistory');
        return AdminAwardsEngine.getUnifiedAwardHistory();
    },

    getDashboardData: () => {
        ensureMockBackend('getDashboardData');
        return CacheService.remember('admin_dashboard_data', 3000, () => {
            const users = [...(repo.select("users") || [])];
            const missions = [...(repo.select("missions") || [])];
            const submissions = [...(repo.select("submissions") || [])];
            const events = [...(repo.select("events") || [])];
            
            const economyHealth = EconomyHealthEngine.getSnapshot();
            const anomalies = AnomalyScanner.runScan();
            
            // Integrated System Health Logic (Migrated from TelemetryEngineV5)
            const logs = repo.select("telemetry") || [];
            const recentErrors = logs.filter((l: any) => l.category === 'error' && l.timestamp > Date.now() - 3600000);
            const systemHealth = {
                status: recentErrors.length > 10 ? 'degraded' : 'healthy',
                errorCountLastHour: recentErrors.length,
                uptime: 100,
                lastUpdate: new Date().toISOString()
            };

            const recentLogs = LogEngineV4.getLogs({ limit: 50 });

            const subscriptionHistory = users.flatMap((u: any) => 
                (u.subscriptionHistory || []).map((h: any) => ({...h, userName: u.name}))
            ).sort((a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

            const subscriptionStats: Record<string, number> = {};
            users.forEach((u: any) => {
                if (u.plan) subscriptionStats[u.plan] = (subscriptionStats[u.plan] || 0) + 1;
            });

            const unifiedAwards = AdminAwardsEngine.getUnifiedAwardHistory();

            return {
                missions,
                allUsers: users,
                missionSubmissions: submissions,
                usableItemQueue: [...(repo.select("queue") || [])],
                artistOfTheDayQueue: [],
                redeemedItems: [...(repo.select("redeemedItems") || [])],
                events,
                participations: [...(repo.select("participations") || [])],
                storeItems: [...(repo.select("storeItems") || [])],
                usableItems: [...(repo.select("usableItems") || [])],
                coinPacks: [...(repo.select("coinPacks") || [])],
                coinPurchaseRequests: [...(repo.select("coinPurchaseRequests") || [])],
                eventMissions: [...(repo.select("eventMissions") || [])],
                eventMissionSubmissions: [...(repo.select("eventMissionSubmissions") || [])],
                manualEventPointsLog: [...(repo.select("manualEventPointsLog") || [])],
                raffles: [...(repo.select("raffles") || [])],
                allTickets: [...(repo.select("raffleTickets") || [])],
                advertisements: [...(repo.select("advertisements") || [])],
                subscriptionPlans: [...(repo.select("subscriptionPlans") || [])],
                subscriptionRequests: [...(repo.select("subscriptionRequests") || [])],
                
                economyHealth,
                anomalies,
                systemHealth,
                recentLogs,
                subscriptionHistory,
                subscriptionStats,
                unifiedAwards,
                
                processedItemQueueHistory: db.processedItemQueueHistoryData || [],
                processedArtistOfTheDayQueueHistory: db.processedArtistOfTheDayQueueHistoryData || [],
                behaviorLog: (repo.select("telemetry") || []).filter((e: any) => e.category === 'security'),
                allTransactions: repo.select("transactions") || [],
                
                artistsOfTheDayIds: db.artistsOfTheDayIdsData || [],
                artistCarouselDuration: db.artistCarouselDurationData || 10,
                highlightedRaffleId: db.highlightedRaffleIdData || null,
            };
        });
    },

    missions: {
        save: (...args: any[]) => { ensureMockBackend('missions.save'); return MissionEngineUnified.saveMission(...args as [any]); },
        saveBatch: (...args: any[]) => { ensureMockBackend('missions.saveBatch'); return MissionEngineUnified.saveBatch(...args as [any]); },
        delete: (...args: any[]) => { ensureMockBackend('missions.delete'); return MissionEngineUnified.deleteMission(...args as [any]); },
        reviewSubmission: (submissionId: string, status: 'approved' | 'rejected') => {
             // Invalidate cache
             ensureMockBackend('missions.reviewSubmission');
             CacheService.invalidate('admin_dashboard_data');
             return reviewSubmissionFn(submissionId, status);
        },
        editSubmissionStatus: (...args: any[]) => { ensureMockBackend('missions.editSubmissionStatus'); return MissionEngineUnified.editSubmissionStatus(...args as [any]); },
        approveAllPending: () => {
            ensureMockBackend('missions.approveAllPending');
            const pending = repo.select("submissions").filter((s:any) => s.status === 'pending');
            let approvedCount = 0;
            pending.forEach((sub:any) => {
                reviewSubmissionFn(sub.id, 'approved');
                approvedCount++;
            });
            CacheService.invalidate('admin_dashboard_data');
            return { success: true, count: approvedCount };
        },
        listAll: (...args: any[]) => { ensureMockBackend('missions.listAll'); return MissionEngineUnified.listAll(...args as [any]); },
        getSnapshot: (...args: any[]) => { ensureMockBackend('missions.getSnapshot'); return MissionEngineUnified.getSnapshot(...args as [any]); },
        setFeatured: (id: string | null) => {
            ensureMockBackend('missions.setFeatured');
            db.setFeaturedMissionIdData(id);
            LogEngineV4.log({ action: "set_featured_mission", category: "admin", payload: { id } });
            return { success: true };
        }
    },

    // --- STORE MANAGEMENT ---
    store: {
        saveStoreItem: (item: StoreItem) => { ensureMockBackend('store.saveStoreItem'); const res = saveStoreItemHelper(item); CacheService.invalidate('admin_dashboard_data'); return res; },
        deleteStoreItem: (id: string) => { ensureMockBackend('store.deleteStoreItem'); repo.delete("storeItems", (i:any) => i.id === id); CacheService.invalidate('admin_dashboard_data'); return { success: true }; },
        toggleStoreItemStock: (id: string) => { ensureMockBackend('store.toggleStoreItemStock'); const item = repo.select("storeItems").find((i:any) => i.id === id); if (item) { repo.update("storeItems", (i:any) => i.id === id, (i:any) => ({ ...item, isOutOfStock: !i.isOutOfStock })); } return { success: true }; },
        saveUsableItem: (item: UsableItem) => { ensureMockBackend('store.saveUsableItem'); return saveUsableItemHelper(item); },
        deleteUsableItem: (id: string) => { ensureMockBackend('store.deleteUsableItem'); repo.delete("usableItems", (i:any) => i.id === id); return { success: true }; },
        toggleUsableItemStock: (id: string) => { ensureMockBackend('store.toggleUsableItemStock'); const item = repo.select("usableItems").find((i:any) => i.id === id); if (item) { repo.update("usableItems", (i:any) => i.id === id, (i:any) => ({ ...item, isOutOfStock: !i.isOutOfStock })); } return { success: true }; },
        saveCoinPack: (pack: CoinPack) => { ensureMockBackend('store.saveCoinPack');
             const existing = repo.select("coinPacks").find((p:any) => p.id === pack.id);
            if (existing) {
                repo.update("coinPacks", (p:any) => p.id === pack.id, (p:any) => pack);
            } else {
                repo.insert("coinPacks", { ...pack, id: pack.id || `cp-${Date.now()}` });
            }
            return { success: true, packages: repo.select("coinPacks") };
        },
        deleteCoinPack: (id: string) => { ensureMockBackend('store.deleteCoinPack');
             repo.delete("coinPacks", (p:any) => p.id === id);
             return { success: true, packages: repo.select("coinPacks") };
        },
        toggleCoinPackStock: (id: string) => { ensureMockBackend('store.toggleCoinPackStock');
             const pack = repo.select("coinPacks").find((p:any) => p.id === id);
             if(pack) {
                 repo.update("coinPacks", (p:any) => p.id === id, (p:any) => ({...pack, isOutOfStock: !p.isOutOfStock}));
             }
             return { success: true };
        },
        setEstimatedCompletionDate: (itemId: string, date: string) => { ensureMockBackend('store.setEstimatedCompletionDate');
            if (!date) return { success: false };
            repo.update("redeemedItems", (r:any) => r.id === itemId, (r:any) => ({ ...r, estimatedCompletionDate: date }));
            return { success: true };
        }
    },

    // --- QUEUE ---
    queue: {
        processQueueItem: (id: string) => {
            ensureMockBackend('queue.processQueueItem');
            QueueEngineV5.processItem(id);
            return { success: true };
        },
        processArtistOfTheDayQueueItem: (id: string) => {
            ensureMockBackend('queue.processArtistOfTheDayQueueItem');
            const queue = repo.select("spotlightQueue");
            const itemIndex = queue.findIndex((i:any) => i.id === id);
            
            if (itemIndex > -1) {
                const item = queue[itemIndex];
                const currentIds = db.artistsOfTheDayIdsData;
                if (!currentIds.includes(item.userId)) {
                    db.setArtistsOfTheDayIdsData([...currentIds, item.userId]);
                }
                db.processedArtistOfTheDayQueueHistoryData.push({
                     ...item,
                     processedAt: new Date().toISOString()
                });
                repo.delete("spotlightQueue", (i:any) => i.id === id);
                return { success: true };
            }
            return { success: false };
        }
    },

    // --- SUBSCRIPTIONS ---
    subscriptions: {
        approveSubscriptionRequest: (id: string) => { ensureMockBackend('subscriptions.approveSubscriptionRequest'); return approveUpgradeRequest(id); },
        rejectSubscriptionRequest: (id: string) => { ensureMockBackend('subscriptions.rejectSubscriptionRequest'); return rejectUpgradeRequest(id); }
    },

    // --- EVENTS ---
    events: {
        saveEvent: (event: Event) => {
             ensureMockBackend('events.saveEvent');
             const res = EventEngineUnified.saveEvent(event);
             CacheService.invalidate('admin_dashboard_data');
             return res;
        },
        deleteEvent: (id: string) => {
             ensureMockBackend('events.deleteEvent');
             const res = EventEngineUnified.deleteEvent(id);
             CacheService.invalidate('admin_dashboard_data');
             return res;
        },
        saveEventMission: (m: EventMission) => { ensureMockBackend('events.saveEventMission'); return EventEngineUnified.saveEventMission(m); },
        deleteEventMission: (missionId: string) => { 
            ensureMockBackend('events.deleteEventMission');
            const m = repo.select("eventMissions").find((m:any) => m.id === missionId);
            if (!m) return { success: false, error: "Mission not found" };
            return EventEngineUnified.deleteEventMission(m.eventId, missionId);
        },
        reviewEventMission: (...args: any[]) => { ensureMockBackend('events.reviewEventMission'); return EventEngineUnified.reviewEventMission(...args as [any]); },
        approveAllPendingEventSubmissions: () => { ensureMockBackend('events.approveAllPendingEventSubmissions'); return approveAllPendingEventSubmissionsFn(); },
    },

    // --- RAFFLES ---
    raffles: {
        saveRaffle: (...args: any[]) => { ensureMockBackend('raffles.saveRaffle'); return saveRaffleFn(...args as [any]); },
        deleteRaffle: (...args: any[]) => { ensureMockBackend('raffles.deleteRaffle'); return deleteRaffleFn(...args as [any]); },
        drawRaffleWinner: (...args: any[]) => { ensureMockBackend('raffles.drawRaffleWinner'); return drawRaffleWinnerFn(...args as [any]); },
        adminSetHighlightedRaffle: (...args: any[]) => { ensureMockBackend('raffles.adminSetHighlightedRaffle'); return adminSetHighlightedRaffleFn(...args as [any]); }
    },

    // --- JACKPOT ---
    jackpot: {
        adminDrawJackpot: (...args: any[]) => { ensureMockBackend('jackpot.adminDrawJackpot'); return adminDrawJackpotFn(...args as [any]); },
        adminInjectJackpot: (...args: any[]) => { ensureMockBackend('jackpot.adminInjectJackpot'); return adminInjectJackpotFn(...args as [any]); },
        adminEditJackpot: (...args: any[]) => { ensureMockBackend('jackpot.adminEditJackpot'); return adminEditJackpotFn(...args as [any]); },
        fetchJackpotAnalytics: (...args: any[]) => { ensureMockBackend('jackpot.fetchJackpotAnalytics'); return fetchJackpotAnalyticsFn(...args as [any]); },
        adminScheduleJackpot: (...args: any[]) => { ensureMockBackend('jackpot.adminScheduleJackpot'); return adminScheduleJackpotFn(...args as [any]); },
        getDetailedStats: (...args: any[]) => { ensureMockBackend('jackpot.getDetailedStats'); return getJackpotDetailedStatsFn(...args as [any]); }
    },
    
    // --- UTILS ---
    manualRefund: async (itemId: string) => {
        ensureMockBackend('manualRefund');
        const redeemed = repo.select("redeemedItems").find((r:any) => r.id === itemId);
        if (!redeemed || redeemed.status === 'Refunded') return { success: false };
        
        const user = repo.select("users").find((u:any) => u.id === redeemed.userId);
        if (!user) return { success: false };

        const ecoRes = await EconomyService.addCoins(user.id, redeemed.itemPrice, `Reembolso: ${redeemed.itemName}`);
        
        repo.update("redeemedItems", (r:any) => r.id === itemId, (r:any) => ({
            ...r, 
            status: 'Refunded',
            coinsAfter: ecoRes.updatedUser!.coins 
        }));

        return { success: true };
    },
    
    completeVisualReward: (itemId: string, completionUrl?: string) => {
        ensureMockBackend('completeVisualReward');
        const redeemed = repo.select("redeemedItems").find((r:any) => r.id === itemId);
        if (!redeemed) return { success: false };
        
        repo.update("redeemedItems", (r:any) => r.id === itemId, (r:any) => ({
            ...r,
            status: 'Used',
            completedAt: new Date().toISOString(),
            completionUrl: completionUrl // Save the URL if provided
        }));
        
        const notif = createNotification(redeemed.userId, "Pedido Concluído", `Seu item "${redeemed.itemName}" está pronto! ${completionUrl ? 'Acesse o link na sua aba de Histórico.' : ''}`, { view: 'inventory', tab: 'history' });
        repo.insert("notifications", notif);

        return { success: true };
    },
    
    createMissionFromQueue: (queueId: string, mission: Mission) => {
        ensureMockBackend('createMissionFromQueue');
        const queueItem = repo.select("queue").find((q:any) => q.id === queueId);
        if (!queueItem) return { success: false, error: "Item not found" };

        const newMission = {
            ...mission,
            id: `m-custom-${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        
        repo.insert("missions", newMission);
        repo.delete("queue", (q:any) => q.id === queueId); // Remove from queue as it became a mission
        
        return { success: true, mission: newMission };
    },
    
    convertQueueItemToMission: (queueId: string) => {
         ensureMockBackend('convertQueueItemToMission');
         // Auto-conversion logic placeholder
         return { success: true };
    },
    
    // ... existing exports ...
    setArtistsOfTheDay: (ids: string[]) => {
        ensureMockBackend('setArtistsOfTheDay');
        db.setArtistsOfTheDayIdsData(ids);
        return { success: true };
    },
    
    setArtistCarouselDuration: (duration: number) => {
        ensureMockBackend('setArtistCarouselDuration');
        db.setArtistCarouselDurationData(duration);
        return { success: true };
    },
    
    addManualEventPoints: (userId: string, eventId: string, points: number, reason: string) => {
        ensureMockBackend('addManualEventPoints');
        EventEngineUnified.addEventPoints(userId, eventId, points, reason);
        return { success: true };
    },

    saveSubscriptionPlan: (plan: SubscriptionPlan) => {
        ensureMockBackend('saveSubscriptionPlan');
        const existing = repo.select("subscriptionPlans").find((p:any) => p.name === plan.name);
        if (existing) {
            repo.update("subscriptionPlans", (p:any) => p.name === plan.name, (p:any) => plan);
        } else {
            repo.insert("subscriptionPlans", plan);
        }
        return { success: true };
    },
    
    saveAdvertisement: (ad: Advertisement) => {
        ensureMockBackend('saveAdvertisement');
        if (!ad.id) ad.id = `ad-${Date.now()}`;
        const existing = repo.select("advertisements").find((a:any) => a.id === ad.id);
        if (existing) {
            repo.update("advertisements", (a:any) => a.id === ad.id, (a:any) => ad);
        } else {
            repo.insert("advertisements", ad);
        }
        return { success: true };
    },
    
    deleteAdvertisement: (id: string) => {
        ensureMockBackend('deleteAdvertisement');
        repo.delete("advertisements", (a:any) => a.id === id);
        return { success: true };
    },
    
    updateTerms: (content: string) => {
        ensureMockBackend('updateTerms');
        db.setTermsAndConditionsContentData(content);
        // Persist setting if we had a settings table, for now in-memory variable mock
        return { success: true };
    },
    
    adminSubmitPaymentLink: (requestId: string, link: string) => {
        ensureMockBackend('adminSubmitPaymentLink');
        // Implementation
         const requests = repo.select("coinPurchaseRequests");
         const requestIndex = requests.findIndex((r: any) => r.id === requestId);
         if (requestIndex > -1) {
             requests[requestIndex].paymentLink = link;
             requests[requestIndex].status = 'pending_payment';
             return { success: true };
         }
         return { success: false };
    },
    
    reviewCoinPurchase: async (requestId: string, status: 'approved' | 'rejected') => {
        ensureMockBackend('reviewCoinPurchase');
        const requests = repo.select("coinPurchaseRequests");
        const requestIndex = requests.findIndex((r: any) => r.id === requestId);
        if (requestIndex === -1) return { success: false };
        
        const req = requests[requestIndex];
        req.status = status;
        
        if (status === 'approved') {
            await EconomyService.addCoins(req.userId, req.coins, `Compra de Pacote: ${req.packName}`);
            // Notification handled by EconomyService or add manual
        }
        
        return { success: true };
    },
    
    sendAdminNotification: (payload: { title: string; message: string; isGlobal: boolean; targetUserIds?: string[] }) => {
        ensureMockBackend('sendAdminNotification');
        const { title, message, isGlobal, targetUserIds } = payload;
        
        // This usually goes to "adminNotifications" table which users pull from
        const notif = {
            id: `an-${Date.now()}`,
            title,
            message,
            createdAt: new Date().toISOString(),
            isGlobal,
            targetUserIds
        };
        // Mock doesn't have explicit table exposed in repo always, assume db.adminNotificationsData
        // We'll use repo insert if available or direct db
        db.adminNotificationsData.push(notif);
        
        return { success: true };
    },

    saveFeaturedWinner: (winner: FeaturedWinner) => { ensureMockBackend('saveFeaturedWinner'); return AdminAwardsEngine.add(winner); },
    deleteFeaturedWinner: (id: string) => {
         ensureMockBackend('deleteFeaturedWinner');
         // This deletes from legacy list or unified? Usually legacy list in DB
         repo.delete("featuredWinners", (w:any) => w.id === id);
         return { success: true };
    },
    
    adminRunSimulationStep: (stepName: any, payload?: any) => { ensureMockBackend('adminRunSimulationStep'); return runSimStep(stepName, payload); },
    adminGetSimulationState: () => { ensureMockBackend('adminGetSimulationState'); return getSimState(); },
    
    // --- USERS & SYSTEM ---
    adminUpdateUser: (user: User) => {
        ensureMockBackend('adminUpdateUser');
        const result = updateUserInDb(user);
        return { success: true, updatedUser: result };
    },
    
    punishUser: async (payload: { userId: string; type: PunishmentType; reason: string; durationDays?: number; deduction?: { coins?: number; xp?: number; } }) => {
        ensureMockBackend('punishUser');
        const { userId, type, reason, deduction } = payload;
        const user = repo.select("users").find((u:any)=>u.id===userId);
        if(!user) return { success: false };
        
        let updatedUser = { ...user };
        
        // Economy Deduction
        if (deduction) {
            if (deduction.coins) await EconomyService.spendCoins(userId, deduction.coins, `Punição: ${reason}`);
            // Manual XP deduct
            if (deduction.xp) updatedUser.xp = Math.max(0, updatedUser.xp - deduction.xp);
        }
        
        // Ban Status
        if (type === 'temp_ban' || type === 'perm_ban') {
            updatedUser.isBanned = true;
            updatedUser.banReason = reason;
            if (type === 'temp_ban' && payload.durationDays) {
                updatedUser.banExpiresAt = new Date(Date.now() + payload.durationDays * 24 * 60 * 60 * 1000).toISOString();
            }
        }
        
        // Log
        const punishment = { id: `pun-${Date.now()}`, type, reason, date: new Date().toISOString(), deduction, durationDays: payload.durationDays };
        updatedUser.punishmentHistory = [punishment, ...(updatedUser.punishmentHistory || [])];
        
        updateUserInDb(updatedUser);
        return { success: true };
    },
    
    unbanUser: async (userId: string) => {
        ensureMockBackend('unbanUser');
        repo.update("users", (u:any)=>u.id===userId, (u:any)=>({ ...u, isBanned: false, banReason: null, banExpiresAt: null }));
        return { success: true };
    },
    
    resetMonthlyRanking: () => {
        ensureMockBackend('resetMonthlyRanking');
        SeasonRankingEngine.resetSeason();
        return { success: true };
    },
    
    fetchUserHistory: (userId: string) => { ensureMockBackend('fetchUserHistory'); return UserInspector.getFullProfile(userId); },
    
    createManualAward: (...args: any[]) => { ensureMockBackend('createManualAward'); return ManualAwardsEngine.createAward(...args as [any]); },
    
    adminDeliverEventPrizes: async (payload: { eventId: string, winners: any[], prizes: any, adminId: string }) => {
        ensureMockBackend('adminDeliverEventPrizes');
        // Logic to distribute prizes based on manual confirmation
        const { eventId, winners, prizes, adminId } = payload;
        
        for (const w of winners) {
            const config = w.passType === 'vip' ? prizes.vip : prizes.normal;
            
            // Economy
            if (config.coins > 0) await EconomyService.addCoins(w.userId, config.coins, `Event Prize: ${eventId}`);
            if (config.xp > 0) await EconomyService.addXP(w.userId, config.xp, `Event Prize: ${eventId}`);
            
            // Item (if configured)
            if (config.itemId) {
                ManualAwardsEngine.createAward({
                    userId: w.userId,
                    adminId,
                    type: 'item',
                    itemId: config.itemId,
                    eventId
                });
            }
        }
        
        // Mark event as closed
        EventClosureEngine.closeEvent(eventId);
        
        return { success: true };
    }
};

// Export as AdminEngine for consistency
export const AdminEngine = AdminService;

// Legacy Export for Compatibility
export const AdminEngineV7 = AdminService;
