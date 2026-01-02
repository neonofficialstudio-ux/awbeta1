// api/events/EventEngineUnified.ts
import * as db from "../mockData";
import { getRepository } from "../database/repository.factory";
import { withLatency, createNotification, updateUserInDb } from "../helpers";
import { LogEngineV4 } from "../admin/logEngineV4";
import { saveMockDb } from "../database/mock-db";
import { EventRankingEngineV5 } from "../../services/events/eventRanking.engine";
import { LiveArenaEngine } from "./liveArenaEngine";
import { EventSessionEngine } from "./session";
import { EconomyEngineV6 } from "../economy/economyEngineV6";
import { NotificationDispatcher } from "../../services/notifications/notification.dispatcher";
import type { User, Event, Notification, EventMission, EventMissionSubmission } from "../../types";
import { SanityGuard } from "../../services/sanity.guard";
import { EventClosureEngine } from "../../services/events/eventClosure.engine";
import { TelemetryPremium } from "../telemetry/telemetryPremium";
import { AtomicLock } from "../security/atomicLock";
import { DiagnosticCore } from "../../services/diagnostic.core";
import { applyContentRules } from "../quality/contentRules"; // Updated path
import { checkLinkSafety } from "../quality/linkSafety";
import { SanitizeString, SanitizeLink } from "../../core/sanitizer.core";
import { EventSync } from "../../services/events/event.sync";
import { LedgerEngine } from "../economy/ledger.engine"; // Updated path
import { TelemetryPRO } from "../../services/telemetry.pro";

const repo = getRepository();

/**
 * EVENT ENGINE UNIFICADA
 * Centraliza:
 * - Criação/Edição/Exclusão de Eventos
 * - Missões de Evento
 * - Submissões
 * - Ranking
 * - Status (ativo, encerrado, futuro)
 * - Apuração e premiação
 */
