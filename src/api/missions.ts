

// api/missions.ts
import type { Notification, MissionSubmission } from '../types';
import * as db from './mockData';
import { withLatency, createNotification, updateUserInDb, checkAndGrantAchievements } from './helpers';
import { getDailyMissionLimit, evaluateCheckIn } from './economy/economy';
import { validateMissionSubmission } from './quality/validateInputs';
import { logMissionFlow } from './logs';
import { checkLinkSafety, applyContentRules, sanitizeLink } from './quality';
import { logMissionEvent } from './telemetry/missionTelemetry';
// Import telemetry to ensure availability if needed in future expansion
import { logEconomyEvent } from './telemetry/economyTelemetry';
import {
  logBehaviorEvent,
  detectMissionSpam,
  detectRepeatedLinks,
  detectSuspiciousVelocity,
  detectExpiredAttempt
} from "./telemetry/userBehavior";
import { validateEconomyTransaction } from './consistency/consistencyEngine';
import { checkDailyLimitsRespected } from './economy/economySanityCheck';
import { applyUserHeals } from './economy/economyAutoHeal';
import { addPerformanceLog } from './logs/performance';

export const fetchDashboardData = () => withLatency(() => {
    const now = new Date();
    const activeMissions = db.missionsData.map(mission => {
      const deadline = new Date(mission.deadline);
      if (now > deadline && mission.status === 'active') {
        logMissionEvent({
            timestamp: Date.now(),
            missionId: mission.id,
            action: "mission_expired"
        });
        addPerformanceLog({ type: 'mission', source: 'mission_expired', details: { missionId: mission.id } });
        return { ...mission, status: 'expired' as const };
      }
      return mission;
    });
    if (JSON.stringify(activeMissions) !== JSON.stringify(db.missionsData)) {
        db.missionsData.splice(0, db.missionsData.length, ...activeMissions);
    }

    return {
        advertisements: db.advertisementsData.filter(ad => ad.isActive),
        featuredMission: db.missionsData.find(m => m.id === db.featuredMissionIdData) || null,
        artistsOfTheDay: db.allUsersData.filter(u => db.artistsOfTheDayIdsData.includes(u.id)),
        artistCarouselDuration: db.artistCarouselDurationData,
        artistsOfTheDayIds: db.artistsOfTheDayIdsData,
        processedArtistOfTheDayQueue: db.processedArtistOfTheDayQueueHistoryData,
    };
});

export const fetchMissions = (userId: string) => withLatency(() => {
    const user = db.allUsersData.find(u => u.id === userId);
    if (!user) throw new Error("User not found");

    const limit = getDailyMissionLimit(user.plan);
    let hasReachedDailyLimit = false;

    if (limit !== null) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const submissionsToday = db.missionSubmissionsData.filter(s => s.userId === user.id && new Date(s.submittedAtISO) >= today).length;
        if (submissionsToday >= limit) {
            hasReachedDailyLimit = true;
        }
    }

    // Filter logic: Only show missions that are NOT scheduled for the future
    // If scheduledFor is undefined/null, it is shown immediately.
    const now = new Date();
    const visibleMissions = db.missionsData.filter(mission => {
        if (!mission.scheduledFor) return true;
        return new Date(mission.scheduledFor) <= now;
    });

    return {
        missions: visibleMissions,
        submissions: db.missionSubmissionsData.filter(s => s.userId === userId),
        hasReachedDailyLimit,
    };
});

