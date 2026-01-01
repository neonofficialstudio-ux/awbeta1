
import * as db from '../mockData';
import { calculateLevelFromXp, PLAN_HIERARCHY } from '../economy/economy';
import { addPerformanceLog } from '../logs/performance';
import { logError } from '../errors/logger';
import type { User } from '../../types';

interface IntegrityError {
  section: string;
  id?: string;
  message: string;
}

export interface IntegrityReport {
  timestamp: number;
  summary: {
    totalChecks: number;
    errorsFound: number;
  };
  errors: IntegrityError[];
}

// Helper to check valid string
const isValidString = (str: any) => typeof str === 'string' && str.length > 0;
const isValidDate = (dateStr: any) => !isNaN(new Date(dateStr).getTime());

// 1. Users Integrity
const checkUsersIntegrity = (): IntegrityError[] => {
    const errors: IntegrityError[] = [];
    const validPlans = Object.keys(PLAN_HIERARCHY);

    db.allUsersData.forEach(user => {
        if (!isValidString(user.id)) errors.push({ section: 'Users', id: 'unknown', message: 'User ID invalid or missing' });
        
        if (!validPlans.includes(user.plan)) {
             errors.push({ section: 'Users', id: user.id, message: `Invalid plan: ${user.plan}` });
        }
        
        if (user.xp < 0) errors.push({ section: 'Users', id: user.id, message: `Negative XP: ${user.xp}` });
        if (user.coins < 0) errors.push({ section: 'Users', id: user.id, message: `Negative Coins: ${user.coins}` });
        
        const { level: calcLevel } = calculateLevelFromXp(user.xp);
        // Allow small variance, but flag distinct mismatches
        if (user.level !== calcLevel) {
            errors.push({ section: 'Users', id: user.id, message: `Level mismatch. Stored: ${user.level}, Calc: ${calcLevel} (XP: ${user.xp})` });
        }

        if (!Array.isArray(user.completedMissions)) errors.push({ section: 'Users', id: user.id, message: 'completedMissions is not an array' });
        if (!Array.isArray(user.pendingMissions)) errors.push({ section: 'Users', id: user.id, message: 'pendingMissions is not an array' });
        
        if (user.role !== 'user' && user.role !== 'admin') {
            errors.push({ section: 'Users', id: user.id, message: `Invalid role: ${user.role}` });
        }
    });

    return errors;
};

// 2. Missions Integrity
const checkMissionsIntegrity = (): IntegrityError[] => {
    const errors: IntegrityError[] = [];
    const validTypes = ['instagram', 'tiktok', 'creative', 'special'];

    db.missionsData.forEach(mission => {
        if (!isValidString(mission.id)) errors.push({ section: 'Missions', id: 'unknown', message: 'Mission ID invalid' });
        
        if (!validTypes.includes(mission.type)) {
             errors.push({ section: 'Missions', id: mission.id, message: `Invalid mission type: ${mission.type}` });
        }

        if (!isValidDate(mission.createdAt)) errors.push({ section: 'Missions', id: mission.id, message: 'Invalid createdAt date' });
        if (!isValidDate(mission.deadline)) errors.push({ section: 'Missions', id: mission.id, message: 'Invalid deadline date' });

        if (new Date(mission.deadline).getTime() < new Date(mission.createdAt).getTime()) {
            errors.push({ section: 'Missions', id: mission.id, message: 'Deadline is before CreatedAt' });
        }

        if (mission.xp < 0) errors.push({ section: 'Missions', id: mission.id, message: 'Negative XP reward' });
        if (mission.coins < 0) errors.push({ section: 'Missions', id: mission.id, message: 'Negative Coin reward' });
    });

    return errors;
};