export const EventEngineUnified = {

    // ===============================================================
    // INTERNAL LOGIC (Formerly V7)
    // ===============================================================
    
    _joinEventLogic: async (userId: string, eventId: string, cost: number, isGolden: boolean) => {
        // V2.1 Premium Telemetry
        TelemetryPremium.track("event_view", userId, { eventId });

        // Phase 3: Atomic Lock
        if (!AtomicLock.lock(`event_join:${userId}`)) {
            return { success: false, error: "Inscrição em andamento. Aguarde." };
        }

        try {
            let user = repo.select("users").find((u: any) => u.id === userId);
            let event = repo.select("events").find((e: any) => e.id === eventId);
            
            if (!user || !event) throw new Error("User or Event not found");
            
            user = SanityGuard.user(user);
            event = SanityGuard.event(event);

            if (user.joinedEvents.includes(eventId)) {
                return { success: false, error: "Você já está participando deste evento.", updatedUser: user };
            }

            if (!LiveArenaEngine.checkAvailability(eventId)) {
                return { success: false, error: "Evento lotado. Tente novamente mais tarde.", updatedUser: user };
            }

            // Process Economy (Deduct Coins) - V6 Engine
            const ecoResult = await EconomyEngineV6.spendCoins(userId, cost, `Inscrição: ${event.title} ${isGolden ? '(Golden)' : ''}`);
            
            if (!ecoResult.success || !ecoResult.updatedUser) {
                return { success: false, error: ecoResult.error || "Erro no pagamento", updatedUser: user };
            }

            // Register Participation
            const participation = {
                id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                userId,
                eventId,
                joinedAt: new Date().toISOString(),
                isGolden
            };
            repo.insert("participations", participation);

            // Create and Persist Event Session
            const passType = isGolden ? 'vip' : 'normal';
            const session = EventSessionEngine.startEventSession(userId, eventId, passType);

            // Update User State (Joined Events List)
            let updatedUser = { ...ecoResult.updatedUser };
            updatedUser.joinedEvents = [...updatedUser.joinedEvents, eventId];
            updatedUser.eventSession = session;
            
            updatedUser = updateUserInDb(updatedUser);

            // Force Sync to ensure UI updates immediately
            EventSync.start(eventId, userId, null); 

            // Notifications & Telemetry
            const msg = isGolden 
                ? `Golden Pass adquirido! Você entrou na arena VIP de "${event.title}".` 
                : `Você entrou na arena de "${event.title}". Boa sorte!`;
                
            const notification = NotificationDispatcher.eventUpdate(userId, 'Inscrição Confirmada', msg);
            
            TelemetryPRO.event("event_join", { userId, eventId, isGolden, cost });
            DiagnosticCore.record('event', { action: 'user_joined', eventId, userId, isGolden }, userId);
            
            // V2.1 Join Tracking
            TelemetryPremium.track("event_join", userId, { eventId, isGolden });

            return { 
                success: true, 
                updatedUser: SanityGuard.user(updatedUser), 
                participation, 
                notifications: [notification]
            };

        } catch (e: any) {
            return { success: false, error: e.message || "Erro ao processar inscrição.", updatedUser: null }; 
        } finally {
            AtomicLock.unlock(`event_join:${userId}`);
        }
    },

    _saveEventLogic: (event: Event) => {
        const existing = repo.select("events").find((e: any) => e.id === event.id);
        const safeEvent = SanityGuard.event(event);
        
        if (existing) {
            repo.update("events", (e: any) => e.id === event.id, (e: any) => safeEvent);
            DiagnosticCore.record('event', { action: 'updated', eventId: event.id, title: event.title }, 'admin');
        } else {
            repo.insert("events", safeEvent);
            DiagnosticCore.record('event', { action: 'created', eventId: event.id, title: event.title }, 'admin');
        }
        return { success: true, event: safeEvent };
    },

    _deleteEventLogic: (eventId: string) => {
        repo.delete("events", (e: any) => e.id === eventId);
        repo.delete("participations", (p: any) => p.eventId === eventId);
        repo.delete("eventMissions", (m: any) => m.eventId === eventId);
        repo.delete("eventMissionSubmissions", (s: any) => s.eventId === eventId);
        
        DiagnosticCore.record('event', { action: 'deleted', eventId }, 'admin');
        return { success: true };
    },

    _saveEventMissionLogic: (mission: EventMission) => {
         const existing = repo.select("eventMissions").find((m: any) => m.id === mission.id);
         const missionData = { ...mission, requiresReview: true };
         
         if (existing) {
             repo.update("eventMissions", (m: any) => m.id === mission.id, (m: any) => missionData);
         } else {
             repo.insert("eventMissions", missionData);
         }
         DiagnosticCore.record('event', { action: 'save_mission', missionId: mission.id, eventId: mission.eventId }, 'admin');
         return { success: true };
    },

    _deleteEventMissionLogic: (eventId: string, missionId: string) => {
        repo.delete("eventMissions", (m: any) => m.id === missionId);
        DiagnosticCore.record('event', { action: 'delete_mission', missionId, eventId }, 'admin');
        return { success: true };
    },

    _submitEventMissionLogic: (userId: string, eventId: string, missionId: string, proofDataUrl: string) => {
        const safeProof = SanitizeString(proofDataUrl);
        const sanitizedProof = safeProof.startsWith('data:') ? safeProof : SanitizeLink(safeProof);
        
        if (!sanitizedProof) throw new Error("Prova inválida.");

        const rulesCheck = applyContentRules({ proof: sanitizedProof }, userId);
        if (!rulesCheck.ok) throw new Error(rulesCheck.reason);

        if (!sanitizedProof.startsWith('data:')) {
            const safetyCheck = checkLinkSafety(sanitizedProof);
            if (!safetyCheck.safe) throw new Error(safetyCheck.reason);
        }

        const user = repo.select("users").find((u: any) => u.id === userId);
        const eventMission = repo.select("eventMissions").find((m: any) => m.id === missionId);
        
        if (!user || !eventMission) throw new Error("Usuário ou missão não encontrados.");
        if (eventMission.eventId !== eventId) throw new Error("Inconsistência de evento.");

        const existing = repo.select("eventMissionSubmissions").find((s: any) => s.userId === userId && s.eventMissionId === missionId && s.status !== 'rejected');
        if (existing) throw new Error("Missão já enviada ou pendente.");

        const newSubmission: EventMissionSubmission = {
            id: `ems-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, 
            userId, 
            eventMissionId: missionId, 
            eventId: eventMission.eventId, 
            userName: user.name, 
            userAvatar: user.avatarUrl, 
            missionTitle: eventMission.title, 
            submittedAtISO: new Date().toISOString(), 
            proofUrl: sanitizedProof, 
            status: 'pending',
            rewardGiven: false
        };
        
        repo.insert("eventMissionSubmissions", newSubmission);
        
        const updatedUser = { ...user, pendingEventMissions: [...user.pendingEventMissions, missionId] };
        updateUserInDb(updatedUser);

        DiagnosticCore.record('mission', { action: 'event_submission', missionId, eventId }, userId);

        const notifications: Notification[] = [
            NotificationDispatcher.eventUpdate(userId, "Missão Enviada", "Sua prova foi enviada para análise da organização.")
        ];
        
        // V2.1 Premium Telemetry
        TelemetryPremium.track("mission_sent", userId, { missionId, eventId });

        return { success: true, newSubmission, updatedUser, notifications };
    },

    _reviewEventMissionLogic: async (submissionId: string, status: 'approved' | 'rejected') => {
        const subIndex = db.eventMissionSubmissionsData.findIndex(s => s.id === submissionId);
        if (subIndex === -1) throw new Error("Submissão não encontrada");
        
        const sub = db.eventMissionSubmissionsData[subIndex];
        if (sub.status === status) return { success: true, message: "Already processed" };

        const user = db.allUsersData.find(u => u.id === sub.userId);
        const mission = db.eventMissionsData.find(m => m.id === sub.eventMissionId);
        const participation = db.participationsData.find(p => p.userId === sub.userId && p.eventId === sub.eventId);

        if (!user || !mission) throw new Error("Dados corrompidos (Usuário ou Missão não encontrados)");

        let updatedUser = user;
        const notifications: Notification[] = [];

        if (status === 'approved') {
            if (sub.rewardGiven === true) {
                db.eventMissionSubmissionsData[subIndex].status = 'approved'; 
                return { updatedUser: user, notifications: [] };
            }

            const rewardId = `evt_reward_${sub.eventId}_${mission.id}_${user.id}`;
            const ledger = LedgerEngine.getLedgerHistory(user.id);
            const alreadyRewardedLedger = ledger.some(t => t.metadata?.rewardId === rewardId);

            if (alreadyRewardedLedger) {
                db.eventMissionSubmissionsData[subIndex].status = 'approved';
                db.eventMissionSubmissionsData[subIndex].rewardGiven = true; 
                return { updatedUser: user, notifications: [] };
            }

            let finalPoints = mission.points;
            if (participation && participation.isGolden) {
                finalPoints = Math.floor(mission.points * 1.5);
            }
            
            // Economy Engine V6 for XP (Atomic)
            const ecoResult = await EconomyEngineV6.addXP(user.id, mission.xp, `Event Mission: ${mission.title}`);
            updatedUser = ecoResult.updatedUser!;
            
            db.eventScoreLogData.push({
                id: `esl-${Date.now()}`,
                userId: user.id,
                eventId: sub.eventId,
                eventMissionId: sub.eventMissionId,
                pointsGained: finalPoints,
                timestamp: new Date().toISOString()
            });

            // Record Explicit Event Reward in Ledger
            LedgerEngine.recordTransaction(
                user.id, 'XP', 0, 'earn', 'event_reward', `Event Points: ${finalPoints}`, updatedUser.xp,
                { rewardId, eventId: sub.eventId, points: finalPoints }
            );
            
            notifications.push(createNotification(user.id, "Missão de Evento Aprovada!", `Você ganhou ${mission.xp} XP e ${finalPoints} Pontos de Ranking na missão "${mission.title}".`));
            
            db.eventMissionSubmissionsData[subIndex].status = 'approved';
            db.eventMissionSubmissionsData[subIndex].rewardGiven = true; 
            
            updatedUser.pendingEventMissions = updatedUser.pendingEventMissions.filter(id => id !== mission.id);
            updatedUser.completedEventMissions.push(mission.id);

        } else {
            db.eventMissionSubmissionsData[subIndex].status = 'rejected';
            notifications.push(createNotification(user.id, "Missão de Evento Rejeitada", `Sua comprovação para "${mission.title}" não foi aceita. Tente novamente.`));
            updatedUser.pendingEventMissions = updatedUser.pendingEventMissions.filter(id => id !== mission.id);
        }

        const finalUser = updateUserInDb(updatedUser);
        db.notificationsData.unshift(...notifications);

        return { updatedUser: finalUser, notifications };
    },

    // ===============================================================
    // PUBLIC API
    // ===============================================================

    createEvent: (payload: any) => withLatency(() => {
        const evt = EventEngineUnified._saveEventLogic(payload);
        saveMockDb();
        return evt;
    }),

    updateEvent: (payload: any) => withLatency(() => {
        const evt = EventEngineUnified._saveEventLogic(payload);
        saveMockDb();
        return evt;
    }),

    deleteEvent: (eventId: string) => withLatency(() => {
        const res = EventEngineUnified._deleteEventLogic(eventId);
        saveMockDb();
        return res;
    }),

    saveEvent: (payload: any) => withLatency(() => {
        const evt = EventEngineUnified._saveEventLogic(payload);
        saveMockDb();
        return evt;
    }),

    saveEventMission: (m: any) => withLatency(() => {
        const out = EventEngineUnified._saveEventMissionLogic(m);
        saveMockDb();
        return out;
    }),

    deleteEventMission: (eventId: string, id: string) => withLatency(() => {
        const out = EventEngineUnified._deleteEventMissionLogic(eventId, id);
        saveMockDb();
        return out;
    }),

    submitEventProof: (payload: { userId: string, eventId: string, missionId: string, proofDataUrl: string }) => withLatency(() => {
        const out = EventEngineUnified._submitEventMissionLogic(payload.userId, payload.eventId, payload.missionId, payload.proofDataUrl);
        saveMockDb();
        return out;
    }),

    // wrapper for legacy signature compatibility
    submitEventMission: (userId: string, eventId: string, missionId: string, proofDataUrl: string) => withLatency(() => {
         const out = EventEngineUnified._submitEventMissionLogic(userId, eventId, missionId, proofDataUrl);
         saveMockDb();
         return out;
    }),

    reviewEventSubmission: (id: string, status: "approved" | "rejected") => withLatency(async () => {
        const out = await EventEngineUnified._reviewEventMissionLogic(id, status);
        saveMockDb();
        return out;
    }),

    // Wrapper for Admin Panel compatibility
    reviewEventMission: async (id: string, status: "approved" | "rejected") => {
        const out = await EventEngineUnified._reviewEventMissionLogic(id, status);
        saveMockDb();
        return out;
    },

    getEventStatus: (eventId: string) => withLatency(() => {
        const evt = repo.select("events").find((e:any) => e.id === eventId);
        if (!evt) return null;

        if (evt.status === 'closed') return 'finished';
        
        const now = Date.now();
        const date = new Date(evt.date).getTime();

        if (now > date && evt.status !== 'closed') return "finished"; 
        if (evt.status === 'future') return "future";
        
        return "active";
    }),

    addEventPoints: (userId: string, eventId: string, points: number, reason: string) => withLatency(() => {
        repo.insert("event_score_log", {
            id: `esl-manual-${Date.now()}`,
            userId,
            eventId,
            eventMissionId: 'manual_admin',
            pointsGained: points,
            timestamp: new Date().toISOString()
        });
        
        repo.insert("manualEventPointsLog", {
            id: `mepl-${Date.now()}`,
            adminId: 'admin',
            adminName: 'Admin',
            userId,
            userName: repo.select("users").find((u:any)=>u.id === userId)?.name || userId,
            eventId,
            eventName: repo.select("events").find((e:any)=>e.id === eventId)?.title || eventId,
            pointsAdded: points,
            reason,
            timestamp: new Date().toISOString()
        });
        
        NotificationDispatcher.systemInfo(userId, "Pontos de Evento", `Você recebeu ${points} pontos manuais no evento. Motivo: ${reason}`);
        saveMockDb();
        return { success: true };
    }),

    getEventRanking: (eventId: string) => withLatency(() => {
        return EventRankingEngineV5.getEventRanking(eventId);
    }),

    finalizeEvent: (eventId: string, winners: any[]) => withLatency(() => {
        LogEngineV4.log({ action: "finalize_event", category: "admin", payload: { eventId } });

        const evt = repo.select("events").find((e:any) => e.id === eventId);
        if (!evt) return { success: false, error: "Event not found" };

        const updated = {
            ...evt,
            status: "closed",
            closedAt: new Date().toISOString(),
            winners
        };
        repo.update("events", (e:any) => e.id === eventId, (e:any) => updated);

        saveMockDb();
        return { success: true, event: updated };
    }),

    fetchEventsData: (userId: string) => withLatency(() => {
        return {
            events: repo.select("events"),
            allUsers: repo.select("users"),
            featuredWinners: db.featuredWinnersData, 
            participations: repo.select("participations"),
            eventMissions: db.eventMissionsData, 
            eventMissionSubmissions: db.eventMissionSubmissionsData.filter(s => s.userId === userId),
            eventScoreLog: db.eventScoreLogData,
        };
    }),

    joinEvent: (userId: string, eventId: string, cost: number, isGolden: boolean = false) => withLatency(async () => {
        const result = await EventEngineUnified._joinEventLogic(userId, eventId, cost, isGolden);
        saveMockDb();
        return result;
    }),

    fetchArtistsOfTheDayFull: () => withLatency(() => {
        const ids = db.artistsOfTheDayIdsData;
        if (!Array.isArray(ids)) return [];
        const users = repo.select("users") as User[];
        return ids
            .map(id => users.find(u => u.id === id))
            .filter(Boolean)
            .map(u => {
                const safeUser = SanityGuard.user(u);
                return {
                    ...safeUser,
                    links: {
                        spotify: safeUser.spotifyUrl || '',
                        instagram: safeUser.instagramUrl || '',
                        youtube: safeUser.youtubeUrl || ''
                    }
                };
            });
    }),
    
    fetchArtistOfTheDayConfig: () => {
        const sec = db.eventSettings?.artistOfTheDayRotationSeconds;
        return {
            rotationSeconds: (typeof sec === 'number' && sec > 0) ? sec : (db.artistCarouselDurationData || 10)
        };
    },

    claimArtistOfDayReward: (userId: string, artistId: string) => withLatency(async () => {
        const ecoResult = await EconomyEngineV6.addCoins(userId, 1, `Exploração: Artista do Dia`);
        saveMockDb();
        return { success: true, updatedUser: ecoResult.updatedUser };
    }),

    artistLinkClick: (userId: string, artistId: string, linkType: 'spotify' | 'youtube') => withLatency(() => {
        const user = repo.select("users").find((u:any) => u.id === userId);
        return { reward: false, coinsGained: 0, updatedUser: user, notifications: [] };
    }),

    markArtistOfTheDayAsSeen: (userId: string, announcementId: string) => withLatency(() => {
        const user = repo.select("users").find((u:any) => u.id === userId);
        if(user) {
            const updatedUser = { ...user, seenArtistOfTheDayAnnouncements: [...(user.seenArtistOfTheDayAnnouncements || []), announcementId]};
            repo.update("users", (u:any) => u.id === userId, (u:any) => updatedUser);
            saveMockDb();
            return { updatedUser };
        }
        return {};
    }),

    fetchRafflesData: (userId: string) => withLatency(() => ({
        raffles: db.rafflesData,
        myTickets: db.raffleTicketsData.filter(t => t.userId === userId),
        allTickets: db.raffleTicketsData,
        allUsers: repo.select("users"),
        highlightedRaffleId: db.highlightedRaffleIdData
    })),
    
    // Helpers
    getEventMissions: (userId: string, eventId: string) => {
        return db.eventMissionsData.filter(m => m.eventId === eventId);
    },
    getVipEventMissions: (userId: string, eventId: string) => {
         return db.eventMissionsData.filter(m => m.eventId === eventId && m.tier === 'vip');
    },
    getEventData: (userId: string) => {
        return EventEngineUnified.fetchEventsData(userId);
    },
    
    getAllEventsSnapshot: () => withLatency(() => {
        return repo.select("events");
    })
};

export const EventEngineV7 = EventEngineUnified; // Export V7 alias for backward compatibility