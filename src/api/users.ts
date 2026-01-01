
import type { User, Notification, SubscriptionRequest } from '../types';
import { withLatency, createNotification, updateUserInDb } from './helpers';
import { WELCOME_BONUS_COINS } from './economy/economy';
import { EconomyEngineV6 } from './economy/economyEngineV6';
import { AuthEngineV4 } from './auth/authEngineV4'; 
import { StabilizationEngine } from '../core/stabilization/stabilizationEngine';
import { SanityGuard } from '../services/sanity.guard';
import { ArtistOfDayEngine } from '../services/missions/artistOfDay.engine';
import { config } from '../core/config';
import { getRepository } from './database/repository.factory';

const repo = getRepository();

export const login = (email: string, password: string) => withLatency(async () => {
    try {
        const rawUser = await AuthEngineV4.login(email, password);
        
        let user = SanityGuard.user(rawUser);
        user = ArtistOfDayEngine.initialize(user);

        let isFirstLogin = false;
        
        const allNotes = await repo.selectAsync("notifications");
        const notifications = allNotes.filter((n: any) => n.userId === user.id);

        if (user.hasReceivedWelcomeBonus === false || user.hasReceivedWelcomeBonus === undefined) {
            isFirstLogin = true;
             const bonusRes = await EconomyEngineV6.addCoins(user.id, WELCOME_BONUS_COINS, 'Bônus de Registro');
             if (bonusRes.updatedUser) {
                 user = bonusRes.updatedUser;
                 user.hasReceivedWelcomeBonus = true;
                 await repo.updateAsync("users", (u:any) => u.id === user.id, (u:any) => ({...u, hasReceivedWelcomeBonus: true}));
             }
        }

        StabilizationEngine.runStartupChecks(user.id);
        
        return {
            user: user,
            notifications,
            unseenAdminNotifications: [],
            isFirstLogin,
        };
    } catch (e: any) {
        throw e;
    }
});

export const checkAuthStatus = () => withLatency(async () => {
    const rawUser = await AuthEngineV4.restoreSession();
    
    if (!rawUser) {
        return { user: null, notifications: [], unseenAdminNotifications: [] };
    }

    let user = SanityGuard.user(rawUser);
    user = ArtistOfDayEngine.initialize(user);
    
    const allNotes = await repo.selectAsync("notifications");
    const notifications = allNotes.filter((n: any) => n.userId === user.id);

    return { user, notifications, unseenAdminNotifications: [] };
});

export const dailyCheckIn = (userId: string) => withLatency(async () => {
    const result = await EconomyEngineV6.processCheckIn(userId);
    
    if (!result.success || !result.updatedUser || !result.data) {
        throw new Error(result.error || "Falha ao processar check-in.");
    }

    return { 
        updatedUser: SanityGuard.user(result.updatedUser), 
        notifications: result.data.notifications || [], 
        coinsGained: result.data.coinsGained || 0, 
        isBonus: result.data.isBonus || false, 
        streak: result.data.newStreak || 0
    };
});

export const register = (formData: any) => withLatency(async () => {
    if (config.useSupabase) {
         const { getSupabase } = await import('./supabase/client');
         const supabase = getSupabase();
         if(supabase) {
             const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
             const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        artistic_name: formData.artisticName,
                        phone: cleanPhone
                    }
                }
            });
            if (error) throw new Error(error.message);
            if (data.user && !data.session) return { success: true, requireEmailConfirmation: true };
            return { success: true, requireEmailConfirmation: false };
         }
    }

    // Mock Registration
    const now = new Date();
    const newUserId = `user-${now.getTime()}`;
    const newUser: User = SanityGuard.user({
        id: newUserId,
        name: formData.name,
        artisticName: formData.artisticName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}`,
        plan: 'Free Flow',
        role: 'user', 
        instagramUrl: formData.instagramUrl, 
        joined: now.toLocaleDateString('pt-BR'), 
        joinedISO: now.toISOString(),
    });
    
    const initializedUser = ArtistOfDayEngine.initialize(newUser);
    await repo.insertAsync("users", initializedUser);
    
    return { success: true, requireEmailConfirmation: false };
});

export const fetchTerms = () => withLatency(async () => {
    return "Termos e Condições do Artist World...";
});

export const fetchProfileData = (userId: string) => withLatency(async () => {
    const tx = await repo.selectAsync("transactions");
    const ach = await repo.selectAsync("achievements");
    return { 
        coinTransactions: tx.filter((t: any) => t.userId === userId), 
        allAchievements: ach 
    };
});

export const updateUser = (user: User) => withLatency(async () => { 
    await repo.updateAsync("users", (u: any) => u.id === user.id, (u: any) => user);
    return { updatedUser: SanityGuard.user(user) }; 
});

export const fetchSubscriptionsPageData = (userId: string) => withLatency(async () => {
    const requests = await repo.selectAsync("subscriptionRequests");
    const plans = await repo.selectAsync("subscriptionPlans");
    
    const pendingRequest = requests.find((r: any) => r.userId === userId && ['pending_payment', 'awaiting_proof', 'pending_approval'].includes(r.status)) || null;
    return { plans, pendingRequest };
});

export const requestSubscriptionUpgrade = (userId: string, planName: User['plan'], paymentLink?: string) => withLatency(async () => {
    const users = await repo.selectAsync("users");
    const user = users.find((u: any) => u.id === userId);
    if (!user) throw new Error("User not found");

    const newRequest: SubscriptionRequest = {
        id: `sr-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        currentPlan: user.plan,
        requestedPlan: planName,
        requestedAt: new Date().toISOString(),
        status: 'pending_payment',
        paymentLink,
    };
    await repo.insertAsync("subscriptionRequests", newRequest);

    const notification = createNotification(user.id, 'Solicitação de Upgrade', `Seu pedido de upgrade para o plano ${planName} foi iniciado.`);
    await repo.insertAsync("notifications", notification);
    
    return { newRequest, updatedUser: SanityGuard.user(user), notifications: [notification] };
});

