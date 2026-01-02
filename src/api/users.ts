// api/users.ts
import type { User, Notification, SubscriptionRequest } from '../types';
import * as db from './mockData';
import { withLatency, createNotification, updateUserInDb } from './helpers';
import { WELCOME_BONUS_COINS } from './economy/economy';
import { EconomyEngineV6 } from './economy/economyEngineV6';
import { AuthEngineV4 } from './auth/authEngineV4'; 
import { StabilizationEngine } from '../core/stabilization/stabilizationEngine';
import { SanityGuard } from '../services/sanity.guard';
import { ArtistOfDayEngine } from '../services/missions/artistOfDay.engine';
import { config } from '../core/config';
import { getSupabase } from './supabase/client';
import { isSupabaseProvider } from './core/backendGuard';
import { mapProfileToUser } from './supabase/mappings';

export const login = (email: string, password: string) => withLatency(async () => {
    try {
        if (isSupabaseProvider()) {
            const supabase = getSupabase();
            if (!supabase) throw new Error("Supabase client indisponível.");

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                throw new Error(error.message);
            }

            const userId = data.user?.id;
            let userProfile: any = null;

            if (userId) {
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (profileData) {
                    userProfile = mapProfileToUser(profileData);
                } else if (profileError) {
                    console.warn("[Supabase Login] Perfil não encontrado, usando metadata do auth:", profileError.message);
                }
            }

            const user = userProfile || mapProfileToUser({
                id: userId || `supabase-${Date.now()}`,
                name: data.user?.user_metadata?.name || data.user?.email || "Artista",
                artistic_name: data.user?.user_metadata?.artistic_name,
                email: data.user?.email,
                avatar_url: data.user?.user_metadata?.avatar_url,
                plan: data.user?.user_metadata?.plan || 'Free Flow',
                coins: 0,
                xp: 0,
                level: 1,
                check_in_streak: 0,
                last_check_in: null,
                joined_at: data.user?.created_at
            });

            return {
                user: SanityGuard.user(user),
                notifications: [],
                unseenAdminNotifications: [],
                isFirstLogin: false
            };
        }

        const rawUser = await AuthEngineV4.login(email, password);
        
        let user = SanityGuard.user(rawUser);
        user = ArtistOfDayEngine.initialize(user);

        let isFirstLogin = false;
        
        const notifications = db.notificationsData.filter(n => n.userId === user.id);

        if (user.hasReceivedWelcomeBonus === false || user.hasReceivedWelcomeBonus === undefined) {
            isFirstLogin = true;
            if (!config.useSupabase) {
                await EconomyEngineV6.addCoins(user.id, WELCOME_BONUS_COINS, 'Bônus de Registro');
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
    if (isSupabaseProvider()) {
        const supabase = getSupabase();
        if (!supabase) return { user: null, notifications: [], unseenAdminNotifications: [] };

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.user) {
            return { user: null, notifications: [], unseenAdminNotifications: [] };
        }

        const userId = data.session.user.id;
        let profileUser: any = null;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (profileData) {
            profileUser = mapProfileToUser(profileData);
        } else {
            profileUser = mapProfileToUser({
                id: userId,
                name: data.session.user.email || "Artista",
                artistic_name: data.session.user.user_metadata?.artistic_name,
                email: data.session.user.email,
                avatar_url: data.session.user.user_metadata?.avatar_url,
                plan: data.session.user.user_metadata?.plan || 'Free Flow',
                coins: 0,
                xp: 0,
                level: 1,
                check_in_streak: 0,
                last_check_in: null,
                joined_at: data.session.user.created_at
            });
        }

        return { user: SanityGuard.user(profileUser), notifications: [], unseenAdminNotifications: [] };
    }

    const rawUser = await AuthEngineV4.restoreSession();
    
    if (!rawUser) {
        return { user: null, notifications: [], unseenAdminNotifications: [] };
    }

    let user = SanityGuard.user(rawUser);
    user = ArtistOfDayEngine.initialize(user);
    
    const notifications = db.notificationsData.filter(n => n.userId === user.id);

    return { user, notifications, unseenAdminNotifications: [] };
});

export const dailyCheckIn = (userId: string) => withLatency(async () => {
    let user = db.allUsersData.find(u => u.id === userId);
    if (!user && config.useSupabase) {
         const sb = getSupabase();
         const { data } = await sb!.from('profiles').select('*').eq('id', userId).single();
         if(data) {
             user = SanityGuard.user({ ...data, id: userId });
             db.allUsersData.push(user);
         }
    }

    if (!user) throw new Error("User not found");

    const result = await EconomyEngineV6.processCheckIn(userId);
    
    if (!result.success || !result.updatedUser || !result.data) {
        throw new Error("Falha ao processar check-in.");
    }
    
    const updatedUser = updateUserInDb(result.updatedUser);
    db.notificationsData.unshift(...(result.data.notifications || []));

    return { 
        updatedUser: SanityGuard.user(updatedUser), 
        notifications: result.data.notifications, 
        coinsGained: result.data.coinsGained, 
        isBonus: result.data.isBonus, 
        streak: result.data.newStreak 
    };
});

export const register = (formData: any) => withLatency(async () => {
    // 1. Supabase Registration
    if (config.useSupabase) {
        const supabase = getSupabase();
        if (supabase) {
            // Check if user exists (Optional optimization, signUp handles it but we can catch early)
            
            // Note: formData.phone comes fully formatted from UI now (e.g. +551199999999 or +14155550000)
            // We just ensure it has no spaces or dashes for the DB
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

            if (error) {
                // Return original error to be translated by UI
                throw new Error(error.message);
            }
            
            // If data.user is present but data.session is null, email confirmation is required
            if (data.user && !data.session) {
                return { success: true, requireEmailConfirmation: true };
            }
            
            return { success: true, requireEmailConfirmation: false };
        }
    }

    // 2. Mock Registration (Fallback)
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
        // tiktokUrl removed from initial registration
        joined: now.toLocaleDateString('pt-BR'), 
        joinedISO: now.toISOString(),
    });
    
    const initializedUser = ArtistOfDayEngine.initialize(newUser);
    db.allUsersData.push(initializedUser);
    return { success: true, requireEmailConfirmation: false };
});

