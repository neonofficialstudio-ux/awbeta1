

// api/events.ts
import type { Notification, User } from '../types';
import * as db from './mockData';
import { withLatency, createNotification, updateUserInDb } from './helpers';
import { sanitizeLink, checkLinkSafety, applyContentRules } from './quality';
import { processEventEntry } from './economy/economy'; // Centralized Economy
import { rankingAPI } from './ranking/index'; // V6 Engine
import { assertMockProvider, assertSupabaseProvider, isSupabaseProvider } from './core/backendGuard';
import { getSupabase } from './supabase/client';

const ensureMockBackend = (feature: string) => assertMockProvider(`events.${feature}`);
const requireSupabaseClient = () => {
    const client = getSupabase();
    if (!client) throw new Error("[Supabase] Client not initialized");
    return client;
};

export const fetchRankingData = () => withLatency(() => {
    ensureMockBackend('fetchRankingData');
    // V6: Use the Live Ranking Engine for consistent, sorted, normalized data
    return rankingAPI.getRanking(undefined, 'mensal');
});

export const fetchEventsData = (userId: string) => withLatency(() => {
    ensureMockBackend('fetchEventsData');
    return {
        events: db.eventsData,
        allUsers: db.allUsersData,
        featuredWinners: db.featuredWinnersData,
        participations: db.participationsData,
        eventMissions: db.eventMissionsData,
        eventMissionSubmissions: db.eventMissionSubmissionsData.filter(s => s.userId === userId),
        eventScoreLog: db.eventScoreLogData,
    };
});

const joinEventSupabase = async (eventId: string) => {
    assertSupabaseProvider('events.joinEvent');

    const supabase = requireSupabaseClient();
    const { data, error } = await supabase.rpc(
        "join_event",
        { p_event: eventId }
    );

    if (error) throw error;
    return data;
};

export const joinEvent = (userId: string, eventId: string, cost: number, isGolden: boolean = false) => {
    if (isSupabaseProvider()) {
        return joinEventSupabase(eventId);
    }
    return withLatency(async () => {
    ensureMockBackend('joinEvent');
    const user = db.allUsersData.find(u => u.id === userId);
    const event = db.eventsData.find(e => e.id === eventId);
    if (!user || !event) throw new Error("User or event not found");

    const notifications: Notification[] = [];
    if (event.allowedPlans && event.allowedPlans.length > 0 && !event.allowedPlans.includes(user.plan)) {
        notifications.push(createNotification(userId, 'Acesso Negado', 'Seu plano de assinatura não permite a participação neste evento.'));
        return { success: false, updatedUser: user, notifications };
    }
    if (user.joinedEvents.includes(eventId)) {
        notifications.push(createNotification(userId, 'Atenção', 'Você já está participando!'));
        return { success: false, updatedUser: user, notifications };
    }
    
    // --- CENTRALIZED ECONOMY ---
    const transactionResult = await processEventEntry(user, cost, event.title, isGolden);
    if (!transactionResult.success) {
        notifications.push(createNotification(userId, 'Saldo Insuficiente', transactionResult.error || 'Você não tem moedas suficientes para participar.'));
        return { success: false, updatedUser: user, notifications };
    }
    
    const updatedUser = updateUserInDb({ ...transactionResult.updatedUser, joinedEvents: [...user.joinedEvents, eventId] });
    
    if (transactionResult.transaction) {
        db.coinTransactionsLogData.unshift(transactionResult.transaction);
    }

    const newParticipation = { id: `p-${Date.now()}`, userId, eventId, joinedAt: new Date().toISOString(), isGolden };
    db.participationsData.push(newParticipation);
    
    const successMsg = isGolden ? `Você adquiriu o Golden Pass para "${event.title}"! Aproveite os benefícios VIP.` : `Você se inscreveu com sucesso em "${event.title}". Boa sorte!`;
    notifications.push(createNotification(userId, 'Inscrição Confirmada!', successMsg, { view: 'events' }));

    return { success: true, updatedUser, newParticipation, notifications };
    });
};