export const markSubscriptionAsAwaitingProof = (requestId: string) => withLatency(async () => {
    await repo.updateAsync("subscriptionRequests", (r: any) => r.id === requestId, (r: any) => ({ ...r, status: 'awaiting_proof' }));
    const requests = await repo.selectAsync("subscriptionRequests");
    return { updatedRequest: requests.find((r: any) => r.id === requestId) };
});

export const submitSubscriptionProof = (userId: string, requestId: string, proofUrl: string) => withLatency(async () => {
    await repo.updateAsync("subscriptionRequests", (r: any) => r.id === requestId, (r: any) => ({ ...r, status: 'pending_approval', proofUrl }));
    
    const requests = await repo.selectAsync("subscriptionRequests");
    const notification = createNotification(userId, 'Comprovante Enviado', 'Seu comprovante foi enviado para análise.');
    await repo.insertAsync("notifications", notification);

    return { updatedRequest: requests.find((r: any) => r.id === requestId), notifications: [notification] };
});

export const cancelSubscription = (userId: string) => withLatency(async () => {
    const users = await repo.selectAsync("users");
    const user = users.find((u: any) => u.id === userId);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, cancellationPending: true, subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() };
    await repo.updateAsync("users", (u: any) => u.id === userId, (u: any) => updatedUser);
    
    const notification = createNotification(userId, 'Cancelamento Agendado', 'Sua assinatura será cancelada ao final do período atual.');
    return { updatedUser: SanityGuard.user(updatedUser), notifications: [notification] };
});

export const cancelSubscriptionRequest = (requestId: string) => withLatency(async () => {
    await repo.updateAsync("subscriptionRequests", (r: any) => r.id === requestId, (r: any) => ({ ...r, status: 'cancelled' }));
    const requests = await repo.selectAsync("subscriptionRequests");
    return { updatedRequest: requests.find((r: any) => r.id === requestId) };
});

export const markPlanUpgradeAsSeen = (userId: string) => withLatency(async () => {
    const users = await repo.selectAsync("users");
    const user = users.find((u: any) => u.id === userId);
    if (user) {
        const updatedUser = { ...user, unseenPlanUpgrade: false };
        await repo.updateAsync("users", (u: any) => u.id === userId, (u: any) => updatedUser);
        return { updatedUser: SanityGuard.user(updatedUser) };
    }
    return { updatedUser: null };
});

export const markRaffleWinAsSeen = (userId: string) => withLatency(async () => {
    const users = await repo.selectAsync("users");
    const user = users.find((u: any) => u.id === userId);
    if (user) {
        const updatedUser = { ...user, unseenRaffleWin: undefined };
        await repo.updateAsync("users", (u: any) => u.id === userId, (u: any) => updatedUser);
        return { updatedUser: SanityGuard.user(updatedUser) };
    }
    return { updatedUser: null };
});

export const markAdminNotificationAsSeen = (userId: string, notificationId: string) => withLatency(async () => {
    const users = await repo.selectAsync("users");
    const user = users.find((u: any) => u.id === userId);
    if (user) {
        const updatedUser = { ...user, seenAdminNotifications: [...(user.seenAdminNotifications || []), notificationId] };
        await repo.updateAsync("users", (u: any) => u.id === userId, (u: any) => updatedUser);
        return { updatedUser: SanityGuard.user(updatedUser) };
    }
    return { updatedUser: null };
});

export const markAchievementAsSeen = (userId: string, achievementId: string) => withLatency(async () => {
    const users = await repo.selectAsync("users");
    const user = users.find((u: any) => u.id === userId);
    if (user) {
        const updatedUser = { 
            ...user, 
            unseenAchievements: (user.unseenAchievements || []).filter((id: string) => id !== achievementId) 
        };
        await repo.updateAsync("users", (u: any) => u.id === userId, (u: any) => updatedUser);
        return { updatedUser: SanityGuard.user(updatedUser) };
    }
    return { updatedUser: null };
});