export const submitMission = (userId: string, missionId: string, proof: string) => withLatency(() => {
    logMissionFlow('User submitted mission proof', { userId, missionId });
    
    // --- BEHAVIOR TELEMETRY ---
    // 1. Check Velocity
    const userRecentSubmissions = db.missionSubmissionsData
        .filter(s => s.userId === userId)
        .sort((a, b) => new Date(b.submittedAtISO).getTime() - new Date(a.submittedAtISO).getTime());
    
    if (userRecentSubmissions.length > 0) {
        const lastTime = new Date(userRecentSubmissions[0].submittedAtISO).getTime();
        const interval = Date.now() - lastTime;
        detectSuspiciousVelocity(userId, interval);
    }

    // 2. Check Spam (Volume in last 5 minutes)
    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
    const recentCount = userRecentSubmissions.filter(s => new Date(s.submittedAtISO).getTime() > fiveMinsAgo).length;
    detectMissionSpam(userId, recentCount);

    // 3. Check Repeated Links
    const recentLinks = userRecentSubmissions.slice(0, 10).map(s => s.proofUrl);
    if (recentLinks.length > 0) {
        detectRepeatedLinks(userId, [...recentLinks, proof]);
    }
    // --- END BEHAVIOR TELEMETRY ---

    // --- QUALITY SHIELD INTEGRATION ---
    const sanitizedProof = proof.startsWith('data:') ? proof : sanitizeLink(proof);
    
    const rulesCheck = applyContentRules({ proof: sanitizedProof }, userId);
    if (!rulesCheck.ok) {
        throw new Error(rulesCheck.reason);
    }

    if (!proof.startsWith('data:')) {
        const safetyCheck = checkLinkSafety(sanitizedProof);
        if (!safetyCheck.safe) {
            throw new Error(safetyCheck.reason);
        }
    }
    // --- END QUALITY SHIELD ---

    const user = db.allUsersData.find(u => u.id === userId);
    const mission = db.missionsData.find(m => m.id === missionId);
    if (!user || !mission) throw new Error("User or mission not found");

    // Anti-spam/duplicate check
    if (user.pendingMissions.includes(missionId) || user.completedMissions.includes(missionId)) {
        throw new Error("Você já enviou ou completou esta missão.");
    }

    // Anti-expired check
    if (new Date() > new Date(mission.deadline)) {
        detectExpiredAttempt(userId);
        throw new Error("Esta missão expirou e não pode mais ser entregue.");
    }
    
    const notifications: Notification[] = [];
    const limit = getDailyMissionLimit(user.plan);
    
    if (limit !== null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const submissionsToday = db.missionSubmissionsData.filter(s => s.userId === user.id && new Date(s.submittedAtISO) >= today).length;

      // --- ECONOMY SANITY CHECK ---
      const limitCheck = checkDailyLimitsRespected(user, submissionsToday + 1);
      if (!limitCheck.ok) console.warn("[ECONOMY SANITY WARNING]", limitCheck.reason);
      // ----------------------------

      if (submissionsToday >= limit) {
        throw new Error(`Você já enviou o máximo de ${limit} ${limit > 1 ? 'missões' : 'missão'} hoje.`);
      }
    }

    // --- NEW CENTRALIZED VALIDATION LOGIC ---
    const desc = mission.description.toLowerCase();
    
    // Priority: Explicit format > Derived from description > Legacy fallback
    let missionFormat: string | undefined = mission.format;
    if (!missionFormat) {
         missionFormat = 
            desc.includes('formato vídeo') ? 'video' :
            desc.includes('formato story') ? 'story' :
            desc.includes('formato foto') ? 'foto' :
            'legacy';
    }

    const validationResult = validateMissionSubmission({ proof: sanitizedProof, missionFormat: missionFormat as any });
    if (!validationResult.ok) {
        throw new Error(validationResult.reason);
    }
    // --- END OF NEW LOGIC ---

    const newSubmission: MissionSubmission = {
      id: `ms-${Date.now()}`, userId, missionId, userName: user.name, userAvatar: user.avatarUrl,
      missionTitle: mission.title, submittedAt: 'agora mesmo', submittedAtISO: new Date().toISOString(),
      proofUrl: sanitizedProof, status: 'pending',
    };
    db.missionSubmissionsData.unshift(newSubmission);
    
    addPerformanceLog({
        type: 'mission',
        source: 'submit_mission',
        details: { userId, missionId, submissionId: newSubmission.id }
    });

    // TELEMETRY
    logMissionEvent({
        timestamp: Date.now(),
        missionId,
        userId,
        action: "mission_sent"
    });
    logBehaviorEvent({ timestamp: Date.now(), userId, action: "mission_submit" });

    let updatedUser = { ...user, pendingMissions: [...user.pendingMissions, missionId] };
    updatedUser = applyUserHeals(updatedUser);
    
    updateUserInDb(updatedUser);
    
    const admin = db.allUsersData.find(u => u.role === 'admin');
    if (admin) {
        const adminNotification = createNotification(admin.id, "Nova Missão Enviada", `${user.name} enviou uma comprovação para a missão "${mission.title}".`, { view: 'admin', tab: 'missions' });
        db.notificationsData.unshift(adminNotification);
        notifications.push(adminNotification);
    }

    let hasReachedDailyLimit = false;
    if (limit !== null) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const submissionsTodayAfter = db.missionSubmissionsData.filter(s => s.userId === user.id && new Date(s.submittedAtISO) >= today).length;
        if (submissionsTodayAfter >= limit) {
            hasReachedDailyLimit = true;
        }
    }

    return { updatedUser, newSubmission, notifications, hasReachedDailyLimit };
});

export const dailyCheckIn = (userId: string) => withLatency(async () => {
    let user = db.allUsersData.find(u => u.id === userId);
    if (!user) throw new Error("User not found");

    const { updatedUser, notifications, coinsGained, isBonus, streak, newTransactions } = await evaluateCheckIn(user);

    db.coinTransactionsLogData.unshift(...newTransactions);
    
    // CONSISTENCY CHECK
    newTransactions.forEach(tx => {
        const validation = validateEconomyTransaction(tx);
        if (!validation.valid) {
            console.warn("[CONSISTENCY WARNING] Check-in transaction invalid:", validation.reason, tx);
        }
    });

    // Check for check-in achievements
    const { updatedUser: userAfterAchievements, newNotifications: achievementNotifications } = checkAndGrantAchievements(updatedUser, 'check_in_streak');
    notifications.push(...achievementNotifications);
    
    let finalUser = userAfterAchievements;
    finalUser = applyUserHeals(finalUser);
    updateUserInDb(finalUser);
    
    logMissionFlow('User performed daily check-in', { userId, streak: finalUser.weeklyCheckInStreak, coinsGained });

    return { updatedUser: finalUser, notifications, coinsGained, isBonus, streak: finalUser.weeklyCheckInStreak };
});

export const fetchAchievementsData = () => withLatency(() => {
    return db.achievementsData;
});