export const submitEventMission = (userId: string, eventMissionId: string, proofDataUrl: string) => withLatency(() => {
    ensureMockBackend('submitEventMission');
    // --- QUALITY SHIELD INTEGRATION ---
    const sanitizedProof = proofDataUrl.startsWith('data:') ? proofDataUrl : sanitizeLink(proofDataUrl);
    
    const rulesCheck = applyContentRules({ proof: sanitizedProof }, userId);
    if (!rulesCheck.ok) {
        throw new Error(rulesCheck.reason);
    }

    if (!proofDataUrl.startsWith('data:')) {
        const safetyCheck = checkLinkSafety(sanitizedProof);
        if (!safetyCheck.safe) {
            throw new Error(safetyCheck.reason);
        }
    }
    // --- END QUALITY SHIELD ---

    const user = db.allUsersData.find(u => u.id === userId);
    const eventMission = db.eventMissionsData.find(m => m.id === eventMissionId);
    if (!user || !eventMission) throw new Error("User or event mission not found");

    const newSubmission = {
        id: `ems-${Date.now()}`, userId, eventMissionId, eventId: eventMission.eventId, userName: user.name, userAvatar: user.avatarUrl,
        missionTitle: eventMission.title, submittedAtISO: new Date().toISOString(), proofUrl: sanitizedProof, status: 'pending' as const
    };
    db.eventMissionSubmissionsData.unshift(newSubmission);
    const updatedUser = updateUserInDb({ ...user, pendingEventMissions: [...user.pendingEventMissions, eventMissionId] });

    const notifications: Notification[] = [];
    const admin = db.allUsersData.find(u => u.role === 'admin');
    if (admin) {
        const adminNotification = createNotification(admin.id, "Nova Missão de Evento", `${user.name} enviou uma comprovação para a missão de evento "${eventMission.title}".`, { view: 'admin', tab: 'events' });
        db.notificationsData.unshift(adminNotification);
        notifications.push(adminNotification);
    }

    return { newSubmission, updatedUser, notifications };
});

export const artistLinkClick = (userId: string, artistId: string, linkType: 'spotify' | 'youtube') => withLatency(() => {
    ensureMockBackend('artistLinkClick');
    const user = db.allUsersData.find(u => u.id === userId);
    const artist = db.allUsersData.find(u => u.id === artistId);
    if (!user || !artist) throw new Error("User or artist not found");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Identify Available Links for the Artist
    const availableLinks: string[] = [];
    if (artist.spotifyUrl) availableLinks.push('spotify');
    if (artist.youtubeUrl) availableLinks.push('youtube');
    const totalLinks = availableLinks.length;

    // Safety check: if artist has no links (shouldn't happen in carousel), return.
    if (totalLinks === 0) return { reward: false };

    // 2. Get Existing Claims for Today
    const existingClaims = user.lastArtistLinkClickClaims?.filter(c => 
        c.artistId === artist.id && new Date(c.dateISO) >= today
    ) || [];

    // 3. Record this click if not already recorded
    const alreadyClickedThisType = existingClaims.some(c => c.linkType === linkType);
    let newClaimsList = [...(user.lastArtistLinkClickClaims || [])];
    
    if (!alreadyClickedThisType) {
        newClaimsList.push({ artistId: artist.id, linkType, dateISO: new Date().toISOString() });
    }

    // 4. Calculate Unique Clicks Today (Including current)
    const uniqueClicksToday = new Set(
        existingClaims.map(c => c.linkType).concat([linkType])
    ).size;

    // 5. Determine Reward
    // We award ONLY if the set is now complete (uniqueClicksToday === totalLinks) 
    // AND if the user hasn't already completed the set previously today.
    // We check 'wasSetCompletedBefore' to avoid double rewards if they click again.
    
    const uniqueClicksBefore = new Set(existingClaims.map(c => c.linkType)).size;
    const isSetCompletedNow = uniqueClicksToday === totalLinks;
    const wasSetCompletedBefore = uniqueClicksBefore === totalLinks;

    let reward = false;
    let notifications: any[] = [];
    let updatedUser: User = { ...user, lastArtistLinkClickClaims: newClaimsList };

    if (isSetCompletedNow && !wasSetCompletedBefore) {
        reward = true;
        updatedUser.coins += 1;
        
        // Log transaction
        const now = new Date();
        db.coinTransactionsLogData.unshift({
            id: `ct-${now.getTime()}`, userId, date: now.toLocaleString('pt-BR'), dateISO: now.toISOString(),
            description: `Exploração Completa: ${artist.artisticName}`,
            amount: 1, type: 'earn', source: 'artist_link_click',
        });

        notifications = [createNotification(user.id, "Exploração Completa!", `Você conheceu o universo de ${artist.artisticName} e ganhou +1 Coin.`)];
    }

    updatedUser = updateUserInDb(updatedUser);

    return { reward, coinsGained: reward ? 1 : 0, updatedUser, notifications };
});

export const markArtistOfTheDayAsSeen = (userId: string, announcementId: string) => withLatency(() => {
    ensureMockBackend('markArtistOfTheDayAsSeen');
    const user = db.allUsersData.find(u => u.id === userId);
    if(user) {
        const updatedUser = { ...user, seenArtistOfTheDayAnnouncements: [...(user.seenArtistOfTheDayAnnouncements || []), announcementId]};
        return { updatedUser: updateUserInDb(updatedUser) };
    }
    return {};
});

export const fetchRafflesData = (userId: string) => withLatency(() => {
    ensureMockBackend('fetchRafflesData');
    return {
        raffles: db.rafflesData,
        myTickets: db.raffleTicketsData.filter(t => t.userId === userId),
        allTickets: db.raffleTicketsData,
        allUsers: db.allUsersData,
    };
});
