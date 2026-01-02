
// api/errors/anomaly-detector.ts
import type { User } from '../../types';
import * as db from '../mockData';
import * as logger from './logger';

const XP_SPIKE_THRESHOLD = 20000; // XP gained in the last 24 hours
const COIN_SPIKE_THRESHOLD = 5000; // Coins gained in the last 24 hours
const QUEUE_STALL_THRESHOLD_HOURS = 48; // 48 hours
const STORE_EXPLOIT_THRESHOLD = { count: 5, minutes: 10 }; // 5 items in 10 minutes

export const detectXpSpike = (user: User) => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentXpGain = db.missionCompletionLogData
        .filter(log => log.userId === user.id && log.completedAt > twentyFourHoursAgo)
        .reduce((sum, log) => sum + log.xpGained, 0);

    if (recentXpGain > XP_SPIKE_THRESHOLD) {
        logger.logWarning('XP Spike Detected', { userId: user.id, name: user.name, xpGain: recentXpGain, period: '24h' });
        return true;
    }
    return false;
};

export const detectCoinSpike = (user: User) => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentCoinGain = db.coinTransactionsLogData
        .filter(t => t.userId === user.id && t.type === 'earn' && t.dateISO > twentyFourHoursAgo)
        .reduce((sum, t) => sum + t.amount, 0);

    if (recentCoinGain > COIN_SPIKE_THRESHOLD) {
        logger.logWarning('Coin Spike Detected', { userId: user.id, name: user.name, coinGain: recentCoinGain, period: '24h' });
        return true;
    }
    return false;
};

export const detectMissionAbuse = (user: User) => {
    // This is a simplified version of logic in audit rules.
    // In a real system, these would be more integrated.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentSubmissions = db.missionSubmissionsData.filter(sub => sub.userId === user.id && sub.submittedAtISO > oneHourAgo);
    
    if (recentSubmissions.length > 10) { // More than 10 submissions in an hour
        logger.logWarning('Potential Mission Abuse Detected', { userId: user.id, name: user.name, submissionCount: recentSubmissions.length, period: '1h' });
        return true;
    }
    return false;
};

export const detectQueueStall = () => {
    const stallThreshold = new Date(Date.now() - QUEUE_STALL_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();
    const stalledItemQueue = db.usableItemQueueData.filter(item => item.queuedAt < stallThreshold);
    const stalledSpotlightQueue = db.artistOfTheDayQueueData.filter(item => item.queuedAt < stallThreshold);

    if (stalledItemQueue.length > 0) {
        logger.logWarning('Item Queue is Stalled', { count: stalledItemQueue.length, oldestItemId: stalledItemQueue[0]?.id });
    }
    if (stalledSpotlightQueue.length > 0) {
        logger.logWarning('Spotlight Queue is Stalled', { count: stalledSpotlightQueue.length, oldestItemId: stalledSpotlightQueue[0]?.id });
    }
    return stalledItemQueue.length > 0 || stalledSpotlightQueue.length > 0;
};

export const detectStoreExploit = (user: User) => {
    const tenMinutesAgo = new Date(Date.now() - STORE_EXPLOIT_THRESHOLD.minutes * 60 * 1000).toISOString();
    const recentRedemptions = db.redeemedItemsData.filter(item => item.userId === user.id && item.redeemedAtISO > tenMinutesAgo);

    if (recentRedemptions.length > STORE_EXPLOIT_THRESHOLD.count) {
        logger.logWarning('Potential Store Exploit Detected', { userId: user.id, name: user.name, redemptionCount: recentRedemptions.length, period: `${STORE_EXPLOIT_THRESHOLD.minutes}m` });
        return true;
    }
    return false;
};