export const fetchTerms = () => withLatency(db.termsAndConditionsContentData);
export const fetchProfileData = (userId: string) => withLatency(() => ({ coinTransactions: db.coinTransactionsLogData.filter(t => t.userId === userId), allAchievements: db.achievementsData }));
export const updateUser = (user: User) => withLatency(() => { const updatedUser = updateUserInDb(SanityGuard.user(user)); return { updatedUser: SanityGuard.user(updatedUser) }; });

export const fetchSubscriptionsPageData = (userId: string) => withLatency(() => {
    const pendingRequest = db.subscriptionRequestsData.find(r => r.userId === userId && (r.status === 'pending_payment' || r.status === 'awaiting_proof' || r.status === 'pending_approval')) || null;
    return { plans: db.subscriptionPlansData, pendingRequest };
});

export const requestSubscriptionUpgrade = (userId: string, planName: User['plan'], paymentLink?: string) => withLatency(() => {
    const user = db.allUsersData.find(u => u.id === userId);
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
    db.subscriptionRequestsData.unshift(newRequest);

    const notification = createNotification(user.id, 'Solicitação de Upgrade', `Seu pedido de upgrade para o plano ${planName} foi iniciado.`);
    return { newRequest, updatedUser: SanityGuard.user(user), notifications: [notification] };
});

export const markSubscriptionAsAwaitingProof = (requestId: string) => withLatency(() => {
    const requestIndex = db.subscriptionRequestsData.findIndex(r => r.id === requestId);
    if (requestIndex === -1) throw new Error("Request not found");
    
    db.subscriptionRequestsData[requestIndex].status = 'awaiting_proof';
    return { updatedRequest: db.subscriptionRequestsData[requestIndex] };
});

export const submitSubscriptionProof = (userId: string, requestId: string, proofUrl: string) => withLatency(() => {
    const requestIndex = db.subscriptionRequestsData.findIndex(r => r.id === requestId);
    if (requestIndex === -1) throw new Error("Request not found");

    db.subscriptionRequestsData[requestIndex].status = 'pending_approval';
    db.subscriptionRequestsData[requestIndex].proofUrl = proofUrl;

    const notification = createNotification(userId, 'Comprovante Enviado', 'Seu comprovante foi enviado para análise.');
    return { updatedRequest: db.subscriptionRequestsData[requestIndex], notifications: [notification] };
});

export const cancelSubscription = (userId: string) => withLatency(() => {
    const user = db.allUsersData.find(u => u.id === userId);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, cancellationPending: true, subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() };
    updateUserInDb(updatedUser);
    
    const notification = createNotification(userId, 'Cancelamento Agendado', 'Sua assinatura será cancelada ao final do período atual.');
    return { updatedUser: SanityGuard.user(updatedUser), notifications: [notification] };
});

export const cancelSubscriptionRequest = (requestId: string) => withLatency(() => {
    const requestIndex = db.subscriptionRequestsData.findIndex(r => r.id === requestId);
    if (requestIndex === -1) throw new Error("Request not found");

    db.subscriptionRequestsData[requestIndex].status = 'cancelled';
    return { updatedRequest: db.subscriptionRequestsData[requestIndex] };
});

export const markPlanUpgradeAsSeen = (userId: string) => withLatency(() => {
    const user = db.allUsersData.find(u => u.id === userId);
    if (user) {
        const updatedUser = { ...user, unseenPlanUpgrade: false };
        updateUserInDb(updatedUser);
        return { updatedUser: SanityGuard.user(updatedUser) };
    }
    return { updatedUser: null };
});

export const markRaffleWinAsSeen = (userId: string) => withLatency(() => {
    const user = db.allUsersData.find(u => u.id === userId);
    if (user) {
        const updatedUser = { ...user, unseenRaffleWin: undefined };
        updateUserInDb(updatedUser);
        return { updatedUser: SanityGuard.user(updatedUser) };
    }
    return { updatedUser: null };
});

export const markAdminNotificationAsSeen = (userId: string, notificationId: string) => withLatency(() => {
    const user = db.allUsersData.find(u => u.id === userId);
    if (user) {
        const updatedUser = { ...user, seenAdminNotifications: [...(user.seenAdminNotifications || []), notificationId] };
        updateUserInDb(updatedUser);
        return { updatedUser: SanityGuard.user(updatedUser) };
    }
    return { updatedUser: null };
});

export const markAchievementAsSeen = (userId: string, achievementId: string) => withLatency(() => {
    const user = db.allUsersData.find(u => u.id === userId);
    if (user) {
        const updatedUser = { 
            ...user, 
            unseenAchievements: (user.unseenAchievements || []).filter(id => id !== achievementId) 
        };
        updateUserInDb(updatedUser);
        return { updatedUser: SanityGuard.user(updatedUser) };
    }
    return { updatedUser: null };
});
