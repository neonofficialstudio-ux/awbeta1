
// api/safeguard/safeOps.ts
import type { User, Mission, MissionSubmission, StoreItem, UsableItem, SubmissionStatus, UsableItemQueueEntry, ArtistOfTheDayQueueEntry } from '../../types';
import * as db from '../mockData';
import { updateUserInDb, createNotification } from '../helpers';
import { reviewSubmissionEnhanced } from '../missions/review-engine';
import { logEconomyEvent, logMissionEvent, logQueueEvent } from './auditTrail';
import { ensureLevelIntegrity, validateDailyLimit, validatePlanMultiplier } from './validateEconomy';
import { validateMissionStructure, validateMissionDeadline } from './validateMissions';
import { normalizeStoreItem } from '../core/normalizeStoreItem';
import { calculateDiscountedPrice } from '../economy/economy';
import { checkAndGrantAchievements } from '../helpers';
import { validateMissionProof } from '../validation/missionValidationEngine';
import { logEconomyEvent as logEcoEngine } from '../economy/economyLogger';


export const safeApproveMission = async (submission: MissionSubmission, newStatus: SubmissionStatus) => {
    const user = db.allUsersData.find(u => u.id === submission.userId);
    const mission = db.missionsData.find(m => m.id === submission.missionId);

    // 1. Basic Validation
    if (!user || !mission) {
        logMissionEvent(submission.missionId, submission.id, 'failed_validation_-_no_user_or_mission');
        return { updatedUser: null, notifications: [] };
    }
    
    // 2. NEW: Centralized Validation Engine before approval
    if (newStatus === 'approved') {
        // Derive format from explicit field OR description fallback
        const desc = mission.description.toLowerCase();
        
        let format = mission.format || 'ambos'; // default if undefined

        // Fallback logic for legacy missions without explicit format
        if (!mission.format) {
             if (desc.includes('formato vídeo')) format = 'video';
             else if (desc.includes('formato story')) format = 'story';
             else if (desc.includes('formato foto')) format = 'foto';
        }
        
        // Derive proofType from proofUrl
        let proofType = 'link'; // default
        const proofUrlSafe = submission.proofUrl || "";
        
        if (proofUrlSafe.startsWith('data:image')) {
            proofType = 'photo';
        } else if (proofUrlSafe.includes('instagram.com/stories')) {
            proofType = 'story';
        }

        const submissionForValidation = {
            missionId: submission.missionId,
            userId: submission.userId,
            format: format,
            proofType: proofType,
            proofValue: proofUrlSafe,
        };

        const validationResult = validateMissionProof(submissionForValidation);

        if (!validationResult.ok) {
            logMissionEvent(mission.id, submission.id, 'failed_automatic_validation');
            
            // Auto-reject and notify user
            const submissionIndex = db.missionSubmissionsData.findIndex(s => s.id === submission.id);
            if(submissionIndex > -1) {
                db.missionSubmissionsData[submissionIndex].status = 'rejected';
            }

            const updatedUser = { ...user, pendingMissions: user.pendingMissions.filter(id => id !== mission.id) };
            const finalUser = updateUserInDb(updatedUser);

            const notifications = [createNotification(
                user.id,
                'Missão Rejeitada Automaticamente',
                `Sua comprovação para "${mission.title}" foi rejeitada: ${validationResult.errors.join('. ')}`
            )];
            return { updatedUser: finalUser, notifications };
        }
    }


    // 3. Run core logic
    const { updatedUser, notifications } = await reviewSubmissionEnhanced(submission, mission, user, newStatus);
    
    // 4. Post-op validation & normalization
    const normalizedUser = ensureLevelIntegrity(updatedUser);

    // 5. Persist
    const finalUser = updateUserInDb(normalizedUser);
    
    // 6. Audit
    logMissionEvent(mission.id, submission.id, newStatus);

    return { updatedUser: finalUser, notifications };
};


export const safeRedeemItem = (user: User, item: StoreItem | UsableItem) => {
    let notifications: any[] = [];
    
    // 1. Validation
    const normalizedItem = normalizeStoreItem(item as StoreItem); // UsableItem will pass through fine
    const finalPrice = calculateDiscountedPrice(normalizedItem.price, user.plan);

    if (user.coins < finalPrice) {
        notifications.push(createNotification(user.id, "Saldo Insuficiente", "Você não tem moedas suficientes para resgatar este item."));
        return { success: false, updatedUser: user, notifications };
    }
    if (!('exchanges' in item) && user.plan === 'Free Flow') {
        notifications.push(createNotification(user.id, "Acesso Negado", "Este item é exclusivo para assinantes. Faça um upgrade!", { view: 'subscriptions' }));
        return { success: false, updatedUser: user, notifications };
    }
     if (item.isOutOfStock) {
        notifications.push(createNotification(user.id, "Item Esgotado", "Este item não está mais disponível no momento."));
        return { success: false, updatedUser: user, notifications };
    }

    // 2. Run core logic
    const now = new Date();
    let updatedUser = { ...user, coins: user.coins - finalPrice };
    
    // 3. Persist transaction and redeemed item
    const redeemedItem = { id: `ri-${now.getTime()}`, userId: user.id, userName: user.name, itemId: item.id, itemName: item.name, itemPrice: finalPrice, redeemedAt: now.toLocaleString('pt-BR'), redeemedAtISO: now.toISOString(), coinsBefore: user.coins, coinsAfter: updatedUser.coins, status: 'Redeemed' as const };
    db.redeemedItemsData.unshift(redeemedItem);
    
    if ('exchanges' in item) {
      const newStoreItems = db.storeItemsData.map(si => si.id === item.id ? { ...si, exchanges: si.exchanges + 1 } : si);
      db.storeItemsData.splice(0, db.storeItemsData.length, ...newStoreItems);
    }
    
    // 4. Post-op updates (achievements, etc.)
    const { updatedUser: userAfterAchievements, newNotifications } = checkAndGrantAchievements(updatedUser, 'store_redeem');
    updatedUser = userAfterAchievements;
    notifications.push(...newNotifications);
    
    const finalUser = updateUserInDb(updatedUser);

    // 5. Audit & Final Notification
    logEconomyEvent(user.id, 'spend', finalPrice, 'store_redemption');
    // New Logger Hook
    logEcoEngine({
         timestamp: Date.now(),
         type: "store_purchase",
         userId: user.id,
         amount: finalPrice,
         source: "store",
         payload: { itemId: item.id, itemName: item.name }
    });

    const discount = (item.price - finalPrice) / item.price;
    const discountMessage = discount > 0 ? ` com ${Math.round(discount * 100)}% de desconto` : '';
    notifications.push(createNotification(user.id, 'Item Resgatado!', `Parabéns! Você resgatou "${item.name}"${discountMessage}.`, { view: 'inventory' }));

    return { success: true, updatedUser: finalUser, notifications };
}

export const safeQueueInsert = (item: UsableItemQueueEntry | ArtistOfTheDayQueueEntry, queueType: 'item' | 'spotlight') => {
    // 1. Validation (simple structure check)
    if (!item.userId || !item.itemName || !item.redeemedItemId) {
        logQueueEvent(item.id, queueType, 'failed_validation');
        return;
    }

    // 2. Run core logic (insert into DB)
    if (queueType === 'item') {
        db.usableItemQueueData.push(item as UsableItemQueueEntry);
    } else {
        db.artistOfTheDayQueueData.push(item as ArtistOfTheDayQueueEntry);
    }
    
    // 3. Audit
    logQueueEvent(item.id, queueType, 'queued');
}
