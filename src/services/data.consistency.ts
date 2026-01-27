
import { getRepository } from "../api/database/repository.factory";
import { SanityGuard } from "./sanity.guard";
import { PLAN_MULTIPLIERS } from "../api/economy/economy-constants"; // Updated Import
import { DiagnosticCore } from "./diagnostic.core";
import type { User, Mission, Event, RankingUser, QueueItem, StoreItem, UsableItem } from "../types";
import type { AppState } from "../state/state.types";

const repo = getRepository();

interface ConsistencyReport {
    ok: boolean;
    issues: string[];
    repaired: string[];
    integrityScore: number;
}

export const DataConsistency = {
    /**
     * Checks and repairs User Economy (Coins, XP, Level, Plan).
     */
    checkUserEconomy: (user: User): { user: User, report: ConsistencyReport } => {
        const report: ConsistencyReport = { ok: true, issues: [], repaired: [], integrityScore: 100 };
        let updatedUser = { ...user };

        // 1. Non-negative values
        if (updatedUser.coins < 0) {
            report.issues.push(`Negative coins: ${updatedUser.coins}`);
            updatedUser.coins = 0;
            report.repaired.push('fix_negative_coins');
        }
        if (updatedUser.xp < 0) {
            report.issues.push(`Negative XP: ${updatedUser.xp}`);
            updatedUser.xp = 0;
            report.repaired.push('fix_negative_xp');
        }

        // 2. Plan Multiplier Integrity
        // Use strict check against constants
        if (PLAN_MULTIPLIERS[updatedUser.plan] === undefined) {
            report.issues.push(`Invalid Plan: ${updatedUser.plan}`);
            // Note: Actual normalization happens in LegacyUserNormalizer or SanityGuard
            // This is a fallback catch
            updatedUser.plan = 'Free Flow';
            report.repaired.push('reset_invalid_plan');
        }

        report.ok = report.issues.length === 0;
        report.integrityScore = Math.max(0, 100 - (report.issues.length * 10));
        
        return { user: updatedUser, report };
    },

    /**
     * Checks and repairs Missions (Status, Rewards, Deadlines).
     */
    checkMissionStates: (missions: Mission[], user: User): { missions: Mission[], report: ConsistencyReport } => {
        const report: ConsistencyReport = { ok: true, issues: [], repaired: [], integrityScore: 100 };
        const now = new Date();

        const validMissions = missions.map(mission => {
            let m = { ...mission };
            let changed = false;

            // 1. Deadline Check
            if (m.status === 'active' && new Date(m.deadline) < now) {
                m.status = 'expired';
                report.issues.push(`Mission ${m.id} expired but active`);
                report.repaired.push(`expire_mission_${m.id}`);
                changed = true;
            }

            // 2. Reward Consistency
            if (m.xp < 0 || m.coins < 0) {
                m.xp = Math.max(0, m.xp);
                m.coins = Math.max(0, m.coins);
                report.issues.push(`Negative rewards in mission ${m.id}`);
                report.repaired.push(`fix_mission_rewards_${m.id}`);
                changed = true;
            }
            
            return m;
        });

        report.ok = report.issues.length === 0;
        return { missions: validMissions, report };
    },

    /**
     * Checks Event Access and Session Consistency.
     */
    checkEventAccess: (events: Event[], user: User): ConsistencyReport => {
        const report: ConsistencyReport = { ok: true, issues: [], repaired: [], integrityScore: 100 };
        
        user.joinedEvents.forEach(eventId => {
            const event = events.find(e => e.id === eventId);
            if (!event) {
                report.issues.push(`User joined non-existent event ${eventId}`);
            }
            
            if (!user.eventSession && user.joinedEvents.length > 0) {
                // Just a warning, as session might be null if not currently active
            }
        });

        report.ok = report.issues.length === 0;
        return report;
    },

    /**
     * Checks Ranking consistency against User stats.
     */
    checkRanking: (ranking: RankingUser[], user: User): { ranking: RankingUser[], report: ConsistencyReport } => {
        const report: ConsistencyReport = { ok: true, issues: [], repaired: [], integrityScore: 100 };
        
        const updatedRanking = ranking.map(r => {
            if (r.isCurrentUser) {
                if (r.level !== user.level || r.monthlyMissionsCompleted !== user.monthlyMissionsCompleted) {
                    report.issues.push('Ranking mismatch with User State');
                    report.repaired.push('sync_ranking_user');
                    return {
                        ...r,
                        level: user.level,
                        monthlyMissionsCompleted: user.monthlyMissionsCompleted,
                        name: user.name,
                        avatarUrl: user.avatarUrl
                    };
                }
            }
            return r;
        });

        return { ranking: updatedRanking, report };
    },

    /**
     * Checks Store consistency (Prices, Stock).
     */
    checkStorePrices: (storeItems: (StoreItem | UsableItem)[]): ConsistencyReport => {
        const report: ConsistencyReport = { ok: true, issues: [], repaired: [], integrityScore: 100 };
        
        storeItems.forEach(item => {
            if (item.price < 0) {
                report.issues.push(`Negative price for item ${item.id}`);
            }
            if (!item.name) {
                report.issues.push(`Item ${item.id} has no name`);
            }
        });

        report.ok = report.issues.length === 0;
        return report;
    },

    /**
     * Checks Queue consistency.
     */
    checkQueue: (queue: QueueItem[], user: User): { queue: QueueItem[], report: ConsistencyReport } => {
        const report: ConsistencyReport = { ok: true, issues: [], repaired: [], integrityScore: 100 };
        const seenIds = new Set<string>();
        const cleanQueue: QueueItem[] = [];

        if (!Array.isArray(queue)) {
            // Guard against undefined queue
            return { queue: [], report };
        }

        queue.forEach(item => {
            if (seenIds.has(item.id)) {
                report.issues.push(`Duplicate queue item ${item.id}`);
                report.repaired.push(`dedup_queue_${item.id}`);
            } else {
                seenIds.add(item.id);
                
                if (!['pending', 'processing', 'done'].includes(item.status)) {
                    item.status = 'pending';
                    report.issues.push(`Invalid status for queue item ${item.id}`);
                    report.repaired.push(`fix_queue_status_${item.id}`);
                }
                
                cleanQueue.push(item);
            }
        });

        report.ok = report.issues.length === 0;
        return { queue: cleanQueue, report };
    },

    /**
     * RUN FULL APPLICATION CONSISTENCY SCAN
     */
    fullScan: (state: AppState): { newState: AppState; report: ConsistencyReport } => {
        const report: ConsistencyReport = { ok: true, issues: [], repaired: [], integrityScore: 100 };
        let newState = { ...state };

        // 1. Active User
        if (newState.activeUser) {
            const { user: fixedUser, report: userReport } = DataConsistency.checkUserEconomy(newState.activeUser);
            newState.activeUser = fixedUser;
            
            report.issues.push(...userReport.issues);
            report.repaired.push(...userReport.repaired);
            report.integrityScore = Math.min(report.integrityScore, userReport.integrityScore);
            
            // 2. Ranking Sync
            if (newState.rankingGlobal) {
                const { ranking: fixedRanking, report: rankReport } = DataConsistency.checkRanking(newState.rankingGlobal, newState.activeUser);
                newState.rankingGlobal = fixedRanking;
                report.issues.push(...rankReport.issues);
                report.repaired.push(...rankReport.repaired);
            }
            
            // 3. Queue Sync
            if (newState.queue) {
                const { queue: fixedQueue, report: queueReport } = DataConsistency.checkQueue(newState.queue, newState.activeUser);
                newState.queue = fixedQueue;
                
                report.issues.push(...queueReport.issues);
                report.repaired.push(...queueReport.repaired);
            }
        }

        report.ok = report.issues.length === 0;

        // Log to Diagnostic Core
        DiagnosticCore.record('audit', { 
            action: 'consistency_scan', 
            issues: report.issues.length, 
            repaired: report.repaired.length, 
            score: report.integrityScore 
        }, newState.activeUser?.id);

        return { newState, report };
    }
};
