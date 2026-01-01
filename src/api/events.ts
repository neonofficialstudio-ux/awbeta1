
import type { Notification, User } from '../types';
import { withLatency, createNotification, updateUserInDb } from './helpers';
import { rankingAPI } from './ranking/index'; 
import { getRepository } from './database/repository.factory';
import { SanityGuard } from '../services/sanity.guard';
import { EconomyEngineV6 } from './economy/economyEngineV6';
import { EventSessionEngine } from './events/session';

const repo = getRepository();

export const fetchRankingData = () => withLatency(async () => {
    return await rankingAPI.getRanking(undefined, 'mensal');
});

export const fetchEventsData = (userId: string) => withLatency(async () => {
    const events = await repo.selectAsync("events");
    const participations = await repo.selectAsync("participations");
    const missions = await repo.selectAsync("eventMissions");
    const submissions = await repo.selectAsync("eventMissionSubmissions");
    const scoreLog = await repo.selectAsync("event_score_log");
    const featuredWinners = await repo.selectAsync("featuredWinners");

    return {
        events: events.map(SanityGuard.event),
        allUsers: [], // Optimization: Don't load all users for event dashboard
        featuredWinners,
        participations,
        eventMissions: missions,
        eventMissionSubmissions: submissions.filter((s: any) => s.userId === userId),
        eventScoreLog: scoreLog,
    };
});

export const joinEvent = (userId: string, eventId: string, cost: number, isGolden: boolean = false) => withLatency(async () => {
    const users = await repo.selectAsync("users");
    const events = await repo.selectAsync("events");
    
    const user = users.find((u: any) => u.id === userId);
    const event = events.find((e: any) => e.id === eventId);
    
    if (!user || !event) throw new Error("User or event not found");

    const ecoResult = await EconomyEngineV6.spendCoins(userId, cost, `Inscrição: ${event.title}`);
    if (!ecoResult.success) {
        return { success: false, error: ecoResult.error };
    }

    const participation = { 
        id: `p-${Date.now()}`, 
        userId, 
        eventId, 
        joinedAt: new Date().toISOString(), 
        isGolden 
    };
    await repo.insertAsync("participations", participation);
    
    const session = EventSessionEngine.startEventSession(userId, eventId, isGolden ? 'vip' : 'normal');

    let updatedUser = { 
        ...ecoResult.updatedUser, 
        joinedEvents: [...(ecoResult.updatedUser!.joinedEvents || []), eventId],
        eventSession: session 
    };
    
    await repo.updateAsync("users", (u: any) => u.id === userId, (u: any) => updatedUser);

    return { success: true, updatedUser: SanityGuard.user(updatedUser), participation, notifications: [] };
});

export const submitEventMission = (userId: string, eventMissionId: string, proofDataUrl: string) => withLatency(async () => {
    const missions = await repo.selectAsync("eventMissions");
    const mission = missions.find((m: any) => m.id === eventMissionId);
    if (!mission) throw new Error("Mission not found");

    const newSubmission = {
        id: `ems-${Date.now()}`,
        userId,
        eventMissionId,
        eventId: mission.eventId,
        userName: "User", 
        missionTitle: mission.title,
        submittedAtISO: new Date().toISOString(),
        proofUrl: proofDataUrl,
        status: 'pending' as const
    };
    
    await repo.insertAsync("eventMissionSubmissions", newSubmission);
    
    const users = await repo.selectAsync("users");
    const user = users.find((u: any) => u.id === userId);
    if (user) {
        const updatedUser = { ...user, pendingEventMissions: [...(user.pendingEventMissions || []), eventMissionId] };
        await repo.updateAsync("users", (u: any) => u.id === userId, (u: any) => updatedUser);
        return { newSubmission, updatedUser: SanityGuard.user(updatedUser), notifications: [] };
    }

    return { newSubmission, updatedUser: null, notifications: [] };
});

export const artistLinkClick = (userId: string, artistId: string, linkType: 'spotify' | 'youtube') => withLatency(() => {
    return { reward: false, coinsGained: 0, updatedUser: null, notifications: [] };
});

export const markArtistOfTheDayAsSeen = (userId: string, announcementId: string) => withLatency(async () => {
    const users = await repo.selectAsync("users");
    const user = users.find((u: any) => u.id === userId);
    if(user) {
        const updatedUser = { ...user, seenArtistOfTheDayAnnouncements: [...(user.seenArtistOfTheDayAnnouncements || []), announcementId]};
        await repo.updateAsync("users", (u: any) => u.id === userId, (u: any) => updatedUser);
        return { updatedUser: SanityGuard.user(updatedUser) };
    }
    return {};
});

export const fetchRafflesData = (userId: string) => withLatency(async () => {
    const raffles = await repo.selectAsync("raffles");
    const tickets = await repo.selectAsync("raffleTickets");
    
    const myTickets = tickets.filter((t: any) => t.userId === userId);
    
    return {
        raffles: raffles.map((r: any) => ({...r, itemId: r.itemId || ''})), 
        myTickets,
        allTickets: tickets,
        allUsers: [], 
        highlightedRaffleId: null
    };
});
