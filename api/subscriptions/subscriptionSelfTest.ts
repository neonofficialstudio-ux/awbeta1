
import { SubscriptionEngineV5 } from './subscriptionEngineV5';
import type { User } from '../../types';

export const runSubscriptionSelfTest = () => {
    console.group("Running Subscription Engine V5.0 Self-Test");
    let errors = 0;

    const mockUser: User = {
        id: 'test-sub', plan: 'Free Flow', coins: 100, xp: 0, 
        name: 'Test', artisticName: 'Test', email: '', phone: '', role: 'user',
        level: 1, xpToNextLevel: 100, monthlyMissionsCompleted: 0, totalMissionsCompleted: 0,
        weeklyProgress: 0, completedMissions: [], pendingMissions: [], completedEventMissions: [],
        pendingEventMissions: [], joinedEvents: [], avatarUrl: '', instagramUrl: '',
        weeklyCheckInStreak: 0, subscriptionHistory: [], punishmentHistory: [], unlockedAchievements: []
    };

    // Test 1: Normalization
    if (SubscriptionEngineV5.getPlanConfig({ ...mockUser, plan: 'free' as any }).id !== 'free') {
        console.error("[FAIL] Plan Normalization 'free'");
        errors++;
    }

    // Test 2: Multiplier
    const proUser = { ...mockUser, plan: 'Artista Profissional' as any };
    if (SubscriptionEngineV5.getMultiplier(proUser) !== 1.25) {
        console.error("[FAIL] Pro Multiplier incorrect");
        errors++;
    }

    // Test 3: Discount
    if (SubscriptionEngineV5.discount.calculatePrice(proUser, 100) !== 95) {
         console.error("[FAIL] Pro Discount incorrect (expected 95, got " + SubscriptionEngineV5.discount.calculatePrice(proUser, 100) + ")");
         errors++;
    }

    // Test 4: Limits
    const limitFree = SubscriptionEngineV5.getDailyMissionLimit(mockUser);
    if (limitFree !== 1) {
        console.error("[FAIL] Free limit incorrect");
        errors++;
    }

    if (errors === 0) {
        console.log("%c[PASS] Subscription Engine V5.0 Integrity Verified.", "color: green");
    } else {
        console.log(`%c[FAIL] ${errors} errors found in Subscription Engine.`, "color: red");
    }
    console.groupEnd();
    return errors === 0;
};