// 3. Store Integrity
const checkStoreIntegrity = (): IntegrityError[] => {
    const errors: IntegrityError[] = [];
    const itemIds = new Set<string>();

    const checkItem = (item: any, type: 'Store' | 'Usable') => {
        if (!isValidString(item.id)) errors.push({ section: type, id: 'unknown', message: 'ID invalid' });
        
        if (itemIds.has(item.id)) {
            errors.push({ section: type, id: item.id, message: 'Duplicate Item ID detected' });
        }
        itemIds.add(item.id);

        if (item.price < 0) errors.push({ section: type, id: item.id, message: `Negative price: ${item.price}` });
        if (!isValidString(item.name)) errors.push({ section: type, id: item.id, message: 'Invalid name' });
        if (!isValidString(item.description)) errors.push({ section: type, id: item.id, message: 'Invalid description' });
    };

    db.storeItemsData.forEach(item => checkItem(item, 'Store'));
    db.usableItemsData.forEach(item => checkItem(item, 'Usable'));

    return errors;
};

// 4. Queues Integrity
const checkQueuesIntegrity = (): IntegrityError[] => {
    const errors: IntegrityError[] = [];
    
    const checkEntry = (entry: any, queueName: string) => {
        if (!entry.userId || !db.allUsersData.some(u => u.id === entry.userId)) {
             errors.push({ section: queueName, id: entry.id, message: `Referenced User ID ${entry.userId} does not exist` });
        }
        // Check if item reference exists in history/redeemed items
        // Note: Queue entries reference redeemedItemId, not storeId directly usually, but let's check structural integrity
        if (!isValidString(entry.itemName)) errors.push({ section: queueName, id: entry.id, message: 'Missing Item Name' });
    };

    db.usableItemQueueData.forEach(q => checkEntry(q, 'UsableQueue'));
    db.artistOfTheDayQueueData.forEach(q => checkEntry(q, 'SpotlightQueue'));

    return errors;
};

// 5. Other Entities Integrity
const checkEventsIntegrity = (): IntegrityError[] => {
     const errors: IntegrityError[] = [];
     db.eventsData.forEach(event => {
         if (!isValidString(event.id)) errors.push({ section: 'Events', message: 'Invalid Event ID' });
         if (event.entryCost < 0) errors.push({ section: 'Events', id: event.id, message: 'Negative Entry Cost' });
     });
     return errors;
};

const checkRafflesIntegrity = (): IntegrityError[] => {
    const errors: IntegrityError[] = [];
    db.rafflesData.forEach(raffle => {
        if (!isValidString(raffle.id)) errors.push({ section: 'Raffles', message: 'Invalid Raffle ID' });
        if (raffle.ticketPrice < 0) errors.push({ section: 'Raffles', id: raffle.id, message: 'Negative Ticket Price' });
        if (!isValidDate(raffle.endsAt)) errors.push({ section: 'Raffles', id: raffle.id, message: 'Invalid End Date' });
    });
    return errors;
};

const checkAchievementsIntegrity = (): IntegrityError[] => {
    const errors: IntegrityError[] = [];
    db.achievementsData.forEach(ach => {
        if (!isValidString(ach.id)) errors.push({ section: 'Achievements', message: 'Invalid ID' });
        if (ach.rewardCoins < 0) errors.push({ section: 'Achievements', id: ach.id, message: 'Negative Reward' });
    });
    return errors;
};

// --- MAIN RUNNER ---

export const runMockIntegrityScan = (): IntegrityReport => {
    const errors: IntegrityError[] = [
        ...checkUsersIntegrity(),
        ...checkMissionsIntegrity(),
        ...checkStoreIntegrity(),
        ...checkQueuesIntegrity(),
        ...checkEventsIntegrity(),
        ...checkRafflesIntegrity(),
        ...checkAchievementsIntegrity(),
    ];

    const report: IntegrityReport = {
        timestamp: Date.now(),
        summary: {
            totalChecks: 7, // Number of sections checked
            errorsFound: errors.length
        },
        errors
    };

    if (errors.length > 0) {
        addPerformanceLog({
            type: 'system',
            source: 'mock_integrity_scan',
            details: { errorsFound: errors.length, firstError: errors[0] }
        });
        logError('Mock Integrity Scan Failed', { count: errors.length, sample: errors.slice(0, 3) });
    } else {
         addPerformanceLog({
            type: 'system',
            source: 'mock_integrity_scan',
            details: { status: 'Clean', timestamp: Date.now() }
        });
    }

    return report;
};
