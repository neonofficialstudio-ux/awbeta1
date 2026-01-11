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
import { assertMockProvider, isSupabaseProvider } from "../core/backendGuard";
import { config } from "../../core/config";
import { supabaseAdminRepository, emptyAdminDashboard, type AdminMissionFilter } from "../supabase/supabase.repositories.admin";
import { reviewSubmissionSupabase } from "../supabase/admins/missions";
import { getSupabase } from "../supabase/client";

// Missions scope in DB is restricted by constraint missions_scope_check:
// allowed: 'weekly' | 'event'
const normalizeMissionScope = (value: any): 'weekly' | 'event' => {
    const s = String(value ?? '').toLowerCase().trim();
    if (s === 'event') return 'event';
    // Anything else (including 'global', 'daily', '', null) => 'weekly'
    return 'weekly';
};

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

    getDashboardData: async () => {
        if (config.backendProvider === 'supabase') {
            try {
                const response = await supabaseAdminRepository.fetchAdminDashboard();
                if (!response?.success) {
                    console.error('[AdminEngine] Supabase dashboard fetch failed', response?.error);
                }
                return response?.data || emptyAdminDashboard;
            } catch (err) {
                console.error('[AdminEngine] getDashboardData supabase path failed', err);
                return emptyAdminDashboard;
            }
        }
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
    fetchAdminMissions: async (filter: AdminMissionFilter = 'active') => {
        if (config.backendProvider === 'supabase') {
            const response = await supabaseAdminRepository.fetchAdminMissions(filter);
            if (!response?.success) {
                console.error('[AdminEngine] fetchAdminMissions supabase failed', response?.error);
            }
            return response || { success: false, missions: [], submissions: [], error: 'Unknown error' };
        }
        ensureMockBackend('fetchAdminMissions');
        const allMissions = repo.select("missions") || [];
        const filteredMissions = filter === 'all'
            ? allMissions
            : allMissions.filter((m: any) => {
                const isActive = m.isActive ?? m.active ?? m.status === 'active';
                return filter === 'active' ? isActive : !isActive || m.status === 'expired';
            });
        return {
            success: true,
            missions: filteredMissions,
            submissions: repo.select("submissions") || [],
        };
    },
    fetchHallOfFame: async () => {
        if (config.backendProvider === 'supabase') {
            const response = await supabaseAdminRepository.fetchAdminHallOfFame();
            if (!response?.success) {
                console.error('[AdminEngine] fetchHallOfFame supabase failed', response?.error);
            }
            return response?.entries || [];
        }
        ensureMockBackend('fetchHallOfFame');
        return repo.select("transactions") || [];
    },
    fetchAdminStats: async () => {
        if (config.backendProvider === 'supabase') {
            const response = await supabaseAdminRepository.fetchAdminStats();
            if (!response?.success) {
                console.error('[AdminEngine] fetchAdminStats supabase failed', response?.error);
            }
            return response?.stats || null;
        }
        ensureMockBackend('fetchAdminStats');
        return null;
    },

    missions: {
        save: async (mission: any) => {
            if (isSupabaseProvider()) {
                try {
                    // UPDATE
                    if (mission.id) {
                        const safeMission = {
                            ...mission,
                            scope: normalizeMissionScope(mission.scope ?? mission.type),
                        };

                        const response = await supabaseAdminRepository.missions.update(
                            mission.id,
                            safeMission
                        );

                        if (!response.success) {
                            console.error('[AdminEngine] missions.update failed', response.error);
                        }
                        return response;
                    }

                    // CREATE
                    const safeMission = { ...mission, scope: normalizeMissionScope(mission.scope ?? mission.type) };
                    const response = await supabaseAdminRepository.missions.create(safeMission);
                    if (!response.success) {
                        console.error('[AdminEngine] missions.create failed', response.error);
                    }
                    return response;
                } catch (err) {
                    console.error('[AdminEngine] missions.save supabase failed', err);
                    return { success: false, error: err instanceof Error ? err.message : 'Erro ao salvar missão' };
                }
            }

            return MissionEngineUnified.saveMission(mission);
        },
        saveBatch: (...args: any[]) => { ensureMockBackend('missions.saveBatch'); return MissionEngineUnified.saveBatch(...args as [any]); },
        delete: async (missionId: string) => {
            if (isSupabaseProvider()) {
                try {
                    const response = await supabaseAdminRepository.missions.delete(missionId);
                    if (!response?.success) {
                        console.error('[AdminEngine] missions.delete supabase failed', response?.error);
                    }
                    return response;
                } catch (err) {
                    console.error('[AdminEngine] missions.delete supabase path failed', err);
                    return { success: false, error: err instanceof Error ? err.message : 'Supabase delete missão falhou' };
                }
            }
            ensureMockBackend('missions.delete');
            return MissionEngineUnified.deleteMission(missionId);
        },
        reviewSubmission: (submissionId: string, status: 'approved' | 'rejected') => {
             // Invalidate cache
             CacheService.invalidate('admin_dashboard_data');
             if (config.backendProvider === 'supabase') {
                return reviewSubmissionSupabase(submissionId, status);
             }
             ensureMockBackend('missions.reviewSubmission');
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
        saveStoreItem: async (item: StoreItem) => {
            if (!isSupabaseProvider()) {
                ensureMockBackend('store.saveStoreItem');
                const res = saveStoreItemHelper(item);
                CacheService.invalidate('admin_dashboard_data');
                return res;
            }

            const supabase = getSupabase();
            if (!supabase) throw new Error("[AdminStore] Supabase client not initialized");

            // ✅ gera ID uma vez e injeta no próprio objeto para evitar duplo insert
            const stableId =
                item?.id && typeof item.id === 'string' && item.id.length >= 10
                    ? item.id
                    : crypto.randomUUID();

            (item as any).id = stableId;

            // ✅ normaliza rarity para passar no check constraint do banco
            const normalizeRarity = (v: any): 'Regular' | 'Rare' | 'Epic' | 'Legendary' => {
                const raw = String(v ?? '').trim();

                // já válido?
                if (raw === 'Regular' || raw === 'Rare' || raw === 'Epic' || raw === 'Legendary') return raw;

                const s = raw.toLowerCase();

                // aceita PT-BR e variações
                if (s.includes('lend') || s.includes('legend')) return 'Legendary';
                if (s.includes('ép') || s.includes('epi')) return 'Epic';
                if (s.includes('rar') || s.includes('rare')) return 'Rare';

                return 'Regular';
            };

            const row = {
                id: stableId,
                name: item.name?.trim() || 'Item sem nome',
                description: item.description ?? '',
                price_coins: Number(item.price ?? 0),
                rarity: normalizeRarity(item.rarity),
                image_url: item.imageUrl ?? '',
                item_type: 'visual',
                is_active: true,
                meta: {
                    ...(item as any).meta,
                    previewUrl: (item as any).previewUrl ?? undefined,
                    exchanges: Number((item as any).exchanges ?? 0),
                    isOutOfStock: Boolean((item as any).isOutOfStock ?? false),
                }
            };

            // upsert pelo id (cria/edita)
            const { data, error } = await supabase
                .from('store_items')
                .upsert(row, { onConflict: 'id' })
                .select('*')
                .single();

            if (error) throw error;

            CacheService.invalidate('admin_dashboard_data');
            return { success: true, item: data };
        },

        deleteStoreItem: async (id: string) => {
            if (!isSupabaseProvider()) {
                ensureMockBackend('store.deleteStoreItem');
                repo.delete("storeItems", (i:any) => i.id === id);
                CacheService.invalidate('admin_dashboard_data');
                return { success: true };
            }

            const supabase = getSupabase();
            if (!supabase) throw new Error("[AdminStore] Supabase client not initialized");

            const { error } = await supabase
                .from('store_items')
                .delete()
                .eq('id', id);

            if (error) throw error;

            CacheService.invalidate('admin_dashboard_data');
            return { success: true };
        },

        toggleStoreItemStock: async (id: string) => {
            if (!isSupabaseProvider()) {
                ensureMockBackend('store.toggleStoreItemStock');
                const item = repo.select("storeItems").find((i:any) => i.id === id);
                if (item) repo.update("storeItems", (i:any) => i.id === id, (i:any) => ({ ...item, isOutOfStock: !i.isOutOfStock }));
                CacheService.invalidate('admin_dashboard_data');
                return { success: true };
            }

            const supabase = getSupabase();
            if (!supabase) throw new Error("[AdminStore] Supabase client not initialized");

            // lê meta atual pra alternar isOutOfStock
            const { data: current, error: readErr } = await supabase
                .from('store_items')
                .select('id, meta')
                .eq('id', id)
                .single();

            if (readErr) throw readErr;

            const meta = (current?.meta ?? {}) as any;
            const next = { ...meta, isOutOfStock: !Boolean(meta.isOutOfStock) };

            const { error: updErr } = await supabase
                .from('store_items')
                .update({ meta: next })
                .eq('id', id);

            if (updErr) throw updErr;

            CacheService.invalidate('admin_dashboard_data');
            return { success: true };
        },

        // (mantém os outros como mock por enquanto)
        saveUsableItem: async (item: UsableItem) => {
          if (!isSupabaseProvider()) {
            ensureMockBackend('store.saveUsableItem');
            return saveUsableItemHelper(item);
          }

          const supabase = getSupabase();
          if (!supabase) throw new Error("[AdminUsable] Supabase client not initialized");

          const stableId =
            item?.id && typeof item.id === 'string' && item.id.length >= 10
              ? item.id
              : crypto.randomUUID();

          (item as any).id = stableId;

          const row = {
            id: stableId,
            name: item.name?.trim() || 'Item utilizável',
            description: item.description ?? '',
            price_coins: Number(item.price ?? 0),
            rarity: 'Regular',
            image_url: item.imageUrl ?? '',
            item_type: 'usable',
            is_active: true,
            meta: {
              platform: item.platform ?? 'all',
              isOutOfStock: Boolean(item.isOutOfStock ?? false),
            }
          };

          const { data, error } = await supabase
            .from('store_items')
            .upsert(row, { onConflict: 'id' })
            .select('*')
            .single();

          if (error) throw error;

          CacheService.invalidate('admin_dashboard_data');
          return { success: true, item: data };
        },
        deleteUsableItem: async (id: string) => {
          if (!isSupabaseProvider()) {
            ensureMockBackend('store.deleteUsableItem');
            repo.delete("usableItems", (i:any) => i.id === id);
            return { success: true };
          }

          const supabase = getSupabase();
          if (!supabase) throw new Error("[AdminUsable] Supabase client not initialized");

          const { error } = await supabase.from('store_items').delete().eq('id', id);
          if (error) throw error;

          CacheService.invalidate('admin_dashboard_data');
          return { success: true };
        },
        toggleUsableItemStock: async (id: string) => {
          if (!isSupabaseProvider()) {
            ensureMockBackend('store.toggleUsableItemStock');
            const item = repo.select("usableItems").find((i:any) => i.id === id);
            if (item) repo.update("usableItems", (i:any) => i.id === id, (i:any) => ({ ...item, isOutOfStock: !i.isOutOfStock }));
            return { success: true };
          }

          const supabase = getSupabase();
          if (!supabase) throw new Error("[AdminUsable] Supabase client not initialized");

          const { data: current, error: readErr } = await supabase
            .from('store_items')
            .select('id, meta')
            .eq('id', id)
            .single();
          if (readErr) throw readErr;

          const meta = (current?.meta ?? {}) as any;
          const next = { ...meta, isOutOfStock: !Boolean(meta.isOutOfStock) };

          const { error: updErr } = await supabase
            .from('store_items')
            .update({ meta: next })
            .eq('id', id);
          if (updErr) throw updErr;

          CacheService.invalidate('admin_dashboard_data');
          return { success: true };
        },

        saveCoinPack: (pack: CoinPack) => { ensureMockBackend('store.saveCoinPack'); /* mantém mock */ return { success: false, error: 'mock_only' }; },
        deleteCoinPack: (id: string) => { ensureMockBackend('store.deleteCoinPack'); return { success: false, error: 'mock_only' }; },
        toggleCoinPackStock: (id: string) => { ensureMockBackend('store.toggleCoinPackStock'); return { success: false, error: 'mock_only' }; },

        setEstimatedCompletionDate: (itemId: string, date: string) => { ensureMockBackend('store.setEstimatedCompletionDate'); return { success: false, error: 'mock_only' }; }
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
    saveRaffle: (...args: any[]) => {
      if (!isSupabaseProvider()) ensureMockBackend('raffles.saveRaffle');
      const res = saveRaffleFn(...args as [any]);
      CacheService.invalidate('admin_dashboard_data');
      return res;
    },

    deleteRaffle: (...args: any[]) => {
      if (!isSupabaseProvider()) ensureMockBackend('raffles.deleteRaffle');
      const res = deleteRaffleFn(...args as [any]);
      CacheService.invalidate('admin_dashboard_data');
      return res;
    },

    drawRaffleWinner: (...args: any[]) => {
      if (!isSupabaseProvider()) ensureMockBackend('raffles.drawRaffleWinner');
      const res = drawRaffleWinnerFn(...args as [any]);
      CacheService.invalidate('admin_dashboard_data');
      return res;
    },

    adminSetHighlightedRaffle: (...args: any[]) => {
      if (!isSupabaseProvider()) ensureMockBackend('raffles.adminSetHighlightedRaffle');
      const res = adminSetHighlightedRaffleFn(...args as [any]);
      CacheService.invalidate('admin_dashboard_data');
      return res;
    }
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
