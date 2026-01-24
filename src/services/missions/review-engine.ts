
// api/missions/review-engine.ts
import type { User, Mission, MissionSubmission, Notification, SubmissionStatus } from '../../types';
import { createNotification, checkAndGrantAchievements, updateUserInDb } from '../helpers';
import { revertMissionRewards } from '../../api/economy/ledger.engine'; // Updated import path
import { FraudScanV3 } from '../../services/fraudscan.v3';
import { TelemetryPRO } from '../../services/telemetry.pro';
import { getRepository } from '../database/repository.factory';
import { EconomyEngineV6 } from '../economy/economyEngineV6';

const repo = getRepository();

export const reviewSubmissionEnhanced = async (submission: MissionSubmission, mission: Mission, user: User, newStatus: SubmissionStatus) => {
    const oldStatus = submission.status;
    const notifications: Notification[] = [];
    let updatedUser = { ...user };

    if (oldStatus === newStatus) {
        return { updatedUser, notifications };
    }

    TelemetryPRO.event("mission_review_attempt", { 
        submissionId: submission.id, 
        oldStatus, 
        newStatus, 
        userId: user.id 
    });

    // Revert logic if previously approved
    if (oldStatus === 'approved') {
        const { updatedUser: revertedUser, notifications: revertNotifications } = revertMissionRewards(updatedUser, mission);
        updatedUser = revertedUser;
        notifications.push(...revertNotifications);

        updatedUser.monthlyMissionsCompleted = Math.max(0, updatedUser.monthlyMissionsCompleted - 1);
        updatedUser.totalMissionsCompleted = Math.max(0, updatedUser.totalMissionsCompleted - 1);
        updatedUser.completedMissions = updatedUser.completedMissions.filter(id => id !== mission.id);

        notifications.push(createNotification(user.id, 'Status de Missão Alterado', `O status de "${mission.title}" foi alterado e suas recompensas foram revertidas.`));
        
        TelemetryPRO.event("mission_rewards_reverted", { userId: user.id, missionId: mission.id });
    }
    
    if (oldStatus === 'pending') {
        updatedUser.pendingMissions = updatedUser.pendingMissions.filter(id => id !== mission.id);
    }

    // Approval Logic
    if (newStatus === 'approved') {
        const fraudContext = { 
            proof: submission.proofUrl, 
            description: mission.description, 
            type: mission.type,
            userId: user.id,
            missionId: mission.id
        };
        
        if (!FraudScanV3.check(fraudContext)) {
            TelemetryPRO.anomaly("fraud_prevented_approval", { submissionId: submission.id });
            newStatus = 'rejected';
            notifications.push(createNotification(user.id, 'Erro na Aprovação', `O sistema de segurança detectou uma inconsistência na comprovação.`));
        } else {
            if (!updatedUser.completedMissions.includes(mission.id)) {
                updatedUser.completedMissions = [...updatedUser.completedMissions, mission.id];
                updatedUser.monthlyMissionsCompleted++;
                updatedUser.totalMissionsCompleted++;

                // Calculate Rewards via V6 Engine Logic
                const multiplier = 1;
                const finalXP = Math.floor(mission.xp * multiplier);
                const finalCoins = Math.floor(mission.coins * multiplier);

                // Apply XP (Atomic V6)
                if (finalXP > 0) {
                     const xpRes = await EconomyEngineV6.addXP(updatedUser.id, finalXP, `Missão: ${mission.title}`);
                     updatedUser = xpRes.updatedUser!; // Sync local user state
                     notifications.push(...xpRes.notifications);
                }
                
                // Apply Coins (Atomic V6)
                if (finalCoins > 0) {
                     const coinRes = await EconomyEngineV6.addCoins(updatedUser.id, finalCoins, `Missão: ${mission.title}`);
                     updatedUser = coinRes.updatedUser!;
                }
                
                // Log Completion
                repo.insert("submissions", { // Re-using submissions table for log in mock context, ideally separate logs table or audit
                    id: `mcl-${Date.now()}`, 
                    type: "completion_log",
                    userId: user.id, 
                    missionId: mission.id, 
                    completedAt: new Date().toISOString(), 
                    xpGained: finalXP,
                    coinsGained: finalCoins
                });
                
                // Achievements
                const { updatedUser: userAfterAchievements, newNotifications } = checkAndGrantAchievements(updatedUser, 'mission_complete');
                updatedUser = userAfterAchievements;
                notifications.push(...newNotifications);
                
                notifications.push(createNotification(user.id, 'Missão Aprovada!', `Sua comprovação para "${mission.title}" foi aprovada.`));

                TelemetryPRO.event("mission_approved_success", { 
                    userId: user.id, 
                    missionId: mission.id,
                    rewards: { xp: finalXP, coins: finalCoins }
                });
            }
        }
    } 
    
    if (newStatus === 'rejected') {
        notifications.push(createNotification(user.id, 'Missão Rejeitada', `Sua comprovação para "${mission.title}" foi rejeitada. Tente novamente ou entre em contato.`));
        TelemetryPRO.event("mission_rejected", { userId: user.id, missionId: mission.id });
    } else if (newStatus === 'pending') {
        if (!updatedUser.pendingMissions.includes(mission.id)) {
            updatedUser.pendingMissions = [...updatedUser.pendingMissions, mission.id];
        }
    }
    
    repo.update("submissions", (s: any) => s.id === submission.id, (s: any) => ({ ...s, status: newStatus }));

    return { updatedUser, notifications };
};
